import Link from 'next/link';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { effectiveSwitches, getConfig, getDb, schema, type SupportStatus } from '@wbm/core';
import { Badge, Card, Notice, PageHeader, StatusBadge, Table, Td, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';

export const metadata = { title: 'Support' };
export const dynamic = 'force-dynamic';

const TABS: { key: string; label: string; statuses: SupportStatus[] }[] = [
  { key: 'review', label: 'Zu prüfen', statuses: ['drafted', 'escalated'] },
  { key: 'open', label: 'In Bearbeitung', statuses: ['new', 'classified', 'approved'] },
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
      <PageHeader title="Support" subtitle="Eingehende Nachrichten (Demo-Formular, E-Mail). Widersprüche werden automatisch umgesetzt." />
      <div className="mb-4">
        {sw.autoReply ? (
          <Notice kind="warn">AUTO_REPLY ist an: Antworten der Klassen {cfg.support.autoReplyClasses.join(', ') || '(keine gewählt)'} gehen ohne Freigabe raus (nur bei hoher Sicherheit, nie bei Beschwerden).</Notice>
        ) : (
          <Notice>AUTO_REPLY ist aus: Jede Antwort wird erst nach deiner Freigabe gesendet.</Notice>
        )}
      </div>
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/support?tab=${t.key}`} className={t.key === tab.key ? btn.primary : btn.secondary}>
            {t.label} ({countFor(t)})
          </Link>
        ))}
      </nav>
      <Card>
        <Table head={['Eingang', 'Kanal', 'Von', 'Betreff', 'Klasse', 'Status']} empty="Keine Nachrichten">
          {rows.map((m) => (
            <tr key={m.id}>
              <Td>{dt(m.createdAt)}</Td>
              <Td>{m.channel === 'form' ? 'Formular' : 'E-Mail'}</Td>
              <Td>
                {m.fromEmail ?? '–'}
                {m.customerId ? (
                  <span className="ml-1">
                    <Badge color="green">Kunde</Badge>
                  </span>
                ) : m.leadId ? (
                  <span className="ml-1">
                    <Badge color="purple">Lead</Badge>
                  </span>
                ) : null}
              </Td>
              <Td>
                <Link href={`/admin/support/${m.id}`} className="text-brand-700 hover:underline">
                  {m.subject || '(ohne Betreff)'}
                </Link>
              </Td>
              <Td>{m.classification ? <Badge color={m.classification === 'beschwerde' || m.classification === 'opt_out' ? 'red' : 'blue'}>{m.classification}</Badge> : '–'}</Td>
              <Td>
                <StatusBadge status={m.status} />
                {m.escalationReason ? <span className="block text-xs text-slate-500">{m.escalationReason}</span> : null}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
