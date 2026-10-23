import Link from 'next/link';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { checkoutAvailability, getDb, schema, ORDER_STATUSES, type OrderStatus } from '@wbm/core';
import { Badge, Card, Notice, PageHeader, Stat, StatusBadge, Table, Td, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur } from '@/lib/format';

export const metadata = { title: 'Bestellungen' };
export const dynamic = 'force-dynamic';

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : null;
  const db = getDb();
  const [rows, sums] = await Promise.all([
    db
      .select({ o: schema.orders, lead: schema.leads.businessName })
      .from(schema.orders)
      .leftJoin(schema.leads, eq(schema.leads.id, schema.orders.leadId))
      .where(status ? eq(schema.orders.status, status) : inArray(schema.orders.status, ORDER_STATUSES as unknown as OrderStatus[]))
      .orderBy(desc(schema.orders.createdAt))
      .limit(300),
    db
      .select({ status: schema.orders.status, n: sql<number>`count(*)::int`, cents: sql<number>`coalesce(sum(amount_cents - refunded_cents),0)::int` })
      .from(schema.orders)
      .groupBy(schema.orders.status),
  ]);
  const paid = sums.filter((s) => s.status === 'paid' || s.status === 'refunded');
  const mode = checkoutAvailability();
  return (
    <>
      <PageHeader title="Bestellungen" subtitle="Checkout, Zahlungen, Rechnungen und Erstattungen" />
      <div className="mb-4">
        {mode.ok ? (
          mode.mode === 'live' ? (
            <Notice kind="success">Zahlungen: Stripe Live-Modus – echte Zahlungen.</Notice>
          ) : (
            <Notice kind="warn">Zahlungen im Testmodus ({mode.mode === 'mock' ? 'simuliert' : 'Stripe-Test'}).</Notice>
          )
        ) : (
          <Notice kind="error">{mode.reason}</Notice>
        )}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Bezahlt" value={paid.reduce((s, x) => s + x.n, 0)} />
        <Stat label="Umsatz (netto Erstattungen)" value={eur(paid.reduce((s, x) => s + x.cents, 0))} />
        <Stat label="Offen / in Bearbeitung" value={sums.filter((s) => s.status === 'pending' || s.status === 'processing').reduce((s, x) => s + x.n, 0)} />
      </div>
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter">
        <Link href="/admin/orders" className={!status ? btn.primary : btn.secondary}>
          Alle
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={status === s ? btn.primary : btn.secondary}>
            {s} ({sums.find((x) => x.status === s)?.n ?? 0})
          </Link>
        ))}
      </nav>
      <Card>
        <Table head={['Datum', 'Betrieb', 'Firma (Rechnung)', 'Domain', 'Betrag', 'Status', 'Rechnung']} empty="Noch keine Bestellungen">
          {rows.map(({ o, lead }) => (
            <tr key={o.id}>
              <Td>{dt(o.createdAt)}</Td>
              <Td>
                <Link href={`/admin/orders/${o.id}`} className="text-brand-700 hover:underline">
                  {lead ?? '–'}
                </Link>
              </Td>
              <Td>{o.customerCompany}</Td>
              <Td>{o.domainWish ?? '–'}</Td>
              <Td className="tabular-nums">
                {eur(o.amountCents)}
                {o.refundedCents ? <span className="block text-xs text-red-700">−{eur(o.refundedCents)}</span> : null}
              </Td>
              <Td>
                <StatusBadge status={o.status} />
                {o.provider === 'mock' ? (
                  <span className="ml-1">
                    <Badge>Test</Badge>
                  </span>
                ) : null}
              </Td>
              <Td>{o.invoiceNumber ?? '–'}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
