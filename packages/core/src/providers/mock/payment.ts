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

  async cancelSubscription(subscriptionId: string): Promise<void> {
    void subscriptionId;
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
