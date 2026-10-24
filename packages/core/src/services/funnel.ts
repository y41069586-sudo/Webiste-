import { sql } from 'drizzle-orm';
import { getEnv } from '../config/env';
import { getConfig } from '../config/service';
import type { AppConfig } from '../config/settings';
import { getDb, type DbOrTx } from '../db/client';
import { logger } from '../logger';

/**
 * Funnel-Sicht (Update 2, B6.1/B6.2/B7). Grundlage sind die materialisierten Sichten `letter_outcomes`
 * (je Erstbrief) und `funnel_by_arm` (Branche × Variante × Segment × Woche). Das Auswertungsfenster der
 * Sicht beträgt 45 Tage nach (geschätzter) Zustellung – der Standard aus B6.2.
 */
export const FUNNEL_WINDOW_DAYS = 45;

export const FUNNEL_METRICS = [
  'letters',
  'delivered',
  'evaluated',
  'undeliverable',
  'scans',
  'demo_views',
  'engaged',
  'cta_clicks',
  'whatsapp',
  'questions',
  'checkouts',
  'abandoned',
  'purchases',
  'purchases_evaluated',
  'purchases_one_time',
  'purchases_monthly',
  'opt_outs',
  'complaints',
  'cost_cents',
] as const;
export type FunnelMetric = (typeof FUNNEL_METRICS)[number];

export type FunnelDimension = 'industry' | 'variant' | 'segment' | 'week';

export interface FunnelRow extends Record<FunnelMetric, number> {
  key: string;
  industry?: string;
  variant?: string;
  variantName?: string;
  segment?: string;
  week?: string;
  /** Umsatzwert der Käufe (B6.2: Monatsplan mit Mindestlaufzeit + erwartete Folgemonate) */
  revenueCents: number;
}

export interface FunnelFilter {
  from?: Date;
  to?: Date;
  industry?: string;
  variant?: string;
  segment?: string;
  groupBy?: FunnelDimension[];
}

/** Sichten auffrischen (Job alle 30 Minuten und Button im Dashboard). Gleichzeitiges Lesen bleibt möglich. */
export async function refreshFunnel(db: DbOrTx = getDb()): Promise<void> {
  if (getEnv().EVALUATION_WINDOW_DAYS !== FUNNEL_WINDOW_DAYS) {
    logger.warn(
      { env: getEnv().EVALUATION_WINDOW_DAYS, view: FUNNEL_WINDOW_DAYS },
      'EVALUATION_WINDOW_DAYS weicht vom Fenster der Funnel-Sicht ab (45 Tage) – Sicht nutzt 45',
    );
  }
  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY letter_outcomes`);
  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY funnel_by_arm`);
}

/** Umsatzwert eines Kaufs (B6.2): einmalig = Paketpreis; monatlich = Mindestlaufzeit × Rate + erwartete Pflegemonate. */
export function purchaseValueCents(cfg: AppConfig, plan: 'one_time' | 'monthly'): number {
  const p = cfg.pricing;
  if (plan === 'one_time') return p.packageCents;
  const follow = cfg.metrics.expectedFollowMonths * p.subscriptionCents * (1 - cfg.metrics.expectedChurnRate);
  return Math.round(p.minTermMonths * p.monthlyCents + follow);
}

const DIM_SQL: Record<FunnelDimension, string> = {
  industry: 'industry',
  variant: 'variant_key',
  segment: 'segment',
  week: 'to_char(week, \'IYYY-"KW"IW\')',
};

export async function funnelRows(filter: FunnelFilter = {}, db: DbOrTx = getDb()): Promise<FunnelRow[]> {
  const cfg = await getConfig();
  const dims = filter.groupBy ?? [];
  // Spaltenausdrücke nur aus der festen Liste; alle Filterwerte als Parameter
  const dimCols = dims.map((d) => sql.raw(`${DIM_SQL[d]} AS ${d}`));
  const sums = FUNNEL_METRICS.map((m) => sql.raw(`coalesce(sum(${m}), 0)::int AS ${m}`));
  const conds = [sql`true`];
  if (filter.from) conds.push(sql`week >= date_trunc('week', ${filter.from.toISOString()}::timestamptz)`);
  if (filter.to) conds.push(sql`week <= ${filter.to.toISOString()}::timestamptz`);
  if (filter.industry) conds.push(sql`industry = ${filter.industry}`);
  if (filter.variant) conds.push(sql`variant_key = ${filter.variant}`);
  if (filter.segment) conds.push(sql`segment = ${filter.segment}`);
  const groupCols = dims.map((d) => sql.raw(DIM_SQL[d]));
  const query = sql`SELECT ${sql.join([...dimCols, ...sums], sql`, `)} FROM funnel_by_arm WHERE ${sql.join(conds, sql` AND `)}${
    dims.length ? sql` GROUP BY ${sql.join(groupCols, sql`, `)} ORDER BY ${sql.join(groupCols, sql`, `)}` : sql``
  }`;
  const res = await db.execute<Record<string, unknown>>(query);
  const names = dims.includes('variant') ? await variantNames(db) : new Map<string, string>();
  return res.rows.map((r) => {
    const row = Object.fromEntries(FUNNEL_METRICS.map((m) => [m, Number(r[m] ?? 0)])) as Record<FunnelMetric, number>;
    const variant = r.variant !== undefined ? String(r.variant) : undefined;
    return {
      ...row,
      key: dims.map((d) => String(r[d] ?? '–')).join(' · ') || 'gesamt',
      industry: r.industry !== undefined ? String(r.industry) : undefined,
      variant,
      variantName: variant ? (names.get(variant) ?? (variant === 'ohne' ? 'ohne Variante' : variant)) : undefined,
      segment: r.segment !== undefined ? String(r.segment) : undefined,
      week: r.week !== undefined ? String(r.week) : undefined,
      revenueCents:
        row.purchases_one_time * purchaseValueCents(cfg, 'one_time') + row.purchases_monthly * purchaseValueCents(cfg, 'monthly'),
    };
  });
}

async function variantNames(db: DbOrTx): Promise<Map<string, string>> {
  const rows = await db.execute<{ id: string; name: string }>(sql`SELECT id::text AS id, name FROM variants`);
  return new Map(rows.rows.map((r) => [r.id, r.name]));
}

/** Gesamtsicht mit Stufen (für die Funnel-Grafik): Anteil je Stufe und Absprung zur Vorstufe. */
export function funnelStages(t: FunnelRow): { label: string; count: number; ofPrevious: number | null }[] {
  const stages: [string, number][] = [
    ['Zugestellt', t.delivered],
    ['Scan / Kurz-URL', t.scans],
    ['Demo angesehen', t.demo_views],
    ['„Seite übernehmen“', t.cta_clicks],
    ['Checkout gestartet', t.checkouts],
    ['Kauf', t.purchases],
  ];
  return stages.map(([label, count], i) => ({
    label,
    count,
    ofPrevious: i === 0 ? null : stages[i - 1]![1] > 0 ? count / stages[i - 1]![1] : null,
  }));
}
