import { randomUUID } from 'node:crypto';
import { financeReportV4, getDb, schema } from '@wbm/core';
import { ActionForm } from '@/components/action-form';
import { Card, Notice, Stat, Table, Td, btn, input, label } from '@/components/ui';
import { eur, pct } from '@/lib/format';
import { financeOperation } from './actions';

export async function FinanceOperations({ from, to }: { from?: string; to?: string }) {
  let report;
  try {
    report = await financeReportV4(from, to);
  } catch {
    return <Notice kind="warn">Zeitraum ungültig. Bitte gültige Datumsangaben verwenden.</Notice>;
  }
  const customers = await getDb()
    .select({ id: schema.customers.id, company: schema.customers.company })
    .from(schema.customers)
    .limit(500);
  return (
    <div className="my-6 space-y-6" id="wirtschaftlichkeit">
      <Card title="Umsatz & tatsächliche Kosten">
        <form className="flex flex-wrap items-end gap-3">
          <label className={label}>
            Zahlungen von
            <input name="from" type="date" className={input} defaultValue={report.range.from} />
          </label>
          <label className={label}>
            bis
            <input name="to" type="date" className={input} defaultValue={report.range.to} />
          </label>
          <button className={btn.secondary}>Zeitraum anzeigen</button>
        </form>
        <p className="mt-3 text-sm text-slate-600">
          Zahlungen mit Zahlungseingang im Zeitraum, abzüglich aller dazu bislang bestätigten Erstattungen. Keine Umsatzprognose.
          MRR zeigt den aktuellen Vertragsstand und ist kein Geldeingang. Kosten zum tatsächlichen Leistungsdatum.
        </p>
      </Card>
      {report.reconciliationPending ? (
        <Notice kind="warn">
          {report.reconciliationPending} Erstattungszuordnung(en) offen. Die Zahlen zeigen nur bekannte Buchungen; ein
          vollständiger Saldo und Deckungsbeitrag sind bis zur Klärung gesperrt.
        </Notice>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={report.reconciliationPending ? 'Bekannte Buchungen – Zuordnung offen' : 'Vereinnahmt nach Erstattungen'}
          value={eur(report.receivedCents)}
          hint={`Einrichtung ${eur(report.setupReceivedCents)} · Monatszahlungen ${eur(report.monthlyReceivedCents)} · Erstattungen ${eur(report.refundsCents)}`}
        />
        <Stat
          label="Erfasste tatsächliche Kosten"
          value={eur(report.actualCostCents)}
          hint={`${report.unpricedWork} unbewertete Arbeiten · ${report.estimatedCosts} Schätzungen nicht eingerechnet`}
        />
        <Stat
          label="Deckungsbeitrag"
          value={report.contributionCents === null ? 'offen' : eur(report.contributionCents)}
          hint={
            report.reviewed
              ? 'Vollständigkeit für diesen Datenstand bestätigt'
              : 'Vollständige Istkosten müssen erst bestätigt werden'
          }
        />
        <Stat
          label="Bekannter aktiver V4-MRR"
          value={eur(report.knownV4MrrCents)}
          hint={`Care+-Anteil an V4-Käufen ${report.carePlusShare === null ? '–' : pct(report.carePlusShare)} · ${report.careMinutes} erfasste Arbeitsminuten`}
        />
      </div>
      <Card title="Beitrag pro Kunde und Brief">
        <p className="mb-3 text-sm">
          Je zahlendem Kunden: {report.perBuyerCents === null ? 'offen' : eur(report.perBuyerCents)} · je nachgewiesen oder
          geschätzt zugestelltem Brief: {report.perLetterCents === null ? 'offen' : eur(report.perLetterCents)}.
          Zeitraum-Auswertung, keine kausale Aussage über Varianten.
        </p>
        <Table
          head={['Branche / erster versandter Briefarm', 'Kunden', 'Briefe', 'Vereinnahmt', 'Kosten', 'Beitrag']}
          empty="Noch keine Daten"
        >
          {report.arms.map((a) => (
            <tr key={a.key}>
              <Td>{a.key}</Td>
              <Td>{a.buyers}</Td>
              <Td>{a.letters}</Td>
              <Td>{eur(a.cashCents)}</Td>
              <Td>{eur(a.costCents)}</Td>
              <Td>{a.contributionCents === null ? 'offen' : eur(a.contributionCents)}</Td>
            </tr>
          ))}
        </Table>
        <p className="mt-3 text-xs text-slate-500">
          Ein Briefarm wird nur dem ersten tatsächlich versandten Erstbrief zugeordnet. Gemeinkosten ohne Zuordnung blockieren den
          Beitrag je Arm. Es wird kein Testsieger errechnet.
        </p>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tatsächliche Betriebskosten erfassen">
          <ActionForm action={financeOperation} submit="Istkosten buchen">
            <input type="hidden" name="idempotencyKey" value={`cost-${randomUUID()}`} />
            <label className={label}>
              Kostenart
              <select name="kind" className={input}>
                <option value="hosting">Hosting</option>
                <option value="domain">Domain</option>
                <option value="payment_fee">Zahlungsgebühr</option>
                <option value="letter">Brief</option>
                <option value="other">Sonstige Kosten</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                Kosten in €<input name="amount" type="number" step="0.01" required className={input} />
              </label>
              <label className={label}>
                Leistungsdatum
                <input name="date" type="date" required max={new Date().toISOString().slice(0, 10)} className={input} />
              </label>
            </div>
            <label className={label}>
              Zuordnung
              <select name="customerId" className={input}>
                <option value="">Nicht zugeordnet / Gemeinkosten</option>
                {customers.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Belegreferenz
              <input name="reference" minLength={3} maxLength={160} required className={input} />
            </label>
            <p className="text-xs text-slate-500">
              Einzutragen sind wirtschaftliche Istkosten nach tatsächlich abzugsfähiger Vorsteuer; ohne Vorsteuerabzug
              Bruttokosten. Keine Steuerannahme. Bereits automatisch gebuchte Providerkosten nicht doppelt erfassen. Negative
              Werte ausschließlich als belegte Korrektur.
            </p>
          </ActionForm>
        </Card>
        <Card title="Vollständigkeit der Kosten">
          {report.coverageInvalidated ? (
            <Notice kind="warn">
              Seit der letzten Prüfung haben sich Daten geändert oder Kosten fehlen. Der Beitrag wird wieder ausgeblendet.
            </Notice>
          ) : null}
          <ActionForm action={financeOperation} submit="Datenstand bestätigen">
            <input type="hidden" name="operation" value="coverage" />
            <input type="hidden" name="from" value={report.range.from} />
            <input type="hidden" name="to" value={report.range.to} />
            <label className="flex gap-3 text-sm">
              <input type="checkbox" name="confirm" required />
              Alle Hosting-, Domain-, Zahlungs-, Brief-, KI- und Arbeitskosten dieses Zeitraums sind vollständig und ohne
              Doppelerfassung gebucht. Unbewertete Arbeiten und Schätzungen sind geklärt.
            </label>
            <p className="text-xs text-slate-500">
              Bestätigt nur den geprüften Buchungsstand. Neue Zahlungen, Erstattungen und Kosten machen eine erneute Prüfung
              erforderlich. Keine steuerliche oder rechtliche Abnahme.
            </p>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
