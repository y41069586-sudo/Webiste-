import { appUrl } from '../../config/env';
import { hmacSha256, randomToken, safeEqual } from '../../util/crypto';
import type { CheckoutSession, CheckoutSessionInput, PaymentEvent, PaymentProvider } from '../types';

/**
 * Simulierte Zahlung für Entwicklung und E2E-Tests (ohne Stripe-Konto).
 * Die Seite /checkout/mock/{session} löst das signierte Webhook-Event aus.
 */
export class MockPayment implements PaymentProvider {
  readonly name = 'mock';
  constructor(private readonly secret: string) {}

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    const sessionId = `cs_mock_${randomToken(20)}`;
    const params = new URLSearchParams({ order: input.orderId, amount: String(input.amountCents) });
    return { sessionId, url: appUrl(`/checkout/mock/${sessionId}?${params.toString()}`) };
  }

  sign(rawBody: string): string {
    return hmacSha256(this.secret, `mock-payment:${rawBody}`);
  }

  async parseWebhook(rawBody: string, signatureHeader: string | null): Promise<PaymentEvent> {
    if (!signatureHeader || !safeEqual(signatureHeader, this.sign(rawBody))) {
      throw new Error('Ungültige Signatur');
    }
    return JSON.parse(rawBody) as PaymentEvent;
  }

  async refund(): Promise<void> {
    // nichts zu tun
  }
}
