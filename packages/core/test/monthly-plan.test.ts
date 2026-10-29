import Stripe from 'stripe';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { updateConfig } from '../src/config/service';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { getDb } from '../src/db/client';
import { alerts, customers, demos, dunningLetters, leads, orderPayments, orders, outboundEmails, sites } from '../src/db/schema';
import { buildInvoiceData, planAmounts } from '../src/invoices/build';
import { getProviders } from '../src/providers';
import type { MockPayment } from '../src/providers/mock/payment';
import { addMonthsUnix, StripePayment } from '../src/providers/payment/stripe';
import type { PaymentEvent } from '../src/providers/types';
import { stopBoss } from '../src/queue';
import { clearDomainCache } from '../src/services/domains';
import { approveClaimLetter, runDunning } from '../src/services/dunning';
import { guaranteeEndFor, guaranteeRefund, guaranteeStatus } from '../src/services/guarantee';
import { processPaymentWebhook, simulateMockPayment, startCheckout, type CheckoutInput } from '../src/services/orders';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

const meta = { ua: 'desktop/chrome', ipHash: 'abc123', isBot: false };

async function seedDemo() {
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
      segmentKey: 'dortmund:beauty:kosmetikstudio',
      trackToken: randomToken(24),
      status: 'cta_clicked',
    })
    .returning();
  const [demo] = await db
    .insert(demos)
    .values({
      leadId: lead!.id,
      slug: randomToken(24),
      templateId: 'beauty-soft',
      palette: 'rose',
      status: 'published',
      publishedAt: new Date(),
      expiresAt: addDays(new Date(), 30),
    })
    .returning();
  return demo!;
}

const input = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  company: 'Kosmetik Beispiel',
  contactName: 'Erika Beispiel',
  email: 'erika@example.org',
  street: 'Ostenhellweg 3',
  postalCode: '44135',
  city: 'Dortmund',
  domain: 'kosmetik-beispiel.de',
  b2b: true,
  terms: true,
  ...over,
});

async function buy(plan: 'one_time' | 'monthly') {
  const demo = await seedDemo();
  const res = await startCheckout(demo.slug, input({ plan }), meta);
  if (!res.ok) throw new Error(res.error);
  const db = getDb();
  const o = (await db.query.orders.findFirst({ where: eq(orders.id, res.orderId) }))!;
  await simulateMockPayment(o.stripeSessionId!, 'paid');
  const order = (await db.query.orders.findFirst({ where: eq(orders.id, res.orderId) }))!;
  const customer = (await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) }))!;
  return { order, customer, res };
}

/** Live-Seite beim (Mock-)Hosting, damit der Wartungsmodus etwas zu tun hat. */
async function liveSite(customerId: string) {
  const db = getDb();
  const [site] = await db
    .insert(sites)
    .values({
      customerId,
      templateId: 'beauty-soft',
      palette: 'rose',
      contentJson: {},
      formKey: randomToken(16),
      status: 'live',
      liveAt: new Date(),
      hostingProvider: 'mock',
      hostingProjectId: 'wbm-test-site',
    })
    .returning();
  await db.update(customers).set({ siteId: site!.id }).where(eq(customers.id, customerId));
  return site!;
}

async function fire(ev: Omit<PaymentEvent, 'eventId'>) {
  const p = getProviders().payment as unknown as MockPayment;
  const raw = JSON.stringify({ eventId: `evt_${randomToken(12)}`, ...ev });
  return processPaymentWebhook(raw, p.sign(raw));
}

describe('Preise und Rechnungstexte (Update 2)', () => {
  it('Standardpreise: 590 € einmalig, 49 €/Monat, 12 Monate, danach 19 €', () => {
    expect(DEFAULT_CONFIG.pricing).toMatchObject({
      packageCents: 59000,
      monthlyCents: 4900,
      minTermMonths: 12,
      subscriptionCents: 1900,
      monthlyEnabled: true,
    });
    // Garantie seit 29.10.2026 standardmäßig aus (abschaltbar, Frist bleibt eingestellt)
    expect(DEFAULT_CONFIG.guarantee).toEqual({ enabled: false, days: 14, latestStartDays: 14 });
    expect(planAmounts(DEFAULT_CONFIG, 'monthly').grossCents).toBe(4900);
  });

  it('Rechnung Option B nennt Rate, Mindestlaufzeit und Folgepreis; Rate 13 ist „Hosting & Pflege“', () => {
    const order = {
      id: '00000000-0000-4000-8000-000000000001',
      plan: 'monthly' as const,
      amountCents: 4900,
      customerCompany: 'K',
      customerName: 'N',
      billingAddressJson: { street: 'A 1', postalCode: '44135', city: 'Dortmund', country: 'DE' },
      domainWish: 'k.de',
    };
    const a = planAmounts(DEFAULT_CONFIG, 'monthly');
    const first = buildInvoiceData(DEFAULT_CONFIG, order, {
      number: 'RE-1',
      paidAt: new Date(),
      issuedAt: new Date(),
      amounts: a,
    });
    expect(first.lines[0]!.title).toContain('Monatsrate 1 von 12');
    expect(first.lines[0]!.description).toContain('Mindestlaufzeit 12 Monate');
    expect(first.lines[0]!.description).toMatch(/19,00\s€\/Monat/);
    expect(first.gross).toMatch(/^49,00\s€$/);
    const later = buildInvoiceData(DEFAULT_CONFIG, order, {
      number: 'RE-2',
      paidAt: new Date(),
      issuedAt: new Date(),
      amounts: a,
      rate: { sequence: 13, periodStart: new Date('2027-11-01'), periodEnd: new Date('2027-12-01'), kind: 'monthly' },
    });
    expect(later.lines[0]!.title).toContain('Hosting & Pflege');
    expect(later.serviceDate).toContain('01.11.2027 bis 30.11.2027');
  });

  it('Mindestlaufzeit-Ende: Kalendermonate wie Stripe (31. Januar → 28./29. Februar)', () => {
    const jan31 = Date.UTC(2027, 0, 31, 10, 0, 0) / 1000;
    expect(new Date(addMonthsUnix(jan31, 1) * 1000).toISOString()).toBe('2027-02-28T10:00:00.000Z');
    expect(new Date(addMonthsUnix(jan31, 12) * 1000).toISOString()).toBe('2028-01-31T10:00:00.000Z');
  });
});

describe('Stripe: Abo-Checkout und Abo-Webhooks', () => {
  it('Plan „monthly“ → mode=subscription mit monatlicher Rate', async () => {
    const calls: string[] = [];
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(`${String(url)}|${init?.body ? String(init.body) : ''}`);
      return new Response(
        JSON.stringify({ id: 'cs_test_sub', object: 'checkout.session', url: 'https://checkout.stripe.com/x' }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }) as typeof fetch;
    const p = new StripePayment({ secretKey: 'sk_test_x', httpClient: Stripe.createFetchHttpClient(fetchFn) });
    await p.createCheckoutSession({
      orderId: 'o1',
      amountCents: 4900,
      currency: 'eur',
      productName: 'Website-Paket monatlich – x.de',
      productDescription: 'Beschreibung',
      customerEmail: 'a@example.org',
      successUrl: 'https://app/erfolg',
      cancelUrl: 'https://app/abbruch',
      metadata: { kind: 'order', orderId: 'o1', plan: 'monthly' },
      idempotencyKey: 'checkout-o1',
      recurring: { interval: 'month' },
    });
    const body = new URLSearchParams(calls[0]!.split('|')[1]);
    expect(body.get('mode')).toBe('subscription');
    expect(body.get('line_items[0][price_data][recurring][interval]')).toBe('month');
    expect(body.get('line_items[0][price_data][unit_amount]')).toBe('4900');
    expect(body.get('subscription_data[metadata][orderId]')).toBe('o1');
    expect(body.get('payment_intent_data[description]')).toBeNull();
    // Betriebe zahlen per Karte oder SEPA-Lastschrift (kein PayPal)
    expect([body.get('allowed_payment_method_types[0]'), body.get('allowed_payment_method_types[1]')]).toEqual([
      'card',
      'sepa_debit',
    ]);
  });

  it('invoice.paid / invoice.payment_failed / subscription.updated werden normalisiert', async () => {
    const p = new StripePayment({ secretKey: 'sk_test_x', webhookSecret: 'whsec_test' });
    const inv = {
      id: 'in_1',
      object: 'invoice',
      billing_reason: 'subscription_cycle',
      amount_paid: 4900,
      amount_due: 4900,
      currency: 'eur',
      hosted_invoice_url: 'https://invoice.stripe.com/i/1',
      attempt_count: 1,
      next_payment_attempt: null,
      period_start: 1,
      period_end: 2,
      lines: { object: 'list', data: [{ period: { start: 1793000000, end: 1795600000 } }] },
      parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_1', metadata: { orderId: 'o1' } } },
      metadata: {},
    };
    const paid = JSON.stringify({ id: 'evt_a', object: 'event', type: 'invoice.paid', data: { object: inv } });
    expect(await p.parseWebhook(paid, p.testSignature(paid))).toMatchObject({
      type: 'invoice.paid',
      invoiceId: 'in_1',
      subscriptionId: 'sub_1',
      billingReason: 'subscription_cycle',
      amountTotal: 4900,
      metadata: { orderId: 'o1' },
      periodStart: new Date(1793000000 * 1000),
    });
    const failed = JSON.stringify({ id: 'evt_b', object: 'event', type: 'invoice.payment_failed', data: { object: inv } });
    expect(await p.parseWebhook(failed, p.testSignature(failed))).toMatchObject({
      type: 'invoice.payment_failed',
      nextPaymentAttempt: null,
      hostedInvoiceUrl: 'https://invoice.stripe.com/i/1',
    });
    const upd = JSON.stringify({
      id: 'evt_c',
      object: 'event',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', object: 'subscription', status: 'unpaid', metadata: {} } },
    });
    expect(await p.parseWebhook(upd, p.testSignature(upd))).toMatchObject({
      type: 'subscription.updated',
      subscriptionId: 'sub_1',
      subscriptionStatus: 'unpaid',
    });
  });
});

describe('Option B „Monatlich“ und Garantie', () => {
  beforeEach(async () => {
    await resetDb();
    clearDomainCache();
    // Diese Tests prüfen die (abschaltbare) Garantie-Funktion selbst
    await updateConfig({ guarantee: { enabled: true } }, 'test');
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('Kauf: erste Rate sofort, Abo + Zeitplan, Mindestlaufzeit, Garantiefrist; Kunde ohne Verlängerungs-Erinnerung', async () => {
    const before = Date.now();
    const { order, customer, res } = await buy('monthly');
    expect(res.ok && res.url).toContain('plan=monthly');
    expect(order).toMatchObject({ status: 'paid', plan: 'monthly', amountCents: 4900, subscriptionStatus: 'active' });
    expect(order.stripeSubscriptionId).toMatch(/^sub_mock_/);
    expect(order.stripeInvoiceId).toMatch(/^in_mock_/);
    expect(order.stripeScheduleId).toMatch(/^sub_sched_mock_/);
    const months = (order.minTermEndsAt!.getTime() - before) / (30.4 * 86400_000);
    expect(months).toBeGreaterThan(11.8);
    expect(months).toBeLessThan(12.2);
    // Vor dem Go-Live: spätester Beginn (Zahlung + 14 Tage) + 14 Tage Garantie
    expect(Math.round((order.guaranteeEndsAt!.getTime() - before) / 86400_000)).toBe(28);
    expect(customer.subscriptionId).toBe(order.stripeSubscriptionId);
    expect((order.invoiceJson as { lines: { title: string }[] }).lines[0]!.title).toContain('Monatsrate 1 von 12');
  });

  it('Folgerate: eigene Rechnung mit fortlaufender Nummer, Wiederholung desselben Belegs zählt nicht doppelt', async () => {
    const { order } = await buy('monthly');
    const ev = {
      type: 'invoice.paid' as const,
      rawType: 'invoice.paid',
      mode: 'subscription' as const,
      subscriptionId: order.stripeSubscriptionId!,
      invoiceId: 'in_cycle_2',
      billingReason: 'subscription_cycle',
      amountTotal: 4900,
      currency: 'eur',
      periodStart: new Date('2026-11-23T10:00:00Z'),
      periodEnd: new Date('2026-12-23T10:00:00Z'),
    };
    expect((await fire(ev)).result).toBe('recorded');
    expect((await fire(ev)).result).toBe('duplicate');
    // Erste Rate (subscription_create) ist bereits in der Bestellrechnung
    expect((await fire({ ...ev, invoiceId: 'in_first', billingReason: 'subscription_create' })).result).toBe('first_rate');
    const rows = await getDb().select().from(orderPayments).where(eq(orderPayments.orderId, order.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ sequence: 2, amountCents: 4900 });
    expect(rows[0]!.invoiceNumber).not.toBe(order.invoiceNumber);
    expect(rows[0]!.invoiceNumber).toMatch(/-0002$/);
    expect((rows[0]!.invoiceJson as { lines: { title: string }[] }).lines[0]!.title).toContain('Monatsrate 2 von 12');
  });

  it('Zahlungsausfall: Smart Retries → 2 Erinnerungen → Wartungsmodus → Forderungsbrief zur Freigabe; Zahlung → online', async () => {
    const { order, customer } = await buy('monthly');
    const site = await liveSite(customer.id);
    const db = getDb();
    const base = {
      rawType: 'invoice.payment_failed',
      mode: 'subscription' as const,
      subscriptionId: order.stripeSubscriptionId!,
      invoiceId: 'in_fail',
      amountTotal: 4900,
      hostedInvoiceUrl: 'https://pay.example/in_fail',
    };
    expect(
      (await fire({ ...base, type: 'invoice.payment_failed', nextPaymentAttempt: new Date(Date.now() + 3 * 86400_000) })).result,
    ).toBe('retrying');
    expect((await fire({ ...base, type: 'invoice.payment_failed', nextPaymentAttempt: null })).result).toBe('dunning');
    const siteNow = async () => (await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!;
    const orderNow = async () => (await db.query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect((await siteNow()).status).toBe('live');
    expect((await orderNow()).dunningStage).toBe(1);
    expect((await orderNow()).subscriptionStatus).toBe('past_due');
    const day = 86400_000;
    expect(await runDunning(new Date(Date.now() + 8 * day))).toMatchObject({ reminders: 1, paused: 0 });
    expect((await siteNow()).status).toBe('live');
    expect(await runDunning(new Date(Date.now() + 16 * day))).toMatchObject({ reminders: 0, paused: 1, claims: 1 });
    expect(await siteNow()).toMatchObject({ status: 'suspended', statusReason: 'wartung:payment' });
    const page = (await getProviders().storage.get('mock-hosting/wbm-test-site/index.html'))!.toString('utf8');
    expect(page).toContain('vorübergehend nicht erreichbar');
    expect(page).toContain('noindex');
    const dunningMails = await db.select().from(outboundEmails).where(eq(outboundEmails.kind, 'dunning'));
    expect(dunningMails).toHaveLength(2);
    // Forderungsbrief: Entwurf mit den offenen Raten bis Monat 12, nie automatisch versendet
    const [claim] = await db.select().from(dunningLetters).where(eq(dunningLetters.orderId, order.id));
    expect(claim).toMatchObject({ status: 'draft', openRates: 11, amountCents: 11 * 4900 });
    expect(await getProviders().storage.exists(claim!.pdfStorageKey!)).toBe(true);
    expect(await approveClaimLetter(claim!.id, 'admin:test')).toBe('approved_dry_run');

    await fire({
      ...base,
      type: 'invoice.paid',
      invoiceId: 'in_fail',
      billingReason: 'subscription_cycle',
      rawType: 'invoice.paid',
    });
    expect(await siteNow()).toMatchObject({ status: 'live', statusReason: null });
    expect(await orderNow()).toMatchObject({ dunningStage: 0, subscriptionStatus: 'active' });
    expect((await db.query.dunningLetters.findFirst({ where: eq(dunningLetters.id, claim!.id) }))!.status).toBe('cancelled');
  });

  it('Abo „unbezahlt“ startet das Mahnverfahren; Abo-Ende vor Mindestlaufzeit → Vertrag beendet, Meldung', async () => {
    const { order, customer } = await buy('monthly');
    const site = await liveSite(customer.id);
    const db = getDb();
    const sub = { mode: 'subscription' as const, subscriptionId: order.stripeSubscriptionId! };
    expect(
      (
        await fire({
          ...sub,
          type: 'subscription.updated',
          rawType: 'customer.subscription.updated',
          subscriptionStatus: 'unpaid',
        })
      ).result,
    ).toBe('dunning');
    expect((await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!.status).toBe('live');
    expect((await fire({ ...sub, type: 'subscription.deleted', rawType: 'customer.subscription.deleted' })).result).toBe('ended');
    const o = (await db.query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(o).toMatchObject({ subscriptionStatus: 'canceled', dunningStage: 1 });
    expect(o.endedAt).not.toBeNull();
    expect(o.endedReason).toContain('Mindestlaufzeit');
    expect((await db.query.customers.findFirst({ where: eq(customers.id, customer.id) }))!.subscriptionId).toBeNull();
    expect((await db.select().from(alerts)).some((a) => a.code === `monthly_ended_${order.id}`)).toBe(true);
  });

  it('Garantie beginnt mit dem Go-Live, spätestens 14 Tage nach der Zahlung', () => {
    const paid = new Date('2026-10-01T10:00:00Z');
    expect(guaranteeEndFor(DEFAULT_CONFIG, paid, new Date('2026-10-05T10:00:00Z')).toISOString()).toBe(
      '2026-10-19T10:00:00.000Z',
    );
    expect(guaranteeEndFor(DEFAULT_CONFIG, paid, new Date('2026-10-30T10:00:00Z')).toISOString()).toBe(
      '2026-10-29T10:00:00.000Z',
    );
    expect(guaranteeEndFor(DEFAULT_CONFIG, paid, null).toISOString()).toBe('2026-10-29T10:00:00.000Z');
  });

  it('Garantie Option B: Vertrag beendet, erste Rate erstattet, Seite offline, Mail an den Kunden', async () => {
    const { order, customer } = await buy('monthly');
    const site = await liveSite(customer.id);
    const db = getDb();
    expect((await guaranteeStatus(order)).available).toBe(true);
    expect(await guaranteeRefund(order.id, 'admin:test')).toEqual({ refundedCents: 4900 });
    const o = (await db.query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(o).toMatchObject({
      status: 'refunded',
      refundedCents: 4900,
      subscriptionStatus: 'canceled',
      endedReason: 'Zufriedenheitsgarantie',
    });
    expect((await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!).toMatchObject({
      status: 'suspended',
      statusReason: 'wartung:guarantee',
    });
    const mails = await db
      .select()
      .from(outboundEmails)
      .where(and(eq(outboundEmails.orderId, order.id), eq(outboundEmails.kind, 'refund')));
    expect(mails).toHaveLength(1);
    // Spätere Abo-Ende-Meldung von Stripe ist erwartbar und ändert nichts mehr
    const sub = { mode: 'subscription' as const, subscriptionId: order.stripeSubscriptionId! };
    expect((await fire({ ...sub, type: 'subscription.deleted', rawType: 'customer.subscription.deleted' })).result).toBe(
      'already_ended',
    );
    await expect(guaranteeRefund(order.id, 'admin:test')).rejects.toThrow(/bezahlte/);
  });

  it('Garantie Option A: voller Betrag; registrierte Domain wird zur Übertragung gemeldet; nach Ablauf gesperrt', async () => {
    const { order, customer } = await buy('one_time');
    const db = getDb();
    await db.update(customers).set({ domainStatus: 'registered' }).where(eq(customers.id, customer.id));
    expect(await guaranteeRefund(order.id, 'admin:test')).toEqual({ refundedCents: 59000 });
    expect((await db.query.customers.findFirst({ where: eq(customers.id, customer.id) }))!.domainStatus).toBe('release_pending');
    expect((await db.select().from(alerts)).some((a) => a.code === `guarantee_domain_${order.id}`)).toBe(true);

    const late = await (async () => {
      const r = await buy('one_time');
      await db
        .update(orders)
        .set({ guaranteeEndsAt: addDays(new Date(), -1) })
        .where(eq(orders.id, r.order.id));
      return (await db.query.orders.findFirst({ where: eq(orders.id, r.order.id) }))!;
    })();
    expect((await guaranteeStatus(late)).available).toBe(false);
    await expect(guaranteeRefund(late.id, 'admin:test')).rejects.toThrow(/abgelaufen/);
  });

  it('Garantie abgeschaltet → keine Frist, kein Button', async () => {
    await updateConfig({ guarantee: { enabled: false } }, 'test');
    const { order } = await buy('one_time');
    expect(order.guaranteeEndsAt).toBeNull();
    expect((await guaranteeStatus(order)).available).toBe(false);
  });

  it('Option B abgeschaltet → Checkout lehnt „monatlich“ ab', async () => {
    await updateConfig({ pricing: { monthlyEnabled: false } }, 'test');
    const demo = await seedDemo();
    const res = await startCheckout(demo.slug, input({ plan: 'monthly' }), meta);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.plan).toBeTruthy();
  });
});
