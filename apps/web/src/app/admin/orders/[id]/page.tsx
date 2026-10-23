import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { Card, PageHeader, StatusBadge, Table, Td, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur } from '@/lib/format';
import { refundOrderAction, resendInvoiceAction } from '../actions';

export const metadata = { title: 'Bestellung' };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
  if (!order) notFound();
  const [customer, mails, log] = await Promise.all([
    db.query.customers.findFirst({ where: eq(schema.customers.orderId, id) }),
    db
      .select()
      .from(schema.outboundEmails)
      .where(eq(schema.outboundEmails.orderId, id))
      .orderBy(desc(schema.outboundEmails.createdAt)),
    db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.entity, 'order'), eq(schema.auditLog.entityId, id)))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(50),
  ]);
  const a = order.billingAddressJson;
  return (
    <>
      <PageHeader
        title={`Bestellung ${order.invoiceNumber ?? order.id.slice(0, 8)}`}
        subtitle={<StatusBadge status={order.status} />}
        actions={
          order.leadId ? (
            <Link href={`/admin/leads/${order.leadId}`} className={btn.secondary}>
              Lead öffnen
            </Link>
          ) : null
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Rechnungsdaten">
          <dl className="grid grid-cols-[10rem_1fr] gap-y-1.5 text-sm">
            <dt className="text-slate-500">Firma</dt>
            <dd>{order.customerCompany}</dd>
            <dt className="text-slate-500">Ansprechpartner</dt>
            <dd>{order.customerName}</dd>
            <dt className="text-slate-500">Anschrift</dt>
            <dd>
              {a.street}, {a.postalCode} {a.city}
            </dd>
            <dt className="text-slate-500">E-Mail</dt>
            <dd>{order.customerEmail}</dd>
            <dt className="text-slate-500">Telefon</dt>
            <dd>{order.customerPhone ?? '–'}</dd>
            <dt className="text-slate-500">Wunschdomain</dt>
            <dd>{order.domainWish ?? '–'}</dd>
            <dt className="text-slate-500">B2B bestätigt</dt>
            <dd>{order.b2bConfirmed ? 'ja' : 'nein'}</dd>
            <dt className="text-slate-500">AGB</dt>
            <dd>
              {order.termsVersion ?? '–'} · {dt(order.termsAcceptedAt)}
            </dd>
            <dt className="text-slate-500">Abo-Option</dt>
            <dd>{order.subscriptionOptIn ? 'gewünscht' : 'nein'}</dd>
          </dl>
        </Card>
        <Card title="Zahlung & Rechnung">
          <dl className="grid grid-cols-[10rem_1fr] gap-y-1.5 text-sm">
            <dt className="text-slate-500">Betrag</dt>
            <dd>
              {eur(order.amountCents)}{' '}
              {order.vatCents ? `(netto ${eur(order.netCents)}, USt ${eur(order.vatCents)})` : '(ohne USt, § 19)'}
            </dd>
            <dt className="text-slate-500">Anbieter</dt>
            <dd>{order.provider}</dd>
            <dt className="text-slate-500">Session / Zahlung</dt>
            <dd className="font-mono text-xs break-all">
              {order.stripeSessionId ?? '–'}
              <br />
              {order.stripePaymentIntent ?? '–'}
            </dd>
            <dt className="text-slate-500">Bezahlt</dt>
            <dd>{dt(order.paidAt)}</dd>
            <dt className="text-slate-500">Rechnung</dt>
            <dd>
              {order.invoicePdfKey ? (
                <a href={`/admin/files/${order.invoicePdfKey}`} className="text-brand-700 underline">
                  {order.invoiceNumber} (PDF)
                </a>
              ) : (
                (order.invoiceNumber ?? '–')
              )}{' '}
              · versendet {dt(order.invoiceSentAt)}
            </dd>
            <dt className="text-slate-500">Erstattet</dt>
            <dd>
              {order.refundedCents ? `${eur(order.refundedCents)} am ${dt(order.refundedAt)}` : '–'}
              {order.cancellationPdfKey ? (
                <>
                  {' · '}
                  <a href={`/admin/files/${order.cancellationPdfKey}`} className="text-brand-700 underline">
                    Storno {order.cancellationNumber}
                  </a>
                </>
              ) : null}
            </dd>
            <dt className="text-slate-500">Kunde</dt>
            <dd>
              {customer ? (
                <Link href={`/admin/customers/${customer.id}`} className="text-brand-700 underline">
                  {customer.company}
                </Link>
              ) : (
                '–'
              )}
            </dd>
          </dl>
          {order.invoiceNumber ? (
            <form action={resendInvoiceAction} className="mt-4">
              <input type="hidden" name="id" value={order.id} />
              <button className={btn.secondary}>Rechnung erneut senden</button>
            </form>
          ) : null}
        </Card>
        {order.status === 'paid' ? (
          <Card title="Erstattung">
            <form action={refundOrderAction} className="space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <p className="text-sm text-slate-600">
                Löst eine echte Erstattung beim Zahlungsanbieter aus. Eine Stornorechnung wird automatisch erstellt und versendet.
              </p>
              <div>
                <label htmlFor="amount" className={label}>
                  Betrag in € (leer = voller Betrag {eur(order.amountCents - order.refundedCents)})
                </label>
                <input id="amount" name="amount" inputMode="decimal" className={input} />
              </div>
              <div>
                <label htmlFor="confirm" className={label}>
                  Zur Bestätigung ERSTATTEN eintippen
                </label>
                <input id="confirm" name="confirm" required className={input} autoComplete="off" />
              </div>
              <button className={btn.danger}>Erstatten</button>
            </form>
          </Card>
        ) : null}
        <Card title="E-Mails">
          <Table head={['Zeit', 'Art', 'Betreff', 'Status']} empty="Keine E-Mails">
            {mails.map((m) => (
              <tr key={m.id}>
                <Td>{dt(m.createdAt)}</Td>
                <Td>{m.kind}</Td>
                <Td>{m.subject}</Td>
                <Td>
                  <StatusBadge status={m.status} />
                  {m.error ? <span className="block text-xs text-red-700">{m.error}</span> : null}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Verlauf" className="lg:col-span-2">
          <Table head={['Zeit', 'Aktion', 'Auslöser', 'Kontext']}>
            {log.map((l) => (
              <tr key={l.id}>
                <Td>{dt(l.createdAt)}</Td>
                <Td>{l.action}</Td>
                <Td>{l.actor}</Td>
                <Td className="font-mono text-xs">{JSON.stringify(l.contextJson)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
