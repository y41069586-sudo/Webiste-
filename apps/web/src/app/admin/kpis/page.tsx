import { kpiFilterOptions, kpiRows, kpiSummary, type KpiFilter, type KpiRow } from '@wbm/core';
import { Card, PageHeader, Stat, Table, Td, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { eur, num, pct } from '@/lib/format';

export const metadata = { title: 'Kennzahlen' };
export const dynamic = 'force-dynamic';

const CATEGORY: Record<string, string> = {
  letter: 'Briefe',
  places_api: 'Google Places',
  llm: 'KI',
  domain: 'Domains',
  hosting: 'Hosting',
  other: 'Sonstiges',
};

function parseDate(v: string | undefined, fallback: Date): Date {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fallback;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

function FunnelTable({ rows, first }: { rows: KpiRow[]; first: string }) {
  return (
    <Table
      head={[
        first,
        'Betriebe',
        'Briefe',
        'Kosten/Brief',
        'Scans',
        'Scan-Rate',
        'Klicks',
        'Checkout',
        'Käufe',
        'Kaufrate',
        'Umsatz',
      ]}
      empty="Keine Briefe im Zeitraum"
    >
      {rows.map((r) => (
        <tr key={r.key}>
          <Td>{r.label}</Td>
          <Td className="text-right tabular-nums">{num(r.leads)}</Td>
          <Td className="text-right tabular-nums">{num(r.letters)}</Td>
          <Td className="text-right tabular-nums">{eur(r.costPerLetterCents)}</Td>
          <Td className="text-right tabular-nums">{num(r.scans)}</Td>
          <Td className="text-right tabular-nums">{pct(r.scanRate)}</Td>
          <Td className="text-right tabular-nums">{num(r.ctaClicks)}</Td>
          <Td className="text-right tabular-nums">{num(r.checkouts)}</Td>
          <Td className="text-right tabular-nums">{num(r.purchases)}</Td>
          <Td className="text-right tabular-nums">{pct(r.purchaseRate, 2)}</Td>
          <Td className="text-right tabular-nums">{eur(r.revenueCents)}</Td>
        </tr>
      ))}
    </Table>
  );
}

export default async function KpiPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const now = new Date();
  const to = parseDate(sp.bis, now);
  const toEnd = new Date(to.getTime() + 86_400_000);
  const from = parseDate(sp.von, new Date(now.getTime() - 90 * 86_400_000));
  const opts = await kpiFilterOptions();
  const f: KpiFilter = {
    from,
    to: toEnd,
    ...(sp.stadt && opts.cities.includes(sp.stadt) ? { city: sp.stadt } : {}),
    ...(sp.branche && opts.branches.includes(sp.branche) ? { branch: sp.branche } : {}),
    ...(sp.variante && opts.variants.some((v) => v.id === sp.variante) ? { variantId: sp.variante } : {}),
  };
  const [s, bySegment, byVariant, byWeek, byLeadSegment] = await Promise.all([
    kpiSummary(f),
    kpiRows(f, 'segment'),
    kpiRows(f, 'variant'),
    kpiRows(f, 'week'),
    kpiRows(f, 'lead_segment'),
  ]);
  return (
    <>
      <PageHeader
        title="Kennzahlen"
        subtitle="Kohorte: Betriebe, deren Erstbrief im Zeitraum versendet wurde (ohne Test- und DRY_RUN-Briefe)."
      />
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div>
          <label htmlFor="von" className={label}>
            Von
          </label>
          <input id="von" name="von" type="date" defaultValue={iso(from)} className={input} />
        </div>
        <div>
          <label htmlFor="bis" className={label}>
            Bis
          </label>
          <input id="bis" name="bis" type="date" defaultValue={iso(to)} className={input} />
        </div>
        <div>
          <label htmlFor="stadt" className={label}>
            Stadt
          </label>
          <select id="stadt" name="stadt" defaultValue={sp.stadt ?? ''} className={input}>
            <option value="">alle</option>
            {opts.cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="branche" className={label}>
            Branche
          </label>
          <select id="branche" name="branche" defaultValue={sp.branche ?? ''} className={input}>
            <option value="">alle</option>
            {opts.branches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="variante" className={label}>
            Briefvariante
          </label>
          <select id="variante" name="variante" defaultValue={sp.variante ?? ''} className={input}>
            <option value="">alle</option>
            {opts.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <button className={btn.primary}>Anwenden</button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Briefe" value={num(s.letters)} hint={`${num(s.leads)} Betriebe · ${eur(s.costPerLetterCents)} je Brief`} />
        <Stat
          label="Scan-Rate"
          value={pct(s.scanRate)}
          hint={`${num(s.scans)} Scans · ${num(s.ctaClicks)} Klicks auf „Übernehmen“`}
        />
        <Stat
          label="Käufe"
          value={num(s.purchases)}
          hint={`Kaufrate ${pct(s.purchaseRate, 2)} · Umsatz ${eur(s.revenueCents)} · einmalig ${num(s.purchasesOneTime)} / monatlich ${num(s.purchasesMonthly)}${s.oneTimeShare !== null ? ` (${pct(s.oneTimeShare, 0)} einmalig)` : ''}`}
        />
        <Stat
          label="CAC / ROI"
          value={s.cacCents !== null ? eur(s.cacCents) : '–'}
          hint={`ROI ${s.roi !== null ? pct(s.roi, 0) : '–'} · Akquisekosten ${eur(s.acquisitionCostCents)}`}
        />
      </div>

      <div className="grid gap-6">
        <Card title="Nach Segment (Stadt : Gruppe : Branche)">
          <FunnelTable rows={bySegment} first="Segment" />
        </Card>
        <Card title="Nach Suchsegment (kein Nachweis des Geschäftsalters)">
          <FunnelTable rows={byLeadSegment} first="Lead-Segment" />
        </Card>
        <Card title="Nach Briefvariante">
          <FunnelTable rows={byVariant} first="Variante" />
        </Card>
        <Card title="Nach Woche des Versands">
          <FunnelTable rows={byWeek} first="Woche" />
        </Card>
        <Card title="Kosten im Zeitraum (Budget-Ledger)">
          <Table head={['Kategorie', 'Betrag']} empty="Keine Kosten">
            {Object.entries(s.costsByCategory).map(([k, v]) => (
              <tr key={k}>
                <Td>{CATEGORY[k] ?? k}</Td>
                <Td className="text-right tabular-nums">{eur(v)}</Td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 text-xs text-slate-500">
            CAC = Akquisekosten (Briefe, Places, KI) ÷ Käufe der Kohorte. Mit Filter: nur die zuordenbaren Briefkosten.
          </p>
        </Card>
      </div>
    </>
  );
}
