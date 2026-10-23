import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { Card, PageHeader, StatusBadge, Table, Td } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';

export const metadata = { title: 'Kunden & Seiten' };
export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  await requireAdmin();
  const rows = await getDb()
    .select({ c: schema.customers, s: schema.sites })
    .from(schema.customers)
    .leftJoin(schema.sites, eq(schema.sites.customerId, schema.customers.id))
    .orderBy(desc(schema.customers.createdAt))
    .limit(300);
  return (
    <>
      <PageHeader title="Kunden & Seiten" subtitle="Onboarding, Vorschau, Domain, Veröffentlichung" />
      <Card>
        <Table head={['Seit', 'Kunde', 'Domain', 'Seite', 'Runden', 'Hosting bis']} empty="Noch keine Kunden">
          {rows.map(({ c, s }) => (
            <tr key={c.id}>
              <Td>{dt(c.createdAt)}</Td>
              <Td>
                <Link href={`/admin/customers/${c.id}`} className="text-brand-700 hover:underline">
                  {c.company}
                </Link>
              </Td>
              <Td>
                {c.domain ?? '–'} <StatusBadge status={c.domainStatus} />
              </Td>
              <Td>
                {s ? <StatusBadge status={s.status} /> : '–'}
                {s?.statusReason ? <span className="block text-xs text-slate-500">{s.statusReason}</span> : null}
              </Td>
              <Td>{c.changeRoundsUsed}</Td>
              <Td>{dt(c.hostingUntil)}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
