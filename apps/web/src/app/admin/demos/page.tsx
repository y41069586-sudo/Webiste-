import Link from 'next/link';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, schema, type DemoStatus } from '@wbm/core';
import { Badge, Card, Notice, PageHeader, StatusBadge, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { bulkApproveDemos } from './actions';

export const metadata = { title: 'Demos' };

const TABS: { key: string; label: string; statuses: DemoStatus[] }[] = [
  { key: 'review', label: 'Zur Prüfung', statuses: ['pending_review'] },
  { key: 'failed', label: 'QA fehlgeschlagen', statuses: ['qa_failed'] },
  { key: 'building', label: 'In Arbeit', statuses: ['building'] },
  { key: 'published', label: 'Veröffentlicht', statuses: ['approved', 'published'] },
  { key: 'closed', label: 'Abgelehnt/abgelaufen', statuses: ['rejected', 'expired', 'deleted'] },
];

export default async function DemosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0]!;
  const db = getDb();
  const [rows, counts, reviewed] = await Promise.all([
    db
      .select({
        demo: schema.demos,
        lead: { id: schema.leads.id, name: schema.leads.businessName, branch: schema.leads.branch, city: schema.leads.city },
      })
      .from(schema.demos)
      .innerJoin(schema.leads, eq(schema.leads.id, schema.demos.leadId))
      .where(inArray(schema.demos.status, tab.statuses))
      .orderBy(desc(schema.demos.createdAt))
      .limit(60),
    db
      .select({ status: schema.demos.status, n: sql<number>`count(*)::int` })
      .from(schema.demos)
      .groupBy(schema.demos.status),
    db.execute<{ value: number }>(sql`SELECT value FROM counters WHERE name = 'demos_reviewed'`),
  ]);
  const countFor = (t: (typeof TABS)[number]) => counts.filter((c) => t.statuses.includes(c.status)).reduce((s, c) => s + c.n, 0);
  return (
    <>
      <PageHeader title="Demos" subtitle={`Manuell geprüft: ${reviewed.rows[0]?.value ?? 0} (Pflicht für die ersten 30)`} />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/demos?tab=${t.key}`} className={t.key === tab.key ? btn.primary : btn.secondary}>
            {t.label} ({countFor(t)})
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <Notice>Keine Demos in dieser Ansicht.</Notice>
      ) : (
        <form action={bulkApproveDemos}>
          {tab.key === 'review' ? (
            <div className="mb-4 flex items-center gap-3">
              <button type="submit" className={btn.primary}>
                Markierte freigeben
              </button>
              <span className="text-sm text-slate-600">Bitte jede Demo vorher in der Vorschau ansehen.</span>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ demo, lead }) => (
              <Card key={demo.id} className="overflow-hidden">
                <div className="-m-4 mb-3">
                  {demo.compositeKey ? (
                    <img
                      src={`/admin/files/${demo.compositeKey}`}
                      alt={`Vorschau ${lead.name}`}
                      className="aspect-[5/3] w-full bg-slate-100 object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[5/3] items-center justify-center bg-slate-100 text-sm text-slate-500">
                      Noch keine Screenshots
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/admin/demos/${demo.id}`} className="font-semibold text-brand-700 hover:underline">
                      {lead.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {lead.branch} · {lead.city} · {demo.templateId}/{demo.palette}
                    </div>
                  </div>
                  <StatusBadge status={demo.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  {demo.qaResultJson?.checks.map((c) => (
                    <Badge key={c.name} color={c.passed ? 'green' : 'red'}>
                      {c.name}
                      {c.score !== undefined ? ` ${c.score}` : ''}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Erstellt {dt(demo.createdAt)}
                  {demo.expiresAt ? ` · läuft ab ${dt(demo.expiresAt)}` : ''}
                </div>
                {tab.key === 'review' || tab.key === 'failed' ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {tab.key === 'review' ? (
                      <label className="flex items-center gap-1 text-sm">
                        <input type="checkbox" name="ids" value={demo.id} /> markieren
                      </label>
                    ) : null}
                    <Link href={`/admin/demos/${demo.id}`} className={btn.secondary}>
                      Prüfen
                    </Link>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </form>
      )}
    </>
  );
}
