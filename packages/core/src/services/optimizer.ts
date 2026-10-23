import { eq, sql } from 'drizzle-orm';
import { appUrl, getEnv } from '../config/env';
import { effectiveSwitches, getConfig, updateConfig } from '../config/service';
import { getDb } from '../db/client';
import { reports, variants } from '../db/schema';
import { renderEmail } from '../emails/templates';
import { logger } from '../logger';
import { addDays, formatDateDe, formatEuro, startOfIsoWeek } from '../util/time';
import { audit } from './audit';
import { sendTransactionalEmail } from './email';
import { kpiRows, kpiSummary } from './kpis';

export interface ArmStats {
  key: string;
  label: string;
  /** Erreichte Leads (Erstbrief versendet) */
  n: number;
  scans: number;
  purchases: number;
}

export interface ArmResult extends ArmStats {
  priorMean: number;
  posteriorMean: number;
  pBest: number;
  share: number;
}

/** Deterministischer Zufall (Mulberry32) – reproduzierbare Berichte und Tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rng: () => number): number {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Gamma(k, 1) nach Marsaglia & Tsang. */
function gamma(k: number, rng: () => number): number {
  if (k < 1) return gamma(k + 1, rng) * Math.pow(rng() || 1e-12, 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function betaSample(a: number, b: number, rng: () => number): number {
  const x = gamma(a, rng);
  const y = gamma(b, rng);
  return x / (x + y);
}

/**
 * Thompson Sampling auf der Kaufrate. Prior je Arm: geglättete Scan-Rate des Arms × globale
 * Kauf-pro-Scan-Rate (Stärke `priorStrength` Pseudo-Briefe). Anteil = (1 − ε)·P(bester Arm) + ε/k.
 */
export function thompsonAllocation(
  arms: ArmStats[],
  opts: { exploration: number; samples: number; priorStrength?: number; rng?: () => number },
): ArmResult[] {
  if (!arms.length) return [];
  const rng = opts.rng ?? Math.random;
  const s = opts.priorStrength ?? 20;
  const totalScans = arms.reduce((a, x) => a + x.scans, 0);
  const totalPurchases = arms.reduce((a, x) => a + x.purchases, 0);
  const buyPerScan = (totalPurchases + 1) / (totalScans + 2);
  const params = arms.map((arm) => {
    const scanRate = (arm.scans + 1) / (arm.n + 2);
    const priorMean = Math.min(0.99, Math.max(1e-4, scanRate * buyPerScan));
    const alpha = priorMean * s + arm.purchases;
    const beta = (1 - priorMean) * s + Math.max(0, arm.n - arm.purchases);
    return { arm, priorMean, alpha, beta };
  });
  const wins = new Array<number>(arms.length).fill(0);
  for (let i = 0; i < opts.samples; i++) {
    let best = 0;
    let bestVal = -1;
    params.forEach((p, idx) => {
      const v = betaSample(p.alpha, p.beta, rng);
      if (v > bestVal) {
        bestVal = v;
        best = idx;
      }
    });
    wins[best]!++;
  }
  const eps = Math.min(1, Math.max(0.2, opts.exploration));
  const k = arms.length;
  return params.map((p, idx) => {
    const pBest = wins[idx]! / opts.samples;
    return {
      ...p.arm,
      priorMean: p.priorMean,
      posteriorMean: p.alpha / (p.alpha + p.beta),
      pBest,
      share: (1 - eps) * pBest + eps / k,
    };
  });
}

const pct = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined ? '–' : `${(v * 100).toFixed(d).replace('.', ',')} %`;

/** Segmente: alle mit Briefen in der Lernphase plus alle mit freien Leads im Pool. */
async function segmentArms(from: Date, to: Date): Promise<ArmStats[]> {
  const db = getDb();
  const rows = await kpiRows({ from, to }, 'segment', db);
  const pool = await db.execute<{ segment_key: string }>(
    sql`SELECT DISTINCT segment_key FROM leads WHERE status IN ('qualified', 'demo_built', 'demo_approved', 'demo_published')`,
  );
  const keys = new Set([...rows.map((r) => r.key), ...pool.rows.map((r) => r.segment_key)]);
  return [...keys].sort().map((key) => {
    const r = rows.find((x) => x.key === key);
    return { key, label: key, n: r?.leads ?? 0, scans: r?.scans ?? 0, purchases: r?.purchases ?? 0 };
  });
}

async function variantArms(from: Date, to: Date): Promise<ArmStats[]> {
  const db = getDb();
  const rows = await kpiRows({ from, to }, 'variant', db);
  const active = await db
    .select()
    .from(variants)
    .where(sql`${variants.kind} = 'letter' AND ${variants.active} = true AND ${variants.sequence} = 1`);
  return active.map((v) => {
    const r = rows.find((x) => x.key === v.id);
    return { key: v.id, label: v.name, n: r?.leads ?? 0, scans: r?.scans ?? 0, purchases: r?.purchases ?? 0 };
  });
}

export interface OptimizerResult {
  reportId: string;
  applied: boolean;
  segments: ArmResult[];
  variants: ArmResult[];
  markdown: string;
}

/**
 * Wochenlauf (sonntags): Kennzahlen der Woche, Thompson Sampling für Segment-Budgetanteile und
 * Briefvarianten, Bericht speichern und mailen. Übernahme nur mit AUTO_OPTIMIZE, sonst Vorschlag.
 */
export async function runWeeklyOptimizer(now = new Date(), rng?: () => number): Promise<OptimizerResult> {
  const cfg = await getConfig({ fresh: true });
  const weekStart = startOfIsoWeek(now);
  // Lernfenster: 120 Tage, Briefe der letzten 3 Tage zählen noch nicht (Zustellung/Reaktion)
  const learnTo = addDays(now, -3);
  const learnFrom = addDays(now, -120);
  const seed = Math.floor(weekStart.getTime() / 1000);
  const random = rng ?? seededRandom(seed);
  const opts = { exploration: cfg.optimizer.explorationShare, samples: cfg.optimizer.samples, rng: random };
  const seg = thompsonAllocation(await segmentArms(learnFrom, learnTo), opts);
  const vars = thompsonAllocation(await variantArms(learnFrom, learnTo), opts);
  const week = await kpiSummary({ from: weekStart, to: now });
  const total = await kpiSummary({ from: learnFrom, to: now });
  const minN = cfg.optimizer.minLettersForSignal;

  const table = (rows: ArmResult[], current: (k: string) => number | undefined) =>
    [
      '| Arm | Briefe | Scans | Scan-Rate | Käufe | P(bester) | bisher | neu |',
      '|---|---:|---:|---:|---:|---:|---:|---:|',
      ...rows.map(
        (r) =>
          `| ${r.label}${r.n < minN ? ' (wenig Daten)' : ''} | ${r.n} | ${r.scans} | ${pct(r.n ? r.scans / r.n : null)} | ${r.purchases} | ${pct(r.pBest)} | ${pct(current(r.key) ?? null)} | ${pct(r.share)} |`,
      ),
    ].join('\n');
  const curShares = cfg.budget.segmentShares;
  const curShareSum = Object.values(curShares).reduce((a, b) => a + b, 0);
  const activeVariants = await getDb()
    .select()
    .from(variants)
    .where(sql`${variants.kind} = 'letter' AND ${variants.active} = true AND ${variants.sequence} = 1`);
  const wSum = activeVariants.reduce((a, v) => a + v.weight, 0) || 1;
  const sw = effectiveSwitches(cfg);

  const markdown = [
    `# Wochenbericht ${formatDateDe(weekStart)} – ${formatDateDe(now)}`,
    '',
    '## Diese Woche',
    `- Briefe (Erstbrief): ${week.letters} an ${week.leads} Betriebe, Kosten ${formatEuro(week.letterCostCents)}`,
    `- Scans: ${week.scans} (${pct(week.scanRate)}), Klicks auf „Übernehmen“: ${week.ctaClicks}, Käufe: ${week.purchases}`,
    `- Umsatz: ${formatEuro(week.revenueCents)}, Akquisekosten: ${formatEuro(week.acquisitionCostCents)}`,
    '',
    '## Gesamt (120 Tage)',
    `- Betriebe angeschrieben: ${total.leads}, Scan-Rate ${pct(total.scanRate)}, Kaufrate ${pct(total.purchaseRate, 2)}`,
    `- Umsatz ${formatEuro(total.revenueCents)}, Akquisekosten ${formatEuro(total.acquisitionCostCents)}, CAC ${total.cacCents !== null ? formatEuro(total.cacCents) : '–'}, ROI ${total.roi !== null ? pct(total.roi, 0) : '–'}`,
    '',
    `## Budgetanteile je Segment (Thompson Sampling, Exploration ${pct(Math.max(0.2, cfg.optimizer.explorationShare), 0)})`,
    seg.length ? table(seg, (k) => (curShareSum ? (curShares[k] ?? 0) / curShareSum : undefined)) : 'Noch keine Segmente.',
    '',
    '## Briefvarianten',
    vars.length ? table(vars, (k) => (activeVariants.find((v) => v.id === k)?.weight ?? 0) / wSum) : 'Keine aktiven Varianten.',
    '',
    sw.autoOptimize
      ? '**AUTO_OPTIMIZE ist an – die neuen Anteile wurden übernommen.**'
      : 'AUTO_OPTIMIZE ist aus – Vorschlag, Übernahme im Dashboard unter „Wochenberichte“.',
    '',
    'Hinweis: Bei wenigen Briefen sind die Unterschiede überwiegend Zufall; die Exploration sorgt dafür, dass jedes Segment weiter Daten bekommt.',
  ].join('\n');

  const allocation = {
    segmentShares: Object.fromEntries(seg.map((r) => [r.key, Number(r.share.toFixed(4))])),
    variantWeights: Object.fromEntries(vars.map((r) => [r.key, Number(r.share.toFixed(4))])),
    arms: { segments: seg, variants: vars },
  };
  const db = getDb();
  const [row] = await db
    .insert(reports)
    .values({
      kind: 'weekly',
      periodStart: weekStart,
      periodEnd: now,
      markdown,
      allocationJson: allocation as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: [reports.kind, reports.periodStart],
      set: {
        periodEnd: now,
        markdown,
        allocationJson: allocation as unknown as Record<string, unknown>,
        applied: false,
        appliedAt: null,
      },
    })
    .returning();
  let applied = false;
  if (sw.autoOptimize) {
    await applyReport(row!.id, 'job:weekly-optimizer');
    applied = true;
  }
  try {
    const mail = renderEmail(cfg, {
      subject: `[Website-Brief] Wochenbericht ${formatDateDe(weekStart)}`,
      noGreeting: true,
      blocks: [markdown, { button: { href: appUrl('/admin/reports'), label: 'Im Dashboard ansehen' } }],
    });
    await sendTransactionalEmail({
      ...mail,
      kind: 'weekly_report',
      idempotencyKey: `report:${row!.id}:${now.toISOString().slice(0, 13)}`,
      to: getEnv().ADMIN_EMAIL,
    });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Wochenbericht nicht gemailt');
  }
  return { reportId: row!.id, applied, segments: seg, variants: vars, markdown };
}

/** Vorschlag eines Berichts übernehmen: Segment-Anteile in die Config, Gewichte an die Varianten. */
export async function applyReport(reportId: string, actor: string): Promise<void> {
  const db = getDb();
  const r = await db.query.reports.findFirst({ where: eq(reports.id, reportId) });
  if (!r) throw new Error('Bericht nicht gefunden');
  const a = r.allocationJson as { segmentShares?: Record<string, number>; variantWeights?: Record<string, number> };
  if (a.segmentShares && Object.keys(a.segmentShares).length)
    await updateConfig({ budget: { segmentShares: a.segmentShares } }, actor);
  for (const [id, w] of Object.entries(a.variantWeights ?? {})) {
    await db
      .update(variants)
      .set({ weight: Math.max(0.01, Number(w)) })
      .where(eq(variants.id, id));
  }
  await db.update(reports).set({ applied: true, appliedAt: new Date() }).where(eq(reports.id, reportId));
  await audit(db, {
    entity: 'report',
    entityId: reportId,
    action: 'applied',
    actor,
    context: { segments: Object.keys(a.segmentShares ?? {}).length },
  });
}
