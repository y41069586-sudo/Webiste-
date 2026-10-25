import { assertV4BillingReady } from './offers-v4';
import { and, eq, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { appUrl } from '../config/env';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { customers, sites, orders } from '../db/schema';
import { renewalReminderEmail } from '../emails/templates';
import { getProviders } from '../providers';
import type { PaymentEvent } from '../providers/types';
import { addDays, formatDateLongDe } from '../util/time';
import { audit } from './audit';
import { raiseAlert } from './budget';
import { sendTransactionalEmail } from './email';
import { customerByToken } from './sites';

/**
 * Erinnerung vor Ablauf des inklusiven Hostings (Standard: 30 Tage vorher, einmalig).
 * Mit aktivem Abo-Schalter enthält die Mail den Link zum Abo-Abschluss, sonst „einfach antworten“.
 */
export async function sendRenewalReminders(now = new Date()): Promise<number> {
  const db = getDb();
  const cfg = await getConfig();
  const due = await db
    .select({ c: customers, s: sites })
    .from(customers)
    .innerJoin(sites, eq(sites.customerId, customers.id))
    .where(
      and(
        eq(sites.status, 'live'),
        isNotNull(customers.hostingUntil),
        isNull(customers.renewalReminderSentAt),
        isNull(customers.subscriptionId),
        lte(customers.hostingUntil, addDays(now, cfg.timing.renewalReminderDays)),
      ),
    );
  let sent = 0;
  for (const { c } of due) {
    const mail = renewalReminderEmail(cfg, {
      name: c.contactName,
      domain: c.domain,
      hostingUntil: formatDateLongDe(c.hostingUntil!),
      subscriptionUrl:
        cfg.pricing.subscriptionEnabled && getProviders().payment.createSubscriptionCheckout
          ? appUrl(`/verlaengern/${c.accessToken}`)
          : null,
    });
    await sendTransactionalEmail({
      ...mail,
      kind: 'renewal_reminder',
      idempotencyKey: `renewal:${c.id}:${c.hostingUntil!.toISOString().slice(0, 10)}`,
      to: c.email,
      customerId: c.id,
    });
    await db.update(customers).set({ renewalReminderSentAt: now, updatedAt: now }).where(eq(customers.id, c.id));
    sent++;
  }
  return sent;
}

export type SubscriptionStart = { ok: true; url: string } | { ok: false; error: string };

/** Abo „Hosting & Pflege“ abschließen – erste Abbuchung erst nach Ende des inklusiven Hostings. */
export async function startSubscriptionCheckout(token: string): Promise<SubscriptionStart> {
  const cfg = await getConfig();
  const c = await customerByToken(token);
  if (!c) return { ok: false, error: 'Link ungültig.' };
  const order = await getDb().query.orders.findFirst({ where: eq(orders.id, c.orderId) });
  if (order?.offerSnapshot) {
    const offer = order.offerSnapshot;
    return getDb().transaction(async (tx): Promise<SubscriptionStart> => {
      await tx.execute(sql`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`);
      const current = (await tx.query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
      const customer = (await tx.query.customers.findFirst({ where: eq(customers.id, c.id) }))!;
      const site = await tx.query.sites.findFirst({ where: and(eq(sites.customerId, c.id), eq(sites.status, 'live')) });
      try {
        assertV4BillingReady({
          offer: current.offerSnapshot!,
          paid: current.status === 'paid',
          liveAt: site?.liveAt ?? null,
          cancelled: Boolean(current.endedAt),
        });
      } catch {
        return { ok: false, error: 'Monatstarif erst nach bestätigtem Go-Live und Zustimmung verfügbar.' };
      }
      if (customer.subscriptionId || current.stripeSubscriptionId)
        return { ok: false, error: 'Ihr Abo ist bereits eingerichtet.' };
      if (current.offerSnapshot?.billingMode === 'saved_mandate')
        return {
          ok: false,
          error:
            'Ihr Monatstarif wird automatisch nach bestätigtem Go-Live gestartet. Bei Zahlungsrückfragen bitte die Tarifverwaltung nutzen.',
        };
      const provider = getProviders().payment;
      if (!provider.createSubscriptionCheckout) return { ok: false, error: 'Abo-Abschluss nicht eingerichtet.' };
      if (current.recurringCheckoutSessionId) {
        if (!provider.retrieveSession && current.recurringCheckoutUrl) return { ok: true, url: current.recurringCheckoutUrl };
        const previous = await provider.retrieveSession?.(current.recurringCheckoutSessionId);
        if (previous?.status === 'open' && current.recurringCheckoutUrl) return { ok: true, url: current.recurringCheckoutUrl };
        if (previous?.status !== 'expired')
          return { ok: false, error: 'Vorheriger Abo-Abschluss wird noch geprüft. Es wird kein zweites Abo angelegt.' };
      }
      const session = await provider.createSubscriptionCheckout({
        customerRef: c.id,
        customerEmail: c.email,
        amountCents: offer.monthlyCents,
        productName: `SeitenWerk ${offer.tier === 'basis' ? 'Basis' : 'Care+'}`,
        billingStartsAt: site!.liveAt!,
        confirmedGoLive: true,
        successUrl: appUrl(`/verlaengern/${token}?erfolg=1`),
        cancelUrl: appUrl(`/verlaengern/${token}`),
        metadata: { kind: 'subscription', customerId: c.id, orderId: order.id, offerVersion: 'v4', tier: offer.tier },
        idempotencyKey: `v4-subscription-${order.id}-${current.recurringCheckoutSessionId ?? 'first'}`,
      });
      await tx
        .update(orders)
        .set({ recurringCheckoutUrl: session.url, recurringCheckoutSessionId: session.sessionId })
        .where(eq(orders.id, order.id));
      return { ok: true, url: session.url };
    });
  }
  if (!cfg.pricing.subscriptionEnabled)
    return {
      ok: false,
      error: 'Die Verlängerung ist derzeit nur per E-Mail möglich – antworten Sie einfach auf unsere Erinnerung.',
    };
  if (c.subscriptionId) return { ok: false, error: 'Ihr Abo ist bereits aktiv.' };
  const p = getProviders().payment;
  if (!p.createSubscriptionCheckout) return { ok: false, error: 'Abo-Abschluss ist nicht eingerichtet.' };
  const s = await p.createSubscriptionCheckout({
    customerRef: c.id,
    customerEmail: c.email,
    amountCents: cfg.pricing.subscriptionCents,
    productName: `${cfg.pricing.subscriptionName}${c.domain ? ` – ${c.domain}` : ''}`,
    billingStartsAt: c.hostingUntil ?? new Date(),
    successUrl: appUrl(`/verlaengern/${token}?erfolg=1`),
    cancelUrl: appUrl(`/verlaengern/${token}`),
    metadata: { kind: 'subscription', customerId: c.id },
    idempotencyKey: `subscription-${c.id}-${new Date().toISOString().slice(0, 13)}`,
  });
  return { ok: true, url: s.url };
}

/** Abo-Events aus dem Zahlungs-Webhook (Abschluss, Kündigung). */
export async function applySubscriptionEvent(ev: PaymentEvent, actor: string): Promise<string> {
  const db = getDb();
  const customerId = ev.metadata?.customerId ?? ev.clientReferenceId;
  if (ev.type === 'checkout.completed' && ev.subscriptionId && customerId) {
    const existing = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
    if (!existing) return 'no_customer';
    if (existing?.subscriptionId && existing.subscriptionId !== ev.subscriptionId)
      throw new Error('Zweites Abonnement erfordert manuelle Prüfung.');
    const order = await db.query.orders.findFirst({ where: eq(orders.id, existing.orderId) });
    if (order?.offerSnapshot) {
      return db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`);
        const current = (await tx.query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
        const customer = (await tx.query.customers.findFirst({ where: eq(customers.id, existing.id) }))!;
        const site = await tx.query.sites.findFirst({ where: and(eq(sites.customerId, existing.id), eq(sites.status, 'live')) });
        assertV4BillingReady({
          offer: current.offerSnapshot!,
          paid: current.status === 'paid',
          liveAt: site?.liveAt ?? null,
          cancelled: Boolean(current.endedAt),
        });
        if (
          (current.stripeSubscriptionId && current.stripeSubscriptionId !== ev.subscriptionId) ||
          (customer.subscriptionId && customer.subscriptionId !== ev.subscriptionId)
        )
          throw new Error('Zweites Abonnement erfordert manuelle Prüfung.');
        if (ev.metadata?.orderId !== current.id || ev.sessionId !== current.recurringCheckoutSessionId)
          throw new Error('Abo-Checkout gehört nicht zum vorbereiteten Auftrag.');
        await tx
          .update(orders)
          .set({
            stripeSubscriptionId: ev.subscriptionId,
            subscriptionStatus: current.subscriptionStatus ?? 'incomplete',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, current.id));
        await tx
          .update(customers)
          .set({ subscriptionId: ev.subscriptionId, updatedAt: new Date() })
          .where(eq(customers.id, customer.id));
        await audit(tx, {
          entity: 'customer',
          entityId: customer.id,
          action: 'subscription_started',
          actor,
          context: { subscriptionId: ev.subscriptionId },
        });
        return 'subscription_started';
      });
    }
    await db
      .update(customers)
      .set({ subscriptionId: ev.subscriptionId, updatedAt: new Date() })
      .where(eq(customers.id, customerId));
    await audit(db, {
      entity: 'customer',
      entityId: customerId,
      action: 'subscription_started',
      actor,
      context: { subscriptionId: ev.subscriptionId },
    });
    return 'subscription_started';
  }
  if (ev.type === 'subscription.deleted' && ev.subscriptionId) {
    const c = await db.query.customers.findFirst({ where: eq(customers.subscriptionId, ev.subscriptionId) });
    if (!c) return 'no_customer';
    await db.update(customers).set({ subscriptionId: null, updatedAt: new Date() }).where(eq(customers.id, c.id));
    const order = await db.query.orders.findFirst({ where: eq(orders.id, c.orderId) });
    if (order?.offerSnapshot)
      await db
        .update(orders)
        .set({
          subscriptionStatus: 'canceled',
          endedAt: new Date(),
          endedReason: 'Monatstarif beendet; Übergabe manuell prüfen',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    await audit(db, { entity: 'customer', entityId: c.id, action: 'subscription_ended', actor });
    await raiseAlert(db, {
      level: 'warn',
      code: `subscription_end_${c.id}`,
      message: `Abo beendet: ${c.company} (${c.domain ?? '–'})`,
      context: { customerId: c.id },
    });
    return 'subscription_ended';
  }
  return 'ignored';
}
