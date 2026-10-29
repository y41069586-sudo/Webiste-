import Link from 'next/link';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { effectiveSwitches, getConfig, getDb, schema, type SupportStatus } from '@wbm/core';
import { Badge, Card, Notice, PageHeader, Table, Td, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { KIND_LABELS } from '@/lib/support-labels';

export const metadata = { title: 'Nachrichten' };

export const dynamic = 'force-dynamic';

const TABS: { key: string; label: string; statuses: SupportStatus[] }[] = [
  { key: 'review', label: 'Warten auf dich', statuses: ['drafted', 'escalated'] },
  { key: 'open', label: 'In Arbeit', statuses: ['new', 'classified', 'approved'] },
  { key: 'sent', label: 'Beantwortet', statuses: ['sent'] },
  { key: 'done', label: 'Erledigt', statuses: ['done', 'ignored'] },
];

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0]!;
  const db = getDb();
  const cfg = await getConfig();
  const sw = effectiveSwitches(cfg);
  const [rows, counts] = await Promise.all([
    db
      .select()
      .from(schema.supportMessages)
      .where(sql`${schema.supportMessages.direction} = 'in' AND ${inArray(schema.supportMessages.status, tab.statuses)}`)
      .orderBy(desc(schema.supportMessages.createdAt))
      .limit(200),
    db
      .select({ status: schema.supportMessages.status, n: sql<number>`count(*)::int` })
      .from(schema.supportMessages)
      .where(eq(schema.supportMessages.direction, 'in'))
      .groupBy(schema.supportMessages.status),
  ]);
  const countFor = (t: (typeof TABS)[number]) => counts.filter((c) => t.statuses.includes(c.status)).reduce((s, c) => s + c.n, 0);
  return (
    <>
      <PageHeader
        title="Nachrichten"
        subtitle="Fragen und Wünsche von Betrieben. Das System schreibt einen Antwort-Vorschlag, du schickst ihn ab."
      />
      {sw.autoReply ? (
        <div className="mb-4">
          <Notice kind="warn">Einfache Antworten gehen gerade automatisch raus (nie bei Beschwerden).</Notice>
        </div>
      ) : null}
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/support?tab=${t.key}`} className={t.key === tab.key ? btn.primary : btn.secondary}>
            {t.label} ({countFor(t)})
          </Link>
        ))}
      </nav>
      <Card>
        <Table head={['Von', 'Worum geht es?', 'Wann']} empty="Keine Nachrichten">
          {rows.map((m) => (
            <tr key={m.id}>
              <Td>
                {m.fromEmail ?? '–'}
                {m.customerId ? (
                  <span className="ml-1">
                    <Badge color="green">Kunde</Badge>
                  </span>
                ) : null}
              </Td>
              <Td>
                <Link href={`/admin/support/${m.id}`} className="font-medium text-brand-700 hover:underline">
                  {m.subject || '(ohne Betreff)'}
                </Link>
                {m.classification ? (
                  <span className="ml-2">
                    <Badge color={m.classification === 'beschwerde' || m.classification === 'opt_out' ? 'red' : 'blue'}>
                      {KIND_LABELS[m.classification] ?? m.classification}
                    </Badge>
                  </span>
                ) : null}
              </Td>
              <Td className="text-xs whitespace-nowrap">{dt(m.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
