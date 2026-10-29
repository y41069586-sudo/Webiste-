import { sql } from 'drizzle-orm';
import { getConfig, getDb, leadScorePool } from '@wbm/core';
import { SubmitButton } from '@/components/admin/submit-button';
import { Card, Notice, PageHeader, Stat, btn, input } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, num } from '@/lib/format';
import { SearchLive } from '@/components/admin/search-live';
import { loadLeadSearchStatus } from '@/lib/lead-search';
import { applyMinScore, startFindLeads, stopFindLeads } from '../jobs/actions';

export const metadata = { title: 'Lead-Suche' };

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
  return (
    <>
      <PageHeader
        title="Lead-Suche"
        subtitle="Betriebe ohne eigene Website finden. Die Suche läuft auf deinem Server und kostet mit OpenStreetMap nichts."
      />

      <SearchLive initial={status} stop={stopFindLeads} />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat
          label="Letzte Suche"
          value={last?.completed_on ? dt(last.completed_on) : '–'}
          hint={last?.state === 'failed' ? 'fehlgeschlagen' : undefined}
        />
        <Stat
          label="Gefunden"
          value={num(out?.found ?? 0)}
          hint={out ? `${num(out.created ?? 0)} neu · ${num(out.updated ?? 0)} aktualisiert` : undefined}
        />
        <Stat
          label="Übernommen"
          value={num((out?.qualified ?? 0) + (out?.needsReview ?? 0))}
          hint={out?.minScore !== undefined ? `ab ${out.minScore} Punkten, ohne eigene Website` : 'ohne eigene Website'}
        />
        <Stat
          label="Aussortiert"
          value={num((out?.rejected ?? 0) + (out?.belowMin ?? 0))}
          hint={out?.belowMin ? `${num(out.belowMin)} wegen zu wenig Punkten` : 'Website vorhanden, Kette, geschlossen …'}
        />
      </div>
      {out?.errors?.length ? (
        <div className="mb-6">
          <Notice kind="warn">
            <strong>Hinweise der letzten Suche:</strong> {out.errors.slice(0, 5).join(' · ')}
          </Notice>
        </div>
      ) : null}

      <div className="mb-6">
        <Card title={`Deine offenen Leads ab ${minScore} Punkten`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              <strong className="text-slate-900">{num(pool.above)}</strong> offene Betriebe erreichen mindestens {minScore}{' '}
              Punkte, <strong className="text-slate-900">{num(pool.below)}</strong> liegen darunter (bester Wert: {pool.best}).
              Die Punkte kommen aus der automatischen Vorauswahl: Kampagnenbranche, Telefon, Öffnungszeiten, aktueller Eintrag,
              online aktiv ohne eigene Seite, keine eigene Domain, junger Betrieb.
            </p>
            {pool.below > 0 ? (
              <form action={applyMinScore}>
                <SubmitButton className={btn.secondary}>{num(pool.below)} darunter aussortieren</SubmitButton>
              </form>
            ) : null}
          </div>
        </Card>
      </div>

      <Card title="Neue Suche">
        <form action={startFindLeads} className="space-y-6">
          <fieldset>
            <legend className="ui-label">Städte</legend>
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
          <fieldset>
            <legend className="ui-label">Nur Betriebe übernehmen ab</legend>
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
                von 100 Punkten. Darunter wird der Betrieb aussortiert (0 = alle übernehmen). Wird für die nächsten Suchen
                gemerkt.
              </span>
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-500">
              Quelle: <strong>{cfg.leadSource.mode}</strong>. Die erste Suche lädt die NRW-Karte (ca. 5–10 Minuten), danach geht
              es schnell.
            </p>
            <SubmitButton className={btn.primary} disabled={running}>
              Suche starten
            </SubmitButton>
          </div>
        </form>
      </Card>
    </>
  );
}
