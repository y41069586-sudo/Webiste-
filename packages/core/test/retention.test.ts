import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { auditLog, demos, events, leads, letters, orders, supportMessages } from '../src/db/schema';
import { getProviders } from '../src/providers';
import { stopBoss } from '../src/queue';
import { runRetention } from '../src/services/retention';
import { randomToken } from '../src/util/crypto';
import { addDays, addMonths } from '../src/util/time';
import { resetDb } from './helpers';

async function seedLead(status: string, opts: { letterMonthsAgo?: number; demoExpiresInDays?: number } = {}) {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Kosmetik Beispiel',
      branch: 'kosmetikstudio',
      branchGroup: 'beauty',
      city: 'Dortmund',
      street: 'Ostenhellweg',
      houseNumber: '3',
      postalCode: '44135',
      phone: '0231 99',
      segmentKey: 'dortmund:beauty:kosmetikstudio',
      trackToken: randomToken(24),
      identityHash: randomToken(16),
      contactedAt: opts.letterMonthsAgo !== undefined ? addMonths(new Date(), -opts.letterMonthsAgo) : null,
      status: status as never,
      createdAt: addMonths(new Date(), -(opts.letterMonthsAgo ?? 0) - 1),
    })
    .returning();
  const storage = getProviders().storage;
  const [demo] = await db
    .insert(demos)
    .values({
      leadId: lead!.id,
      slug: randomToken(24),
      templateId: 'beauty-soft',
      palette: 'rose',
      status: 'published',
      htmlStorageKey: 'x',
      contentJson: { hero_headline: 'Kosmetik Beispiel' },
      expiresAt: addDays(new Date(), opts.demoExpiresInDays ?? 10),
    })
    .returning();
  await storage.put(`demos/${demo!.id}/index.html`, '<html>');
  if (opts.letterMonthsAgo !== undefined) {
    await storage.put(`letters/${lead!.id}/brief.pdf`, '%PDF');
    await db.insert(letters).values({
      leadId: lead!.id,
      demoId: demo!.id,
      sequence: 1,
      status: 'delivered',
      sentAt: addMonths(new Date(), -opts.letterMonthsAgo),
      pdfStorageKey: `letters/${lead!.id}/brief.pdf`,
    });
  }
  return { lead: lead!, demo: demo! };
}

describe('Lösch-Job', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('abgelaufene Demo: Dateien weg, 410, ungesendete Briefe gestoppt, Lead „expired“', async () => {
    const { lead, demo } = await seedLead('letter_approved', { demoExpiresInDays: -1 });
    const db = getDb();
    await db.insert(letters).values({ leadId: lead.id, demoId: demo.id, sequence: 1, status: 'approved' });
    const r = await runRetention();
    expect(r.demosExpired).toBe(1);
    expect(r.lettersCancelled).toBe(1);
    const d = (await db.query.demos.findFirst({ where: eq(demos.id, demo.id) }))!;
    expect(d).toMatchObject({ status: 'expired', contentJson: null, htmlStorageKey: null });
    expect(await getProviders().storage.exists(`demos/${demo.id}/index.html`)).toBe(false);
    expect((await db.query.leads.findFirst({ where: eq(leads.id, lead.id) }))!.status).toBe('expired');
  });

  it('Leads ohne Reaktion nach 6 Monaten anonymisiert; Kontakt-Sperre (Hash + Datum) bleibt', async () => {
    const old = await seedLead('letter_delivered', { letterMonthsAgo: 7 });
    const fresh = await seedLead('letter_delivered', { letterMonthsAgo: 2 });
    const r = await runRetention();
    expect(r.leadsAnonymized).toBe(1);
    const db = getDb();
    const o = (await db.query.leads.findFirst({ where: eq(leads.id, old.lead.id) }))!;
    expect(o).toMatchObject({ businessName: '[gelöscht]', street: null, phone: null });
    expect(o.identityHash).toBe(old.lead.identityHash);
    expect(o.contactedAt).not.toBeNull();
    expect(await getProviders().storage.exists(`letters/${old.lead.id}/brief.pdf`)).toBe(false);
    expect((await db.query.leads.findFirst({ where: eq(leads.id, fresh.lead.id) }))!.businessName).toBe('Kosmetik Beispiel');
    const log = await db.select().from(auditLog).where(eq(auditLog.entity, 'retention'));
    expect(log).toHaveLength(1);
  });

  it('Käufer und laufende Bestellungen bleiben unangetastet; alte Support-Nachrichten und Checkouts werden gelöscht', async () => {
    const db = getDb();
    const buyer = await seedLead('paid', { letterMonthsAgo: 9, demoExpiresInDays: -5 });
    await db.insert(orders).values({
      leadId: buyer.lead.id,
      amountCents: 39000,
      netCents: 39000,
      status: 'paid',
      customerCompany: 'K',
      customerName: 'N',
      customerEmail: 'k@example.org',
      billingAddressJson: { street: 'A 1', postalCode: '44135', city: 'Dortmund', country: 'DE' },
      paidAt: new Date(),
      invoiceNumber: 'RE-2026-0001',
    });
    await db.insert(orders).values({
      amountCents: 39000,
      netCents: 39000,
      status: 'expired',
      customerCompany: 'A',
      customerName: 'B',
      customerEmail: 'a@example.org',
      billingAddressJson: { street: 'A 1', postalCode: '44135', city: 'Dortmund', country: 'DE' },
      createdAt: addMonths(new Date(), -7),
    });
    await db.insert(supportMessages).values([
      { direction: 'in', fromEmail: 'alt@example.org', body: 'alt', status: 'done', createdAt: addMonths(new Date(), -13) },
      { direction: 'in', fromEmail: 'neu@example.org', body: 'neu', status: 'done' },
    ]);
    await db.insert(events).values({
      leadId: buyer.lead.id,
      type: 'scan',
      metaJson: { ipHash: 'abc', ua: 'mobil/safari' },
      createdAt: addDays(new Date(), -40),
    });
    const r = await runRetention();
    expect(r.demosExpired).toBe(0);
    expect(r.leadsAnonymized).toBe(0);
    expect(r.unpaidOrdersDeleted).toBe(1);
    expect(r.supportDeleted).toBe(1);
    expect(r.eventsStripped).toBe(1);
    expect((await db.query.leads.findFirst({ where: eq(leads.id, buyer.lead.id) }))!.businessName).toBe('Kosmetik Beispiel');
    const ev = await db.select().from(events).where(eq(events.leadId, buyer.lead.id));
    expect(ev[0]!.metaJson).toEqual({});
  });
});
