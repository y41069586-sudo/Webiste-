import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, like } from 'drizzle-orm';
import {
  demoDesignChoices,
  demoRevisionKey,
  getDb,
  getSetting,
  schema,
  DEMO_QUALITY_DIMENSIONS,
  type DemoRevisionStatus,
} from '@wbm/core';
import { Badge, Card, PageHeader, StatusBadge, Table, Td, btn, input, Notice } from '@/components/ui';
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
  searchParams: Promise<{ quality?: string }>;
}) {
  const qualityMessage = (await searchParams).quality;
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const demo = await db.query.demos.findFirst({ where: eq(schema.demos.id, id) });
  if (!demo) notFound();
  const lead = await db.query.leads.findFirst({ where: eq(schema.leads.id, demo.leadId) });
  const meta = (demo.contentJson as { _meta?: { source?: string; attempts?: number } } | null)?._meta;
  const canDecide = ['pending_review', 'qa_failed'].includes(demo.status);
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
  return (
    <>
      {qualityMessage === 'required' && canDecide ? (
        <Notice kind="warn">
          Qualitätsbewertung unvollständig oder unter Mindestniveau. Bitte Entwurf überarbeiten, erneut prüfen und alle Bereiche
          tatsächlich bewerten.
        </Notice>
      ) : null}
      <PageHeader
        title={`Demo: ${lead?.businessName ?? '–'}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={demo.status} /> {demo.templateId} / {demo.palette} · Inhalt:{' '}
            {meta?.source === 'fallback' ? 'Standardtexte' : 'KI'} · erstellt {dt(demo.createdAt)}
          </span>
        }
        actions={
          <>
            <Link className={btn.secondary} href={`/admin/demos/${demo.id}/html`} target="_blank">
              Vorschau in neuem Tab
            </Link>
            {lead ? (
              <Link className={btn.secondary} href={`/admin/leads/${lead.id}`}>
                Lead
              </Link>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Vorschau (Desktop)">
            <iframe
              title="Demo-Vorschau"
              src={`/admin/demos/${demo.id}/html`}
              className="h-[720px] w-full rounded-lg border border-slate-200"
              sandbox="allow-scripts"
            />
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            {demo.screenshotMobileKey ? (
              <Card title="Mobil (Screenshot)">
                <img
                  src={`/admin/files/${demo.screenshotMobileKey}`}
                  alt="Mobil-Screenshot"
                  className="mx-auto max-h-[640px] rounded-lg border"
                />
              </Card>
            ) : null}
            {demo.compositeKey ? (
              <Card title="Komposit für den Brief">
                <img src={`/admin/files/${demo.compositeKey}`} alt="Komposit" className="w-full rounded-lg border" />
              </Card>
            ) : null}
          </div>
        </div>
        <div className="space-y-6">
          {canDecide ? (
            <Card title="Entscheidung">
              <form action={approveDemoAction} className="space-y-3">
                <p className="text-sm text-slate-600">
                  Technische QA ist keine visuelle Abnahme. Jede Freigabe bestätigt die tatsächliche Einzelprüfung.
                </p>
                {(['facts', 'desktop', 'mobile', 'images', 'text'] as const).map((key, index) => (
                  <label key={key} className="flex gap-2 text-sm">
                    <input type="checkbox" name={key} required />
                    {
                      [
                        'Name, Anschrift, aktiver Betrieb, Branche und fehlende eigene Website verifiziert',
                        'Desktop tatsächlich angesehen, keine sichtbaren Layoutfehler',
                        'Handy tatsächlich angesehen und bedienbar',
                        'Bilder passend, rechtmäßig und korrekt gekennzeichnet',
                        'Texte glaubwürdig; Beispiele und offene Inhalte erkennbar',
                      ][index]
                    }
                  </label>
                ))}
                {demo.qaResultJson?.quality ? (
                  <fieldset className="grid gap-3 sm:grid-cols-2">
                    <legend className="text-sm font-semibold">Tatsächliche Qualitätsbewertung (0–100)</legend>
                    {Object.entries(DEMO_QUALITY_DIMENSIONS).map(([key, definition]) => (
                      <label key={key} className="text-sm">
                        {definition.label} ({definition.weight} %)
                        <input
                          type="number"
                          name={`quality_${key}`}
                          min={0}
                          max={100}
                          required
                          className={input}
                          placeholder="Nach Sichtprüfung bewerten"
                        />
                      </label>
                    ))}
                    <p className="text-xs text-slate-600 sm:col-span-2">
                      Keine automatische Designnote. Mindestgesamtwert {demo.qaResultJson.quality.minimum}; kein Bereich unter 60.
                      Niedrige Werte erfordern Überarbeitung.
                    </p>
                  </fieldset>
                ) : null}
                <input type="hidden" name="id" value={demo.id} />
                <textarea name="note" placeholder="Notiz (optional)" className={input} rows={2} />
                <SubmitButton className={btn.primary} type="submit">
                  Freigeben &amp; veröffentlichen
                </SubmitButton>
                {demo.status === 'qa_failed' ? (
                  <p className="text-xs text-amber-700">
                    QA nicht bestanden: Befunde beheben und erneut prüfen. Eine manuelle Freigabe umgeht diese Sperre nicht.
                  </p>
                ) : null}
              </form>
              <hr className="my-4" />
              <form action={rejectDemoAction} className="space-y-3">
                <input type="hidden" name="id" value={demo.id} />
                <textarea name="note" placeholder="Grund (Pflicht)" required className={input} rows={2} />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton className={btn.secondary} type="submit" name="regenerate" value="1">
                    Ablehnen &amp; neu generieren
                  </SubmitButton>
                  <SubmitButton className={btn.danger} type="submit" name="regenerate" value="0">
                    Ablehnen (Lead verwerfen)
                  </SubmitButton>
                </div>
              </form>
            </Card>
          ) : null}
          {canRevise ? (
            <Card title="Kostenlos anpassen (Wunsch vor dem Kauf)">
              <div id="anpassen" className="space-y-4">
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
            </Card>
          ) : null}
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
            <pre className="max-h-96 overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(demo.contentJson, null, 2)}</pre>
          </Card>
          {demo.status === 'published' ? (
            <Card title="Öffentlich">
              <p className="text-sm">
                Slug: <code>{demo.slug}</code>
              </p>
              <p className="text-sm">Läuft ab: {dt(demo.expiresAt)}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
