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
import { Notice, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur, num } from '@/lib/format';
import { acknowledgeAlert } from './actions';
import { settingsTodos } from './settings/todos';

export const metadata = { title: 'Heute' };

const SALES_ONLY = new Set(['tax.operatorConfirmed', 'sender.bankIban', 'legal.termsMarkdown']);

const INBOX_KIND: Record<string, { label: string; tone: string; href: (id: string) => string }> = {
  demo: { label: 'Demo prüfen', tone: 'is-demo', href: (id) => `/admin/demos/${id}?flow=1` },
  letter: { label: 'Brief freigeben', tone: 'is-letter', href: (id) => `/admin/letters/${id}?flow=1` },
  support: { label: 'Nachricht', tone: 'is-support', href: (id) => `/admin/support/${id}` },
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
  const [byStatus, inbox, openAlerts, letterBudget, llmBudget, health, cfg, testJobs, live] = await Promise.all([
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
    db
      .execute<{ checking: number; building: number; failed: number }>(
        sql`SELECT
          (SELECT count(*)::int FROM leads WHERE status = 'discovered' AND phone IS NOT NULL) AS checking,
          (SELECT count(*)::int FROM leads WHERE status = 'qualified')
            + (SELECT count(*)::int FROM demos WHERE status = 'building') AS building,
          (SELECT count(*)::int FROM demos WHERE status = 'qa_failed') AS failed`,
      )
      .then((r) => r.rows[0] ?? { checking: 0, building: 0, failed: 0 })
      .catch(() => ({ checking: 0, building: 0, failed: 0 })),
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number>;
  const total = byStatus.reduce((a, r) => a + r.n, 0);
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
    { done: workerOk, label: 'Dein Server läuft', href: '/admin/settings?bereich=server' },
    { done: total > 0, label: 'Erste Betriebe suchen', href: '/admin/suche' },
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
  const dateLabel = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Berlin',
  }).format(now);

  const sent = ['letter_sent', 'letter_delivered', 'scanned', 'cta_clicked', 'checkout_started', 'followup_sent'].reduce(
    (n, st) => n + (counts[st] ?? 0),
    0,
  );
  const customers =
    (counts['paid'] ?? 0) + (counts['onboarding'] ?? 0) + (counts['preview_approved'] ?? 0) + (counts['live'] ?? 0);
  const demoWaiting = inbox.filter((i) => i.kind === 'demo').length + live.failed;
  const letterWaiting = inbox.filter((i) => i.kind === 'letter').length;
  const flow = [
    { label: 'Gefunden', value: total, hint: 'Betriebe insgesamt', href: '/admin/leads', tone: '' },
    {
      label: 'KI prüft',
      value: live.checking,
      hint: 'Website? Bewertungen?',
      href: '/admin/suche',
      tone: live.checking ? 'is-busy' : '',
    },
    {
      label: 'Demo im Bau',
      value: live.building,
      hint: 'automatisch',
      href: '/admin/demos?tab=building',
      tone: live.building ? 'is-busy' : '',
    },
    {
      label: 'Wartet auf dich',
      value: demoWaiting + letterWaiting,
      hint: 'Demos & Briefe',
      href: demoWaiting ? '/admin/demos' : '/admin/letters',
      tone: demoWaiting + letterWaiting ? 'is-you' : '',
    },
    {
      label: 'Verschickt',
      value: sent,
      hint: customers ? `${num(customers)} Kunden` : 'Briefe unterwegs',
      href: '/admin/outbox',
      tone: sent ? 'is-good' : '',
    },
  ];
  const statusLine =
    inbox.length === 0
      ? live.checking + live.building > 0
        ? 'Die KI arbeitet gerade. Du musst nichts tun.'
        : 'Gerade wartet nichts auf dich.'
      : inbox.length === 1
        ? 'Eine Sache wartet auf dich.'
        : `${num(inbox.length)} Dinge warten auf dich.`;
  const errorAlerts = openAlerts.filter((a) => a.level === 'error').length;

  return (
    <div className="home">
      <header className="home-head">
        <div>
          <p className="home-date">{dateLabel}</p>
          <h1 className="home-title">{greeting(now)}.</h1>
          <p className="home-sub">{statusLine}</p>
        </div>
        <Link href="/admin/suche" className="home-go">
          Betriebe finden
        </Link>
      </header>

      {health.problems.length ? (
        <Notice kind={health.status === 'down' ? 'error' : 'warn'}>
          <strong>Achtung:</strong> {health.problems.join(' · ')}
        </Notice>
      ) : null}

      <section className="home-block" aria-labelledby="flow-h">
        <h2 id="flow-h" className="home-h2">
          So läuft es gerade
        </h2>
        <ol className="home-flow">
          {flow.map((f, i) => (
            <li key={f.label} className={f.tone}>
              <Link href={f.href}>
                <span className="home-flow-step">{i + 1}</span>
                <span className="home-flow-label">{f.label}</span>
                <strong className="home-flow-num">{num(f.value)}</strong>
                <span className="home-flow-hint">{f.hint}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-block" aria-labelledby="todo-h">
        <h2 id="todo-h" className="home-h2">
          Für dich
        </h2>
        {inbox.length === 0 ? (
          <div className="empty">
            <p className="empty-title">Alles erledigt.</p>
            <p className="empty-text">Neue Demos, Briefe und Nachrichten erscheinen hier von selbst.</p>
          </div>
        ) : (
          <ul className="home-todo">
            {inbox.slice(0, 12).map((item) => {
              const k = INBOX_KIND[item.kind]!;
              return (
                <li key={`${item.kind}-${item.id}`}>
                  <Link href={k.href(item.id)}>
                    <span className={`home-todo-kind ${k.tone}`}>{k.label}</span>
                    <span className="home-todo-name">{item.title}</span>
                    <span className="home-todo-age">{ago(item.created_at, now)}</span>
                    <span className="home-todo-go">Öffnen →</span>
                  </Link>
                </li>
              );
            })}
            {inbox.length > 12 ? (
              <li className="home-todo-more">
                <Link href="/admin/demos">… und {num(inbox.length - 12)} weitere</Link>
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <p className="home-costs">
        Diese Woche: Briefe {eur(letterBudget.spentCents)} von {eur(letterBudget.limitCents)} · KI {eur(llmBudget.spentCents)} von{' '}
        {eur(llmBudget.limitCents)} · <Link href="/admin/budget">Kosten ansehen</Link>
      </p>

      {openAlerts.length ? (
        <details className="home-fold">
          <summary>
            {errorAlerts ? `${num(errorAlerts)} Fehler` : 'Hinweise'} vom System ({num(openAlerts.length)})
          </summary>
          <ul className="home-alerts">
            {openAlerts.map((a) => (
              <li key={a.id}>
                <span className={a.level === 'error' ? 'home-alert is-error' : 'home-alert'}>
                  {a.level === 'error' ? 'Fehler' : 'Hinweis'}
                </span>
                <span className="home-alert-text">{a.message}</span>
                <span className="home-todo-age">{dt(a.createdAt)}</span>
                <form action={acknowledgeAlert}>
                  <input type="hidden" name="id" value={a.id} />
                  <SubmitButton className={btn.ghost}>Erledigt</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {doneCount < steps.length ? (
        <details className="home-fold">
          <summary>
            Einrichtung: {doneCount} von {steps.length} erledigt
          </summary>
          <ol className="admin-steps">
            {steps.map((st) => (
              <li key={st.label} className={st.done ? 'is-done' : ''}>
                <span className="admin-step-mark" aria-label={st.done ? 'erledigt' : 'offen'}>
                  {st.done ? '✓' : ''}
                </span>
                {st.done ? <span>{st.label}</span> : <Link href={st.href}>{st.label}</Link>}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
