import { and, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { updateConfig, getConfig } from '../src/config/service';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { getDb } from '../src/db/client';
import { alerts, customers, demos, events, leads, orders, outboundEmails, webhookEvents } from '../src/db/schema';
import { buildCancellationData, buildInvoiceData, packageAmounts } from '../src/invoices/build';
import { getProviders } from '../src/providers';
import type { MockPayment } from '../src/providers/mock/payment';
import { stopBoss } from '../src/queue';
import { clearDomainCache, normalizeDomainInput } from '../src/services/domains';
import { sendTransactionalEmail } from '../src/services/email';
import {
  applyRefund,
  confirmCheckoutReturn,
  fulfillOrder,
  getCheckoutContext,
  processPaymentWebhook,
  simulateMockPayment,
  startCheckout,
  sweepPaidOrders,
  InvalidWebhookError,
  type CheckoutInput,
} from '../src/services/orders';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

const meta = { ua: 'desktop/chrome', ipHash: 'abc123', isBot: false };

async function seedDemo(name = 'Malerbetrieb Beispiel') {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: name,
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

function input(over: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    company: 'Malerbetrieb Beispiel',
    contactName: 'Erika Beispiel',
    email: 'Erika@Example.org',
    phone: '0231 123456',
    street: 'Kampstraße 5',
    postalCode: '44137',
    city: 'Dortmund',
    domain: 'malerbetrieb-beispiel.de',
    b2b: true,
    terms: true,
    ...over,
  };
}

async function checkout(slug: string, over: Partial<CheckoutInput> = {}) {
  const res = await startCheckout(slug, input(over), meta);
  if (!res.ok) throw new Error(`Checkout fehlgeschlagen: ${res.error} ${JSON.stringify(res.fieldErrors)}`);
  const order = await getDb().query.orders.findFirst({ where: eq(orders.id, res.orderId) });
  return { res, order: order! };
}

describe('Beträge und Rechnungsdaten', () => {
  it('Kleinunternehmer: keine USt', () => {
    expect(packageAmounts(DEFAULT_CONFIG)).toEqual({ grossCents: 59000, netCents: 59000, vatCents: 0, vatRatePercent: 0 });
  });
  it('Regelbesteuerung brutto: USt wird herausgerechnet', () => {
    const cfg = { ...DEFAULT_CONFIG, tax: { ...DEFAULT_CONFIG.tax, kleinunternehmer: false } };
    expect(packageAmounts(cfg)).toEqual({ grossCents: 59000, netCents: 49580, vatCents: 9420, vatRatePercent: 19 });
  });
  it('Regelbesteuerung netto: USt kommt hinzu', () => {
    const cfg = { ...DEFAULT_CONFIG, tax: { ...DEFAULT_CONFIG.tax, kleinunternehmer: false, pricesAreGross: false } };
    expect(packageAmounts(cfg)).toEqual({ grossCents: 70210, netCents: 59000, vatCents: 11210, vatRatePercent: 19 });
  });
  it('Rechnung enthält Pflichtangaben und § 19-Hinweis; Storno negiert die Beträge', () => {
    const amounts = packageAmounts(DEFAULT_CONFIG);
    const order = {
      id: '0f9c1d2e-0000-4000-8000-000000000001',
      amountCents: 59000,
      customerCompany: 'Malerbetrieb Beispiel',
      customerName: 'Erika Beispiel',
      billingAddressJson: { street: 'Kampstraße 5', postalCode: '44137', city: 'Dortmund', country: 'DE' },
      domainWish: 'beispiel.de',
    };
    const inv = buildInvoiceData(DEFAULT_CONFIG, order, {
      number: 'RE-2026-0001',
      paidAt: new Date('2026-10-20T10:00:00Z'),
      issuedAt: new Date('2026-10-20T10:00:00Z'),
      amounts,
    });
    expect(inv.number).toBe('RE-2026-0001');
    expect(inv.taxNote).toContain('§ 19 UStG');
    expect(inv.vat).toBeNull();
    expect(inv.seller.taxNumber).toBe(DEFAULT_CONFIG.sender.taxNumber);
    expect(inv.serviceDate).toContain('20.10.2026');
    expect(inv.gross).toBe('590,00 €');
    const storno = buildCancellationData(inv, {
      number: 'RE-2026-0002',
      issuedAt: new Date('2026-10-25T10:00:00Z'),
      refundedCents: 59000,
      amounts,
    });
    expect(storno.kind).toBe('cancellation');
    expect(storno.originalNumber).toBe('RE-2026-0001');
    expect(storno.gross).toBe('-590,00 €');
  });
});

describe('Wunschdomain', () => {
  it('normalisiert Eingaben', () => {
    expect(normalizeDomainInput('https://www.Müller-Maler.de/', ['de'])).toMatchObject({ ok: true, domain: 'mueller-maler.de' });
    expect(normalizeDomainInput('maler kowalski', ['de'])).toMatchObject({ ok: true, domain: 'maler-kowalski.de' });
    expect(normalizeDomainInput('shop.maler.de', ['de']).ok).toBe(false);
    expect(normalizeDomainInput('maler.com', ['de']).ok).toBe(false);
    expect(normalizeDomainInput('-maler.de', ['de']).ok).toBe(false);
    expect(normalizeDomainInput('ab.de', ['de']).ok).toBe(false);
  });
});

describe('Checkout und Zahlung', () => {
  beforeEach(async () => {
    await resetDb();
    clearDomainCache();
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('Kontext: Vorbelegung aus dem Lead, Preis aus der Config', async () => {
    const { demo } = await seedDemo();
    const ctx = await getCheckoutContext(demo.slug);
    expect(ctx.state).toBe('ok');
    if (ctx.state !== 'ok') return;
    expect(ctx.prefill).toEqual({
      company: 'Malerbetrieb Beispiel',
      street: 'Kampstraße 5',
      postalCode: '44137',
      city: 'Dortmund',
      domain: 'malerbetrieb-beispiel.de',
    });
    expect(ctx.price.grossCents).toBe(59000);
  });

  it('Pflichtfelder und Checkboxen werden geprüft', async () => {
    const { demo } = await seedDemo();
    const res = await startCheckout(
      demo.slug,
      input({ b2b: false as never, terms: false as never, postalCode: '441', email: 'kaputt' }),
      meta,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(Object.keys(res.fieldErrors ?? {}).sort()).toEqual(['b2b', 'email', 'postalCode', 'terms']);
    expect(await getDb().select().from(orders)).toHaveLength(0);
  });

  it('vergebene Domain → Fehlermeldung mit freien Alternativen', async () => {
    const { demo } = await seedDemo();
    const res = await startCheckout(demo.slug, input({ domain: 'vergeben.de' }), meta);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.fieldErrors?.domain).toContain('vergeben');
    expect(res.alternatives?.length).toBeGreaterThan(0);
  });

  it('legt Bestellung an, setzt Lead auf checkout_started; Doppelklick liefert dieselbe Session', async () => {
    const { demo, lead } = await seedDemo();
    const { res, order } = await checkout(demo.slug);
    expect(order).toMatchObject({
      status: 'pending',
      amountCents: 59000,
      netCents: 59000,
      vatCents: 0,
      customerEmail: 'erika@example.org',
      domainWish: 'malerbetrieb-beispiel.de',
      b2bConfirmed: true,
    });
    expect(order.termsVersion).toBe((await getConfig()).legal.termsVersion);
    expect(res.url).toContain('/checkout/mock/cs_mock_');
    const l = await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) });
    expect(l!.status).toBe('checkout_started');
    const again = await startCheckout(demo.slug, input(), meta);
    expect(again.ok && again.orderId).toBe(order.id);
    // Andere Daten → neue Bestellung, alte wird beendet
    const other = await checkout(demo.slug, { domain: 'maler-beispiel-dortmund.de' });
    expect(other.order.id).not.toBe(order.id);
    const old = await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) });
    expect(old!.status).toBe('cancelled');
  });

  it('Zahlung: Rechnungsnummer, Kunde, Lead „paid“, Demo läuft nicht mehr ab; Replay wird ignoriert', async () => {
    const { demo, lead } = await seedDemo();
    const { order } = await checkout(demo.slug);
    const back = await simulateMockPayment(order.stripeSessionId!, 'paid');
    expect(back).toContain(`/checkout/${demo.slug}/erfolg?session_id=`);
    const db = getDb();
    const paid = (await db.query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    const year = new Intl.DateTimeFormat('de-DE', { year: 'numeric', timeZone: 'Europe/Berlin' }).format(new Date());
    expect(paid.status).toBe('paid');
    expect(paid.invoiceNumber).toBe(`RE-${year}-0001`);
    expect(paid.invoiceJson).toMatchObject({ number: `RE-${year}-0001`, buyer: { company: 'Malerbetrieb Beispiel' } });
    const cust = await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) });
    expect(cust).toMatchObject({
      company: 'Malerbetrieb Beispiel',
      domain: 'malerbetrieb-beispiel.de',
      domainStatus: 'available',
    });
    expect(cust!.accessToken).toHaveLength(32);
    expect((await db.query.leads.findFirst({ where: eq(leads.id, lead.id) }))!.status).toBe('paid');
    expect((await db.query.demos.findFirst({ where: eq(demos.id, demo.id) }))!.expiresAt).toBeNull();
    expect(
      await db
        .select()
        .from(events)
        .where(and(eq(events.leadId, lead.id), eq(events.type, 'paid'))),
    ).toHaveLength(1);

    // Bereits gekauft: Checkout zeigt „bestellt“, ohne Onboarding-Token
    expect(await getCheckoutContext(demo.slug)).toEqual({ state: 'ordered' });

    // Erfolgsseite
    const ret = await confirmCheckoutReturn(demo.slug, order.stripeSessionId!);
    expect(ret).toEqual({ state: 'paid', customerToken: cust!.accessToken, invoiceNumber: `RE-${year}-0001` });
    expect(await confirmCheckoutReturn('falscherSlugAAAAAAAAAAAA', order.stripeSessionId!)).toEqual({ state: 'unknown' });

    // Replay desselben Events
    const p = getProviders().payment as MockPayment;
    const raw = JSON.stringify({
      eventId: 'evt_fix_1',
      type: 'checkout.completed',
      rawType: 'x',
      sessionId: order.stripeSessionId,
      paymentStatus: 'paid',
      amountTotal: 59000,
      currency: 'eur',
    });
    expect((await processPaymentWebhook(raw, p.sign(raw))).duplicate).toBe(false);
    expect((await processPaymentWebhook(raw, p.sign(raw))).duplicate).toBe(true);
    expect((await db.query.orders.findFirst({ where: eq(orders.id, order.id) }))!.invoiceNumber).toBe(`RE-${year}-0001`);
    expect(await db.select().from(customers)).toHaveLength(1);
  });

  it('ungültige Signatur wird abgelehnt', async () => {
    const raw = JSON.stringify({ eventId: 'evt_x', type: 'checkout.completed' });
    await expect(processPaymentWebhook(raw, 'falsch')).rejects.toBeInstanceOf(InvalidWebhookError);
    expect(await getDb().select().from(webhookEvents)).toHaveLength(0);
  });

  it('gleichzeitige Verbuchung vergibt genau eine Nummer; Nummern laufen fortlaufend', async () => {
    const a = await seedDemo('Betrieb A');
    const b = await seedDemo('Betrieb B');
    const oa = (await checkout(a.demo.slug, { domain: 'betrieb-a.de' })).order;
    const ob = (await checkout(b.demo.slug, { domain: 'betrieb-b.de' })).order;
    const results = await Promise.all([1, 2, 3].map(() => fulfillOrder(oa.id, { amountTotal: 59000, currency: 'eur' }, 'test')));
    expect(results.filter((r) => r.state === 'paid' && !r.alreadyPaid)).toHaveLength(1);
    await fulfillOrder(ob.id, { amountTotal: 59000 }, 'test');
    const nums = (await getDb().select({ n: orders.invoiceNumber }).from(orders)).map((r) => r.n).sort();
    expect(nums.map((n) => n!.slice(-4))).toEqual(['0001', '0002']);
  });

  it('abweichender Betrag → keine Verbuchung, Alarm', async () => {
    const { demo } = await seedDemo();
    const { order } = await checkout(demo.slug);
    const r = await fulfillOrder(order.id, { amountTotal: 100 }, 'test');
    expect(r.state).toBe('mismatch');
    const o = await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) });
    expect(o!.status).toBe('processing');
    expect(o!.invoiceNumber).toBeNull();
    expect((await getDb().select().from(alerts)).some((x) => x.code.startsWith('payment_mismatch'))).toBe(true);
  });

  it('Lastschrift: erst „processing“, bei Fehlschlag „failed“ + E-Mail an den Käufer', async () => {
    const { demo, lead } = await seedDemo();
    const { order } = await checkout(demo.slug);
    await simulateMockPayment(order.stripeSessionId!, 'sepa_processing');
    expect((await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!.status).toBe('processing');
    expect(await confirmCheckoutReturn(demo.slug, order.stripeSessionId!)).toEqual({ state: 'processing' });
    // Laufende Zahlung sperrt weitere Bestellungen für diesen Entwurf
    expect((await startCheckout(demo.slug, input(), meta)).ok).toBe(false);
    await getDb().update(orders).set({ status: 'cancelled' }).where(eq(orders.id, order.id));

    const { order: o2 } = await checkout(demo.slug, { domain: 'maler-beispiel-dortmund.de' });
    await simulateMockPayment(o2.stripeSessionId!, 'sepa_failed');
    expect((await getDb().query.orders.findFirst({ where: eq(orders.id, o2.id) }))!.status).toBe('failed');
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) }))!.status).toBe('cta_clicked');
    const mails = await getDb().select().from(outboundEmails).where(eq(outboundEmails.orderId, o2.id));
    expect(mails.map((m) => m.kind)).toEqual(['payment_failed']);
    expect(mails[0]!.toEmail).toBe('erika@example.org');
  });

  it('Erstattung: Status refunded, idempotent über den Betrag', async () => {
    const { demo } = await seedDemo();
    const { order } = await checkout(demo.slug);
    await simulateMockPayment(order.stripeSessionId!, 'paid');
    expect(await applyRefund(order.id, 10000, 'test')).toBe(true);
    expect((await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!.status).toBe('paid');
    expect(await applyRefund(order.id, 10000, 'test')).toBe(false);
    expect(await applyRefund(order.id, 59000, 'test')).toBe(true);
    const o = await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) });
    expect(o).toMatchObject({ status: 'refunded', refundedCents: 59000 });
  });

  it('Sweeper schließt abgelaufene offene Bestellungen', async () => {
    const { demo } = await seedDemo();
    const { order } = await checkout(demo.slug);
    await getDb()
      .update(orders)
      .set({ checkoutExpiresAt: addDays(new Date(), -1) })
      .where(eq(orders.id, order.id));
    await sweepPaidOrders();
    expect((await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!.status).toBe('expired');
  });

  it('Preisänderung nach Bestellung ändert die Rechnung nicht', async () => {
    const { demo } = await seedDemo();
    const { order } = await checkout(demo.slug);
    await updateConfig({ pricing: { packageCents: 49000 } }, 'test');
    await simulateMockPayment(order.stripeSessionId!, 'paid');
    const o = await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) });
    expect(o!.status).toBe('paid');
    expect((o!.invoiceJson as { gross: string }).gross).toBe('590,00 €');
  });
});

describe('Transaktions-Mails', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('gleicher Schlüssel ⇒ nur eine Mail', async () => {
    const mail = { kind: 'test', idempotencyKey: 'k1', to: 'a@example.org', subject: 'Hallo', text: 'Text', html: '<p>Text</p>' };
    expect((await sendTransactionalEmail(mail)).status).toBe('sent');
    expect((await sendTransactionalEmail(mail)).status).toBe('duplicate');
    expect(await getDb().select().from(outboundEmails)).toHaveLength(1);
  });

  it('ungültige Adresse wird abgelehnt', async () => {
    await expect(
      sendTransactionalEmail({ kind: 'test', idempotencyKey: 'k2', to: 'kaputt', subject: 's', text: 't', html: '' }),
    ).rejects.toThrow();
  });
});
