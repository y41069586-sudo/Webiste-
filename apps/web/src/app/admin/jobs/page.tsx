import { sql } from 'drizzle-orm';
import { getDb } from '@wbm/core';
import { Badge, Card, Notice, PageHeader, Table, Td } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';

export const metadata = { title: 'Hintergrund' };

/** Hintergrundaufgaben in Alltagssprache */
const JOB_LABELS: Record<string, string> = {
  'find-leads': 'Betriebe suchen',
  'build-demo': 'Demo bauen',
  'qa-demo': 'Demo automatisch prüfen',
  'publish-demo': 'Demo online stellen',
  'revise-demo': 'Demo anpassen',
  'generate-letter': 'Brief schreiben',
  'send-letter': 'Brief abschicken',
  'send-approved-letters': 'Freigegebene Briefe abschicken',
  'sync-letter-status': 'Post-Status abfragen',
  'pipeline-tick': 'Demos und Briefe vorbereiten',
  'refresh-funnel': 'Zahlen aktualisieren',
  'alert-mails': 'Warnungen per Mail',
  followup: 'Erinnerungsbriefe prüfen',
  retention: 'Alte Daten löschen',
  'weekly-optimizer': 'Wochenbericht',
  'renewal-reminders': 'Erinnerungen an Kunden',
  'learning-agent': 'Lern-Vorschläge',
  'deploy-site': 'Kunden-Website online stellen',
  'dead-letters': 'Fehlgeschlagene Aufgaben',
};
const STATE_LABELS: Record<string, [string, 'green' | 'red' | 'blue' | 'gray' | 'yellow']> = {
  completed: ['Erledigt', 'green'],
  failed: ['Fehler', 'red'],
  active: ['Läuft gerade', 'blue'],
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
  const failed = jobs.rows.filter((j) => j.state === 'failed').length;
  const running = jobs.rows.filter((j) => j.state === 'active').length;
  return (
    <>
      <PageHeader
        title="Hintergrund"
        subtitle="Das System erledigt diese Aufgaben von selbst. Normalerweise musst du hier nichts tun."
      />
      <div className="mb-6">
        {failed ? (
          <Notice kind="warn">
            {failed === 1 ? 'Eine Aufgabe ist' : `${failed} Aufgaben sind`} zuletzt fehlgeschlagen. Das System versucht es
            automatisch erneut. Bleibt es rot, frag den Assistenten unten rechts.
          </Notice>
        ) : (
          <Notice kind="success">
            Alles in Ordnung.{running ? ` Gerade ${running === 1 ? 'läuft eine Aufgabe' : `laufen ${running} Aufgaben`}.` : ''}
          </Notice>
        )}
      </div>
      <Card title="Zuletzt erledigt">
        <Table head={['Aufgabe', 'Status', 'Wann', 'Dauer']} empty="Noch nichts gelaufen.">
          {jobs.rows.slice(0, 25).map((j) => {
            const [stateLabel, color] = STATE_LABELS[j.state] ?? [j.state, 'gray'];
            const secs = j.completed_on
              ? Math.max(0, (new Date(j.completed_on).getTime() - new Date(j.created_on).getTime()) / 1000)
              : null;
            return (
              <tr key={j.id}>
                <Td className="font-medium">{JOB_LABELS[j.name] ?? 'Sonstige Aufgabe'}</Td>
                <Td>
                  <Badge color={color}>{stateLabel}</Badge>
                </Td>
                <Td className="text-xs whitespace-nowrap text-slate-600">{dt(j.created_on)}</Td>
                <Td className="text-xs whitespace-nowrap text-slate-600">
                  {secs === null ? '–' : secs < 60 ? `${Math.round(secs)} s` : `${Math.round(secs / 60)} min`}
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
