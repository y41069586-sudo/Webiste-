import { and, eq } from 'drizzle-orm';
import { getEnv } from '../config/env';
import { getConfig } from '../config/service';
import type { AppConfig } from '../config/settings';
import { getDb, type DbOrTx } from '../db/client';
import { armAllocations, variants } from '../db/schema';
import { seededRandom } from '../stats/bayes';
import { evaluateArms, type ArmData, type IndustryEvaluation } from '../stats/model';
import { INDUSTRIES, type Industry } from '../types';
import { startOfIsoWeek } from '../util/time';
import { audit } from './audit';
import { funnelRows } from './funnel';
import { eligibleLetterVariants } from './letters';

/**
 * Optimizer je Branche (L5, B6.3/B6.4): Daten aus der Funnel-Sicht, Bayes-Modell mit Partial Pooling,
 * Thompson Sampling mit Kontrollgruppe (≥ 15 %) und Exploration (≥ 20 %), Zuteilung als Quote je Charge.
 */

type VariantRow = typeof variants.$inferSelect;

/** Kontrollvariante der Branche: aus der Config, sonst die älteste aktive neutrale Variante (ohne Statistik). */
export function controlVariantFor(cfg: AppConfig, industry: Industry, eligible: VariantRow[]): VariantRow | null {
  const configured = cfg.optimizer.controlVariants[industry];
  if (configured) {
    const hit = eligible.find((v) => v.id === configured);
    if (hit) return hit;
  }
  const neutral = eligible.filter((v) => v.industry === null).sort((a, b) => +a.createdAt - +b.createdAt);
  return neutral[0] ?? null;
}

/** Rohzahlen je Branche × Variante (Erstbriefe, Sequenz 1). */
export async function industryArmData(db: DbOrTx = getDb(), now = new Date()): Promise<ArmData[]> {
  const cfg = await getConfig();
  const rows = await funnelRows({ groupBy: ['industry', 'variant'] }, db);
  const all = await db
    .select()
    .from(variants)
    .where(and(eq(variants.kind, 'letter'), eq(variants.sequence, 1)));
  const out: ArmData[] = [];
  for (const industry of INDUSTRIES) {
    const eligible = (await eligibleLetterVariants(db, 1, { industry, now })).map((e) => e.row);
    const control = controlVariantFor(cfg, industry, eligible);
    const withData = rows.filter((r) => r.industry === industry && r.variant && r.variant !== 'ohne').map((r) => r.variant!);
    const ids = [...new Set([...eligible.map((v) => v.id), ...withData])];
    for (const id of ids) {
      const v = all.find((x) => x.id === id);
      const r = rows.find((x) => x.industry === industry && x.variant === id);
      out.push({
        industry,
        arm: id,
        label: v?.name ?? id,
        isControl: control?.id === id,
        eligible: eligible.some((e) => e.id === id),
        delivered: r?.delivered ?? 0,
        scans: r?.scans ?? 0,
        evaluated: r?.evaluated ?? 0,
        purchases: r?.purchases_evaluated ?? 0,
        valuePerPurchaseCents: r && r.purchases > 0 ? r.revenueCents / r.purchases : null,
      });
    }
  }
  return out;
}

/** Modell rechnen (Dashboard, Wochenlauf). Deterministisch je Woche, damit Anzeige und Bericht übereinstimmen. */
export async function evaluateIndustries(
  opts: { db?: DbOrTx; now?: Date; rng?: () => number } = {},
): Promise<IndustryEvaluation[]> {
  const db = opts.db ?? getDb();
  const now = opts.now ?? new Date();
  const cfg = await getConfig();
  const data = await industryArmData(db, now);
  return evaluateArms(data, {
    controlShare: cfg.optimizer.controlShare,
    exploration: cfg.optimizer.explorationShare,
    samples: cfg.optimizer.samples,
    rng: opts.rng ?? seededRandom(Math.floor(startOfIsoWeek(now).getTime() / 1000)),
    minPerArm: getEnv().MIN_LETTERS_PER_ARM,
    minLettersForSignal: cfg.optimizer.minLettersForSignal,
  }).filter((ind) => ind.arms.some((a) => a.eligible || a.delivered > 0));
}

export interface IndustryAllocation {
  industry: string;
  arms: { variantId: string; share: number; isControl: boolean }[];
}

export function allocationsFrom(evals: IndustryEvaluation[]): IndustryAllocation[] {
  return evals
    .map((ind) => ({
      industry: ind.industry,
      arms: ind.arms
        .filter((a) => a.eligible && a.share > 0)
        .map((a) => ({ variantId: a.arm, share: Number(a.share.toFixed(4)), isControl: a.isControl })),
    }))
    .filter((a) => a.arms.length > 0);
}

/** Zuteilung übernehmen (Wochenlauf mit AUTO_OPTIMIZE, Bericht übernehmen oder Button im Dashboard). */
export async function applyAllocations(
  allocs: IndustryAllocation[],
  actor: string,
  reportId: string | null = null,
  db: DbOrTx = getDb(),
): Promise<void> {
  for (const a of allocs) {
    await db.delete(armAllocations).where(eq(armAllocations.industry, a.industry as Industry));
    if (a.arms.length)
      await db.insert(armAllocations).values(
        a.arms.map((x) => ({
          industry: a.industry as Industry,
          variantId: x.variantId,
          share: x.share,
          isControl: x.isControl,
          reportId,
        })),
      );
  }
  await audit(db, {
    entity: 'optimizer',
    entityId: reportId ?? 'manual',
    action: 'allocations_applied',
    actor,
    context: { industries: allocs.map((a) => a.industry) },
  });
}

export async function currentAllocations(db: DbOrTx = getDb()): Promise<Map<string, Map<string, number>>> {
  const rows = await db.select().from(armAllocations);
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = out.get(r.industry) ?? new Map<string, number>();
    m.set(r.variantId, r.share);
    out.set(r.industry, m);
  }
  return out;
}

/** Pausierte Variante wieder aktivieren (nach Prüfung eines Sicherheitsnetzes). */
export async function reactivateVariant(id: string, actor: string, db: DbOrTx = getDb()): Promise<boolean> {
  const res = await db
    .update(variants)
    .set({ status: 'active', active: true })
    .where(and(eq(variants.id, id), eq(variants.status, 'paused')))
    .returning({ id: variants.id });
  if (res.length) await audit(db, { entity: 'variant', entityId: id, action: 'reactivated', actor });
  return res.length > 0;
}
