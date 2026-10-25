import Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { stripeV4Price } from '../../config/stripe-v4-prices';
import { isV4Tier, v4Offer, v4CheckoutTerms, type V4Tier } from '../../services/offers-v4';
import { CHECKOUT_FIELDS } from '../types';
import type {
  CheckoutSession,
  CheckoutSessionInput,
  CollectedCustomer,
  PaymentEvent,
  PaymentEventType,
  PaymentProvider,
  PaymentSessionInfo,
  PaymentStatus,
  SubscriptionCheckoutInput,
  SubscriptionState,
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

/**
 * Kunden sind Betriebe: Karte und SEPA-Lastschrift (PayPal bewusst nicht, Entscheidung des Betreibers).
 * Seit API 2026-09-30 gibt es `payment_method_types` nicht mehr; `allowed_payment_method_types` filtert die im
 * Dashboard aktiven Zahlungsarten – ist SEPA dort nicht aktiv, wird nur Karte angeboten (kein Fehler).
 */
const DEFAULT_PAYMENT_METHODS: Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType[] = ['card', 'sepa_debit'];

function v4IntegrationLabel(key: string): string {
  // Stable across retries with the same Idempotency-Key, with the required eight-letter suffix.
  const suffix = [...createHash('sha256').update(key).digest().subarray(0, 8)]
    .map((n) => String.fromCharCode(97 + (n % 26)))
    .join('');
  return `seitenwerk_v4_${suffix}`;
}

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
 * fest: Karte und SEPA-Lastschrift. Die Rechnungen
 * erstellen wir selbst (fortlaufende Nummer, § 19 UStG). Fulfillment ausschließlich idempotent über
 * Webhooks + Abfrage auf der Erfolgsseite.
 */
/** Gehosteter Checkout: Firmenname, Name, Adresse, Telefon und eigene Felder (Stripe API, geprüft siehe docs/integrations.md). */
function collectionParams(input: CheckoutSessionInput): Partial<Stripe.Checkout.SessionCreateParams> {
  const c = input.collect;
  if (!c) return {};
  const tier = isV4Tier(input.metadata.plan ?? '') ? (input.metadata.plan as V4Tier) : null;
  return {
    billing_address_collection: 'required',
    name_collection: { business: { enabled: true, optional: false }, individual: { enabled: true, optional: false } },
    phone_number_collection: { enabled: true },
    custom_fields: [
      {
        key: CHECKOUT_FIELDS.domain,
        label: { type: 'custom', custom: 'Wunschdomain (z. B. ihr-betrieb.de)' },
        type: 'text',
        text: { ...(c.domainDefault ? { default_value: c.domainDefault } : {}), minimum_length: 4, maximum_length: 63 },
      },
      {
        key: CHECKOUT_FIELDS.b2b,
        label: { type: 'custom', custom: 'Bestellung als Unternehmer (§ 14 BGB)' },
        type: 'dropdown',
        dropdown: { options: [{ label: 'Ja, ich bestelle für meinen Betrieb', value: 'ja' }] },
      },
      {
        key: CHECKOUT_FIELDS.terms,
        label: {
          type: 'custom',
          custom: c.recurringTerms
            ? tier
              ? `AGB und ${tier === 'basis' ? 'Basis' : 'Care+'}: ${v4Offer(tier).monthlyCents / 100} €/Monat ab Go-Live`
              : 'AGB und gewählter Monatstarif ab Go-Live'
            : `AGB (Stand ${c.termsVersion}) gelesen und akzeptiert`.slice(0, 100),
        },
        type: 'dropdown',
        dropdown: {
          options: [
            {
              label: c.recurringTerms ? 'Ja, AGB und Monatstarif ausdrücklich akzeptiert' : 'Ja, ich akzeptiere die AGB',
              value: 'ja',
            },
          ],
        },
      },
    ],
    custom_text: {
      submit: { message: `${c.submitNote} AGB: ${c.termsUrl}`.slice(0, 1200) },
    },
  };
}

/** Erfasste Kundendaten aus der Session (nur gehosteter Checkout). */
function collectedCustomer(s: Stripe.Checkout.Session): CollectedCustomer | undefined {
  const fields: Record<string, string> = {};
  for (const f of s.custom_fields ?? []) {
    const v = f.text?.value ?? f.dropdown?.value ?? f.numeric?.value ?? null;
    if (v) fields[f.key] = v;
  }
  const d = s.customer_details;
  const business = s.collected_information?.business_name ?? d?.business_name ?? undefined;
  const individual = s.collected_information?.individual_name ?? d?.individual_name ?? undefined;
  if (!Object.keys(fields).length && !business) return undefined;
  return {
    businessName: business ?? undefined,
    name: individual ?? d?.name ?? undefined,
    email: d?.email ?? undefined,
    phone: d?.phone ?? undefined,
    address: d?.address
      ? {
          line1: d.address.line1 ?? undefined,
          line2: d.address.line2 ?? undefined,
          postalCode: d.address.postal_code ?? undefined,
          city: d.address.city ?? undefined,
          country: d.address.country ?? undefined,
        }
      : undefined,
    customFields: fields,
  };
}

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
    const v4 = isV4Tier(input.metadata.plan ?? '');
    if (v4 && input.recurring) throw new Error('V4-Einrichtung darf noch kein Monatsabo starten.');
    const setupPrice = v4 ? stripeV4Price('setup', this.testMode, input.amountCents, input.currency) : null;
    const minutes = Math.min(24 * 60, Math.max(30, input.expiresInMinutes ?? 60));
    if (input.recurring) {
      const session = await this.stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          locale: 'de',
          allowed_payment_method_types: input.paymentMethods ?? DEFAULT_PAYMENT_METHODS,
          client_reference_id: input.orderId,
          ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
          ...collectionParams(input),
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
          ...(input.collect
            ? {}
            : {
                custom_text: {
                  submit: {
                    message:
                      'Die erste Monatsrate wird sofort fällig. Die Rechnung kommt per E-Mail, danach geht es direkt mit Ihren Angaben weiter.',
                  },
                },
              }),
        },
        { idempotencyKey: input.idempotencyKey },
      );
      if (!session.url) throw new Error('Stripe hat keine Checkout-URL geliefert');
      return { sessionId: session.id, url: session.url };
    }
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      locale: 'de',
      allowed_payment_method_types: input.paymentMethods ?? DEFAULT_PAYMENT_METHODS,
      submit_type: 'pay',
      client_reference_id: input.orderId,
      ...(v4 ? { integration_identifier: v4IntegrationLabel(input.idempotencyKey) } : {}),
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      line_items: [
        {
          quantity: 1,
          ...(setupPrice
            ? { price: setupPrice }
            : {
                price_data: {
                  currency: input.currency,
                  unit_amount: input.amountCents,
                  product_data: { name: input.productName, description: input.productDescription.slice(0, 500) },
                },
              }),
        },
      ],
      metadata: input.metadata,
      payment_intent_data: { description: input.productName, metadata: input.metadata },
      ...(v4
        ? {
            customer_creation: 'always',
            payment_intent_data: { description: input.productName, metadata: input.metadata, setup_future_usage: 'off_session' },
          }
        : {}),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + minutes * 60,
      custom_text: {
        submit: { message: 'Die Rechnung kommt per E-Mail. Danach geht es direkt mit Ihren Angaben für die Website weiter.' },
      },
      ...collectionParams(input),
      ...(v4
        ? {
            custom_text: {
              submit: {
                message:
                  `${v4CheckoutTerms(input.metadata.plan as V4Tier)}${input.collect ? ` AGB: ${input.collect.termsUrl}` : ''}`.slice(
                    0,
                    1200,
                  ),
              },
            },
          }
        : {}),
    };
    const session = await this.stripe.checkout.sessions.create(params, { idempotencyKey: input.idempotencyKey });
    if (!session.url) throw new Error('Stripe hat keine Checkout-URL geliefert');
    return { sessionId: session.id, url: session.url };
  }

  /** Abo mit Testphase bis zum Ende des inklusiven Hostings (Stripe: trial_end ≥ 48 h in der Zukunft). */
  async createSubscriptionCheckout(input: SubscriptionCheckoutInput): Promise<CheckoutSession> {
    const v4 = input.metadata.offerVersion === 'v4';
    if (v4 && (!input.confirmedGoLive || !isV4Tier(input.metadata.tier ?? '')))
      throw new Error('V4-Monatsabo benötigt bestätigten Go-Live und einen gültigen Tarif.');
    const recurringPrice = v4
      ? stripeV4Price(input.metadata.tier as 'basis' | 'care_plus', this.testMode, input.amountCents, 'eur')
      : null;
    if (input.confirmedGoLive && (!Number.isFinite(input.billingStartsAt.getTime()) || input.billingStartsAt > new Date()))
      throw new Error('Go-Live ist noch nicht bestätigt.');
    const minTrial = Math.floor(Date.now() / 1000) + 49 * 3600;
    const trialEnd = Math.max(minTrial, Math.floor(input.billingStartsAt.getTime() / 1000));
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        locale: 'de',
        ...(v4 ? { integration_identifier: v4IntegrationLabel(input.idempotencyKey) } : {}),
        allowed_payment_method_types: DEFAULT_PAYMENT_METHODS,
        client_reference_id: input.customerRef,
        customer_email: input.customerEmail,
        line_items: [
          {
            quantity: 1,
            ...(recurringPrice
              ? { price: recurringPrice }
              : {
                  price_data: {
                    currency: 'eur',
                    unit_amount: input.amountCents,
                    recurring: { interval: 'month' },
                    product_data: { name: input.productName },
                  },
                }),
          },
        ],
        subscription_data: { ...(input.confirmedGoLive ? {} : { trial_end: trialEnd }), metadata: input.metadata },
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
        customer: collectedCustomer(s),
      };
    } catch (err) {
      if (err instanceof Stripe.errors.StripeInvalidRequestError && err.statusCode === 404) return null;
      throw err;
    }
  }

  private subscriptionInfo(sub: Stripe.Subscription): SubscriptionState {
    const item = sub.items.data[0];
    if (!item || sub.items.data.length !== 1) throw new Error('V4 erwartet genau eine Abo-Position.');
    const invoice = typeof sub.latest_invoice === 'object' ? sub.latest_invoice : null;
    return {
      id: sub.id,
      status: sub.status,
      priceId: item.price.id,
      periodStart: new Date(item.current_period_start * 1000),
      periodEnd: new Date(item.current_period_end * 1000),
      hostedInvoiceUrl: invoice?.hosted_invoice_url,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }

  async subscriptionState(id: string): Promise<SubscriptionState> {
    if (!this.testMode) throw new Error('V4-Aboverwaltung bisher nur in der Sandbox freigegeben.');
    return this.subscriptionInfo(await this.stripe.subscriptions.retrieve(id, { expand: ['latest_invoice'] }));
  }

  async startSavedSubscription(
    input: Parameters<NonNullable<PaymentProvider['startSavedSubscription']>>[0],
  ): Promise<SubscriptionState> {
    const price = stripeV4Price(input.tier, this.testMode, input.amountCents, 'eur');
    if (!Number.isFinite(input.liveAt.getTime()) || input.liveAt > new Date()) throw new Error('Bestätigter Go-Live fehlt.');
    const session = await this.stripe.checkout.sessions.retrieve(input.setupSessionId, {
      expand: ['payment_intent.payment_method'],
    });
    if (session.mode !== 'payment' || session.payment_status !== 'paid' || session.metadata?.orderId !== input.orderId)
      throw new Error('Einrichtungszahlung ist nicht bestätigt oder falsch zugeordnet.');
    const customer = idOf(session.customer);
    const intent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
    const method = intent && typeof intent.payment_method === 'object' ? intent.payment_method : null;
    if (
      !customer ||
      !intent ||
      intent.setup_future_usage !== 'off_session' ||
      !method ||
      idOf(method.customer) !== customer ||
      !['card', 'sepa_debit'].includes(method.type)
    )
      throw new Error('Wiederverwendbares Zahlungsmittel/Mandat fehlt; manuelle Prüfung erforderlich.');
    // Recover a crash after Stripe succeeded but before our DB commit, even after Stripe's idempotency TTL.
    for await (const existing of this.stripe.subscriptions.list({ customer, status: 'all', limit: 100 })) {
      if (existing.metadata.orderId === input.orderId && existing.metadata.offerVersion === 'v4')
        return this.subscriptionInfo(existing);
    }
    const sub = await this.stripe.subscriptions.create(
      {
        customer,
        default_payment_method: method.id,
        items: [{ price }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: {
          kind: 'subscription',
          offerVersion: 'v4',
          tier: input.tier,
          orderId: input.orderId,
          customerId: input.customerId,
        },
        expand: ['latest_invoice'],
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return this.subscriptionInfo(sub);
  }

  async scheduleTariffChange(
    input: Parameters<NonNullable<PaymentProvider['scheduleTariffChange']>>[0],
  ): Promise<{ scheduleId: string; effectiveAt: Date }> {
    const price = stripeV4Price(input.tier, this.testMode, input.amountCents, 'eur');
    const sub = await this.stripe.subscriptions.retrieve(input.subscriptionId);
    if (sub.status !== 'active' || sub.cancel_at_period_end || sub.items.data.length !== 1)
      throw new Error('Tarifwechsel erfordert ein aktives, ungekündigtes Einzelabo.');
    const item = sub.items.data[0]!;
    if (input.expectedPriceId && item.price.id !== input.expectedPriceId) throw new Error('Aktueller Abo-Preis weicht ab.');
    const schedule = sub.schedule
      ? await this.stripe.subscriptionSchedules.retrieve(idOf(sub.schedule)!)
      : await this.stripe.subscriptionSchedules.create(
          { from_subscription: sub.id },
          { idempotencyKey: `${input.idempotencyKey}-create` },
        );
    if (schedule.metadata?.tariffChangeKey === input.idempotencyKey)
      return { scheduleId: schedule.id, effectiveAt: new Date(schedule.phases[1]!.start_date * 1000) };
    if (schedule.phases.length > 1) throw new Error('Ein vorhandener Tarifplan muss zuerst geprüft werden.');
    const phase = schedule.phases[0]!;
    const end = item.current_period_end;
    await this.stripe.subscriptionSchedules.update(
      schedule.id,
      {
        end_behavior: 'release',
        proration_behavior: 'none',
        metadata: { tariffChangeKey: input.idempotencyKey },
        phases: [
          {
            start_date: phase.start_date,
            end_date: end,
            items: [{ price: item.price.id, quantity: 1 }],
            proration_behavior: 'none',
          },
          {
            start_date: end,
            duration: { interval: 'month', interval_count: 1 },
            items: [{ price, quantity: 1 }],
            proration_behavior: 'none',
            metadata: { ...sub.metadata, tier: input.tier },
          },
        ],
      },
      { idempotencyKey: `${input.idempotencyKey}-update` },
    );
    return { scheduleId: schedule.id, effectiveAt: new Date(end * 1000) };
  }

  async releaseTariffSchedule(id: string, idempotencyKey: string): Promise<void> {
    if (!this.testMode) throw new Error('V4 bisher nur Sandbox.');
    const schedule = await this.stripe.subscriptionSchedules.retrieve(id);
    if (schedule.status === 'released') return;
    await this.stripe.subscriptionSchedules.release(id, {}, { idempotencyKey });
  }

  async cancelAtPeriodEnd(id: string, idempotencyKey: string): Promise<void> {
    if (!this.testMode) throw new Error('V4 bisher nur Sandbox.');
    const sub = await this.stripe.subscriptions.retrieve(id);
    if (sub.status === 'canceled') return;
    if (sub.schedule) await this.releaseTariffSchedule(idOf(sub.schedule)!, `${idempotencyKey}-release`);
    await this.stripe.subscriptions.update(id, { cancel_at_period_end: true, proration_behavior: 'none' }, { idempotencyKey });
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
        customer: collectedCustomer(s),
      };
    }
    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      return {
        ...base,
        subscriptionId: sub.id,
        subscriptionStatus: sub.status,
        subscriptionPriceId: sub.items.data[0]?.price.id,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
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
        subscriptionPriceId: line?.pricing?.price_details ? idOf(line.pricing.price_details.price) : undefined,
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
