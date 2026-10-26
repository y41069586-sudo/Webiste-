# Betriebscharakter statt austauschbarer Demos

Stand26.10.2026. BestehendeV4/V5-Architektur, Branch`codex/conversion-v4`. Keine neue Anwendung/DB,
keine Veröffentlichung, kein Push, keine bezahlte Bildanalyse/Briefe/Zahlungen/Domainkäufe.

## Sichtbare Ergebnisse

Die lokale Galerie steht unter `data/exports/vibe-upgrade/galerie.html`, mit20vollständigen HTML-Demos,
Desktop1440 und Mobil360/390/430, alten Desktopbildern und Zusatzansichten für lange Namen/fehlende Bilder.
`evidence/` enthält fünf tatsächlich gerenderte Branchenübersichten und den Drei-Stil-Vergleich.
Die Übersichten zeigen Ausschnitte zur Orientierung; komplette Seiten sind separat verlinkt.
Alle Betriebe/Beobachtungen sind fiktive Testdaten. Die drei Café-Varianten demonstrieren dieselben
Fakten mit unterschiedlichen fiktiven Stilvorgaben, keine durchgeführte Maps-Recherche.

## Was sich geändert hat

- Vorlagenwahl richtet sich zuerst nach einer gespeicherten gestalterischen Komposition. Auslastung
  und stabile Rotation entscheiden innerhalb geeigneter Vorlagen; feste Auswahl/Regenerierung/Plakat bleiben.
- Gestaltungsprofile enthalten Charakter, Typografie, Primärfarbe, Bildstimmung und Komposition.
  Sechs Charakterrichtungen, drei Schriftkombinationen, vier Kompositionsprioritäten. Keine beliebigen
  Modell-CSS-Werte. Hexfarben und Kontraste geprüft. Lokale lizenzierte Schriften, keine Font-CDN-Anfrage.
- Restaurant-Hero mit klar getrennten Text-/Bildflächen; warmer, ruhiger und urbaner Aufbau unterscheiden
  sich auch im Raster. Handwerk mit ruhigerem Leistungsindex und eigener illustrativer Maler-Farbstudie
  statt übergroßer Initiale oder wiederholtem Faktenpanel. Fremde Arbeitsergebnisse werden nicht erfunden.
- Neue sachliche Maler-/Elektro-/Café-Einstiege und ein zum Stilprofil passender Sprachton im vorhandenen
  Content-Prompt. Eine Gestaltungsvorgabe darf keine Leistungen/Atmosphäre/Qualität als Betriebsfakt erfinden.
- Keine KI-Motive in der normalen Fotoauswahl. Archivierte Reviewassets behalten ihre Herkunft/Kennzeichnung.
  Berechtigte Betriebsbilder bevorzugt, passende lizenzierte nichtgenerierte Beispiele nur als Gestaltung.
  Ein lesbarer Bildwelt-Hinweis im Footer ersetzt wiederholte Badges auf normalen CC0-Fotos.
- Ergänztes CC0-Barber-Werkzeugfoto: Originalseite/Lizenz/Fotomotiv geprüft, optimiert, Quellenangabe imJPEG.
  Nicht automatisch für Kosmetik oder einen unbestimmten Friseursalon verwenden. Malerbild mit Wasserzeichen
  verworfen, nicht entfernt/umgangen. Keine fremden Google-Maps-Fotos kopiert.
- Bestehende Leadverwaltung kann private Referenzen/Stilnotizen mit Quelle aufnehmen. Analyse und
  Darstellung benötigen getrennte Berechtigungen. Admin kann gespeicherte Notizen und Bilder prüfen.
  Upload mit Session-/Origin-/Format-/Größenprüfung, keine Chromium-/LLM-Ausführung im Webhandler.
- Worker kann den vorhandenen Anthropic-Provider mit re-encodierten Bildreferenzen ansprechen. Beschränkte
  Stilantwort, Budgetbuchung, Cache je Quelle/Modell/Version, gemeinsame laufende Analyse pro Lead/Worker.
  Modelltexte/Bildbeschriftungen sind untrusted Daten und können weder Aktionen noch neue Firmenfakten erzeugen.
- Gewählte Richtung bleibt im Demo-Snapshot, beim Kauf und nach Textüberarbeitung erhalten. Bestehende
  veröffentlichte Demo-/Briefdateien werden nicht heimlich ersetzt. Neue Gestaltungskontexte benötigen
  individuelle visuelle Freigabe; erste30-Prüfung und übrige Sicherheitsbremsen bleiben erhalten.
- Opt-out und Retention löschen private Designreferenzen/Cache. Späte Stil- oder Textmodellantworten dürfen
  weder Cache noch Demo-HTML nach einer Sperrung wiederherstellen. Kein LLM-Aufruf unter DB-Zeilensperre.
- Öffentliche statische Musterdateien werden lokal aus demselben Renderer aktualisiert; kein Netlify-Deploy.

## Was die Automatisierung noch nicht weiß

Ein OSM-Tag kann einen frischen Farbhinweis liefern. Ohne geeignete Belege bleibt die Richtung ein
**Branchenvorschlag**, keine Behauptung über den tatsächlichen Betrieb. Es gibt keinen ungeprüften
Google-Maps-Fotocrawler. Öffentlich sichtbare Fotos haben nicht automatisch ein Speicher-/KI-/Darstellungsrecht.
Die echte Anbieter-Vision wurde nicht mit einem tatsächlichen API-Aufruf getestet: Mockantwort,
SDK-Anfrageformat und lokale Bildverarbeitung sind getrennte Nachweise. Für die externe Abnahme braucht
es erlaubte Referenzen und eine sichere Bindung des vorhandenen Anbieterzugangs mit Kostenfreigabe.

## Grenzen der Qualität

Die tatsächlichen20Hero-/Mobilansichten wurden in Branchenübersichten visuell gesichtet. Ganzseiten
und Stresszustände sind gerendert/automatisch geprüft; das ist keine unabhängige menschliche Designabnahme.
Besonders fotoabhängige Beauty- und technische Handwerksansichten bleiben ohne Betriebsreferenzen
schwächer. Sie sind nicht allein wegen bestandener Technik versandbereit. Betriebscharakter lässt sich
nicht aus Namen, Branche und Stadt zuverlässig rekonstruieren. Keine pauschale9/10-Bewertung oder
nachgewiesene Conversionsteigerung. Bestehende echte Demos benötigen gesonderte Regenerierung/Prüfung.

## Sichere Reproduktion

Vom Repository-Root mit bestehendem pnpm10.28.0 und Chromium:

- `pnpm css:build`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter @wbm/templates test`.
- `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium packages/core/node_modules/.bin/tsx scripts/vibe-design-review.mts --performance`.
  `--resume` nur nach Unterbrechung mit unverändertem Quellstand, nicht nach Templateänderungen.
- Danach `.../tsx scripts/vibe-gallery.mts`; Browseraufnahmen nur aus lokalen/eingebetteten Dateien.
- Core:13betroffene Suites laut Testbericht mit **ausschließlich lokaler benannter Wegwerf-Testdatenbank**.
  Globalsetup löscht sie. Niemals eine Supabase-/Produktions-URL verwenden.
- Browser: `business-design.spec.ts`, `trust-checkout.spec.ts`, `trust-states.spec.ts`, `onboarding.spec.ts`;
  eigene lokale E2E-DB, alle ProviderMock, DRY_RUN=true. `QUALITY_EXPORT_DIR` erhält alte Nachweise.

Exakte Endergebnisse/Restpunkte in `pruefbericht.md`, Wiederaufnahme in `status.md`.

Bilder mit Namens-/Lizenzhinweispflichten gehören nicht in den vereinfachten Darstellungsweg, solange
solche Pflichten offen sind. Die Admin-Bestätigung verlangt eine erlaubte Darstellung ohne zusätzliche
Hinweise; anderenfalls nur berechtigte Analyse und keine Bildübernahme. Keine juristische Freigabe.
