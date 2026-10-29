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
import { createTestLetterAction, sendApprovedNowAction } from './actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Briefe' };

const TABS: { key: string; label: string; statuses: LetterStatus[]; test?: boolean }[] = [
  { key: 'review', label: 'Warten auf dich', statuses: ['generated'] },
  { key: 'approved', label: 'Freigegeben', statuses: ['approved'] },
  { key: 'sent', label: 'Verschickt', statuses: ['queued', 'sent', 'delivered'] },
  { key: 'failed', label: 'Probleme', statuses: ['failed', 'cancelled'] },
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
      })
      .from(schema.letters)
      .innerJoin(schema.leads, eq(schema.leads.id, schema.letters.leadId))
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
  const waiting = counts.filter((c) => c.status === 'generated').reduce((sum, c) => sum + c.n, 0);
  const approved = counts.filter((c) => c.status === 'approved').reduce((sum, c) => sum + c.n, 0);
  return (
    <>
      <PageHeader
        title="Briefe"
        subtitle={
          waiting
            ? `${waiting === 1 ? 'Ein Brief wartet' : `${waiting} Briefe warten`} auf dich.`
            : 'Gerade wartet kein Brief auf dich. Neue Briefe entstehen von selbst.'
        }
        actions={
          <>
            {waiting ? (
              <Link href="/admin/ablauf/naechster-brief" className={btn.primary}>
                Briefe prüfen →
              </Link>
            ) : null}
            {approved ? (
              <form action={sendApprovedNowAction}>
                <SubmitButton type="submit" className={waiting ? btn.secondary : btn.primary} disabled={sw.killSwitch}>
                  {approved === 1 ? 'Freigegebenen Brief abschicken' : `${approved} freigegebene abschicken`}
                </SubmitButton>
              </form>
            ) : null}
          </>
        }
      />
      {sw.dryRun ? (
        <div className="mb-4">
          <Notice kind="warn">Testmodus: Es wird nichts gedruckt oder verschickt – du siehst nur die fertigen Briefe.</Notice>
        </div>
      ) : null}
      {!sw.realLettersUnlocked ? (
        <div className="mb-4">
          <Notice>
            Echte Briefe an Betriebe gehen erst raus, wenn dein eigener Testbrief gut angekommen ist (unten „Testbrief an mich“).
          </Notice>
        </div>
      ) : null}
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/letters?tab=${t.key}`} className={t.key === tab.key ? btn.primary : btn.secondary}>
            {t.label} ({countFor(t)})
          </Link>
        ))}
      </nav>
      <Card>
        <Table head={['Betrieb', 'Art', 'Stand', 'Datum']} empty="Keine Briefe in dieser Ansicht">
          {rows.map(({ letter, lead }) => (
            <tr key={letter.id}>
              <Td>
                <Link className="font-medium text-brand-700 hover:underline" href={`/admin/letters/${letter.id}`}>
                  {lead.name}
                </Link>
              </Td>
              <Td>{letter.isTest ? 'Testbrief' : (letter.sequence ?? 1) > 1 ? 'Erinnerung' : 'Erster Brief'}</Td>
              <Td>
                <StatusBadge status={letter.status} />
                {letter.statusReason ? (
                  <div className="max-w-xs text-xs text-red-700">{letter.statusReason.slice(0, 160)}</div>
                ) : null}
              </Td>
              <Td className="text-xs whitespace-nowrap">{dt(letter.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      <details className="admin-details mt-6">
        <summary>Briefdienst, Guthaben und Testbrief</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-xs text-slate-500">Briefdienst</p>
            <p className="mt-1 font-semibold">
              {mail.provider}{' '}
              {mail.mode ? (
                <Badge color={mail.mode === 'live' ? 'red' : 'yellow'}>{mail.mode === 'live' ? 'Echt' : 'Testmodus'}</Badge>
              ) : null}
            </p>
            {mail.provider === 'easynova' || mail.provider === 'letterxpress' ? (
              <p className="mt-1 text-xs text-slate-600">
                Testsendungen: {mail.lxpTestJobs} von {mail.requiredTestJobs}
              </p>
            ) : null}
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Guthaben</p>
            <p className="mt-1 font-semibold">{mail.balanceCents !== null ? eur(mail.balanceCents) : '–'}</p>
            {mail.balanceError ? <p className="mt-1 text-xs text-red-700">{mail.balanceError}</p> : null}
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Diese Woche ausgegeben</p>
            <p className="mt-1 font-semibold">
              {eur(budget.spentCents)} von {eur(budget.limitCents)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Kosten pro Brief</p>
            <p className="mt-1 font-semibold">{mail.avgCostCents !== null ? eur(mail.avgCostCents) : '–'}</p>
            <p className="mt-1 text-xs text-slate-600">
              Unterwegs: {transit.medianBusinessDays !== null ? `ca. ${transit.medianBusinessDays} Werktage` : 'noch keine Daten'}
            </p>
          </Card>
        </div>
        <form action={createTestLetterAction} className="mt-4">
          <SubmitButton type="submit" className={btn.secondary}>
            Testbrief an mich
          </SubmitButton>
        </form>
      </details>
    </>
  );
}
