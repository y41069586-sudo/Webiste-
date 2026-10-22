import { desc, eq, and, type SQL } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { Card, PageHeader, Table, Td } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';

export const metadata = { title: 'Audit-Log' };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entity?: string; id?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const conds: SQL[] = [];
  if (sp.entity) conds.push(eq(schema.auditLog.entity, sp.entity));
  if (sp.id) conds.push(eq(schema.auditLog.entityId, sp.id));
  const rows = await getDb()
    .select()
    .from(schema.auditLog)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.auditLog.id))
    .limit(300);
  return (
    <>
      <PageHeader title="Audit-Log" subtitle="Alle Statuswechsel, Freigaben und Einstellungsänderungen (neueste zuerst, max. 300)." />
      <Card>
        <Table head={['Zeit', 'Entität', 'ID', 'Aktion', 'Auslöser', 'Kontext']}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap">{dt(r.createdAt)}</Td>
              <Td>{r.entity}</Td>
              <Td className="font-mono text-xs">{r.entityId.slice(0, 12)}</Td>
              <Td className="font-mono text-xs">{r.action}</Td>
              <Td className="font-mono text-xs">{r.actor}</Td>
              <Td className="max-w-md font-mono text-xs break-all text-slate-600">{JSON.stringify(r.contextJson)}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
