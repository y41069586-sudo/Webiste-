import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, desc, eq, or } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { Badge, Card, Notice, PageHeader, StatusBadge, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { approveReplyAction, deleteAction, optOutAction, redraftAction, setStatusAction } from '../actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Support-Nachricht' };
export const dynamic = 'force-dynamic';

export default async function SupportMessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hinweis?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { hinweis }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const m = await db.query.supportMessages.findFirst({ where: eq(schema.supportMessages.id, id) });
  if (!m) notFound();
  const thread = await db
    .select()
    .from(schema.supportMessages)
    .where(
      or(
        eq(schema.supportMessages.inReplyToId, id),
        m.fromEmail ? eq(schema.supportMessages.toEmail, m.fromEmail) : eq(schema.supportMessages.id, id),
      ),
    )
    .orderBy(asc(schema.supportMessages.createdAt))
    .limit(20);
  const customer = m.customerId
    ? await db.query.customers.findFirst({ where: eq(schema.customers.id, m.customerId) })
    : undefined;
  const lead = m.leadId ? await db.query.leads.findFirst({ where: eq(schema.leads.id, m.leadId) }) : undefined;
  // Kostenloser Änderungswunsch vor dem Kauf: direkt zur Demo-Anpassung
  const wishDemo =
    m.leadId && m.subject?.startsWith('Änderungswunsch vor dem Kauf')
      ? (
          await db
            .select({ id: schema.demos.id })
            .from(schema.demos)
            .where(eq(schema.demos.leadId, m.leadId))
            .orderBy(desc(schema.demos.createdAt))
            .limit(1)
        )[0]
      : undefined;
  const editable = ['drafted', 'escalated', 'classified', 'new'].includes(m.status);
  return (
    <>
      <PageHeader
        title={m.subject || '(ohne Betreff)'}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={m.status} />
            {m.classification ? <Badge color="blue">{m.classification}</Badge> : null}
            {m.classificationConfidence !== null ? (
              <span className="text-xs">Sicherheit {Math.round((m.classificationConfidence ?? 0) * 100)} %</span>
            ) : null}
          </span>
        }
        actions={
          <>
            {wishDemo ? (
              <Link href={`/admin/demos/${wishDemo.id}#anpassen`} className={btn.primary}>
                Demo jetzt anpassen
              </Link>
            ) : null}
            <Link href="/admin/support" className={btn.secondary}>
              Zurück
            </Link>
          </>
        }
      />
      {hinweis ? (
        <div className="mb-6">
          <Notice kind="warn">{hinweis}</Notice>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Nachricht von ${m.fromEmail ?? 'unbekannt'} · ${dt(m.createdAt)}`}>
          {m.escalationReason ? (
            <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">Hinweis: {m.escalationReason}</p>
          ) : null}
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
              <SubmitButton className={btn.primary}>Freigeben und senden</SubmitButton>
            </form>
          ) : (
            <pre className="text-sm whitespace-pre-wrap">{m.draftReply ?? '–'}</pre>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={redraftAction}>
              <input type="hidden" name="id" value={m.id} />
              <SubmitButton className={btn.secondary}>Neu klassifizieren & entwerfen</SubmitButton>
            </form>
            <form action={setStatusAction}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="done" />
              <SubmitButton className={btn.secondary}>Ohne Antwort erledigt</SubmitButton>
            </form>
            <form action={setStatusAction}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="ignored" />
              <SubmitButton className={btn.secondary}>Spam</SubmitButton>
            </form>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={m.id} />
              <SubmitButton className={btn.secondary}>Nachricht löschen (Newsletter, Werbung)</SubmitButton>
            </form>
          </div>
          <form action={optOutAction} className="mt-6 space-y-2 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={m.id} />
            <p className="text-sm font-medium">Werbewiderspruch eines angeschriebenen Betriebs umsetzen</p>
            <p className="text-xs text-slate-500">
              Nur wenn ein Betrieb keine Post mehr möchte: sperrt den Lead dauerhaft und löscht seine Daten.
            </p>
            <label htmlFor="leadId" className={label}>
              Lead-ID (falls nicht zugeordnet – aus der Lead-Liste kopieren)
            </label>
            <input id="leadId" name="leadId" defaultValue={m.leadId ?? ''} className={input} />
            <SubmitButton className={btn.danger}>Betrieb sperren und Daten löschen</SubmitButton>
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
