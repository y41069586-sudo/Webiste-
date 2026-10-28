import { AdminArrow } from '@/components/admin-arrow';
import Link from 'next/link';
import { desc, isNull, sql } from 'drizzle-orm';
import { budgetStatus, getConfig, getDb, goLiveBlockers, letterBlockers, schema, systemHealth } from '@wbm/core';
import { Card, Notice, PageHeader, Stat, StatusBadge } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur, num } from '@/lib/format';
import { acknowledgeAlert } from './actions';

export const metadata = { title: 'Übersicht' };

export default async function Dashboard() {
  await requireAdmin();
  const db = getDb();
  const [byStatus, openAlerts, letterBudget, llmBudget, placesBudget, health, cfg] = await Promise.all([
    db
      .select({ status: schema.leads.status, n: sql<number>`count(*)::int` })
      .from(schema.leads)
      .groupBy(schema.leads.status),
    db.select().from(schema.alerts).where(isNull(schema.alerts.acknowledgedAt)).orderBy(desc(schema.alerts.createdAt)).limit(20),
    budgetStatus('letter'),
    budgetStatus('llm'),
    budgetStatus('places_api'),
    systemHealth(),
    getConfig(),
  ]);
  const blockers = goLiveBlockers(cfg);
  const letterBlocked = letterBlockers(cfg);
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));
  const total = byStatus.reduce((a, r) => a + r.n, 0);
  return (
    <>
      <PageHeader title="Dein Überblick" subtitle="Alles im Blick. Ein klarer nächster Schritt." />
      <section className="admin-welcome">
        <div>
          <p className="admin-eyebrow">DEIN SEITENWERK</p>
          <h2>
            Gute Websites.
            <br />
            Klarer Workflow.
          </h2>
          <p>Vom ersten Kontakt bis zur fertigen Website. Hier steuerst du jeden Schritt.</p>
          <Link href="/admin/leads" prefetch={false} className="admin-welcome-cta">
            Leads öffnen{' '}
            <span aria-hidden="true">
              <AdminArrow />
            </span>
          </Link>
        </div>
        <div className="admin-welcome-summary">
          <span>Deine Pipeline</span>
          <strong>{num(total)}</strong>
          <span>Leads insgesamt</span>
          <div>
            <span className="admin-status-dot" /> {num(counts['demo_published'] ?? 0)} Demos veröffentlicht
          </div>
        </div>
      </section>
      <div className="admin-shortcuts">
        {[
          ['demos', 'Demos prüfen', 'Entwürfe ansehen & freigeben'],
          ['orders', 'Bestellungen', 'Aufträge im Blick behalten'],
          ['support', 'Support', 'Kundenanfragen bearbeiten'],
          ['settings', 'Einstellungen', 'Dein Unternehmen verwalten'],
        ].map(([path, title, description]) => (
          <Link href={`/admin/${path}`} prefetch={false} key={path}>
            <span className="admin-shortcut-arrow" aria-hidden="true">
              <AdminArrow />
            </span>
            <strong>{title}</strong>
            <span>{description}</span>
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
      {letterBlocked.length ? (
        <div className="mb-6">
          <Notice kind="warn">
            <strong>Echte Briefe gesperrt</strong> – es fehlt: {letterBlocked.map((b) => b.label).join(' · ')}. Einstellungen →
            Absender bzw. Rechtstexte übernehmen.
          </Notice>
        </div>
      ) : null}
      {blockers.length ? (
        <div className="mb-6">
          <Notice kind="warn">
            <strong>Verkauf gesperrt</strong> (Live-Checkout und Rechnungen) – es fehlt:{' '}
            {blockers.map((b) => b.label).join(' · ')}.
          </Notice>
        </div>
      ) : null}
      {openAlerts.length > 0 ? (
        <Card title={`Offene Meldungen (${openAlerts.length})`} className="mb-6">
          <ul className="divide-y divide-slate-100">
            {openAlerts.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 py-2 text-sm">
                <div>
                  <span
                    className={`mr-2 font-semibold ${a.level === 'error' ? 'text-red-700' : a.level === 'warn' ? 'text-amber-700' : 'text-slate-700'}`}
                  >
                    {a.level.toUpperCase()}
                  </span>
                  {a.message}
                  <div className="text-xs text-slate-500">
                    {dt(a.createdAt)} · {a.code}
                  </div>
                </div>
                <form action={acknowledgeAlert}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-xs text-brand-700 underline" type="submit">
                    Erledigt
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Budget Briefe (Woche)"
          value={eur(letterBudget.spentCents)}
          hint={`von ${eur(letterBudget.limitCents)} · Rest ${eur(letterBudget.remainingCents)}`}
        />
        <Stat label="KI-Kosten (Woche)" value={eur(llmBudget.spentCents)} hint={`Limit ${eur(llmBudget.limitCents)}`} />
        <Stat label="Places-API (Woche)" value={eur(placesBudget.spentCents)} hint={`Limit ${eur(placesBudget.limitCents)}`} />
      </div>

      <Card title={`Leads nach Status (${num(total)})`}>
        {total === 0 ? (
          <p className="text-sm text-slate-600">Noch keine Leads. Unter „Jobs &amp; Steuerung“ eine Lead-Suche starten.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([status, n]) => (
                <Link
                  prefetch={false}
                  key={status}
                  href={`/admin/leads?status=${status}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                >
                  <StatusBadge status={status} />
                  <span className="font-semibold tabular-nums">{num(n)}</span>
                </Link>
              ))}
          </div>
        )}
      </Card>
    </>
  );
}
