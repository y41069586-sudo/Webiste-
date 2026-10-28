import Link from 'next/link';
import { desc, inArray, isNull, sql } from 'drizzle-orm';
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
import { Card, Notice, PageHeader, Stat, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur, num } from '@/lib/format';
import { acknowledgeAlert } from './actions';
import { settingsTodos } from './settings/todos';

export const metadata = { title: 'Übersicht' };

/** Pipeline in Arbeitsreihenfolge (Zustandsmaschine, CLAUDE.md § 2) */
const STAGES: [string, string][] = [
  ['discovered', 'Gefunden'],
  ['qualified', 'Geeignet'],
  ['demo_built', 'Demo zu prüfen'],
  ['demo_approved', 'Demo freigegeben'],
  ['demo_published', 'Demo online'],
  ['letter_generated', 'Brief zu prüfen'],
  ['letter_approved', 'Brief freigegeben'],
  ['letter_sent', 'Brief verschickt'],
  ['letter_delivered', 'Zugestellt'],
  ['scanned', 'QR gescannt'],
  ['cta_clicked', 'Interesse'],
  ['checkout_started', 'Im Checkout'],
  ['paid', 'Bezahlt'],
  ['onboarding', 'Onboarding'],
  ['preview_approved', 'Vorschau ok'],
  ['live', 'Live'],
];

const SALES_ONLY = new Set(['tax.operatorConfirmed', 'sender.bankIban', 'legal.termsMarkdown']);

export default async function Dashboard() {
  await requireAdmin();
  const db = getDb();
  const [byStatus, openAlerts, supportOpen, letterBudget, llmBudget, health, cfg, testJobs] = await Promise.all([
    db
      .select({ status: schema.leads.status, n: sql<number>`count(*)::int` })
      .from(schema.leads)
      .groupBy(schema.leads.status),
    db.select().from(schema.alerts).where(isNull(schema.alerts.acknowledgedAt)).orderBy(desc(schema.alerts.createdAt)).limit(20),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.supportMessages)
      .where(inArray(schema.supportMessages.status, ['new', 'drafted', 'escalated'])),
    budgetStatus('letter'),
    budgetStatus('llm'),
    systemHealth(undefined, { maxAgeMs: 30_000 }),
    getConfig(),
    providerTestJobCount(getProviders().mail.name),
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number>;
  const total = byStatus.reduce((a, r) => a + r.n, 0);
  const todos = settingsTodos(cfg);
  const blockers = goLiveBlockers(cfg);
  const workerOk = health.workerHeartbeatAgeSec !== null && health.workerHeartbeatAgeSec < 15 * 60;
  const reviewed = ['demo_approved', 'demo_published', 'letter_generated', 'letter_approved', 'letter_sent'].some(
    (s) => (counts[s] ?? 0) > 0,
  );

  const waiting = [
    { n: counts['demo_built'] ?? 0, label: 'Demos prüfen', href: '/admin/demos' },
    { n: counts['letter_generated'] ?? 0, label: 'Briefe freigeben', href: '/admin/letters' },
    { n: supportOpen[0]?.n ?? 0, label: 'Kundenanfragen', href: '/admin/support' },
    { n: openAlerts.length, label: 'Meldungen', href: '#meldungen' },
  ];

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
    { done: total > 0, label: 'Erste Lead-Suche starten', href: '/admin/jobs' },
    { done: reviewed, label: 'Erste Demos prüfen & freigeben', href: '/admin/demos' },
    {
      done: testJobs >= LXP_REQUIRED_TEST_JOBS,
      label: `${LXP_REQUIRED_TEST_JOBS} Testsendungen an den Briefdienst (bisher ${testJobs})`,
      href: '/admin/letters',
    },
    {
      done: !blockers.some((b) => SALES_ONLY.has(b.key)),
      label: 'Verkauf freischalten: Steuerstatus, IBAN, AGB',
      href: '/admin/settings?bereich=money',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);

  return (
    <>
      <PageHeader
        title="Übersicht"
        subtitle={`${num(total)} Leads in der Pipeline · ${num(counts['demo_published'] ?? 0)} Demos online`}
        actions={
          nextStep ? (
            <Link href={nextStep.href} className={btn.primary}>
              Nächster Schritt: {nextStep.label}
            </Link>
          ) : null
        }
      />

      <div className="admin-tiles">
        {waiting.map((w) => (
          <Link key={w.label} href={w.href} className={`admin-tile ${w.n > 0 ? 'has-work' : ''}`}>
            <strong>{num(w.n)}</strong>
            <span>{w.label}</span>
          </Link>
        ))}
      </div>

      {health.problems.length ? (
        <div className="mb-6">
          <Notice kind={health.status === 'down' ? 'error' : 'warn'}>
            <strong>Systemzustand:</strong> {health.problems.join(' · ')}
          </Notice>
        </div>
      ) : null}

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card title={`Startklar machen · ${doneCount} von ${steps.length} erledigt`}>
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

        <Card title="Pipeline">
          {total === 0 ? (
            <p className="text-sm text-slate-600">
              Noch keine Leads.{' '}
              <Link href="/admin/jobs" className="font-medium text-brand-700 underline">
                Lead-Suche starten
              </Link>
            </p>
          ) : (
            <ul className="admin-pipeline">
              {STAGES.filter(([s]) => (counts[s] ?? 0) > 0).map(([status, label]) => (
                <li key={status}>
                  <Link href={`/admin/leads?status=${status}`}>
                    <span>{label}</span>
                    <strong>{num(counts[status] ?? 0)}</strong>
                  </Link>
                </li>
              ))}
              {Object.keys(counts)
                .filter((s) => !STAGES.some(([k]) => k === s))
                .map((status) => (
                  <li key={status}>
                    <Link href={`/admin/leads?status=${status}`}>
                      <span className="text-slate-500">{status}</span>
                      <strong>{num(counts[status] ?? 0)}</strong>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat
          label="Briefe diese Woche"
          value={eur(letterBudget.spentCents)}
          hint={`Budget ${eur(letterBudget.limitCents)} · noch ${eur(letterBudget.remainingCents)}`}
        />
        <Stat label="KI-Kosten diese Woche" value={eur(llmBudget.spentCents)} hint={`Limit ${eur(llmBudget.limitCents)}`} />
      </div>

      {openAlerts.length > 0 ? (
        <section id="meldungen">
          <Card title={`Offene Meldungen (${openAlerts.length})`}>
            <ul className="divide-y divide-slate-100">
              {openAlerts.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 py-2 text-sm">
                  <div className="min-w-0">
                    <span
                      className={`mr-2 rounded px-1.5 py-0.5 text-xs font-semibold ${a.level === 'error' ? 'bg-red-100 text-red-800' : a.level === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {a.level === 'error' ? 'Fehler' : a.level === 'warn' ? 'Hinweis' : 'Info'}
                    </span>
                    {a.message}
                    <div className="text-xs text-slate-500">{dt(a.createdAt)}</div>
                  </div>
                  <form action={acknowledgeAlert}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className={btn.ghost} type="submit">
                      Erledigt
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </>
  );
}
