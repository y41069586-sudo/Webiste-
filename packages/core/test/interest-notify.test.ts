import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { demos, leads, outboundEmails } from '../src/db/schema';
import { stopBoss } from '../src/queue';
import { handleScan } from '../src/services/tracking';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

async function seed() {
  const [lead] = await getDb()
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Scan Beispiel GmbH',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      street: 'Weg',
      houseNumber: '1',
      postalCode: '44137',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      status: 'letter_sent' as never,
    })
    .returning();
  await getDb()
    .insert(demos)
    .values({
      leadId: lead!.id,
      slug: randomToken(24),
      templateId: 'handwerk-solid',
      palette: 'werkblau',
      status: 'published',
      publishedAt: new Date(),
      expiresAt: addDays(new Date(), 30),
    });
  return lead!;
}
const adminMails = async () => (await getDb().select().from(outboundEmails)).filter((m) => m.kind === 'admin');

describe('Sofort-Hinweis bei Interesse (11.11.2026)', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('erster echter Scan schickt genau eine Mail an den Betreiber, weitere Scans nicht', async () => {
    const lead = await seed();
    const req = { ua: 'mobile/safari', ipHash: 'h1', isBot: false };
    await handleScan(lead.trackToken, req);
    await handleScan(lead.trackToken, { ...req, ipHash: 'h2' });
    const mails = await adminMails();
    expect(mails).toHaveLength(1);
    expect(mails[0]!.subject).toMatch(/QR-Code gescannt: Scan Beispiel GmbH/);
  });

  it('Bots und Testaufrufe des Betreibers lösen keine Mail aus', async () => {
    const lead = await seed();
    await handleScan(lead.trackToken, { ua: 'bot', ipHash: 'b', isBot: true });
    await handleScan(lead.trackToken, { ua: 'x', ipHash: 't', isBot: false, audience: 'test' });
    expect(await adminMails()).toHaveLength(0);
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) }))?.id).toBe(lead.id);
  });
});
