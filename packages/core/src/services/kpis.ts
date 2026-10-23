import { sql, type SQL } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';

export interface KpiFilter {
  from: Date;
  to: Date;
  /** Stadt-Slug wie im Segment-Schlüssel (z. B. „dortmund“) */
  city?: string;
  branch?: string;
  variantId?: string;
}

export type KpiGroup = 'all' | 'segment' | 'variant' | 'week' | 'branch' | 'lead_segment';

export interface KpiRow {
  key: string;
  label: string;
  /** Leads mit Erstbrief im Zeitraum (Kohorte) */
  leads: number;
  letters: number;
  letterCostCents: number;
  scans: number;
  ctaClicks: number;
  checkouts: number;
  purchases: number;
  /** davon Option A (Einmalzahlung) bzw. Option B (monatlich) */
  purchasesOneTime: number;
  purchasesMonthly: number;
  /** Anteil Einmalzahlung an allen Käufen (Update 2, A6) */
  oneTimeShare: number | null;
  /** Einnahmen inkl. bereits bezahlter Monatsraten, abzüglich Erstattungen */
  revenueCents: number;
  scanRate: number | null;
  ctaRate: number | null;
  purchaseRate: number | null;
  costPerLetterCents: number | null;
}

export interface KpiSummary extends KpiRow {
  /** Akquisekosten im Zeitraum laut Budget-Ledger (Briefe, Places API, KI) */
  acquisitionCostCents: number;
  costsByCategory: Record<string, number>;
  cacCents: number | null;
  roi: number | null;
}

const rate = (a: number, b: number): number | null => (b > 0 ? a / b : null);

function cohortWhere(f: KpiFilter): SQL {
  const parts: SQL[] = [
    sql`l.sequence = 1`,
    sql`l.is_test = false`,
    sql`l.dry_run = false`,
    sql`l.sent_at IS NOT NULL`,
    sql`l.sent_at >= ${f.from}`,
    sql`l.sent_at < ${f.to}`,
  ];
  if (f.city) parts.push(sql`split_part(ld.segment_key, ':', 1) = ${f.city}`);
  if (f.branch) parts.push(sql`ld.branch = ${f.branch}`);
  if (f.variantId) parts.push(sql`l.variant_id = ${f.variantId}`);
  return sql.join(parts, sql` AND `);
}

function groupExpr(g: KpiGroup): SQL {
  switch (g) {
    case 'segment':
      return sql`c.segment_key`;
    case 'variant':
      return sql`coalesce(c.variant_id::text, 'ohne')`;
    case 'week':
      return sql`to_char(date_trunc('week', c.sent_at AT TIME ZONE 'Europe/Berlin'), 'IYYY-"KW"IW')`;
    case 'branch':
      return sql`c.branch`;
    case 'lead_segment':
      return sql`coalesce(c.lead_segment, 'ohne')`;
    default:
      return sql`'gesamt'`;
  }
}

type RawRow = {
  key: string;
  leads: number;
  letters: number;
  letter_cost: number;
  scans: number;
  ctas: number;
  checkouts: number;
  purchases: number;
  purchases_monthly: number;
  revenue: number;
};

/** Funnel je Gruppe für die Kohorte „Erstbrief versendet im Zeitraum“. */
export async function kpiRows(f: KpiFilter, group: KpiGroup, db: DbOrTx = getDb()): Promise<KpiRow[]> {
  const res = await db.execute<RawRow>(sql`
    WITH cohort AS (
      SELECT l.lead_id, l.variant_id, l.sent_at, ld.segment_key, ld.branch, ld.lead_segment
      FROM letters l JOIN leads ld ON ld.id = l.lead_id
      WHERE ${cohortWhere(f)}
    ),
    ev AS (
      SELECT e.lead_id,
        bool_or(e.type = 'scan') AS scanned,
        bool_or(e.type = 'cta_click') AS cta,
        bool_or(e.type = 'checkout_started') AS checkout
      FROM events e WHERE e.lead_id IN (SELECT lead_id FROM cohort) GROUP BY e.lead_id
    ),
    ord AS (
      SELECT o.lead_id,
        sum(o.amount_cents - o.refunded_cents
          + coalesce((SELECT sum(p.amount_cents - p.refunded_cents) FROM order_payments p WHERE p.order_id = o.id), 0)) AS revenue,
        bool_or(o.plan = 'monthly') AS monthly
      FROM orders o WHERE o.status IN ('paid', 'refunded') AND o.lead_id IN (SELECT lead_id FROM cohort) GROUP BY o.lead_id
    ),
    lc AS (
      SELECT l.lead_id, count(*) AS n, sum(coalesce(l.cost_cents, l.estimated_cost_cents, 0)) AS cost
      FROM letters l WHERE l.is_test = false AND l.dry_run = false AND l.sent_at IS NOT NULL AND l.lead_id IN (SELECT lead_id FROM cohort)
      GROUP BY l.lead_id
    )
    SELECT ${groupExpr(group)} AS key,
      count(*)::int AS leads,
      coalesce(sum(lc.n), 0)::int AS letters,
      coalesce(sum(lc.cost), 0)::int AS letter_cost,
      (count(*) FILTER (WHERE ev.scanned))::int AS scans,
      (count(*) FILTER (WHERE ev.cta))::int AS ctas,
      (count(*) FILTER (WHERE ev.checkout))::int AS checkouts,
      count(ord.lead_id)::int AS purchases,
      (count(ord.lead_id) FILTER (WHERE ord.monthly))::int AS purchases_monthly,
      coalesce(sum(ord.revenue), 0)::int AS revenue
    FROM cohort c
    LEFT JOIN ev ON ev.lead_id = c.lead_id
    LEFT JOIN ord ON ord.lead_id = c.lead_id
    LEFT JOIN lc ON lc.lead_id = c.lead_id
    GROUP BY 1 ORDER BY 1
  `);
  const variantNames = group === 'variant' ? await variantLabels(db) : new Map<string, string>();
  return res.rows.map((r) => ({
    key: r.key,
    label: group === 'variant' ? (variantNames.get(r.key) ?? r.key) : r.key,
    leads: r.leads,
    letters: r.letters,
    letterCostCents: r.letter_cost,
    scans: r.scans,
    ctaClicks: r.ctas,
    checkouts: r.checkouts,
    purchases: r.purchases,
    purchasesOneTime: r.purchases - r.purchases_monthly,
    purchasesMonthly: r.purchases_monthly,
    oneTimeShare: rate(r.purchases - r.purchases_monthly, r.purchases),
    revenueCents: r.revenue,
    scanRate: rate(r.scans, r.leads),
    ctaRate: rate(r.ctas, r.leads),
    purchaseRate: rate(r.purchases, r.leads),
    costPerLetterCents: r.letters ? Math.round(r.letter_cost / r.letters) : null,
  }));
}

async function variantLabels(db: DbOrTx): Promise<Map<string, string>> {
  const res = await db.execute<{ id: string; name: string }>(sql`SELECT id::text AS id, name FROM variants`);
  return new Map(res.rows.map((r) => [r.id, r.name]));
}

/** Kosten laut Ledger im Zeitraum je Kategorie (Cent, inkl. Mikro-Cent-Anteile). */
export async function costsByCategory(from: Date, to: Date, db: DbOrTx = getDb()): Promise<Record<string, number>> {
  const res = await db.execute<{ category: string; cents: number }>(sql`
    SELECT category, round(sum(amount_cents + amount_micro_cents / 1000000.0))::int AS cents
    FROM budget_ledger WHERE created_at >= ${from} AND created_at < ${to} GROUP BY category
  `);
  return Object.fromEntries(res.rows.map((r) => [r.category, r.cents]));
}

export async function kpiSummary(f: KpiFilter, db: DbOrTx = getDb()): Promise<KpiSummary> {
  const [all] = await kpiRows(f, 'all', db);
  const base: KpiRow = all ?? {
    key: 'gesamt',
    label: 'gesamt',
    leads: 0,
    letters: 0,
    letterCostCents: 0,
    scans: 0,
    ctaClicks: 0,
    checkouts: 0,
    purchases: 0,
    purchasesOneTime: 0,
    purchasesMonthly: 0,
    oneTimeShare: null,
    revenueCents: 0,
    scanRate: null,
    ctaRate: null,
    purchaseRate: null,
    costPerLetterCents: null,
  };
  const costs = await costsByCategory(f.from, f.to, db);
  // Bei Filtern nach Stadt/Branche/Variante nur die zuordenbaren Briefkosten, sonst alle Akquisekosten
  const filtered = Boolean(f.city || f.branch || f.variantId);
  const acquisition = filtered ? base.letterCostCents : (costs.letter ?? 0) + (costs.places_api ?? 0) + (costs.llm ?? 0);
  return {
    ...base,
    acquisitionCostCents: acquisition,
    costsByCategory: costs,
    cacCents: base.purchases ? Math.round(acquisition / base.purchases) : null,
    roi: acquisition > 0 ? (base.revenueCents - acquisition) / acquisition : null,
  };
}

/** Werte für die Filter-Auswahl im Dashboard. */
export async function kpiFilterOptions(
  db: DbOrTx = getDb(),
): Promise<{ cities: string[]; branches: string[]; variants: { id: string; name: string }[] }> {
  const seg = await db.execute<{ city: string; branch: string }>(
    sql`SELECT DISTINCT split_part(segment_key, ':', 1) AS city, branch FROM leads`,
  );
  const vars = await db.execute<{ id: string; name: string }>(
    sql`SELECT id::text AS id, name FROM variants WHERE kind = 'letter' ORDER BY sequence, name`,
  );
  return {
    cities: [...new Set(seg.rows.map((r) => r.city))].sort(),
    branches: [...new Set(seg.rows.map((r) => r.branch))].sort(),
    variants: vars.rows,
  };
}
