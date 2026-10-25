import { desc, eq } from 'drizzle-orm';
import { getDb, schema, formatEuro, formatDateLongDe, v4Offer, careOverview } from '@wbm/core';
import { ActionForm } from '@/components/action-form';
import { manageTariff } from './actions';
import { SubscribeButton } from './subscribe-button';

export async function TariffPanel({
  token,
  customer,
  order,
  email,
}: {
  token: string;
  customer: typeof schema.customers.$inferSelect;
  order: typeof schema.orders.$inferSelect;
  email: string;
}) {
  const offer = order.activeOfferSnapshot ?? order.offerSnapshot!;
  const [requests, care] = await Promise.all([
    getDb()
      .select()
      .from(schema.tariffChanges)
      .where(eq(schema.tariffChanges.orderId, order.id))
      .orderBy(desc(schema.tariffChanges.createdAt)),
    careOverview(customer.id),
  ]);
  const pending = requests.find((r) => r.status === 'requested' || r.status === 'scheduled');
  const active = Boolean(order.stripeSubscriptionId) && order.subscriptionStatus === 'active' && !order.endedAt;
  const target = v4Offer(offer.tier === 'basis' ? 'care_plus' : 'basis');
  const action = manageTariff.bind(null, token);
  let invoiceUrl: string | null = null;
  try {
    const u = new URL(order.billingActionUrl ?? '');
    if (u.protocol === 'https:' && u.hostname === 'invoice.stripe.com') invoiceUrl = u.toString();
  } catch {
    /* no invoice requiring action */
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Ihre private Tarifverwaltung · {customer.company}</p>
        <h1 className="mt-2 text-3xl font-semibold">SeitenWerk {offer.tier === 'basis' ? 'Basis' : 'Care+'}</h1>
        <p className="mt-3 text-lg">
          {formatEuro(offer.monthlyCents)} pro Monat insgesamt. Monatlich kündbar. Keine zusätzliche Basisgebühr.
        </p>
      </div>
      {order.endedAt ? (
        <p>
          Ihr Vertrag ist beendet. Fragen zur Übergabe?{' '}
          <a href={`mailto:${email}`} className="underline">
            {email}
          </a>
        </p>
      ) : order.cancelAtPeriodEnd ? (
        <p role="status" className="rounded-xl bg-slate-100 p-4">
          Ihre Kündigung zum Ende des laufenden Abrechnungszeitraums ist vorgemerkt. Die Domain- und Websiteübergabe klären wir
          schriftlich mit Ihnen.
        </p>
      ) : !order.stripeSubscriptionId ? (
        order.offerSnapshot!.billingMode === 'saved_mandate' ? (
          <p className="rounded-xl bg-blue-50 p-4">
            Der Monatstarif beginnt erst nach bestätigter Veröffentlichung. Das beim Kauf vereinbarte Zahlungsmittel wird dafür
            verwendet. Sie müssen kein zweites Abo abschließen.
          </p>
        ) : (
          <SubscribeButton token={token} label="Monatstarif ausdrücklich bestätigen" />
        )
      ) : !active ? (
        <div role="status" className="rounded-xl bg-amber-50 p-4">
          <p>Die Monatszahlung ist noch nicht abschließend bestätigt. Es wird kein zweites Abo angelegt.</p>
          {invoiceUrl ? (
            <a href={invoiceUrl} className="mt-3 inline-block underline" rel="noreferrer">
              Zahlung bei Stripe prüfen
            </a>
          ) : (
            <a href={`mailto:${email}`} className="underline">
              Schreiben Sie uns bei Rückfragen.
            </a>
          )}
        </div>
      ) : (
        <p className="rounded-xl bg-emerald-50 p-4">
          Ihr Monatstarif ist aktiv.
          {care.period
            ? ` Aktueller Zeitraum: ${formatDateLongDe(care.period.start)} bis ${formatDateLongDe(new Date(care.period.end.getTime() - 86400000))}.`
            : ''}
        </p>
      )}
      {offer.tier === 'care_plus' ? (
        <div>
          <h2 className="text-lg font-semibold">Ihre Inhaltsänderungen</h2>
          <p className="mt-2">
            {care.usedMinutes} von höchstens {care.limit} Minuten im aktuellen Abrechnungsmonat erfasst. Ungenutzte Minuten werden
            nicht übertragen. Größere Arbeiten erhalten ein eigenes Angebot; ohne Ihre Zustimmung entstehen keine Zusatzkosten.
          </p>
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(`Änderungswunsch – ${customer.company}`)}`}
            className="mt-3 inline-block underline"
          >
            Änderungswunsch schriftlich senden
          </a>
        </div>
      ) : null}
      {pending ? (
        <section className="border-t border-slate-200 pt-5">
          <h2 className="text-lg font-semibold">Ihr Tarifwechsel</h2>
          <p className="my-3">
            Zu {pending.toTier === 'basis' ? 'Basis' : 'Care+'}:{' '}
            {pending.status === 'requested' ? 'wird geprüft' : `vorgemerkt ab ${formatDateLongDe(pending.effectiveAt!)}`}. Bis
            dahin gilt Ihr aktueller Tarif.
          </p>
          <ActionForm action={action} submit="Wechsel zurücknehmen">
            <input type="hidden" name="operation" value="withdraw" />
            <input type="hidden" name="id" value={pending.id} />
          </ActionForm>
        </section>
      ) : active && !order.cancelAtPeriodEnd ? (
        <section className="border-t border-slate-200 pt-5">
          <h2 className="text-lg font-semibold">Tarif wechseln</h2>
          <p className="my-3">
            {target.tier === 'basis' ? 'Basis' : 'Care+'} für insgesamt {formatEuro(target.monthlyCents)}/Monat ab dem nächsten
            Abrechnungszeitraum. Kein zweites Abo, keine anteilige Zwischenabrechnung. Wir bestätigen den Termin nach Prüfung.
          </p>
          <ActionForm action={action} submit="Tarifwechsel anfragen">
            <input type="hidden" name="operation" value="switch" />
            <input type="hidden" name="tier" value={target.tier} />
            <label className="flex gap-3 text-sm">
              <input type="checkbox" name="confirm" required />
              Ich wünsche diesen Wechsel zum genannten Monatsbetrag.
            </label>
          </ActionForm>
        </section>
      ) : null}
      {active && !order.cancelAtPeriodEnd ? (
        <section className="border-t border-slate-200 pt-5">
          <h2 className="text-lg font-semibold">Monatstarif kündigen</h2>
          <p className="my-3">
            Zum Ende des laufenden Abrechnungszeitraums. Danach endet das Hosting; eine Übergabe stimmen wir schriftlich ab.
            Offene Tarifwechsel werden zurückgenommen.
          </p>
          <ActionForm action={action} submit="Zum Periodenende kündigen">
            <input type="hidden" name="operation" value="cancel" />
            <label className="flex gap-3 text-sm">
              <input type="checkbox" name="confirm" required />
              Ich bestätige die Kündigung meines Monatstarifs.
            </label>
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}
