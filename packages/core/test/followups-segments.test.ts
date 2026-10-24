import { and, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { resetEnvCache } from '../src/config/env';
import { updateConfig } from '../src/config/service';
import { DEFAULT_BRANCHES, DEFAULT_CONFIG } from '../src/config/settings';
import { getDb } from '../src/db/client';
import { auditLog, demos, events, leads, letters, orders, outboundEmails, supportMessages } from '../src/db/schema';
import { qualify } from '../src/leads/qualify';
import { getProviders } from '../src/providers';
import type { RawPlace } from '../src/providers/types';
import { stopBoss } from '../src/queue';
import { statedExpiry } from '../src/render/letter';
import { scheduleFollowups, unsubscribeSignature } from '../src/services/followups';
import { sendLetter } from '../src/services/sending';
import { suppressEmail } from '../src/services/suppression';
import { trackTokenForShortCode } from '../src/services/tracking';
import { randomShortCode, randomToken } from '../src/util/crypto';
import { addBusinessDays, addDays, endOfDayBerlin } from '../src/util/time';
import { OPERATOR_TEST_CONFIG, resetDb } from './helpers';

const place: RawPlace = {
  source: 'mock',
  sourceId: 'x1',
  name: 'Nagelstudio Neu',
  street: 'Westenhellweg',
  houseNumber: '10',
  postalCode: '44137',
  city: 'Dortmund',
  businessStatus: 'OPERATIONAL',
};
const branch = DEFAULT_BRANCHES[0]!;
const q = (over: Partial<Parameters<typeof qualify>[0]> = {}) =>
  qualify({
    place,
    branch,
    city: 'Dortmund',
    cfg: DEFAULT_CONFIG,
    isSuppressed: false,
    recentlyContacted: false,
    chainByFrequency: false,
    ...over,
  });

describe('Lead-Segmente (neu > social_only > etabliert)', () => {
  it('neu aufgetaucht mit 3–20 Bewertungen: Mindestanzahl entfällt, Rating ≥ 4,5 bleibt', () => {
    const neu = q({ rating: { rating: 4.8, ratingCount: 9 }, newAppearance: true });
    expect(neu).toMatchObject({ qualified: true, segment: 'neu' });
    expect(q({ rating: { rating: 4.8, ratingCount: 9 } })).toMatchObject({ qualified: false, reasons: ['too_few_ratings'] });
    expect(q({ rating: { rating: 4.3, ratingCount: 9 }, newAppearance: true }).reasons).toContain('rating_too_low');
    // > 20 Bewertungen ist nicht mehr „neu“
    expect(q({ rating: { rating: 4.8, ratingCount: 25 }, newAppearance: true })).toMatchObject({
      qualified: false,
      segment: 'etabliert',
    });
    expect(q({ rating: { rating: 4.8, ratingCount: 2 }, newAppearance: true }).segment).toBe('etabliert');
  });

  it('social_only bekommt Score-Bonus; Priorität im Score: neu > social_only > etabliert', () => {
    const rating = { rating: 4.7, ratingCount: 15 };
    const etabliert = q({ rating: { rating: 4.7, ratingCount: 40 } });
    const social = q({ rating: { rating: 4.7, ratingCount: 40 }, place: { ...place, websiteUri: 'https://instagram.com/x' } });
    const neu = q({ rating, newAppearance: true });
    expect(etabliert.segment).toBe('etabliert');
    expect(social.segment).toBe('social_only');
    expect(social.score).toBeGreaterThan(etabliert.score);
    expect(neu.score).toBeGreaterThan(q({ rating, place: { ...place, websiteUri: 'https://instagram.com/x' } }).score - 10);
    expect(neu.score - DEFAULT_CONFIG.segments.scoreBonus.neu).toBeGreaterThan(0);
  });

  it('ohne Bewertungssignal (OSM): nur social_only oder etabliert', () => {
    expect(q({ newAppearance: true }).segment).toBe('etabliert');
    expect(q({ newAppearance: true, place: { ...place, websiteUri: 'linktr.ee/x' } }).segment).toBe('social_only');
  });
});

describe('Ablaufdatum im Brief', () => {
  it('Erstbrief: Laufzeit ab heute; Folgebrief: geschätzte Zustellung + 7 Tage, nie früher als die Demo', () => {
    const now = new Date('2026-10-23T10:00:00Z'); // Freitag
    expect(statedExpiry(1, DEFAULT_CONFIG, null, now, 3)).toEqual(endOfDayBerlin(addDays(now, 30)));
    // 3 Werktage + 1 Puffer = Donnerstag 29.10., + 7 Tage = 05.11.
    const second = statedExpiry(2, DEFAULT_CONFIG, addDays(now, 2), now, 3);
    expect(second).toEqual(endOfDayBerlin(addDays(addBusinessDays(now, 4), 7)));
    expect(second.toISOString().slice(0, 10)).toBe('2026-11-05');
    const later = addDays(now, 20);
    expect(statedExpiry(3, DEFAULT_CONFIG, later, now, 3)).toEqual(endOfDayBerlin(later));
  });
});

async function seedLead(status: string, over: Partial<typeof leads.$inferInsert> = {}) {
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
      status: status as never,
      lettersSent: 1,
      ...over,
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
      publishedAt: addDays(new Date(), -20),
      expiresAt: addDays(new Date(), 10),
      createdAt: addDays(new Date(), -21),
    })
    .returning();
  const [letter] = await db
    .insert(letters)
    .values({ leadId: lead!.id, demoId: demo!.id, sequence: 1, status: 'sent', sentAt: addDays(new Date(), -20) })
    .returning();
  return { lead: lead!, demo: demo!, letter: letter! };
}

describe('Folgesendungen, Kurz-URL, Erinnerungs-Mail', () => {
  beforeEach(async () => {
    await resetDb();
    await updateConfig({ switches: { followupEnabled: true } }, 'test');
  });
  afterAll(async () => {
    delete process.env.DRY_RUN;
    resetEnvCache();
    await stopBoss();
  });

  it('Kurz-URL: Kurzcode → QR-Token; ungültig/unbekannt → null; Durchprobieren wird gebremst', async () => {
    const code = randomShortCode();
    const { lead } = await seedLead('letter_sent', { shortCode: code });
    const meta = { ua: 'x', ipHash: 'probe', isBot: false };
    expect(await trackTokenForShortCode(code.toUpperCase(), meta)).toBe(lead.trackToken);
    expect(await trackTokenForShortCode('../etc', meta)).toBeNull();
    let last: unknown = null;
    for (let i = 0; i < 31; i++) last = await trackTokenForShortCode(randomShortCode(), meta);
    expect(last).toBe('rate_limited');
  });

  it('Sendung 2: ohne Scan nach geschätzter Zustellung + 12 Tage', async () => {
    const { letter } = await seedLead('letter_sent');
    await getDb()
      .update(letters)
      .set({ estimatedDeliveredAt: addDays(new Date(), -13) })
      .where(eq(letters.id, letter.id));
    const r = await scheduleFollowups();
    expect(r).toMatchObject({ second: 1, third: 0 });
  });

  it('Sendung 3: heißer Lead → erst Demo überarbeiten (Pflicht-Prüfung), nach Veröffentlichung Brief 3', async () => {
    const db = getDb();
    const { lead } = await seedLead('cta_clicked');
    await db.insert(events).values({ leadId: lead.id, type: 'cta_click', createdAt: addDays(new Date(), -8) });
    const first = await scheduleFollowups();
    expect(first).toMatchObject({ improving: 1, third: 0 });
    const log = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entityId, lead.id), eq(auditLog.action, 'followup3_improve_demo')));
    expect(log).toHaveLength(1);
    // Überarbeitung läuft (neue Demo nach dem heißen Zeitpunkt) → nicht erneut anstoßen
    const [improved] = await db
      .insert(demos)
      .values({
        leadId: lead.id,
        slug: randomToken(24),
        templateId: 'handwerk-klar',
        palette: 'werkblau',
        status: 'pending_review',
        reviewNote: 'Überarbeitung',
      })
      .returning();
    expect(await scheduleFollowups()).toMatchObject({ improving: 0, third: 0 });
    await db
      .update(demos)
      .set({ status: 'published', publishedAt: new Date(), expiresAt: addDays(new Date(), 30) })
      .where(eq(demos.id, improved!.id));
    expect(await scheduleFollowups()).toMatchObject({ third: 1 });
  });

  it('kein Brief 3 nach Kauf; zwei Demo-Aufrufe zählen als heiß', async () => {
    const db = getDb();
    const bought = await seedLead('cta_clicked');
    await db.insert(events).values({ leadId: bought.lead.id, type: 'cta_click', createdAt: addDays(new Date(), -9) });
    await db.insert(orders).values({
      leadId: bought.lead.id,
      amountCents: 59000,
      netCents: 59000,
      status: 'paid',
      customerCompany: 'T',
      customerName: 'T',
      customerEmail: 't@example.org',
      billingAddressJson: { street: 'A 1', postalCode: '44137', city: 'Dortmund', country: 'DE' },
    });
    const viewer = await seedLead('scanned');
    await db.insert(events).values([
      { leadId: viewer.lead.id, type: 'demo_view', createdAt: addDays(new Date(), -12) },
      { leadId: viewer.lead.id, type: 'demo_view', createdAt: addDays(new Date(), -10) },
    ]);
    const r = await scheduleFollowups();
    expect(r.improving).toBe(1);
  });

  it('eine einzige Erinnerungs-Mail an Leads, die uns selbst geschrieben haben – mit Abmeldelink', async () => {
    const db = getDb();
    const { lead, demo } = await seedLead('scanned');
    await db
      .update(demos)
      .set({ expiresAt: addDays(new Date(), 5) })
      .where(eq(demos.id, demo.id));
    const [msg] = await db
      .insert(supportMessages)
      .values({
        leadId: lead.id,
        direction: 'in',
        channel: 'form',
        fromEmail: 'frage@example.org',
        body: 'Was kostet das?',
        status: 'done',
      })
      .returning();
    const other = await seedLead('scanned');
    await db
      .update(demos)
      .set({ expiresAt: addDays(new Date(), 5) })
      .where(eq(demos.id, other.demo.id));
    await db.insert(supportMessages).values({
      leadId: other.lead.id,
      direction: 'in',
      channel: 'form',
      fromEmail: 'abgemeldet@example.org',
      body: 'Frage',
      status: 'done',
    });
    await suppressEmail(db, 'abgemeldet@example.org', 'test');
    expect((await scheduleFollowups()).reminders).toBe(1);
    expect((await scheduleFollowups()).reminders).toBe(0);
    const mails = await db.select().from(outboundEmails).where(eq(outboundEmails.kind, 'demo_reminder'));
    expect(mails).toHaveLength(1);
    expect(mails[0]!.toEmail).toBe('frage@example.org');
    const stored = JSON.parse((await getProviders().storage.get(`outbox/${mails[0]!.providerMessageId}.json`))!.toString('utf8'));
    expect(stored.text).toContain(`/abmelden/${msg!.id}.${unsubscribeSignature(msg!.id)}`);
    expect(stored.headers?.['List-Unsubscribe-Post'] ?? stored.headers?.['list-unsubscribe-post']).toBeTruthy();
  });

  it('Versand: veraltetes „online bis …“ wird nicht verschickt; Folgebrief verlängert die Demo bis zum genannten Datum', async () => {
    process.env.DRY_RUN = 'false';
    resetEnvCache();
    await updateConfig(
      { ...OPERATOR_TEST_CONFIG, switches: { dryRun: false, killSwitch: false }, budget: { weeklyBudgetCents: 1000 } },
      'test',
    );
    const db = getDb();
    const { lead, demo } = await seedLead('letter_delivered');
    const key = `letters/${lead.id}/x.pdf`;
    await getProviders().storage.put(key, Buffer.from('%PDF-1.7 test'));
    const [stale] = await db
      .insert(letters)
      .values({
        leadId: lead.id,
        demoId: demo.id,
        sequence: 2,
        status: 'approved',
        pdfStorageKey: key,
        statedExpiresAt: addDays(new Date(), 4),
        truthCheckJson: { passed: true },
      })
      .returning();
    expect((await sendLetter(stale!.id, 'test')).state).toBe('skipped');
    expect((await db.query.letters.findFirst({ where: eq(letters.id, stale!.id) }))!.status).toBe('failed');
    await db.delete(letters).where(eq(letters.id, stale!.id));
    const stated = endOfDayBerlin(addDays(new Date(), 16));
    const [fresh] = await db
      .insert(letters)
      .values({
        leadId: lead.id,
        demoId: demo.id,
        sequence: 2,
        status: 'approved',
        pdfStorageKey: key,
        statedExpiresAt: stated,
        truthCheckJson: { passed: true },
      })
      .returning();
    expect((await sendLetter(fresh!.id, 'test')).state).toBe('sent');
    const sentLetter = (await db.query.letters.findFirst({ where: eq(letters.id, fresh!.id) }))!;
    expect(sentLetter.estimatedDeliveredAt).not.toBeNull();
    expect((await db.query.demos.findFirst({ where: eq(demos.id, demo.id) }))!.expiresAt).toEqual(stated);
    expect((await db.query.leads.findFirst({ where: eq(leads.id, lead.id) }))!.status).toBe('followup_sent');
  });
});
