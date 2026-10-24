import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { updateConfig } from '../src/config/service';
import { resetEnvCache } from '../src/config/env';
import { getDb } from '../src/db/client';
import { budgetLedger, demos, leads, letters } from '../src/db/schema';
import { getProviders } from '../src/providers';
import { stopBoss } from '../src/queue';
import { budgetStatus, KillSwitchError } from '../src/services/budget';
import {
  processLetterWebhookEvents,
  realLettersGate,
  scheduleFollowups,
  sendApprovedLetters,
  sendLetter,
  syncLetterStatuses,
} from '../src/services/sending';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { OPERATOR_TEST_CONFIG, resetDb } from './helpers';

async function seed(opts: { status?: string; letterStatus?: string } = {}) {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Testbetrieb',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      street: 'Kampstraße',
      houseNumber: '5',
      postalCode: '44137',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      status: (opts.status ?? 'letter_approved') as never,
    })
    .returning();
  const [demo] = await db
    .insert(demos)
    .values({
      leadId: lead!.id,
      slug: randomToken(24),
      templateId: 'handwerk-solid',
      palette: 'werkblau',
      status: 'published',
      publishedAt: new Date(),
      expiresAt: addDays(new Date(), 30),
    })
    .returning();
  const key = `letters/${lead!.id}/x.pdf`;
  await getProviders().storage.put(key, Buffer.from('%PDF-1.7 test'));
  const [letter] = await db
    .insert(letters)
    .values({
      leadId: lead!.id,
      demoId: demo!.id,
      sequence: 1,
      pdfStorageKey: key,
      status: (opts.letterStatus ?? 'approved') as never,
      estimatedCostCents: 135,
      truthCheckJson: { passed: true },
    })
    .returning();
  return { lead: lead!, demo: demo!, letter: letter! };
}

describe('Versand', () => {
  beforeEach(async () => {
    await resetDb();
    process.env.DRY_RUN = 'false';
    resetEnvCache();
    await updateConfig(
      { ...OPERATOR_TEST_CONFIG, switches: { dryRun: false, killSwitch: false }, budget: { weeklyBudgetCents: 300 } },
      'test',
    );
  });
  afterAll(async () => {
    delete process.env.DRY_RUN;
    resetEnvCache();
    await stopBoss();
  });

  it('DRY_RUN: kein API-Aufruf, keine Kosten, Status bleibt freigegeben', async () => {
    await updateConfig({ switches: { dryRun: true } }, 'test');
    const { letter } = await seed();
    const res = await sendLetter(letter.id, 'test');
    expect(res.state).toBe('dry_run');
    const after = await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) });
    expect(after?.status).toBe('approved');
    expect(await getDb().select().from(budgetLedger)).toHaveLength(0);
  });

  it('Versand bucht Kosten, setzt Lead-Status, Kontaktdatum und verlängert die Demo', async () => {
    const { letter, lead, demo } = await seed();
    const res = await sendLetter(letter.id, 'test');
    expect(res.state).toBe('sent');
    const l = await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) });
    expect(l?.status).toBe('queued');
    expect(l?.providerLetterId).toMatch(/^mock_/);
    const ld = await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) });
    expect(ld?.status).toBe('letter_sent');
    expect(ld?.lettersSent).toBe(1);
    expect(ld?.contactedAt).toBeTruthy();
    const d = await getDb().query.demos.findFirst({ where: eq(demos.id, demo.id) });
    expect(d!.expiresAt!.getTime()).toBeGreaterThanOrEqual(addDays(new Date(), 29).getTime());
    expect((await budgetStatus('letter')).spentCents).toBeGreaterThan(0);
    // Wiederholung ist idempotent
    expect((await sendLetter(letter.id, 'test')).state).toBe('skipped');
  });

  it('Budget-Guard stoppt den Stapelversand', async () => {
    for (let i = 0; i < 4; i++) await seed();
    const res = await sendApprovedLetters('test');
    // Budget 3,00 € / Mock-Preis 1,35 € → 2 Briefe
    expect(res.sent).toBe(2);
    expect(res.stoppedBy).toBe('BudgetExceededError');
    expect((await budgetStatus('letter')).spentCents).toBeLessThanOrEqual(300);
  });

  it('Not-Aus stoppt sofort', async () => {
    const { letter } = await seed();
    await updateConfig({ switches: { killSwitch: true } }, 'test');
    await expect(sendLetter(letter.id, 'test')).rejects.toBeInstanceOf(KillSwitchError);
  });

  it('gesperrter Lead → Brief wird storniert statt versendet', async () => {
    const { letter, lead } = await seed();
    await getDb().update(leads).set({ status: 'suppressed' }).where(eq(leads.id, lead.id));
    expect((await sendLetter(letter.id, 'test')).state).toBe('skipped');
    expect((await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) }))?.status).toBe('cancelled');
  });

  it('Webhook: replay-sicher, Zustellung setzt letter_delivered', async () => {
    const { letter, lead } = await seed();
    const sent = await sendLetter(letter.id, 'test');
    if (sent.state !== 'sent') throw new Error('nicht gesendet');
    const ev = { eventId: 'ev-1', providerLetterId: sent.providerLetterId, status: 'delivered' as const, occurredAt: new Date() };
    expect(await processLetterWebhookEvents([ev], 'mock')).toBe(1);
    expect(await processLetterWebhookEvents([ev], 'mock')).toBe(0);
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) }))?.status).toBe('letter_delivered');
    const l = await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) });
    expect(l?.status).toBe('delivered');
    expect(l?.deliveredAt).toBeTruthy();
  });

  it('Unzustellbar → Lead failed + Meldung', async () => {
    const { letter, lead } = await seed();
    const sent = await sendLetter(letter.id, 'test');
    if (sent.state !== 'sent') throw new Error('nicht gesendet');
    await processLetterWebhookEvents(
      [
        {
          eventId: 'ev-x',
          providerLetterId: sent.providerLetterId,
          status: 'failed',
          occurredAt: new Date(),
          reason: 'undeliverable',
        },
      ],
      'mock',
    );
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) }))?.status).toBe('failed');
  });

  it('Abgleich nimmt Zustellung nach X Tagen an', async () => {
    const { letter, lead } = await seed();
    const sent = await sendLetter(letter.id, 'test');
    if (sent.state !== 'sent') throw new Error('nicht gesendet');
    await getDb()
      .update(letters)
      .set({ status: 'sent', sentAt: addDays(new Date(), -5), provider: 'other' })
      .where(eq(letters.id, letter.id));
    const r = await syncLetterStatuses();
    expect(r.changed).toBeGreaterThanOrEqual(1);
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) }))?.status).toBe('letter_delivered');
  });

  it('Follow-up nur mit Schalter und nach 12 Tagen ohne Scan', async () => {
    const { letter, lead } = await seed({ status: 'letter_delivered', letterStatus: 'delivered' });
    await getDb()
      .update(letters)
      .set({ deliveredAt: addDays(new Date(), -13) })
      .where(eq(letters.id, letter.id));
    await getDb().update(leads).set({ lettersSent: 1 }).where(eq(leads.id, lead.id));
    expect((await scheduleFollowups()).queued).toBe(0);
    await updateConfig({ switches: { followupEnabled: true } }, 'test');
    expect((await scheduleFollowups()).queued).toBe(1);
    await getDb().update(leads).set({ lettersSent: 3 }).where(eq(leads.id, lead.id));
    expect((await scheduleFollowups()).queued).toBe(0);
  });

  it('Echte Briefe an Leads erst nach Freischaltung (nur Pingen-Produktion)', () => {
    process.env.PINGEN_ENV = 'production';
    resetEnvCache();
    expect(realLettersGate('pingen', false, false)).toMatch(/gesperrt/);
    expect(realLettersGate('pingen', true, false)).toBeNull();
    expect(realLettersGate('pingen', false, true)).toBeNull();
    expect(realLettersGate('mock', false, false)).toBeNull();
    process.env.PINGEN_ENV = 'staging';
    resetEnvCache();
    expect(realLettersGate('pingen', false, false)).toBeNull();
  });
});
