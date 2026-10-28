import { sql } from 'drizzle-orm';
import { getDb, QUEUES } from '@wbm/core';
import { Badge, Card, PageHeader, Table, Td, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { runJobNow } from './actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Jobs & Steuerung' };

/** Lesbare Namen der Hintergrundaufgaben */
const JOB_LABELS: Record<string, string> = {
  'find-leads': 'Lead-Suche',
  'build-demo': 'Demo bauen',
  'qa-demo': 'Demo prüfen (automatisch)',
  'publish-demo': 'Demo veröffentlichen',
  'generate-letter': 'Brief erstellen',
  'send-letter': 'Brief versenden',
  'send-approved-letters': 'Freigegebene Briefe versenden',
  'sync-letter-status': 'Briefstatus abgleichen',
  'pipeline-tick': 'Pipeline-Takt',
  'refresh-funnel': 'Funnel aktualisieren',
  'alert-mails': 'Meldungen per Mail',
  followup: 'Folgebriefe prüfen',
  retention: 'Löschfristen',
  'weekly-optimizer': 'Optimizer & Wochenbericht',
  'renewal-reminders': 'Hosting-Erinnerungen',
  'learning-agent': 'Lern-Agent',
  'deploy-site': 'Kundenseite veröffentlichen',
  'dead-letters': 'Fehlgeschlagene Aufträge',
};
const STATE_LABELS: Record<string, [string, 'green' | 'red' | 'blue' | 'gray' | 'yellow']> = {
  completed: ['Erledigt', 'green'],
  failed: ['Fehler', 'red'],
  active: ['Läuft', 'blue'],
  created: ['Wartet', 'yellow'],
  retry: ['Neuer Versuch', 'yellow'],
  cancelled: ['Abgebrochen', 'gray'],
};

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
  const jobs = await getDb()
    .execute<JobRow>(
      sql`SELECT id, name, state, created_on, completed_on, retry_count, output FROM pgboss.job WHERE name NOT LIKE '\_\_pgboss%' ORDER BY created_on DESC LIMIT 60`,
    )
    .catch(() => ({ rows: [] as JobRow[] }));
  return (
    <>
      <PageHeader title="Jobs & Steuerung" subtitle="Manuelle Starts, letzte Läufe. Alle Jobs prüfen Not-Aus und Budget." />
      <div className="mb-6">
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
                  <SubmitButton className={btn.secondary} type="submit">
                    Starten
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Letzte Läufe">
        <Table head={['Aufgabe', 'Status', 'Gestartet', 'Dauer', 'Details']}>
          {jobs.rows.map((j) => {
            const [stateLabel, color] = STATE_LABELS[j.state] ?? [j.state, 'gray'];
            const secs = j.completed_on
              ? Math.max(0, (new Date(j.completed_on).getTime() - new Date(j.created_on).getTime()) / 1000)
              : null;
            return (
              <tr key={j.id}>
                <Td className="font-medium">{JOB_LABELS[j.name] ?? j.name}</Td>
                <Td>
                  <Badge color={color}>{stateLabel}</Badge>
                  {j.retry_count ? <span className="ml-2 text-xs text-slate-500">{j.retry_count}. Versuch</span> : null}
                </Td>
                <Td className="text-xs whitespace-nowrap text-slate-600">{dt(j.created_on)}</Td>
                <Td className="text-xs whitespace-nowrap text-slate-600">
                  {secs === null ? '–' : secs < 60 ? `${Math.round(secs)} s` : `${Math.round(secs / 60)} min`}
                </Td>
                <Td>
                  {j.output ? (
                    <details className="admin-details">
                      <summary>Ergebnis</summary>
                      <pre>{JSON.stringify(j.output, null, 2).slice(0, 2000)}</pre>
                    </details>
                  ) : null}
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
