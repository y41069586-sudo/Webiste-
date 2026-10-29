import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, getProviders, schema, type LetterQualityAssessment, type TruthCheckResult } from '@wbm/core';
import { Badge, Card, Notice, btn, input } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, eur } from '@/lib/format';
import { approveLetterAction, lxpTestJobAction, rejectLetterAction } from '../actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Brief' };

export default async function LetterDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hinweis?: string; flow?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { hinweis, flow } = await searchParams;
  const inFlow = flow === '1';
  const mail = getProviders().mail;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const letter = await db.query.letters.findFirst({ where: eq(schema.letters.id, id) });
  if (!letter) notFound();
  const quality = letter.truthCheckJson?._quality as LetterQualityAssessment | undefined;
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, letter.leadId) });
  const log = await db
    .select()
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.entity, 'letter'), eq(schema.auditLog.entityId, id)))
    .orderBy(desc(schema.auditLog.id));
  const truth = letter.truthCheckJson as unknown as TruthCheckResult | null;
  const statusText: Record<string, string> = {
    generated: 'Wartet auf dich',
    approved: 'Freigegeben – geht bald raus',
    sent: 'Verschickt',
    delivered: 'Zugestellt',
    rejected: 'Verworfen',
    failed: 'Fehler beim Versand',
  };
  const canDecide = letter.status === 'generated' && truth?.passed;
  return (
    <>
      <div className="dcheck-head">
        <div>
          <p className="dcheck-name">Brief an {lead?.businessName ?? '–'}</p>
          <p className="dcheck-sub">
            {statusText[letter.status] ?? letter.status}
            {letter.dryRun ? ' · Testmodus (wird nicht gedruckt)' : ''}
            {letter.isTest ? ' · Testbrief' : ''}
          </p>
        </div>
        {letter.pdfStorageKey ? (
          <Link className={btn.secondary} href={`/admin/files/${letter.pdfStorageKey}`} target="_blank">
            Groß öffnen ↗
          </Link>
        ) : null}
      </div>
      {hinweis ? (
        <div className="mb-4">
          <Notice kind="warn">{hinweis}</Notice>
        </div>
      ) : null}
      {letter.status === 'generated' && !truth?.passed ? (
        <div className="mb-4">
          <Notice kind="warn">
            Dieser Brief enthält eine Aussage, die nicht belegt ist, und kann so nicht raus. Lass ihn unten neu schreiben.
          </Notice>
        </div>
      ) : null}
      <div className="dcheck">
        <div className="dcheck-letter">
          {letter.pdfStorageKey ? (
            <iframe title="Brief" src={`/admin/files/${letter.pdfStorageKey}`} />
          ) : (
            <p className="text-sm text-slate-600">Noch kein Brief-PDF vorhanden.</p>
          )}
        </div>
        <div className="dcheck-side">
          {canDecide ? (
            <div className="check-card">
              <form action={approveLetterAction}>
                <input type="hidden" name="id" value={letter.id} />
                <input type="hidden" name="simple" value="1" />
                {inFlow ? <input type="hidden" name="flow" value="1" /> : null}
                <div className="check-ticks">
                  <p className="check-q">Stimmt das?</p>
                  <label className="check-tick">
                    <input type="checkbox" name="read" required />
                    <span>Brief gelesen – Name, Anschrift, Bild und Text passen</span>
                  </label>
                </div>
                {quality ? (
                  <div className="check-ticks dcheck-rating">
                    <p className="check-q">Wie gut ist der Brief?</p>
                    <div className="dcheck-choices">
                      {(
                        [
                          ['sehr_gut', 'Sehr gut'],
                          ['gut', 'Gut'],
                          ['schwach', 'Nicht gut genug'],
                        ] as const
                      ).map(([value, label]) => (
                        <label key={value} className="check-tick dcheck-choice">
                          <input type="radio" name="rating" value={value} required />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                <SubmitButton className="ui-btn ui-btn-primary check-go" type="submit">
                  Freigeben
                </SubmitButton>
                <p className="check-note">
                  {letter.dryRun ? 'Testmodus: Es wird nichts gedruckt oder verschickt.' : 'Danach geht der Brief in die Post.'}
                </p>
              </form>
            </div>
          ) : null}
          {letter.status === 'generated' ? (
            <details className="dcheck-reject check-card" open={!truth?.passed}>
              <summary>Passt nicht</summary>
              <form action={rejectLetterAction} className="mt-3 grid gap-2">
                <input type="hidden" name="id" value={letter.id} />
                {inFlow ? <input type="hidden" name="flow" value="1" /> : null}
                <input name="note" placeholder="Was stört? (optional)" maxLength={300} className={input} />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton className={btn.primary} name="regenerate" value="1" type="submit">
                    Neu schreiben lassen
                  </SubmitButton>
                  <SubmitButton className={btn.secondary} name="regenerate" value="0" type="submit">
                    Verwerfen
                  </SubmitButton>
                </div>
              </form>
            </details>
          ) : null}
          {letter.statusReason ? <Notice kind="warn">{letter.statusReason}</Notice> : null}
          <details className="admin-details dcheck-more">
            <summary>Technische Details</summary>
            <div className="mt-3 space-y-4">
              <p className="text-xs text-slate-500">
                Seiten: {letter.pageCount} · Kosten: {eur(letter.costCents ?? letter.estimatedCostCents)}
                {quality ? ` · Qualität ${quality.total === null ? 'offen' : `${quality.total}/100`}` : ''}
                {lead ? (
                  <>
                    {' · '}
                    <Link className="underline" href={`/admin/leads/${lead.id}`}>
                      Betrieb
                    </Link>
                  </>
                ) : null}
              </p>
              {(mail.name === 'easynova' || mail.name === 'letterxpress') &&
              mail.mode === 'test' &&
              truth?.passed &&
              letter.pdfStorageKey ? (
                <Card title={mail.name === 'easynova' ? 'easyNova-Testmodus' : 'LetterXpress-Testmodus'}>
                  <p className="mb-3 text-sm text-slate-600">
                    {mail.name === 'easynova'
                      ? 'Liefert dieses PDF als Testsendung ein: alle Prüfungen von easyNova, kein Druck, keine Zustellung, keine Kosten.'
                      : 'Überträgt dieses PDF in die Postbox – kein Druck, keine Kosten, nach 7 Tagen gelöscht.'}
                  </p>
                  <form action={lxpTestJobAction}>
                    <input type="hidden" name="id" value={letter.id} />
                    <SubmitButton className={btn.secondary} type="submit">
                      {mail.name === 'easynova' ? 'Testsendung an easyNova' : 'Testauftrag an LetterXpress'}
                    </SubmitButton>
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
          </details>
        </div>
      </div>
    </>
  );
}
