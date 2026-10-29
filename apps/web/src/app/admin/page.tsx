import Link from 'next/link';
import { desc, isNull, sql } from 'drizzle-orm';
import {
  budgetStatus,
  getConfig,
  getDb,
  getProviders,
  goLiveBlockers,
  LXP_REQUIRED_TEST_JOBS,
  providerTestJobCount,
  schema,
  systemHealth,
} from '@wbm/core';
import { SubmitButton } from '@/components/admin/submit-button';
import { Card, Notice, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur, num } from '@/lib/format';
import { acknowledgeAlert } from './actions';
import { settingsTodos } from './settings/todos';

export const metadata = { title: 'Heute' };

/** Pipeline in Arbeitsreihenfolge (Zustandsmaschine, CLAUDE.md § 2) */
const STAGES: [string, string][] = [
  ['discovered', 'Gefunden'],
  ['qualified', 'Geeignet'],
  ['demo_built', 'Demo zu prüfen'],
  ['demo_published', 'Demo online'],
  ['letter_generated', 'Brief zu prüfen'],
  ['letter_sent', 'Brief verschickt'],
  ['scanned', 'QR gescannt'],
  ['cta_clicked', 'Interesse'],
  ['paid', 'Bezahlt'],
  ['live', 'Live'],
];

const SALES_ONLY = new Set(['tax.operatorConfirmed', 'sender.bankIban', 'legal.termsMarkdown']);

const INBOX_KIND: Record<string, { label: string; tone: string; href: (id: string) => string }> = {
  demo: { label: 'Demo prüfen', tone: 'is-demo', href: (id) => `/admin/demos/${id}` },
  letter: { label: 'Brief freigeben', tone: 'is-letter', href: (id) => `/admin/letters/${id}` },
  support: { label: 'Anfrage', tone: 'is-support', href: (id) => `/admin/support/${id}` },
};

type InboxRow = { kind: string; id: string; title: string; created_at: Date };

function greeting(now: Date): string {
  const h = Number(new Intl.DateTimeFormat('de-DE', { hour: 'numeric', hour12: false, timeZone: 'Europe/Berlin' }).format(now));
  return h < 5 ? 'Gute Nacht' : h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
}

function ago(d: Date, now: Date): string {
  const min = Math.max(0, Math.round((now.getTime() - new Date(d).getTime()) / 60000));
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const days = Math.round(h / 24);
  return days === 1 ? 'seit gestern' : `seit ${days} Tagen`;
}

export default async function TodayPage() {
  await requireAdmin();
  const db = getDb();
  const now = new Date();
  const [byStatus, inbox, openAlerts, letterBudget, llmBudget, health, cfg, testJobs] = await Promise.all([
    db
      .select({ status: schema.leads.status, n: sql<number>`count(*)::int` })
      .from(schema.leads)
      .groupBy(schema.leads.status),
    db
      .execute<InboxRow>(
        sql`SELECT kind, id, title, created_at FROM (
          SELECT 'demo' AS kind, d.id::text AS id, l.business_name AS title, d.created_at
            FROM demos d JOIN leads l ON l.id = d.lead_id WHERE d.status = 'pending_review'
          UNION ALL
          SELECT 'letter', le.id::text, l.business_name, le.created_at
            FROM letters le JOIN leads l ON l.id = le.lead_id WHERE le.status = 'generated'
          UNION ALL
          SELECT 'support', s.id::text, coalesce(nullif(s.subject, ''), '(ohne Betreff)'), s.created_at
            FROM support_messages s WHERE s.status IN ('new', 'drafted', 'escalated')
        ) x ORDER BY created_at ASC LIMIT 40`,
      )
      .then((r) => r.rows)
      .catch(() => [] as InboxRow[]),
    db.select().from(schema.alerts).where(isNull(schema.alerts.acknowledgedAt)).orderBy(desc(schema.alerts.createdAt)).limit(20),
    budgetStatus('letter'),
    budgetStatus('llm'),
    systemHealth(undefined, { maxAgeMs: 30_000 }),
    getConfig(),
    providerTestJobCount(getProviders().mail.name),
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number>;
  const total = byStatus.reduce((a, r) => a + r.n, 0);
  const maxStage = Math.max(1, ...STAGES.map(([s]) => counts[s] ?? 0));
  const todos = settingsTodos(cfg);
  const blockers = goLiveBlockers(cfg);
  const workerOk = health.workerHeartbeatAgeSec !== null && health.workerHeartbeatAgeSec < 15 * 60;
  const reviewed = ['demo_approved', 'demo_published', 'letter_generated', 'letter_approved', 'letter_sent'].some(
    (s) => (counts[s] ?? 0) > 0,
  );
  const steps = [
    {
      done: !blockers.some((b) => b.key.startsWith('sender.') && !SALES_ONLY.has(b.key)),
      label: 'Absender & Impressumsdaten eintragen',
      href: '/admin/settings?bereich=sender',
    },
    {
      done: !blockers.some((b) => b.key === 'legal.impressumMarkdown' || b.key === 'legal.privacyMarkdown'),
      label: 'Impressum & Datenschutz übernehmen',
      href: '/admin/settings?bereich=legal',
    },
    {
      done: !todos.some((t) => t.tab === 'letter'),
      label: 'Testadresse für deinen Testbrief',
      href: '/admin/settings?bereich=letter',
    },
    { done: workerOk, label: 'Worker-Server läuft', href: '/admin/settings?bereich=server' },
    { done: total > 0, label: 'Erste Lead-Suche', href: '/admin/suche' },
    { done: reviewed, label: 'Erste Demos prüfen & freigeben', href: '/admin/demos' },
    {
      done: testJobs >= LXP_REQUIRED_TEST_JOBS,
      label: `${LXP_REQUIRED_TEST_JOBS} Testsendungen an den Briefdienst (${testJobs}/${LXP_REQUIRED_TEST_JOBS})`,
      href: '/admin/letters',
    },
    {
      done: !blockers.some((b) => SALES_ONLY.has(b.key)),
      label: 'Verkauf freischalten: Steuerstatus, IBAN, AGB',
      href: '/admin/settings?bereich=money',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const waiting = inbox.length + openAlerts.length;
  const dateLabel = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Berlin',
  }).format(now);

  return (
    <>
      <section className="admin-hero">
        <div>
          <p className="admin-hero-date">{dateLabel}</p>
          <h1>{greeting(now)}.</h1>
          <p className="admin-hero-sub">
            {waiting === 0
              ? 'Gerade wartet nichts auf dich.'
              : waiting === 1
                ? 'Eine Sache wartet auf dich.'
                : `${num(waiting)} Dinge warten auf dich.`}
            {doneCount < steps.length ? ` Startklar: ${doneCount} von ${steps.length} Schritten erledigt.` : ''}
          </p>
        </div>
        <div className="admin-hero-actions">
          <Link href="/admin/ablauf" className={btn.primary}>
            Ablauf: nächster Schritt
          </Link>
          <Link href="/admin/suche" className={btn.secondary}>
            Lead-Suche
          </Link>
        </div>
      </section>

      <div className="admin-kpis">
        {(
          [
            ['Leads', total, '/admin/leads'],
            ['Demos online', counts['demo_published'] ?? 0, '/admin/leads?status=demo_published'],
            ['Briefe verschickt', (counts['letter_sent'] ?? 0) + (counts['letter_delivered'] ?? 0), '/admin/letters'],
            ['Kunden', (counts['paid'] ?? 0) + (counts['onboarding'] ?? 0) + (counts['live'] ?? 0), '/admin/customers'],
          ] as const
        ).map(([label, value, href]) => (
          <Link key={label} href={href} className="admin-kpi">
            <span>{label}</span>
            <strong>{num(value)}</strong>
          </Link>
        ))}
      </div>

      {health.problems.length ? (
        <Notice kind={health.status === 'down' ? 'error' : 'warn'}>
          <strong>Systemzustand:</strong> {health.problems.join(' · ')}
        </Notice>
      ) : null}

      <div className="admin-today">
        <div className="admin-today-main">
          <Card title={`Wartet auf dich${waiting ? ` · ${waiting}` : ''}`}>
            {waiting === 0 ? (
              <div className="admin-empty">
                <span className="admin-empty-mark" aria-hidden="true">
                  ✓
                </span>
                <p>
                  <strong>Alles erledigt.</strong>
                  <br />
                  Neue Demos, Briefe und Anfragen erscheinen hier automatisch.
                </p>
              </div>
            ) : (
              <ul className="admin-inbox">
                {inbox.map((item) => {
                  const k = INBOX_KIND[item.kind]!;
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <Link href={k.href(item.id)}>
                        <span className={`admin-inbox-kind ${k.tone}`}>{k.label}</span>
                        <span className="admin-inbox-title">{item.title}</span>
                        <span className="admin-inbox-age">{ago(item.created_at, now)}</span>
                        <span className="admin-inbox-go" aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {openAlerts.map((a) => (
                  <li key={a.id} className="admin-inbox-alert">
                    <div>
                      <span className={`admin-inbox-kind ${a.level === 'error' ? 'is-error' : 'is-alert'}`}>
                        {a.level === 'error' ? 'Fehler' : 'Hinweis'}
                      </span>
                      <span className="admin-inbox-title">{a.message}</span>
                      <span className="admin-inbox-age">{dt(a.createdAt)}</span>
                    </div>
                    <form action={acknowledgeAlert}>
                      <input type="hidden" name="id" value={a.id} />
                      <SubmitButton className={btn.ghost}>Erledigt</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Wo stehen deine Betriebe?">
            {total === 0 ? (
              <p className="text-sm text-slate-600">
                Noch keine Betriebe.{' '}
                <Link href="/admin/suche" className="font-semibold text-brand-700 underline">
                  Erste Suche starten
                </Link>
              </p>
            ) : (
              <ul className="admin-pipeline">
                {STAGES.map(([status, label]) => (
                  <li key={status}>
                    <Link href={`/admin/leads?status=${status}`}>
                      <span
                        className="admin-pipeline-bar"
                        style={{ width: `${Math.round(((counts[status] ?? 0) / maxStage) * 100)}%` }}
                      />
                      <span>{label}</span>
                      <strong>{num(counts[status] ?? 0)}</strong>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="admin-today-side">
          {doneCount < steps.length ? (
            <Card title={`Startklar · ${doneCount}/${steps.length}`}>
              <div className="admin-progress" aria-hidden="true">
                <span style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }} />
              </div>
              <ol className="admin-steps">
                {steps.map((s) => (
                  <li key={s.label} className={s.done ? 'is-done' : ''}>
                    <span className="admin-step-mark" aria-label={s.done ? 'erledigt' : 'offen'}>
                      {s.done ? '✓' : ''}
                    </span>
                    {s.done ? <span>{s.label}</span> : <Link href={s.href}>{s.label}</Link>}
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
          <Card title="Diese Woche">
            <div className="admin-mini">
              <div>
                <span>Briefe</span>
                <strong>{eur(letterBudget.spentCents)}</strong>
                <small>von {eur(letterBudget.limitCents)}</small>
              </div>
              <div>
                <span>KI-Kosten</span>
                <strong>{eur(llmBudget.spentCents)}</strong>
                <small>Limit {eur(llmBudget.limitCents)}</small>
              </div>
            </div>
            <div className="admin-progress mt-3" aria-hidden="true">
              <span
                style={{
                  width: `${Math.min(100, Math.round((letterBudget.spentCents / Math.max(1, letterBudget.limitCents ?? 0)) * 100))}%`,
                }}
              />
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
