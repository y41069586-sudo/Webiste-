import Link from 'next/link';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, schema, type DemoStatus } from '@wbm/core';
import { Card, Notice, PageHeader, btn } from '@/components/ui';
import { SubmitButton } from '@/components/admin/submit-button';
import { bulkApproveDemosAction } from './actions';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';

export const metadata = { title: 'Demos' };

const TABS: { key: string; label: string; statuses: DemoStatus[] }[] = [
  { key: 'review', label: 'Wartet auf dich', statuses: ['pending_review', 'qa_failed'] },
  { key: 'building', label: 'Wird gebaut', statuses: ['building'] },
  { key: 'published', label: 'Online', statuses: ['approved', 'published'] },
  { key: 'closed', label: 'Abgelehnt', statuses: ['rejected', 'expired', 'deleted'] },
];

export default async function DemosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; fertig?: string; neu?: string; aus?: string; sammel?: string; technik?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0]!;
  const db = getDb();
  const [rows, counts] = await Promise.all([
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
  ]);
  const countFor = (t: (typeof TABS)[number]) => counts.filter((c) => t.statuses.includes(c.status)).reduce((s, c) => s + c.n, 0);
  return (
    <>
      <PageHeader
        title="Demos freigeben"
        subtitle="Ansehen, dann „Passt“ oder „Passt nicht“ mit deinem Wunsch. Danach entsteht der Brief von selbst."
      />
      {sp.neu ? (
        <div className="mb-4">
          <Notice kind="success">
            Die Demo wird mit deinem Wunsch komplett neu gebaut. Sie erscheint hier wieder, sobald sie fertig ist.
          </Notice>
        </div>
      ) : null}
      {sp.aus ? (
        <div className="mb-4">
          <Notice kind="info">Der Betrieb ist aussortiert und bekommt keinen Brief.</Notice>
        </div>
      ) : null}
      {sp.fertig ? (
        <div className="mb-4">
          <Notice kind="success">
            Alle wartenden Demos sind geprüft. Die Briefe entstehen jetzt automatisch –{' '}
            <Link className="underline" href="/admin/letters">
              zu den Briefen
            </Link>
            .
          </Notice>
        </div>
      ) : null}
      {tab.key === 'review' && counts.some((c) => ['pending_review', 'qa_failed'].includes(c.status) && c.n > 0) ? (
        <Card title="Alle auf einmal">
          <p className="mb-3 text-sm">
            Freigabe für alle wartenden Demos, die du freigeben kannst. Demos mit technischem Fehler oder Sperre bleiben liegen,
            ohne Fehlermeldung.
          </p>
          <form action={bulkApproveDemosAction} className="grid gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ok" required />
              Ich habe die Demos angesehen und sie stimmen.
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="accept_technical" />
              Auch Demos mit technischen Befunden freigeben (ich habe sie selbst angesehen).
            </label>
            <label className="flex items-center gap-2 text-sm">
              Gesamtnote:
              <select name="rating" defaultValue="gut" className="rounded border px-2 py-1">
                <option value="sehr_gut">Sehr gut</option>
                <option value="gut">Gut</option>
              </select>
            </label>
            <SubmitButton type="submit" className={btn.primary}>
              Alle freigeben
            </SubmitButton>
          </form>
        </Card>
      ) : null}
      {sp.sammel ? (
        <div className="mb-4">
          <Notice kind="success">
            {sp.sammel === 'nichts'
              ? 'Nichts freigegeben: bitte Häkchen setzen und Gesamtnote wählen.'
              : `Sammelfreigabe: ${sp.sammel.replace('von', ' von ')} Demos freigegeben.${sp.technik ? ' Die übrigen haben technische Befunde: Häkchen „Auch Demos mit technischen Befunden“ setzen, wenn du sie selbst angesehen hast.' : ''}`}
          </Notice>
        </div>
      ) : null}
      <nav className="seg" aria-label="Filter">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/demos?tab=${t.key}`} className={t.key === tab.key ? 'is-active' : ''}>
            {t.label}
            <span>{countFor(t)}</span>
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <div className="empty">
          <p className="empty-title">{tab.key === 'review' ? 'Gerade wartet keine Demo auf dich.' : 'Hier ist nichts.'}</p>
          <p className="empty-text">Neue Demos entstehen von selbst, sobald die KI einen passenden Betrieb gefunden hat.</p>
        </div>
      ) : (
        <div className="demo-grid">
          {rows.map(({ demo, lead }) => {
            const failed = demo.qaResultJson?.checks.filter((c) => !c.passed).length ?? 0;
            const wish = (demo.contentJson?._meta as { operatorWish?: { note?: string } } | undefined)?.operatorWish?.note;
            return (
              <Link key={demo.id} href={`/admin/demos/${demo.id}`} className="demo-card">
                <div className="demo-card-shot">
                  {demo.compositeKey ? (
                    <img src={`/admin/files/${demo.compositeKey}`} alt="" />
                  ) : (
                    <span>{demo.status === 'building' ? 'Wird gebaut …' : 'Noch kein Bild'}</span>
                  )}
                </div>
                <div className="demo-card-body">
                  <p className="demo-card-name">{lead.name}</p>
                  <p className="demo-card-meta">
                    {lead.branch} · {lead.city}
                  </p>
                  <p className={`demo-card-state ${failed ? 'is-warn' : ''}`}>
                    {demo.status === 'building'
                      ? 'Wird gerade gebaut und geprüft'
                      : demo.qaResultJson
                        ? failed
                          ? `Technik: ${failed} ${failed === 1 ? 'Hinweis' : 'Hinweise'}`
                          : 'Technik in Ordnung'
                        : 'Technik-Prüfung läuft'}
                    {wish ? ' · nach deinem Wunsch neu gebaut' : ''}
                  </p>
                  <p className="demo-card-date">{dt(demo.createdAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
