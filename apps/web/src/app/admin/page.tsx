import { desc, isNull, sql } from 'drizzle-orm';
import { budgetStatus, getDb, schema, systemHealth } from '@wbm/core';
import { Card, Notice, PageHeader, Stat, StatusBadge } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur, num } from '@/lib/format';
import { acknowledgeAlert } from './actions';

export const metadata = { title: 'Übersicht' };

export default async function Dashboard() {
  await requireAdmin();
  const db = getDb();
  const [byStatus, openAlerts, letterBudget, llmBudget, placesBudget, health] = await Promise.all([
    db
      .select({ status: schema.leads.status, n: sql<number>`count(*)::int` })
      .from(schema.leads)
      .groupBy(schema.leads.status),
    db.select().from(schema.alerts).where(isNull(schema.alerts.acknowledgedAt)).orderBy(desc(schema.alerts.createdAt)).limit(20),
    budgetStatus('letter'),
    budgetStatus('llm'),
    budgetStatus('places_api'),
    systemHealth(),
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));
  const total = byStatus.reduce((a, r) => a + r.n, 0);
  return (
    <>
      <PageHeader title="Übersicht" subtitle="Pipeline-Status, Budget der laufenden Woche und offene Meldungen." />
      {health.problems.length ? (
        <div className="mb-6">
          <Notice kind="error">
            <strong>Systemzustand:</strong> {health.problems.join(' · ')}
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
                <a
                  key={status}
                  href={`/admin/leads?status=${status}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                >
                  <StatusBadge status={status} />
                  <span className="font-semibold tabular-nums">{num(n)}</span>
                </a>
              ))}
          </div>
        )}
      </Card>
    </>
  );
}
