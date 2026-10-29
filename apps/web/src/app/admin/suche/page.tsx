import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { getConfig, getDb, leadScorePool } from '@wbm/core';
import { SubmitButton } from '@/components/admin/submit-button';
import { Card, Notice, PageHeader, btn, input } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, num } from '@/lib/format';
import { SearchLive } from '@/components/admin/search-live';
import { loadLeadSearchStatus } from '@/lib/lead-search';
import { applyMinScore, startFindLeads, stopFindLeads } from '../jobs/actions';

export const metadata = { title: 'Betriebe suchen' };

const GROUP_LABELS: Record<string, string> = {
  handwerk: 'Handwerk',
  beauty: 'Beauty',
  gastronomie: 'Gastronomie',
  einzelhandel: 'Einzelhandel',
  kurse: 'Kurse & Training',
};

type LastRun = {
  state: string;
  created_on: Date;
  completed_on: Date | null;
  output: {
    found?: number;
    created?: number;
    updated?: number;
    qualified?: number;
    needsReview?: number;
    belowMin?: number;
    minScore?: number;
    rejected?: number;
    queries?: number;
    errors?: string[];
  } | null;
};

export default async function LeadSearchPage() {
  await requireAdmin();
  const [cfg, status, last] = await Promise.all([
    getConfig(),
    loadLeadSearchStatus(),
    getDb()
      .execute<LastRun>(
        sql`SELECT state, created_on, completed_on, output FROM pgboss.job
            WHERE name = 'find-leads' AND state IN ('completed', 'failed') ORDER BY completed_on DESC NULLS LAST LIMIT 1`,
      )
      .then((r) => r.rows[0])
      .catch(() => undefined),
  ]);
  const running = status.active > 0 || status.waiting > 0;
  const minScore = cfg.filters.minLeadScore;
  const pool = await leadScorePool(minScore).catch(() => ({ above: 0, below: 0, best: 0 }));
  const branches = cfg.targeting.branches.filter((b) => b.active);
  const groups = [...new Set(branches.map((b) => b.group))];
  const out = last?.output ?? null;
  const toCheck = (out?.qualified ?? 0) + (out?.needsReview ?? 0);
  // Die Live-Karte zeigt das Ergebnis der letzten Stunden selbst an
  const recentProgress = Boolean(
    status.progress && Date.parse(status.now) - Date.parse(status.progress.updatedAt) < 6 * 3600_000,
  );
  return (
    <>
      <PageHeader title="Betriebe suchen" subtitle="Findet Betriebe ohne eigene Website. Kostet nichts." />

      <SearchLive initial={status} stop={stopFindLeads} />

      {last?.completed_on && !recentProgress ? (
        <div className="mb-6">
          <Notice kind={last.state === 'failed' ? 'warn' : 'success'}>
            {last.state === 'failed' ? (
              <>Die letzte Suche ({dt(last.completed_on)}) hat nicht geklappt. Starte sie einfach noch einmal.</>
            ) : (
              <>
                Letzte Suche {dt(last.completed_on)}: <strong>{num(toCheck)}</strong>{' '}
                {toCheck === 1 ? 'passender Betrieb' : 'passende Betriebe'} gefunden.{' '}
                {toCheck ? (
                  <Link href="/admin/ablauf/pruefen" className="font-semibold underline">
                    Jetzt prüfen →
                  </Link>
                ) : null}
              </>
            )}
          </Notice>
        </div>
      ) : null}

      <Card title="Neue Suche">
        <form action={startFindLeads} className="space-y-6">
          <fieldset>
            <legend className="ui-label">Wo?</legend>
            <div className="admin-pills">
              {cfg.targeting.cities.map((c, i) => (
                <label key={c} className="admin-pill">
                  {/* Vorauswahl nur die erste Stadt: jede weitere Stadt verlängert die Suche */}
                  <input type="checkbox" name="cities" value={c} defaultChecked={i === 0} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <details className="admin-details">
            <summary>Welche Branchen? (alle ausgewählt)</summary>
            <div className="mt-3 space-y-4">
              {groups.map((g) => (
                <fieldset key={g}>
                  <legend className="ui-label">{GROUP_LABELS[g] ?? g}</legend>
                  <div className="admin-pills">
                    {branches
                      .filter((b) => b.group === g)
                      .map((b) => (
                        <label key={b.key} className="admin-pill">
                          <input type="checkbox" name="branches" value={b.key} defaultChecked />
                          <span>{b.label}</span>
                        </label>
                      ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </details>
          <details className="admin-details">
            <summary>Wie streng? (ab {minScore} von 100 Punkten)</summary>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  name="minScore"
                  min={0}
                  max={100}
                  step={5}
                  defaultValue={minScore}
                  className={`${input} !w-24`}
                  aria-label="Mindest-Punkte"
                />
                <span className="text-sm text-slate-600">
                  Höher = weniger, aber passendere Betriebe. 0 = alle übernehmen. Wird gemerkt.
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Gerade offen: <strong>{num(pool.above)}</strong> Betriebe ab {minScore} Punkten,{' '}
                <strong>{num(pool.below)}</strong> darunter (bester Wert {pool.best}).
              </p>
            </div>
          </details>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-500">Die erste Suche dauert 5–10 Minuten, danach geht es schnell.</p>
            <SubmitButton className={btn.primary} disabled={running}>
              Suche starten
            </SubmitButton>
          </div>
        </form>
      </Card>
      {pool.below > 0 ? (
        <details className="admin-details mt-6">
          <summary>Aufräumen</summary>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">
              {num(pool.below)} offene Betriebe liegen unter {minScore} Punkten.
            </p>
            <form action={applyMinScore}>
              <SubmitButton className={btn.secondary}>Diese aussortieren</SubmitButton>
            </form>
          </div>
        </details>
      ) : null}
      {out?.errors?.length ? (
        <details className="admin-details mt-4">
          <summary>Technische Hinweise der letzten Suche</summary>
          <p className="mt-2 text-xs text-slate-600">{out.errors.slice(0, 5).join(' · ')}</p>
        </details>
      ) : null}
    </>
  );
}
