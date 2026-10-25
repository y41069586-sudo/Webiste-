import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client';
import { careWork, customers, orders, orderPayments } from '../db/schema';
import { getSetting, setSetting } from '../config/service';
import { sha256 } from '../util/crypto';
import { audit } from './audit';
import { recordCost } from './budget';

export function financeRange(from?: string, to?: string) {
  const now = new Date();
  const a = from ?? `${now.toISOString().slice(0, 7)}-01`;
  const b = to ?? now.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) throw new Error('Ungültiger Zeitraum.');
  const start = new Date(`${a}T00:00:00Z`),
    inclusiveEnd = new Date(`${b}T00:00:00Z`);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(inclusiveEnd.getTime()) ||
    start.toISOString().slice(0, 10) !== a ||
    inclusiveEnd.toISOString().slice(0, 10) !== b ||
    start > inclusiveEnd
  )
    throw new Error('Ungültiger Zeitraum.');
  const end = new Date(inclusiveEnd.getTime() + 86400000);
  return { from: a, to: b, start, end, key: `finance:coverage:${a}:${b}` };
}
const costInput = z.object({
  kind: z.enum(['hosting', 'domain', 'payment_fee', 'other', 'letter']),
  amountCents: z.number().int().min(-100000000).max(100000000),
  customerId: z.uuid().optional(),
  leadId: z.uuid().optional(),
  incurredAt: z.date(),
  reference: z.string().trim().min(3).max(160),
  idempotencyKey: z.string().min(12).max(120),
});
export async function recordOperatingCost(raw: z.input<typeof costInput>, actor: string) {
  const i = costInput.parse(raw);
  if (!Number.isFinite(i.incurredAt.getTime()) || i.incurredAt > new Date())
    throw new Error('Kostenzeitpunkt liegt in der Zukunft.');
  const db = getDb();
  const c = i.customerId ? await db.query.customers.findFirst({ where: eq(customers.id, i.customerId) }) : null;
  if (i.customerId && !c) throw new Error('Kunde nicht gefunden.');
  if (i.leadId && c?.leadId && i.leadId !== c.leadId) throw new Error('Kunde und Lead passen nicht zusammen.');
  await db.transaction(async (tx) => {
    await recordCost(tx, {
      category: i.kind === 'payment_fee' ? 'other' : i.kind,
      amountCents: i.amountCents,
      customerId: c?.id,
      leadId: c?.leadId ?? i.leadId,
      incurredAt: i.incurredAt,
      ref: i.reference,
      idempotencyKey: i.idempotencyKey,
      meta: { costKind: i.kind, source: 'manual_actual' },
    });
    await audit(tx, {
      entity: 'finance',
      entityId: i.idempotencyKey,
      action: 'actual_cost_recorded',
      actor,
      context: { category: i.kind, amountCents: i.amountCents },
    });
  });
}
interface Money {
  orderId: string;
  leadId: string | null;
  gross: number;
  net: number;
  refund: number;
  kind: 'setup' | 'monthly';
}
export async function financeReportV4(from?: string, to?: string) {
  const range = financeRange(from, to),
    db = getDb();
  const [initial, recurring, costs, work, arms, deliveries, mrr, reconciliation] = await Promise.all([
    db
      .select({
        id: orders.id,
        leadId: orders.leadId,
        amount: orders.amountCents,
        net: orders.netCents,
        refunded: orders.refundedCents,
        tier: sql<string>`${orders.offerSnapshot}->>'tier'`,
      })
      .from(orders)
      .where(and(gte(orders.paidAt, range.start), lt(orders.paidAt, range.end))),
    db
      .select({
        id: orderPayments.id,
        orderId: orders.id,
        leadId: orders.leadId,
        amount: orderPayments.amountCents,
        net: orderPayments.netCents,
        refunded: orderPayments.refundedCents,
      })
      .from(orderPayments)
      .innerJoin(orders, eq(orders.id, orderPayments.orderId))
      .where(and(gte(orderPayments.paidAt, range.start), lt(orderPayments.paidAt, range.end))),
    db.execute<{ id: string; lead_id: string | null; amount: number; micro: number; estimated: boolean; kind: string }>(
      sql`SELECT b.id,coalesce(b.lead_id,c.lead_id)::text AS lead_id,b.amount_cents AS amount,b.amount_micro_cents AS micro,b.estimated,coalesce(b.meta->>'costKind',b.category) AS kind FROM budget_ledger b LEFT JOIN customers c ON c.id=b.customer_id WHERE coalesce(b.incurred_at,b.created_at)>=${range.start.toISOString()}::timestamptz AND coalesce(b.incurred_at,b.created_at)<${range.end.toISOString()}::timestamptz ORDER BY b.id`,
    ),
    db
      .select({ id: careWork.id, minutes: careWork.minutes, cost: careWork.costCents })
      .from(careWork)
      .where(and(gte(careWork.workedAt, range.start), lt(careWork.workedAt, range.end), sql`${careWork.voidedAt} IS NULL`)),
    db.execute<{ lead_id: string; variant: string; industry: string }>(
      sql`SELECT DISTINCT ON(l.lead_id) l.lead_id::text,coalesce(v.name,'Ohne Variante') AS variant,coalesce(l.industry,ld.industry,ld.branch_group) AS industry FROM letters l JOIN leads ld ON ld.id=l.lead_id LEFT JOIN variants v ON v.id=l.variant_id WHERE l.sequence=1 AND NOT l.is_test AND l.sent_at IS NOT NULL ORDER BY l.lead_id,l.sent_at,l.id`,
    ),
    db.execute<{ lead_id: string; n: number }>(
      sql`SELECT lead_id::text,count(*)::int AS n FROM letters WHERE NOT is_test AND NOT undeliverable AND coalesce(delivered_at,estimated_delivered_at)>=${range.start.toISOString()}::timestamptz AND coalesce(delivered_at,estimated_delivered_at)<${range.end.toISOString()}::timestamptz GROUP BY lead_id`,
    ),
    db.execute<{ amount: string }>(
      sql`SELECT coalesce(sum((coalesce(active_offer_snapshot,offer_snapshot)->>'monthlyCents')::int),0)::text AS amount FROM orders WHERE offer_snapshot IS NOT NULL AND subscription_status='active' AND ended_at IS NULL`,
    ),
    db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM alerts WHERE acknowledged_at IS NULL AND code LIKE 'refund_reconciliation_%'`,
    ),
  ]);
  const money: Money[] = [
    ...initial.map((x) => ({
      orderId: x.id,
      leadId: x.leadId,
      gross: x.amount,
      net: x.net,
      refund: x.refunded,
      kind: 'setup' as const,
    })),
    ...recurring.map((x) => ({
      orderId: x.orderId,
      leadId: x.leadId,
      gross: x.amount,
      net: x.net,
      refund: x.refunded,
      kind: 'monthly' as const,
    })),
  ];
  const actualCosts = costs.rows.filter((x) => !x.estimated);
  const unpriced = work.filter((x) => x.cost === null).length;
  const estimated = costs.rows.filter((x) => x.estimated).length;
  const fingerprint = sha256(
    JSON.stringify({
      initial: initial.sort((a, b) => a.id.localeCompare(b.id)),
      recurring: recurring.sort((a, b) => a.id.localeCompare(b.id)),
      costs: costs.rows,
      work: work.sort((a, b) => a.id.localeCompare(b.id)),
    }),
  );
  const review = await getSetting<{ fingerprint: string; at: string; actor: string } | null>(range.key, null);
  const reconciliationPending = Number(reconciliation.rows[0]?.n ?? 0);
  const reviewed = review?.fingerprint === fingerprint && unpriced === 0 && estimated === 0 && reconciliationPending === 0;
  const costCents = (c: (typeof actualCosts)[number]) => Number(c.amount) + Number(c.micro) / 1e6;
  const refundNet = (m: Money) => Math.round(m.refund * (m.gross ? m.net / m.gross : 0));
  const totalCost = Math.round(actualCosts.reduce((s, x) => s + costCents(x), 0));
  const received = money.reduce((s, x) => s + x.gross - x.refund, 0);
  const netReceived = money.reduce((s, x) => s + x.net - refundNet(x), 0);
  const armByLead = new Map(arms.rows.map((x) => [x.lead_id, `${x.industry} · ${x.variant}`]));
  const groups = new Map<
    string,
    { key: string; cashCents: number; netCents: number; costCents: number; letters: number; buyers: Set<string> }
  >();
  const arm = (lead: string | null) => {
    const key = lead ? (armByLead.get(lead) ?? 'Nicht zugeordnet') : 'Nicht zugeordnet';
    let g = groups.get(key);
    if (!g) {
      g = { key, cashCents: 0, netCents: 0, costCents: 0, letters: 0, buyers: new Set() };
      groups.set(key, g);
    }
    return g;
  };
  for (const m of money) {
    const g = arm(m.leadId);
    g.cashCents += m.gross - m.refund;
    g.netCents += m.net - refundNet(m);
    g.buyers.add(m.orderId);
  }
  for (const c of actualCosts) arm(c.lead_id).costCents += costCents(c);
  for (const l of deliveries.rows) arm(l.lead_id).letters += Number(l.n);
  const unallocatedCost = groups.get('Nicht zugeordnet')?.costCents ?? 0;
  const contribution = reviewed ? netReceived - totalCost : null;
  const buyers = new Set(money.map((x) => x.orderId)).size;
  const delivered = deliveries.rows.reduce((s, x) => s + Number(x.n), 0);
  return {
    range,
    fingerprint,
    review,
    reviewed,
    reconciliationPending,
    unpricedWork: unpriced,
    estimatedCosts: estimated,
    setupReceivedCents: initial.reduce((s, x) => s + x.amount, 0),
    monthlyReceivedCents: recurring.reduce((s, x) => s + x.amount, 0),
    refundsCents: money.reduce((s, x) => s + x.refund, 0),
    receivedCents: received,
    netReceivedCents: netReceived,
    actualCostCents: totalCost,
    knownV4MrrCents: Number(mrr.rows[0]!.amount),
    buyers,
    deliveredLetters: delivered,
    averageSetupCents: initial.length ? initial.reduce((s, x) => s + x.amount, 0) / initial.length : null,
    carePlusShare: initial.filter((x) => x.tier).length
      ? initial.filter((x) => x.tier === 'care_plus').length / initial.filter((x) => x.tier).length
      : null,
    refundRate: money.length ? money.filter((x) => x.refund > 0).length / money.length : null,
    careMinutes: work.reduce((s, x) => s + x.minutes, 0),
    contributionCents: contribution,
    perBuyerCents: contribution !== null && buyers ? contribution / buyers : null,
    perLetterCents: contribution !== null && delivered ? contribution / delivered : null,
    arms: [...groups.values()].map((g) => ({
      key: g.key,
      cashCents: g.cashCents,
      costCents: Math.round(g.costCents),
      letters: g.letters,
      buyers: g.buyers.size,
      contributionCents: reviewed && !unallocatedCost ? g.netCents - Math.round(g.costCents) : null,
    })),
    costs: costs.rows,
    coverageInvalidated: Boolean(review && !reviewed),
  };
}
export async function confirmFinanceCoverage(from: string, to: string, confirmed: boolean, actor: string) {
  if (!confirmed) throw new Error('Vollständigkeit aller tatsächlichen Kosten ausdrücklich bestätigen.');
  const report = await financeReportV4(from, to);
  if (report.reconciliationPending) throw new Error('Offene Erstattungszuordnungen zuerst klären.');
  if (report.unpricedWork || report.estimatedCosts) throw new Error('Unbewertete Arbeit oder geschätzte Kosten zuerst klären.');
  await setSetting(report.range.key, { fingerprint: report.fingerprint, at: new Date().toISOString(), actor }, actor);
}
