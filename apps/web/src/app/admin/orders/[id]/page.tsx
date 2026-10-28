import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, guaranteeStatus, schema } from '@wbm/core';
import { Card, PageHeader, StatusBadge, Table, Td, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur } from '@/lib/format';
import {
  approveClaimLetterAction,
  cancelClaimLetterAction,
  guaranteeRefundAction,
  refundOrderAction,
  resendInvoiceAction,
} from '../actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Bestellung' };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
  if (!order) notFound();
  const [customer, mails, log, payments, guarantee, claims] = await Promise.all([
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
    db.select().from(schema.orderPayments).where(eq(schema.orderPayments.orderId, id)).orderBy(desc(schema.orderPayments.paidAt)),
    guaranteeStatus(order),
    db
      .select()
      .from(schema.dunningLetters)
      .where(eq(schema.dunningLetters.orderId, id))
      .orderBy(desc(schema.dunningLetters.createdAt)),
  ]);
  const monthly = order.plan === 'monthly';
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
            <dt className="text-slate-500">Plan</dt>
            <dd>
              {order.offerSnapshot
                ? `V4 ${order.offerSnapshot.tier === 'basis' ? 'Basis' : 'Care+'}`
                : monthly
                  ? 'Monatlich (Option B)'
                  : 'Einmalzahlung (Option A)'}
            </dd>
            {order.offerSnapshot ? (
              <>
                <dt className="text-slate-500">Monatstarif gesamt</dt>
                <dd>{eur(order.offerSnapshot.monthlyCents)} ab bestätigtem Go-Live und Aboabschluss</dd>
                <dt className="text-slate-500">Tarif-Zustimmung</dt>
                <dd>
                  {dt(order.offerSnapshot.consentAt ? new Date(order.offerSnapshot.consentAt) : null)} ·{' '}
                  {order.offerSnapshot.consentVersion}
                </dd>
                <dt className="text-slate-500">Abo</dt>
                <dd className="break-all">
                  {order.stripeSubscriptionId ?? 'Noch nicht abgeschlossen'} · {order.subscriptionStatus ?? 'wartet auf Go-Live'}
                </dd>
                <dt className="text-slate-500">Inklusive Änderungen</dt>
                <dd>{order.offerSnapshot.includedChangeMinutes} Minuten pro Monat; kein Übertrag</dd>
              </>
            ) : null}
            {monthly ? (
              <>
                <dt className="text-slate-500">Abo</dt>
                <dd>
                  <span className="font-mono text-xs break-all">{order.stripeSubscriptionId ?? '–'}</span>
                  {order.subscriptionStatus ? <StatusBadge status={order.subscriptionStatus} /> : null}
                </dd>
                <dt className="text-slate-500">Zeitplan 49 € → 19 €</dt>
                <dd className="font-mono text-xs break-all">{order.stripeScheduleId ?? 'noch nicht angelegt'}</dd>
                <dt className="text-slate-500">Mindestlaufzeit bis</dt>
                <dd>{dt(order.minTermEndsAt)}</dd>
              </>
            ) : null}
            <dt className="text-slate-500">Mahnverfahren</dt>
            <dd>
              {['–', 'Erinnerung 1 gesendet', 'Erinnerung 2 gesendet', 'Wartungsmodus'][order.dunningStage] ?? '–'}
              {order.dunningUpdatedAt ? ` · ${dt(order.dunningUpdatedAt)}` : ''}
            </dd>
            <dt className="text-slate-500">Garantie bis</dt>
            <dd>{dt(order.guaranteeEndsAt)}</dd>
            {order.endedAt ? (
              <>
                <dt className="text-slate-500">Vertrag beendet</dt>
                <dd>
                  {dt(order.endedAt)} · {order.endedReason}
                </dd>
              </>
            ) : null}
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
              {order.refundDocuments.map((d) => (
                <div key={d.number}>
                  <a href={`/admin/files/${d.pdfKey}`} className="text-brand-700 underline">
                    Korrektur {d.number}: {eur(d.deltaCents)}
                  </a>{' '}
                  · versendet {dt(d.sentAt ? new Date(d.sentAt) : null)}
                </div>
              ))}
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
              <SubmitButton className={btn.secondary}>Rechnung erneut senden</SubmitButton>
            </form>
          ) : null}
        </Card>
        {payments.length ? (
          <Card title="Weitere Zahlungen (Monatsraten / Hosting & Pflege)">
            <Table head={['Bezahlt', 'Rate', 'Betrag', 'Rechnung']}>
              {payments.map((p) => (
                <tr key={p.id}>
                  <Td>{dt(p.paidAt)}</Td>
                  <Td>{p.sequence}</Td>
                  <Td>{eur(p.amountCents)}</Td>
                  <Td>
                    {p.invoicePdfKey ? (
                      <a href={`/admin/files/${p.invoicePdfKey}`} className="text-brand-700 underline">
                        {p.invoiceNumber}
                      </a>
                    ) : (
                      p.invoiceNumber
                    )}{' '}
                    · versendet {dt(p.invoiceSentAt)}
                    {p.refundedCents ? <p>Bestätigt erstattet: {eur(p.refundedCents)}</p> : null}
                    {p.refundDocuments.map((d) => (
                      <div key={d.number}>
                        <a href={`/admin/files/${d.pdfKey}`} className="text-brand-700 underline">
                          Korrektur {d.number}: {eur(d.deltaCents)}
                        </a>{' '}
                        · versendet {dt(d.sentAt ? new Date(d.sentAt) : null)}
                      </div>
                    ))}
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        ) : null}
        {claims.length ? (
          <Card title="Forderungsbriefe (offene Raten)">
            <ul className="space-y-4 text-sm">
              {claims.map((c) => (
                <li key={c.id} className="rounded-lg border border-slate-200 p-3">
                  <p>
                    <StatusBadge status={c.status} /> {c.openRates} offene Raten · {eur(c.amountCents)} · erstellt{' '}
                    {dt(c.createdAt)}
                    {c.pdfStorageKey ? (
                      <>
                        {' · '}
                        <a href={`/admin/files/${c.pdfStorageKey}`} className="text-brand-700 underline">
                          PDF ansehen
                        </a>
                      </>
                    ) : null}
                  </p>
                  {c.note ? <p className="mt-1 text-slate-600">{c.note}</p> : null}
                  {c.status === 'draft' ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <form action={approveClaimLetterAction} className="flex items-end gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="orderId" value={order.id} />
                        <div>
                          <label htmlFor={`c-${c.id}`} className={label}>
                            FREIGEBEN eintippen
                          </label>
                          <input id={`c-${c.id}`} name="confirm" required className={input} autoComplete="off" />
                        </div>
                        <SubmitButton className={btn.primary}>Freigeben und versenden</SubmitButton>
                      </form>
                      <form action={cancelClaimLetterAction} className="flex items-end gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="orderId" value={order.id} />
                        <input name="note" placeholder="Grund (optional)" className={input} />
                        <SubmitButton className={btn.secondary}>Verwerfen</SubmitButton>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {guarantee.available ? (
          <Card title="Zufriedenheitsgarantie">
            <form action={guaranteeRefundAction} className="space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <p className="text-sm text-slate-600">
                Gilt bis {dt(guarantee.endsAt)}. Erstattet {eur(order.amountCents - order.refundedCents)}
                {monthly ? ' (erste Rate) und beendet den Monatsvertrag sofort' : ''}, nimmt die Seite offline und meldet eine
                registrierte Domain zur Übertragung bzw. Kündigung. Löst eine echte Erstattung aus.
              </p>
              <div>
                <label htmlFor="g-confirm" className={label}>
                  Zur Bestätigung GARANTIE eintippen
                </label>
                <input id="g-confirm" name="confirm" required className={input} autoComplete="off" />
              </div>
              <SubmitButton className={btn.danger}>Garantie ausführen</SubmitButton>
            </form>
          </Card>
        ) : null}
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
              <SubmitButton className={btn.danger}>Erstatten</SubmitButton>
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
