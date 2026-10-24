import { nextByQuota, seededRandom } from './bayes';
import { evaluateArms, type ArmData, type IndustryEvaluation } from './model';

/**
 * Simulation mit bekannten wahren Raten (B9, Abnahme L5): prüft, ob der Optimizer nach genügend Briefen
 * die bessere Variante findet und bei zu wenig Daten keine falschen Gewinner ausruft.
 * Vereinfachung: Reaktionen treten in derselben Woche ein (in echt bis zu 45 Tage später).
 */

export interface SimArm {
  arm: string;
  isControl: boolean;
  trueScan: number;
  /** Kauf pro zugestelltem Brief */
  truePurchase: number;
}

export interface SimIndustry {
  industry: string;
  lettersPerWeek: number;
  arms: SimArm[];
}

export interface SimScenario {
  id: string;
  title: string;
  description: string;
  weeks: number;
  industries: SimIndustry[];
  /** Welcher Arm ist wirklich besser (null = keiner) – je Branche */
  trueBest: Record<string, string | null>;
}

export interface SimOptions {
  seed: number;
  minPerArm: number;
  minLettersForSignal: number;
  controlShare: number;
  exploration: number;
  samples: number;
}

export interface SimRun {
  /** Bewertung nach jeder Woche */
  weekly: IndustryEvaluation[][];
  final: IndustryEvaluation[];
  /** Briefe je Arm insgesamt */
  letters: Record<string, number>;
}

export function runSimulation(sc: SimScenario, o: SimOptions): SimRun {
  const rng = seededRandom(o.seed);
  const data: ArmData[] = sc.industries.flatMap((ind) =>
    ind.arms.map((a) => ({
      industry: ind.industry,
      arm: a.arm,
      isControl: a.isControl,
      eligible: true,
      delivered: 0,
      scans: 0,
      evaluated: 0,
      purchases: 0,
    })),
  );
  const weekly: IndustryEvaluation[][] = [];
  const opts = { ...o, rng };
  let current = evaluateArms(data, opts);
  for (let w = 0; w < sc.weeks; w++) {
    for (const ind of sc.industries) {
      const ev = current.find((x) => x.industry === ind.industry)!;
      const targets = ev.arms.map((a) => ({ arm: a.arm, share: a.share }));
      const assigned: Record<string, number> = {};
      for (let i = 0; i < ind.lettersPerWeek; i++) {
        const arm = nextByQuota(targets, assigned, rng());
        assigned[arm] = (assigned[arm] ?? 0) + 1;
        const truth = ind.arms.find((a) => a.arm === arm)!;
        const d = data.find((x) => x.industry === ind.industry && x.arm === arm)!;
        d.delivered++;
        d.evaluated++;
        if (rng() < truth.trueScan) d.scans++;
        if (rng() < truth.truePurchase) d.purchases++;
      }
    }
    current = evaluateArms(data, opts);
    weekly.push(current);
  }
  const letters = Object.fromEntries(data.map((d) => [`${d.industry}/${d.arm}`, d.delivered]));
  return { weekly, final: current, letters };
}

export interface ScenarioSummary {
  scenario: SimScenario;
  runs: number;
  /** Anteil der Läufe, die am Ende den wahren besten Arm als Gewinner ausrufen */
  correctWinnerAtEnd: number;
  /** Anteil der Läufe, die am Ende einen falschen Arm als Gewinner ausrufen */
  wrongWinnerAtEnd: number;
  /** Anteil der Läufe, die irgendwann (in einer Woche) einen falschen Gewinner ausgerufen haben */
  wrongWinnerEver: number;
  /** Mittlere Woche, ab der der wahre Gewinner erstmals ausgerufen wurde (nur Läufe mit Treffer) */
  meanWeekFirstCorrect: number | null;
  /** Mittlerer Anteil des wahren besten Arms an den Briefen der letzten Woche */
  meanFinalShareOfBest: number | null;
  /** Mittlere Briefe je Arm am Ende */
  meanLetters: Record<string, number>;
  /** Mittlere Spanne der Scan-Rate je Arm am Ende (Breite in Prozentpunkten) */
  meanScanSpan: Record<string, number>;
}

export function summarizeScenario(sc: SimScenario, runs: number, o: Omit<SimOptions, 'seed'>, seed0 = 1): ScenarioSummary {
  let correct = 0;
  let wrong = 0;
  let wrongEver = 0;
  const firstCorrect: number[] = [];
  const finalShares: number[] = [];
  const letters: Record<string, number> = {};
  const spans: Record<string, number> = {};
  for (let r = 0; r < runs; r++) {
    const run = runSimulation(sc, { ...o, seed: seed0 + r * 7919 });
    let thisCorrect = false;
    let thisWrong = false;
    let thisWrongEver = false;
    for (const ind of run.final) {
      const best = sc.trueBest[ind.industry] ?? null;
      for (const a of ind.arms) {
        if (a.verdict !== 'gewinner') continue;
        if (best && a.arm === best) thisCorrect = true;
        else thisWrong = true;
      }
      if (best) {
        const s = ind.arms.find((a) => a.arm === best)?.share;
        if (s !== undefined) finalShares.push(s);
      }
      for (const a of ind.arms) {
        const k = `${ind.industry}/${a.arm}`;
        spans[k] = (spans[k] ?? 0) + (a.scan.hi - a.scan.lo) * 100;
      }
    }
    run.weekly.forEach((week, wi) => {
      for (const ind of week) {
        const best = sc.trueBest[ind.industry] ?? null;
        for (const a of ind.arms) {
          if (a.verdict !== 'gewinner') continue;
          if (best && a.arm === best) {
            if (!firstCorrect[r]) firstCorrect[r] = wi + 1;
          } else thisWrongEver = true;
        }
      }
    });
    for (const [k, v] of Object.entries(run.letters)) letters[k] = (letters[k] ?? 0) + v;
    if (thisCorrect) correct++;
    if (thisWrong) wrong++;
    if (thisWrongEver) wrongEver++;
  }
  const fc = firstCorrect.filter((x) => x);
  return {
    scenario: sc,
    runs,
    correctWinnerAtEnd: correct / runs,
    wrongWinnerAtEnd: wrong / runs,
    wrongWinnerEver: wrongEver / runs,
    meanWeekFirstCorrect: fc.length ? fc.reduce((s, x) => s + x, 0) / fc.length : null,
    meanFinalShareOfBest: finalShares.length ? finalShares.reduce((s, x) => s + x, 0) / finalShares.length : null,
    meanLetters: Object.fromEntries(Object.entries(letters).map(([k, v]) => [k, v / runs])),
    meanScanSpan: Object.fromEntries(Object.entries(spans).map(([k, v]) => [k, v / runs])),
  };
}

/** Die drei Abnahme-Szenarien (B9, L5). */
export const SIM_SCENARIOS: SimScenario[] = [
  {
    id: 'klarer-gewinner',
    title: 'Klarer Gewinner',
    description:
      'Handwerk: Kontrolle 3 % Scan-Rate, Variante mit Statistik 6 %; Käufe 0,4 % bzw. 0,8 %. 60 Briefe pro Woche in der Branche, 20 Wochen.',
    weeks: 20,
    industries: [
      {
        industry: 'handwerk',
        lettersPerWeek: 60,
        arms: [
          { arm: 'kontrolle', isControl: true, trueScan: 0.03, truePurchase: 0.004 },
          { arm: 'variante', isControl: false, trueScan: 0.06, truePurchase: 0.008 },
        ],
      },
    ],
    trueBest: { handwerk: 'variante' },
  },
  {
    id: 'kein-unterschied',
    title: 'Kein Unterschied',
    description:
      'Beauty: Kontrolle und Variante beide 4 % Scan-Rate und 0,5 % Kaufrate. 60 Briefe pro Woche, 20 Wochen. Jeder ausgerufene Gewinner ist falsch.',
    weeks: 20,
    industries: [
      {
        industry: 'beauty',
        lettersPerWeek: 60,
        arms: [
          { arm: 'kontrolle', isControl: true, trueScan: 0.04, truePurchase: 0.005 },
          { arm: 'variante', isControl: false, trueScan: 0.04, truePurchase: 0.005 },
        ],
      },
    ],
    trueBest: { beauty: null },
  },
  {
    id: 'erste-charge',
    title: 'Erste Charge (zu wenig Daten)',
    description:
      'Wie die erste echte Charge (B10): je Branche ca. 13 Briefe pro Woche, 4 Wochen; Gastronomie 3 % vs. 5 %, Handwerk 4 % vs. 4 %, Beauty 5 % vs. 3 % Scan-Rate. Erwartung: kein Gewinner, nur Tendenzen, breite Spannen.',
    weeks: 4,
    industries: [
      {
        industry: 'gastronomie',
        lettersPerWeek: 14,
        arms: [
          { arm: 'kontrolle', isControl: true, trueScan: 0.03, truePurchase: 0.004 },
          { arm: 'variante', isControl: false, trueScan: 0.05, truePurchase: 0.006 },
        ],
      },
      {
        industry: 'handwerk',
        lettersPerWeek: 13,
        arms: [
          { arm: 'kontrolle', isControl: true, trueScan: 0.04, truePurchase: 0.005 },
          { arm: 'variante', isControl: false, trueScan: 0.04, truePurchase: 0.005 },
        ],
      },
      {
        industry: 'beauty',
        lettersPerWeek: 13,
        arms: [
          { arm: 'kontrolle', isControl: true, trueScan: 0.05, truePurchase: 0.005 },
          { arm: 'variante', isControl: false, trueScan: 0.03, truePurchase: 0.004 },
        ],
      },
    ],
    trueBest: { gastronomie: 'variante', handwerk: null, beauty: 'kontrolle' },
  },
];
