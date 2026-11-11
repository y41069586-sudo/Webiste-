import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { demos, leads, outboundEmails, supportMessages } from '../src/db/schema';
import { stopBoss } from '../src/queue';
import { confirmOptin, optinConfirmUrl, requestDemoLinkByEmail } from '../src/services/email-optin';
import { scheduleFollowups } from '../src/services/followups';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

async function seed() {
  const [lead] = await getDb()
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Optin Beispiel GmbH',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      street: 'Weg',
      houseNumber: '1',
      postalCode: '44137',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      status: 'scanned' as never,
    })
    .returning();
  const slug = randomToken(24);
  await getDb()
    .insert(demos)
    .values({
      leadId: lead!.id,
      slug,
      templateId: 'handwerk-solid',
      palette: 'werkblau',
      status: 'published',
      publishedAt: new Date(),
      expiresAt: addDays(new Date(), 30),
    });
  return { lead: lead!, slug };
}
const req = { ua: 'mobile/safari', ipHash: 'h1', isBot: false };
const form = (email: string, consent = true) => ({ email, consent, honeypot: '', ts: Date.now() - 10_000 });
const mails = async (kind: string) => (await getDb().select().from(outboundEmails)).filter((m) => m.kind === kind);

describe('Link per E-Mail mit Häkchen und Bestätigung (11.11.2026)', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('ohne Häkchen nichts, mit Häkchen genau eine Link-Mail und ein Hinweis an den Betreiber', async () => {
    const { slug } = await seed();
    expect(await requestDemoLinkByEmail(slug, form('chef@betrieb.de', false), req)).toEqual({ ok: false, reason: 'invalid' });
    expect(await requestDemoLinkByEmail(slug, form('Chef@Betrieb.de'), req)).toEqual({ ok: true });
    expect(await requestDemoLinkByEmail(slug, form('chef@betrieb.de'), req)).toEqual({ ok: true });
    const link = await mails('optin_link');
    expect(link).toHaveLength(1);
    expect(link[0]!.toEmail).toBe('chef@betrieb.de');
    expect((await mails('admin')).map((m) => m.subject).join(' ')).toMatch(/E-Mail hinterlassen: Optin Beispiel GmbH/);
  });

  it('Erinnerung erst nach Bestätigung, höchstens einmal', async () => {
    const { slug } = await seed();
    await requestDemoLinkByEmail(slug, form('chef@betrieb.de'), req);
    await scheduleFollowups(addDays(new Date(), 4));
    expect(await mails('optin_followup')).toHaveLength(0);

    const [msg] = await getDb().select().from(supportMessages);
    const token = optinConfirmUrl(msg!.id).split('/bestaetigen/')[1]!;
    expect(await confirmOptin('kaputt', req)).toBe(false);
    expect(await confirmOptin(token, req)).toBe(true);
    expect(await confirmOptin(token, req)).toBe(true);

    await scheduleFollowups(addDays(new Date(), 1));
    expect(await mails('optin_followup')).toHaveLength(0);
    await scheduleFollowups(addDays(new Date(), 4));
    await scheduleFollowups(addDays(new Date(), 5));
    expect(await mails('optin_followup')).toHaveLength(1);
  });
});
