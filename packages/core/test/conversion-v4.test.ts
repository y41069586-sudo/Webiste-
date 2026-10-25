import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { orders, orderPayments } from '../src/db/schema';
import { StripePayment } from '../src/providers/payment/stripe';
import { stopBoss } from '../src/queue';
import { clearDomainCache } from '../src/services/domains';
import { startSubscriptionCheckout } from '../src/services/renewals';
import { resetDb } from './helpers';

import { buy, live, webhook } from './v4-helpers';

describe('V4: versionierte Neukunden-Verträge', () => {
  beforeEach(async () => {
    await resetDb();
    clearDomainCache();
    await updateConfig({ offers: { activeVersion: 'v4', billingMode: 'manual_checkout' } }, 'test:v4');
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
      collect: {
        termsUrl: 'https://example.test/agb',
        termsVersion: 'v4',
        submitNote: 'Both tiers share an initial price',
        recurringTerms: true,
      },
    });
    const p = captured.at(-1)!;
    expect(p.get('mode')).toBe('payment');
    expect(p.get('line_items[0][price]')).toBe('price_1UULWxGn2A630LhHdvSaUslJ');
    expect(p.get('integration_identifier')).toMatch(/^seitenwerk_v4_[a-z]{8}$/);
    expect(p.has('subscription_data')).toBe(false);
    expect(p.get('custom_text[submit][message]')).toContain('SeitenWerk Basis');
    expect(p.get('custom_text[submit][message]')).toContain('19');
    expect(p.get('custom_text[submit][message]')).not.toContain('99');
    expect(p.get('custom_fields[2][label][custom]')).toMatch(/Basis.*19/);
    expect(p.has('custom_fields[3][key]')).toBe(false);
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
