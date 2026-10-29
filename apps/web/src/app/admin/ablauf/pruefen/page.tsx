import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { formatOpeningHours, getDb, nextLeadForReview, schema } from '@wbm/core';
import { SubmitButton } from '@/components/admin/submit-button';
import { Card, Notice, PageHeader, btn, input } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { num } from '@/lib/format';
import { rejectQuickReviewAction, saveQuickReviewAction, skipQuickReviewAction } from '../actions';

export const metadata = { title: 'Schnellprüfung' };
export const dynamic = 'force-dynamic';

const search = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

export default async function QuickReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; skip?: string; ok?: string; aus?: string; offen?: string; fehler?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const skip = (sp.skip ?? '').split(',').filter(Boolean);
  const db = getDb();
  const { lead: nextLead, remaining } = await nextLeadForReview(skip);
  const lead =
    sp.lead && /^[0-9a-f-]{36}$/.test(sp.lead)
      ? ((await db.query.leads.findFirst({ where: eq(schema.leads.id, sp.lead) })) ?? nextLead)
      : nextLead;
  const lastName = async (id?: string) =>
    id && /^[0-9a-f-]{36}$/.test(id)
      ? (await db.query.leads.findFirst({ where: eq(schema.leads.id, id), columns: { businessName: true } }))?.businessName
      : undefined;
  const [okName, outName] = await Promise.all([lastName(sp.ok), lastName(sp.aus)]);
  const hours = lead ? formatOpeningHours(lead.openingHours) : [];
  const place = lead ? `${lead.businessName} ${lead.city}` : '';

  return (
    <>
      <PageHeader
        title="Schnellprüfung"
        subtitle={`Ein Betrieb nach dem anderen. Noch ${num(remaining)} zu prüfen – die besten zuerst.`}
        actions={
          <Link href="/admin/ablauf" className={btn.secondary}>
            Zum Ablauf
          </Link>
        }
      />
      <div className="mb-5 space-y-3">
        {okName ? (
          <Notice kind="success">
            <strong>{okName}</strong> ist geprüft – die Demo wird jetzt automatisch gebaut.
          </Notice>
        ) : null}
        {outName ? (
          <Notice kind="info">
            <strong>{outName}</strong> ist aussortiert.
          </Notice>
        ) : null}
        {sp.offen ? (
          <Notice kind="warn">
            <strong>Gespeichert, aber noch nicht versandfähig.</strong> Es fehlt: {sp.offen}
          </Notice>
        ) : null}
        {sp.fehler ? <Notice kind="error">{sp.fehler}</Notice> : null}
      </div>

      {!lead ? (
        <Card title="Alles geprüft">
          <p className="text-sm text-slate-600">
            Gerade wartet kein Betrieb auf die Prüfung.{' '}
            {skip.length ? (
              <Link className="underline" href="/admin/ablauf/pruefen">
                Übersprungene ({skip.length}) noch einmal ansehen
              </Link>
            ) : (
              <Link className="underline" href="/admin/suche">
                Neue Betriebe suchen
              </Link>
            )}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card title={lead.businessName} className="lg:col-span-2">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Anschrift</dt>
                <dd>
                  {lead.street} {lead.houseNumber}, {lead.postalCode} {lead.city}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Telefon</dt>
                <dd>{lead.phone ?? <span className="text-amber-700">keine – ohne Telefon nicht versandfähig</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Branche</dt>
                <dd>{lead.branch}</dd>
              </div>
              {hours.length ? (
                <div>
                  <dt className="text-xs text-slate-500">Öffnungszeiten</dt>
                  <dd>{hours.join(' · ')}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-slate-500">Link in der Karte</dt>
                <dd className="break-all">{lead.websiteUri ?? '–'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Vorauswahl</dt>
                <dd>{lead.prescreenScore} Punkte</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">In neuem Tab nachsehen</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a className={btn.secondary} href={search(`"${lead.businessName}" ${lead.city}`)} target="_blank" rel="noreferrer">
                Name + Ort
              </a>
              {lead.phone ? (
                <a className={btn.secondary} href={search(`"${lead.phone}"`)} target="_blank" rel="noreferrer">
                  Telefonnummer
                </a>
              ) : null}
              <a className={btn.secondary} href={search(`${place} instagram OR facebook`)} target="_blank" rel="noreferrer">
                Profile
              </a>
              <a
                className={btn.secondary}
                href={search(`${place} gelbe seiten OR das örtliche`)}
                target="_blank"
                rel="noreferrer"
              >
                Verzeichnisse
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Ausführliche Recherche:{' '}
              <Link className="underline" href={`/admin/leads/${lead.id}`}>
                Lead-Seite
              </Link>
            </p>
          </Card>

          <Card title="Prüfen und weiter" className="lg:col-span-3">
            <form action={saveQuickReviewAction} className="space-y-5 text-sm">
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="skip" value={skip.join(',')} />
              <fieldset className="space-y-2">
                <legend className="font-semibold">1. Keine eigene Website gefunden – gesucht nach:</legend>
                {(
                  [
                    ['m_name_city', 'Name + Ort'],
                    ['m_phone', 'Telefonnummer'],
                    ['m_directory_links', 'Verzeichnis-Einträgen'],
                    ['m_profile_links', 'Social-Media-Profilen'],
                  ] as const
                ).map(([name, labelText]) => (
                  <label key={name} className="flex items-center gap-2">
                    <input type="checkbox" name={name} className="h-4 w-4" /> {labelText}
                  </label>
                ))}
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="font-semibold">2. Bestätigt</legend>
                {(
                  [
                    ['addressOk', 'Anschrift stimmt (Briefe kommen an)'],
                    ['operational', 'Betrieb ist aktuell aktiv'],
                    ['independent', 'Eigenständiger Betrieb, keine Kette'],
                    ['privateClients', 'Arbeitet für Privatkunden'],
                    ['businessClients', 'Arbeitet für Gewerbekunden'],
                  ] as const
                ).map(([name, labelText]) => (
                  <label key={name} className="flex items-center gap-2">
                    <input type="checkbox" name={name} className="h-4 w-4" /> {labelText}
                  </label>
                ))}
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="font-semibold">3. Leistungen, die du gesehen hast (bis zu 3)</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <input key={i} name={`service${i}`} maxLength={40} placeholder="z. B. Innenanstrich" className={input} />
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="font-semibold">4. Aktuelles Signal (optional, verbessert die Eignung)</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select name="demandKind" className={input} defaultValue="">
                    <option value="">– keins –</option>
                    <option value="service_advertising">Wirbt aktuell für Leistungen</option>
                    <option value="available_dates">Wirbt mit freien Terminen</option>
                    <option value="active_profile">Aktives Social-Profil</option>
                    <option value="new_offer">Neues Angebot</option>
                    <option value="expansion">Erweiterung</option>
                    <option value="takeover">Betriebsübernahme</option>
                  </select>
                  <input name="demandText" maxLength={140} placeholder="kurz, was du gesehen hast" className={input} />
                </div>
              </fieldset>
              <label className="block">
                <span className="font-semibold">5. Quelle (optional)</span>
                <input name="source" type="url" placeholder="https://… (z. B. Instagram-Profil)" className={input} />
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" name="lawfulUse" required className="mt-1 h-4 w-4" />
                Ich habe diese Angaben selbst geprüft; sie gehören zu diesem Betrieb.
              </label>
              <SubmitButton className={`${btn.primary} w-full justify-center`}>Passt – speichern &amp; nächster</SubmitButton>
            </form>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <form action={rejectQuickReviewAction}>
                <input type="hidden" name="id" value={lead.id} />
                <input type="hidden" name="skip" value={skip.join(',')} />
                <input type="hidden" name="reason" value="has_website" />
                <SubmitButton className={`${btn.secondary} w-full justify-center`}>Hat eine Website</SubmitButton>
              </form>
              <form action={rejectQuickReviewAction}>
                <input type="hidden" name="id" value={lead.id} />
                <input type="hidden" name="skip" value={skip.join(',')} />
                <input type="hidden" name="reason" value="manual" />
                <SubmitButton className={`${btn.secondary} w-full justify-center`}>Passt nicht</SubmitButton>
              </form>
              <form action={skipQuickReviewAction}>
                <input type="hidden" name="id" value={lead.id} />
                <input type="hidden" name="skip" value={skip.join(',')} />
                <SubmitButton className={`${btn.secondary} w-full justify-center`}>Überspringen</SubmitButton>
              </form>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
