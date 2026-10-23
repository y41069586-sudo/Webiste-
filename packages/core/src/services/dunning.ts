import { and, count, eq, inArray, lt, sql } from 'drizzle-orm';
import { renderClaimLetterHtml } from '@wbm/templates';
import { appUrl } from '../config/env';
import { effectiveSwitches, getConfig } from '../config/service';
import { getDb } from '../db/client';
import { customers, dunningLetters, orderPayments, orders } from '../db/schema';
import { dunningReminderEmail } from '../emails/templates';
import { errInfo, logger } from '../logger';
import { getProviders } from '../providers';
import { htmlToPdf } from '../render/pdf';
import { addDays, formatDateDe, formatDateLongDe, formatEuro } from '../util/time';
import { audit } from './audit';
import { KillSwitchError, raiseAlert, recordCost } from './budget';
import { notifyAdmin, sendTransactionalEmail } from './email';
import { setSiteMaintenance } from './maintenance';

type Order = typeof orders.$inferSelect;

/**
 * Mahnverfahren nach Zahlungsausfall (Option B und „Hosting & Pflege“): Smart Retries laufen bei Stripe.
 * Danach Erinnerung 1 (sofort) → Erinnerung 2 → Wartungsmodus → Forderungsbrief (nur Entwurf,
 * Versand erst nach Freigabe im Dashboard). Kein automatisiertes Inkasso.
 */
export async function startDunning(orderId: string, actor: string, payUrl: string | null = null): Promise<boolean> {
  const db = getDb();
  const res = await db
    .update(orders)
    .set({ dunningStage: 1, dunningUpdatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.dunningStage, 0)))
    .returning();
  const order = res[0];
  if (!order) return false;
  await audit(db, { entity: 'order', entityId: orderId, action: 'dunning_started', actor });
  await sendReminder(order, 1, payUrl);
  await raiseAlert(db, {
    level: 'warn',
    code: `dunning_${orderId}`,
    message: `Zahlungsausfall nach allen Einzugsversuchen: ${order.customerCompany} – Erinnerung 1 versendet.`,
    context: { orderId },
  });
  return true;
}

async function sendReminder(order: Order, stage: 1 | 2, payUrl: string | null): Promise<void> {
  const cfg = await getConfig();
  const db = getDb();
  const customer = await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) });
  const days =
    stage === 1 ? cfg.dunning.secondReminderAfterDays + cfg.dunning.maintenanceAfterDays : cfg.dunning.maintenanceAfterDays;
  try {
    const mail = dunningReminderEmail(cfg, {
      name: order.customerName,
      stage,
      amount: formatEuro(order.plan === 'monthly' ? order.amountCents : cfg.pricing.subscriptionCents),
      domain: customer?.domain ?? order.domainWish,
      pauseOn: formatDateLongDe(addDays(new Date(), days)),
      payUrl,
    });
    await sendTransactionalEmail({
      ...mail,
      kind: 'dunning',
      idempotencyKey: `dunning:${order.id}:${stage}:${(order.dunningUpdatedAt ?? new Date()).toISOString().slice(0, 10)}`,
      to: customer?.email ?? order.customerEmail,
      orderId: order.id,
      customerId: customer?.id,
      leadId: order.leadId,
    });
  } catch (err) {
    logger.warn({ orderId: order.id, ...errInfo(err) }, 'Zahlungserinnerung nicht versendet');
  }
}

/** Zahlung eingegangen: Mahnverfahren beenden, offene Forderungsbrief-Entwürfe verwerfen. */
export async function resetDunning(orderId: string, actor: string): Promise<void> {
  const db = getDb();
  const res = await db
    .update(orders)
    .set({ dunningStage: 0, dunningUpdatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), sql`${orders.dunningStage} > 0`))
    .returning({ id: orders.id });
  if (!res.length) return;
  await db
    .update(dunningLetters)
    .set({ status: 'cancelled', note: 'Zahlung eingegangen', updatedAt: new Date() })
    .where(and(eq(dunningLetters.orderId, orderId), inArray(dunningLetters.status, ['draft', 'approved'])));
  await audit(db, { entity: 'order', entityId: orderId, action: 'dunning_resolved', actor });
}

/** Täglicher Schritt des Mahnverfahrens. */
export async function runDunning(now = new Date()): Promise<{ reminders: number; paused: number; claims: number }> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const out = { reminders: 0, paused: 0, claims: 0 };
  const second = await db
    .select()
    .from(orders)
    .where(and(eq(orders.dunningStage, 1), lt(orders.dunningUpdatedAt, addDays(now, -cfg.dunning.secondReminderAfterDays))));
  for (const o of second) {
    const upd = await db
      .update(orders)
      .set({ dunningStage: 2, dunningUpdatedAt: now, updatedAt: now })
      .where(and(eq(orders.id, o.id), eq(orders.dunningStage, 1)))
      .returning();
    if (!upd[0]) continue;
    await sendReminder(upd[0], 2, null);
    await audit(db, { entity: 'order', entityId: o.id, action: 'dunning_reminder_2', actor: 'job:dunning' });
    out.reminders++;
  }
  const pause = await db
    .select()
    .from(orders)
    .where(and(eq(orders.dunningStage, 2), lt(orders.dunningUpdatedAt, addDays(now, -cfg.dunning.maintenanceAfterDays))));
  for (const o of pause) {
    const customer = await db.query.customers.findFirst({ where: eq(customers.orderId, o.id) });
    if (customer?.siteId) {
      try {
        await setSiteMaintenance(customer.siteId, true, 'payment', 'job:dunning');
      } catch (err) {
        await raiseAlert(db, {
          level: 'error',
          code: `maintenance_failed_${customer.siteId}`,
          message: 'Wartungsmodus konnte nicht aktiviert werden – bitte manuell prüfen.',
          context: { orderId: o.id, error: err instanceof Error ? err.message : String(err) },
        });
        continue;
      }
    }
    await db.update(orders).set({ dunningStage: 3, dunningUpdatedAt: now, updatedAt: now }).where(eq(orders.id, o.id));
    await audit(db, { entity: 'order', entityId: o.id, action: 'dunning_maintenance', actor: 'job:dunning' });
    out.paused++;
    if (await prepareClaimLetter(o.id)) out.claims++;
    await notifyAdmin({
      key: `dunning-paused:${o.id}`,
      title: `Seite pausiert (Zahlungsausfall): ${customer?.domain ?? o.customerCompany}`,
      lines: [
        `Kunde: ${o.customerCompany}`,
        'Zwei Erinnerungen ohne Zahlung. Ein Forderungsbrief wartet ggf. im Dashboard auf deine Freigabe.',
      ],
      link: appUrl(`/admin/orders/${o.id}`),
    });
  }
  return out;
}

/** Offene Raten bis zum Ende der Mindestlaufzeit (nur Option B). */
export async function openRatesUntilMinTerm(order: Order): Promise<{ openRates: number; paidRates: number }> {
  if (order.plan !== 'monthly') return { openRates: 0, paidRates: 0 };
  const cfg = await getConfig();
  const [row] = await getDb()
    .select({ n: count() })
    .from(orderPayments)
    .where(and(eq(orderPayments.orderId, order.id), sql`${orderPayments.refundedCents} < ${orderPayments.amountCents}`));
  const paidRates = 1 + Number(row?.n ?? 0);
  return { openRates: Math.max(0, cfg.pricing.minTermMonths - paidRates), paidRates };
}

/** Forderungsbrief als Entwurf anlegen (PDF), wartet auf Freigabe. Idempotent je Bestellung. */
export async function prepareClaimLetter(orderId: string): Promise<boolean> {
  const db = getDb();
  const cfg = await getConfig();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || order.plan !== 'monthly') return false;
  const existing = await db.query.dunningLetters.findFirst({
    where: and(eq(dunningLetters.orderId, orderId), inArray(dunningLetters.status, ['draft', 'approved', 'sent'])),
  });
  if (existing) return false;
  const { openRates, paidRates } = await openRatesUntilMinTerm(order);
  if (openRates <= 0) return false;
  const customer = await db.query.customers.findFirst({ where: eq(customers.orderId, orderId) });
  const a = order.billingAddressJson;
  const rates = Array.from({ length: openRates }, (_, i) => ({
    label: `Monatsrate ${paidRates + i + 1} von ${cfg.pricing.minTermMonths}`,
    amount: formatEuro(order.amountCents),
  }));
  const total = openRates * order.amountCents;
  const html = renderClaimLetterHtml({
    sender: { ...cfg.sender },
    recipientLines: [
      order.customerCompany,
      order.customerName !== order.customerCompany ? order.customerName : '',
      a.street,
      `${a.postalCode} ${a.city}`,
    ].filter(Boolean),
    dateLine: `${cfg.sender.city}, ${formatDateLongDe(new Date())}`,
    orderRef: order.invoiceNumber ?? order.id.slice(0, 8).toUpperCase(),
    contract: `${cfg.pricing.monthlyName}${customer?.domain ? ` – ${customer.domain}` : ''}`,
    minTermEnds: order.minTermEndsAt ? formatDateLongDe(order.minTermEndsAt) : `Monat ${cfg.pricing.minTermMonths}`,
    rates,
    total: formatEuro(total),
    dueDate: formatDateDe(addDays(new Date(), cfg.dunning.claimDueDays)),
  });
  const pdf = await htmlToPdf(html);
  const [row] = await db
    .insert(dunningLetters)
    .values({ orderId, openRates, amountCents: total, status: 'draft' })
    .returning({ id: dunningLetters.id });
  const key = `dunning/${orderId}/${row!.id}.pdf`;
  await getProviders().storage.put(key, pdf, 'application/pdf');
  await db.update(dunningLetters).set({ pdfStorageKey: key }).where(eq(dunningLetters.id, row!.id));
  await audit(db, {
    entity: 'order',
    entityId: orderId,
    action: 'claim_letter_prepared',
    actor: 'job:dunning',
    context: { openRates, amountCents: total },
  });
  await raiseAlert(db, {
    level: 'warn',
    code: `claim_letter_${orderId}`,
    message: `Forderungsbrief (${openRates} offene Raten, ${formatEuro(total)}) wartet auf Freigabe: ${order.customerCompany}`,
    context: { orderId },
  });
  return true;
}

/** Freigabe durch den Betreiber: Versand über den Briefdienst (DRY_RUN: nur als freigegeben markiert). */
export async function approveClaimLetter(id: string, actor: string): Promise<'sent' | 'approved_dry_run'> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const sw = effectiveSwitches(cfg);
  if (sw.killSwitch) throw new KillSwitchError();
  const l = await db.query.dunningLetters.findFirst({ where: eq(dunningLetters.id, id) });
  if (!l || l.status !== 'draft') throw new Error('Nur Entwürfe können freigegeben werden.');
  const order = (await db.query.orders.findFirst({ where: eq(orders.id, l.orderId) }))!;
  const now = new Date();
  await db
    .update(dunningLetters)
    .set({ status: 'approved', approvedBy: actor, approvedAt: now, updatedAt: now })
    .where(eq(dunningLetters.id, id));
  await audit(db, { entity: 'order', entityId: l.orderId, action: 'claim_letter_approved', actor });
  if (sw.dryRun) return 'approved_dry_run';
  const pdf = await getProviders().storage.get(l.pdfStorageKey ?? '');
  if (!pdf) throw new Error('PDF fehlt');
  const provider = getProviders().mail;
  const a = order.billingAddressJson;
  const m = /^(.*?)\s+(\S+)$/.exec(a.street.trim());
  const res = await provider.send(pdf, {
    color: false,
    deliveryProduct: cfg.letter.deliveryProduct,
    addressPosition: 'left',
    recipientCountry: 'DE',
    pages: 1,
    idempotencyKey: `claim-${id}`,
    reference: `wbm-claim-${id}`,
    recipient: {
      name: order.customerCompany,
      street: m?.[1] ?? a.street,
      number: m?.[2] ?? '',
      zip: a.postalCode,
      city: a.city,
      country: 'DE',
    },
    sender: {
      name: cfg.sender.company || cfg.sender.name,
      street: cfg.sender.street.replace(/\s+\S+$/, ''),
      number: cfg.sender.street.match(/(\S+)$/)?.[1] ?? '',
      zip: cfg.sender.postalCode,
      city: cfg.sender.city,
      country: 'DE',
    },
  });
  await recordCost(db, {
    category: 'letter',
    amountCents: res.costCents ?? cfg.costs.letterEstimateCents,
    estimated: res.costCents === undefined,
    ref: `claim:${id}`,
    idempotencyKey: `claim-letter:${id}`,
    meta: { provider: provider.name },
  });
  await db
    .update(dunningLetters)
    .set({
      status: 'sent',
      provider: provider.name,
      providerLetterId: res.providerLetterId,
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(dunningLetters.id, id));
  return 'sent';
}

export async function cancelClaimLetter(id: string, actor: string, note: string): Promise<void> {
  const db = getDb();
  const l = await db.query.dunningLetters.findFirst({ where: eq(dunningLetters.id, id) });
  if (!l || !['draft', 'approved'].includes(l.status)) throw new Error('Brief kann nicht verworfen werden.');
  await db
    .update(dunningLetters)
    .set({ status: 'cancelled', note: note || 'verworfen', updatedAt: new Date() })
    .where(eq(dunningLetters.id, id));
  await audit(db, { entity: 'order', entityId: l.orderId, action: 'claim_letter_cancelled', actor, context: { note } });
}
