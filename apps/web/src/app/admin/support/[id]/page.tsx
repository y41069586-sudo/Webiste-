import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, desc, eq, or } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { Card, Notice, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { KIND_LABELS } from '@/lib/support-labels';
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
      <div className="dcheck-head">
        <div>
          <p className="dcheck-name">{m.subject || '(ohne Betreff)'}</p>
          <p className="dcheck-sub">
            Von {m.fromEmail ?? 'unbekannt'} · {dt(m.createdAt)}
            {m.classification ? ` · ${KIND_LABELS[m.classification] ?? m.classification}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {wishDemo ? (
            <Link href={`/admin/demos/${wishDemo.id}#anpassen`} className={btn.primary}>
              Demo jetzt anpassen
            </Link>
          ) : null}
          <Link href="/admin/support" className={btn.secondary}>
            Zurück
          </Link>
        </div>
      </div>
      {hinweis ? (
        <div className="mb-6">
          <Notice kind="warn">{hinweis}</Notice>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Nachricht">
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
                Betrieb:{' '}
                <Link href={`/admin/leads/${lead.id}`} className="text-brand-700 underline">
                  {lead.businessName}
                </Link>
              </p>
            ) : null}
          </div>
        </Card>
        <div className="check-card">
          {editable ? (
            <form action={approveReplyAction} className="grid gap-3">
              <input type="hidden" name="id" value={m.id} />
              <label htmlFor="text" className="check-q">
                Deine Antwort (Entwurf – Anrede und Gruß kommen von selbst dazu)
              </label>
              <textarea id="text" name="text" rows={12} defaultValue={m.draftReply ?? ''} className={input} />
              <SubmitButton className="ui-btn ui-btn-primary check-go">Antwort senden</SubmitButton>
            </form>
          ) : (
            <>
              <p className="check-q">Gesendete Antwort</p>
              <pre className="text-sm whitespace-pre-wrap">{m.draftReply ?? '–'}</pre>
            </>
          )}
          <details className="dcheck-reject">
            <summary>Andere Möglichkeiten</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={redraftAction}>
                <input type="hidden" name="id" value={m.id} />
                <SubmitButton className={btn.secondary}>Neuen Vorschlag schreiben</SubmitButton>
              </form>
              <form action={setStatusAction}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="status" value="done" />
                <SubmitButton className={btn.secondary}>Erledigt ohne Antwort</SubmitButton>
              </form>
              <form action={setStatusAction}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="status" value="ignored" />
                <SubmitButton className={btn.secondary}>Spam</SubmitButton>
              </form>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={m.id} />
                <SubmitButton className={btn.secondary}>Löschen (Werbung, Newsletter)</SubmitButton>
              </form>
            </div>
            <form action={optOutAction} className="mt-5 space-y-2 border-t border-slate-100 pt-4">
              <input type="hidden" name="id" value={m.id} />
              <p className="text-sm font-medium">Betrieb will keine Post mehr</p>
              <p className="text-xs text-slate-500">Sperrt den Betrieb für immer und löscht seine Daten.</p>
              {m.leadId ? (
                <input type="hidden" name="leadId" value={m.leadId} />
              ) : (
                <>
                  <label htmlFor="leadId" className={label}>
                    Betriebs-Nummer (aus „Alle Betriebe“ kopieren)
                  </label>
                  <input id="leadId" name="leadId" className={input} />
                </>
              )}
              <SubmitButton className={btn.danger}>Sperren und Daten löschen</SubmitButton>
            </form>
          </details>
        </div>
        {thread.length ? (
          <Card title="Verlauf" className="lg:col-span-2">
            <ul className="space-y-3 text-sm">
              {thread.map((t) => (
                <li key={t.id} className="rounded border border-slate-200 p-3">
                  <div className="mb-1 text-xs text-slate-500">
                    {t.direction === 'out' ? 'Deine Antwort' : 'Nachricht'} · {dt(t.createdAt)} · {t.subject}
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
