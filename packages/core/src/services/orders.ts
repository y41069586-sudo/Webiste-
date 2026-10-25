import { isV4Tier, v4Offer, v4PriceText, v4CheckoutTerms } from './offers-v4';
import { and, desc, eq, gt, inArray, isNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { appUrl, getEnv } from '../config/env';
import { getConfig } from '../config/service';
import type { AppConfig } from '../config/settings';
import { getDb, type DbOrTx } from '../db/client';
import { customers, demos, events, leads, orders, webhookEvents } from '../db/schema';
import { paymentFailedEmail } from '../emails/templates';
import { buildInvoiceData, nextInvoiceNumber, orderAmounts, planAmounts } from '../invoices/build';
import { errInfo, logger } from '../logger';
import { getProviders } from '../providers';
import { CHECKOUT_FIELDS, type CollectedCustomer, type PaymentEvent } from '../providers/types';
import { enqueue, QUEUES } from '../queue';
import { ORDER_PLANS, type Actor, type OrderPlan } from '../types';
import { randomToken } from '../util/crypto';
import { addMonths, formatEuro } from '../util/time';
import { audit } from './audit';
import { raiseAlert } from './budget';
import { checkDomain } from './domains';
import { notifyAdmin, sendTransactionalEmail } from './email';
import { transitionLead } from './lead-state';
import { rateLimit } from './rate-limit';
import { guaranteeEndFor } from './guarantee';
import { goLiveBlockers } from './readiness';
import { applyRecurringEvent } from './recurring';
import { applySubscriptionEvent } from './renewals';
import { findPublicDemo, recordEvent, type RequestMeta } from './tracking';

export type Order = typeof orders.$inferSelect;
export type Customer = typeof customers.$inferSelect;

// ---------------------------------------------------------------------------
// Checkout-Formular
// ---------------------------------------------------------------------------
const req = (msg: string) => z.string().trim().min(1, msg);

export const checkoutInputSchema = z.object({
  company: req('Bitte den Firmennamen angeben.').max(120, 'Firmenname ist zu lang.'),
  contactName: req('Bitte Ihren Namen angeben.').min(3, 'Bitte Vor- und Nachnamen angeben.').max(120),
  email: z.string().trim().toLowerCase().pipe(z.email('Bitte eine gültige E-Mail-Adresse angeben.')).pipe(z.string().max(254)),
  phone: z
    .string()
    .trim()
    .max(40, 'Telefonnummer ist zu lang.')
    .regex(/^[0-9+()/\s-]*$/, 'Telefonnummer bitte nur mit Ziffern, Leerzeichen, +, -, / angeben.')
    .optional()
    .default(''),
  street: req('Bitte Straße und Hausnummer angeben.').min(4, 'Bitte Straße und Hausnummer angeben.').max(120),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'Bitte eine fünfstellige Postleitzahl angeben.'),
  city: req('Bitte den Ort angeben.').max(80),
  domain: req('Bitte eine Wunschdomain angeben.').max(80),
  b2b: z.literal(true, 'Bitte bestätigen Sie, dass Sie als Unternehmer bestellen.'),
  terms: z.literal(true, 'Bitte stimmen Sie den AGB zu.'),
  subscription: z.boolean().optional().default(false),
  /** Option A (einmalig) oder B (monatlich); die Oberfläche verlangt eine aktive Wahl ohne Vorauswahl */
  plan: z.enum(ORDER_PLANS, 'Bitte wählen Sie eine der beiden Optionen.').optional().default('one_time'),
});

export type CheckoutInput = z.input<typeof checkoutInputSchema>;

export type CheckoutContext =
  | {
      state: 'ok';
      lead: typeof leads.$inferSelect;
      demo: typeof demos.$inferSelect;
      cfg: AppConfig;
      /** Option A (Einmalzahlung) */
      price: { grossCents: number; netCents: number; vatCents: number; label: string };
      /** Option B (Monatsrate) – null, wenn abgeschaltet */
      monthly: { grossCents: number; netCents: number; vatCents: number; label: string } | null;
      prefill: { company: string; street: string; postalCode: string; city: string; domain: string };
    }
  | { state: 'ordered' }
  | { state: 'gone' }
  | { state: 'not_found' }
  | { state: 'disabled'; reason: string };

/** Bestellen ist nur möglich, wenn ein echter Zahlungsanbieter aktiv ist (Mock nur außerhalb der Produktion). */
export function checkoutAvailability(): { ok: true; mode: 'live' | 'test' | 'mock' } | { ok: false; reason: string } {
  const env = getEnv();
  const p = getProviders().payment;
  if (p.name === 'mock') {
    if (env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_PAYMENT !== 'true') {
      return { ok: false, reason: 'Online-Bestellung ist noch nicht eingerichtet.' };
    }
    return { ok: true, mode: 'mock' };
  }
  const key = env.STRIPE_SECRET_KEY ?? '';
  return { ok: true, mode: key.startsWith('sk_live_') || key.startsWith('rk_live_') ? 'live' : 'test' };
}

export async function getCheckoutContext(slug: string): Promise<CheckoutContext> {
  const avail = checkoutAvailability();
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok') {
    // Bereits gekaufte Demos bleiben für den Käufer erreichbar
    return found.state === 'gone' ? await orderedOrGone(slug) : found;
  }
  const db = getDb();
  const paid = await db.query.orders.findFirst({
    where: and(eq(orders.leadId, found.lead.id), inArray(orders.status, ['paid', 'processing'])),
  });
  // Kein Onboarding-Link hier: der Demo-Link ist halböffentlich, der Link geht nur per E-Mail an den Käufer
  if (paid) return { state: 'ordered' };
  if (!avail.ok) return { state: 'disabled', reason: avail.reason };
  const cfg = await getConfig();
  // Echte Zahlungen erst, wenn Absenderdaten, Rechtstexte und AGB vollständig sind
  if (avail.mode === 'live' && goLiveBlockers(cfg).length)
    return { state: 'disabled', reason: 'Online-Bestellung ist noch nicht freigeschaltet.' };
  const a = planAmounts(cfg, cfg.offers.activeVersion === 'v4' ? 'basis' : 'one_time');
  const m = planAmounts(cfg, cfg.offers.activeVersion === 'v4' ? 'care_plus' : 'monthly');
  const l = found.lead;
  return {
    state: 'ok',
    lead: l,
    demo: found.demo,
    cfg,
    price: { grossCents: a.grossCents, netCents: a.netCents, vatCents: a.vatCents, label: formatEuro(a.grossCents) },
    monthly: cfg.pricing.monthlyEnabled
      ? { grossCents: m.grossCents, netCents: m.netCents, vatCents: m.vatCents, label: formatEuro(m.grossCents) }
      : null,
    prefill: {
      company: l.anonymizedAt ? '' : l.businessName,
      street: [l.street, l.houseNumber].filter(Boolean).join(' '),
      postalCode: l.postalCode ?? '',
      city: l.city,
      domain: l.domainSuggestion ?? '',
    },
  };
}

async function orderedOrGone(slug: string): Promise<CheckoutContext> {
  const db = getDb();
  const demo = await db.query.demos.findFirst({ where: eq(demos.slug, slug) });
  if (!demo) return { state: 'gone' };
  const paid = await db.query.orders.findFirst({
    where: and(eq(orders.leadId, demo.leadId), inArray(orders.status, ['paid', 'processing'])),
  });
  return paid ? { state: 'ordered' } : { state: 'gone' };
}

export type StartCheckoutResult =
  | { ok: true; url: string; orderId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; alternatives?: string[] };

/**
 * Bestellung anlegen und zum Zahlungsanbieter weiterleiten. Doppelklicks liefern dieselbe
 * Session; ältere offene Bestellungen desselben Leads werden beendet.
 */
export async function startCheckout(slug: string, raw: CheckoutInput, meta: RequestMeta): Promise<StartCheckoutResult> {
  const ctx = await getCheckoutContext(slug);
  if (ctx.state === 'ordered') return { ok: false, error: 'Für diesen Entwurf liegt bereits eine Bestellung vor.' };
  if (ctx.state === 'disabled') return { ok: false, error: ctx.reason };
  if (ctx.state !== 'ok') return { ok: false, error: 'Dieser Entwurf ist nicht mehr verfügbar.' };

  const parsed = checkoutInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? 'form');
      if (!fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { ok: false, error: 'Bitte prüfen Sie die markierten Angaben.', fieldErrors };
  }
  const input = parsed.data;
  const db = getDb();
  const { cfg, lead, demo } = ctx;

  const rl = await rateLimit(db, `checkout:${meta.ipHash}`, 10, 3600);
  const rlLead = await rateLimit(db, `checkout-lead:${lead.id}`, 20, 86400);
  if (!rl.allowed || !rlLead.allowed)
    return { ok: false, error: 'Zu viele Versuche. Bitte versuchen Sie es in einer Stunde erneut.' };

  const dom = await checkDomain(input.domain, { businessName: lead.businessName, city: lead.city, branch: lead.branch });
  if (!dom.valid || !dom.available || !dom.domain) {
    return { ok: false, error: dom.message, fieldErrors: { domain: dom.message }, alternatives: dom.alternatives };
  }
  const domain = dom.domain;
  const avail = checkoutAvailability();
  const plan: OrderPlan = input.plan;
  if (cfg.offers.activeVersion === 'v4' && !isV4Tier(plan)) return { ok: false, error: 'Bitte Basis oder Care+ wählen.' };
  if (plan === 'monthly' && !cfg.pricing.monthlyEnabled)
    return {
      ok: false,
      error: 'Die monatliche Zahlung ist derzeit nicht verfügbar.',
      fieldErrors: { plan: 'Bitte Einmalzahlung wählen.' },
    };
  if (isV4Tier(plan) && !input.subscription)
    return { ok: false, error: 'Bitte dem monatlichen Tarif ab Go-Live ausdrücklich zustimmen.' };
  const subscriptionOptIn = plan === 'one_time' && cfg.pricing.subscriptionEnabled && input.subscription;
  const amounts = planAmounts(cfg, plan);

  // Doppelklick: gleiche offene Session wiederverwenden
  const reusable = await db.query.orders.findFirst({
    where: and(
      eq(orders.leadId, lead.id),
      eq(orders.status, 'pending'),
      eq(orders.customerEmail, input.email),
      eq(orders.domainWish, domain),
      eq(orders.plan, plan),
      eq(orders.amountCents, amounts.grossCents),
      gt(orders.checkoutExpiresAt, new Date(Date.now() + 10 * 60 * 1000)),
    ),
    orderBy: desc(orders.createdAt),
  });
  if (reusable?.checkoutUrl) return { ok: true, url: reusable.checkoutUrl, orderId: reusable.id };

  await cancelOpenOrders(lead.id, 'neuer Checkout');

  const [order] = await db
    .insert(orders)
    .values({
      leadId: lead.id,
      demoId: demo.id,
      provider: getProviders().payment.name,
      plan,
      offerSnapshot: isV4Tier(plan) ? v4Offer(plan, new Date().toISOString(), cfg.offers.billingMode ?? 'saved_mandate') : null,
      amountCents: amounts.grossCents,
      netCents: amounts.netCents,
      vatCents: amounts.vatCents,
      vatRatePercent: amounts.vatRatePercent,
      currency: 'eur',
      status: 'pending',
      customerCompany: input.company,
      customerName: input.contactName,
      customerEmail: input.email,
      customerPhone: input.phone || null,
      billingAddressJson: { street: input.street, postalCode: input.postalCode, city: input.city, country: 'DE' },
      domainWish: domain,
      b2bConfirmed: true,
      termsAcceptedAt: new Date(),
      termsVersion: cfg.legal.termsVersion,
      subscriptionOptIn,
    })
    .returning();
  if (!order) throw new Error('Bestellung konnte nicht angelegt werden');

  await db.transaction(async (tx) => {
    await recordEvent(tx, {
      leadId: lead.id,
      type: 'checkout_started',
      meta: { orderId: order.id, mode: avail.ok ? avail.mode : 'n/a' },
      req: { ...meta, isBot: false },
    });
    await audit(tx, {
      entity: 'order',
      entityId: order.id,
      action: 'checkout_started',
      actor: 'public:checkout',
      context: { leadId: lead.id, amountCents: amounts.grossCents, plan },
    });
  });

  try {
    const minutes = cfg.checkout.sessionMinutes;
    const p = cfg.pricing;
    const session = await getProviders().payment.createCheckoutSession({
      orderId: order.id,
      amountCents: amounts.grossCents,
      currency: 'eur',
      productName: `${isV4Tier(plan) ? `SeitenWerk ${plan === 'basis' ? 'Basis' : 'Care+'} – Einrichtung` : plan === 'monthly' ? p.monthlyName : p.packageName} – ${domain}`,
      productDescription: isV4Tier(plan)
        ? v4PriceText()
        : plan === 'monthly'
          ? `${p.packageDescription} Mindestlaufzeit ${p.minTermMonths} Monate, ab Monat ${p.minTermMonths + 1} ${formatEuro(p.subscriptionCents)}/Monat, dann monatlich kündbar.`
          : p.packageDescription,
      customerEmail: input.email,
      successUrl: appUrl(`/checkout/${slug}/erfolg?session_id={CHECKOUT_SESSION_ID}`),
      cancelUrl: appUrl(`/checkout/${slug}?abgebrochen=1`),
      metadata: { kind: 'order', orderId: order.id, leadId: lead.id, demoId: demo.id, plan },
      idempotencyKey: `checkout-${order.id}`,
      expiresInMinutes: minutes,
      paymentMethods: cfg.checkout.paymentMethods,
      ...(plan === 'monthly' ? { recurring: { interval: 'month' as const } } : {}),
    });
    await db
      .update(orders)
      .set({
        stripeSessionId: session.sessionId,
        checkoutUrl: session.url,
        checkoutExpiresAt: new Date(Date.now() + minutes * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    return { ok: true, url: session.url, orderId: order.id };
  } catch (err) {
    logger.error({ orderId: order.id, ...errInfo(err) }, 'Checkout-Session fehlgeschlagen');
    await db.update(orders).set({ status: 'failed', updatedAt: new Date() }).where(eq(orders.id, order.id));
    await raiseAlert(db, {
      level: 'error',
      code: 'checkout_failed',
      message: 'Checkout-Session konnte nicht erstellt werden',
      context: { orderId: order.id },
    });
    return {
      ok: false,
      error: 'Die Bezahlseite ist gerade nicht erreichbar. Bitte versuchen Sie es in ein paar Minuten erneut.',
    };
  }
}

/**
 * Gehosteter Checkout (Stripe): „Seite übernehmen“ → Plan → direkt zur Bezahlseite des Anbieters.
 * Firmenname, Name, E-Mail, Rechnungsadresse, Telefon, Wunschdomain, Bestätigung „Unternehmer“ und
 * AGB-Zustimmung erfasst der Anbieter; übernommen werden sie vor der Verbuchung (applyCollectedCustomer).
 */
export async function startHostedCheckout(slug: string, planRaw: string, meta: RequestMeta): Promise<StartCheckoutResult> {
  const ctx = await getCheckoutContext(slug);
  if (ctx.state === 'ordered') return { ok: false, error: 'Für diesen Entwurf liegt bereits eine Bestellung vor.' };
  if (ctx.state === 'disabled') return { ok: false, error: ctx.reason };
  if (ctx.state !== 'ok') return { ok: false, error: 'Dieser Entwurf ist nicht mehr verfügbar.' };
  const plan = (ORDER_PLANS as readonly string[]).includes(planRaw) ? (planRaw as OrderPlan) : null;
  if (!plan) return { ok: false, error: 'Bitte wählen Sie eine der beiden Optionen.' };
  const { cfg, lead, demo } = ctx;
  if (cfg.offers.activeVersion === 'v4' && !isV4Tier(plan)) return { ok: false, error: 'Bitte Basis oder Care+ wählen.' };
  if (plan === 'monthly' && !cfg.pricing.monthlyEnabled)
    return { ok: false, error: 'Die monatliche Zahlung ist derzeit nicht verfügbar.' };
  const db = getDb();
  const rl = await rateLimit(db, `checkout:${meta.ipHash}`, 10, 3600);
  const rlLead = await rateLimit(db, `checkout-lead:${lead.id}`, 20, 86400);
  if (!rl.allowed || !rlLead.allowed)
    return { ok: false, error: 'Zu viele Versuche. Bitte versuchen Sie es in einer Stunde erneut.' };
  const amounts = planAmounts(cfg, plan);

  // Zurück-Taste / Doppelklick: offene Session desselben Plans wiederverwenden
  const reusable = await db.query.orders.findFirst({
    where: and(
      eq(orders.leadId, lead.id),
      eq(orders.status, 'pending'),
      eq(orders.plan, plan),
      eq(orders.customerEmail, ''),
      eq(orders.amountCents, amounts.grossCents),
      gt(orders.checkoutExpiresAt, new Date(Date.now() + 10 * 60 * 1000)),
    ),
    orderBy: desc(orders.createdAt),
  });
  if (reusable?.checkoutUrl) return { ok: true, url: reusable.checkoutUrl, orderId: reusable.id };
  await cancelOpenOrders(lead.id, 'neuer Checkout');

  const avail = checkoutAvailability();
  const [order] = await db
    .insert(orders)
    .values({
      leadId: lead.id,
      demoId: demo.id,
      provider: getProviders().payment.name,
      plan,
      offerSnapshot: isV4Tier(plan) ? v4Offer(plan, null, cfg.offers.billingMode ?? 'saved_mandate') : null,
      amountCents: amounts.grossCents,
      netCents: amounts.netCents,
      vatCents: amounts.vatCents,
      vatRatePercent: amounts.vatRatePercent,
      currency: 'eur',
      status: 'pending',
      // Vorbelegung aus dem Lead; die verbindlichen Angaben kommen aus dem Checkout des Anbieters
      customerCompany: lead.anonymizedAt ? '' : lead.businessName,
      customerName: '',
      customerEmail: '',
      billingAddressJson: {
        street: ctx.prefill.street,
        postalCode: ctx.prefill.postalCode,
        city: ctx.prefill.city,
        country: 'DE',
      },
      domainWish: null,
      b2bConfirmed: false,
      termsVersion: cfg.legal.termsVersion,
    })
    .returning();
  if (!order) throw new Error('Bestellung konnte nicht angelegt werden');
  await db.transaction(async (tx) => {
    await recordEvent(tx, {
      leadId: lead.id,
      type: 'checkout_started',
      meta: { orderId: order.id, mode: avail.ok ? avail.mode : 'n/a', plan, hosted: true },
      req: { ...meta, isBot: false },
    });
    await audit(tx, {
      entity: 'order',
      entityId: order.id,
      action: 'checkout_started',
      actor: 'public:checkout',
      context: { leadId: lead.id, amountCents: amounts.grossCents, plan, hosted: true },
    });
  });

  try {
    const minutes = cfg.checkout.sessionMinutes;
    const p = cfg.pricing;
    const g = cfg.guarantee;
    const note = [
      isV4Tier(plan)
        ? v4CheckoutTerms(plan)
        : plan === 'monthly'
          ? `${formatEuro(p.monthlyCents)} pro Monat, erste Rate sofort. Mindestlaufzeit ${p.minTermMonths} Monate, ab Monat ${p.minTermMonths + 1} ${formatEuro(p.subscriptionCents)}/Monat, dann monatlich kündbar.`
          : `Einmalig ${formatEuro(p.packageCents)} inklusive Domain und ${p.hostingMonthsIncluded} Monaten Hosting.`,
      g.enabled ? `${g.days} Tage Zufriedenheitsgarantie.` : '',
      'Rechnung per E-Mail, danach tragen Sie Ihre Angaben für die Website ein.',
    ]
      .filter(Boolean)
      .join(' ');
    const session = await getProviders().payment.createCheckoutSession({
      orderId: order.id,
      amountCents: amounts.grossCents,
      currency: 'eur',
      productName:
        `${isV4Tier(plan) ? `SeitenWerk ${plan === 'basis' ? 'Basis' : 'Care+'} – Einrichtung` : plan === 'monthly' ? p.monthlyName : p.packageName} – ${lead.anonymizedAt ? 'Website' : lead.businessName}`.slice(
          0,
          250,
        ),
      productDescription: isV4Tier(plan)
        ? v4PriceText()
        : plan === 'monthly'
          ? `${p.packageDescription} Mindestlaufzeit ${p.minTermMonths} Monate, ab Monat ${p.minTermMonths + 1} ${formatEuro(p.subscriptionCents)}/Monat, dann monatlich kündbar.`
          : p.packageDescription,
      collect: {
        domainDefault: lead.domainSuggestion ?? undefined,
        termsUrl: appUrl('/agb'),
        termsVersion: cfg.legal.termsVersion,
        recurringTerms: isV4Tier(plan),
        submitNote: note,
      },
      successUrl: appUrl(`/checkout/${slug}/erfolg?session_id={CHECKOUT_SESSION_ID}`),
      cancelUrl: appUrl(`/d/${slug}#uebernehmen`),
      metadata: { kind: 'order', orderId: order.id, leadId: lead.id, demoId: demo.id, plan, hosted: '1' },
      idempotencyKey: `checkout-${order.id}`,
      expiresInMinutes: minutes,
      paymentMethods: cfg.checkout.paymentMethods,
      ...(plan === 'monthly' ? { recurring: { interval: 'month' as const } } : {}),
    });
    await db
      .update(orders)
      .set({
        stripeSessionId: session.sessionId,
        checkoutUrl: session.url,
        checkoutExpiresAt: new Date(Date.now() + minutes * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    return { ok: true, url: session.url, orderId: order.id };
  } catch (err) {
    logger.error({ orderId: order.id, ...errInfo(err) }, 'Checkout-Session fehlgeschlagen');
    await db.update(orders).set({ status: 'failed', updatedAt: new Date() }).where(eq(orders.id, order.id));
    await raiseAlert(db, {
      level: 'error',
      code: 'checkout_failed',
      message: 'Checkout-Session konnte nicht erstellt werden',
      context: { orderId: order.id },
    });
    return {
      ok: false,
      error: 'Die Bezahlseite ist gerade nicht erreichbar. Bitte versuchen Sie es in ein paar Minuten erneut.',
    };
  }
}

/**
 * Im gehosteten Checkout erfasste Angaben in die Bestellung übernehmen (vor der Verbuchung, idempotent).
 * Die Wunschdomain wird erneut geprüft; ist sie vergeben, bleibt sie leer und wird im Onboarding gewählt.
 */
export async function applyCollectedCustomer(orderId: string, c: CollectedCustomer | undefined, actor: string): Promise<void> {
  if (!c) return;
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || order.status === 'paid' || order.status === 'refunded') return;
  const cfg = await getConfig();
  const f = c.customFields;
  const b2b = f[CHECKOUT_FIELDS.b2b] === 'ja';
  const terms = f[CHECKOUT_FIELDS.terms] === 'ja';
  let domainWish: string | null = order.domainWish;
  let domainNote: string | null = null;
  const wish = f[CHECKOUT_FIELDS.domain]?.trim();
  if (wish) {
    const lead = order.leadId ? await db.query.leads.findFirst({ where: eq(leads.id, order.leadId) }) : undefined;
    const dom = await checkDomain(wish, {
      businessName: lead?.businessName ?? '',
      city: lead?.city ?? '',
      branch: lead?.branch ?? '',
    });
    if (dom.valid && dom.available && dom.domain) domainWish = dom.domain;
    else {
      domainWish = null;
      domainNote = dom.message;
    }
  }
  const a = c.address;
  const street = [a?.line1, a?.line2].filter(Boolean).join(', ');
  await db
    .update(orders)
    .set({
      customerCompany: (c.businessName ?? order.customerCompany).slice(0, 120),
      customerName: (c.name ?? order.customerName).slice(0, 120),
      customerEmail: (c.email ?? order.customerEmail).trim().toLowerCase().slice(0, 254),
      customerPhone: c.phone ? c.phone.slice(0, 40) : order.customerPhone,
      billingAddressJson: a
        ? { street, postalCode: a.postalCode ?? '', city: a.city ?? '', country: a.country ?? 'DE' }
        : order.billingAddressJson,
      domainWish,
      b2bConfirmed: b2b,
      termsAcceptedAt: terms ? (order.termsAcceptedAt ?? new Date()) : order.termsAcceptedAt,
      termsVersion: cfg.legal.termsVersion,
      ...(order.offerSnapshot && terms
        ? { offerSnapshot: { ...order.offerSnapshot, consentAt: (order.termsAcceptedAt ?? new Date()).toISOString() } }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
  await audit(db, {
    entity: 'order',
    entityId: orderId,
    action: 'customer_collected',
    actor,
    context: { b2b, terms, domain: domainWish, domainNote },
  });
  if (!b2b || !terms)
    await raiseAlert(db, {
      level: 'warn',
      code: `checkout_consent_${orderId}`,
      message: 'Bestellung ohne Bestätigung „Unternehmer“ oder AGB-Zustimmung – bitte prüfen.',
      context: { orderId, b2b, terms },
    });
}

/** Offene Bestellungen eines Leads beenden (Session beim Anbieter ablaufen lassen). */
export async function cancelOpenOrders(leadId: string, reason: string): Promise<number> {
  const db = getDb();
  const open = await db
    .select()
    .from(orders)
    .where(and(eq(orders.leadId, leadId), eq(orders.status, 'pending')));
  const p = getProviders().payment;
  for (const o of open) {
    if (o.stripeSessionId && p.expireSession && o.provider === p.name) {
      try {
        await p.expireSession(o.stripeSessionId);
      } catch (err) {
        logger.warn({ orderId: o.id, ...errInfo(err) }, 'Session konnte nicht beendet werden');
      }
    }
    await db
      .update(orders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(orders.id, o.id), eq(orders.status, 'pending')));
    await audit(db, { entity: 'order', entityId: o.id, action: 'cancelled', actor: 'system', context: { reason } });
  }
  return open.length;
}

// ---------------------------------------------------------------------------
// Zahlungseingang
// ---------------------------------------------------------------------------
export type FulfillResult =
  | { state: 'paid'; orderId: string; customerId: string; invoiceNumber: string; alreadyPaid: boolean }
  | { state: 'mismatch' | 'not_payable'; orderId: string };

/**
 * Zahlung verbuchen – idempotent und nebenläufig sicher (Zeilensperre). Vergibt die
 * fortlaufende Rechnungsnummer, legt den Kunden an, setzt den Lead auf „paid“ und
 * stößt Rechnung und Onboarding an.
 */
export async function fulfillOrder(
  orderId: string,
  info: { paymentIntentId?: string; amountTotal?: number; currency?: string; subscriptionId?: string; invoiceId?: string },
  actor: Actor | string,
): Promise<FulfillResult> {
  const db = getDb();
  const cfg = await getConfig();
  const result = await db.transaction(async (tx): Promise<FulfillResult> => {
    const locked = await tx.execute<{ id: string }>(sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
    if (!locked.rows[0]) throw new Error(`Bestellung ${orderId} nicht gefunden`);
    const order = (await tx.query.orders.findFirst({ where: eq(orders.id, orderId) }))!;
    if (order.status === 'paid' || order.status === 'refunded') {
      const c = await tx.query.customers.findFirst({ where: eq(customers.orderId, order.id) });
      return { state: 'paid', orderId, customerId: c!.id, invoiceNumber: order.invoiceNumber!, alreadyPaid: true };
    }
    if (order.status === 'failed' && !info.paymentIntentId) return { state: 'not_payable', orderId };
    const amountOk = info.amountTotal === undefined || info.amountTotal === order.amountCents;
    const currencyOk = !info.currency || info.currency.toLowerCase() === order.currency;
    if (!amountOk || !currencyOk) {
      await tx
        .update(orders)
        .set({
          status: 'processing',
          stripePaymentIntent: info.paymentIntentId ?? order.stripePaymentIntent,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
      await raiseAlert(tx, {
        level: 'error',
        code: `payment_mismatch_${orderId}`,
        message: `Zahlbetrag weicht ab (erwartet ${order.amountCents}, erhalten ${info.amountTotal} ${info.currency ?? ''}) – bitte manuell prüfen.`,
        context: { orderId },
      });
      return { state: 'mismatch', orderId };
    }

    const paidAt = new Date();
    const number = await nextInvoiceNumber(tx, cfg, paidAt);
    const invoice = buildInvoiceData(cfg, order, { number, paidAt, issuedAt: paidAt, amounts: orderAmounts(order) });
    const monthly = order.plan === 'monthly';
    await tx
      .update(orders)
      .set({
        status: 'paid',
        paidAt,
        stripePaymentIntent: info.paymentIntentId ?? order.stripePaymentIntent,
        invoiceNumber: number,
        invoiceJson: invoice as unknown as Record<string, unknown>,
        // Garantie gilt für beide Optionen ab Zahlung; Mindestlaufzeit nur für Option B
        // Vorläufig: spätester Beginn (Zahlung + 14 Tage); beim Go-Live wird auf Go-Live + 14 Tage verkürzt
        guaranteeEndsAt: cfg.guarantee.enabled && !order.offerSnapshot ? guaranteeEndFor(cfg, paidAt, null) : null,
        ...(monthly
          ? {
              stripeSubscriptionId: info.subscriptionId ?? order.stripeSubscriptionId,
              stripeInvoiceId: info.invoiceId ?? order.stripeInvoiceId,
              subscriptionStatus: 'active',
              minTermEndsAt: addMonths(paidAt, cfg.pricing.minTermMonths),
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    const [customer] = await tx
      .insert(customers)
      .values({
        orderId: order.id,
        leadId: order.leadId,
        company: order.customerCompany,
        contactName: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        domain: order.domainWish,
        domainStatus: order.domainWish ? 'available' : 'none',
        accessToken: randomToken(32),
        // Option B: Hosting läuft mit dem Abo (keine Verlängerungs-Erinnerung)
        subscriptionId: monthly ? (info.subscriptionId ?? order.stripeSubscriptionId) : null,
      })
      .onConflictDoNothing({ target: customers.orderId })
      .returning();
    const cust = customer ?? (await tx.query.customers.findFirst({ where: eq(customers.orderId, order.id) }))!;

    if (order.leadId) {
      await tx.insert(events).values({
        leadId: order.leadId,
        type: 'paid',
        metaJson: { orderId: order.id, amountCents: order.amountCents, plan: order.plan },
      });
      await transitionLead(tx, order.leadId, 'paid', { actor, soft: true, context: { orderId: order.id } });
    }
    // Gekaufte Demo läuft nicht mehr ab (dient als Grundlage der Kundenseite)
    if (order.demoId) await tx.update(demos).set({ expiresAt: null, updatedAt: new Date() }).where(eq(demos.id, order.demoId));
    await audit(tx, {
      entity: 'order',
      entityId: order.id,
      action: 'paid',
      actor,
      context: { invoiceNumber: number, amountCents: order.amountCents, plan: order.plan },
    });
    return { state: 'paid', orderId, customerId: cust.id, invoiceNumber: number, alreadyPaid: false };
  });

  if (result.state === 'paid' && !result.alreadyPaid) {
    await afterPaid(result.orderId, result.customerId);
  }
  return result;
}

async function afterPaid(orderId: string, customerId: string): Promise<void> {
  try {
    await enqueue(QUEUES.sendInvoice, { orderId }, { singletonKey: `invoice-${orderId}` });
    await enqueue(QUEUES.onboarding, { customerId }, { singletonKey: `onboarding-${customerId}` });
  } catch (err) {
    // Der Sweeper im pipeline-tick holt das nach
    logger.error({ orderId, ...errInfo(err) }, 'Folgejobs nach Zahlung nicht eingereiht');
  }
  const order = await getDb().query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (order?.plan === 'monthly') await ensureSubscriptionSchedule(orderId);
  await notifyAdmin({
    key: `order-paid:${orderId}`,
    title: `Neue Bestellung ${order?.invoiceNumber ?? ''}`,
    lines: [
      order?.plan === 'monthly'
        ? `Plan: monatlich ${formatEuro(order.amountCents)} (Mindestlaufzeit bis ${order.minTermEndsAt?.toISOString().slice(0, 10) ?? '–'})`
        : `Plan: einmalig ${formatEuro(order?.amountCents ?? 0)}`,
      `Domain-Wunsch: ${order?.domainWish ?? '–'}`,
    ],
    link: appUrl(`/admin/orders/${orderId}`),
  });
}

/**
 * Plan „monthly“: Zeitplan beim Zahlungsanbieter anlegen (12 Monate Monatsrate, danach „Hosting & Pflege“).
 * Idempotent; bei Fehler Warnung – der Sweeper im pipeline-tick versucht es erneut.
 */
export async function ensureSubscriptionSchedule(orderId: string): Promise<'created' | 'exists' | 'skipped' | 'failed'> {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || order.plan !== 'monthly' || !order.stripeSubscriptionId || order.endedAt) return 'skipped';
  if (order.stripeScheduleId) return 'exists';
  const p = getProviders().payment;
  if (!p.scheduleStepDown || p.name !== order.provider) return 'skipped';
  const cfg = await getConfig();
  try {
    const r = await p.scheduleStepDown(order.stripeSubscriptionId, {
      minTermMonths: cfg.pricing.minTermMonths,
      afterTermCents: cfg.pricing.subscriptionCents,
      idempotencyKey: `schedule-${order.id}`,
    });
    await db
      .update(orders)
      .set({ stripeScheduleId: r.scheduleId, minTermEndsAt: r.minTermEndsAt, updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    await audit(db, {
      entity: 'order',
      entityId: order.id,
      action: 'subscription_scheduled',
      actor: 'system',
      context: {
        scheduleId: r.scheduleId,
        minTermEndsAt: r.minTermEndsAt.toISOString(),
        afterTermCents: cfg.pricing.subscriptionCents,
      },
    });
    return 'created';
  } catch (err) {
    logger.error({ orderId, ...errInfo(err) }, 'Abo-Zeitplan konnte nicht angelegt werden');
    await raiseAlert(db, {
      level: 'error',
      code: `subscription_schedule_${orderId}`,
      message: 'Abo-Zeitplan (Preissenkung ab Monat 13) konnte nicht angelegt werden – wird automatisch wiederholt.',
      context: { orderId },
    });
    return 'failed';
  }
}

async function findOrderForEvent(ev: PaymentEvent): Promise<Order | undefined> {
  const db = getDb();
  if (ev.sessionId) {
    const o = await db.query.orders.findFirst({ where: eq(orders.stripeSessionId, ev.sessionId) });
    if (o) return o;
  }
  const ref = ev.clientReferenceId ?? ev.metadata?.orderId;
  if (ref && /^[0-9a-f-]{36}$/.test(ref)) {
    const o = await db.query.orders.findFirst({ where: eq(orders.id, ref) });
    if (o) return o;
  }
  if (ev.paymentIntentId) return db.query.orders.findFirst({ where: eq(orders.stripePaymentIntent, ev.paymentIntentId) });
  return undefined;
}

/** Normalisiertes Zahlungs-Event anwenden (ohne Replay-Schutz – siehe processPaymentWebhook). */
export async function applyPaymentEvent(ev: PaymentEvent, actor: string): Promise<string> {
  if (ev.type === 'other') return 'ignored';
  // Laufende Abos: Rechnungen und Statuswechsel – Plan „monthly“ oder „Hosting & Pflege“ (Option A)
  if (
    ev.type === 'invoice.paid' ||
    ev.type === 'invoice.payment_failed' ||
    ev.type === 'subscription.updated' ||
    ev.type === 'subscription.deleted'
  ) {
    return applyRecurringEvent(ev, actor);
  }
  // Abo-Abschluss „Hosting & Pflege“ über die Verlängerungsseite
  if (ev.metadata?.kind === 'subscription') return applySubscriptionEvent(ev, actor);
  const order = await findOrderForEvent(ev);
  if (!order) {
    logger.warn({ eventId: ev.eventId, type: ev.rawType }, 'Zahlungs-Event ohne passende Bestellung');
    return 'no_order';
  }
  const db = getDb();
  switch (ev.type) {
    case 'checkout.completed':
    case 'checkout.async_succeeded': {
      await applyCollectedCustomer(order.id, ev.customer, actor);
      if (ev.paymentStatus === 'paid' || ev.paymentStatus === 'no_payment_required') {
        const r = await fulfillOrder(
          order.id,
          {
            paymentIntentId: ev.paymentIntentId,
            amountTotal: ev.amountTotal,
            currency: ev.currency,
            subscriptionId: ev.subscriptionId,
            invoiceId: ev.invoiceId,
          },
          actor,
        );
        return r.state;
      }
      // z. B. SEPA-Lastschrift: Zahlung läuft noch
      await db
        .update(orders)
        .set({
          status: 'processing',
          stripePaymentIntent: ev.paymentIntentId ?? order.stripePaymentIntent,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, order.id), inArray(orders.status, ['pending', 'cancelled', 'expired'])));
      await audit(db, { entity: 'order', entityId: order.id, action: 'processing', actor });
      return 'processing';
    }
    case 'checkout.async_failed':
      await markPaymentFailed(order, actor);
      return 'failed';
    case 'checkout.expired': {
      const res = await db
        .update(orders)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(and(eq(orders.id, order.id), eq(orders.status, 'pending')))
        .returning({ id: orders.id });
      // Checkout abgebrochen (B6.1) – zählt im Funnel
      if (res.length && order.leadId) {
        await db
          .insert(events)
          .values({ leadId: order.leadId, type: 'checkout_abandoned', metaJson: { orderId: order.id, plan: order.plan } });
      }
      return res.length ? 'expired' : 'unchanged';
    }
    case 'charge.refunded':
      await applyRefund(order.id, ev.amountRefunded ?? ev.amountTotal ?? order.amountCents, actor);
      return 'refunded';
    default:
      return 'ignored';
  }
}

async function markPaymentFailed(order: Order, actor: string): Promise<void> {
  const db = getDb();
  const res = await db
    .update(orders)
    .set({ status: 'failed', updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), inArray(orders.status, ['pending', 'processing'])))
    .returning({ id: orders.id });
  if (!res.length) return;
  await audit(db, { entity: 'order', entityId: order.id, action: 'payment_failed', actor });
  if (order.leadId)
    await transitionLead(db, order.leadId, 'cta_clicked', { actor, soft: true, reason: 'Zahlung fehlgeschlagen' });
  const demo = order.demoId ? await db.query.demos.findFirst({ where: eq(demos.id, order.demoId) }) : undefined;
  const cfg = await getConfig();
  try {
    const mail = paymentFailedEmail(cfg, {
      name: order.customerName,
      retryUrl: demo ? appUrl(`/checkout/${demo.slug}`) : appUrl('/'),
    });
    await sendTransactionalEmail({
      ...mail,
      kind: 'payment_failed',
      idempotencyKey: `payment-failed:${order.id}`,
      to: order.customerEmail,
      orderId: order.id,
      leadId: order.leadId,
    });
  } catch (err) {
    logger.warn({ orderId: order.id, ...errInfo(err) }, 'Mail „Zahlung fehlgeschlagen“ nicht versendet');
  }
}

/**
 * Erstattung verbuchen (aus Webhook oder Admin-Aktion, idempotent über den Betrag).
 * Bei vollständiger Erstattung: Status „refunded“ und Stornorechnung.
 */
export async function applyRefund(orderId: string, refundedCents: number, actor: string): Promise<boolean> {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || refundedCents <= order.refundedCents) return false;
  const full = refundedCents >= order.amountCents;
  await db
    .update(orders)
    .set({ refundedCents, refundedAt: new Date(), ...(full ? { status: 'refunded' as const } : {}), updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  await audit(db, {
    entity: 'order',
    entityId: orderId,
    action: full ? 'refunded' : 'partially_refunded',
    actor,
    context: { refundedCents },
  });
  await raiseAlert(db, {
    level: 'warn',
    code: `refund_${orderId}`,
    message: `Erstattung ${formatEuro(refundedCents)} zu ${order.invoiceNumber ?? orderId}`,
    context: { orderId },
  });
  if (order.invoiceNumber) {
    try {
      await enqueue(
        QUEUES.sendInvoice,
        { orderId, kind: 'cancellation' },
        { singletonKey: `cancellation-${orderId}-${refundedCents}` },
      );
    } catch (err) {
      logger.error({ orderId, ...errInfo(err) }, 'Stornorechnung nicht eingereiht');
    }
  }
  return true;
}

/** Admin: Zahlung erstatten (Betrag in Cent, Standard: voll). Löst eine echte Erstattung aus. */
export async function refundOrder(orderId: string, actor: string, amountCents?: number): Promise<void> {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || order.status !== 'paid') throw new Error('Nur bezahlte Bestellungen können erstattet werden.');
  const amount = Math.min(order.amountCents, amountCents ?? order.amountCents);
  if (amount <= 0) throw new Error('Ungültiger Betrag');
  const p = getProviders().payment;
  if (p.name !== order.provider) throw new Error(`Bestellung wurde über ${order.provider} bezahlt, aktiv ist ${p.name}.`);
  if (order.plan === 'monthly' && !order.stripePaymentIntent) {
    // Erste Monatsrate: Erstattung über die Abo-Rechnung
    if (!p.refundInvoice) throw new Error('Der Zahlungsanbieter unterstützt keine Erstattung von Abo-Rechnungen.');
    if (!order.stripeInvoiceId) throw new Error('Keine Rechnungs-ID gespeichert – Erstattung bitte im Stripe-Dashboard.');
    await p.refundInvoice(order.stripeInvoiceId, { idempotencyKey: `refund-${order.id}-${amount}`, amountCents: amount });
  } else {
    if (!p.refund) throw new Error('Der Zahlungsanbieter unterstützt keine Erstattung über die API.');
    if (!order.stripePaymentIntent && p.name !== 'mock')
      throw new Error('Keine Zahlungs-ID gespeichert – Erstattung bitte im Stripe-Dashboard.');
    await p.refund(order.stripePaymentIntent ?? `pi_mock_${order.id}`, {
      idempotencyKey: `refund-${order.id}-${amount}`,
      amountCents: amount,
    });
  }
  await applyRefund(order.id, order.refundedCents + amount, actor);
}

export class InvalidWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWebhookError';
  }
}

/** Webhook verifizieren, Replay-Schutz (webhook_events), anwenden. Fehler ⇒ Anbieter wiederholt. */
export async function processPaymentWebhook(
  rawBody: string,
  signature: string | null,
): Promise<{ result: string; duplicate: boolean }> {
  const p = getProviders().payment;
  let ev: PaymentEvent;
  try {
    ev = await p.parseWebhook(rawBody, signature);
  } catch (err) {
    throw new InvalidWebhookError(err instanceof Error ? err.message : 'ungültig');
  }
  const db = getDb();
  const inserted = await db
    .insert(webhookEvents)
    .values({ provider: p.name, eventId: ev.eventId, type: ev.rawType })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.eventId });
  if (!inserted.length) {
    const prev = await db.query.webhookEvents.findFirst({
      where: and(eq(webhookEvents.provider, p.name), eq(webhookEvents.eventId, ev.eventId)),
    });
    if (prev?.processedAt) return { result: 'duplicate', duplicate: true };
  }
  try {
    const result = await applyPaymentEvent(ev, `webhook:${p.name}`);
    await db
      .update(webhookEvents)
      .set({ processedAt: new Date(), error: null })
      .where(and(eq(webhookEvents.provider, p.name), eq(webhookEvents.eventId, ev.eventId)));
    return { result, duplicate: false };
  } catch (err) {
    await db
      .update(webhookEvents)
      .set({ error: err instanceof Error ? err.message.slice(0, 500) : String(err) })
      .where(and(eq(webhookEvents.provider, p.name), eq(webhookEvents.eventId, ev.eventId)));
    throw err;
  }
}

export type ReturnState =
  | { state: 'paid'; customerToken: string | null; invoiceNumber: string | null }
  | { state: 'processing' }
  | { state: 'open' }
  | { state: 'unknown' };

/** Erfolgsseite: Zahlung direkt beim Anbieter prüfen, falls der Webhook noch nicht da war. */
export async function confirmCheckoutReturn(slug: string, sessionId: string): Promise<ReturnState> {
  const db = getDb();
  if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) return { state: 'unknown' };
  const order = await db.query.orders.findFirst({ where: eq(orders.stripeSessionId, sessionId) });
  if (!order || !order.demoId) return { state: 'unknown' };
  const demo = await db.query.demos.findFirst({ where: eq(demos.id, order.demoId) });
  if (!demo || demo.slug !== slug) return { state: 'unknown' };
  const done = async (): Promise<ReturnState> => {
    const o = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
    const c = await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) });
    return { state: 'paid', customerToken: c?.accessToken ?? null, invoiceNumber: o?.invoiceNumber ?? null };
  };
  if (order.status === 'paid') return done();
  if (order.status === 'processing') return { state: 'processing' };
  const p = getProviders().payment;
  if (!p.retrieveSession || p.name !== order.provider) return { state: 'open' };
  const info = await p.retrieveSession(sessionId);
  if (!info) return { state: 'unknown' };
  await applyCollectedCustomer(order.id, info.customer, 'public:checkout-return');
  if (info.paymentStatus === 'paid' || info.paymentStatus === 'no_payment_required') {
    const r = await fulfillOrder(
      order.id,
      {
        paymentIntentId: info.paymentIntentId,
        amountTotal: info.amountTotal,
        currency: info.currency,
        subscriptionId: info.subscriptionId,
        invoiceId: info.invoiceId,
      },
      'public:checkout-return',
    );
    return r.state === 'paid' ? done() : { state: 'processing' };
  }
  if (info.status === 'complete') {
    await applyPaymentEvent(
      {
        eventId: `return-${sessionId}`,
        type: 'checkout.completed',
        rawType: 'return',
        sessionId,
        paymentStatus: 'unpaid',
        paymentIntentId: info.paymentIntentId,
      },
      'public:checkout-return',
    );
    return { state: 'processing' };
  }
  return { state: 'open' };
}

/**
 * Sicherheitsnetz (pipeline-tick): bezahlte Bestellungen ohne versendete Rechnung bzw. Kunden ohne
 * Onboarding-Mail erneut einreihen (falls das Einreihen direkt nach der Zahlung fehlschlug).
 */
export async function sweepPaidOrders(): Promise<number> {
  const db = getDb();
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, 'paid'), isNull(orders.invoiceSentAt), lt(orders.paidAt, sql`now() - interval '10 minutes'`)))
    .limit(20);
  for (const o of stale) await enqueue(QUEUES.sendInvoice, { orderId: o.id }, { singletonKey: `invoice-${o.id}` });
  const noOnboarding = await db
    .select({ id: customers.id })
    .from(customers)
    .innerJoin(orders, eq(orders.id, customers.orderId))
    .where(
      and(
        eq(orders.status, 'paid'),
        isNull(customers.onboardingMailSentAt),
        isNull(customers.siteId),
        lt(customers.createdAt, sql`now() - interval '10 minutes'`),
      ),
    )
    .limit(20);
  for (const c of noOnboarding) await enqueue(QUEUES.onboarding, { customerId: c.id }, { singletonKey: `onboarding-${c.id}` });
  // Plan „monthly“: fehlender Abo-Zeitplan (Preissenkung ab Monat 13)
  const noSchedule = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'paid'),
        eq(orders.plan, 'monthly'),
        isNull(orders.stripeScheduleId),
        isNull(orders.endedAt),
        lt(orders.paidAt, sql`now() - interval '10 minutes'`),
      ),
    )
    .limit(20);
  for (const o of noSchedule) await ensureSubscriptionSchedule(o.id);
  // Offene Bestellungen nach Ablauf der Session schließen (falls das Expired-Event fehlte)
  await db
    .update(orders)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(and(eq(orders.status, 'pending'), lt(orders.checkoutExpiresAt, sql`now() - interval '1 hour'`)));
  return stale.length + noOnboarding.length;
}

export async function orderWithCustomer(
  db: DbOrTx,
  orderId: string,
): Promise<{ order: Order; customer: Customer | undefined } | null> {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return null;
  const customer = await db.query.customers.findFirst({ where: eq(customers.orderId, orderId) });
  return { order, customer };
}

// ---------------------------------------------------------------------------
// Simulierte Zahlung (nur PAYMENT_PROVIDER=mock, nie in Produktion ohne ALLOW_MOCK_PAYMENT)
// ---------------------------------------------------------------------------
export type MockOutcome = 'paid' | 'sepa_processing' | 'sepa_failed' | 'cancel';

export async function mockCheckoutInfo(
  sessionId: string,
): Promise<{ order: Order; slug: string; hosted: boolean; domainDefault: string } | null> {
  const avail = checkoutAvailability();
  if (!avail.ok || avail.mode !== 'mock') return null;
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.stripeSessionId, sessionId) });
  if (!order?.demoId) return null;
  const demo = await db.query.demos.findFirst({ where: eq(demos.id, order.demoId) });
  if (!demo) return null;
  const lead = order.leadId ? await db.query.leads.findFirst({ where: eq(leads.id, order.leadId) }) : undefined;
  // Gehosteter Checkout: Kundendaten werden erst auf der Bezahlseite erfasst
  return { order, slug: demo.slug, hosted: order.customerEmail === '', domainDefault: lead?.domainSuggestion ?? '' };
}

/** Löst die gleichen (signierten) Webhook-Events aus wie Stripe – für Entwicklung und E2E-Tests. */
export async function simulateMockPayment(
  sessionId: string,
  outcome: MockOutcome,
  customer?: CollectedCustomer,
): Promise<string> {
  const info = await mockCheckoutInfo(sessionId);
  if (!info) throw new Error('Simulierte Zahlung nicht verfügbar');
  const { order, slug } = info;
  if (outcome === 'cancel') return appUrl(info.hosted ? `/d/${slug}#uebernehmen` : `/checkout/${slug}?abgebrochen=1`);
  const p = getProviders().payment as unknown as PaymentProviderWithSign;
  const fire = async (ev: Omit<PaymentEvent, 'eventId' | 'rawType'> & { rawType: string }) => {
    const raw = JSON.stringify({
      eventId: `evt_mock_${randomToken(16)}`,
      sessionId,
      clientReferenceId: order.id,
      amountTotal: order.amountCents,
      currency: 'eur',
      ...(customer && ev.type === 'checkout.completed' ? { customer } : {}),
      ...ev,
    });
    await processPaymentWebhook(raw, p.sign(raw));
  };
  const compact = order.id.replace(/-/g, '');
  if (order.plan === 'monthly') {
    // Abo: Karte bzw. SEPA – erste Rate über die Abo-Rechnung
    const sub = {
      mode: 'subscription' as const,
      subscriptionId: `sub_mock_${compact}`,
      invoiceId: `in_mock_${compact}`,
      metadata: { kind: 'order', orderId: order.id, plan: 'monthly' },
    };
    if (outcome === 'paid') {
      await fire({ type: 'checkout.completed', rawType: 'checkout.session.completed', paymentStatus: 'paid', ...sub });
    } else {
      await fire({ type: 'checkout.completed', rawType: 'checkout.session.completed', paymentStatus: 'unpaid', ...sub });
      if (outcome === 'sepa_failed')
        await fire({
          type: 'checkout.async_failed',
          rawType: 'checkout.session.async_payment_failed',
          paymentStatus: 'unpaid',
          ...sub,
        });
    }
    return appUrl(`/checkout/${slug}/erfolg?session_id=${encodeURIComponent(sessionId)}`);
  }
  const pi = `pi_mock_${compact}`;
  if (outcome === 'paid') {
    await fire({ type: 'checkout.completed', rawType: 'checkout.session.completed', paymentStatus: 'paid', paymentIntentId: pi });
  } else {
    await fire({
      type: 'checkout.completed',
      rawType: 'checkout.session.completed',
      paymentStatus: 'unpaid',
      paymentIntentId: pi,
    });
    if (outcome === 'sepa_failed')
      await fire({
        type: 'checkout.async_failed',
        rawType: 'checkout.session.async_payment_failed',
        paymentStatus: 'unpaid',
        paymentIntentId: pi,
      });
  }
  return appUrl(`/checkout/${slug}/erfolg?session_id=${encodeURIComponent(sessionId)}`);
}

interface PaymentProviderWithSign {
  sign(raw: string): string;
}
