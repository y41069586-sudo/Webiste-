import Stripe from 'stripe';
import type {
  CheckoutSession,
  CheckoutSessionInput,
  PaymentEvent,
  PaymentEventType,
  PaymentProvider,
  PaymentSessionInfo,
  PaymentStatus,
  SubscriptionCheckoutInput,
} from '../types';

/** Geprüft gegen stripe-node 23.0.1 (API-Version 2026-09-30.endive), siehe docs/integrations.md. */
const EVENT_TYPES: Record<string, PaymentEventType> = {
  'checkout.session.completed': 'checkout.completed',
  'checkout.session.async_payment_succeeded': 'checkout.async_succeeded',
  'checkout.session.async_payment_failed': 'checkout.async_failed',
  'checkout.session.expired': 'checkout.expired',
  'charge.refunded': 'charge.refunded',
  'customer.subscription.deleted': 'subscription.deleted',
};

function paymentStatus(v: string | null | undefined): PaymentStatus {
  return v === 'paid' || v === 'no_payment_required' ? v : 'unpaid';
}

function idOf(v: string | { id: string } | null | undefined): string | undefined {
  if (!v) return undefined;
  return typeof v === 'string' ? v : v.id;
}

function metadataOf(m: Stripe.Metadata | null | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(m ?? {}).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

export interface StripePaymentConfig {
  secretKey: string;
  webhookSecret?: string;
  /** Nur für Tests: eigener HTTP-Client (z. B. Fake-fetch) */
  httpClient?: NonNullable<ConstructorParameters<typeof Stripe>[1]>['httpClient'];
}

/**
 * Stripe Checkout (gehostete Seite, Modus „payment“). Die Rechnung erstellen wir selbst
 * (fortlaufende Nummer, § 19 UStG), daher keine Stripe-Rechnung. Fulfillment ausschließlich
 * idempotent über Webhooks + Abfrage auf der Erfolgsseite.
 */
export class StripePayment implements PaymentProvider {
  readonly name = 'stripe';
  private readonly stripe: Stripe;

  constructor(private readonly cfg: StripePaymentConfig) {
    this.stripe = new Stripe(cfg.secretKey, {
      maxNetworkRetries: 2,
      timeout: 30_000,
      appInfo: { name: 'WebsiteBriefMaschine', version: '0.1.0' },
      ...(cfg.httpClient ? { httpClient: cfg.httpClient } : {}),
    });
  }

  get testMode(): boolean {
    return this.cfg.secretKey.startsWith('sk_test_') || this.cfg.secretKey.startsWith('rk_test_');
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    const minutes = Math.min(24 * 60, Math.max(30, input.expiresInMinutes ?? 60));
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      locale: 'de',
      submit_type: 'pay',
      client_reference_id: input.orderId,
      customer_email: input.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: input.amountCents,
            product_data: { name: input.productName, description: input.productDescription.slice(0, 500) },
          },
        },
      ],
      metadata: input.metadata,
      payment_intent_data: { description: input.productName, metadata: input.metadata },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + minutes * 60,
      custom_text: {
        submit: { message: 'Die Rechnung kommt per E-Mail. Danach geht es direkt mit Ihren Angaben für die Website weiter.' },
      },
    };
    const session = await this.stripe.checkout.sessions.create(params, { idempotencyKey: input.idempotencyKey });
    if (!session.url) throw new Error('Stripe hat keine Checkout-URL geliefert');
    return { sessionId: session.id, url: session.url };
  }

  /** Abo mit Testphase bis zum Ende des inklusiven Hostings (Stripe: trial_end ≥ 48 h in der Zukunft). */
  async createSubscriptionCheckout(input: SubscriptionCheckoutInput): Promise<CheckoutSession> {
    const minTrial = Math.floor(Date.now() / 1000) + 49 * 3600;
    const trialEnd = Math.max(minTrial, Math.floor(input.billingStartsAt.getTime() / 1000));
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        locale: 'de',
        client_reference_id: input.customerRef,
        customer_email: input.customerEmail,
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: input.amountCents, recurring: { interval: 'month' }, product_data: { name: input.productName } } }],
        subscription_data: { trial_end: trialEnd, metadata: input.metadata },
        metadata: input.metadata,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (!session.url) throw new Error('Stripe hat keine Checkout-URL geliefert');
    return { sessionId: session.id, url: session.url };
  }

  async retrieveSession(sessionId: string): Promise<PaymentSessionInfo | null> {
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
    try {
      const s = await this.stripe.checkout.sessions.retrieve(sessionId);
      return {
        sessionId: s.id,
        status: s.status ?? 'open',
        paymentStatus: paymentStatus(s.payment_status),
        clientReferenceId: s.client_reference_id ?? undefined,
        paymentIntentId: idOf(s.payment_intent),
        amountTotal: s.amount_total ?? undefined,
        currency: s.currency ?? undefined,
        metadata: metadataOf(s.metadata),
      };
    } catch (err) {
      if (err instanceof Stripe.errors.StripeInvalidRequestError && err.statusCode === 404) return null;
      throw err;
    }
  }

  async expireSession(sessionId: string): Promise<void> {
    try {
      await this.stripe.checkout.sessions.expire(sessionId);
    } catch (err) {
      // bereits abgeschlossen/abgelaufen → nichts zu tun
      if (err instanceof Stripe.errors.StripeInvalidRequestError) return;
      throw err;
    }
  }

  async parseWebhook(rawBody: string, signatureHeader: string | null): Promise<PaymentEvent> {
    if (!this.cfg.webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET fehlt');
    if (!signatureHeader) throw new Error('Stripe-Signature fehlt');
    // wirft StripeSignatureVerificationError bei falscher Signatur oder zu altem Zeitstempel
    const event = this.stripe.webhooks.constructEvent(rawBody, signatureHeader, this.cfg.webhookSecret);
    const type = EVENT_TYPES[event.type] ?? 'other';
    const base: PaymentEvent = { eventId: event.id, type, rawType: event.type };
    if (event.type.startsWith('checkout.session.')) {
      const s = event.data.object as Stripe.Checkout.Session;
      return {
        ...base,
        sessionId: s.id,
        clientReferenceId: s.client_reference_id ?? undefined,
        paymentIntentId: idOf(s.payment_intent),
        paymentStatus: paymentStatus(s.payment_status),
        amountTotal: s.amount_total ?? undefined,
        currency: s.currency ?? undefined,
        metadata: metadataOf(s.metadata),
        mode: s.mode === 'subscription' ? 'subscription' : 'payment',
        subscriptionId: idOf(s.subscription),
      };
    }
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      return { ...base, subscriptionId: sub.id, metadata: metadataOf(sub.metadata), mode: 'subscription' };
    }
    if (event.type === 'charge.refunded') {
      const c = event.data.object as Stripe.Charge;
      return {
        ...base,
        paymentIntentId: idOf(c.payment_intent),
        amountTotal: c.amount,
        amountRefunded: c.amount_refunded,
        currency: c.currency,
        metadata: metadataOf(c.metadata),
      };
    }
    return base;
  }

  async refund(paymentIntentId: string, opts: { idempotencyKey: string; amountCents?: number }): Promise<{ refundId: string }> {
    const r = await this.stripe.refunds.create(
      { payment_intent: paymentIntentId, ...(opts.amountCents ? { amount: opts.amountCents } : {}), reason: 'requested_by_customer' },
      { idempotencyKey: opts.idempotencyKey },
    );
    return { refundId: r.id };
  }

  /** Nur für Tests: gültigen Signatur-Header erzeugen. */
  testSignature(payload: string): string {
    if (!this.cfg.webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET fehlt');
    return this.stripe.webhooks.generateTestHeaderString({ payload, secret: this.cfg.webhookSecret });
  }
}
