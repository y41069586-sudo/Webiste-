import { desc } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { Badge, Card, PageHeader, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { reportHtml } from '@/lib/report-html';
import { applyReportAction, runOptimizerAction } from './actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Wochenberichte' };
export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  await requireAdmin();
  const rows = await getDb().select().from(schema.reports).orderBy(desc(schema.reports.periodStart)).limit(20);
  return (
    <>
      <PageHeader
        title="Wochenberichte"
        subtitle="Sonntags 18 Uhr: Kennzahlen und Vorschlag für Budgetanteile und Briefvarianten (Thompson Sampling)."
        actions={
          <form action={runOptimizerAction}>
            <SubmitButton className={btn.secondary}>Bericht jetzt erstellen</SubmitButton>
          </form>
        }
      />
      <div className="grid gap-6">
        {rows.length === 0 ? <p className="text-sm text-slate-600">Noch keine Berichte.</p> : null}
        {rows.map((r) => (
          <Card
            key={r.id}
            title={
              <span className="flex items-center gap-2">
                Woche ab {dt(r.periodStart)}{' '}
                {r.applied ? <Badge color="green">übernommen {dt(r.appliedAt)}</Badge> : <Badge color="yellow">Vorschlag</Badge>}
              </span>
            }
            actions={
              !r.applied ? (
                <form action={applyReportAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <SubmitButton className={btn.primary}>Vorschlag übernehmen</SubmitButton>
                </form>
              ) : null
            }
          >
            <div className="prose-legal overflow-x-auto" dangerouslySetInnerHTML={{ __html: reportHtml(r.markdown) }} />
          </Card>
        ))}
      </div>
    </>
  );
}
