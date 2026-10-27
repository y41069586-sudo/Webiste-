import Link from 'next/link';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import {
  budgetStatus,
  effectiveSwitches,
  getConfig,
  getDb,
  mailProviderOverview,
  observedTransit,
  schema,
  type LetterStatus,
} from '@wbm/core';
import { Badge, Card, Notice, PageHeader, StatusBadge, Table, Td, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur } from '@/lib/format';
import { bulkApproveLettersAction, createTestLetterAction, sendApprovedNowAction } from './actions';

export const metadata = { title: 'Briefe' };

const TABS: { key: string; label: string; statuses: LetterStatus[]; test?: boolean }[] = [
  { key: 'review', label: 'Zur Freigabe', statuses: ['generated'] },
  { key: 'approved', label: 'Freigegeben', statuses: ['approved'] },
  { key: 'sent', label: 'Versendet', statuses: ['queued', 'sent', 'delivered'] },
  { key: 'failed', label: 'Fehler', statuses: ['failed', 'cancelled'] },
];

export default async function LettersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0]!;
  const db = getDb();
  const cfg = await getConfig();
  const sw = effectiveSwitches(cfg);
  const [rows, counts, budget, mail, transit] = await Promise.all([
    db
      .select({
        letter: schema.letters,
        lead: { id: schema.leads.id, name: schema.leads.businessName, segment: schema.leads.segmentKey },
        variant: schema.variants.name,
      })
      .from(schema.letters)
      .innerJoin(schema.leads, eq(schema.leads.id, schema.letters.leadId))
      .leftJoin(schema.variants, eq(schema.variants.id, schema.letters.variantId))
      .where(inArray(schema.letters.status, tab.statuses))
      .orderBy(desc(schema.letters.createdAt))
      .limit(200),
    db
      .select({ status: schema.letters.status, n: sql<number>`count(*)::int` })
      .from(schema.letters)
      .groupBy(schema.letters.status),
    budgetStatus('letter'),
    mailProviderOverview(),
    observedTransit(),
  ]);
  const countFor = (t: (typeof TABS)[number]) => counts.filter((c) => t.statuses.includes(c.status)).reduce((s, c) => s + c.n, 0);
  const pendingCost = rows
    .filter((r) => r.letter.status === 'generated')
    .reduce((s, r) => s + (r.letter.estimatedCostCents ?? 0), 0);
  return (
    <>
      <PageHeader
        title="Briefe"
        subtitle={`Wochenbudget: ${eur(budget.spentCents)} von ${eur(budget.limitCents)} verbraucht · Rest ${eur(budget.remainingCents)}`}
        actions={
          <>
            <form action={createTestLetterAction}>
              <button type="submit" className={btn.secondary}>
                Testbrief an mich erzeugen
              </button>
            </form>
            <form action={sendApprovedNowAction}>
              <button type="submit" className={btn.primary} disabled={sw.killSwitch}>
                Freigegebene jetzt versenden{sw.dryRun ? ' (DRY_RUN)' : ''}
              </button>
            </form>
          </>
        }
      />
      {sw.dryRun ? (
        <div className="mb-4">
          <Notice kind="warn">DRY_RUN ist aktiv: Freigegebene Briefe werden nicht versendet, es entstehen nur PDFs.</Notice>
        </div>
      ) : null}
      {!sw.realLettersUnlocked ? (
        <div className="mb-4">
          <Notice>
            Echte Briefe an Leads sind gesperrt, bis der Testbrief an dich korrekt angekommen ist (Einstellungen → Schalter).
          </Notice>
        </div>
      ) : null}
      <section aria-label="Briefdienst" className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Briefdienst</p>
          <p className="mt-1 font-semibold">
            {mail.provider}
            {mail.mode ? (
              <Badge color={mail.mode === 'live' ? 'red' : 'yellow'}>{mail.mode === 'live' ? 'Live' : 'Testmodus'}</Badge>
            ) : null}
          </p>
          {mail.provider === 'easynova' || mail.provider === 'letterxpress' ? (
            <p className="mt-1 text-xs text-slate-600">
              Testaufträge: {mail.lxpTestJobs} von {mail.requiredTestJobs}
            </p>
          ) : null}
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Guthaben</p>
          <p className="mt-1 font-semibold">{mail.balanceCents !== null ? eur(mail.balanceCents) : '–'}</p>
          {mail.balanceError ? <p className="mt-1 text-xs text-red-700">{mail.balanceError}</p> : null}
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Offene Aufträge</p>
          <p className="mt-1 font-semibold">{mail.openJobs}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Kosten pro Brief (60 Tage)</p>
          <p className="mt-1 font-semibold">{mail.avgCostCents !== null ? eur(mail.avgCostCents) : '–'}</p>
          <p className="mt-1 text-xs text-slate-600">
            Laufzeit beobachtet:{' '}
            {transit.medianBusinessDays !== null
              ? `${transit.medianBusinessDays} Werktage (n = ${transit.samples})`
              : 'noch keine Daten'}
          </p>
        </Card>
      </section>
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/letters?tab=${t.key}`} className={t.key === tab.key ? btn.primary : btn.secondary}>
            {t.label} ({countFor(t)})
          </Link>
        ))}
      </nav>
      <Card>
        <form action={bulkApproveLettersAction}>
          {tab.key === 'review' && rows.length ? (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <button className={btn.primary} type="submit">
                Markierte freigeben
              </button>
              <span className="text-sm text-slate-600">Geschätzte Kosten aller offenen Briefe: {eur(pendingCost)}</span>
            </div>
          ) : null}
          <Table
            head={['', 'Betrieb', 'Brief', 'Variante', 'Seiten', 'Kosten', 'Status', 'Erstellt']}
            empty="Keine Briefe in dieser Ansicht"
          >
            {rows.map(({ letter, lead, variant }) => (
              <tr key={letter.id}>
                <Td>
                  {letter.status === 'generated' ? (
                    <input type="checkbox" name="ids" value={letter.id} aria-label={`${lead.name} auswählen`} />
                  ) : null}
                </Td>
                <Td>
                  <Link className="font-medium text-brand-700 hover:underline" href={`/admin/letters/${letter.id}`}>
                    {lead.name}
                  </Link>
                  <div className="text-xs text-slate-500">{lead.segment}</div>
                </Td>
                <Td>{letter.isTest ? <Badge color="purple">Test</Badge> : letter.sequence === 2 ? 'Follow-up' : 'Erstbrief'}</Td>
                <Td className="text-xs">{variant ?? '–'}</Td>
                <Td>{letter.pageCount}</Td>
                <Td>{eur(letter.costCents ?? letter.estimatedCostCents)}</Td>
                <Td>
                  <StatusBadge status={letter.status} />
                  {letter.dryRun ? <Badge color="yellow">DRY</Badge> : null}
                  {letter.statusReason ? (
                    <div className="max-w-xs text-xs text-red-700">{letter.statusReason.slice(0, 160)}</div>
                  ) : null}
                </Td>
                <Td className="text-xs whitespace-nowrap">{dt(letter.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        </form>
      </Card>
    </>
  );
}
