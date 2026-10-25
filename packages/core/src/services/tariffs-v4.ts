import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { orders, tariffChanges } from '../db/schema';
import { getProviders } from '../providers';
import { customerByToken } from './sites';
import { isV4Tier, prepareV4Switch, v4Offer } from './offers-v4';
import { stripeV4Price } from '../config/stripe-v4-prices';
import { audit } from './audit';
import { assertNotHalted } from './budget';
import { rateLimit } from './rate-limit';

export async function requestTariffChange(token: string, to: string, consent: boolean) {
  if (!consent || !isV4Tier(to)) throw new Error('Tarif und ausdrückliche Zustimmung fehlen.');
  const customer = await customerByToken(token);
  if (!customer) throw new Error('Link ungültig.');
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id=${customer.orderId} FOR UPDATE`);
    const order = (await tx.query.orders.findFirst({ where: eq(orders.id, customer.orderId) }))!;
    const offer = order.activeOfferSnapshot ?? order.offerSnapshot;
    if (
      !offer ||
      !order.stripeSubscriptionId ||
      order.subscriptionStatus !== 'active' ||
      order.endedAt ||
      order.cancelAtPeriodEnd
    )
      throw new Error('Tarifwechsel nur bei aktivem, ungekündigtem V4-Abo.');
    if (to === offer.tier) throw new Error('Dieser Tarif ist bereits aktiv.');
    const pending = await tx.query.tariffChanges.findFirst({
      where: and(eq(tariffChanges.orderId, order.id), inArray(tariffChanges.status, ['requested', 'scheduled'])),
    });
    if (pending) {
      if (pending.toTier === to) return pending;
      throw new Error('Bitte zuerst den offenen Wechsel klären.');
    }
    if (!(await rateLimit(tx, `tariff:${customer.id}`, 5, 86400)).allowed)
      throw new Error('Zu viele Wechselanfragen. Bitte später erneut versuchen.');
    const [row] = await tx
      .insert(tariffChanges)
      .values({
        orderId: order.id,
        fromTier: offer.tier,
        toTier: to,
        consentAt: new Date(),
        consentVersion: 'v4-tariff-2026-10-25',
      })
      .returning();
    await audit(tx, {
      entity: 'order',
      entityId: order.id,
      action: 'v4_tier_requested',
      actor: 'public:customer',
      context: { requestId: row!.id, from: offer.tier, to },
    });
    return row!;
  });
}

export async function approveTariffChange(id: string, actor: string) {
  await assertNotHalted();
  const db = getDb();
  const initial = await db.query.tariffChanges.findFirst({ where: eq(tariffChanges.id, id) });
  if (!initial) throw new Error('Wechsel nicht gefunden.');
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id=${initial.orderId} FOR UPDATE`);
    const request = (await tx.query.tariffChanges.findFirst({ where: eq(tariffChanges.id, id) }))!;
    if (request.status === 'scheduled' || request.status === 'applied') return request;
    if (request.status !== 'requested') throw new Error('Wechsel nicht mehr offen.');
    const order = (await tx.query.orders.findFirst({ where: eq(orders.id, request.orderId) }))!;
    const current = order.activeOfferSnapshot ?? order.offerSnapshot;
    if (!current || current.tier !== request.fromTier || !order.stripeSubscriptionId || order.endedAt || order.cancelAtPeriodEnd)
      throw new Error('Vertragsstand hat sich geändert.');
    const p = getProviders().payment;
    if (!p.subscriptionState || !p.scheduleTariffChange) throw new Error('Tarifwechsel nicht eingerichtet.');
    const sub = await p.subscriptionState(order.stripeSubscriptionId);
    const prepared = prepareV4Switch(current.tier, request.toTier, sub.periodEnd, new Date());
    if (sub.status !== 'active' || sub.cancelAtPeriodEnd) throw new Error('Abo nicht wechselbereit.');
    const schedule = await p.scheduleTariffChange({
      subscriptionId: sub.id,
      tier: prepared.to,
      amountCents: v4Offer(prepared.to).monthlyCents,
      expectedPriceId: stripeV4Price(current.tier, true, current.monthlyCents, 'eur'),
      idempotencyKey: `tariff-${request.id}`,
    });
    const [updated] = await tx
      .update(tariffChanges)
      .set({
        status: 'scheduled',
        effectiveAt: schedule.effectiveAt,
        scheduleId: schedule.scheduleId,
        approvedBy: actor,
        approvedAt: new Date(),
      })
      .where(eq(tariffChanges.id, id))
      .returning();
    await audit(tx, {
      entity: 'order',
      entityId: order.id,
      action: 'v4_tier_scheduled',
      actor,
      context: { requestId: id, effectiveAt: schedule.effectiveAt.toISOString(), proration: 'none' },
    });
    return updated!;
  });
}

export async function cancelTariffChange(id: string, actor: string) {
  const db = getDb();
  const initial = await db.query.tariffChanges.findFirst({ where: eq(tariffChanges.id, id) });
  if (!initial) throw new Error('Wechsel nicht gefunden.');
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id=${initial.orderId} FOR UPDATE`);
    const r = (await tx.query.tariffChanges.findFirst({ where: eq(tariffChanges.id, id) }))!;
    if (r.status === 'cancelled' || r.status === 'rejected') return;
    if (r.status === 'applied' || (r.effectiveAt && r.effectiveAt <= new Date()))
      throw new Error('Wirksamer Wechsel kann nicht rückwirkend storniert werden.');
    if (r.scheduleId) {
      await assertNotHalted();
      const p = getProviders().payment;
      if (!p.releaseTariffSchedule) throw new Error('Anbieter unterstützt keine Planfreigabe.');
      await p.releaseTariffSchedule(r.scheduleId, `tariff-cancel-${r.id}`);
    }
    await tx
      .update(tariffChanges)
      .set({ status: r.status === 'requested' ? 'rejected' : 'cancelled' })
      .where(eq(tariffChanges.id, id));
    await audit(tx, { entity: 'order', entityId: r.orderId, action: 'v4_tier_cancelled', actor, context: { requestId: id } });
  });
}

/** The initial purchase snapshot is immutable; a separate active snapshot controls current entitlement. */
export async function reconcileTariffV4(orderId: string, actualPriceId?: string, now = new Date()) {
  const db = getDb();
  const pending = await db.query.tariffChanges.findFirst({
    where: and(eq(tariffChanges.orderId, orderId), eq(tariffChanges.status, 'scheduled')),
    orderBy: desc(tariffChanges.createdAt),
  });
  if (!pending?.effectiveAt || pending.effectiveAt > now) return false;
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`);
    const r = (await tx.query.tariffChanges.findFirst({ where: eq(tariffChanges.id, pending.id) }))!;
    if (r.status !== 'scheduled') return false;
    const order = (await tx.query.orders.findFirst({ where: eq(orders.id, orderId) }))!;
    if (!order.offerSnapshot || order.endedAt || !order.stripeSubscriptionId) return false;
    const p = getProviders().payment;
    if (!actualPriceId) actualPriceId = (await p.subscriptionState?.(order.stripeSubscriptionId))?.priceId;
    const target = v4Offer(r.toTier, r.consentAt.toISOString(), order.offerSnapshot.billingMode);
    if (actualPriceId !== stripeV4Price(r.toTier, true, target.monthlyCents, 'eur')) return false;
    await tx.update(orders).set({ activeOfferSnapshot: target, updatedAt: now }).where(eq(orders.id, orderId));
    await tx.update(tariffChanges).set({ status: 'applied', appliedAt: now }).where(eq(tariffChanges.id, r.id));
    await audit(tx, {
      entity: 'order',
      entityId: orderId,
      action: 'v4_tier_changed',
      actor: 'job:subscription',
      context: { requestId: r.id, tier: r.toTier },
    });
    return true;
  });
}

export async function requestCancellationV4(token: string, consent: boolean) {
  if (!consent) throw new Error('Kündigung bitte ausdrücklich bestätigen.');
  const customer = await customerByToken(token);
  if (!customer) throw new Error('Link ungültig.');
  await assertNotHalted();
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id=${customer.orderId} FOR UPDATE`);
    const order = (await tx.query.orders.findFirst({ where: eq(orders.id, customer.orderId) }))!;
    if (!order.offerSnapshot || !order.stripeSubscriptionId || order.endedAt) throw new Error('Kein kündbares V4-Abo.');
    if (order.cancelAtPeriodEnd) return;
    const p = getProviders().payment;
    if (!p.cancelAtPeriodEnd) throw new Error('Kündigung nicht eingerichtet.');
    await p.cancelAtPeriodEnd(order.stripeSubscriptionId, `v4-cancel-${order.id}`);
    await tx.update(orders).set({ cancelAtPeriodEnd: true, updatedAt: new Date() }).where(eq(orders.id, order.id));
    await tx
      .update(tariffChanges)
      .set({ status: 'cancelled' })
      .where(and(eq(tariffChanges.orderId, order.id), inArray(tariffChanges.status, ['requested', 'scheduled'])));
    await audit(tx, {
      entity: 'order',
      entityId: order.id,
      action: 'v4_cancellation_requested',
      actor: 'public:customer',
      context: { atPeriodEnd: true },
    });
  });
}

/** Customer tokens authorize only their own request, never another customer's ID. */
export async function withdrawTariffChange(token: string, id: string) {
  const c = await customerByToken(token);
  const r = await getDb().query.tariffChanges.findFirst({ where: eq(tariffChanges.id, id) });
  if (!c || !r || r.orderId !== c.orderId) throw new Error('Wechsel nicht gefunden.');
  await cancelTariffChange(id, 'public:customer');
}
export async function sweepTariffsV4(now = new Date()) {
  const rows = await getDb()
    .select({ orderId: tariffChanges.orderId })
    .from(tariffChanges)
    .where(and(eq(tariffChanges.status, 'scheduled'), sql`${tariffChanges.effectiveAt} <= ${now.toISOString()}::timestamptz`));
  let n = 0;
  for (const r of rows) if (await reconcileTariffV4(r.orderId, undefined, now)) n++;
  return n;
}
