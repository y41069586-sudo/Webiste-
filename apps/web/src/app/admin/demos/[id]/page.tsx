import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { Badge, Card, PageHeader, StatusBadge, Table, Td, btn, input } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { approveDemoAction, rejectDemoAction } from '../actions';

export const metadata = { title: 'Demo prüfen' };

export default async function DemoDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const demo = await db.query.demos.findFirst({ where: eq(schema.demos.id, id) });
  if (!demo) notFound();
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, demo.leadId) });
  const meta = (demo.contentJson as { _meta?: { source?: string; attempts?: number } } | null)?._meta;
  const canDecide = ['pending_review', 'qa_failed'].includes(demo.status);
  return (
    <>
      <PageHeader
        title={`Demo: ${lead?.businessName ?? '–'}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={demo.status} /> {demo.templateId} / {demo.palette} · Inhalt: {meta?.source === 'fallback' ? 'Standardtexte' : 'KI'} · erstellt {dt(demo.createdAt)}
          </span>
        }
        actions={
          <>
            <Link className={btn.secondary} href={`/admin/demos/${demo.id}/html`} target="_blank">Vorschau in neuem Tab</Link>
            {lead ? <Link className={btn.secondary} href={`/admin/leads/${lead.id}`}>Lead</Link> : null}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Vorschau (Desktop)">
            <iframe title="Demo-Vorschau" src={`/admin/demos/${demo.id}/html`} className="h-[720px] w-full rounded-lg border border-slate-200" sandbox="allow-same-origin" />
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            {demo.screenshotMobileKey ? (
              <Card title="Mobil (Screenshot)">
                <img src={`/admin/files/${demo.screenshotMobileKey}`} alt="Mobil-Screenshot" className="mx-auto max-h-[640px] rounded-lg border" />
              </Card>
            ) : null}
            {demo.compositeKey ? (
              <Card title="Komposit für den Brief">
                <img src={`/admin/files/${demo.compositeKey}`} alt="Komposit" className="w-full rounded-lg border" />
              </Card>
            ) : null}
          </div>
        </div>
        <div className="space-y-6">
          {canDecide ? (
            <Card title="Entscheidung">
              <form action={approveDemoAction} className="space-y-3">
                <input type="hidden" name="id" value={demo.id} />
                <textarea name="note" placeholder="Notiz (optional)" className={input} rows={2} />
                <button className={btn.primary} type="submit">Freigeben &amp; veröffentlichen</button>
                {demo.status === 'qa_failed' ? <p className="text-xs text-amber-700">Achtung: QA nicht bestanden – nur freigeben, wenn die Befunde unkritisch sind.</p> : null}
              </form>
              <hr className="my-4" />
              <form action={rejectDemoAction} className="space-y-3">
                <input type="hidden" name="id" value={demo.id} />
                <textarea name="note" placeholder="Grund (Pflicht)" required className={input} rows={2} />
                <div className="flex flex-wrap gap-2">
                  <button className={btn.secondary} type="submit" name="regenerate" value="1">Ablehnen &amp; neu generieren</button>
                  <button className={btn.danger} type="submit" name="regenerate" value="0">Ablehnen (Lead verwerfen)</button>
                </div>
              </form>
            </Card>
          ) : null}
          <Card title={`QA ${demo.qaResultJson ? (demo.qaResultJson.passed ? '– bestanden' : '– nicht bestanden') : ''}`}>
            <Table head={['Prüfung', 'Ergebnis', 'Details']} empty="Noch nicht geprüft">
              {(demo.qaResultJson?.checks ?? []).map((c) => (
                <tr key={c.name}>
                  <Td className="font-mono text-xs">{c.name}</Td>
                  <Td><Badge color={c.passed ? 'green' : 'red'}>{c.passed ? 'ok' : 'fehler'}</Badge></Td>
                  <Td className="text-xs break-words text-slate-600">{c.details ?? ''}</Td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Inhalt (JSON)">
            <pre className="max-h-96 overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(demo.contentJson, null, 2)}</pre>
          </Card>
          {demo.status === 'published' ? (
            <Card title="Öffentlich">
              <p className="text-sm">Slug: <code>{demo.slug}</code></p>
              <p className="text-sm">Läuft ab: {dt(demo.expiresAt)}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
