import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { customers, demos, leads, orders, orderPayments, sites } from '../src/db/schema';
import { StripePayment } from '../src/providers/payment/stripe';
import { stopBoss } from '../src/queue';
import { clearDomainCache } from '../src/services/domains';
import { startHostedCheckout, simulateMockPayment, processPaymentWebhook } from '../src/services/orders';
import { startSubscriptionCheckout } from '../src/services/renewals';
import { getProviders } from '../src/providers';
import { MockPayment } from '../src/providers/mock/payment';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

const meta = { ua: 'fixture/browser', ipHash: 'v4-fixture', isBot: false };
async function buy(tier: 'basis' | 'care_plus') {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Testbetrieb',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Beispielstadt',
      street: 'Musterweg',
      houseNumber: '1',
      postalCode: '12345',
      segmentKey: 'test:handwerk:maler',
      trackToken: randomToken(24),
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
  const result = await startHostedCheckout(demo!.slug, tier, meta);
  if (!result.ok) throw new Error(result.error);
  const pending = (await db.query.orders.findFirst({ where: eq(orders.id, result.orderId) }))!;
  expect(pending.offerSnapshot?.consentAt).toBeNull();
  await simulateMockPayment(pending.stripeSessionId!, 'paid', {
    businessName: 'Testbetrieb',
    name: 'Erika Beispiel',
    email: 'fixture@example.test',
    address: { line1: 'Musterweg 1', postalCode: '12345', city: 'Beispielstadt', country: 'DE' },
    customFields: { wunschdomain: 'fixture-beispiel.de', unternehmer: 'ja', agb: 'ja' },
  });
  const order = (await db.query.orders.findFirst({ where: eq(orders.id, result.orderId) }))!;
  const customer = (await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) }))!;
  return { order, customer };
}
async function live(customerId: string) {
  const db = getDb();
  const existing = await db.query.sites.findFirst({ where: eq(sites.customerId, customerId) });
  if (existing)
    return db
      .update(sites)
      .set({ status: 'live', liveAt: new Date(Date.now() - 1000) })
      .where(eq(sites.id, existing.id));
  return db
    .insert(sites)
    .values({
      customerId,
      templateId: 'handwerk-solid',
      palette: 'werkblau',
      contentJson: {},
      formKey: randomToken(24),
      formTargetEmail: 'fixture@example.test',
      status: 'live',
      liveAt: new Date(Date.now() - 1000),
    });
}
async function webhook(event: Record<string, unknown>) {
  const raw = JSON.stringify(event);
  return processPaymentWebhook(raw, (getProviders().payment as MockPayment).sign(raw));
}

describe('V4: versionierte Neukunden-Verträge', () => {
  beforeEach(async () => {
    await resetDb();
    clearDomainCache();
    await updateConfig({ offers: { activeVersion: 'v4' } }, 'test:v4');
  });
  afterAll(async () => {
    await stopBoss();
  });
  it.each(['basis', 'care_plus'] as const)(
    '%s: nur 597 Euro Einrichtung, kein Abo vor tatsächlichem Go-Live, keine alte Hosting-Jahreszusage',
    async (tier) => {
      const { order, customer } = await buy(tier);
      expect(order.amountCents).toBe(59700);
      expect(order.offerSnapshot).toMatchObject({
        version: 'v4',
        tier,
        monthlyCents: tier === 'basis' ? 1900 : 9900,
        minTermMonths: 0,
      });
      expect(order.offerSnapshot?.consentAt).toBeTruthy();
      expect(order.stripeSubscriptionId).toBeNull();
      expect(order.minTermEndsAt).toBeNull();
      expect(order.guaranteeEndsAt).toBeNull();
      expect(JSON.stringify(order.invoiceJson)).not.toContain('12 Monate');
      expect((await startSubscriptionCheckout(customer.accessToken)).ok).toBe(false);
      await live(customer.id);
      const sessions = await Promise.all([
        startSubscriptionCheckout(customer.accessToken),
        startSubscriptionCheckout(customer.accessToken),
      ]);
      expect(sessions[0].ok).toBe(true);
      expect(sessions[0]).toEqual(sessions[1]);
    },
  );
  it('erste Abo-Rechnung vor Checkout-Webhook: einmal buchen; wiederholtes Event, Doppelabo und falscher Betrag werden abgefangen', async () => {
    const { order, customer } = await buy('care_plus');
    await live(customer.id);
    await startSubscriptionCheckout(customer.accessToken);
    const current = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    const ev = {
      eventId: 'evt_v4_invoice',
      type: 'invoice.paid',
      rawType: 'invoice.paid',
      subscriptionId: 'sub_v4_fixture',
      invoiceId: 'in_v4_fixture',
      amountTotal: 9900,
      currency: 'eur',
      billingReason: 'subscription_create',
      metadata: { kind: 'subscription', customerId: customer.id, orderId: order.id, offerVersion: 'v4', tier: 'care_plus' },
    };
    await webhook(ev);
    await webhook(ev);
    const paid = await getDb().select().from(orderPayments).where(eq(orderPayments.orderId, order.id));
    expect(paid).toHaveLength(1);
    expect(paid[0]!.amountCents).toBe(9900);
    expect((await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!.subscriptionStatus).toBe('active');
    await webhook({
      ...ev,
      eventId: 'evt_v4_checkout',
      type: 'checkout.completed',
      rawType: 'checkout.session.completed',
      sessionId: current.recurringCheckoutSessionId,
      clientReferenceId: customer.id,
    });
    await expect(webhook({ ...ev, eventId: 'evt_v4_bad_amount', invoiceId: 'in_v4_bad', amountTotal: 11800 })).rejects.toThrow(
      /Vertrag/,
    );
    await expect(
      webhook({
        ...ev,
        eventId: 'evt_v4_second',
        type: 'checkout.completed',
        rawType: 'checkout.session.completed',
        subscriptionId: 'sub_second',
        sessionId: current.recurringCheckoutSessionId,
      }),
    ).rejects.toThrow(/Zweites/);
    expect((await startSubscriptionCheckout(customer.accessToken)).ok).toBe(false);
  });
});

describe('Stripe V4: echter SDK, ausschließlich aufgezeichnete Fake-HTTP-Aufrufe', () => {
  const captured: URLSearchParams[] = [];
  function provider(key = 'rk_test_fixture') {
    return new StripePayment({
      secretKey: key,
      httpClient: Stripe.createFetchHttpClient((async (_url, init) => {
        captured.push(new URLSearchParams(String(init?.body ?? '')));
        return new Response(JSON.stringify({ id: 'cs_test_fixture', url: 'https://checkout.stripe.com/test-fixture' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }) as typeof fetch),
    });
  }
  it('Einrichtung referenziert den angelegten 597-Euro-Preis, niemals einen Abopreis', async () => {
    await provider().createCheckoutSession({
      orderId: 'fixture',
      amountCents: 59700,
      currency: 'eur',
      productName: 'Einrichtung',
      productDescription: 'Beschreibung',
      successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel',
      metadata: { plan: 'basis' },
      idempotencyKey: 'fixture-v4-setup',
    });
    const p = captured.at(-1)!;
    expect(p.get('mode')).toBe('payment');
    expect(p.get('line_items[0][price]')).toBe('price_1UULWxGn2A630LhHdvSaUslJ');
    expect(p.get('integration_identifier')).toMatch(/^seitenwerk_v4_[a-z]{8}$/);
    expect(p.has('subscription_data')).toBe(false);
  });
  it.each([
    ['basis', 1900, 'price_1UULX3Gn2A630LhHDA6Or60k'],
    ['care_plus', 9900, 'price_1UULX8Gn2A630LhH0F3MgcLP'],
  ] as const)('%s nutzt genau einen Monats-Preis und keine vorzeitige Testphase', async (tier, amountCents, price) => {
    const input = {
      customerRef: 'fixture',
      customerEmail: 'fixture@example.test',
      amountCents,
      productName: tier,
      billingStartsAt: new Date(Date.now() - 1000),
      confirmedGoLive: true,
      metadata: { offerVersion: 'v4', tier },
      successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel',
      idempotencyKey: 'fixture-v4-sub',
    };
    await provider().createSubscriptionCheckout(input);
    const p = captured.at(-1)!;
    expect(p.get('mode')).toBe('subscription');
    expect(p.get('line_items[0][price]')).toBe(price);
    expect(p.has('line_items[1][price]')).toBe(false);
    expect(p.has('subscription_data[trial_end]')).toBe(false);
    await expect(provider('rk_live_fixture').createSubscriptionCheckout(input)).rejects.toThrow(/Sandbox/);
    await expect(provider().createSubscriptionCheckout({ ...input, confirmedGoLive: false })).rejects.toThrow(/Go-Live/);
    await expect(provider().createSubscriptionCheckout({ ...input, amountCents: 11800 })).rejects.toThrow(/Preis/);
  });
});
