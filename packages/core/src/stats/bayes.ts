/**
 * Bayes-Statistik für den Optimizer (Update 2, B6.3). Reine Funktionen ohne Datenbank – testbar mit
 * simulierten Daten (`simulate.ts`).
 *
 * - Beta-Verteilungen für Raten, Spannen als zentrales Glaubwürdigkeitsintervall
 * - Hierarchisches Modell (Partial Pooling, empirischer Bayes): Gesamt → Branche → Variante
 * - Thompson Sampling je Branche mit fester Kontrollgruppe und Mindest-Exploration
 * - Entscheidungsregel „Gewinner“ erst bei P(besser als Kontrolle) ≥ 90 % und genügend Briefen je Arm
 * - Power-Rechner (Fallzahl für zwei Anteile)
 */

// ---------------------------------------------------------------------------
// Zufall
// ---------------------------------------------------------------------------

/** Deterministischer Zufall (Mulberry32) – reproduzierbare Berichte, Simulationen und Tests. */
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

// ---------------------------------------------------------------------------
// Beta-Verteilung: Verteilungsfunktion, Quantile, Spannen
// ---------------------------------------------------------------------------

/** ln Γ(x) (Lanczos, g = 7). */
export function lnGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const z = x - 1;
  let a = c[0]!;
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += c[i]! / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Kettenbruch der unvollständigen Betafunktion (Numerical Recipes, betacf). */
function betaContinuedFraction(x: number, a: number, b: number): number {
  const eps = 1e-14;
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

/** Verteilungsfunktion der Beta(a, b)-Verteilung (regularisierte unvollständige Betafunktion). */
export function betaCdf(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnFront = lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const front = Math.exp(lnFront);
  if (x < (a + 1) / (a + b + 2)) return (front * betaContinuedFraction(x, a, b)) / a;
  return 1 - (front * betaContinuedFraction(1 - x, b, a)) / b;
}

/** Quantil der Beta(a, b)-Verteilung (Bisektion, genau auf ~1e-10). */
export function betaQuantile(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (betaCdf(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface RateInterval {
  mean: number;
  lo: number;
  hi: number;
  /** Wahrscheinlichkeit der Spanne, z. B. 0,9 */
  level: number;
}

/** Spanne statt Einzelwert (B6.3): zentrales Intervall mit Wahrscheinlichkeit `level`. */
export function betaInterval(a: number, b: number, level = 0.9): RateInterval {
  const tail = (1 - level) / 2;
  return { mean: a / (a + b), lo: betaQuantile(tail, a, b), hi: betaQuantile(1 - tail, a, b), level };
}

// ---------------------------------------------------------------------------
// Hierarchisches Modell (Partial Pooling)
// ---------------------------------------------------------------------------

export interface Counts {
  /** Versuche (z. B. zugestellte Briefe) */
  n: number;
  /** Erfolge (z. B. Scans) */
  x: number;
}

export interface KappaBounds {
  min: number;
  max: number;
  /** Wert, wenn sich die Streuung nicht schätzen lässt (weniger als 2 Gruppen mit je ≥ 30 Versuchen) */
  fallback: number;
}

/** Standard: mittlere Stärke – 5 Briefe verschieben eine Rate kaum, einige hundert deutlich. Obergrenze 200, damit zwei Arme mit zufällig ähnlichen Raten keine Scheingenauigkeit erzeugen. */
export const DEFAULT_KAPPA: KappaBounds = { min: 10, max: 200, fallback: 50 };

/**
 * Konzentration κ des Beta-Priors aus der Streuung zwischen Gruppen (Momentenmethode, beta-binomial):
 * beobachtete Varianz der Raten minus erwartete Binomial-Varianz = Varianz der wahren Raten τ²;
 * κ = m(1 − m)/τ² − 1. Große κ = starkes Pooling (Gruppen sehr ähnlich).
 */
export function estimateConcentration(groups: Counts[], mean: number, bounds: KappaBounds = DEFAULT_KAPPA): number {
  // Erst ab 30 Versuchen je Gruppe ist die Streuung schätzbar, sonst Standardwert (instabil bei 1–2 Scans)
  const g = groups.filter((x) => x.n >= 30);
  if (g.length < 2) return bounds.fallback;
  const total = g.reduce((s, x) => s + x.n, 0);
  const m = Math.min(1 - 1e-6, Math.max(1e-6, mean));
  const observed = g.reduce((s, x) => s + x.n * (x.x / x.n - m) ** 2, 0) / total;
  const binomial = (m * (1 - m) * g.length) / total;
  const tau2 = observed - binomial;
  if (tau2 <= 0) return bounds.max;
  const kappa = (m * (1 - m)) / tau2 - 1;
  return Math.min(bounds.max, Math.max(bounds.min, kappa));
}

export interface ArmCounts extends Counts {
  /** Branche (Gruppe der mittleren Ebene) */
  group: string;
  /** Arm (Variante, Template …) */
  arm: string;
}

export interface PooledLevel extends Counts {
  alpha: number;
  beta: number;
  interval: RateInterval;
}

export interface PooledArm extends ArmCounts, PooledLevel {}

export interface PooledResult {
  global: PooledLevel;
  groups: Record<string, PooledLevel>;
  arms: PooledArm[];
  kappa: { group: number; arm: number };
}

/**
 * Partial Pooling in drei Ebenen (empirischer Bayes): Die Gesamtrate (Prior Beta(1, 1)) ist der Prior der
 * Branchen, die Branchenrate der Prior ihrer Varianten. Die Stärke der Prioren (κ) kommt aus der Streuung
 * der Daten. So erzeugen 5 Briefe in einer kleinen Branche keine Fantasiewerte, und große Unterschiede
 * setzen sich mit genügend Briefen trotzdem durch.
 * Näherung: Die Daten eines Arms stecken auch in seiner Branchenrate (bei vielen Armen vernachlässigbar).
 */
export function poolHierarchy(
  arms: ArmCounts[],
  opts: { level?: number; groupKappa?: KappaBounds; armKappa?: KappaBounds } = {},
): PooledResult {
  const level = opts.level ?? 0.9;
  const N = arms.reduce((s, a) => s + a.n, 0);
  const X = arms.reduce((s, a) => s + a.x, 0);
  const gA = 1 + X;
  const gB = 1 + N - X;
  const global: PooledLevel = { n: N, x: X, alpha: gA, beta: gB, interval: betaInterval(gA, gB, level) };
  const m0 = gA / (gA + gB);

  const groupCounts = new Map<string, Counts>();
  for (const a of arms) {
    const c = groupCounts.get(a.group) ?? { n: 0, x: 0 };
    c.n += a.n;
    c.x += a.x;
    groupCounts.set(a.group, c);
  }
  const kGroup = estimateConcentration([...groupCounts.values()], m0, opts.groupKappa ?? DEFAULT_KAPPA);
  const groups: Record<string, PooledLevel> = {};
  for (const [g, c] of groupCounts) {
    const alpha = m0 * kGroup + c.x;
    const beta = (1 - m0) * kGroup + c.n - c.x;
    groups[g] = { ...c, alpha, beta, interval: betaInterval(alpha, beta, level) };
  }

  // κ der Variantenebene: Streuung der Arme um ihre Branchenrate, über alle Branchen zusammen geschätzt
  const centered = arms
    .filter((a) => a.n > 0)
    .map((a) => {
      const g = groups[a.group]!;
      const gm = g.alpha / (g.alpha + g.beta);
      // Rate relativ zur Branche auf die Gesamtrate verschieben, damit eine gemeinsame Schätzung möglich ist
      const shifted = Math.min(1, Math.max(0, a.x / a.n - gm + m0));
      return { n: a.n, x: shifted * a.n };
    });
  const groupsWithSeveralArms = [...groupCounts.keys()].filter((g) => arms.filter((a) => a.group === g && a.n > 0).length >= 2);
  const kArm = groupsWithSeveralArms.length
    ? estimateConcentration(centered, m0, opts.armKappa ?? DEFAULT_KAPPA)
    : (opts.armKappa ?? DEFAULT_KAPPA).fallback;

  const pooledArms = arms.map((a) => {
    const g = groups[a.group]!;
    const gm = g.alpha / (g.alpha + g.beta);
    const alpha = gm * kArm + a.x;
    const beta = (1 - gm) * kArm + a.n - a.x;
    return { ...a, alpha, beta, interval: betaInterval(alpha, beta, level) };
  });
  return { global, groups, arms: pooledArms, kappa: { group: kGroup, arm: kArm } };
}

// ---------------------------------------------------------------------------
// Thompson Sampling je Branche (Kontrolle + Exploration)
// ---------------------------------------------------------------------------

export interface AllocationArm {
  arm: string;
  isControl: boolean;
  alpha: number;
  beta: number;
  /** Wert je Erfolg (Umsatz pro Kauf, Cent); ohne Angabe 1 → Ziel ist die Rate selbst */
  value?: number;
}

export interface AllocationResult {
  arm: string;
  isControl: boolean;
  /** P(dieser Arm ist der beste) */
  pBest: number;
  /** P(besser als die Kontrolle); für die Kontrolle selbst null */
  pBetterThanControl: number | null;
  /** Zielanteil der nächsten Charge */
  share: number;
}

export interface AllocationOptions {
  /** Fester Mindestanteil der Kontrolle (B6.3: ≥ 15 %) */
  controlShare: number;
  /** Gleichmäßig verteilte Exploration (B6.4: ≥ 20 %) */
  exploration: number;
  samples: number;
  rng: () => number;
}

export const MIN_CONTROL_SHARE = 0.15;
export const MIN_EXPLORATION = 0.2;

/**
 * Anteile der nächsten Charge: Anteil_i = (1 − c − e)·P(i ist bester) + e/k + (Kontrolle ? c : 0).
 * Ohne Kontrollarm geht c in die Exploration. Kontrolle und Exploration werden nie unter 15 % / 20 % gesetzt.
 */
export function thompsonShares(arms: AllocationArm[], o: AllocationOptions): AllocationResult[] {
  if (!arms.length) return [];
  const k = arms.length;
  const controlIdx = arms.findIndex((a) => a.isControl);
  if (k === 1) return [{ arm: arms[0]!.arm, isControl: arms[0]!.isControl, pBest: 1, pBetterThanControl: null, share: 1 }];
  const c = controlIdx >= 0 ? Math.max(MIN_CONTROL_SHARE, o.controlShare) : 0;
  const e = Math.max(MIN_EXPLORATION, o.exploration) + (controlIdx >= 0 ? 0 : Math.max(MIN_CONTROL_SHARE, o.controlShare));
  const exploit = Math.max(0, 1 - c - e);
  const wins = new Array<number>(k).fill(0);
  const beats = new Array<number>(k).fill(0);
  const draws = new Array<number>(k).fill(0);
  for (let s = 0; s < o.samples; s++) {
    let best = 0;
    for (let i = 0; i < k; i++) {
      const a = arms[i]!;
      draws[i] = betaSample(a.alpha, a.beta, o.rng) * (a.value ?? 1);
      if (draws[i]! > draws[best]!) best = i;
    }
    wins[best]!++;
    if (controlIdx >= 0) for (let i = 0; i < k; i++) if (draws[i]! > draws[controlIdx]!) beats[i]!++;
  }
  return arms.map((a, i) => {
    const pBest = wins[i]! / o.samples;
    return {
      arm: a.arm,
      isControl: a.isControl,
      pBest,
      pBetterThanControl: controlIdx < 0 || i === controlIdx ? null : beats[i]! / o.samples,
      share: exploit * pBest + e / k + (i === controlIdx ? c : 0),
    };
  });
}

/**
 * Quoten-Zuteilung innerhalb einer Charge: der Arm mit dem größten Rückstand zu seinem Zielanteil
 * bekommt den nächsten Brief. So erreicht die Kontrolle ihre 15 % auch bei 13 Briefen pro Branche.
 */
export function nextByQuota(targets: { arm: string; share: number }[], assigned: Record<string, number>, tieBreak = 0): string {
  const k = targets.length;
  const total = targets.reduce((s, t) => s + (assigned[t.arm] ?? 0), 0);
  const sumShares = targets.reduce((s, t) => s + t.share, 0) || 1;
  // Gleichstand: Startpunkt der Suche aus `tieBreak` (0–1), damit nicht immer derselbe Arm beginnt
  const start = Math.min(k - 1, Math.floor(Math.max(0, tieBreak) * k));
  let best = targets[start]!;
  let bestDeficit = -Infinity;
  for (let j = 0; j < k; j++) {
    const t = targets[(start + j) % k]!;
    const deficit = (t.share / sumShares) * (total + 1) - (assigned[t.arm] ?? 0);
    if (deficit > bestDeficit + 1e-12) {
      bestDeficit = deficit;
      best = t;
    }
  }
  return best.arm;
}

// ---------------------------------------------------------------------------
// Entscheidungsregel
// ---------------------------------------------------------------------------

export type ArmVerdict =
  'kontrolle' | 'gewinner' | 'schlechter' | 'tendenz_besser' | 'tendenz_schlechter' | 'offen' | 'zu_wenig_daten';

export const VERDICT_LABEL: Record<ArmVerdict, string> = {
  kontrolle: 'Kontrolle',
  gewinner: 'Gewinner',
  schlechter: 'schlechter (P ≥ 95 %)',
  tendenz_besser: 'Tendenz besser',
  tendenz_schlechter: 'Tendenz schlechter',
  offen: 'kein klarer Unterschied',
  zu_wenig_daten: 'zu wenig Daten',
};

/**
 * B6.3: „Gewinner“ erst bei P(besser als Kontrolle) ≥ 90 % und mindestens `minPerArm` Briefen in jedem
 * der beiden Arme; davor höchstens „Tendenz“. „Schlechter“ (Pausier-Kandidat, B6.5) symmetrisch erst bei
 * P(schlechter) ≥ 95 % und genügend Briefen.
 */
export function verdictFor(pBetter: number | null, nArm: number, nControl: number, minPerArm: number): ArmVerdict {
  if (pBetter === null) return 'kontrolle';
  const enough = nArm >= minPerArm && nControl >= minPerArm;
  if (enough) {
    if (pBetter >= 0.9) return 'gewinner';
    if (pBetter <= 0.05) return 'schlechter';
    return 'offen';
  }
  if (pBetter >= 0.9) return 'tendenz_besser';
  if (pBetter <= 0.1) return 'tendenz_schlechter';
  return 'zu_wenig_daten';
}

// ---------------------------------------------------------------------------
// Power-Rechner
// ---------------------------------------------------------------------------

/** Quantil der Standardnormalverteilung (Acklam, Fehler < 1,2e-9). */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) throw new RangeError('p muss zwischen 0 und 1 liegen');
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let q: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }
  if (p > 1 - pl) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }
  q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  );
}

export interface PowerInput {
  /** Rate der Kontrolle, z. B. 0,02 */
  p1: number;
  /** erwartete Rate der Variante, z. B. 0,03 */
  p2: number;
  /** Irrtumswahrscheinlichkeit (zweiseitig), Standard 5 % */
  alpha?: number;
  /** Teststärke, Standard 80 % */
  power?: number;
  /** Briefe pro Woche und Variante, für die Dauer */
  lettersPerWeekPerArm?: number;
}

export interface PowerResult {
  perArm: number;
  total: number;
  weeks: number | null;
}

/**
 * Fallzahl je Variante für den Vergleich zweier Anteile (Normalapproximation):
 * n = (z₁₋α/₂·√(2·p̄(1 − p̄)) + z₁₋β·√(p₁(1 − p₁) + p₂(1 − p₂)))² / (p₁ − p₂)².
 * Beispiel aus B6.3: 2 % → 3 % Scan-Rate braucht bei 5 %/80 % rund 3.800 Briefe je Variante.
 */
export function sampleSizePerArm(i: PowerInput): PowerResult {
  const { p1, p2 } = i;
  if (!(p1 > 0 && p1 < 1 && p2 > 0 && p2 < 1) || p1 === p2) throw new RangeError('Raten zwischen 0 und 1, verschieden');
  const alpha = i.alpha ?? 0.05;
  const power = i.power ?? 0.8;
  const za = normalQuantile(1 - alpha / 2);
  const zb = normalQuantile(power);
  const pbar = (p1 + p2) / 2;
  const n = (za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p1 - p2) ** 2;
  const perArm = Math.ceil(n);
  return {
    perArm,
    total: perArm * 2,
    weeks: i.lettersPerWeekPerArm && i.lettersPerWeekPerArm > 0 ? Math.ceil(perArm / i.lettersPerWeekPerArm) : null,
  };
}
