import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { StripePayment } from '../src/providers/payment/stripe';
import { stripeV4Price } from '../src/config/stripe-v4-prices';

const basis = stripeV4Price('basis', true, 1900, 'eur');
const care = stripeV4Price('care_plus', true, 9900, 'eur');
function harness(
  opts: { paid?: boolean; method?: string; existing?: boolean; key?: string; scheduled?: boolean; allowLive?: boolean } = {},
) {
  const calls: { path: string; method: string; body: URLSearchParams; key: string | null }[] = [];
  const start = Math.floor(Date.now() / 1000) - 30,
    end = start + 2592000;
  const sub = {
    id: 'sub_fixture',
    status: 'active',
    customer: 'cus_fixture',
    metadata: { orderId: 'order_fixture', offerVersion: 'v4' },
    items: {
      data: [
        {
          id: 'si_fixture',
          price: { id: opts.allowLive ? stripeV4Price('basis', false, 1900, 'eur', true) : basis },
          current_period_start: start,
          current_period_end: end,
        },
      ],
    },
    cancel_at_period_end: false,
    latest_invoice: { hosted_invoice_url: 'https://invoice.stripe.com/test-fixture' },
    schedule: opts.scheduled ? 'sched_fixture' : null,
  };
  const p = new StripePayment({
    secretKey: opts.key ?? 'rk_test_fixture',
    allowLive: opts.allowLive,
    webhookSecret: 'whsec_fixture',
    httpClient: Stripe.createFetchHttpClient((async (url, init) => {
      const u = new URL(String(url)),
        method = init?.method ?? 'GET',
        body = new URLSearchParams(String(init?.body ?? ''));
      calls.push({ path: u.pathname, method, body, key: new Headers(init?.headers).get('Idempotency-Key') });
      let result: unknown;
      if (u.pathname.includes('/checkout/sessions/'))
        result = {
          id: 'cs_fixture',
          mode: 'payment',
          payment_status: opts.paid === false ? 'unpaid' : 'paid',
          metadata: { orderId: 'order_fixture' },
          customer: 'cus_fixture',
          payment_intent: {
            id: 'pi_fixture',
            setup_future_usage: 'off_session',
            payment_method: { id: 'pm_fixture', type: opts.method ?? 'card', customer: 'cus_fixture' },
          },
        };
      else if (u.pathname === '/v1/subscriptions' && method === 'GET')
        result = { object: 'list', data: opts.existing ? [sub] : [], has_more: false };
      else if (u.pathname.includes('/subscription_schedules'))
        result = { id: 'sched_fixture', status: 'active', metadata: {}, phases: [{ start_date: start, end_date: end }] };
      else result = sub;
      return new Response(JSON.stringify(result), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch),
  });
  return { p, calls, sub, start, end };
}
const input = {
  orderId: 'order_fixture',
  customerId: 'customer_fixture',
  setupSessionId: 'cs_fixture',
  tier: 'basis' as const,
  amountCents: 1900,
  liveAt: new Date(Date.now() - 1000),
  idempotencyKey: 'v4-fixture-go-live',
};
describe('V4 Stripe SDK: gespeichertes Mandat und ein einziger Tarif', () => {
  it.each(['card', 'sepa_debit'])('%s: ohne zweite Checkoutsession, ohne Rückdatierung, eine Monatsposition', async (method) => {
    const { p, calls } = harness({ method });
    const state = await p.startSavedSubscription(input);
    expect(state.status).toBe('active');
    expect(state.priceId).toBe(basis);
    const create = calls.find((c) => c.path === '/v1/subscriptions' && c.method === 'POST')!;
    expect(create.body.get('items[0][price]')).toBe(basis);
    expect(create.body.has('items[1][price]')).toBe(false);
    expect(create.body.get('default_payment_method')).toBe('pm_fixture');
    expect(create.body.get('payment_behavior')).toBe('allow_incomplete');
    expect(create.body.get('off_session')).toBe('true');
    expect(create.body.has('backdate_start_date')).toBe(false);
    expect(create.body.has('trial_end')).toBe(false);
    expect(create.key).toBe(input.idempotencyKey);
  });
  it('Stripe-Erfolg vor DB-Abbruch wird durch Suche auch nach Idempotenz-TTL wiedergefunden', async () => {
    const { p, calls } = harness({ existing: true });
    expect((await p.startSavedSubscription(input)).id).toBe('sub_fixture');
    expect(calls.some((c) => c.path === '/v1/subscriptions' && c.method === 'POST')).toBe(false);
  });
  it('unbezahlte Einrichtung, unbekanntes Mandat, Live-Key und Zukunfts-Live blockieren', async () => {
    await expect(harness({ paid: false }).p.startSavedSubscription(input)).rejects.toThrow(/Einrichtungszahlung/);
    await expect(harness({ method: 'paypal' }).p.startSavedSubscription(input)).rejects.toThrow(/Mandat/);
    expect(() => harness({ key: 'rk_live_fixture' })).toThrow(/Sandbox/);
    await expect(harness().p.startSavedSubscription({ ...input, liveAt: new Date(Date.now() + 3600000) })).rejects.toThrow(
      /Go-Live/,
    );
  });
  it('Care+ zum tatsächlichen Periodenende, ohne zweite Subscription oder Proration', async () => {
    const { p, calls, end } = harness();
    const r = await p.scheduleTariffChange({
      subscriptionId: 'sub_fixture',
      tier: 'care_plus',
      amountCents: 9900,
      expectedPriceId: basis,
      idempotencyKey: 'switch-fixture',
    });
    expect(r.effectiveAt.getTime()).toBe(end * 1000);
    const update = calls.find((c) => c.path === '/v1/subscription_schedules/sched_fixture' && c.method === 'POST')!;
    expect(update.body.get('phases[0][items][0][price]')).toBe(basis);
    expect(update.body.get('phases[1][items][0][price]')).toBe(care);
    expect(update.body.get('phases[1][start_date]')).toBe(String(end));
    expect(update.body.get('proration_behavior')).toBe('none');
    expect(calls.some((c) => c.path === '/v1/subscriptions' && c.method === 'POST')).toBe(false);
  });
  it('Kündigung gibt offenen Tarifplan frei und endet zum Periodenende', async () => {
    const { p, calls } = harness({ scheduled: true });
    await p.cancelAtPeriodEnd('sub_fixture', 'cancel-fixture');
    expect(calls.some((c) => c.path === '/v1/subscription_schedules/sched_fixture/release')).toBe(true);
    const update = calls.find((c) => c.path === '/v1/subscriptions/sub_fixture' && c.method === 'POST')!;
    expect(update.body.get('cancel_at_period_end')).toBe('true');
    expect(update.body.get('proration_behavior')).toBe('none');
  });
  it('echte Stripe-Signatur wird geprüft; nur invoice.paid ist Zahlungseingang', async () => {
    const { p } = harness();
    const payload = JSON.stringify({
      id: 'evt_fixture',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_fixture',
          currency: 'eur',
          amount_due: 1900,
          amount_paid: 0,
          parent: { subscription_details: { subscription: 'sub_fixture', metadata: { offerVersion: 'v4' } } },
          lines: { data: [{ pricing: { price_details: { price: basis } }, period: { start: 1000, end: 2000 } }] },
        },
      },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fixture' });
    const event = await p.parseWebhook(payload, signature);
    expect(event.type).toBe('invoice.payment_failed');
    expect(event.subscriptionPriceId).toBe(basis);
    await expect(p.parseWebhook(payload, 'invalid')).rejects.toThrow();
  });
});

describe('Freigegebener Live-Modus mit ausschließlich lokalem Fake-Transport', () => {
  it.each(['basis', 'care_plus'] as const)('%s startet erst ab Go-Live und mit dem Live-Preis', async (tier) => {
    const { p, calls } = harness({ key: 'rk_live_fixture', allowLive: true });
    await p.startSavedSubscription({ ...input, tier, amountCents: tier === 'basis' ? 1900 : 9900 });
    const create = calls.find((c) => c.path === '/v1/subscriptions' && c.method === 'POST')!;
    expect(create.body.get('items[0][price]')).toBe(stripeV4Price(tier, false, tier === 'basis' ? 1900 : 9900, 'eur', true));
    expect(create.body.has('items[1][price]')).toBe(false);
    expect(create.body.has('backdate_start_date')).toBe(false);
    await expect(p.startSavedSubscription({ ...input, liveAt: new Date(Date.now() + 60_000) })).rejects.toThrow(/Go-Live/);
  });

  it('Live-Kündigung und Tarifplanfreigabe bleiben verfügbar', async () => {
    const { p, calls } = harness({ key: 'rk_live_fixture', allowLive: true, scheduled: true });
    await p.subscriptionState('sub_fixture');
    await p.cancelAtPeriodEnd('sub_fixture', 'cancel-live-fixture');
    expect(calls.some((c) => c.path.endsWith('/sched_fixture/release'))).toBe(true);
    expect(
      calls.find((c) => c.path === '/v1/subscriptions/sub_fixture' && c.method === 'POST')?.body.get('cancel_at_period_end'),
    ).toBe('true');
  });

  it('signierter Sandbox-Webhook kann die Live-Buchhaltung nicht erreichen', async () => {
    const { p } = harness({ key: 'rk_live_fixture', allowLive: true });
    const payload = JSON.stringify({
      id: 'evt_wrong_mode',
      type: 'checkout.session.completed',
      livemode: false,
      data: { object: {} },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fixture' });
    await expect(p.parseWebhook(payload, signature)).rejects.toThrow(/Zahlungsumgebung/);
  });
});
