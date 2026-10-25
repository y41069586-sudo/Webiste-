import { eq } from 'drizzle-orm';
import { appUrl } from '../config/env';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { customers, orders } from '../db/schema';
import { guaranteeRefundEmail } from '../emails/templates';
import { errInfo, logger } from '../logger';
import { getProviders } from '../providers';
import { addDays, formatDateLongDe, formatEuro } from '../util/time';
import { audit } from './audit';
import { raiseAlert } from './budget';
import { notifyAdmin, sendTransactionalEmail } from './email';
import { setSiteMaintenance } from './maintenance';
import { refundOrder } from './orders';

/**
 * Ende der Garantiefrist: Sie beginnt mit dem Go-Live, spätestens aber `latestStartDays` nach der Zahlung
 * (falls sich der Go-Live wegen des Kunden verzögert), und dauert `days` Tage.
 */
export function guaranteeEndFor(
  cfg: { guarantee: { days: number; latestStartDays: number } },
  paidAt: Date,
  liveAt: Date | null,
): Date {
  const latest = addDays(paidAt, cfg.guarantee.latestStartDays);
  const start = liveAt && liveAt < latest ? liveAt : latest;
  return addDays(start, cfg.guarantee.days);
}

export interface GuaranteeStatus {
  available: boolean;
  reason?: string;
  endsAt: Date | null;
}

/** Ob der Garantie-Button für eine Bestellung angeboten wird. */
export async function guaranteeStatus(order: typeof orders.$inferSelect, now = new Date()): Promise<GuaranteeStatus> {
  const cfg = await getConfig();
  const endsAt = order.guaranteeEndsAt;
  if (!cfg.guarantee.enabled) return { available: false, reason: 'Garantie ist in den Einstellungen ausgeschaltet.', endsAt };
  if (order.status !== 'paid') return { available: false, reason: 'Nur für bezahlte Bestellungen.', endsAt };
  if (!endsAt) return { available: false, reason: 'Bestellung ohne Garantiefrist (vor Einführung bezahlt).', endsAt };
  if (endsAt < now) return { available: false, reason: 'Garantiefrist abgelaufen.', endsAt };
  return { available: true, endsAt };
}

/**
 * 14-Tage-Zufriedenheitsgarantie (Admin-Button): Zahlung erstatten (Option B: erste Rate), Vertrag beenden,
 * Seite offline nehmen, Domain-Übertragung bzw. -Kündigung als Aufgabe melden, Kunde informieren.
 * Löst eine echte Erstattung aus – nur auf ausdrückliche Aktion des Betreibers.
 */
export async function guaranteeRefund(orderId: string, actor: string): Promise<{ refundedCents: number }> {
  const db = getDb();
  const cfg = await getConfig();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw new Error('Bestellung nicht gefunden');
  const status = await guaranteeStatus(order);
  if (!status.available) throw new Error(status.reason);
  const customer = await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) });

  // 1) Option B: Vertrag sofort beenden (keine weiteren Raten), bevor erstattet wird
  const subscriptionToCancel = order.stripeSubscriptionId ?? (order.offerSnapshot ? customer?.subscriptionId : null);
  if (subscriptionToCancel) {
    const p = getProviders().payment;
    if (!p.cancelSubscription) throw new Error('Der Zahlungsanbieter kann Abos nicht über die API beenden.');
    await p.cancelSubscription(subscriptionToCancel, { idempotencyKey: `guarantee-cancel-${order.id}` });
  }
  const now = new Date();
  await db
    .update(orders)
    .set({
      endedAt: now,
      endedReason: 'Zufriedenheitsgarantie',
      ...(order.plan === 'monthly' || order.offerSnapshot ? { subscriptionStatus: 'canceled' } : {}),
      updatedAt: now,
    })
    .where(eq(orders.id, order.id));

  // 2) Erstattung (Option A: voller Betrag; Option B: erste Rate) – Stornorechnung folgt automatisch
  const refundable = order.amountCents - order.refundedCents;
  if (refundable > 0) await refundOrder(order.id, actor, refundable);

  // 3) Seite offline (falls schon gebaut bzw. veröffentlicht)
  if (customer?.siteId) {
    try {
      await setSiteMaintenance(customer.siteId, true, 'guarantee', actor);
    } catch (err) {
      logger.error({ orderId, ...errInfo(err) }, 'Seite konnte nach Garantie nicht offline genommen werden');
      await raiseAlert(db, {
        level: 'error',
        code: `guarantee_offline_${order.id}`,
        message: 'Garantie: Seite konnte nicht offline genommen werden – bitte manuell erledigen.',
        context: { orderId },
      });
    }
  }
  // 4) Domain gehört dem Kunden: Übertragung (Auth-Code) oder Kündigung ist eine Aufgabe für den Betreiber
  const registered = customer?.domain && customer.domainStatus === 'registered' ? customer.domain : null;
  if (customer) {
    await db
      .update(customers)
      .set({ subscriptionId: null, ...(registered ? { domainStatus: 'release_pending' } : {}), updatedAt: now })
      .where(eq(customers.id, customer.id));
  }
  if (registered) {
    await raiseAlert(db, {
      level: 'warn',
      code: `guarantee_domain_${order.id}`,
      message: `Garantie: Domain ${registered} – dem Kunden kostenlos per Auth-Code übertragen, falls er antwortet; sonst Auto-Verlängerung bei INWX abschalten (nicht verlängern).`,
      context: { orderId, customerId: customer?.id },
    });
  }
  // 5) Kunde informieren
  try {
    const mail = guaranteeRefundEmail(cfg, {
      name: order.customerName,
      amount: formatEuro(refundable),
      monthly: order.plan === 'monthly',
      domainRegistered: registered,
      domainExpires: customer?.domainExpiresAt ? formatDateLongDe(customer.domainExpiresAt) : null,
    });
    await sendTransactionalEmail({
      ...mail,
      kind: 'refund',
      idempotencyKey: `guarantee:${order.id}`,
      to: order.customerEmail,
      orderId: order.id,
      customerId: customer?.id,
      leadId: order.leadId,
    });
  } catch (err) {
    logger.warn({ orderId, ...errInfo(err) }, 'Garantie-Mail nicht versendet');
  }
  await audit(db, {
    entity: 'order',
    entityId: order.id,
    action: 'guarantee_refund',
    actor,
    context: { refundedCents: refundable, plan: order.plan, domain: registered },
  });
  await notifyAdmin({
    key: `guarantee:${order.id}`,
    title: `Garantie ausgeführt: ${order.customerCompany}`,
    lines: [
      `Erstattet: ${formatEuro(refundable)}`,
      order.plan === 'monthly' ? 'Monatsvertrag beendet.' : 'Einmalzahlung erstattet.',
      registered ? `Offen: Domain ${registered} übertragen oder kündigen.` : 'Keine Domain registriert.',
    ],
    link: appUrl(`/admin/orders/${order.id}`),
  });
  return { refundedCents: refundable };
}
