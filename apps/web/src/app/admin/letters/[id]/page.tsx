import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, schema, type TruthCheckResult } from '@wbm/core';
import { Badge, Card, PageHeader, StatusBadge, btn, input } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur } from '@/lib/format';
import { approveLetterAction, rejectLetterAction } from '../actions';

export const metadata = { title: 'Brief' };

export default async function LetterDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const letter = await db.query.letters.findFirst({ where: eq(schema.letters.id, id) });
  if (!letter) notFound();
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, letter.leadId) });
  const log = await db
    .select()
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.entity, 'letter'), eq(schema.auditLog.entityId, id)))
    .orderBy(desc(schema.auditLog.id));
  const truth = letter.truthCheckJson as unknown as TruthCheckResult | null;
  return (
    <>
      <PageHeader
        title={`Brief an ${lead?.businessName ?? '–'}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={letter.status} /> {letter.isTest ? <Badge color="purple">Testbrief</Badge> : null}{' '}
            {letter.dryRun ? <Badge color="yellow">DRY_RUN</Badge> : null}
            Seiten: {letter.pageCount} · Kosten: {eur(letter.costCents ?? letter.estimatedCostCents)}
          </span>
        }
        actions={
          lead ? (
            <Link className={btn.secondary} href={`/admin/leads/${lead.id}`}>
              Lead
            </Link>
          ) : null
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="PDF" className="xl:col-span-2">
          {letter.pdfStorageKey ? (
            <iframe
              title="Brief-PDF"
              src={`/admin/files/${letter.pdfStorageKey}`}
              className="h-[900px] w-full rounded-lg border border-slate-200"
            />
          ) : (
            <p className="text-sm text-slate-600">Kein PDF vorhanden.</p>
          )}
        </Card>
        <div className="space-y-6">
          {letter.status === 'generated' && truth?.passed ? (
            <Card title="Entscheidung">
              <form action={approveLetterAction}>
                <input type="hidden" name="id" value={letter.id} />
                <button className={btn.primary} type="submit">
                  Freigeben
                </button>
              </form>
              <hr className="my-4" />
              <form action={rejectLetterAction} className="space-y-2">
                <input type="hidden" name="id" value={letter.id} />
                <textarea name="note" required placeholder="Grund" rows={2} className={input} />
                <div className="flex flex-wrap gap-2">
                  <button className={btn.secondary} name="regenerate" value="1" type="submit">
                    Verwerfen &amp; neu erzeugen
                  </button>
                  <button className={btn.danger} name="regenerate" value="0" type="submit">
                    Verwerfen
                  </button>
                </div>
              </form>
            </Card>
          ) : null}
          <Card title="Wahrheits-Check">
            {!truth ? (
              <p className="text-sm text-red-800">Nicht geprüft – Brief kann nicht freigegeben werden.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  {truth.passed ? <Badge color="green">bestanden</Badge> : <Badge color="red">blockiert</Badge>}{' '}
                  <span className="text-xs text-slate-500">{dt(truth.checkedAt)}</span>
                </p>
                <p className="text-xs text-slate-600">
                  Claims: {truth.claims.length ? truth.claims.join(', ') : 'keine (Brief ohne Statistik)'} · Quellenseite:{' '}
                  {truth.sourcesPage ?? '–'} · LLM:{' '}
                  {truth.llm?.skipped ?? truth.llm?.error ?? (truth.llm?.unbackedEffectClaim ? 'Fund' : 'ok')}
                </p>
                {truth.violations.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-xs text-red-800">
                    {truth.violations.map((v, i) => (
                      <li key={i}>
                        <span className="font-mono">{v.rule}</span>: {v.detail}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </Card>
          {letter.statusReason ? (
            <Card title="Hinweis">
              <p className="text-sm break-words text-red-800">{letter.statusReason}</p>
            </Card>
          ) : null}
          <Card title="Daten">
            <dl className="space-y-1 text-sm">
              <div>
                Anbieter: {letter.provider ?? '–'}{' '}
                {letter.providerLetterId ? <code className="text-xs">{letter.providerLetterId}</code> : null}
              </div>
              <div>Erstellt: {dt(letter.createdAt)}</div>
              <div>
                Freigegeben: {dt(letter.approvedAt)} {letter.approvedBy ? `(${letter.approvedBy})` : ''}
              </div>
              <div>Versendet: {dt(letter.sentAt)}</div>
              <div>Zugestellt: {dt(letter.deliveredAt)}</div>
            </dl>
          </Card>
          <Card title="Verlauf">
            <ul className="space-y-1 text-xs">
              {log.map((l) => (
                <li key={l.id}>
                  {dt(l.createdAt)} · <span className="font-mono">{l.action}</span> · {l.actor}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
