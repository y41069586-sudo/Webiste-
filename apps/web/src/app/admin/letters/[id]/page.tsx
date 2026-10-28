import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import {
  getDb,
  getProviders,
  schema,
  LETTER_QUALITY_DIMENSIONS,
  type LetterQualityAssessment,
  type TruthCheckResult,
} from '@wbm/core';
import { Badge, Card, PageHeader, StatusBadge, btn, input } from '@/components/ui';
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
  searchParams: Promise<{ hinweis?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { hinweis } = await searchParams;
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
          {quality ? (
            <Card title="Briefqualität">
              <p className="text-sm">
                {quality.total === null ? 'Einzelbewertungen ausstehend' : `${quality.total}/100`} ·{' '}
                {quality.passed ? 'Mindestkriterien bestanden' : 'noch nicht freigegeben'}
              </p>
            </Card>
          ) : null}
          {letter.status === 'generated' && truth?.passed ? (
            <Card title="Entscheidung">
              <form action={approveLetterAction} className="space-y-3">
                {quality ? (
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold">Brief tatsächlich prüfen (0–100)</legend>
                    {Object.entries(LETTER_QUALITY_DIMENSIONS).map(([key, definition]) => (
                      <label key={key} className="block text-sm">
                        {definition.label} ({definition.weight} %)
                        <input
                          type="number"
                          name={`quality_${key}`}
                          min={0}
                          max={100}
                          required
                          className={input}
                          placeholder="Nach PDF-Sichtprüfung bewerten"
                        />
                      </label>
                    ))}
                    <p className="text-xs text-slate-600">
                      Mindestgesamtwert {quality.minimum}; kein Bereich unter 60. Der QR-Code wurde bereits aus dem fertigen PDF
                      geprüft. Technische Tests ersetzen keine Sichtprüfung.
                    </p>
                  </fieldset>
                ) : null}
                <input type="hidden" name="id" value={letter.id} />
                <SubmitButton className={btn.primary} type="submit">
                  Freigeben
                </SubmitButton>
              </form>
              <hr className="my-4" />
              <form action={rejectLetterAction} className="space-y-2">
                <input type="hidden" name="id" value={letter.id} />
                <textarea name="note" required placeholder="Grund" rows={2} className={input} />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton className={btn.secondary} name="regenerate" value="1" type="submit">
                    Verwerfen &amp; neu erzeugen
                  </SubmitButton>
                  <SubmitButton className={btn.danger} name="regenerate" value="0" type="submit">
                    Verwerfen
                  </SubmitButton>
                </div>
              </form>
            </Card>
          ) : null}
          {hinweis ? (
            <Card title="Hinweis">
              <p className="text-sm">{hinweis}</p>
            </Card>
          ) : null}
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
