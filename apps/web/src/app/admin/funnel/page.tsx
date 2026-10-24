import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { FUNNEL_WINDOW_DAYS, funnelRows, funnelStages, getDb, INDUSTRIES, type FunnelDimension, type FunnelRow } from '@wbm/core';
import { Card, Notice, PageHeader, Stat, Table, Td, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { eur, num, pct } from '@/lib/format';
import { refreshFunnelAction } from './actions';

export const metadata = { title: 'Funnel' };
export const dynamic = 'force-dynamic';

const GROUPS: { key: string; label: string; dims: FunnelDimension[] }[] = [
  { key: 'branche', label: 'Branche', dims: ['industry'] },
  { key: 'variante', label: 'Branche × Variante', dims: ['industry', 'variant'] },
  { key: 'segment', label: 'Branche × Segment', dims: ['industry', 'segment'] },
  { key: 'woche', label: 'Woche', dims: ['week'] },
  { key: 'arm', label: 'Branche × Variante × Segment × Woche', dims: ['industry', 'variant', 'segment', 'week'] },
];

const rate = (a: number, b: number) => (b > 0 ? a / b : null);

function Row({ r }: { r: FunnelRow }) {
  return (
    <tr>
      <Td className="whitespace-nowrap">
        {[r.industry, r.variantName, r.segment, r.week].filter(Boolean).join(' · ') || 'gesamt'}
      </Td>
      <Td>{num(r.letters)}</Td>
      <Td>
        {num(r.delivered)}
        <div className="text-xs text-slate-500">{num(r.evaluated)} ausgewertet</div>
      </Td>
      <Td>
        {num(r.scans)} <span className="text-xs text-slate-500">{pct(rate(r.scans, r.delivered))}</span>
      </Td>
      <Td>
        {num(r.demo_views)}
        <div className="text-xs text-slate-500">{num(r.engaged)} ≥ 30 s</div>
      </Td>
      <Td>
        {num(r.cta_clicks)} <span className="text-xs text-slate-500">{pct(rate(r.cta_clicks, r.scans))}</span>
      </Td>
      <Td>
        {num(r.whatsapp)} / {num(r.questions)}
      </Td>
      <Td>
        {num(r.checkouts)}
        <div className="text-xs text-slate-500">{num(r.abandoned)} abgebrochen</div>
      </Td>
      <Td>
        {num(r.purchases)}
        <div className="text-xs text-slate-500">
          {num(r.purchases_one_time)} einmalig · {num(r.purchases_monthly)} monatl.
        </div>
      </Td>
      <Td>{pct(rate(r.purchases_evaluated, r.evaluated), 2)}</Td>
      <Td>
        {num(r.opt_outs)}
        {r.complaints ? <div className="text-xs text-red-700">{num(r.complaints)} Beschwerde(n)</div> : null}
      </Td>
      <Td>
        {eur(r.cost_cents)}
        <div className="text-xs text-slate-500">{r.purchases ? `${eur(Math.round(r.cost_cents / r.purchases))}/Kauf` : '–'}</div>
      </Td>
      <Td>{r.letters ? eur(Math.round(r.revenueCents / r.letters)) : '–'}</Td>
    </tr>
  );
}

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ gruppe?: string; branche?: string; von?: string; bis?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const group = GROUPS.find((g) => g.key === sp.gruppe) ?? GROUPS[0]!;
  const industry = INDUSTRIES.find((i) => i === sp.branche);
  const from = sp.von && /^\d{4}-\d{2}-\d{2}$/.test(sp.von) ? new Date(`${sp.von}T00:00:00Z`) : undefined;
  const to = sp.bis && /^\d{4}-\d{2}-\d{2}$/.test(sp.bis) ? new Date(`${sp.bis}T23:59:59Z`) : undefined;
  const filter = { from, to, industry };
  const [rows, [total], refreshed] = await Promise.all([
    funnelRows({ ...filter, groupBy: group.dims }),
    funnelRows(filter),
    getDb()
      .execute<{ at: Date | null }>(sql`SELECT max(refreshed_at) AS at FROM funnel_by_arm`)
      .then((r) => r.rows[0]?.at ?? null),
  ]);
  const stages = total ? funnelStages(total) : [];
  return (
    <>
      <PageHeader
        title="Funnel"
        subtitle={`Erstbriefe ab Versand; ein Brief gilt ${FUNNEL_WINDOW_DAYS} Tage nach (geschätzter) Zustellung als ausgewertet. Kaufrate nur aus ausgewerteten Briefen.`}
        actions={
          <form action={refreshFunnelAction}>
            <button type="submit" className={btn.secondary}>
              Jetzt aktualisieren
            </button>
          </form>
        }
      />
      <p className="mb-4 text-xs text-slate-500">
        Stand: {refreshed ? new Date(refreshed).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : 'noch keine Daten'} ·
        automatisch alle 30 Minuten
      </p>
      <form className="mb-6 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className={label} htmlFor="gruppe">
            Gruppierung
          </label>
          <select id="gruppe" name="gruppe" defaultValue={group.key} className={input}>
            {GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="branche">
            Branche
          </label>
          <select id="branche" name="branche" defaultValue={industry ?? ''} className={input}>
            <option value="">alle</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="von">
            Versand ab
          </label>
          <input id="von" name="von" type="date" defaultValue={sp.von ?? ''} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="bis">
            Versand bis
          </label>
          <input id="bis" name="bis" type="date" defaultValue={sp.bis ?? ''} className={input} />
        </div>
        <button type="submit" className={btn.primary}>
          Anzeigen
        </button>
        <Link href="/admin/funnel" className={btn.secondary}>
          Zurücksetzen
        </Link>
      </form>
      {!total || total.letters === 0 ? (
        <Notice>Noch keine versendeten Erstbriefe im gewählten Zeitraum.</Notice>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Erstbriefe" value={num(total.letters)} hint={`${num(total.undeliverable)} unzustellbar`} />
            <Stat label="Scan-Rate" value={pct(rate(total.scans, total.delivered))} hint="Scans je zugestelltem Brief" />
            <Stat
              label="Kaufrate (ausgewertet)"
              value={pct(rate(total.purchases_evaluated, total.evaluated), 2)}
              hint={`${num(total.evaluated)} ausgewertete Briefe`}
            />
            <Stat
              label="Umsatz pro Brief"
              value={total.letters ? eur(Math.round(total.revenueCents / total.letters)) : '–'}
              hint="Monatsplan bewertet nach Einstellungen → Messung"
            />
          </div>
          <Card title="Wo springen Betriebe ab?">
            <ol className="space-y-2">
              {stages.map((s) => {
                const width = total.delivered ? Math.max(2, Math.round((s.count / total.delivered) * 100)) : 0;
                return (
                  <li key={s.label} className="grid grid-cols-[10rem_1fr_6rem] items-center gap-3 text-sm">
                    <span>{s.label}</span>
                    <span className="h-3 rounded bg-slate-100" aria-hidden="true">
                      <span className="block h-3 rounded bg-brand-600" style={{ width: `${width}%` }} />
                    </span>
                    <span className="text-right tabular-nums">
                      {num(s.count)}
                      {s.ofPrevious !== null ? <span className="text-xs text-slate-500"> ({pct(s.ofPrevious, 0)})</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
          <div className="mt-6">
            <Card title={`Nach ${group.label}`}>
              <Table
                head={[
                  'Arm',
                  'Briefe',
                  'Zugestellt',
                  'Scans',
                  'Demo',
                  'Übernehmen',
                  'WhatsApp / Fragen',
                  'Checkout',
                  'Käufe',
                  'Kaufrate',
                  'Opt-outs',
                  'Kosten',
                  'Umsatz/Brief',
                ]}
                empty="Keine Daten"
              >
                {rows.map((r) => (
                  <Row key={r.key} r={r} />
                ))}
              </Table>
              <p className="mt-3 text-xs text-slate-500">
                Raten sind Punktwerte ohne Spanne – bei wenigen Briefen überwiegend Zufall. Spannen und Entscheidungsregeln kommen
                mit dem Optimizer (L5).
              </p>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
