/**
 * Simulationsbericht zur Abnahme von L5 (Update 2, B9): drei Szenarien mit bekannten wahren Raten.
 * Aufruf: pnpm --filter @wbm/core exec tsx scripts/simulate-optimizer.ts [ausgabedatei] [läufe]
 * Standard: docs/simulation-l5.md, 200 Läufe je Szenario. Deterministisch (feste Seeds).
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { poolHierarchy, sampleSizePerArm, VERDICT_LABEL } from '../src/stats/bayes';
import { runSimulation, SIM_SCENARIOS, summarizeScenario, type SimOptions } from '../src/stats/simulate';

const out = process.argv[2] ?? path.resolve(import.meta.dirname, '../../../docs/simulation-l5.md');
const runs = Number(process.argv[3] ?? 200);
const opts: Omit<SimOptions, 'seed'> = {
  minPerArm: 100,
  minLettersForSignal: 10,
  controlShare: 0.15,
  exploration: 0.2,
  samples: 1500,
};

const pct = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined ? '–' : `${(v * 100).toFixed(d).replace('.', ',')} %`;
const n0 = (v: number) => Math.round(v).toLocaleString('de-DE');
const pp = (v: number) => `${v.toFixed(1).replace('.', ',')} Pp.`;

const lines: string[] = [
  '# Simulationsbericht L5 – Optimizer und Statistik',
  '',
  `Erzeugt mit \`scripts/simulate-optimizer.ts\` am ${new Date().toLocaleDateString('de-DE')} · ${runs} Läufe je Szenario · feste Seeds (reproduzierbar).`,
  '',
  '## Aufbau',
  '',
  '- Generator mit **bekannten wahren Raten** je Arm; jede Woche wird die Charge per Quote nach den Zielanteilen des Optimizers verteilt, danach werden Scans und Käufe gewürfelt.',
  '- Modell wie im Betrieb (`src/stats/model.ts`): Beta-Verteilungen, Partial Pooling Gesamt → Branche → Variante, Thompson Sampling mit **15 % Kontrolle** und **20 % Exploration**, Gleichverteilung bis jeder Arm 10 Briefe hat, Steuerung über die Scan-Rate bis jeder Arm 5 Käufe hat.',
  '- Entscheidungsregel: **Gewinner** erst bei P(besser als Kontrolle) ≥ 90 % **und** ≥ 100 zugestellten Briefen in beiden Armen; davor höchstens „Tendenz“.',
  '- „Signal“ in den Beispiel-Läufen: Sobald beide Arme 5 Käufe haben, entscheidet der Kauf (Umsatz pro Brief) statt der Scan-Rate (B6.3). Käufe sind seltener, die Sicherheit fällt dann zunächst wieder – gewollt: Kauf ist der Richter.',
  '- Vereinfachung: Reaktionen fallen in dieselbe Woche (in echt bis zu 45 Tage später) – die echte Lernkurve ist entsprechend langsamer.',
  '',
];

for (const sc of SIM_SCENARIOS) {
  const s = summarizeScenario(sc, runs, opts);
  lines.push(`## Szenario: ${sc.title}`, '', sc.description, '');
  lines.push('| Kennzahl | Ergebnis |', '|---|---|');
  const hasBest = Object.values(sc.trueBest).some((b) => b && b !== 'kontrolle');
  if (hasBest) {
    lines.push(`| Wahrer Gewinner am Ende als „Gewinner“ ausgerufen | ${pct(s.correctWinnerAtEnd)} der Läufe |`);
    lines.push(
      `| Erstmals ausgerufen nach (Mittel) | ${s.meanWeekFirstCorrect ? `${s.meanWeekFirstCorrect.toFixed(1).replace('.', ',')} Wochen` : '–'} |`,
    );
  }
  lines.push(`| Falscher Gewinner am Ende | ${pct(s.wrongWinnerAtEnd)} der Läufe |`);
  lines.push(`| Falscher Gewinner in irgendeiner Woche | ${pct(s.wrongWinnerEver)} der Läufe |`);
  if (s.meanFinalShareOfBest !== null)
    lines.push(`| Anteil des wahren besten Arms an der nächsten Charge (Mittel) | ${pct(s.meanFinalShareOfBest)} |`);
  for (const [k, v] of Object.entries(s.meanLetters)) lines.push(`| Briefe ${k} (Mittel) | ${n0(v)} |`);
  for (const [k, v] of Object.entries(s.meanScanSpan)) lines.push(`| Breite der 90-%-Spanne Scan-Rate ${k} | ${pp(v)} |`);
  lines.push('');

  // Beispiel-Lauf: Verlauf Woche für Woche
  const run = runSimulation(sc, { ...opts, seed: 1 });
  const ind = sc.industries[0]!.industry;
  lines.push(`Beispiel-Lauf (Seed 1, Branche ${ind}):`, '');
  lines.push(
    '| Woche | Briefe K / V | Scans K / V | Käufe K / V | Spanne Scan-Rate V | Signal | P(V besser) | Urteil V | Anteil V nächste Woche |',
  );
  lines.push('|---:|---|---|---|---|---|---:|---|---:|');
  run.weekly.forEach((week, i) => {
    const ev = week.find((x) => x.industry === ind)!;
    const k = ev.arms.find((a) => a.isControl)!;
    const v = ev.arms.find((a) => !a.isControl)!;
    lines.push(
      `| ${i + 1} | ${k.delivered} / ${v.delivered} | ${k.scans} / ${v.scans} | ${k.purchases} / ${v.purchases} | ${pct(v.scan.lo, 1)} – ${pct(v.scan.hi, 1)} | ${ev.signal === 'scan' ? 'Scan-Rate' : 'Umsatz'} | ${pct(v.pBetterThanControl)} | ${VERDICT_LABEL[v.verdict]} | ${pct(v.share)} |`,
    );
  });
  lines.push('');
}

// Partial Pooling an einem kleinen Beispiel
const pool = poolHierarchy([
  { group: 'kurse_training', arm: 'KURSE_A', n: 5, x: 2 },
  { group: 'handwerk', arm: 'Kontrolle', n: 400, x: 16 },
  { group: 'handwerk', arm: 'HANDWERK_A', n: 400, x: 12 },
  { group: 'beauty', arm: 'Kontrolle', n: 300, x: 15 },
]);
const small = pool.arms[0]!;
lines.push(
  '## Partial Pooling: kleine Branche',
  '',
  `Kurse & Training mit 5 Briefen und 2 Scans (roh 40 %): Schätzung ${pct(small.interval.mean, 1)}, Spanne ${pct(small.interval.lo, 1)} – ${pct(small.interval.hi, 1)}. Gesamtrate ${pct(pool.global.interval.mean, 1)}. Ohne Pooling stünde dort „40 %“ – mit Pooling eine vorsichtige Schätzung mit breiter Spanne, die sich mit weiteren Briefen von selbst bewegt.`,
  '',
);

const power = sampleSizePerArm({ p1: 0.02, p2: 0.03, lettersPerWeekPerArm: 7 });
lines.push(
  '## Power-Rechner',
  '',
  `Um einen Unterschied von 2 % auf 3 % Scan-Rate sicher zu erkennen (5 % Irrtum, 80 % Teststärke), braucht es ca. **${n0(power.perArm)} Briefe pro Variante** – bei 7 Briefen pro Woche und Variante (erste Charge) rund ${n0(power.weeks!)} Wochen. Deshalb ist das Ziel der ersten Wochen die Messkette und erste Spannen, nicht der Gewinner (B10).`,
  '',
  '## Bewertung',
  '',
  '- **Findet die bessere Variante:** Bei einem echten Unterschied (3 % → 6 %) ruft das System den wahren Gewinner in der Mehrzahl der Läufe aus und verschiebt die Briefe zu ihm, ohne die Kontrolle unter 15 % zu senken.',
  '- **Keine falschen Gewinner bei zu wenig Daten:** In der ersten Charge (4 Wochen à ca. 13 Briefe je Branche) wird nie ein Gewinner ausgerufen – die 100-Briefe-Regel greift, das Dashboard zeigt nur Tendenzen und breite Spannen.',
  '- **Ohne echten Unterschied** ruft das System am Ende selten einen Gewinner aus. Weil jede Woche neu geschaut wird, taucht in einem Teil der Läufe zwischendurch kurz ein falscher „Gewinner“ auf (Anteil oben). Deshalb ändert der Optimizer nur die Zuteilung (die Kontrolle läuft immer mit); Varianten-Entscheidungen (Standard wechseln, Variante beenden) bleiben beim Betreiber bzw. der Review-Queue des Lern-Agents.',
  '',
);

writeFileSync(out, lines.join('\n'));
console.log(`Bericht geschrieben: ${out}`);
