import { and, eq, sql } from 'drizzle-orm';
import { appUrl, getEnv } from '../config/env';
import { getConfig, updateConfig } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';
import { safetyActions, variants } from '../db/schema';
import { formatEuro } from '../util/time';
import { audit } from './audit';
import { raiseAlert } from './budget';
import { notifyAdmin } from './email';

/**
 * Sicherheitsnetze (Update 2, B6.7). Laufen nach jedem Auffrischen der Funnel-Sicht (alle 30 Minuten).
 * Jeder Auslöser wirkt genau einmal (Schlüssel in `safety_actions`); wird eine pausierte Variante wieder
 * aktiviert, löst erst ein neuer Opt-out oder eine neue Beschwerde die Bremse erneut aus.
 */

export const OPT_OUT_LIMIT = 0.05;
/** Ein einzelner Opt-out ist Rauschen; ab dem zweiten zählt die Rate */
export const OPT_OUT_MIN_COUNT = 2;
export const UNDELIVERABLE_LIMIT = 0.03;
export const COST_WEEKS_IN_A_ROW = 4;
/** Gleitendes Fenster der Kosten pro Kauf (ausgewertete Versandwochen) */
export const COST_TRAILING_WEEKS = 12;

/** Beschwerde mit Vorwurf „Abzocke“/„Täuschung“ (B6.7) – Erkennung im Support-Agent, nur das Ergebnis wird gespeichert. */
export const DECEPTION_RE = /abzock|t[äa]usch|betr[uü]g|unseri[öo]s|abo-?falle|masche|\bfake\b|nepp|schwindel/i;

export interface SafetyAction {
  kind: 'opt_out' | 'complaint' | 'undeliverable' | 'cost';
  key: string;
  action: string;
  context: Record<string, unknown>;
}

/** Einmalig protokollieren; false, wenn der Auslöser schon behandelt wurde. */
async function claim(db: DbOrTx, a: SafetyAction): Promise<boolean> {
  const res = await db
    .insert(safetyActions)
    .values({ kind: a.kind, key: a.key, action: a.action, context: a.context })
    .onConflictDoNothing({ target: safetyActions.key })
    .returning({ id: safetyActions.id });
  return res.length > 0;
}

async function pauseVariant(db: DbOrTx, variantId: string, reason: string): Promise<boolean> {
  const res = await db
    .update(variants)
    .set({ status: 'paused' })
    .where(and(eq(variants.id, variantId), eq(variants.status, 'active')))
    .returning({ id: variants.id });
  if (res.length)
    await audit(db, { entity: 'variant', entityId: variantId, action: 'paused', actor: 'safety-net', context: { reason } });
  return res.length > 0;
}

/** Opt-out-Bremse: Opt-out-Rate einer Variante über 5 % der Scans (ab 2 Opt-outs) → pausieren. */
async function optOutBrake(db: DbOrTx): Promise<SafetyAction[]> {
  const rows = await db.execute<{ variant_key: string; name: string | null; scans: number; opt_outs: number }>(sql`
    SELECT o.variant_key, v.name,
      count(*) FILTER (WHERE o.first_scan_at IS NOT NULL)::int AS scans,
      count(*) FILTER (WHERE o.opt_out_at IS NOT NULL)::int AS opt_outs
    FROM letter_outcomes o LEFT JOIN variants v ON v.id::text = o.variant_key
    WHERE o.variant_key <> 'ohne'
    GROUP BY o.variant_key, v.name`);
  const out: SafetyAction[] = [];
  for (const r of rows.rows) {
    const rate = r.scans > 0 ? r.opt_outs / r.scans : Infinity;
    if (r.opt_outs < OPT_OUT_MIN_COUNT || rate <= OPT_OUT_LIMIT) continue;
    const a: SafetyAction = {
      kind: 'opt_out',
      key: `opt_out:${r.variant_key}:${r.opt_outs}`,
      action: 'variant_paused',
      context: { variantId: r.variant_key, variant: r.name, scans: r.scans, optOuts: r.opt_outs },
    };
    if (!(await claim(db, a))) continue;
    const paused = await pauseVariant(db, r.variant_key, 'Opt-out-Bremse');
    out.push({ ...a, action: paused ? 'variant_paused' : 'already_paused' });
  }
  return out;
}

/** Beschwerde wegen „Abzocke“/„Täuschung“ → Variante des Erstbriefs sofort pausieren. */
async function complaintBrake(db: DbOrTx): Promise<SafetyAction[]> {
  const rows = await db.execute<{ event_id: string; variant_id: string | null; name: string | null }>(sql`
    SELECT e.id::text AS event_id, l.variant_id::text AS variant_id, v.name
    FROM events e
    JOIN letters l ON l.lead_id = e.lead_id AND l.sequence = 1 AND NOT l.is_test
    LEFT JOIN variants v ON v.id = l.variant_id
    WHERE e.type = 'complaint' AND (e.meta_json->>'deception')::boolean IS TRUE
      AND e.created_at > now() - interval '60 days'`);
  const out: SafetyAction[] = [];
  for (const r of rows.rows) {
    if (!r.variant_id) continue;
    const a: SafetyAction = {
      kind: 'complaint',
      key: `complaint:${r.event_id}`,
      action: 'variant_paused',
      context: { variantId: r.variant_id, variant: r.name },
    };
    if (!(await claim(db, a))) continue;
    const paused = await pauseVariant(db, r.variant_id, 'Beschwerde „Abzocke/Täuschung“');
    out.push({ ...a, action: paused ? 'variant_paused' : 'already_paused' });
  }
  return out;
}

/** Unzustellbar-Bremse: mehr als 3 % Rückläufer in einer Charge (Versandwoche) → Versand pausieren. */
async function undeliverableBrake(db: DbOrTx): Promise<SafetyAction[]> {
  const rows = await db.execute<{ week: string; letters: number; undeliverable: number }>(sql`
    SELECT to_char(week, 'IYYY-"KW"IW') AS week, count(*)::int AS letters, count(*) FILTER (WHERE undeliverable)::int AS undeliverable
    FROM letter_outcomes WHERE week > now() - interval '12 weeks'
    GROUP BY week ORDER BY week`);
  const out: SafetyAction[] = [];
  for (const r of rows.rows) {
    if (!r.letters || r.undeliverable / r.letters <= UNDELIVERABLE_LIMIT) continue;
    const a: SafetyAction = {
      kind: 'undeliverable',
      key: `undeliverable:${r.week}:${r.undeliverable}`,
      action: 'sending_paused',
      context: { week: r.week, letters: r.letters, undeliverable: r.undeliverable },
    };
    if (!(await claim(db, a))) continue;
    await updateConfig({ switches: { sendingPaused: true } }, 'safety-net');
    out.push(a);
  }
  return out;
}

export interface CostWeek {
  week: string;
  costCents: number;
  purchases: number;
  /** Kosten pro Kauf im gleitenden Fenster bis zu dieser Woche (null = noch kein Kauf) */
  trailingCacCents: number | null;
  over: boolean;
}

/**
 * Kosten pro Kauf je ausgewerteter Versandwoche (Auswertungsfenster aller Briefe der Woche abgelaufen),
 * jeweils über die letzten 12 ausgewerteten Wochen. Ohne Kauf gilt „über der Grenze“, sobald die Kosten
 * allein die Grenze übersteigen (die Kosten pro Kauf können dann nur noch höher liegen).
 */
export async function costWeeks(db: DbOrTx = getDb(), maxCac = getEnv().MAX_CAC_CENTS): Promise<CostWeek[]> {
  const rows = await db.execute<{ week: string; cost: number; purchases: number }>(sql`
    SELECT to_char(week, 'IYYY-"KW"IW') AS week, sum(cost_cents)::int AS cost,
      count(*) FILTER (WHERE paid_at < delivered_at + interval '45 days')::int AS purchases
    FROM letter_outcomes
    GROUP BY week
    HAVING max(delivered_at) + interval '45 days' <= now()
    ORDER BY week`);
  return rows.rows.map((r, i, all) => {
    const window = all.slice(Math.max(0, i - COST_TRAILING_WEEKS + 1), i + 1);
    const cost = window.reduce((s, x) => s + Number(x.cost), 0);
    const buys = window.reduce((s, x) => s + Number(x.purchases), 0);
    const cac = buys > 0 ? Math.round(cost / buys) : null;
    return {
      week: r.week,
      costCents: Number(r.cost),
      purchases: Number(r.purchases),
      trailingCacCents: cac,
      over: cac !== null ? cac > maxCac : cost > maxCac,
    };
  });
}

/** Kostenbremse: 4 ausgewertete Wochen in Folge über `MAX_CAC_CENTS` → Wochenbudget halbieren, Bericht. */
async function costBrake(db: DbOrTx): Promise<SafetyAction[]> {
  const maxCac = getEnv().MAX_CAC_CENTS;
  const weeks = await costWeeks(db, maxCac);
  if (weeks.length < COST_WEEKS_IN_A_ROW) return [];
  const last = weeks.slice(-COST_WEEKS_IN_A_ROW);
  if (!last.every((w) => w.over)) return [];
  // Nach einer Halbierung zählen erst 4 neue Wochen
  const prev = await db.execute<{ last_week: string }>(
    sql`SELECT context->>'lastWeek' AS last_week FROM safety_actions WHERE kind = 'cost' ORDER BY created_at DESC LIMIT 1`,
  );
  const lastActed = prev.rows[0]?.last_week;
  if (lastActed && last.some((w) => w.week <= lastActed)) return [];
  const cfg = await getConfig({ fresh: true });
  const before = cfg.budget.weeklyBudgetCents;
  const after = Math.floor(before / 2);
  const a: SafetyAction = {
    kind: 'cost',
    key: `cost:${last.at(-1)!.week}`,
    action: 'budget_halved',
    context: { lastWeek: last.at(-1)!.week, weeks: last, beforeCents: before, afterCents: after, maxCacCents: maxCac },
  };
  if (!(await claim(db, a))) return [];
  await updateConfig({ budget: { weeklyBudgetCents: after } }, 'safety-net');
  return [a];
}

const MESSAGES: Record<SafetyAction['kind'], (a: SafetyAction) => { title: string; lines: string[] }> = {
  opt_out: (a) => ({
    title: 'Sicherheitsnetz: Variante wegen Opt-outs pausiert',
    lines: [
      `Variante „${String(a.context.variant ?? a.context.variantId)}“: ${String(a.context.optOuts)} Opt-outs bei ${String(a.context.scans)} Scans (Grenze 5 %).`,
      'Die Variante bekommt keine Briefe mehr, bis du sie im Varianten-Labor wieder aktivierst.',
    ],
  }),
  complaint: (a) => ({
    title: 'Sicherheitsnetz: Beschwerde „Abzocke/Täuschung“ – Variante pausiert',
    lines: [
      `Variante „${String(a.context.variant ?? a.context.variantId)}“ ist pausiert.`,
      'Bitte Beschwerde im Support lesen und Brieftext prüfen.',
    ],
  }),
  undeliverable: (a) => ({
    title: 'Sicherheitsnetz: Versand pausiert (unzustellbare Briefe)',
    lines: [
      `Charge ${String(a.context.week)}: ${String(a.context.undeliverable)} von ${String(a.context.letters)} Briefen unzustellbar (Grenze 3 %).`,
      'Lead-Qualität (Anschriften, Quelle) prüfen, dann unter Einstellungen „Versand pausiert“ ausschalten.',
    ],
  }),
  cost: (a) => ({
    title: 'Sicherheitsnetz: Wochenbudget halbiert (Kosten pro Kauf)',
    lines: [
      `Vier ausgewertete Wochen in Folge über ${formatEuro(Number(a.context.maxCacCents))} Kosten pro Kauf.`,
      `Wochenbudget: ${formatEuro(Number(a.context.beforeCents))} → ${formatEuro(Number(a.context.afterCents))}.`,
    ],
  }),
};

export async function runSafetyNets(db: DbOrTx = getDb()): Promise<SafetyAction[]> {
  const actions = [
    ...(await optOutBrake(db)),
    ...(await complaintBrake(db)),
    ...(await undeliverableBrake(db)),
    ...(await costBrake(db)),
  ];
  for (const a of actions) {
    const m = MESSAGES[a.kind](a);
    await raiseAlert(db, { level: 'warn', code: `safety_${a.kind}`, message: m.title, context: { key: a.key } });
    await notifyAdmin({ key: `safety:${a.key}`, title: m.title, lines: m.lines, link: appUrl('/admin/optimizer') });
  }
  return actions;
}

export async function recentSafetyActions(limit = 20, db: DbOrTx = getDb()) {
  return db
    .select()
    .from(safetyActions)
    .orderBy(sql`${safetyActions.createdAt} DESC`)
    .limit(limit);
}
