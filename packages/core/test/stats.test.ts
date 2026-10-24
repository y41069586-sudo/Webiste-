import { describe, expect, it } from 'vitest';
import {
  betaCdf,
  betaInterval,
  betaQuantile,
  estimateConcentration,
  nextByQuota,
  normalQuantile,
  poolHierarchy,
  sampleSizePerArm,
  seededRandom,
  thompsonShares,
  verdictFor,
} from '../src/stats/bayes';
import { evaluateArms, type ArmData } from '../src/stats/model';
import { SIM_SCENARIOS, summarizeScenario } from '../src/stats/simulate';

describe('Beta-Verteilung', () => {
  it('Verteilungsfunktion und Quantile stimmen mit bekannten Werten überein', () => {
    expect(betaCdf(0.5, 1, 1)).toBeCloseTo(0.5, 10);
    expect(betaCdf(0.3, 2, 5)).toBeCloseTo(0.579825, 5);
    expect(betaQuantile(0.5, 2, 2)).toBeCloseTo(0.5, 8);
    expect(betaQuantile(betaCdf(0.07, 3, 60), 3, 60)).toBeCloseTo(0.07, 8);
  });

  it('Spanne statt Einzelwert: 3 Scans bei 50 Briefen → breite 90-%-Spanne um 6 %', () => {
    const i = betaInterval(1 + 3, 1 + 47, 0.9);
    expect(i.mean).toBeCloseTo(4 / 52, 6);
    expect(i.lo).toBeGreaterThan(0.02);
    expect(i.lo).toBeLessThan(0.04);
    expect(i.hi).toBeGreaterThan(0.12);
    expect(i.hi).toBeLessThan(0.16);
  });

  it('Normalquantile', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 5);
    expect(normalQuantile(0.8)).toBeCloseTo(0.841621, 5);
    expect(normalQuantile(0.01)).toBeCloseTo(-2.326348, 5);
  });
});

describe('Partial Pooling', () => {
  it('5 Briefe in einer kleinen Branche erzeugen keine Fantasiewerte', () => {
    const r = poolHierarchy([
      { group: 'klein', arm: 'a', n: 5, x: 2 },
      { group: 'gross', arm: 'b', n: 400, x: 16 },
      { group: 'gross', arm: 'c', n: 400, x: 12 },
    ]);
    const small = r.arms.find((a) => a.arm === 'a')!;
    // roh 40 %, gepoolt nahe am Gesamtmittel (~3,7 %), aber etwas darüber
    expect(small.interval.mean).toBeLessThan(0.15);
    expect(small.interval.mean).toBeGreaterThan(r.global.interval.mean);
  });

  it('große Unterschiede setzen sich mit genug Briefen durch', () => {
    const r = poolHierarchy([
      { group: 'h', arm: 'kontrolle', n: 1500, x: 45 },
      { group: 'h', arm: 'variante', n: 1500, x: 90 },
      { group: 'b', arm: 'x', n: 1500, x: 60 },
    ]);
    const k = r.arms.find((a) => a.arm === 'kontrolle')!.interval;
    const v = r.arms.find((a) => a.arm === 'variante')!.interval;
    expect(v.mean - k.mean).toBeGreaterThan(0.02);
    expect(v.lo).toBeGreaterThan(k.hi);
  });

  it('Konzentration: gleiche Gruppen → starkes Pooling, sehr verschiedene → schwach', () => {
    const same = estimateConcentration(
      [
        { n: 1000, x: 40 },
        { n: 1000, x: 41 },
      ],
      0.04,
    );
    const diff = estimateConcentration(
      [
        { n: 1000, x: 10 },
        { n: 1000, x: 100 },
      ],
      0.055,
    );
    expect(same).toBeGreaterThan(diff);
    expect(diff).toBeGreaterThanOrEqual(10);
    expect(same).toBeLessThanOrEqual(200);
  });
});

describe('Thompson Sampling mit Kontrolle und Exploration', () => {
  it('Kontrolle ≥ 15 %, jeder Arm ≥ Exploration/k, Summe 1', () => {
    const res = thompsonShares(
      [
        { arm: 'k', isControl: true, alpha: 3, beta: 300 },
        { arm: 'a', isControl: false, alpha: 30, beta: 300 },
        { arm: 'b', isControl: false, alpha: 3, beta: 300 },
      ],
      { controlShare: 0.15, exploration: 0.2, samples: 4000, rng: seededRandom(1) },
    );
    const sum = res.reduce((s, r) => s + r.share, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(res.find((r) => r.arm === 'k')!.share).toBeGreaterThanOrEqual(0.15);
    for (const r of res) expect(r.share).toBeGreaterThanOrEqual(0.2 / 3 - 1e-9);
    expect(res.find((r) => r.arm === 'a')!.share).toBeGreaterThan(0.6);
    expect(res.find((r) => r.arm === 'a')!.pBetterThanControl).toBeGreaterThan(0.99);
    expect(res.find((r) => r.arm === 'k')!.pBetterThanControl).toBeNull();
  });

  it('kleinere Werte in der Config werden auf die Mindestanteile angehoben', () => {
    const res = thompsonShares(
      [
        { arm: 'k', isControl: true, alpha: 1, beta: 1000 },
        { arm: 'a', isControl: false, alpha: 100, beta: 100 },
      ],
      { controlShare: 0, exploration: 0, samples: 1000, rng: seededRandom(2) },
    );
    expect(res.find((r) => r.arm === 'k')!.share).toBeCloseTo(0.15 + 0.1, 6);
  });

  it('Quote: 13 Briefe bei 50/50 → 7/6; Kontrolle mit 15 % bekommt auch bei 13 Briefen 2', () => {
    const assigned: Record<string, number> = {};
    for (let i = 0; i < 13; i++) {
      const a = nextByQuota(
        [
          { arm: 'k', share: 0.5 },
          { arm: 'v', share: 0.5 },
        ],
        assigned,
        i / 13,
      );
      assigned[a] = (assigned[a] ?? 0) + 1;
    }
    expect([assigned.k, assigned.v].sort()).toEqual([6, 7]);
    const b: Record<string, number> = {};
    for (let i = 0; i < 13; i++) {
      const a = nextByQuota(
        [
          { arm: 'k', share: 0.15 },
          { arm: 'v', share: 0.85 },
        ],
        b,
        0.5,
      );
      b[a] = (b[a] ?? 0) + 1;
    }
    expect(b.k).toBe(2);
  });
});

describe('Entscheidungsregel und Modell', () => {
  it('Gewinner erst ab P ≥ 90 % und 100 Briefen je Arm, davor Tendenz', () => {
    expect(verdictFor(0.95, 99, 300, 100)).toBe('tendenz_besser');
    expect(verdictFor(0.95, 100, 100, 100)).toBe('gewinner');
    expect(verdictFor(0.89, 500, 500, 100)).toBe('offen');
    expect(verdictFor(0.04, 500, 500, 100)).toBe('schlechter');
    expect(verdictFor(0.07, 50, 50, 100)).toBe('tendenz_schlechter');
    expect(verdictFor(null, 50, 50, 100)).toBe('kontrolle');
  });

  const base = (o: Partial<ArmData>): ArmData => ({
    industry: 'handwerk',
    arm: 'x',
    isControl: false,
    eligible: true,
    delivered: 0,
    scans: 0,
    evaluated: 0,
    purchases: 0,
    ...o,
  });
  const opts = {
    controlShare: 0.15,
    exploration: 0.2,
    samples: 2000,
    rng: seededRandom(3),
    minPerArm: 100,
    minLettersForSignal: 10,
  };

  it('Erste Charge: Gleichverteilung 50/50, Scan-Rate als Signal', () => {
    const [ev] = evaluateArms([base({ arm: 'k', isControl: true }), base({ arm: 'v' })], opts);
    expect(ev!.equalSplit).toBe(true);
    expect(ev!.signal).toBe('scan');
    expect(ev!.arms.map((a) => a.share)).toEqual([0.5, 0.5]);
  });

  it('Ab 5 Käufen je Arm steuert der Umsatz pro Brief; pausierte Arme bekommen 0 %', () => {
    const evs = evaluateArms(
      [
        base({
          arm: 'k',
          isControl: true,
          delivered: 600,
          scans: 24,
          evaluated: 600,
          purchases: 5,
          valuePerPurchaseCents: 59000,
        }),
        base({ arm: 'v', delivered: 600, scans: 24, evaluated: 600, purchases: 6, valuePerPurchaseCents: 118000 }),
        base({ arm: 'p', eligible: false, delivered: 50, scans: 1 }),
      ],
      opts,
    );
    const ev = evs[0]!;
    expect(ev.signal).toBe('umsatz');
    expect(ev.equalSplit).toBe(false);
    expect(ev.arms.find((a) => a.arm === 'p')!.share).toBe(0);
    // höherer Umsatz je Kauf (Monatsplan) → Variante bekommt mehr
    expect(ev.arms.find((a) => a.arm === 'v')!.share).toBeGreaterThan(ev.arms.find((a) => a.arm === 'k')!.share - 0.15);
  });
});

describe('Power-Rechner', () => {
  it('2 % → 3 % Scan-Rate: rund 3.800 Briefe je Variante (5 %, 80 %)', () => {
    const r = sampleSizePerArm({ p1: 0.02, p2: 0.03, lettersPerWeekPerArm: 20 });
    expect(r.perArm).toBeGreaterThan(3700);
    expect(r.perArm).toBeLessThan(3900);
    expect(r.weeks).toBe(Math.ceil(r.perArm / 20));
  });
  it('größere Unterschiede brauchen weniger Briefe', () => {
    expect(sampleSizePerArm({ p1: 0.03, p2: 0.06 }).perArm).toBeLessThan(sampleSizePerArm({ p1: 0.03, p2: 0.04 }).perArm);
  });
});

describe('Simulation (Abnahme L5)', () => {
  const o = { minPerArm: 100, minLettersForSignal: 10, controlShare: 0.15, exploration: 0.2, samples: 800 };

  it('Klarer Gewinner: meist gefunden, nie ein falscher Gewinner, Verteilung verschiebt sich', () => {
    const s = summarizeScenario(SIM_SCENARIOS[0]!, 30, o);
    expect(s.correctWinnerAtEnd).toBeGreaterThanOrEqual(0.6);
    expect(s.wrongWinnerEver).toBe(0);
    expect(s.meanFinalShareOfBest!).toBeGreaterThan(0.55);
  }, 60_000);

  it('Kein Unterschied: selten ein (falscher) Gewinner am Ende', () => {
    const s = summarizeScenario(SIM_SCENARIOS[1]!, 30, o);
    expect(s.wrongWinnerAtEnd).toBeLessThanOrEqual(0.15);
  }, 60_000);

  it('Erste Charge: nie ein Gewinner – zu wenig Daten', () => {
    const s = summarizeScenario(SIM_SCENARIOS[2]!, 30, o);
    expect(s.correctWinnerAtEnd).toBe(0);
    expect(s.wrongWinnerEver).toBe(0);
  }, 60_000);
});

describe('Umsatz-Signal ohne Umsatzwerte (Regression)', () => {
  it('jeder Kauf zählt gleich – P(besser) bleibt sinnvoll', () => {
    const arms: ArmData[] = [
      { industry: 'h', arm: 'k', isControl: true, eligible: true, delivered: 400, scans: 12, evaluated: 400, purchases: 5 },
      { industry: 'h', arm: 'v', isControl: false, eligible: true, delivered: 400, scans: 24, evaluated: 400, purchases: 12 },
    ];
    const [ev] = evaluateArms(arms, {
      controlShare: 0.15,
      exploration: 0.2,
      samples: 2000,
      rng: seededRandom(5),
      minPerArm: 100,
      minLettersForSignal: 10,
    });
    expect(ev!.signal).toBe('umsatz');
    expect(ev!.arms.find((a) => a.arm === 'v')!.pBetterThanControl!).toBeGreaterThan(0.8);
  });
});
