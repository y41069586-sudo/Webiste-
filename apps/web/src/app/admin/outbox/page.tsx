import { desc } from 'drizzle-orm';
import { getDb, getProviders, schema } from '@wbm/core';
import { Card, Notice, PageHeader, StatusBadge, Table, Td } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';

export const metadata = { title: 'Postausgang' };
export const dynamic = 'force-dynamic';

/** Alle ausgehenden Transaktions-Mails. Im Mock-Modus liegen die Inhalte im Storage (outbox/). */
export default async function OutboxPage() {
  await requireAdmin();
  const rows = await getDb().select().from(schema.outboundEmails).orderBy(desc(schema.outboundEmails.createdAt)).limit(300);
  const mock = getProviders().email.name === 'mock';
  return (
    <>
      <PageHeader title="Postausgang" subtitle="Transaktions-Mails (Rechnung, Onboarding, Support-Antworten, Hinweise an dich)" />
      {mock ? (
        <div className="mb-4">
          <Notice kind="warn">E-Mail-Versand im Testmodus: Mails werden nicht verschickt, sondern hier abgelegt.</Notice>
        </div>
      ) : null}
      <Card>
        <Table head={['Zeit', 'Art', 'An', 'Betreff', 'Anhänge', 'Status']} empty="Noch keine E-Mails">
          {rows.map((m) => (
            <tr key={m.id}>
              <Td>{dt(m.createdAt)}</Td>
              <Td>{m.kind}</Td>
              <Td>{m.toEmail}</Td>
              <Td>
                {m.provider === 'mock' && m.providerMessageId ? (
                  <a href={`/admin/files/outbox/${m.providerMessageId}.json`} className="text-brand-700 underline">
                    {m.subject}
                  </a>
                ) : (
                  m.subject
                )}
              </Td>
              <Td>{m.attachmentNames.join(', ') || '–'}</Td>
              <Td>
                <StatusBadge status={m.status} />
                {m.error ? <span className="block text-xs text-red-700">{m.error}</span> : null}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
