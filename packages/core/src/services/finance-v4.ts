import { sql } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
/** Paid snapshots only, not advertised prices, future installments or expected customer value. */
export async function realizedFinanceV4(db: DbOrTx = getDb()) {
  const result = await db.execute<{
    setup: string;
    monthly: string;
    refunds: string;
    mrr: string;
    buyers: string;
    care: string;
    v4buyers: string;
  }>(sql`
    WITH live_orders AS (SELECT * FROM orders WHERE provider='stripe' AND payment_mode='live'),
    live_payments AS (SELECT p.* FROM order_payments p JOIN live_orders o ON o.id=p.order_id)
    SELECT
      (SELECT coalesce(sum(amount_cents),0) FROM live_orders WHERE paid_at IS NOT NULL) AS setup,
      (SELECT coalesce(sum(amount_cents),0) FROM live_payments) AS monthly,
      ((SELECT coalesce(sum(refunded_cents),0) FROM live_orders)+(SELECT coalesce(sum(refunded_cents),0) FROM live_payments)) AS refunds,
      (SELECT coalesce(sum((coalesce(active_offer_snapshot,offer_snapshot)->>'monthlyCents')::int),0) FROM live_orders WHERE offer_snapshot IS NOT NULL AND subscription_status='active' AND ended_at IS NULL) AS mrr,
      (SELECT count(*) FROM live_orders WHERE paid_at IS NOT NULL) AS buyers,
      (SELECT count(*) FROM live_orders WHERE paid_at IS NOT NULL AND offer_snapshot->>'tier'='care_plus') AS care,
      (SELECT count(*) FROM live_orders WHERE paid_at IS NOT NULL AND offer_snapshot IS NOT NULL) AS v4buyers`);
  const r = result.rows[0]!;
  return {
    setupReceivedCents: Number(r.setup),
    monthlyReceivedCents: Number(r.monthly),
    refundsCents: Number(r.refunds),
    knownV4MrrCents: Number(r.mrr),
    buyers: Number(r.buyers),
    carePlusShare: Number(r.v4buyers) ? Number(r.care) / Number(r.v4buyers) : null,
    contributionCents: null,
    missingCostData: ['vollständige Hostingkosten', 'Domainkosten', 'Zahlungsgebühren', 'erfüllte Care+-Arbeitszeit'],
    scope: 'Nur nachweislicher Live-Zahlungsmodus, unabhängig vom Funnel-Zeitraumfilter',
  };
}
