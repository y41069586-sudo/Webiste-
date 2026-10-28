import { RESEARCH_SIGNAL_LABELS, WEBSITE_METHODS, type LeadResearch } from '@wbm/core';
import { btn, input } from '@/components/ui';
import { saveResearchAction } from '../actions';
import { SubmitButton } from '@/components/admin/submit-button';

const methods = {
  name_city: 'Firmenname und Ort gesucht',
  phone: 'Geschäftliche Telefonnummer gesucht',
  directory_links: 'Website-Links in Verzeichnissen geprüft',
  profile_links: 'Verlinkte Social-/Plattformprofile geprüft (auch externe Links)',
};
export function ResearchForm({ id, research }: { id: string; research: LeadResearch | null }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <details className="mt-4">
      <summary className="cursor-pointer font-medium">Recherche prüfen oder ergänzen</summary>
      <form action={saveResearchAction} className="mt-4 space-y-5">
        <input type="hidden" name="id" value={id} />
        <p className="text-sm text-slate-600">
          Nur nachvollziehbare, rechtmäßig nutzbare Belege speichern. Beobachtungsdatum ist das Datum des Signals, nicht
          automatisch der heutige Tag. Bewertungen und Bilder belegen keine freien Kapazitäten. Ein allgemeiner Demo-Faktenhaken
          ersetzt diese Prüfung nicht.
        </p>
        <fieldset className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <legend className="px-2 font-medium">Eigene Website suchen</legend>
          <label className="text-sm">
            Ergebnis
            <select name="websiteResult" className={input} defaultValue={research?.website.result ?? 'unknown'}>
              <option value="unknown">Unbekannt / unvollständig</option>
              <option value="not_found">Nach vollständiger Prüfung keine eigene Website gefunden</option>
              <option value="found">Eigene Website gefunden – keine Akquise</option>
            </select>
          </label>
          <label className="text-sm">
            Tatsächlich geprüft am
            <input
              type="date"
              name="websiteDate"
              required
              className={input}
              defaultValue={research?.website.checkedAt.slice(0, 10) ?? today}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Recherchebeleg (HTTPS oder interne review:Referenz)
            <input name="websiteSource" required className={input} maxLength={500} defaultValue={research?.website.source} />
          </label>
          {WEBSITE_METHODS.map((method) => (
            <label className="flex gap-2 text-sm" key={method}>
              <input type="checkbox" name={method} defaultChecked={research?.website.methods.includes(method)} />
              {methods[method]}
            </label>
          ))}
          <label className="text-sm sm:col-span-2">
            Gefundene eigene Website (falls vorhanden)
            <input type="url" name="foundUrl" className={input} defaultValue={research?.website.foundUrl} />
          </label>
        </fieldset>
        <fieldset className="space-y-4">
          <legend className="font-medium">Belegte Angaben und Signale</legend>
          <p className="text-sm text-slate-600">
            Für die Eignung: Aktivität, Zustellanschrift, Eigenständigkeit, Leistungs-/Kundenfokus und mindestens ein aktuelles
            Akquisesignal. Vollerwerb und echter Geschäftsbeginn sind zusätzliche Prioritätssignale. Bekannte Ereignis- und
            Veröffentlichungsdaten zusätzlich eintragen. Erneutes Lesen macht alte Anzeigen, Übernahmen oder Bilder nicht aktuell.
            Nicht erreichbare Profile und reine Suchvorschauen sind kein abgeschlossener Quellencheck.
          </p>
          <p className="rounded-lg bg-sky-50 p-3 text-sm text-slate-700">
            <strong>Persönlicher Einstieg im Brief:</strong> Die erste aktuelle Angabe der Art „Neues Angebot“,
            „Betriebsübernahme“, „Nachgewiesene Erweiterung“, „Aktive Social-/Plattformnutzung“, „Aktuelle Arbeitsbilder“ oder
            „Wirbt aktuell für Leistungen“ eröffnet den Brief mit „mir ist aufgefallen: …“. Dafür als kurzen, sachlichen Satz in
            der Sie-Form eintragen, z. B. „Sie bieten seit Kurzem auch Fassadenarbeiten an“ oder „Sie zeigen auf Instagram
            regelmäßig Ihre fertigen Bäder“ – ohne Bewertung, ohne Zahlen, die nicht in der Quelle stehen.
          </p>
          {Array.from({ length: Math.max(10, research?.signals.length ?? 0) }, (_, index) => {
            const signal = research?.signals[index];
            return (
              <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                <label className="text-sm">
                  Art der Angabe
                  <select name={`kind${index}`} defaultValue={signal?.kind ?? 'service'} className={input}>
                    {Object.entries(RESEARCH_SIGNAL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Kurze belegte Angabe
                  <input name={`text${index}`} maxLength={140} className={input} defaultValue={signal?.text} />
                </label>
                <label className="text-sm sm:col-span-2">
                  Quelle / konkreter Nachweis
                  <input name={`source${index}`} maxLength={500} className={input} defaultValue={signal?.source} />
                </label>
                <label className="text-sm">
                  Signal beobachtet/veröffentlicht am
                  <input
                    type="date"
                    name={`observed${index}`}
                    className={input}
                    defaultValue={signal?.observedAt.slice(0, 10) ?? today}
                  />
                </label>
                <label className="text-sm">
                  Ereignis / Veröffentlichung / Geschäftsbeginn (falls belegt)
                  <input type="date" name={`occurred${index}`} className={input} defaultValue={signal?.occurredOn} />
                </label>
                <label className="flex gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name={`verified${index}`} defaultChecked={signal?.verified} />
                  Angabe, Datum und Zuordnung zum Betrieb tatsächlich überprüft
                </label>
              </div>
            );
          })}
        </fieldset>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="lawfulUse" required />
          Die Quellen sind dem richtigen Betrieb zugeordnet und dürfen hierfür gespeichert und genutzt werden. Keine ungeprüfte
          Google-Datenübernahme oder fremden Bilderrechte unterstellen.
        </label>
        <p className="text-sm text-slate-600">
          Speichern aktualisiert die Eignung und den nächsten Entwurf. Bestehende Demos/Briefe werden nicht still verändert; sie
          benötigen bei geändertem Faktenstand eine erneute Prüfung. Kein Versand wird ausgelöst.
        </p>
        <SubmitButton type="submit" className={btn.primary}>
          Recherche und Eignung speichern
        </SubmitButton>
      </form>
    </details>
  );
}
