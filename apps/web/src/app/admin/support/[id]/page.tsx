import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq, or } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { Badge, Card, PageHeader, StatusBadge, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { approveReplyAction, optOutAction, redraftAction, setStatusAction } from '../actions';

export const metadata = { title: 'Support-Nachricht' };
export const dynamic = 'force-dynamic';

export default async function SupportMessagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const m = await db.query.supportMessages.findFirst({ where: eq(schema.supportMessages.id, id) });
  if (!m) notFound();
  const thread = await db
    .select()
    .from(schema.supportMessages)
    .where(or(eq(schema.supportMessages.inReplyToId, id), m.fromEmail ? eq(schema.supportMessages.toEmail, m.fromEmail) : eq(schema.supportMessages.id, id)))
    .orderBy(asc(schema.supportMessages.createdAt))
    .limit(20);
  const customer = m.customerId ? await db.query.customers.findFirst({ where: eq(schema.customers.id, m.customerId) }) : undefined;
  const lead = m.leadId ? await db.query.leads.findFirst({ where: eq(schema.leads.id, m.leadId) }) : undefined;
  const editable = ['drafted', 'escalated', 'classified', 'new'].includes(m.status);
  return (
    <>
      <PageHeader
        title={m.subject || '(ohne Betreff)'}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={m.status} />
            {m.classification ? <Badge color="blue">{m.classification}</Badge> : null}
            {m.classificationConfidence !== null ? <span className="text-xs">Sicherheit {Math.round((m.classificationConfidence ?? 0) * 100)} %</span> : null}
          </span>
        }
        actions={
          <Link href="/admin/support" className={btn.secondary}>
            Zurück
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Nachricht von ${m.fromEmail ?? 'unbekannt'} · ${dt(m.createdAt)}`}>
          {m.escalationReason ? <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">Hinweis: {m.escalationReason}</p> : null}
          <pre className="max-h-[60vh] overflow-auto text-sm whitespace-pre-wrap">{m.body}</pre>
          <div className="mt-4 text-sm text-slate-600">
            {customer ? (
              <p>
                Kunde:{' '}
                <Link href={`/admin/customers/${customer.id}`} className="text-brand-700 underline">
                  {customer.company}
                </Link>
              </p>
            ) : null}
            {lead ? (
              <p>
                Lead:{' '}
                <Link href={`/admin/leads/${lead.id}`} className="text-brand-700 underline">
                  {lead.businessName}
                </Link>{' '}
                ({lead.status})
              </p>
            ) : null}
            {!customer && !lead ? <p>Keine Zuordnung zu Kunde oder Lead.</p> : null}
          </div>
        </Card>
        <Card title="Antwort">
          {editable ? (
            <form action={approveReplyAction} className="space-y-3">
              <input type="hidden" name="id" value={m.id} />
              <label htmlFor="text" className={label}>
                Entwurf (Anrede und Signatur werden automatisch ergänzt)
              </label>
              <textarea id="text" name="text" rows={12} defaultValue={m.draftReply ?? ''} className={input} />
              <button className={btn.primary}>Freigeben und senden</button>
            </form>
          ) : (
            <pre className="text-sm whitespace-pre-wrap">{m.draftReply ?? '–'}</pre>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={redraftAction}>
              <input type="hidden" name="id" value={m.id} />
              <button className={btn.secondary}>Neu klassifizieren & entwerfen</button>
            </form>
            <form action={setStatusAction}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="done" />
              <button className={btn.secondary}>Ohne Antwort erledigt</button>
            </form>
            <form action={setStatusAction}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="ignored" />
              <button className={btn.secondary}>Spam</button>
            </form>
          </div>
          <form action={optOutAction} className="mt-6 space-y-2 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={m.id} />
            <p className="text-sm font-medium">Widerspruch manuell umsetzen</p>
            <label htmlFor="leadId" className={label}>
              Lead-ID (falls nicht zugeordnet – aus der Lead-Liste kopieren)
            </label>
            <input id="leadId" name="leadId" defaultValue={m.leadId ?? ''} className={input} />
            <button className={btn.danger}>Sperren und Daten löschen</button>
          </form>
        </Card>
        {thread.length ? (
          <Card title="Verlauf" className="lg:col-span-2">
            <ul className="space-y-3 text-sm">
              {thread.map((t) => (
                <li key={t.id} className="rounded border border-slate-200 p-3">
                  <div className="mb-1 text-xs text-slate-500">
                    {t.direction === 'out' ? 'Antwort' : 'Eingang'} · {dt(t.createdAt)} · {t.subject}
                  </div>
                  <pre className="whitespace-pre-wrap">{t.body.slice(0, 2000)}</pre>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
