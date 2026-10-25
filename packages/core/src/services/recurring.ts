import { and, count, eq, sql } from 'drizzle-orm';
import { appUrl } from '../config/env';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { customers, orderPayments, orders, sites } from '../db/schema';
import { subscriptionPaymentFailedEmail } from '../emails/templates';
import { amountsFor, buildInvoiceData, nextInvoiceNumber } from '../invoices/build';
import { errInfo, logger } from '../logger';
import type { PaymentEvent } from '../providers/types';
import { enqueue, QUEUES } from '../queue';
import { formatDateLongDe, formatEuro } from '../util/time';
import { audit } from './audit';
import { raiseAlert } from './budget';
import { notifyAdmin, sendTransactionalEmail } from './email';
import { resetDunning, startDunning } from './dunning';
import { maintenanceReasonOf, setSiteMaintenance } from './maintenance';
import { fulfillOrder, type Order } from './orders';
import { applySubscriptionEvent } from './renewals';
import { assertV4BillingReady } from './offers-v4';
import { reconcileTariffV4 } from './tariffs-v4';

/** monthly = Option B (49 €/Monat, Mindestlaufzeit), care = „Hosting & Pflege“ nach Option A */
type RecurringKind = 'monthly' | 'care' | 'v4';

interface Target {
  kind: RecurringKind;
  order: Order;
  customer: typeof customers.$inferSelect | undefined;
}

async function findTarget(ev: PaymentEvent): Promise<Target | null> {
  const db = getDb();
  if (ev.subscriptionId) {
    const order = await db.query.orders.findFirst({ where: eq(orders.stripeSubscriptionId, ev.subscriptionId) });
    if (order) {
      const customer = await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) });
      return { kind: order.offerSnapshot ? 'v4' : 'monthly', order, customer };
    }
    const customer = await db.query.customers.findFirst({ where: eq(customers.subscriptionId, ev.subscriptionId) });
    if (customer) {
      const o = await db.query.orders.findFirst({ where: eq(orders.id, customer.orderId) });
      if (o) return { kind: o.offerSnapshot ? 'v4' : 'care', order: o, customer };
    }
  }
  // Erste Rechnung kann vor dem Checkout-Event eintreffen: Zuordnung über die Abo-Metadaten
  const ref = ev.metadata?.orderId;
  if (ev.metadata?.kind === 'subscription' && ev.metadata?.offerVersion === 'v4' && ref && /^[0-9a-f-]{36}$/.test(ref)) {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, ref) });
    const customer = order ? await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) }) : undefined;
    if (
      order?.offerSnapshot &&
      customer?.id === ev.metadata.customerId &&
      ev.subscriptionId &&
      (order.recurringCheckoutSessionId || order.offerSnapshot.billingMode === 'saved_mandate') &&
      order.status === 'paid' &&
      !order.endedAt &&
      (!order.stripeSubscriptionId || order.stripeSubscriptionId === ev.subscriptionId)
    )
      return { kind: 'v4', order, customer };
  }
  if (ev.metadata?.kind === 'order' && ref && /^[0-9a-f-]{36}$/.test(ref)) {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, ref) });
    if (order?.plan === 'monthly') {
      const customer = await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) });
      return { kind: 'monthly', order, customer };
    }
  }
  return null;
}

/**
 * Laufende Abos: Rechnungen (`invoice.paid`, `invoice.payment_failed`) und Statuswechsel
 * (`customer.subscription.updated|deleted`) für Option B und „Hosting & Pflege“.
 */
export async function applyRecurringEvent(ev: PaymentEvent, actor: string): Promise<string> {
  const t = await findTarget(ev);
  if (!t) {
    if (ev.type === 'subscription.deleted') return applySubscriptionEvent(ev, actor);
    logger.warn({ eventId: ev.eventId, type: ev.rawType }, 'Abo-Event ohne passende Bestellung');
    return 'no_order';
  }
  if (t.kind === 'v4' && (await reconcileTariffV4(t.order.id, ev.subscriptionPriceId))) {
    t.order = (await getDb().query.orders.findFirst({ where: eq(orders.id, t.order.id) }))!;
  }
  switch (ev.type) {
    case 'invoice.paid':
      return recordRecurringPayment(t, ev, actor);
    case 'invoice.payment_failed':
      return handleFailedPayment(t, ev, actor);
    case 'subscription.updated':
      return handleStatusChange(t, ev, actor);
    case 'subscription.deleted':
      return t.kind === 'care' ? applySubscriptionEvent(ev, actor) : handleEnded(t, ev, actor);
    default:
      return 'ignored';
  }
}

async function recordRecurringPayment(t: Target, ev: PaymentEvent, actor: string): Promise<string> {
  const db = getDb();
  const cfg = await getConfig();
  const amount = ev.amountTotal ?? 0;
  if (!ev.invoiceId) return 'ignored';
  if (t.kind === 'monthly' && ev.billingReason === 'subscription_create') {
    // Erste Rate = Rechnung der Bestellung (z. B. SEPA: Zahlung kam nach dem Checkout an)
    if (t.order.status === 'paid' || t.order.status === 'refunded') return 'first_rate';
    const r = await fulfillOrder(
      t.order.id,
      { amountTotal: amount, currency: ev.currency, subscriptionId: ev.subscriptionId, invoiceId: ev.invoiceId },
      actor,
    );
    return r.state;
  }
  // 0-€-Rechnungen (z. B. Testphase bis Hosting-Ende) brauchen keine eigene Rechnung
  if (amount <= 0) return 'zero_amount';
  if (
    t.kind === 'v4' &&
    (amount !== (t.order.activeOfferSnapshot ?? t.order.offerSnapshot)!.monthlyCents || ev.currency !== 'eur' || t.order.endedAt)
  )
    throw new Error('V4-Monatsrechnung stimmt nicht mit dem Vertrag überein; manuelle Prüfung erforderlich.');
  if (t.kind === 'v4') {
    const site = t.customer
      ? await db.query.sites.findFirst({ where: and(eq(sites.customerId, t.customer.id), eq(sites.status, 'live')) })
      : undefined;
    assertV4BillingReady({
      offer: t.order.offerSnapshot!,
      paid: t.order.status === 'paid',
      liveAt: site?.liveAt ?? null,
      cancelled: Boolean(t.order.endedAt),
    });
  }
  if (t.order.status !== 'paid') {
    await raiseAlert(db, {
      level: 'warn',
      code: `recurring_payment_unexpected_${ev.invoiceId}`,
      message: `Abo-Zahlung zu einer Bestellung im Status „${t.order.status}“ – bitte prüfen.`,
      context: { orderId: t.order.id },
    });
  }

  const paymentId = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id = ${t.order.id} FOR UPDATE`);
    if (t.kind === 'v4') {
      const currentOrder = await tx.query.orders.findFirst({ where: eq(orders.id, t.order.id) });
      const currentCustomer = await tx.query.customers.findFirst({ where: eq(customers.orderId, t.order.id) });
      if (
        currentOrder?.endedAt ||
        (currentOrder?.stripeSubscriptionId && currentOrder.stripeSubscriptionId !== ev.subscriptionId) ||
        (currentCustomer?.subscriptionId && currentCustomer.subscriptionId !== ev.subscriptionId)
      )
        throw new Error('Zweites oder beendetes V4-Abonnement erfordert manuelle Prüfung.');
    }
    const existing = await tx.query.orderPayments.findFirst({
      where: and(eq(orderPayments.provider, t.order.provider), eq(orderPayments.providerInvoiceId, ev.invoiceId!)),
    });
    if (existing) return null;
    const [{ n }] = (await tx.select({ n: count() }).from(orderPayments).where(eq(orderPayments.orderId, t.order.id))) as [
      { n: number },
    ];
    // Option B: Rate 1 steckt in der Bestellrechnung → nächste Rate ist n + 2
    const sequence = t.kind === 'monthly' ? Number(n) + 2 : Number(n) + 1;
    const paidAt = new Date();
    const a = amountsFor(cfg, amount);
    const number = await nextInvoiceNumber(tx, cfg, paidAt);
    const periodStart = ev.periodStart ?? paidAt;
    const periodEnd = ev.periodEnd ?? new Date(paidAt.getTime() + 30 * 86400_000);
    const invoice = buildInvoiceData(
      cfg,
      {
        ...t.order,
        ...(t.kind === 'v4' ? { plan: (t.order.activeOfferSnapshot ?? t.order.offerSnapshot)!.tier } : {}),
        domainWish: t.customer?.domain ?? t.order.domainWish,
      },
      {
        number,
        paidAt,
        issuedAt: paidAt,
        amounts: a,
        rate: { sequence, periodStart, periodEnd, kind: t.kind === 'monthly' ? 'monthly' : 'care' },
      },
    );
    const [row] = await tx
      .insert(orderPayments)
      .values({
        orderId: t.order.id,
        provider: t.order.provider,
        providerInvoiceId: ev.invoiceId!,
        sequence,
        amountCents: a.grossCents,
        netCents: a.netCents,
        vatCents: a.vatCents,
        vatRatePercent: a.vatRatePercent,
        periodStart,
        periodEnd,
        paidAt,
        invoiceNumber: number,
        invoiceJson: invoice as unknown as Record<string, unknown>,
      })
      .returning({ id: orderPayments.id });
    if (t.kind === 'monthly' || t.kind === 'v4')
      await tx
        .update(orders)
        .set({ subscriptionStatus: 'active', billingActionUrl: null, updatedAt: new Date() })
        .where(eq(orders.id, t.order.id));
    if (t.kind === 'v4' && ev.subscriptionId && t.customer) {
      if (
        (t.order.stripeSubscriptionId && t.order.stripeSubscriptionId !== ev.subscriptionId) ||
        (t.customer.subscriptionId && t.customer.subscriptionId !== ev.subscriptionId)
      )
        throw new Error('Zweites V4-Abonnement erfordert manuelle Prüfung.');
      await tx.update(orders).set({ stripeSubscriptionId: ev.subscriptionId }).where(eq(orders.id, t.order.id));
      await tx.update(customers).set({ subscriptionId: ev.subscriptionId }).where(eq(customers.id, t.customer.id));
    }
    await audit(tx, {
      entity: 'order',
      entityId: t.order.id,
      action: 'recurring_payment',
      actor,
      context: { invoiceNumber: number, sequence, amountCents: a.grossCents, kind: t.kind },
    });
    return row!.id;
  });
  if (!paymentId) return 'duplicate';
  try {
    await enqueue(
      QUEUES.sendInvoice,
      { orderId: t.order.id, kind: 'payment', paymentId },
      { singletonKey: `payment-${paymentId}` },
    );
  } catch (err) {
    logger.error({ orderId: t.order.id, ...errInfo(err) }, 'Rechnung zur Rate nicht eingereiht');
  }
  // Zahlung wieder da → Mahnverfahren beenden, pausierte Seite wieder online
  await resetDunning(t.order.id, actor);
  await restoreIfPausedForPayment(t, actor);
  return 'recorded';
}

async function siteOf(t: Target): Promise<typeof sites.$inferSelect | undefined> {
  if (!t.customer?.siteId) return undefined;
  return getDb().query.sites.findFirst({ where: eq(sites.id, t.customer.siteId) });
}

async function restoreIfPausedForPayment(t: Target, actor: string): Promise<void> {
  const site = await siteOf(t);
  if (site?.status === 'suspended' && maintenanceReasonOf(site.statusReason) === 'payment') {
    await setSiteMaintenance(site.id, false, 'payment', actor);
    await notifyAdmin({
      key: `site-restored:${site.id}:${Date.now()}`,
      title: `Zahlung eingegangen – Seite wieder online: ${t.customer?.domain ?? t.order.customerCompany}`,
      lines: [`Kunde: ${t.order.customerCompany}`],
      link: appUrl(`/admin/orders/${t.order.id}`),
    });
  }
}

async function handleFailedPayment(t: Target, ev: PaymentEvent, actor: string): Promise<string> {
  const db = getDb();
  const cfg = await getConfig();
  // Fehlgeschlagene erste Rate im Checkout: Stripe schließt den Checkout nicht ab → nichts zu tun
  if (t.order.status !== 'paid') return 'ignored';
  if (t.kind === 'monthly' || t.kind === 'v4')
    await db.update(orders).set({ subscriptionStatus: 'past_due', updatedAt: new Date() }).where(eq(orders.id, t.order.id));
  const final = ev.nextPaymentAttempt === null;
  await audit(db, {
    entity: 'order',
    entityId: t.order.id,
    action: 'recurring_payment_failed',
    actor,
    context: { invoiceId: ev.invoiceId, attempt: ev.attemptCount, final },
  });
  // Nach dem letzten automatischen Versuch übernimmt das Mahnverfahren (2 Erinnerungen, dann Wartungsmodus)
  if (final) {
    await startDunning(t.order.id, actor, ev.hostedInvoiceUrl ?? null);
    return 'dunning';
  }
  try {
    const mail = subscriptionPaymentFailedEmail(cfg, {
      name: t.order.customerName,
      amount: formatEuro(ev.amountTotal ?? 0),
      payUrl: ev.hostedInvoiceUrl ?? null,
      final,
      domain: t.customer?.domain ?? null,
    });
    await sendTransactionalEmail({
      ...mail,
      kind: 'payment_failed',
      // Je Rechnung eine Mail beim ersten Fehlschlag (danach Mahnverfahren)
      idempotencyKey: `recurring-failed:${ev.invoiceId}:first`,
      to: t.customer?.email ?? t.order.customerEmail,
      orderId: t.order.id,
      customerId: t.customer?.id,
      leadId: t.order.leadId,
    });
  } catch (err) {
    logger.warn({ orderId: t.order.id, ...errInfo(err) }, 'Mail „Rate fehlgeschlagen“ nicht versendet');
  }
  await raiseAlert(db, {
    level: final ? 'error' : 'warn',
    code: `recurring_failed_${ev.invoiceId}`,
    message: `Monatsrate ${formatEuro(ev.amountTotal ?? 0)} fehlgeschlagen (${t.order.customerCompany})${final ? ' – keine weiteren Versuche' : ''}`,
    context: { orderId: t.order.id },
  });
  return 'retrying';
}

async function handleStatusChange(t: Target, ev: PaymentEvent, actor: string): Promise<string> {
  const db = getDb();
  const status = ev.subscriptionStatus ?? 'unknown';
  if (t.kind === 'monthly' || t.kind === 'v4')
    await db
      .update(orders)
      .set({
        subscriptionStatus: status,
        ...(ev.cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd: ev.cancelAtPeriodEnd } : {}),
        ...(ev.hostedInvoiceUrl ? { billingActionUrl: ev.hostedInvoiceUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, t.order.id));
  if (status === 'unpaid') {
    await startDunning(t.order.id, actor);
    return 'dunning';
  }
  if (status === 'active') {
    await resetDunning(t.order.id, actor);
    await restoreIfPausedForPayment(t, actor);
    return 'active';
  }
  return status;
}

/** Abo von Option B endet (Kündigung nach Mindestlaufzeit, Zahlungsausfall oder durch uns). */
async function handleEnded(t: Target, ev: PaymentEvent, actor: string): Promise<string> {
  const db = getDb();
  if (t.order.endedAt) {
    await db.update(orders).set({ subscriptionStatus: 'canceled', updatedAt: new Date() }).where(eq(orders.id, t.order.id));
    return 'already_ended';
  }
  const now = new Date();
  const early = t.order.minTermEndsAt ? t.order.minTermEndsAt > now : false;
  const reason = early ? 'vor Ende der Mindestlaufzeit beendet (meist Zahlungsausfall)' : 'gekündigt';
  await db
    .update(orders)
    .set({ subscriptionStatus: 'canceled', endedAt: now, endedReason: reason, updatedAt: now })
    .where(eq(orders.id, t.order.id));
  if (t.customer) await db.update(customers).set({ subscriptionId: null, updatedAt: now }).where(eq(customers.id, t.customer.id));
  await audit(db, { entity: 'order', entityId: t.order.id, action: 'subscription_ended', actor, context: { reason } });
  // Vorzeitiges Ende (meist Zahlungsausfall): Mahnverfahren übernimmt den Wartungsmodus und den Forderungsbrief
  if (early) await startDunning(t.order.id, actor);
  const site = await siteOf(t);
  if (!early && site && site.status !== 'suspended') {
    try {
      await setSiteMaintenance(site.id, true, 'cancelled', actor);
    } catch (err) {
      logger.error({ siteId: site.id, ...errInfo(err) }, 'Seite nach Vertragsende nicht pausiert');
    }
  }
  await raiseAlert(db, {
    level: early ? 'error' : 'warn',
    code: `monthly_ended_${t.order.id}`,
    message: `Monatsvertrag ${reason}: ${t.order.customerCompany}${early && t.order.minTermEndsAt ? ` (Mindestlaufzeit bis ${formatDateLongDe(t.order.minTermEndsAt)} – offene Raten prüfen)` : ''}. Domain ${t.customer?.domain ?? '–'}: Übertragung bzw. Kündigung klären.`,
    context: { orderId: t.order.id, subscriptionId: ev.subscriptionId },
  });
  await notifyAdmin({
    key: `monthly-ended:${t.order.id}`,
    title: `Monatsvertrag beendet: ${t.order.customerCompany}`,
    lines: [
      `Grund: ${reason}`,
      `Domain: ${t.customer?.domain ?? '–'} (gehört dem Kunden – Übertragung/Kündigung klären)`,
      early
        ? 'Mahnverfahren läuft (2 Erinnerungen, dann Wartungsmodus und Forderungsbrief zur Freigabe).'
        : 'Die Seite ist pausiert.',
    ],
    link: appUrl(`/admin/orders/${t.order.id}`),
  });
  return 'ended';
}
