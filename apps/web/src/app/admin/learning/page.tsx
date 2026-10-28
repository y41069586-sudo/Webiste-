import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { Card, Notice, PageHeader, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { reportHtml } from '@/lib/report-html';
import { runLearningAgentAction } from '../variants/actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Lern-Agent' };
export const dynamic = 'force-dynamic';

export default async function LearningPage({ searchParams }: { searchParams: Promise<{ woche?: string; gestartet?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const rows = await getDb().select().from(schema.weeklyReports).orderBy(desc(schema.weeklyReports.week)).limit(26);
  const current = rows.find((r) => r.week === sp.woche) ?? rows[0];
  return (
    <>
      <PageHeader
        title="Lern-Agent"
        subtitle="Sonntags 18:30: Wochenbericht mit Spannen, Absprüngen, Einwänden, Hypothesen und Varianten-Vorschlägen. Vorschläge landen im Varianten-Labor."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className={btn.secondary} href="/admin/variants">
              Varianten-Labor
            </Link>
            <form action={runLearningAgentAction}>
              <SubmitButton type="submit" className={btn.secondary}>
                Jetzt ausführen
              </SubmitButton>
            </form>
          </div>
        }
      />
      {sp.gestartet ? (
        <div className="mb-4">
          <Notice kind="success">Lern-Agent gestartet – der Bericht erscheint in ein bis zwei Minuten.</Notice>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[12rem_1fr]">
        <nav aria-label="Wochen" className="space-y-1 text-sm">
          {rows.length === 0 ? <p className="text-slate-600">Noch keine Berichte.</p> : null}
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/admin/learning?woche=${encodeURIComponent(r.week)}`}
              className={`block rounded px-2 py-1 ${r.id === current?.id ? 'bg-brand-50 font-semibold text-brand-700' : 'hover:bg-slate-50'}`}
            >
              {r.week}
            </Link>
          ))}
        </nav>
        {current ? (
          <Card
            title={`Bericht ${current.week}`}
            actions={<span className="text-xs text-slate-500">erstellt {dt(current.createdAt)}</span>}
          >
            <div className="prose-legal overflow-x-auto" dangerouslySetInnerHTML={{ __html: reportHtml(current.markdown) }} />
          </Card>
        ) : null}
      </div>
    </>
  );
}
