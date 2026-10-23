import { desc } from 'drizzle-orm';
import { budgetStatus, getDb, schema, type BudgetCategory } from '@wbm/core';
import { Badge, Card, PageHeader, Stat, Table, Td } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur } from '@/lib/format';

export const metadata = { title: 'Budget' };
export const dynamic = 'force-dynamic';

const CATS: { key: BudgetCategory; label: string }[] = [
  { key: 'letter', label: 'Briefe' },
  { key: 'places_api', label: 'Google Places' },
  { key: 'llm', label: 'KI' },
  { key: 'domain', label: 'Domains' },
];

export default async function BudgetPage() {
  await requireAdmin();
  const [statuses, entries] = await Promise.all([
    Promise.all(CATS.map(async (c) => ({ ...c, s: await budgetStatus(c.key) }))),
    getDb().select().from(schema.budgetLedger).orderBy(desc(schema.budgetLedger.createdAt)).limit(200),
  ]);
  return (
    <>
      <PageHeader
        title="Budget"
        subtitle="Laufende Woche (ab Montag) und alle Buchungen. Jede kostenpflichtige Aktion wird hier verbucht."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statuses.map(({ key, label, s }) => (
          <Stat
            key={key}
            label={label}
            value={eur(s.spentCents)}
            hint={s.limitCents !== null ? `von ${eur(s.limitCents)} · Rest ${eur(s.remainingCents)}` : 'ohne Wochenlimit'}
          />
        ))}
      </div>
      <Card title="Buchungen">
        <Table head={['Zeit', 'Kategorie', 'Betrag', 'Bezug', 'Art']} empty="Noch keine Buchungen">
          {entries.map((e) => (
            <tr key={e.id}>
              <Td>{dt(e.createdAt)}</Td>
              <Td>{CATS.find((c) => c.key === e.category)?.label ?? e.category}</Td>
              <Td className="text-right tabular-nums">{eur(e.amountCents + e.amountMicroCents / 1e6)}</Td>
              <Td className="max-w-xs truncate">{e.ref ?? '–'}</Td>
              <Td>{e.estimated ? <Badge color="yellow">reserviert/geschätzt</Badge> : <Badge>gebucht</Badge>}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
