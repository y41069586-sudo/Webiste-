import Link from 'next/link';
import {
  costWeeks,
  currentAllocations,
  effectiveSwitches,
  evaluateIndustries,
  funnelRows,
  getConfig,
  getEnv,
  recentSafetyActions,
  sampleSizePerArm,
  VERDICT_LABEL,
  type ArmVerdict,
  type PowerResult,
  type RateInterval,
} from '@wbm/core';
import { Badge, Card, Notice, PageHeader, Stat, Table, Td, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur, num, pct } from '@/lib/format';
import { applyAllocationsAction, reactivateVariantAction } from './actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Optimizer' };
export const dynamic = 'force-dynamic';

const span = (i: RateInterval, d = 1) => `${pct(i.lo, d)} – ${pct(i.hi, d)}`;

const VERDICT_COLOR: Record<ArmVerdict, 'gray' | 'green' | 'red' | 'yellow' | 'blue' | 'purple'> = {
  kontrolle: 'blue',
  gewinner: 'green',
  schlechter: 'red',
  tendenz_besser: 'purple',
  tendenz_schlechter: 'yellow',
  offen: 'gray',
  zu_wenig_daten: 'gray',
};

const INDUSTRY_LABEL: Record<string, string> = {
  gastronomie: 'Gastronomie',
  handwerk: 'Handwerk',
  beauty: 'Beauty',
  einzelhandel: 'Einzelhandel',
  kurse_training: 'Kurse & Training',
  dienstleistung: 'Dienstleistung',
};

const SAFETY_LABEL: Record<string, string> = {
  opt_out: 'Opt-out-Bremse',
  complaint: 'Beschwerde-Bremse',
  undeliverable: 'Unzustellbar-Bremse',
  cost: 'Kostenbremse',
};

function parsePercent(v: string | undefined, fallback: number): number {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 100 ? n / 100 : fallback;
}

export default async function OptimizerPage({
  searchParams,
}: {
  searchParams: Promise<{ p1?: string; p2?: string; proWoche?: string; alpha?: string; power?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const cfg = await getConfig();
  const sw = effectiveSwitches(cfg);
  const [evals, allocs, byIndustry, safety, weeks] = await Promise.all([
    evaluateIndustries(),
    currentAllocations(),
    funnelRows({ groupBy: ['industry'] }),
    recentSafetyActions(15),
    costWeeks(),
  ]);

  // Power-Rechner (B6.3)
  const p1 = parsePercent(sp.p1, 0.02);
  const p2 = parsePercent(sp.p2, 0.03);
  const perWeek = Math.max(0, Math.round(Number(sp.proWoche ?? 7) || 0));
  const alpha = parsePercent(sp.alpha, 0.05);
  const power = parsePercent(sp.power, 0.8);
  let powerResult: PowerResult | null = null;
  let powerError = '';
  try {
    powerResult = sampleSizePerArm({ p1, p2, alpha, power, lettersPerWeekPerArm: perWeek });
  } catch {
    powerError = 'Bitte zwei verschiedene Raten zwischen 0 und 100 % angeben.';
  }

  return (
    <>
      <PageHeader
        title="Optimizer & Statistik"
        subtitle={`Bayes-Modell mit Partial Pooling (Gesamt → Branche → Variante). Spannen mit 90 % Wahrscheinlichkeit. „Gewinner“ erst bei P(besser als Kontrolle) ≥ 90 % und ${num(getEnv().MIN_LETTERS_PER_ARM)} zugestellten Briefen je Arm.`}
        actions={
          <form action={applyAllocationsAction}>
            <SubmitButton type="submit" className={btn.primary}>
              Zuteilung jetzt berechnen und übernehmen
            </SubmitButton>
          </form>
        }
      />
      <div className="mb-6 space-y-3">
        {sw.sendingPaused ? (
          <Notice kind="error">
            Versand pausiert (Sicherheitsnetz). Lead-Qualität prüfen, dann unter{' '}
            <Link className="underline" href="/admin/settings">
              Einstellungen
            </Link>{' '}
            „Versand pausiert“ ausschalten.
          </Notice>
        ) : null}
        <Notice>
          Kontrolle je Branche mindestens {pct(Math.max(0.15, cfg.optimizer.controlShare), 0)}, Exploration mindestens{' '}
          {pct(Math.max(0.2, cfg.optimizer.explorationShare), 0)}. Solange ein Arm weniger als{' '}
          {num(cfg.optimizer.minLettersForSignal)} Briefe hat: Gleichverteilung. Gesteuert wird über die Scan-Rate, bis jeder Arm
          5 Käufe hat, danach über den Umsatz pro Brief. Der Wochenlauf übernimmt die Zuteilung nur mit AUTO_OPTIMIZE (
          {sw.autoOptimize ? 'an' : 'aus'}); sonst hier per Knopf.
        </Notice>
      </div>

      {evals.length === 0 ? <Notice kind="warn">Noch keine nutzbaren Briefvarianten.</Notice> : null}
      <div className="space-y-6">
        {evals.map((ind) => {
          const f = byIndustry.find((r) => r.industry === ind.industry);
          const best = [...ind.arms].filter((a) => a.eligible && a.pBest !== null).sort((a, b) => b.pBest! - a.pBest!)[0];
          const alloc = allocs.get(ind.industry);
          return (
            <Card
              key={ind.industry}
              title={`${INDUSTRY_LABEL[ind.industry] ?? ind.industry} – Steuerung über ${ind.signal === 'scan' ? 'Scan-Rate' : 'Umsatz pro Brief'}${ind.equalSplit ? ' (noch Gleichverteilung)' : ''}`}
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Scan-Rate Branche"
                  value={span(ind.pooled.scan)}
                  hint={`${num(f?.delivered)} zugestellt, ${num(f?.scans)} Scans`}
                />
                <Stat
                  label="Kaufrate Branche"
                  value={span(ind.pooled.purchase, 2)}
                  hint={`${num(f?.evaluated)} ausgewertet, ${num(f?.purchases_evaluated)} Käufe`}
                />
                <Stat
                  label="Kosten pro Kauf"
                  value={f && f.purchases ? eur(Math.round(f.cost_cents / f.purchases)) : '–'}
                  hint={`Kosten ${eur(f?.cost_cents ?? 0)}`}
                />
                <Stat
                  label="Beste Variante"
                  value={<span className="text-base">{best ? (best.label ?? best.arm) : '–'}</span>}
                  hint={best ? `${VERDICT_LABEL[best.verdict]} · P(bester) ${pct(best.pBest, 0)}` : undefined}
                />
              </div>
              <Table
                head={[
                  'Variante',
                  'zugestellt',
                  'Scans',
                  'Scan-Rate (Spanne)',
                  'Käufe / ausgewertet',
                  'Kaufrate (Spanne)',
                  'P(besser als Kontrolle)',
                  'Urteil',
                  'Anteil neu',
                  'Anteil aktuell',
                ]}
              >
                {ind.arms.map((a) => (
                  <tr key={a.arm}>
                    <Td>
                      <div className="font-medium">{a.label ?? a.arm}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {a.isControl ? <Badge color="blue">Kontrolle</Badge> : null}
                        {!a.eligible ? <Badge color="yellow">nicht aktiv</Badge> : null}
                      </div>
                      {!a.eligible ? (
                        <form action={reactivateVariantAction} className="mt-1">
                          <input type="hidden" name="id" value={a.arm} />
                          <SubmitButton type="submit" className="text-xs text-brand-700 underline">
                            wieder aktivieren
                          </SubmitButton>
                        </form>
                      ) : null}
                    </Td>
                    <Td>{num(a.delivered)}</Td>
                    <Td>
                      {num(a.scans)}
                      <div className="text-xs text-slate-500">roh {pct(a.delivered ? a.scans / a.delivered : null)}</div>
                    </Td>
                    <Td className="whitespace-nowrap">{a.delivered ? span(a.scan) : '–'}</Td>
                    <Td>
                      {num(a.purchases)} / {num(a.evaluated)}
                    </Td>
                    <Td className="whitespace-nowrap">{a.evaluated ? span(a.purchase, 2) : 'noch nicht ausgewertet'}</Td>
                    <Td>{a.isControl ? '–' : pct(a.pBetterThanControl, 0)}</Td>
                    <Td>
                      <Badge color={VERDICT_COLOR[a.verdict]}>{VERDICT_LABEL[a.verdict]}</Badge>
                    </Td>
                    <Td>{pct(a.share, 0)}</Td>
                    <Td>{alloc ? pct(alloc.get(a.arm) ?? 0, 0) : 'Gewichte'}</Td>
                  </tr>
                ))}
              </Table>
            </Card>
          );
        })}

        <div id="power" className="scroll-mt-6">
          <Card title="Power-Rechner">
            <form method="get" className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className={label} htmlFor="p1">
                  Rate Kontrolle (%)
                </label>
                <input
                  id="p1"
                  name="p1"
                  className={input}
                  defaultValue={String(p1 * 100).replace('.', ',')}
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className={label} htmlFor="p2">
                  erwartete Rate Variante (%)
                </label>
                <input
                  id="p2"
                  name="p2"
                  className={input}
                  defaultValue={String(p2 * 100).replace('.', ',')}
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className={label} htmlFor="proWoche">
                  Briefe pro Woche je Variante
                </label>
                <input id="proWoche" name="proWoche" className={input} defaultValue={String(perWeek)} inputMode="numeric" />
              </div>
              <div>
                <label className={label} htmlFor="alpha">
                  Irrtum (%, zweiseitig)
                </label>
                <input id="alpha" name="alpha" className={input} defaultValue={String(alpha * 100)} inputMode="decimal" />
              </div>
              <div>
                <label className={label} htmlFor="power">
                  Teststärke (%)
                </label>
                <input id="power" name="power" className={input} defaultValue={String(power * 100)} inputMode="decimal" />
              </div>
              <div className="sm:col-span-2 lg:col-span-5">
                <SubmitButton type="submit" className={btn.secondary}>
                  Berechnen
                </SubmitButton>
              </div>
            </form>
            {powerResult ? (
              <p className="text-sm">
                Um einen Unterschied von <strong>{pct(p1)}</strong> auf <strong>{pct(p2)}</strong> sicher zu erkennen, brauchst du
                ca. <strong>{num(powerResult.perArm)} Briefe pro Variante</strong> ({num(powerResult.total)} insgesamt)
                {powerResult.weeks !== null ? (
                  <>
                    {' '}
                    – bei {num(perWeek)} Briefen pro Woche und Variante etwa <strong>{num(powerResult.weeks)} Wochen</strong>
                  </>
                ) : null}
                .
              </p>
            ) : (
              <Notice kind="warn">{powerError}</Notice>
            )}
          </Card>
        </div>

        <Card title="Kostenbremse (Kosten pro Kauf, ausgewertete Versandwochen)">
          <p className="mb-3 text-sm text-slate-600">
            Grenze {eur(getEnv().MAX_CAC_CENTS)} (MAX_CAC_CENTS), gleitend über 12 Wochen. Vier Wochen in Folge darüber →
            Wochenbudget wird halbiert (aktuell {eur(cfg.budget.weeklyBudgetCents)}).
          </p>
          <Table
            head={['Woche', 'Kosten', 'Käufe', 'Kosten pro Kauf (12 Wochen)', 'über Grenze']}
            empty="Noch keine ausgewerteten Wochen."
          >
            {weeks.slice(-8).map((w) => (
              <tr key={w.week}>
                <Td>{w.week}</Td>
                <Td>{eur(w.costCents)}</Td>
                <Td>{num(w.purchases)}</Td>
                <Td>{w.trailingCacCents !== null ? eur(w.trailingCacCents) : 'noch kein Kauf'}</Td>
                <Td>{w.over ? <Badge color="red">ja</Badge> : <Badge color="green">nein</Badge>}</Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Sicherheitsnetze – ausgelöst">
          <Table head={['Zeit', 'Netz', 'Aktion', 'Details']} empty="Bisher nicht ausgelöst.">
            {safety.map((a) => (
              <tr key={a.id}>
                <Td className="whitespace-nowrap">{dt(a.createdAt)}</Td>
                <Td>{SAFETY_LABEL[a.kind] ?? a.kind}</Td>
                <Td>{a.action}</Td>
                <Td className="text-xs text-slate-600">
                  {Object.entries(a.context)
                    .filter(([k]) => k !== 'weeks')
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(' · ')}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
