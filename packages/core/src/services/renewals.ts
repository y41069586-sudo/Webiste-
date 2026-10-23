import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import { appUrl } from '../config/env';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { customers, sites } from '../db/schema';
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
