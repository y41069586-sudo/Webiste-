import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { alerts, demos, leads, outboundEmails, supportMessages, suppressionList } from '../src/db/schema';
import { emailHash } from '../src/leads/normalize';
import { stopBoss } from '../src/queue';
import { sendAlertDigest } from '../src/services/alerts';
import {
  ingestInboundEmail,
  parseInboundPayload,
  processSupportMessage,
  sendSupportReply,
  stripQuoted,
  approveSupportReply,
  deleteSupportMessage,
} from '../src/services/support';
import { isAutomated } from '../src/support/prompts';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

async function seedLead(name = 'Nagelstudio Beispiel') {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: name,
      branch: 'nagelstudio',
      branchGroup: 'beauty',
      city: 'Dortmund',
      street: 'Westenhellweg',
      houseNumber: '1',
      postalCode: '44137',
      segmentKey: 'dortmund:beauty:nagelstudio',
      trackToken: randomToken(24),
      status: 'letter_delivered',
    })
    .returning();
  await db.insert(demos).values({
    leadId: lead!.id,
    slug: randomToken(24),
    templateId: 'beauty-soft',
    palette: 'rose',
    status: 'published',
    expiresAt: addDays(new Date(), 20),
  });
  return lead!;
}

let n = 0;
const mail = (over: Partial<Parameters<typeof ingestInboundEmail>[0]> = {}) => ({
  providerMessageId: `<m${++n}@example.org>`,
  from: 'Inhaberin <inhaberin@example.org>',
  to: 'hallo@example.com',
  subject: 'Ihr Brief',
  text: 'Hallo, was kostet die Website genau?',
  receivedAt: new Date(),
  headers: {},
  ...over,
});

describe('Support: Eingang und Erkennung', () => {
  it('Postmark-Inbound und generisches Format', () => {
    const pm = parseInboundPayload(
      JSON.stringify({
        From: 'a@example.org',
        FromFull: { Email: 'a@example.org', Name: 'A' },
        To: 'hallo@example.com',
        OriginalRecipient: 'hallo@example.com',
        Subject: 'Frage',
        MessageID: 'pm-1',
        TextBody: 'Text',
        Date: 'Fri, 23 Oct 2026 10:00:00 +0200',
        Headers: [
          { Name: 'Message-ID', Value: '<abc@mail.example.org>' },
          { Name: 'In-Reply-To', Value: '<out-1@example.com>' },
        ],
      }),
    );
    expect(pm).toMatchObject({
      providerMessageId: '<abc@mail.example.org>',
      from: 'a@example.org',
      subject: 'Frage',
      text: 'Text',
      inReplyTo: '<out-1@example.com>',
    });
    expect(parseInboundPayload(JSON.stringify({ messageId: 'x', from: 'b@example.org', text: 'Hallo' }))).toMatchObject({
      providerMessageId: 'x',
      from: 'b@example.org',
    });
    expect(parseInboundPayload('kein json')).toBeNull();
  });

  it('automatische Nachrichten und Zitate', () => {
    expect(isAutomated('mailer-daemon@x.de', 'Undeliverable')).toBe(true);
    expect(isAutomated('a@b.de', 'Automatische Antwort: Urlaub')).toBe(true);
    expect(isAutomated('a@b.de', 'Frage', { 'Auto-Submitted': 'auto-replied' })).toBe(true);
    expect(isAutomated('news@e-recht24.de', 'Mehr als Rechtstexte', { 'List-Unsubscribe': '<https://x/abmelden>' })).toBe(true);
    expect(isAutomated('a@b.de', 'Frage', { 'List-Id': 'Newsletter <news.example.org>' })).toBe(true);
    expect(isAutomated('a@b.de', 'Frage')).toBe(false);
    expect(stripQuoted('Danke!\n\nAm 20.10.2026 schrieb X:\n> alt')).toBe('Danke!');
  });
});

describe('Support: Newsletter und Löschen', () => {
  beforeEach(resetDb);

  it('Newsletter landen als Spam, nicht als offene Anfrage; Admin kann Nachrichten löschen', async () => {
    const news = await ingestInboundEmail(
      mail({ from: 'news@e-recht24.de', subject: 'Neu im Blog', headers: { 'List-Unsubscribe': '<https://x/abmelden>' } }),
      { queueProcessing: false },
    );
    const row = await getDb().query.supportMessages.findFirst({ where: eq(supportMessages.id, news.id) });
    expect(row?.status).toBe('ignored');
    const real = await ingestInboundEmail(mail(), { queueProcessing: false });
    await deleteSupportMessage(real.id, 'admin:test');
    expect(await getDb().query.supportMessages.findFirst({ where: eq(supportMessages.id, real.id) })).toBeUndefined();
  });
});

describe('Support: Verarbeitung', () => {
  beforeEach(async () => {
    await resetDb();
    await updateConfig({ switches: { autoReply: false }, support: { autoReplyClasses: [] } }, 'test');
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('Widerspruch eines Briefempfängers (über Demo-Formular bekannt) wird automatisch umgesetzt', async () => {
    const lead = await seedLead();
    const db = getDb();
    // frühere Frage über das Demo-Formular verknüpft die Adresse mit dem Lead
    await db.insert(supportMessages).values({
      leadId: lead.id,
      direction: 'in',
      channel: 'form',
      fromEmail: 'inhaberin@example.org',
      body: 'Frage',
      status: 'done',
    });
    const { id } = await ingestInboundEmail(
      mail({ text: 'Bitte schicken Sie mir keine Post mehr und löschen Sie meine Daten.' }),
    );
    expect(await processSupportMessage(id)).toEqual({ status: 'done', class: 'opt_out' });
    const l = await db.query.leads.findFirst({ where: eq(leads.id, lead.id) });
    expect(l!.status).toBe('suppressed');
    expect(l!.anonymizedAt).not.toBeNull();
    expect((await db.select().from(suppressionList)).some((s) => s.hash === emailHash('inhaberin@example.org'))).toBe(true);
    const confirm = await db.select().from(outboundEmails).where(eq(outboundEmails.kind, 'opt_out_confirmation'));
    expect(confirm).toHaveLength(1);
  });

  it('Widerspruch mit Firmenname ohne Zuordnung → eskaliert (Adresse trotzdem gesperrt)', async () => {
    const { id } = await ingestInboundEmail(
      mail({ from: 'unbekannt@example.net', text: 'Widerspruch nach Art. 21 DSGVO. Ich will keine Werbung.' }),
    );
    expect(await processSupportMessage(id)).toEqual({ status: 'escalated', class: 'opt_out' });
    expect((await getDb().select().from(suppressionList)).some((s) => s.kind === 'email')).toBe(true);
  });

  it('Frage → Entwurf zur Freigabe; Freigabe sendet als Antwort mit Bezug', async () => {
    await seedLead();
    const { id } = await ingestInboundEmail(mail());
    expect(await processSupportMessage(id)).toEqual({ status: 'drafted', class: 'frage' });
    const m = (await getDb().query.supportMessages.findFirst({ where: eq(supportMessages.id, id) }))!;
    expect(m.draftReply).toContain('Website-Paket');
    await approveSupportReply(id, `${m.draftReply} Bei Fragen melden Sie sich gern.`, 'admin:test');
    expect(await sendSupportReply(id)).toBe('sent');
    expect(await sendSupportReply(id)).toBe('skipped');
    const out = await getDb().select().from(supportMessages).where(eq(supportMessages.direction, 'out'));
    expect(out).toHaveLength(1);
    expect(out[0]!.subject).toBe('Re: Ihr Brief');
    expect(out[0]!.body).toContain('Bei Fragen melden Sie sich gern.');
  });

  it('AUTO_REPLY nur für freigegebene Klassen; Beschwerden immer an den Betreiber', async () => {
    await updateConfig({ switches: { autoReply: true }, support: { autoReplyClasses: ['frage'] } }, 'test');
    const a = await ingestInboundEmail(mail());
    expect(await processSupportMessage(a.id)).toEqual({ status: 'approved', class: 'frage' });
    const b = await ingestInboundEmail(mail({ text: 'Das ist eine Frechheit, ich schalte meinen Anwalt ein!' }));
    expect(await processSupportMessage(b.id)).toEqual({ status: 'escalated', class: 'beschwerde' });
    const c = await ingestInboundEmail(mail({ text: 'Geht es auch günstiger? Rabatt?' }));
    expect((await processSupportMessage(c.id)).status).toBe('escalated');
  });

  it('Abwesenheitsnotizen werden ignoriert, Duplikate nicht doppelt gespeichert', async () => {
    const x = await ingestInboundEmail(mail({ subject: 'Automatische Antwort: Urlaub', providerMessageId: '<dup@x>' }));
    const again = await ingestInboundEmail(mail({ subject: 'Automatische Antwort: Urlaub', providerMessageId: '<dup@x>' }));
    expect(again).toEqual({ id: x.id, duplicate: true });
    expect((await getDb().query.supportMessages.findFirst({ where: eq(supportMessages.id, x.id) }))!.status).toBe('ignored');
  });

  it('Warnungen gehen gesammelt einmal per Mail raus', async () => {
    const db = getDb();
    await db.insert(alerts).values([
      { level: 'warn', code: 'a', message: 'Budget fast erreicht' },
      { level: 'error', code: 'b', message: 'Versand fehlgeschlagen' },
      { level: 'info', code: 'c', message: 'Info' },
    ]);
    expect(await sendAlertDigest()).toBe(2);
    expect(await sendAlertDigest()).toBe(0);
    expect((await db.select().from(outboundEmails).where(eq(outboundEmails.kind, 'admin'))).length).toBe(1);
  });
});
