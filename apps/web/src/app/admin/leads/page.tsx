import Link from 'next/link';
import { and, desc, eq, ilike, sql, type SQL } from 'drizzle-orm';
import {
  DEFAULT_BRANCHES,
  getConfig,
  getDb,
  LEAD_STATUSES,
  REJECTION_LABELS,
  REJECTION_REASONS,
  schema,
  type RejectionReason,
} from '@wbm/core';
import { Card, PageHeader, StatusBadge, Table, Td, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, num } from '@/lib/format';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Leads' };

type SP = { status?: string; branch?: string; reason?: string; q?: string; sample?: string; page?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const cfg = await getConfig();
  const db = getDb();
  const L = schema.leads;
  const conds: SQL[] = [];
  if (sp.status) conds.push(eq(L.status, sp.status as never));
  if (sp.branch) conds.push(eq(L.branch, sp.branch));
  if (sp.reason) conds.push(sql`${L.rejectionReasons} @> ${JSON.stringify([sp.reason])}::jsonb`);
  if (sp.q) conds.push(ilike(L.businessName, `%${sp.q}%`));
  const where = conds.length ? and(...conds) : undefined;
  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 100;

  const [rows, totalRow, reasonStats] = await Promise.all([
    db
      .select()
      .from(L)
      .where(where)
      .orderBy(
        ...(sp.sample
          ? [sql`random()`]
          : // Prüf-Warteschlange: automatische Vorauswahl zuerst, sonst der belegte Eignungs-Score
            sp.status === 'discovered'
            ? [desc(L.prescreenScore), desc(L.score)]
            : [desc(L.score), desc(L.prescreenScore)]),
      )
      .limit(sp.sample ? 20 : pageSize)
      .offset(sp.sample ? 0 : (page - 1) * pageSize),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(L)
      .where(where),
    db.execute<{ reason: string; n: number }>(
      sql`SELECT r AS reason, count(*)::int AS n FROM leads, jsonb_array_elements_text(rejection_reasons) r WHERE status = 'rejected' GROUP BY r ORDER BY n DESC`,
    ),
  ]);
  const total = totalRow[0]?.n ?? 0;
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/leads?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={`${num(total)} Treffer${sp.sample ? ' · Stichprobe: 20 zufällige Einträge' : ''}`}
        actions={
          <>
            <Link href={qs({ sample: sp.sample ? undefined : '1', page: undefined })} className={btn.secondary}>
              {sp.sample ? 'Stichprobe beenden' : 'Stichprobe (20 zufällig)'}
            </Link>
            <Link href="/admin/suche" className={btn.primary}>
              Lead-Suche starten
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="Filter" className="lg:col-span-2">
          <form className="grid gap-3 sm:grid-cols-4" method="get">
            <div>
              <label className={label} htmlFor="status">
                Status
              </label>
              <select id="status" name="status" defaultValue={sp.status ?? ''} className={input}>
                <option value="">alle</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="branch">
                Branche
              </label>
              <select id="branch" name="branch" defaultValue={sp.branch ?? ''} className={input}>
                <option value="">alle</option>
                {cfg.targeting.branches.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="reason">
                Ablehnungsgrund
              </label>
              <select id="reason" name="reason" defaultValue={sp.reason ?? ''} className={input}>
                <option value="">alle</option>
                {REJECTION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REJECTION_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="q">
                Name
              </label>
              <input id="q" name="q" defaultValue={sp.q ?? ''} className={input} />
            </div>
            <div className="sm:col-span-4">
              <SubmitButton className={btn.primary} type="submit">
                Anwenden
              </SubmitButton>
              <Link href="/admin/leads" className={`${btn.ghost} ml-2`}>
                Zurücksetzen
              </Link>
            </div>
          </form>
        </Card>
        <Card title="Ablehnungsgründe">
          {reasonStats.rows.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine abgelehnten Leads.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {reasonStats.rows.map((r) => (
                <li key={r.reason} className="flex justify-between gap-2">
                  <Link
                    href={qs({ reason: r.reason, status: 'rejected', page: undefined })}
                    className="text-brand-700 hover:underline"
                  >
                    {REJECTION_LABELS[r.reason as RejectionReason] ?? r.reason}
                  </Link>
                  <span className="tabular-nums">{num(r.n)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <Table head={['Betrieb', 'Branche', 'Anschrift', 'Status', 'Gründe', 'Score', 'Vorauswahl', 'Quelle', 'Gefunden']}>
          {rows.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/admin/leads/${l.id}`} className="font-medium text-brand-700 hover:underline">
                  {l.businessName}
                </Link>
                {l.socialOnly ? <div className="text-xs text-slate-500">nur Social Media</div> : null}
              </Td>
              <Td>{[...cfg.targeting.branches, ...DEFAULT_BRANCHES].find((b) => b.key === l.branch)?.label ?? l.branch}</Td>
              <Td className="text-xs">
                {l.street} {l.houseNumber}
                <br />
                {l.postalCode} {l.city}
              </Td>
              <Td>
                <StatusBadge status={l.status} />
              </Td>
              <Td className="text-xs text-slate-600">
                {l.rejectionReasons.map((r) => REJECTION_LABELS[r as RejectionReason] ?? r).join(', ') || '–'}
              </Td>
              <Td className="tabular-nums">
                {l.score}
                {l.scoreReasons?.some((r) => r.criterion === 'suitability') ? ' / 100' : ''}
              </Td>
              <Td className="tabular-nums">
                <span title={l.prescreenReasons?.map((r) => `${r.points > 0 ? '+' : ''}${r.points} ${r.detail}`).join('\n')}>
                  {l.prescreenReasons ? l.prescreenScore : '–'}
                </span>
              </Td>
              <Td className="text-xs">{l.source}</Td>
              <Td className="text-xs whitespace-nowrap">{dt(l.createdAt)}</Td>
            </tr>
          ))}
        </Table>
        {!sp.sample && total > pageSize ? (
          <div className="mt-4 flex gap-2 text-sm">
            {page > 1 ? (
              <Link className={btn.secondary} href={qs({ page: String(page - 1) })}>
                ← Zurück
              </Link>
            ) : null}
            {page * pageSize < total ? (
              <Link className={btn.secondary} href={qs({ page: String(page + 1) })}>
                Weiter →
              </Link>
            ) : null}
          </div>
        ) : null}
      </Card>
    </>
  );
}
