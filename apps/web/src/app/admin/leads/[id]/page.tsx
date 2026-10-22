import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq } from 'drizzle-orm';
import { formatOpeningHours, getConfig, getDb, REJECTION_LABELS, schema, type RejectionReason } from '@wbm/core';
import { Badge, Card, PageHeader, StatusBadge, Table, Td, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur } from '@/lib/format';
import { rejectLead, requalifyLead, suppressLead } from '../actions';

export const metadata = { title: 'Lead' };

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, id) });
  if (!lead) notFound();
  const cfg = await getConfig();
  const [demos, letters, events, audits, costs] = await Promise.all([
    db.select().from(schema.demos).where(eq(schema.demos.leadId, id)).orderBy(desc(schema.demos.createdAt)),
    db.select().from(schema.letters).where(eq(schema.letters.leadId, id)).orderBy(asc(schema.letters.sequence)),
    db.select().from(schema.events).where(eq(schema.events.leadId, id)).orderBy(desc(schema.events.createdAt)),
    db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.entity, 'lead'), eq(schema.auditLog.entityId, id)))
      .orderBy(desc(schema.auditLog.id)),
    db.select().from(schema.budgetLedger).where(eq(schema.budgetLedger.leadId, id)),
  ]);
  const timeline = [
    ...events.map((e) => ({ at: e.createdAt, kind: 'Event', label: e.type, detail: JSON.stringify(e.metaJson) })),
    ...audits.map((a) => ({ at: a.createdAt, kind: 'Audit', label: a.action, detail: `${a.actor} ${JSON.stringify(a.contextJson)}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const totalCostCents = costs.reduce((s, c) => s + c.amountCents + c.amountMicroCents / 1e6, 0);
  const branch = cfg.targeting.branches.find((b) => b.key === lead.branch);

  return (
    <>
      <PageHeader
        title={lead.businessName}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} /> {branch?.label ?? lead.branch} · {lead.segmentKey} · Score {lead.score}
          </span>
        }
        actions={
          <>
            {lead.status === 'rejected' ? (
              <form action={requalifyLead}>
                <input type="hidden" name="id" value={lead.id} />
                <button className={btn.secondary} type="submit">Manuell qualifizieren</button>
              </form>
            ) : null}
            {['qualified', 'discovered', 'demo_built'].includes(lead.status) ? (
              <form action={rejectLead}>
                <input type="hidden" name="id" value={lead.id} />
                <button className={btn.secondary} type="submit">Ablehnen</button>
              </form>
            ) : null}
            {lead.status !== 'suppressed' ? (
              <form action={suppressLead}>
                <input type="hidden" name="id" value={lead.id} />
                <button className={btn.danger} type="submit">Sperren &amp; löschen</button>
              </form>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Stammdaten" className="lg:col-span-1">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-xs text-slate-500">Anschrift</dt><dd>{lead.street} {lead.houseNumber}<br />{lead.postalCode} {lead.city}</dd></div>
            <div><dt className="text-xs text-slate-500">Telefon</dt><dd>{lead.phone ?? '–'}</dd></div>
            <div>
              <dt className="text-xs text-slate-500">Öffnungszeiten</dt>
              <dd>{formatOpeningHours(lead.openingHours).map((l) => <div key={l}>{l}</div>)}{!lead.openingHours ? '–' : null}</dd>
            </div>
            <div><dt className="text-xs text-slate-500">Website</dt><dd className="break-all">{lead.websiteUri ?? '–'} {lead.socialOnly ? <Badge>nur Social</Badge> : null}</dd></div>
            <div><dt className="text-xs text-slate-500">Bewertung</dt><dd>{lead.rating ? `${lead.rating} (${lead.ratingCount})` : '– (nicht gespeichert)'}</dd></div>
            <div><dt className="text-xs text-slate-500">Quelle</dt><dd>{lead.source} · {lead.sourceId}</dd></div>
            <div><dt className="text-xs text-slate-500">Domain-Vorschlag</dt><dd>{lead.domainSuggestion ?? '–'}</dd></div>
            <div><dt className="text-xs text-slate-500">Briefe gesendet</dt><dd>{lead.lettersSent} · zuletzt kontaktiert {dt(lead.contactedAt)}</dd></div>
            <div><dt className="text-xs text-slate-500">Kosten bisher</dt><dd>{eur(Math.round(totalCostCents))}</dd></div>
            {lead.rejectionReasons.length ? (
              <div>
                <dt className="text-xs text-slate-500">Ablehnungsgründe</dt>
                <dd>{lead.rejectionReasons.map((r) => REJECTION_LABELS[r as RejectionReason] ?? r).join(', ')}</dd>
              </div>
            ) : null}
            {lead.statusReason ? <div><dt className="text-xs text-slate-500">Statusgrund</dt><dd>{lead.statusReason}</dd></div> : null}
          </dl>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <Card title={`Demos (${demos.length})`}>
            <Table head={['Slug', 'Template', 'Status', 'QA', 'Veröffentlicht', 'Ablauf']} empty="Noch keine Demo">
              {demos.map((d) => (
                <tr key={d.id}>
                  <Td><Link className="text-brand-700 hover:underline" href={`/admin/demos/${d.id}`}>{d.slug.slice(0, 10)}…</Link></Td>
                  <Td>{d.templateId} / {d.palette}</Td>
                  <Td><StatusBadge status={d.status} /></Td>
                  <Td>{d.qaResultJson ? (d.qaResultJson.passed ? <Badge color="green">bestanden</Badge> : <Badge color="red">fehlgeschlagen</Badge>) : '–'}</Td>
                  <Td>{dt(d.publishedAt)}</Td>
                  <Td>{dt(d.expiresAt)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title={`Briefe (${letters.length})`}>
            <Table head={['#', 'Status', 'Anbieter', 'Kosten', 'Versendet', 'Zugestellt']} empty="Noch kein Brief">
              {letters.map((l) => (
                <tr key={l.id}>
                  <Td><Link className="text-brand-700 hover:underline" href={`/admin/letters/${l.id}`}>{l.sequence}</Link></Td>
                  <Td><StatusBadge status={l.status} />{l.dryRun ? <Badge color="yellow">DRY_RUN</Badge> : null}</Td>
                  <Td>{l.provider ?? '–'}</Td>
                  <Td>{eur(l.costCents ?? l.estimatedCostCents)}</Td>
                  <Td>{dt(l.sentAt)}</Td>
                  <Td>{dt(l.deliveredAt)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Timeline">
            <ol className="space-y-2 text-sm">
              {timeline.map((t, i) => (
                <li key={i} className="flex gap-3 border-l-2 border-slate-200 pl-3">
                  <span className="w-32 shrink-0 text-xs text-slate-500">{dt(t.at)}</span>
                  <span>
                    <Badge color={t.kind === 'Event' ? 'purple' : 'gray'}>{t.kind}</Badge> <span className="font-mono text-xs">{t.label}</span>
                    <div className="font-mono text-xs break-all text-slate-500">{t.detail}</div>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
