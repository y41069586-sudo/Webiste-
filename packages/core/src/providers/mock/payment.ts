import { appUrl } from '../../config/env';
import { hmacSha256, randomToken, safeEqual } from '../../util/crypto';
import type { CheckoutSession, CheckoutSessionInput, PaymentEvent, PaymentProvider, SubscriptionCheckoutInput } from '../types';

/**
 * Simulierte Zahlung für Entwicklung und E2E-Tests (ohne Stripe-Konto).
 * Die Seite /checkout/mock/{session} löst das signierte Webhook-Event aus.
 */
export class MockPayment implements PaymentProvider {
  readonly name = 'mock';
  constructor(private readonly secret: string) {}

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    const sessionId = `cs_mock_${randomToken(20)}`;
    const params = new URLSearchParams({
      order: input.orderId,
      amount: String(input.amountCents),
      ...(input.recurring ? { plan: 'monthly' } : {}),
    });
    return { sessionId, url: appUrl(`/checkout/mock/${sessionId}?${params.toString()}`) };
  }

  async createSubscriptionCheckout(input: SubscriptionCheckoutInput): Promise<CheckoutSession> {
    const sessionId = `cs_mock_sub_${randomToken(20)}`;
    return { sessionId, url: appUrl(`/verlaengern/mock/${sessionId}?ref=${encodeURIComponent(input.customerRef)}`) };
  }

  sign(rawBody: string): string {
    return hmacSha256(this.secret, `mock-payment:${rawBody}`);
  }

  async parseWebhook(rawBody: string, signatureHeader: string | null): Promise<PaymentEvent> {
    if (!signatureHeader || !safeEqual(signatureHeader, this.sign(rawBody))) {
      throw new Error('Ungültige Signatur');
    }
    const ev = JSON.parse(rawBody) as PaymentEvent;
    // Datumsfelder kommen als ISO-Strings aus JSON
    for (const k of ['periodStart', 'periodEnd', 'nextPaymentAttempt'] as const) {
      const v = ev[k] as unknown;
      if (typeof v === 'string') (ev as unknown as Record<string, unknown>)[k] = new Date(v);
    }
    return ev;
  }

  async scheduleStepDown(
    subscriptionId: string,
    input: { minTermMonths: number },
  ): Promise<{ scheduleId: string; minTermEndsAt: Date }> {
    const end = new Date();
    end.setUTCMonth(end.getUTCMonth() + input.minTermMonths);
    return { scheduleId: `sub_sched_mock_${subscriptionId.slice(-12)}`, minTermEndsAt: end };
  }

  private async mockState(id: string) {
    const { getSetting } = await import('../../config/service');
    const state = await getSetting<
      (import('../types').SubscriptionState & { scheduled?: { priceId: string; at: string; scheduleId: string } }) | null
    >(`mock:sub:${id}`, null);
    if (!state) throw new Error('Mock-Abo nicht gefunden');
    state.periodStart = new Date(state.periodStart);
    state.periodEnd = new Date(state.periodEnd);
    if (state.scheduled && new Date(state.scheduled.at) <= new Date()) {
      state.priceId = state.scheduled.priceId;
      state.periodStart = new Date(state.scheduled.at);
      const { addMonths } = await import('../../util/time');
      state.periodEnd = addMonths(state.periodStart, 1);
      delete state.scheduled;
      await this.saveMock(state);
    }
    return state;
  }
  private async saveMock(state: import('../types').SubscriptionState) {
    const { setSetting } = await import('../../config/service');
    await setSetting(`mock:sub:${state.id}`, state, 'mock:provider');
  }
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const sub = await this.mockState(subscriptionId);
      sub.status = 'canceled';
      await this.saveMock(sub);
    } catch {
      /* Legacy mocks may not persist subscriptions. */
    }
  }
  async startSavedSubscription(input: Parameters<NonNullable<PaymentProvider['startSavedSubscription']>>[0]) {
    const id = `sub_mock_v4_${input.orderId.replaceAll('-', '')}`;
    try {
      return await this.mockState(id);
    } catch {
      /* first creation */
    }
    const { stripeV4Price } = await import('../../config/stripe-v4-prices');
    const { addMonths } = await import('../../util/time');
    const now = new Date();
    const sub = {
      id,
      status: 'active',
      priceId: stripeV4Price(input.tier, true, input.amountCents, 'eur'),
      periodStart: now,
      periodEnd: addMonths(now, 1),
      cancelAtPeriodEnd: false,
    };
    await this.saveMock(sub);
    return sub;
  }
  async subscriptionState(id: string) {
    return this.mockState(id);
  }
  async scheduleTariffChange(input: Parameters<NonNullable<PaymentProvider['scheduleTariffChange']>>[0]) {
    const sub = await this.mockState(input.subscriptionId);
    if (sub.status !== 'active' || sub.cancelAtPeriodEnd) throw new Error('Mock-Abo nicht wechselbereit');
    const { stripeV4Price } = await import('../../config/stripe-v4-prices');
    const { setSetting } = await import('../../config/service');
    const id = `sched_mock_${input.idempotencyKey.replaceAll('-', '')}`;
    sub.scheduled = {
      priceId: stripeV4Price(input.tier, true, input.amountCents, 'eur'),
      at: sub.periodEnd.toISOString(),
      scheduleId: id,
    };
    await this.saveMock(sub);
    await setSetting(`mock:schedule:${id}`, { subscriptionId: sub.id }, 'mock:provider');
    return { scheduleId: id, effectiveAt: sub.periodEnd };
  }
  async releaseTariffSchedule(id: string): Promise<void> {
    const { getSetting } = await import('../../config/service');
    const ref = await getSetting<{ subscriptionId: string } | null>(`mock:schedule:${id}`, null);
    if (ref) {
      const sub = await this.mockState(ref.subscriptionId);
      delete sub.scheduled;
      await this.saveMock(sub);
    }
  }
  async cancelAtPeriodEnd(id: string): Promise<void> {
    const sub = await this.mockState(id);
    delete sub.scheduled;
    sub.cancelAtPeriodEnd = true;
    await this.saveMock(sub);
  }

  async refundInvoice(invoiceId: string, opts: { idempotencyKey: string }): Promise<{ refundId: string }> {
    void invoiceId;
    return { refundId: `re_mock_${opts.idempotencyKey}` };
  }

  async refund(paymentIntentId: string, opts: { idempotencyKey: string }): Promise<{ refundId: string }> {
    void paymentIntentId;
    return { refundId: `re_mock_${opts.idempotencyKey}` };
  }
}
