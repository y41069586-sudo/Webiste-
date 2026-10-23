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
  'invoice.paid': 'invoice.paid',
  'invoice.payment_failed': 'invoice.payment_failed',
  'customer.subscription.updated': 'subscription.updated',
  'customer.subscription.deleted': 'subscription.deleted',
};

function fromUnix(v: number | null | undefined): Date | undefined {
  return typeof v === 'number' ? new Date(v * 1000) : undefined;
}

/** Kalendermonate addieren (UTC), wie Stripe den monatlichen Abrechnungsanker fortschreibt. */
export function addMonthsUnix(unix: number, months: number): number {
  const d = new Date(unix * 1000);
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()),
  );
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return Math.floor(target.getTime() / 1000);
}

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
 * Stripe Checkout (gehostete Seite). Option A: Modus „payment“; Option B: Modus „subscription“
 * (erste Rate sofort) plus Subscription Schedule (12 Monate 49 € → danach 19 €). Zahlungsarten kommen
 * aus den Dashboard-Einstellungen (dynamische Zahlungsmethoden: Karte, SEPA, PayPal). Die Rechnungen
 * erstellen wir selbst (fortlaufende Nummer, § 19 UStG). Fulfillment ausschließlich idempotent über
 * Webhooks + Abfrage auf der Erfolgsseite.
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
    if (input.recurring) {
      const session = await this.stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          locale: 'de',
          client_reference_id: input.orderId,
          customer_email: input.customerEmail,
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: input.currency,
                unit_amount: input.amountCents,
                recurring: { interval: input.recurring.interval },
                product_data: { name: input.productName, description: input.productDescription.slice(0, 500) },
              },
            },
          ],
          metadata: input.metadata,
          subscription_data: { description: input.productName, metadata: input.metadata },
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          expires_at: Math.floor(Date.now() / 1000) + minutes * 60,
          custom_text: {
            submit: {
              message:
                'Die erste Monatsrate wird sofort fällig. Die Rechnung kommt per E-Mail, danach geht es direkt mit Ihren Angaben weiter.',
            },
          },
        },
        { idempotencyKey: input.idempotencyKey },
      );
      if (!session.url) throw new Error('Stripe hat keine Checkout-URL geliefert');
      return { sessionId: session.id, url: session.url };
    }
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
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: input.amountCents,
              recurring: { interval: 'month' },
              product_data: { name: input.productName },
            },
          },
        ],
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
        subscriptionId: idOf(s.subscription),
        invoiceId: idOf(s.invoice),
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
    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      return {
        ...base,
        subscriptionId: sub.id,
        subscriptionStatus: sub.status,
        metadata: metadataOf(sub.metadata),
        mode: 'subscription',
      };
    }
    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const inv = event.data.object as Stripe.Invoice;
      const details = inv.parent?.subscription_details ?? null;
      // Leistungszeitraum steht an der Position (invoice.period_* beschreibt bei Abos den Vorzeitraum)
      const line = inv.lines?.data?.[0];
      return {
        ...base,
        mode: 'subscription',
        invoiceId: inv.id,
        subscriptionId: details ? idOf(details.subscription) : undefined,
        metadata: metadataOf(details?.metadata ?? inv.metadata),
        billingReason: inv.billing_reason ?? undefined,
        amountTotal: event.type === 'invoice.paid' ? inv.amount_paid : inv.amount_due,
        currency: inv.currency,
        periodStart: fromUnix(line?.period?.start ?? inv.period_start),
        periodEnd: fromUnix(line?.period?.end ?? inv.period_end),
        hostedInvoiceUrl: inv.hosted_invoice_url ?? undefined,
        attemptCount: inv.attempt_count,
        nextPaymentAttempt: inv.next_payment_attempt ? new Date(inv.next_payment_attempt * 1000) : null,
      };
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
      {
        payment_intent: paymentIntentId,
        ...(opts.amountCents ? { amount: opts.amountCents } : {}),
        reason: 'requested_by_customer',
      },
      { idempotencyKey: opts.idempotencyKey },
    );
    return { refundId: r.id };
  }

  async scheduleStepDown(
    subscriptionId: string,
    input: { minTermMonths: number; afterTermCents: number; idempotencyKey: string },
  ): Promise<{ scheduleId: string; minTermEndsAt: Date }> {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
    const item = sub.items.data[0];
    if (!item) throw new Error('Abo ohne Position');
    const product = typeof item.price.product === 'string' ? item.price.product : item.price.product.id;
    const minTermEnd = addMonthsUnix(sub.start_date, input.minTermMonths);
    const existingId = idOf(sub.schedule);
    const schedule = existingId
      ? await this.stripe.subscriptionSchedules.retrieve(existingId)
      : await this.stripe.subscriptionSchedules.create(
          { from_subscription: subscriptionId },
          { idempotencyKey: `${input.idempotencyKey}-create` },
        );
    // Bereits umgestellt (z. B. Webhook-Wiederholung)?
    if (schedule.phases.length >= 2) return { scheduleId: schedule.id, minTermEndsAt: new Date(minTermEnd * 1000) };
    const current = schedule.phases[0]!;
    await this.stripe.subscriptionSchedules.update(
      schedule.id,
      {
        end_behavior: 'release',
        proration_behavior: 'none',
        phases: [
          {
            items: [{ price: item.price.id, quantity: 1 }],
            start_date: current.start_date,
            end_date: minTermEnd,
            proration_behavior: 'none',
          },
          {
            items: [
              {
                price_data: {
                  currency: item.price.currency,
                  product,
                  unit_amount: input.afterTermCents,
                  recurring: { interval: 'month' },
                },
                quantity: 1,
              },
            ],
            duration: { interval: 'month', interval_count: 1 },
            proration_behavior: 'none',
          },
        ],
      },
      { idempotencyKey: `${input.idempotencyKey}-update` },
    );
    return { scheduleId: schedule.id, minTermEndsAt: new Date(minTermEnd * 1000) };
  }

  async cancelSubscription(subscriptionId: string, opts: { idempotencyKey: string }): Promise<void> {
    try {
      const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
      if (sub.status === 'canceled' || sub.status === 'incomplete_expired') return;
      const scheduleId = idOf(sub.schedule);
      if (scheduleId) {
        // Abbrechen des Zeitplans beendet auch das Abo
        await this.stripe.subscriptionSchedules.cancel(
          scheduleId,
          { invoice_now: false, prorate: false },
          { idempotencyKey: opts.idempotencyKey },
        );
      } else {
        await this.stripe.subscriptions.cancel(
          subscriptionId,
          { invoice_now: false, prorate: false },
          { idempotencyKey: opts.idempotencyKey },
        );
      }
    } catch (err) {
      if (err instanceof Stripe.errors.StripeInvalidRequestError && err.statusCode === 404) return;
      throw err;
    }
  }

  async refundInvoice(invoiceId: string, opts: { idempotencyKey: string; amountCents?: number }): Promise<{ refundId: string }> {
    const inv = await this.stripe.invoices.retrieve(invoiceId, { expand: ['payments'] });
    const payment = inv.payments?.data.find((p) => p.status === 'paid') ?? inv.payments?.data[0];
    const pi = payment ? idOf(payment.payment.payment_intent) : undefined;
    const charge = payment ? idOf(payment.payment.charge) : undefined;
    if (!pi && !charge) throw new Error('Zur Rechnung wurde keine Zahlung gefunden.');
    const r = await this.stripe.refunds.create(
      {
        ...(pi ? { payment_intent: pi } : { charge }),
        ...(opts.amountCents ? { amount: opts.amountCents } : {}),
        reason: 'requested_by_customer',
      },
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
