import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { StripePayment } from '../src/providers/payment/stripe';
import { stripeV4Price } from '../src/config/stripe-v4-prices';

/** Echte Stripe-Aufrufe (Live-Katalog, gefälschter HTTP-Client): Setup-Checkout und verzögerter Abostart. */
function harness(sessionMode: 'setup' | 'subscription' = 'setup') {
  const calls: { path: string; method: string; body: URLSearchParams }[] = [];
  const now = Math.floor(Date.now() / 1000);
  const p = new StripePayment({
    secretKey: 'rk_live_fixture',
    allowLive: true,
    webhookSecret: 'whsec_fixture',
    httpClient: Stripe.createFetchHttpClient((async (url, init) => {
      const u = new URL(String(url));
      const method = init?.method ?? 'GET';
      const body = new URLSearchParams(String(init?.body ?? ''));
      calls.push({ path: u.pathname, method, body });
      let result: unknown;
      if (u.pathname === '/v1/checkout/sessions' && method === 'POST')
        result = { id: 'cs_live_fixture', url: 'https://checkout.stripe.com/x' };
      else if (u.pathname.startsWith('/v1/checkout/sessions/'))
        result = {
          id: 'cs_live_fixture',
          mode: sessionMode,
          status: 'complete',
          subscription: sessionMode === 'subscription' ? 'sub_fixture' : null,
          metadata: { orderId: 'order_fixture' },
          customer: 'cus_fixture',
          setup_intent: {
            id: 'seti_fixture',
            status: 'succeeded',
            payment_method: { id: 'pm_fixture', type: 'sepa_debit', customer: 'cus_fixture' },
          },
        };
      else if (u.pathname === '/v1/subscriptions' && method === 'GET') result = { object: 'list', data: [], has_more: false };
      else
        result = {
          id: 'sub_fixture',
          status: 'active',
          customer: 'cus_fixture',
          metadata: sessionMode === 'subscription' ? { orderId: 'order_fixture' } : {},
          items: {
            data: [
              {
                id: 'si',
                price: { id: stripeV4Price('komplett', false, 17900, 'eur', true) },
                current_period_start: now,
                current_period_end: now + 2592000,
              },
            ],
          },
          cancel_at_period_end: false,
          latest_invoice: null,
        };
      return new Response(JSON.stringify(result), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch),
  });
  return { p, calls };
}

describe('Komplett über Stripe (Live-Katalog, ohne Netz)', () => {
  it('Checkout als Abo: heute 0 €, Stichtag 7 Tage nach Bestellung, kein Testzeitraum, Bedingungen sichtbar', async () => {
    const { p, calls } = harness();
    await p.createCheckoutSession({
      orderId: 'order_fixture',
      amountCents: 0,
      currency: 'eur',
      productName: 'SeitenWerk Komplett – Testbetrieb',
      productDescription: 'x',
      successUrl: 'https://app.example/ok',
      cancelUrl: 'https://app.example/no',
      metadata: { kind: 'order', orderId: 'order_fixture', plan: 'komplett' },
      idempotencyKey: 'checkout-order_fixture',
      collect: { termsUrl: 'https://app.example/agb', termsVersion: '1', recurringTerms: true, submitNote: 'x' },
    });
    const b = calls.find((c) => c.path === '/v1/checkout/sessions' && c.method === 'POST')!.body;
    expect(b.get('mode')).toBe('subscription');
    expect(b.get('line_items[0][price]')).toBe(stripeV4Price('komplett', false, 17900, 'eur', true));
    expect(b.get('subscription_data[trial_period_days]')).toBeNull();
    const anchor = Number(b.get('subscription_data[billing_cycle_anchor]'));
    expect(Math.abs(anchor - (Math.floor(Date.now() / 1000) + 7 * 86400))).toBeLessThan(60);
    expect(b.get('subscription_data[proration_behavior]')).toBe('none');
    expect(b.get('subscription_data[metadata][orderId]')).toBe('order_fixture');
    expect([...b.keys()].some((k) => k.startsWith('custom_fields'))).toBe(true); // wie Basis: Wunschdomain usw.
    expect(b.get('custom_text[submit][message]')).toMatch(/nichts abgebucht/);
    await expect(
      p.createCheckoutSession({
        orderId: 'o',
        amountCents: 100,
        currency: 'eur',
        productName: 'x',
        productDescription: 'x',
        successUrl: 'https://a/ok',
        cancelUrl: 'https://a/no',
        metadata: { plan: 'komplett', orderId: 'o' },
        idempotencyKey: 'k',
      }),
    ).rejects.toThrow(/nichts abbuchen/);
  });

  it('Abostart nutzt das gespeicherte Mandat und bucht erst zum vereinbarten Termin ab', async () => {
    const { p, calls } = harness();
    const liveAt = new Date(Date.now() - 60_000);
    const firstChargeAt = new Date(liveAt.getTime() + 7 * 86_400_000);
    await p.startSavedSubscription({
      orderId: 'order_fixture',
      customerId: 'c1',
      setupSessionId: 'cs_live_fixture',
      tier: 'komplett',
      amountCents: 17900,
      liveAt,
      firstChargeAt,
      minTermMonths: 12,
      idempotencyKey: 'v4-go-live-order_fixture',
    });
    const create = calls.find((c) => c.path === '/v1/subscriptions' && c.method === 'POST')!.body;
    expect(create.get('items[0][price]')).toBe('price_1UYm9IKIPZjo7zRA6i880q7z');
    expect(create.get('default_payment_method')).toBe('pm_fixture');
    expect(Number(create.get('trial_end'))).toBe(Math.floor(firstChargeAt.getTime() / 1000));
    expect(create.get('metadata[minTermMonths]')).toBe('12');
  });

  it('Abo aus dem Checkout (seit 19.11.2026) wird übernommen, kein zweites Abo', async () => {
    const { p, calls } = harness('subscription');
    const sub = await p.startSavedSubscription({
      orderId: 'order_fixture',
      customerId: 'c1',
      setupSessionId: 'cs_live_fixture',
      tier: 'komplett',
      amountCents: 17900,
      liveAt: new Date(),
      firstChargeAt: new Date(Date.now() + 7 * 86_400_000),
      minTermMonths: 12,
      idempotencyKey: 'v4-order-order_fixture',
    });
    expect(sub.id).toBe('sub_fixture');
    expect(calls.some((c) => c.path === '/v1/subscriptions' && c.method === 'POST')).toBe(false);
    const upd = calls.find((c) => c.path === '/v1/subscriptions/sub_fixture' && c.method === 'POST')!.body;
    expect(upd.get('metadata[customerId]')).toBe('c1');
    await expect(
      p.startSavedSubscription({
        orderId: 'anderer',
        customerId: 'c1',
        setupSessionId: 'cs_live_fixture',
        tier: 'komplett',
        amountCents: 17900,
        liveAt: new Date(),
        idempotencyKey: 'x',
      }),
    ).rejects.toThrow(/falsch zugeordnet/);
  });

  it('Kündigung in der Mindestlaufzeit setzt cancel_at auf deren Ende', async () => {
    const { p, calls } = harness();
    const end = new Date(Date.now() + 300 * 86_400_000);
    await p.cancelAt('sub_fixture', end, 'v4-cancel-x');
    const upd = calls.find((c) => c.path === '/v1/subscriptions/sub_fixture' && c.method === 'POST')!.body;
    expect(Number(upd.get('cancel_at'))).toBe(Math.floor(end.getTime() / 1000));
    expect(upd.get('cancel_at_period_end')).toBeNull();
  });
});
