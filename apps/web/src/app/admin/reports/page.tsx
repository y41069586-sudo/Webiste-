import { desc } from 'drizzle-orm';
import { getDb, markdownToHtml, schema } from '@wbm/core';
import { Badge, Card, PageHeader, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { applyReportAction, runOptimizerAction } from './actions';

export const metadata = { title: 'Wochenberichte' };
export const dynamic = 'force-dynamic';

/** Markdown des Berichts darstellen; Zeilen mit „|“ werden zu Tabellen. */
function reportHtml(md: string): string {
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cells = (l: string) =>
    l
      .trim()
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
  const out: string[] = [];
  let text: string[] = [];
  let table: string[] = [];
  const flushText = () => {
    if (text.length) out.push(markdownToHtml(text.join('\n')));
    text = [];
  };
  const flushTable = () => {
    const rows = table.filter((l) => !/^\|[-:| ]+\|$/.test(l.trim()));
    if (rows.length) {
      const [head, ...body] = rows;
      out.push(
        `<table class="my-3 min-w-full text-sm"><thead><tr>${cells(head!)
          .map((c) => `<th class="px-2 py-1 text-left font-semibold">${esc(c)}</th>`)
          .join('')}</tr></thead><tbody>${body
          .map(
            (r) =>
              `<tr class="border-t border-slate-100">${cells(r)
                .map((c, i) => `<td class="px-2 py-1 ${i ? 'text-right tabular-nums' : ''}">${esc(c)}</td>`)
                .join('')}</tr>`,
          )
          .join('')}</tbody></table>`,
      );
    }
    table = [];
  };
  for (const line of md.split('\n')) {
    if (line.trim().startsWith('|')) {
      flushText();
      table.push(line);
    } else {
      flushTable();
      text.push(line);
    }
  }
  flushTable();
  flushText();
  return out.join('\n');
}

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
            <button className={btn.secondary}>Bericht jetzt erstellen</button>
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
                  <button className={btn.primary}>Vorschlag übernehmen</button>
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
