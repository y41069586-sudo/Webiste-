import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, like } from 'drizzle-orm';
import { demoDesignChoices, demoRevisionKey, getDb, getSetting, schema, type DemoRevisionStatus } from '@wbm/core';
import { Badge, Card, Table, Td, btn, input, Notice } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { approveDemoAction, rejectDemoAction, reviseDemoAction } from '../actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Demo prüfen' };

export default async function DemoDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ quality?: string; flow?: string }>;
}) {
  const sp = await searchParams;
  const qualityMessage = sp.quality;
  const inFlow = sp.flow === '1';
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const demo = await db.query.demos.findFirst({ where: eq(schema.demos.id, id) });
  if (!demo) notFound();
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, demo.leadId) });
  const meta = (
    demo.contentJson as {
      _meta?: {
        source?: string;
        attempts?: number;
        designBrief?: {
          action: string;
          question: string;
          verified: string[];
          proposals: string[];
          missing: string[];
          density: string;
          why: string;
        };
      };
    } | null
  )?._meta;
  const brief = meta?.designBrief;
  const canDecide = ['pending_review', 'qa_failed'].includes(demo.status);
  const designHint = demo.qaResultJson?.checks
    .find((c) => c.name === 'design-studio-1' && c.passed && c.details?.startsWith('Hinweis für die manuelle Prüfung'))
    ?.details?.replace(/^Hinweis für die manuelle Prüfung \(kein Blocker\): /, '')
    .split(' || ')[0];
  const canRevise = ['pending_review', 'approved', 'published'].includes(demo.status);
  const content = (demo.contentJson ?? {}) as {
    hero_headline?: string;
    hero_subline?: string;
    about?: string;
    cta_text?: string;
    services?: { title: string; text: string }[];
  };
  const [wishes, revision] = await Promise.all([
    db
      .select({ id: schema.supportMessages.id, body: schema.supportMessages.body, createdAt: schema.supportMessages.createdAt })
      .from(schema.supportMessages)
      .where(
        and(
          eq(schema.supportMessages.leadId, demo.leadId),
          like(schema.supportMessages.subject, 'Änderungswunsch vor dem Kauf%'),
        ),
      )
      .orderBy(desc(schema.supportMessages.createdAt))
      .limit(5),
    getSetting<DemoRevisionStatus | null>(demoRevisionKey(demo.id), null),
  ]);
  const designs = lead ? demoDesignChoices(lead.branchGroup) : [];
  const services = [...(content.services ?? []), ...Array.from({ length: 2 }, () => ({ title: '', text: '' }))].slice(0, 8);
  const statusText: Record<string, string> = {
    pending_review: 'Wartet auf dich',
    qa_failed: 'Technik-Prüfung nicht bestanden',
    approved: 'Freigegeben',
    published: 'Online',
    rejected: 'Abgelehnt',
    building: 'Wird gebaut',
    expired: 'Abgelaufen',
  };
  return (
    <>
      {qualityMessage === 'required' && canDecide ? (
        <Notice kind="warn">
          Noch nicht freigegeben: Bitte beide Haken setzen und „Sehr gut“ oder „Gut“ wählen. Ist die Demo nicht gut genug, lass
          sie unten neu bauen.
        </Notice>
      ) : null}
      <div className="dcheck-head">
        <div>
          <p className="dcheck-name">{lead?.businessName ?? 'Demo'}</p>
          <p className="dcheck-sub">
            {statusText[demo.status] ?? demo.status}
            {lead ? ` · ${lead.city}` : ''}
          </p>
        </div>
        <Link className={btn.secondary} href={`/admin/demos/${demo.id}/html`} target="_blank">
          Groß öffnen ↗
        </Link>
      </div>
      <div className="dcheck">
        <div className="dcheck-views">
          <div className="dcheck-desktop">
            <p className="dcheck-label">Computer</p>
            <iframe title="Demo am Computer" src={`/admin/demos/${demo.id}/html`} sandbox="allow-scripts" />
          </div>
          <div className="dcheck-phone">
            <p className="dcheck-label">Handy</p>
            <iframe title="Demo am Handy" src={`/admin/demos/${demo.id}/html`} sandbox="allow-scripts" />
          </div>
        </div>
        <div className="dcheck-side">
          {(meta as { operatorWish?: { note?: string } } | undefined)?.operatorWish?.note ? (
            <div className="decide-wish">
              <p className="decide-wish-label">Neu gebaut nach deinem Wunsch</p>
              <p>„{(meta as { operatorWish?: { note?: string } }).operatorWish!.note}“</p>
            </div>
          ) : null}
          {designHint ? (
            <Notice kind="warn">Hinweis der KI-Designprüfung (kein Blocker, du entscheidest): {designHint}</Notice>
          ) : null}
          {canDecide ? (
            <div className="decide">
              <form action={approveDemoAction} className="decide-yes">
                <input type="hidden" name="id" value={demo.id} />
                <input type="hidden" name="simple" value="1" />
                <input type="hidden" name="rating" value="gut" />
                {inFlow ? <input type="hidden" name="flow" value="1" /> : null}
                <p className="decide-title">Passt?</p>
                {demo.qaResultJson && demo.qaResultJson.checks.some((c) => !c.passed) ? (
                  <label className="decide-check">
                    <input type="checkbox" name="accept_technical" />
                    <span>
                      Technische Befunde trotzdem freigeben (ich habe die Demo selbst angesehen). Befunde:{' '}
                      {demo.qaResultJson.checks
                        .filter((c) => !c.passed)
                        .map((c) => c.name)
                        .join(', ')}
                    </span>
                  </label>
                ) : null}
                <label className="decide-check">
                  <input type="checkbox" name="ok" required />
                  <span>Angesehen – Name, Adresse und Texte stimmen</span>
                </label>
                <SubmitButton className="ui-btn ui-btn-primary decide-btn" type="submit">
                  Passt – freigeben
                </SubmitButton>
                <p className="decide-note">
                  {demo.status === 'qa_failed'
                    ? 'Die Technik-Prüfung hat Hinweise. Lieber unten neu bauen lassen.'
                    : 'Danach geht die Demo online und der Brief entsteht von selbst.'}
                </p>
              </form>
              <form action={rejectDemoAction} className="decide-no">
                {inFlow ? <input type="hidden" name="flow" value="1" /> : null}
                <input type="hidden" name="id" value={demo.id} />
                <p className="decide-title">Passt nicht?</p>
                <label className="decide-label" htmlFor="wish">
                  Was soll anders werden?
                </label>
                <textarea
                  id="wish"
                  name="note"
                  required
                  rows={4}
                  maxLength={1200}
                  className="decide-text"
                  placeholder="z. B. heller und freundlicher, größere Bilder, Überschrift weniger steif, Leistungen kürzer …"
                />
                <SubmitButton className="ui-btn ui-btn-primary decide-btn" type="submit" name="regenerate" value="1">
                  Neu bauen mit meinem Wunsch
                </SubmitButton>
                <p className="decide-note">Die KI baut die Demo komplett neu und setzt deinen Wunsch um.</p>
                <button className="decide-out" type="submit" name="regenerate" value="0" formNoValidate>
                  Betrieb ganz aussortieren
                </button>
              </form>
            </div>
          ) : null}
          {demo.status === 'published' ? (
            <Notice kind="success">Online bis {dt(demo.expiresAt)}. Der Brief entsteht von selbst.</Notice>
          ) : null}
          {canRevise ? (
            <details className="admin-details dcheck-more" id="anpassen" open={wishes.length > 0}>
              <summary>
                {wishes.length ? `Wunsch vom Betrieb (${wishes.length}) – Demo ändern` : 'Etwas an der Demo ändern'}
              </summary>
              <div className="mt-3 space-y-4">
                {wishes.length ? (
                  <div className="space-y-2">
                    {wishes.map((w) => (
                      <div key={w.id} className="rounded-lg bg-amber-50 p-3 text-sm">
                        <p className="text-xs font-semibold text-amber-800">Wunsch vom {dt(w.createdAt)}</p>
                        <p className="mt-1 whitespace-pre-line text-slate-800">{w.body.slice(0, 800)}</p>
                        <Link className="mt-1 inline-block text-xs underline" href={`/admin/support/${w.id}`}>
                          Antworten im Support
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Noch kein Wunsch eingegangen. Du kannst den Entwurf trotzdem anpassen.</p>
                )}
                {revision ? (
                  <Notice kind={revision.state === 'done' ? 'success' : revision.state === 'pending' ? 'info' : 'warn'}>
                    {revision.state === 'done'
                      ? `Gespeichert (Version ${revision.revision}) – der Betrieb sieht den neuen Stand unter demselben Link.`
                      : revision.state === 'pending'
                        ? 'Wird gerade neu erzeugt … Seite in ein paar Sekunden neu laden.'
                        : revision.state === 'blocked'
                          ? `Nicht gespeichert – Inhaltsregeln: ${(revision.violations ?? []).join(' · ')}`
                          : `Fehler: ${revision.error ?? 'unbekannt'}`}
                  </Notice>
                ) : null}
                <form action={reviseDemoAction} className="space-y-3">
                  <input type="hidden" name="id" value={demo.id} />
                  <input type="hidden" name="wishId" value={wishes[0]?.id ?? ''} />
                  <label className="block text-sm">
                    Überschrift
                    <input name="hero_headline" defaultValue={content.hero_headline ?? ''} maxLength={120} className={input} />
                  </label>
                  <label className="block text-sm">
                    Unterzeile
                    <textarea
                      name="hero_subline"
                      defaultValue={content.hero_subline ?? ''}
                      rows={2}
                      maxLength={300}
                      className={input}
                    />
                  </label>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold">Leistungen (leer lassen = entfernen)</legend>
                    {services.map((sv, i) => (
                      <div key={i} className="grid gap-1 rounded-lg border border-slate-200 p-2">
                        <input
                          name={`service_title_${i}`}
                          defaultValue={sv.title}
                          placeholder="Titel"
                          maxLength={60}
                          className={input}
                        />
                        <input
                          name={`service_text_${i}`}
                          defaultValue={sv.text}
                          placeholder="Kurzer Text"
                          maxLength={200}
                          className={input}
                        />
                      </div>
                    ))}
                  </fieldset>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" name="confirmed" className="mt-1" />
                    Neue Leistungen hat der Betrieb selbst genannt (z. B. in seinem Wunsch)
                  </label>
                  <label className="block text-sm">
                    Über uns
                    <textarea name="about" defaultValue={content.about ?? ''} rows={4} maxLength={900} className={input} />
                  </label>
                  <label className="block text-sm">
                    Knopf-Text
                    <input name="cta_text" defaultValue={content.cta_text ?? ''} maxLength={60} className={input} />
                  </label>
                  {designs.length ? (
                    <label className="block text-sm">
                      Gestaltung und Farben
                      <select name="design" defaultValue={`${demo.templateId}|${demo.palette}`} className={input}>
                        {designs.flatMap((d) =>
                          d.palettes.map((pal) => (
                            <option key={`${d.templateId}|${pal}`} value={`${d.templateId}|${pal}`}>
                              {d.name} · {pal}
                            </option>
                          )),
                        )}
                      </select>
                    </label>
                  ) : null}
                  <p className="text-xs text-slate-600">
                    Es gelten dieselben Regeln wie beim Erstellen: keine erfundenen Fakten (Jahre, Auszeichnungen, Preise,
                    Garantien). Nach dem Speichern erzeugt der Server die Demo in wenigen Sekunden unter demselben Link neu.
                  </p>
                  <SubmitButton className={btn.primary}>Änderung speichern</SubmitButton>
                </form>
              </div>
            </details>
          ) : null}
          {brief ? (
            <details className="admin-details dcheck-more">
              <summary>Gestaltungsbriefing (worauf die Seite beruht)</summary>
              <div className="mt-3 grid gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="font-semibold">Belegt</p>
                  <ul className="mt-1 list-disc pl-5">
                    {brief.verified.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">Gestaltungsvorschlag</p>
                  <ul className="mt-1 list-disc pl-5">
                    {brief.proposals.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-slate-500">Besucherfrage: {brief.question}</p>
                </div>
                <div>
                  <p className="font-semibold">Fehlt (wird nicht erfunden)</p>
                  <ul className="mt-1 list-disc pl-5">
                    {brief.missing.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Seitenumfang {brief.density}: {brief.why}
              </p>
            </details>
          ) : null}
          <details className="admin-details dcheck-more">
            <summary>Technische Details</summary>
            <div className="mt-3 space-y-4">
              <p className="text-xs text-slate-500">
                Vorlage {demo.templateId} / {demo.palette} · Inhalt {meta?.source === 'fallback' ? 'Standardtexte' : 'KI'} ·
                erstellt {dt(demo.createdAt)} · Adresse /d/{demo.slug}
                {lead ? (
                  <>
                    {' · '}
                    <Link className="underline" href={`/admin/leads/${lead.id}`}>
                      Betrieb
                    </Link>
                  </>
                ) : null}
              </p>
              <Card title={`QA ${demo.qaResultJson ? (demo.qaResultJson.passed ? '– bestanden' : '– nicht bestanden') : ''}`}>
                {demo.qaResultJson?.quality ? (
                  <p className="mb-3 text-sm">
                    Gewichtete Bewertung:{' '}
                    {demo.qaResultJson.quality.total === null
                      ? 'Sichtprüfung und Einzelbewertungen stehen aus'
                      : `${demo.qaResultJson.quality.total}/100`}
                    . Technische Tests allein liefern keine Designnote.
                  </p>
                ) : null}
                <Table head={['Prüfung', 'Ergebnis', 'Details']} empty="Noch nicht geprüft">
                  {(demo.qaResultJson?.checks ?? []).map((c) => (
                    <tr key={c.name}>
                      <Td className="font-mono text-xs">{c.name}</Td>
                      <Td>
                        <Badge color={c.passed ? 'green' : 'red'}>{c.passed ? 'ok' : 'fehler'}</Badge>
                      </Td>
                      <Td className="text-xs break-words text-slate-600">{c.details ?? ''}</Td>
                    </tr>
                  ))}
                </Table>
              </Card>
              <Card title="Inhalt (JSON)">
                <pre className="max-h-96 overflow-auto text-xs whitespace-pre-wrap">
                  {JSON.stringify(demo.contentJson, null, 2)}
                </pre>
              </Card>
            </div>
          </details>
        </div>
      </div>
    </>
  );
}
