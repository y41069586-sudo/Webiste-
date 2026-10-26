# Nachweisbericht – Betriebscharakter und Demoqualität

26.10.2026 · lokal · keine Betreiber-/Versand-/Produktionsfreigabe.

## Tatsächliche Ergebnisse

| Prüfung                                                            | Ergebnis                                                                 | Nachweis                                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Bestehende 20 IDs einschließlich Plakat                            | VERIFIED – erhalten, neu gerendert                                       | `data/exports/vibe-upgrade/checks.json`                                                                              |
| 1440 / 360 / 390 / 430 px, lange Namen, fehlende Fotos             | VERIFIED – 120 Zustände, kein gemeldeter Überlauf/Bildfehler             | 192 JPGs einschließlich Vorherbildern, Hero- und Café-Varianten                                                      |
| Browserstruktur, Konsole, Bildfehler, axe, Layout                  | VERIFIED – 540 Prüfungen, keine Fehler                                   | `checks.json`                                                                                                        |
| Neue Stil-/Rechte-/Cache-/Opt-out-Tests und relevante Regressionen | VERIFIED – 101 Tests in 13 Core-Suites                                   | `test/business-design.test.ts`, `vision-request.test.ts`, vorhandene Demo-/Kauf-/Brief-/Onboarding-/Retention-Suites |
| Templates und Farb-/Typografie-/Bildrechte                         | VERIFIED – 108 Tests                                                     | drei Template-Suites                                                                                                 |
| Vollständige Kaufstrecken                                          | VERIFIED – 10 Branchen, alle Zahlungen Mock                              | `checkout/journeys.json`                                                                                             |
| Fehlgeschlagene/ausstehende Zahlung, Onboarding, privater Upload   | VERIFIED – vier weitere Browserfälle                                     | bestehende Trust-/Onboarding-Specs und `business-design.spec.ts`                                                     |
| Lokaler Produktionsbuild                                           | VERIFIED – Build erfolgreich; Upload, Basis und Care+ nochmals bestanden | `checkout-production/journeys.json`, drei Produktions-E2E-Fälle                                                      |
| TypeScript, ESLint, Paket-/Next-/Workerbuild                       | VERIFIED – bestanden                                                     | finale lokale Befehle laut README                                                                                    |
| Fünf vorhandene öffentliche Muster                                 | VERIFIED – lokal neu erzeugt, keine KI-Fotomotive                        | `apps/web/public/beispiele/`, kein Deployment                                                                        |
| Echte Anthropic-Bildanalyse                                        | OFFEN – kein tatsächlicher API-Aufruf                                    | Mockantwort und SDK-Anfrageformat sind getrennte Nachweise                                                           |
| Tatsächliche Betriebsatmosphäre                                    | OFFEN, soweit keine erlaubten Betriebsreferenzen vorliegen               | alle 20 Basisfixtures sind Branchenvorschläge                                                                        |

Der erste neue Upload-Browsertest erwartete irrtümlich401 statt des vorhandenen307-Loginredirects.
Er wurde korrigiert und separat bestanden; anschließend bestand er erneut im lokalen Produktionsbuild.
Ein Renderlauf wurde beim Umgebungswechsel nach fünf Vorlagen unterbrochen und aus gespeichertem
Prüfstand fortgesetzt. Alle 20 finalen Ergebnisse liegen vor. Es wurde kein fehlender Lauf als bestanden gewertet.
Der Build zeigt die sieben bereits bekannten dynamischen Dateisystem-/Tracing-Warnungen.
Screenshots können im Dev-Server harmlose Hydrationhinweise durch Playwrights temporären caret-Stil
verursachen; keine daraus abgeleitete Behauptung über einen Produktionsfehler oder dessen Behebung.

## Mobile Labormessung

Einzelne synthetische Lighthouse-Läufe auf lokal ausgeliefertem Demo-HTML, keine Felddaten:

| Vorlage          | Performance vorher → nachher | Accessibility / Best Practices | SEO |
| ---------------- | ---------------------------- | ------------------------------ | --- |
| handwerk-klar    | 99 → 100                     | 100 / 100                      | 66  |
| beauty-modern    | 98 → 96                      | 100 / 100                      | 66  |
| gastronomie-foto | 97 → 95                      | 100 / 100                      | 66  |

Die zwei gemessenen Rückgänge um zwei Punkte bleiben transparent; keine pauschale Aussage „ohne
Performanceverlust“. Schriftpaket bereits auf benötigte Familie beschränkt. SEO66 ist mit absichtlichem
Demo-noindex zu lesen, keine Freigabe zur Indexierung. Zusätzliche Kaufstrecken-Messungen trennen
lokalen Dev-Server (`checkout/`) und Produktionsbuild (`checkout-production/`); keine Stripe-Hosted-
Performance oder reale mobile Core Web Vitals behauptet.

## Visuelle Qualitätsmatrix

Alle 20 Hero-/Mobilansichten in den gerenderten Branchenübersichten gesichtet. Die Übersicht zeigt
Ausschnitte; vollständige Seiten und Stressbilder sind separat vorhanden und technisch geprüft.
**Kein** automatischer Score ist eine menschliche gestalterische Abnahme. Die folgende Einordnung
ist eine begründete Sichtprüfung, keine unabhängige Unternehmerbefragung.

| Vorlage              | Technik  | Sichtbarer Fortschritt / verbleibende Schwäche                                                                            | Gestaltung freigegeben            |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| handwerk-solid       | VERIFIED | Ruhiger Leistungsindex. Ohne technische Betriebsfotos bleibt die Faktenfläche visuell nüchtern.                           | Nein, individueller Review bleibt |
| handwerk-klar        | VERIFIED | Editorial-Typografie und illustrative Farbstudie statt generischer Bildersatzkarte. Echte Arbeiten fehlen weiterhin.      | Nein, individueller Review bleibt |
| handwerk-werkstatt   | VERIFIED | Präzise Typografie; doppelten festen Demo-Kontaktbutton entfernt. Mehr tatsächlicher Betriebscharakter benötigt Belege.   | Nein, individueller Review bleibt |
| beauty-elegant       | VERIFIED | Ruhiger, natürlicher Schrift-/Farbcharakter. Fotoabhängiger Entwurf bleibt ohne geeignete Bilder schwächer.               | Nein, individueller Review bleibt |
| beauty-soft          | VERIFIED | Editorial-Schriftbild, klarer mobiler Aufbau. Ohne bestätigte Studio-/Detailbilder noch sehr textorientiert.              | Nein, individueller Review bleibt |
| beauty-modern        | VERIFIED | Urbaner Barber, passendes geprüftes CC0-Werkzeugfoto. Kein tatsächlicher Salon-/Teamnachweis.                             | Nein, individueller Review bleibt |
| gastronomie-foto     | VERIFIED | Neu komponierter Hero; Text außerhalb des Bildes, andere warme/ruhige/urbane Raster. Fotolosen Mobilfehler behoben.       | Nein, individueller Review bleibt |
| gastronomie-split    | VERIFIED | Warme, klar getrennte Text-/Bildkomposition. Tatsächliche Caféatmosphäre ist ohne Referenzen noch unbekannt.              | Nein, individueller Review bleibt |
| gastronomie-magazin  | VERIFIED | Ruhige Editorial-Hierarchie mit eigenständigem Bildausschnitt. Beispielfoto, kein belegter Gastraum.                      | Nein, individueller Review bleibt |
| einzelhandel-foto    | VERIFIED | Natürlicher Blumenladen-Charakter und großflächiges Motiv. Gezeigter Laden ist keine Betriebsaufnahme.                    | Nein, individueller Review bleibt |
| einzelhandel-split   | VERIFIED | Zurückhaltende Waren-/Textkomposition. Sortiment nur als Vorschau, kein tatsächlicher Bestand.                            | Nein, individueller Review bleibt |
| einzelhandel-magazin | VERIFIED | Buchhandlung mit Editorial-Typografie und passender Bildkategorie. Bild bleibt Beispiel.                                  | Nein, individueller Review bleibt |
| kurse-foto           | VERIFIED | Ruhiges Yoga-Profil und passende Materialaufnahme. Keine tatsächlichen Räume/Teilnehmer.                                  | Nein, individueller Review bleibt |
| kurse-split          | VERIFIED | Präzises Trainingsprofil mit Materialdetail. Keine Kurstermine oder bestätigte Ausstattung erfunden.                      | Nein, individueller Review bleibt |
| kurse-magazin        | VERIFIED | Bildfreies Tanzprofil vermeidet unbestätigte Ballettspezialisierung. Visuell schwächer ohne zulässiges Material.          | Nein, individueller Review bleibt |
| handwerk-plakat      | VERIFIED | Erhaltene Plakat-ID, natürliche Gartenpalette. Kein angebliches Referenzprojekt ergänzt.                                  | Nein, individueller Review bleibt |
| beauty-plakat        | VERIFIED | Erhaltene Plakat-ID. Keine Barber-Produktfotos automatisch für unbestimmte Friseure; bildfreier Fallback benötigt Review. | Nein, individueller Review bleibt |
| gastronomie-plakat   | VERIFIED | Erhaltene markante Layoutfamilie. Speisenbeispiele bleiben ausdrücklich unverbindlich.                                    | Nein, individueller Review bleibt |
| einzelhandel-plakat  | VERIFIED | Erhaltene Plakat-Familie mit ruhiger Serifentypografie. Bücherbild ist Beispiel, kein belegter Warenbestand.              | Nein, individueller Review bleibt |
| kurse-plakat         | VERIFIED | Erhaltenes Musikprofil ohne unpassende Fitness-/Tanzfotos. Berechtigte Unterrichts-/Raumaufnahmen fehlen.                 | Nein, individueller Review bleibt |

## Geänderte Bereiche

- `packages/templates`: Art-Direction- und Fontdateien, Typen/Registry, Fotoauswahl/-manifest,
  Shared-/Local-Profile-Bausteine, Handwerk-/Fotolayouts und vorhandene CSS. IDs erhalten.
- `packages/core`: vorhandener Demo-Generator, Content-Prompt/Fallback, Anthropic-Bildblöcke,
  quellengebundener Designservice in bestehenden Settings/Storage, OSM-Farbhinweis,
  QA-/Freigabegate, Übernahme der Gestaltung nach Kauf/Revision, Suppression/Retention.
- `apps/web`: neue private Referenzaktion in bestehender Leadverwaltung, authentifizierte
  Dateiansicht und gezielte CSP-Fontfreigaben. Keine Kunden-Loginpflicht und kein neuer Checkout.
- Bestehende öffentliche Musterdateien regeneriert; Marketingseitenaufbau und separater statischer
  Firmenwebsite-Export nicht neu gestaltet oder veröffentlicht. Brief-Gerätegeometrie erhalten.
- Tests/Render-/Galeriewerkzeuge und dauerhafte Projektdokumentation ergänzt. Keine neuen Abhängigkeiten.

## Kleine verbleibende Liste

1. **Gestalterische Entscheidung:** Neue Galerie ansehen. Fotoabhängige Entwürfe ohne Betriebsreferenzen
   sind ausdrücklich noch keine pauschal abgenommenen Premium-Kundenwebsites.
2. **Erlaubte Quelldaten:** Für tatsächliche Betriebe berechtigte Fotos oder belegte Stilbeobachtungen mit
   Quellen-/Berechtigungsnachweis hinterlegen. Google-Maps-Sichtbarkeit genügt nicht als Nutzungsrecht.
   Über bestehenden Admin → Lead → „Charakter des Betriebs“, Analyse/Darstellung getrennt bestätigen.
3. **Externe Anbieterabnahme:** Bestehenden Anthropic-Zugang sicher an den Worker binden; erst nach
   Kosten-/Datenschutzfreigabe einen echten zulässigen Bildanalysefall prüfen. Keine Schlüssel in den Chat.
4. **Veröffentlichung:** Gesondert freigeben. Es gab keinen Push, Netlify-Deploy, DNS-Eingriff oder
   Produktionsdatenbankzugriff. Bestehende Recht-/Steuer-/Betriebsblocker aus der V5-Checkliste bleiben.

Lokal ist das technische Gestaltungspaket geprüft. Ein tatsächlich betriebsspezifischer Vibe bleibt
von den Quellen abhängig. Neue Gestaltungskontexte benötigen individuelle visuelle Freigabe;
kein Test oder Modellprofil schaltet echten Versand/Verkauf frei.

## Git-Stand

Implementierung lokal committet: `941f7fe0ba9de01cb8d58a429d2db0f91bead675` auf `codex/conversion-v4`.
Anschließender Dokumentationscommit vermerkt diesen geprüften Stand. Kein Push oder Deployment.
