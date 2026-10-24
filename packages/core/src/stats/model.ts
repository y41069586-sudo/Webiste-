import {
  MIN_CONTROL_SHARE,
  MIN_EXPLORATION,
  poolHierarchy,
  thompsonShares,
  verdictFor,
  type ArmVerdict,
  type RateInterval,
} from './bayes';

/**
 * Optimizer-Modell (B6.3/B6.4) auf Rohzahlen je Branche × Variante – gemeinsam genutzt vom Wochenlauf,
 * vom Dashboard und von der Simulation.
 */

export interface ArmData {
  industry: string;
  arm: string;
  label?: string;
  isControl: boolean;
  /** Darf Briefe bekommen (aktiv und für die Branche nutzbar) */
  eligible: boolean;
  delivered: number;
  scans: number;
  /** Briefe mit abgelaufenem Auswertungsfenster */
  evaluated: number;
  /** Käufe aus ausgewerteten Briefen */
  purchases: number;
  /** Mittlerer Umsatzwert je Kauf (Cent), falls bekannt */
  valuePerPurchaseCents?: number | null;
}

export type Signal = 'scan' | 'umsatz';

export interface ArmEvaluation extends ArmData {
  scan: RateInterval;
  purchase: RateInterval;
  pBest: number | null;
  pBetterThanControl: number | null;
  verdict: ArmVerdict;
  /** Zielanteil der nächsten Charge (0 bei nicht nutzbaren Armen) */
  share: number;
}

export interface IndustryEvaluation {
  industry: string;
  signal: Signal;
  /** Gleichverteilung, weil noch nicht jeder Arm genug Briefe für ein Signal hat */
  equalSplit: boolean;
  arms: ArmEvaluation[];
  pooled: { scan: RateInterval; purchase: RateInterval };
}

export interface ModelOptions {
  controlShare: number;
  exploration: number;
  samples: number;
  rng: () => number;
  /** B6.3: MIN_LETTERS_PER_ARM */
  minPerArm: number;
  /** Ab so vielen zugestellten Briefen je Arm verteilt Thompson Sampling, davor gleich */
  minLettersForSignal: number;
  /** Ab so vielen Käufen je Arm steuert der Umsatz pro Brief statt der Scan-Rate (B6.3: 5) */
  minPurchasesForRevenue?: number;
  level?: number;
}

/** Gleichverteilung mit Mindestanteil der Kontrolle. */
function equalShares(arms: ArmData[], controlShare: number): Map<string, number> {
  const k = arms.length;
  const out = new Map<string, number>();
  if (!k) return out;
  const control = arms.find((a) => a.isControl);
  const c = control ? Math.max(1 / k, Math.max(MIN_CONTROL_SHARE, controlShare)) : 0;
  const rest = control ? (1 - c) / (k - 1 || 1) : 1 / k;
  for (const a of arms) out.set(a.arm, a.isControl ? (k === 1 ? 1 : c) : rest);
  return out;
}

export function evaluateArms(data: ArmData[], o: ModelOptions): IndustryEvaluation[] {
  const level = o.level ?? 0.9;
  const scanPool = poolHierarchy(
    data.map((a) => ({ group: a.industry, arm: a.arm, n: a.delivered, x: Math.min(a.scans, a.delivered) })),
    { level },
  );
  const buyPool = poolHierarchy(
    data.map((a) => ({ group: a.industry, arm: a.arm, n: a.evaluated, x: Math.min(a.purchases, a.evaluated) })),
    { level },
  );
  // Wert je Kauf: geglättet zum Gesamtmittel (2 Pseudo-Käufe)
  const allPurchases = data.reduce((s, a) => s + a.purchases, 0);
  const allValue = data.reduce((s, a) => s + a.purchases * (a.valuePerPurchaseCents ?? 0), 0);
  // ohne bekannte Umsatzwerte zählt jeder Kauf gleich (1) – sonst würden alle Arme mit 0 bewertet
  const meanValue = allPurchases && allValue > 0 ? allValue / allPurchases : 1;
  const smoothedValue = (a: ArmData) =>
    (a.purchases * (a.valuePerPurchaseCents ?? meanValue) + 2 * meanValue) / (a.purchases + 2);

  const industries = [...new Set(data.map((a) => a.industry))].sort();
  return industries.map((industry) => {
    const idx = data.map((a, i) => (a.industry === industry ? i : -1)).filter((i) => i >= 0);
    const arms = idx.map((i) => data[i]!);
    const eligible = idx.filter((i) => data[i]!.eligible);
    const minBuy = o.minPurchasesForRevenue ?? 5;
    const signal: Signal = eligible.length > 0 && eligible.every((i) => data[i]!.purchases >= minBuy) ? 'umsatz' : 'scan';
    const pool = signal === 'scan' ? scanPool : buyPool;
    const ts = thompsonShares(
      eligible.map((i) => ({
        arm: data[i]!.arm,
        isControl: data[i]!.isControl,
        alpha: pool.arms[i]!.alpha,
        beta: pool.arms[i]!.beta,
        value: signal === 'umsatz' ? smoothedValue(data[i]!) : undefined,
      })),
      { controlShare: o.controlShare, exploration: o.exploration, samples: o.samples, rng: o.rng },
    );
    const equalSplit = eligible.some((i) => data[i]!.delivered < o.minLettersForSignal);
    const eq = equalShares(
      eligible.map((i) => data[i]!),
      o.controlShare,
    );
    const control = arms.find((a) => a.isControl && a.eligible) ?? arms.find((a) => a.isControl);
    const evals: ArmEvaluation[] = idx.map((i) => {
      const a = data[i]!;
      const t = ts.find((x) => x.arm === a.arm);
      const pBetter = a.isControl ? null : (t?.pBetterThanControl ?? null);
      return {
        ...a,
        scan: scanPool.arms[i]!.interval,
        purchase: buyPool.arms[i]!.interval,
        pBest: t?.pBest ?? null,
        pBetterThanControl: control ? pBetter : null,
        verdict: a.isControl
          ? 'kontrolle'
          : t && control
            ? verdictFor(pBetter, a.delivered, control.delivered, o.minPerArm)
            : 'zu_wenig_daten',
        share: a.eligible ? (equalSplit ? (eq.get(a.arm) ?? 0) : (t?.share ?? 0)) : 0,
      };
    });
    return {
      industry,
      signal,
      equalSplit,
      arms: evals,
      pooled: { scan: scanPool.groups[industry]!.interval, purchase: buyPool.groups[industry]!.interval },
    };
  });
}

export const MODEL_DEFAULTS = { controlShare: MIN_CONTROL_SHARE, exploration: MIN_EXPLORATION };
