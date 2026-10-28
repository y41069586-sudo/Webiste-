import { sql } from 'drizzle-orm';
import { getConfig, getDb, queueState, QUEUES } from '@wbm/core';
import { Badge, Card, PageHeader, Table, Td, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { cancelFindLeads, runJobNow, startFindLeads } from './actions';

export const metadata = { title: 'Jobs & Steuerung' };

type JobRow = {
  id: string;
  name: string;
  state: string;
  created_on: Date;
  completed_on: Date | null;
  retry_count: number;
  output: unknown;
};

export default async function JobsPage() {
  await requireAdmin();
  const [cfg, search] = await Promise.all([
    getConfig(),
    queueState(QUEUES.findLeads).catch(() => ({ waiting: [] as string[], active: 0 })),
  ]);
  const jobs = await getDb()
    .execute<JobRow>(
      sql`SELECT id, name, state, created_on, completed_on, retry_count, output FROM pgboss.job ORDER BY created_on DESC LIMIT 60`,
    )
    .catch(() => ({ rows: [] as JobRow[] }));
  return (
    <>
      <PageHeader title="Jobs & Steuerung" subtitle="Manuelle Starts, letzte Läufe. Alle Jobs prüfen Not-Aus und Budget." />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Lead-Suche starten">
          {search.active || search.waiting.length ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>
                {search.active ? 'Eine Lead-Suche läuft gerade.' : ''}
                {search.waiting.length ? ` ${search.waiting.length} weitere warten.` : ''} Neue Klicks starten keine zusätzliche
                Suche.
              </span>
              {search.waiting.length ? (
                <form action={cancelFindLeads}>
                  <button type="submit" className={btn.secondary}>
                    Wartende Suchen abbrechen
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}
          <form action={startFindLeads} className="space-y-4">
            <fieldset>
              <legend className="mb-1 text-xs font-medium text-slate-600">Städte</legend>
              <div className="flex flex-wrap gap-3">
                {cfg.targeting.cities.map((c) => (
                  <label key={c} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" name="cities" value={c} defaultChecked /> {c}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-xs font-medium text-slate-600">Branchen</legend>
              <div className="flex flex-wrap gap-3">
                {cfg.targeting.branches
                  .filter((b) => b.active)
                  .map((b) => (
                    <label key={b.key} className="flex items-center gap-1 text-sm">
                      <input type="checkbox" name="branches" value={b.key} defaultChecked /> {b.label}
                    </label>
                  ))}
              </div>
            </fieldset>
            <p className="text-xs text-slate-600">
              Quelle: <strong>{cfg.leadSource.mode}</strong> (siehe docs/compliance-google.md). OSM ist kostenlos; Google-Modi
              buchen Kosten ins Places-Budget.
            </p>
            <button type="submit" className={btn.primary}>
              Suche einreihen
            </button>
          </form>
        </Card>
        <Card title="Jobs manuell auslösen">
          <ul className="divide-y divide-slate-100">
            {[
              [QUEUES.pipelineTick, 'Pipeline-Takt (Demos/Briefe vorbereiten)'],
              [QUEUES.sendApprovedLetters, 'Freigegebene Briefe versenden'],
              [QUEUES.syncLetterStatus, 'Briefstatus abgleichen'],
              [QUEUES.followup, 'Follow-up prüfen'],
              [QUEUES.retention, 'Lösch-Job (Datenhaltung)'],
              [QUEUES.weeklyOptimizer, 'Optimizer & Wochenbericht'],
              [QUEUES.renewalReminders, 'Hosting-Erinnerungen'],
              [QUEUES.alertMails, 'Alarm-Mails senden'],
            ].map(([q, label]) => (
              <li key={q} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>{label}</span>
                <form action={runJobNow}>
                  <input type="hidden" name="queue" value={q} />
                  <button className={btn.secondary} type="submit">
                    Starten
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Letzte Jobs">
        <Table head={['Queue', 'Status', 'Erstellt', 'Fertig', 'Versuche', 'Ergebnis']}>
          {jobs.rows.map((j) => (
            <tr key={j.id}>
              <Td className="font-mono text-xs">{j.name}</Td>
              <Td>
                <Badge
                  color={
                    j.state === 'completed' ? 'green' : j.state === 'failed' ? 'red' : j.state === 'active' ? 'blue' : 'gray'
                  }
                >
                  {j.state}
                </Badge>
              </Td>
              <Td className="text-xs whitespace-nowrap">{dt(j.created_on)}</Td>
              <Td className="text-xs whitespace-nowrap">{dt(j.completed_on)}</Td>
              <Td>{j.retry_count}</Td>
              <Td className="max-w-lg font-mono text-xs break-all text-slate-600">
                {j.output ? JSON.stringify(j.output).slice(0, 400) : ''}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
