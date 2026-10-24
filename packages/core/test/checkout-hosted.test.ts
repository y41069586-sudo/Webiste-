import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { alerts, customers, demos, events, leads, orders } from '../src/db/schema';
import type { CollectedCustomer } from '../src/providers/types';
import { stopBoss } from '../src/queue';
import { clearDomainCache } from '../src/services/domains';
import { simulateMockPayment, startHostedCheckout } from '../src/services/orders';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

const meta = { ua: 'mobil/safari', ipHash: 'hosted1', isBot: false };

async function seedDemo() {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Malerbetrieb Beispiel',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      street: 'Kampstraße',
      houseNumber: '5',
      postalCode: '44137',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      domainSuggestion: 'malerbetrieb-beispiel.de',
      status: 'cta_clicked',
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
  return { lead: lead!, demo: demo! };
}

const collected = (over: Partial<CollectedCustomer> = {}, fields: Record<string, string> = {}): CollectedCustomer => ({
  businessName: 'Malerbetrieb Beispiel GmbH',
  name: 'Erika Beispiel',
  email: 'Erika@Example.org',
  phone: '+49 231 123456',
  address: { line1: 'Kampstraße 5', postalCode: '44137', city: 'Dortmund', country: 'DE' },
  customFields: { wunschdomain: 'malerei-erika.de', unternehmer: 'ja', agb: 'ja', ...fields },
  ...over,
});

const sessionOf = (url: string) => url.split('/checkout/mock/')[1]!.split('?')[0]!;

describe('Checkout über die Bezahlseite des Anbieters (Stripe)', () => {
  beforeEach(async () => {
    await resetDb();
    clearDomainCache();
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('ohne gewählte Option kein Checkout (keine Vorauswahl)', async () => {
    const { demo } = await seedDemo();
    const r = await startHostedCheckout(demo.slug, '', meta);
    expect(r.ok).toBe(false);
  });

  it('Option wählen → Bezahlseite; Angaben aus dem Checkout landen in Bestellung, Kunde und Rechnung', async () => {
    const db = getDb();
    const { demo, lead } = await seedDemo();
    const r = await startHostedCheckout(demo.slug, 'one_time', meta);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Zurück-Taste: dieselbe Session
    const again = await startHostedCheckout(demo.slug, 'one_time', meta);
    expect(again.ok && again.url).toBe(r.url);
    const pending = (await db.query.orders.findFirst({ where: eq(orders.id, r.orderId) }))!;
    expect(pending).toMatchObject({
      status: 'pending',
      customerEmail: '',
      customerCompany: 'Malerbetrieb Beispiel',
      b2bConfirmed: false,
    });

    await simulateMockPayment(sessionOf(r.url), 'paid', collected());
    const paid = (await db.query.orders.findFirst({ where: eq(orders.id, r.orderId) }))!;
    expect(paid).toMatchObject({
      status: 'paid',
      customerCompany: 'Malerbetrieb Beispiel GmbH',
      customerName: 'Erika Beispiel',
      customerEmail: 'erika@example.org',
      domainWish: 'malerei-erika.de',
      b2bConfirmed: true,
    });
    expect(paid.termsAcceptedAt).not.toBeNull();
    expect(paid.billingAddressJson).toMatchObject({ street: 'Kampstraße 5', postalCode: '44137', city: 'Dortmund' });
    expect(
      (paid.invoiceJson as { customer?: { company?: string } }).customer?.company ?? JSON.stringify(paid.invoiceJson),
    ).toContain('Malerbetrieb Beispiel GmbH');
    const c = (await db.query.customers.findFirst({ where: eq(customers.orderId, r.orderId) }))!;
    expect(c).toMatchObject({ email: 'erika@example.org', domain: 'malerei-erika.de', domainStatus: 'available' });
    const evs = await db.select().from(events).where(eq(events.leadId, lead.id));
    expect(evs.map((e) => e.type)).toEqual(expect.arrayContaining(['checkout_started', 'paid']));
  });

  it('Monatlich: Abo über die Bezahlseite, Mindestlaufzeit gesetzt', async () => {
    const db = getDb();
    const { demo } = await seedDemo();
    const r = await startHostedCheckout(demo.slug, 'monthly', meta);
    if (!r.ok) throw new Error(r.error);
    await simulateMockPayment(sessionOf(r.url), 'paid', collected());
    const o = (await db.query.orders.findFirst({ where: eq(orders.id, r.orderId) }))!;
    expect(o.plan).toBe('monthly');
    expect(o.status).toBe('paid');
    expect(o.minTermEndsAt).not.toBeNull();
  });

  it('vergebene Wunschdomain bleibt leer (Wahl im Onboarding); fehlende Bestätigung → Meldung', async () => {
    const db = getDb();
    const { demo } = await seedDemo();
    const r = await startHostedCheckout(demo.slug, 'one_time', meta);
    if (!r.ok) throw new Error(r.error);
    await simulateMockPayment(
      sessionOf(r.url),
      'paid',
      collected({}, { wunschdomain: 'vergeben-beispiel.de', unternehmer: '', agb: 'ja' }),
    );
    const o = (await db.query.orders.findFirst({ where: eq(orders.id, r.orderId) }))!;
    expect(o.status).toBe('paid');
    expect(o.domainWish).toBeNull();
    expect(o.b2bConfirmed).toBe(false);
    const c = (await db.query.customers.findFirst({ where: eq(customers.orderId, r.orderId) }))!;
    expect(c.domainStatus).toBe('none');
    expect((await db.select().from(alerts)).some((a) => a.code === `checkout_consent_${r.orderId}`)).toBe(true);
  });
});
