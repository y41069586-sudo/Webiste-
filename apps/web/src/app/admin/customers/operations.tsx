import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { careOverview, getDb, schema } from '@wbm/core';
import { ActionForm } from '@/components/action-form';
import { Card, Notice, Table, Td, input, label } from '@/components/ui';
import { dt, eur } from '@/lib/format';
import { customerOperation } from './operations-actions';

export async function CustomerOperations({
  customerId,
  order,
}: {
  customerId: string;
  order: typeof schema.orders.$inferSelect;
}) {
  const [care, changes] = await Promise.all([
    careOverview(customerId),
    getDb()
      .select()
      .from(schema.tariffChanges)
      .where(eq(schema.tariffChanges.orderId, order.id))
      .orderBy(desc(schema.tariffChanges.createdAt)),
  ]);
  const hidden = (operation: string, id?: string) => (
    <>
      <input type="hidden" name="operation" value={operation} />
      <input type="hidden" name="customerId" value={customerId} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
    </>
  );
  const offer = order.activeOfferSnapshot ?? order.offerSnapshot!;
  return (
    <>
      <Card title="Tarif & Abrechnung" className="lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="font-semibold">
              {offer.tier === 'basis' ? 'Basis' : 'Care+'} · {eur(offer.monthlyCents)}/Monat insgesamt
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Status: {order.subscriptionStatus ?? 'noch nicht gestartet'} · Abrechnung seit {dt(order.billingStartedAt)}
              {order.cancelAtPeriodEnd ? ' · Kündigung zum Periodenende vorgemerkt' : ''}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ursprüngliches Angebot: {order.offerSnapshot!.tier === 'basis' ? 'Basis' : 'Care+'}; der Kaufstand bleibt
              unverändert.
            </p>
          </div>
          {!order.stripeSubscriptionId && order.offerSnapshot?.billingMode === 'saved_mandate' && !order.endedAt ? (
            <ActionForm action={customerOperation} submit="Abostart erneut prüfen">
              {hidden('billing', order.id)}
            </ActionForm>
          ) : null}
        </div>
        <Table head={['Wechsel', 'Stand', 'Wirksam ab', 'Aktion']} empty="Keine Wechselanfragen">
          {changes.map((r) => (
            <tr key={r.id}>
              <Td>
                {r.fromTier === 'basis' ? 'Basis' : 'Care+'} → {r.toTier === 'basis' ? 'Basis' : 'Care+'}
              </Td>
              <Td>{r.status}</Td>
              <Td>{dt(r.effectiveAt)}</Td>
              <Td>
                {r.status === 'requested' ? (
                  <ActionForm action={customerOperation} submit="Zum Periodenende einplanen">
                    {hidden('tariffApprove', r.id)}
                    <label className="flex gap-2">
                      <input type="checkbox" name="confirm" required />
                      Kundenwunsch und nächsten Abrechnungszeitraum geprüft
                    </label>
                  </ActionForm>
                ) : null}
                {['requested', 'scheduled'].includes(r.status) ? (
                  <ActionForm action={customerOperation} submit="Wechsel zurücknehmen">
                    {hidden('tariffCancel', r.id)}
                  </ActionForm>
                ) : null}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Betreuung & Arbeitszeit" className="lg:col-span-2">
        <p className="mb-4 text-sm">
          {care.period
            ? `${dt(care.period.start)} bis ${dt(care.period.end)}: ${care.usedMinutes} von ${care.limit} Inklusivminuten erfasst, ${care.remainingMinutes} verbleibend.`
            : 'Arbeitszeit erst mit nachgewiesenem Abrechnungsbeginn erfassen.'}{' '}
          Kein Übertrag; technische Betreuung wird getrennt erfasst.
        </p>
        <ActionForm action={customerOperation} submit="Geleistete Arbeit buchen" className="rounded-xl bg-slate-50 p-4">
          {hidden('work')}
          <input type="hidden" name="reference" value={`care-${randomUUID()}`} />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={label}>
              Art
              <select name="kind" className={input}>
                <option value="included_content">Kleine Inhaltsänderung (inklusive)</option>
                <option value="technical">Technische Betreuung</option>
                <option value="extra_content">Zusatzarbeit mit Kundenfreigabe</option>
              </select>
            </label>
            <label className={label}>
              Minuten
              <input className={input} name="minutes" type="number" min="1" max="1440" required />
            </label>
            <label className={label}>
              Interner Kostensatz €/Stunde (optional)
              <input className={input} name="hourlyCost" type="number" min="0" max="10000" step="0.01" />
            </label>
            <label className={label}>
              Tatsächlich geleistet am (UTC)
              <input className={input} name="workedAt" type="datetime-local" required />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Arbeit / dokumentierte Freigabe
              <input className={input} name="note" minLength={3} maxLength={300} required />
            </label>
          </div>
          <label className="flex gap-2 text-sm">
            <input name="extraApproved" type="checkbox" />
            Für Zusatzarbeit liegt eine ausdrückliche Kundenfreigabe vor.
          </label>
          <p className="text-xs text-slate-500">
            Bucht interne Kosten, löst keine Zahlung aus. Ein fehlender Kostensatz blockiert den vollständigen Deckungsbeitrag.
          </p>
        </ActionForm>
        <Table head={['Datum / Arbeit', 'Minuten', 'Kosten', 'Korrektur']} empty="Noch keine Arbeit erfasst">
          {care.rows.map((r) => (
            <tr key={r.id}>
              <Td>
                {dt(r.workedAt)}
                <p className="max-w-sm whitespace-pre-wrap text-xs">
                  {r.note} · {r.kind}
                  {r.voidedAt ? ' · storniert' : ''}
                </p>
              </Td>
              <Td>{r.minutes}</Td>
              <Td>{r.costCents === null ? 'unbewertet' : eur(r.costCents)}</Td>
              <Td>
                {!r.voidedAt ? (
                  <>
                    {r.costCents === null ? (
                      <ActionForm action={customerOperation} submit="Kosten bewerten">
                        {hidden('price', r.id)}
                        <label className={label}>
                          €/Stunde
                          <input name="hourlyCost" type="number" min="0" step="0.01" required className={input} />
                        </label>
                      </ActionForm>
                    ) : null}
                    <ActionForm action={customerOperation} submit="Buchung stornieren">
                      {hidden('void', r.id)}
                      <label className="flex gap-2 text-xs">
                        <input type="checkbox" name="confirm" required />
                        Korrektur bestätigen
                      </label>
                    </ActionForm>
                  </>
                ) : null}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      {offer.tier === 'care_plus' ? (
        <Card title="Monatlicher Technik-Check" className="lg:col-span-2">
          <Notice>
            Automatische Erreichbarkeits- und Routenprüfung ersetzt weder eine visuelle noch eine rechtliche Abnahme.
            Mock-/DRY_RUN-Prüfungen sind ausdrücklich simuliert.
          </Notice>
          <ActionForm action={customerOperation} submit="Technik-Check ausführen">
            {hidden('check')}
          </ActionForm>
          <Table head={['Monat', 'Technisch', 'Details', 'Manuelle Prüfung']} empty="Noch kein Monatscheck">
            {care.checks.map((r) => (
              <tr key={r.id}>
                <Td>{r.month}</Td>
                <Td>
                  {r.status}
                  {r.simulated ? ' (simuliert)' : ''}
                </Td>
                <Td>
                  <dl className="text-xs">
                    {Object.entries(r.checks ?? {}).map(([k, v]) => (
                      <div key={k}>
                        {k}: {String(v)}
                      </div>
                    ))}
                  </dl>
                </Td>
                <Td>
                  {r.status === 'passed' ? (
                    <ActionForm action={customerOperation} submit="Prüfung dokumentieren">
                      {hidden('review', r.id)}
                      <label className={label}>
                        Prüfvermerk
                        <textarea name="note" minLength={10} maxLength={1000} required className={input} />
                      </label>
                      <label className="flex gap-2 text-xs">
                        <input type="checkbox" name="confirm" required />
                        Inhalte und Darstellung tatsächlich geprüft
                      </label>
                    </ActionForm>
                  ) : (
                    (r.reviewNote ?? 'offen')
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      ) : null}
    </>
  );
}
