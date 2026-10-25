import { and, desc, eq, gt, isNull, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client';
import { careWork, careChecks, changeRequests, customers, orders, orderPayments, sites, tariffChanges } from '../db/schema';
import { getProviders } from '../providers';
import { effectiveSwitches, getConfig } from '../config/service';
import { addMonths } from '../util/time';
import { recordCost } from './budget';
import { audit } from './audit';
import { v4Offer } from './offers-v4';

export function billingPeriodV4(anchor: Date, at: Date) {
  if (!Number.isFinite(anchor.getTime()) || !Number.isFinite(at.getTime()) || at < anchor)
    throw new Error('Arbeit liegt vor dem Abostart.');
  let n = (at.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + at.getUTCMonth() - anchor.getUTCMonth();
  if (addMonths(anchor, n) > at) n--;
  return { start: addMonths(anchor, n), end: addMonths(anchor, n + 1) };
}
const workInput = z.object({
  customerId: z.uuid(),
  changeRequestId: z.uuid().optional(),
  kind: z.enum(['included_content', 'technical', 'extra_content']),
  minutes: z.number().int().min(1).max(1440),
  hourlyCostCents: z.number().int().min(0).max(1000000).nullable(),
  workedAt: z.date(),
  note: z.string().trim().min(3).max(300),
  extraApproved: z.boolean(),
  idempotencyKey: z.string().min(12).max(120),
});
export async function recordCareWork(raw: z.input<typeof workInput>, actor: string) {
  const input = workInput.parse(raw);
  if (!Number.isFinite(input.workedAt.getTime()) || input.workedAt > new Date())
    throw new Error('Nur tatsächlich geleistete Arbeit erfassen.');
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM customers WHERE id=${input.customerId} FOR UPDATE`);
    const previous = await tx.query.careWork.findFirst({ where: eq(careWork.idempotencyKey, input.idempotencyKey) });
    if (previous) {
      if (previous.customerId !== input.customerId) throw new Error('Buchungsreferenz gehört zu anderem Kunden.');
      return previous;
    }
    const customer = await tx.query.customers.findFirst({ where: eq(customers.id, input.customerId) });
    const order = customer ? await tx.query.orders.findFirst({ where: eq(orders.id, customer.orderId) }) : null;
    const site = customer ? await tx.query.sites.findFirst({ where: eq(sites.customerId, customer.id) }) : null;
    if (!customer || !order?.offerSnapshot || !site?.liveAt || input.workedAt < site.liveAt)
      throw new Error('Keine V4-Arbeit nach nachgewiesenem Go-Live.');
    if (input.changeRequestId) {
      const request = await tx.query.changeRequests.findFirst({ where: eq(changeRequests.id, input.changeRequestId) });
      if (!request || request.siteId !== site.id) throw new Error('Änderungswunsch gehört nicht zu diesem Kunden.');
    }
    const paid = await tx.query.orderPayments.findFirst({
      where: and(
        eq(orderPayments.orderId, order.id),
        lte(orderPayments.periodStart, input.workedAt),
        gt(orderPayments.periodEnd, input.workedAt),
      ),
      orderBy: desc(orderPayments.periodStart),
    });
    const anchor = order.billingStartedAt ?? paid?.periodStart;
    if (!anchor) throw new Error('Nachgewiesener Abrechnungsbeginn fehlt.');
    const period =
      paid?.periodStart && paid.periodEnd
        ? { start: paid.periodStart, end: paid.periodEnd }
        : billingPeriodV4(anchor, input.workedAt);
    const change = await tx.query.tariffChanges.findFirst({
      where: and(
        eq(tariffChanges.orderId, order.id),
        eq(tariffChanges.status, 'applied'),
        lte(tariffChanges.effectiveAt, input.workedAt),
      ),
      orderBy: desc(tariffChanges.effectiveAt),
    });
    const offer = change ? v4Offer(change.toTier) : order.offerSnapshot;
    const existing = await tx
      .select({ minutes: sql<number>`coalesce(sum(${careWork.minutes}),0)::int` })
      .from(careWork)
      .where(
        and(
          eq(careWork.customerId, customer.id),
          eq(careWork.kind, 'included_content'),
          eq(careWork.periodStart, period.start),
          isNull(careWork.voidedAt),
        ),
      );
    if (
      input.kind === 'included_content' &&
      (offer.tier !== 'care_plus' || Number(existing[0]!.minutes) + input.minutes > offer.includedChangeMinutes)
    )
      throw new Error('Inklusivkontingent überschritten. Zusatzarbeit getrennt und ausdrücklich freigeben.');
    if (input.kind === 'extra_content' && !input.extraApproved)
      throw new Error('Zusatzarbeit benötigt dokumentierte Kundenfreigabe.');
    const costCents = input.hourlyCostCents === null ? null : Math.round((input.minutes * input.hourlyCostCents) / 60);
    const [entry] = await tx
      .insert(careWork)
      .values({ ...input, periodStart: period.start, periodEnd: period.end, costCents, createdBy: actor })
      .returning();
    if (costCents !== null)
      await recordCost(tx, {
        category: 'other',
        amountCents: costCents,
        customerId: customer.id,
        leadId: customer.leadId,
        incurredAt: input.workedAt,
        idempotencyKey: `care:${entry!.id}`,
        ref: entry!.id,
        meta: { costKind: 'care_labor', workId: entry!.id },
      });
    await audit(tx, {
      entity: 'customer',
      entityId: customer.id,
      action: 'care_work_recorded',
      actor,
      context: { workId: entry!.id, minutes: entry!.minutes, priced: costCents !== null },
    });
    return entry!;
  });
}
export async function priceCareWork(id: string, hourlyCostCents: number, actor: string) {
  if (!Number.isInteger(hourlyCostCents) || hourlyCostCents < 0 || hourlyCostCents > 1000000)
    throw new Error('Ungültiger Kostensatz.');
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM care_work WHERE id=${id} FOR UPDATE`);
    const work = await tx.query.careWork.findFirst({ where: eq(careWork.id, id) });
    if (!work || work.voidedAt) throw new Error('Arbeit nicht gefunden oder storniert.');
    if (work.costCents !== null) throw new Error('Bereits bewertet; für Korrekturen erst stornieren.');
    const customer = (await tx.query.customers.findFirst({ where: eq(customers.id, work.customerId) }))!;
    const cents = Math.round((work.minutes * hourlyCostCents) / 60);
    await recordCost(tx, {
      category: 'other',
      amountCents: cents,
      customerId: customer.id,
      leadId: customer.leadId,
      incurredAt: work.workedAt,
      idempotencyKey: `care:${work.id}`,
      ref: work.id,
      meta: { costKind: 'care_labor', workId: work.id },
    });
    await tx.update(careWork).set({ hourlyCostCents, costCents: cents }).where(eq(careWork.id, id));
    await audit(tx, {
      entity: 'customer',
      entityId: customer.id,
      action: 'care_work_priced',
      actor,
      context: { workId: id, costCents: cents },
    });
  });
}
export async function voidCareWork(id: string, actor: string) {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM care_work WHERE id=${id} FOR UPDATE`);
    const work = await tx.query.careWork.findFirst({ where: eq(careWork.id, id) });
    if (!work || work.voidedAt) return;
    const customer = (await tx.query.customers.findFirst({ where: eq(customers.id, work.customerId) }))!;
    if (work.costCents !== null)
      await recordCost(tx, {
        category: 'other',
        amountCents: -work.costCents,
        customerId: customer.id,
        leadId: customer.leadId,
        incurredAt: work.workedAt,
        idempotencyKey: `care-void:${id}`,
        ref: id,
        meta: { costKind: 'care_labor', reversal: true },
      });
    await tx.update(careWork).set({ voidedAt: new Date() }).where(eq(careWork.id, id));
    await audit(tx, { entity: 'customer', entityId: customer.id, action: 'care_work_voided', actor, context: { workId: id } });
  });
}
export async function careOverview(customerId: string, now = new Date()) {
  const db = getDb();
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  const order = customer ? await db.query.orders.findFirst({ where: eq(orders.id, customer.orderId) }) : null;
  const rows = await db
    .select()
    .from(careWork)
    .where(eq(careWork.customerId, customerId))
    .orderBy(desc(careWork.workedAt))
    .limit(100);
  const recent = order
    ? await db.query.orderPayments.findFirst({
        where: and(eq(orderPayments.orderId, order.id), lte(orderPayments.periodStart, now), gt(orderPayments.periodEnd, now)),
        orderBy: desc(orderPayments.periodStart),
      })
    : null;
  const anchor = order?.billingStartedAt ?? recent?.periodStart;
  const period =
    recent?.periodStart && recent.periodEnd
      ? { start: recent.periodStart, end: recent.periodEnd }
      : anchor && anchor <= now
        ? billingPeriodV4(anchor, now)
        : null;
  const totals = period
    ? await db
        .select({ n: sql<number>`coalesce(sum(${careWork.minutes}),0)::int` })
        .from(careWork)
        .where(
          and(
            eq(careWork.customerId, customerId),
            eq(careWork.kind, 'included_content'),
            isNull(careWork.voidedAt),
            eq(careWork.periodStart, period.start),
          ),
        )
    : [];
  const limit = (order?.activeOfferSnapshot ?? order?.offerSnapshot)?.includedChangeMinutes ?? 0;
  return {
    rows,
    period,
    usedMinutes: Number(totals[0]?.n ?? 0),
    remainingMinutes: Math.max(0, limit - Number(totals[0]?.n ?? 0)),
    limit,
    checks: await db
      .select()
      .from(careChecks)
      .where(eq(careChecks.customerId, customerId))
      .orderBy(desc(careChecks.month))
      .limit(12),
  };
}

export async function runCareTechnicalCheck(customerId: string, now = new Date()) {
  const db = getDb();
  const cfg = await getConfig();
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  const order = customer ? await db.query.orders.findFirst({ where: eq(orders.id, customer.orderId) }) : null;
  const site = customer ? await db.query.sites.findFirst({ where: eq(sites.customerId, customer.id) }) : null;
  if (
    !order?.offerSnapshot ||
    !site?.liveAt ||
    site.status !== 'live' ||
    (order.activeOfferSnapshot ?? order.offerSnapshot).tier !== 'care_plus'
  )
    throw new Error('Kein aktiver Care+-Webauftritt.');
  const month = now.toISOString().slice(0, 7);
  const provider = getProviders().hosting;
  let checks: Record<string, boolean | string> = {};
  let simulated = false;
  if (provider.name === 'mock') {
    checks = { home: true, https: true, impressum: true, datenschutz: true, contactRoute: Boolean(site.formKey) };
    simulated = true;
  } else if (effectiveSwitches(cfg).dryRun) {
    checks = { blocked: 'DRY_RUN: keine externen Prüfabrufe ausgeführt' };
    simulated = true;
  } else {
    const url = new URL(site.productionUrl ?? '');
    if (url.protocol !== 'https:') throw new Error('Nur HTTPS-Webauftritte prüfen.');
    checks.https = true;
    for (const [label, path] of [
      ['home', ''],
      ['impressum', 'impressum.html'],
      ['datenschutz', 'datenschutz.html'],
    ] as const) {
      try {
        const response = await fetch(new URL(path, url), { redirect: 'error', signal: AbortSignal.timeout(15000) });
        checks[label] = response.ok;
        if (label === 'home') {
          const html = await response.text();
          checks.contactRoute = html.includes(`/api/forms/${site.formKey}`) || html.includes('mailto:') || html.includes('tel:');
        }
      } catch {
        checks[label] = false;
      }
    }
  }
  const passed = ['home', 'https', 'impressum', 'datenschutz', 'contactRoute'].every((k) => checks[k] === true);
  const [row] = await db
    .insert(careChecks)
    .values({ customerId, month, status: passed ? 'passed' : 'needs_review', checks, simulated, checkedAt: now })
    .onConflictDoUpdate({
      target: [careChecks.customerId, careChecks.month],
      set: {
        checks,
        simulated,
        checkedAt: now,
        status: passed ? 'passed' : 'needs_review',
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: null,
      },
    })
    .returning();
  await audit(db, {
    entity: 'customer',
    entityId: customerId,
    action: 'care_check_run',
    actor: 'job:care',
    context: { checkId: row!.id, passed, simulated },
  });
  return row!;
}
export async function reviewCareCheck(id: string, note: string, confirmed: boolean, actor: string) {
  const db = getDb();
  const row = await db.query.careChecks.findFirst({ where: eq(careChecks.id, id) });
  if (!row || row.status !== 'passed' || !confirmed || note.trim().length < 10)
    throw new Error('Bestandene technische Prüfung und dokumentierte manuelle Prüfung erforderlich.');
  if (row.simulated && process.env.NODE_ENV === 'production') throw new Error('Simulierter Check ist keine Produktionsabnahme.');
  await db
    .update(careChecks)
    .set({ status: 'reviewed', reviewedAt: new Date(), reviewedBy: actor, reviewNote: note.trim().slice(0, 1000) })
    .where(eq(careChecks.id, id));
  await audit(db, {
    entity: 'customer',
    entityId: row.customerId,
    action: 'care_check_reviewed',
    actor,
    context: { checkId: id, simulated: row.simulated },
  });
}
export async function sweepCareChecks(now = new Date()) {
  const db = getDb();
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .innerJoin(orders, eq(orders.id, customers.orderId))
    .innerJoin(sites, eq(sites.customerId, customers.id))
    .where(
      and(
        eq(sites.status, 'live'),
        isNull(orders.endedAt),
        eq(orders.subscriptionStatus, 'active'),
        sql`coalesce(${orders.activeOfferSnapshot},${orders.offerSnapshot})->>'tier'='care_plus'`,
      ),
    );
  let n = 0;
  for (const r of rows) {
    const existing = await db.query.careChecks.findFirst({
      where: and(eq(careChecks.customerId, r.id), eq(careChecks.month, now.toISOString().slice(0, 7))),
    });
    if (!existing) {
      await runCareTechnicalCheck(r.id, now);
      n++;
    }
  }
  return n;
}
