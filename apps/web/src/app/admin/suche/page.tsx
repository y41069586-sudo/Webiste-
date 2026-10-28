import { sql } from 'drizzle-orm';
import { getConfig, getDb, queueState, QUEUES } from '@wbm/core';
import { SubmitButton } from '@/components/admin/submit-button';
import { Card, Notice, PageHeader, Stat, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, num } from '@/lib/format';
import { cancelFindLeads, startFindLeads } from '../jobs/actions';

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
    rejected?: number;
    queries?: number;
    errors?: string[];
  } | null;
};

export default async function LeadSearchPage() {
  await requireAdmin();
  const [cfg, search, last] = await Promise.all([
    getConfig(),
    queueState(QUEUES.findLeads).catch(() => ({ waiting: [] as string[], active: 0 })),
    getDb()
      .execute<LastRun>(
        sql`SELECT state, created_on, completed_on, output FROM pgboss.job
            WHERE name = 'find-leads' AND state IN ('completed', 'failed') ORDER BY completed_on DESC NULLS LAST LIMIT 1`,
      )
      .then((r) => r.rows[0])
      .catch(() => undefined),
  ]);
  const running = search.active > 0 || search.waiting.length > 0;
  const branches = cfg.targeting.branches.filter((b) => b.active);
  const groups = [...new Set(branches.map((b) => b.group))];
  const out = last?.output ?? null;
  return (
    <>
      <PageHeader
        title="Lead-Suche"
        subtitle="Betriebe ohne eigene Website finden. Die Suche läuft auf deinem Server und kostet mit OpenStreetMap nichts."
      />

      {running ? (
        <div className="mb-6">
          <Notice kind="info">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <strong>{search.active ? 'Suche läuft gerade.' : 'Suche wartet auf den Start.'}</strong>
                {search.waiting.length ? ` ${search.waiting.length} weitere warten.` : ''} Neue Klicks starten keine zusätzliche
                Suche.
              </span>
              {search.waiting.length ? (
                <form action={cancelFindLeads}>
                  <SubmitButton className={btn.secondary}>Wartende abbrechen</SubmitButton>
                </form>
              ) : null}
            </div>
          </Notice>
        </div>
      ) : null}

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
        <Stat label="Geeignet" value={num(out?.qualified ?? 0)} hint="ohne eigene Website, Anschrift vollständig" />
        <Stat label="Aussortiert" value={num(out?.rejected ?? 0)} hint="Website vorhanden, Kette, geschlossen …" />
      </div>
      {out?.errors?.length ? (
        <div className="mb-6">
          <Notice kind="warn">
            <strong>Hinweise der letzten Suche:</strong> {out.errors.slice(0, 5).join(' · ')}
          </Notice>
        </div>
      ) : null}

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
