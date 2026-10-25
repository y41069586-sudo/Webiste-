# Ultimate Conversion & Quality – laufender Umsetzungsstand

25.10.2026. Einstieg2b9313d, Branchcodex/conversion-v4, keine lokalen Änderungen verworfen.
Dieser Auftrag erweitert den vorherigen Audit; dessen „lokal fertig“ bezieht sich nicht auf die neuen
Ultimate-Anforderungen. DRY_RUN=true, keine Produktionsmigration, Veröffentlichung oder realen Briefe,
Zahlungen, Erstattungen, Domainkäufe. Push separat ausdrücklich beauftragt; Commit mit Skip-Markern.

## Audit des vorhandenen Bestands

552 getrackte Dateien beim Einstieg. Architektur und fachliche Umsetzung anhand vorhandener
Services, Tests und V4/V5-Dokumentation untersucht, keine neue Parallelarchitektur.

| Bereich                | Vorhandener Bestand / Ergebnis                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architektur            | Next16/React19, CoreDrizzle/Postgres, pg-bossWorker/Chromium, Templatepaket; erhalten                                                                     |
| Suche und Datenquellen | OSM, normalize/qualify, Dubletten/Sperrliste vorhanden; fehlende Website in Quelle ist kein manueller Nachweis                                            |
| Lead-Priorität         | priority-v4 mit begründeten Punkten vorhanden; noch kein vollständiger konfigurierbarer0–100-Eignungsindex                                                |
| KI-Demos               | validierte Prompts, zwei begrenzte Versuche und Bibliotheksfallback; fehlende Spezialbranchen als Ursache falscher Fallbacks identifiziert                |
| Templates              | 20Vorlagen/fünfGruppen mit Plakat, drei Basislayouts je Gruppe; noch keine eigenständigen drei kuratierten Varianten je neuer Spezialbranche abgenommen   |
| Bilder                 | 12CC0-Dateien; bisher keine Maler-/Friseur-/Gartenbilder und bei unbekannter Branche zufällige Auswahl                                                    |
| Texte                  | Firmen-/Ortsdaten und Beispielkennzeichnung vorhanden; Spezialbranchen ergänzt, echte Leistungsverifikation bleibt nötig                                  |
| Briefe                 | vorhandene A/B/C-Varianten, Compose, DIN-Geometrie, Screenshot, QR, Wahrheitsgate; nicht neu gebaut                                                       |
| QR und Versand         | Token-/Demo-/Briefzuordnung, PDF-Checks und LetterXpress-Adapter vorhanden; echter Ziel-/Postdienstnachweis offen                                         |
| Stripe und Kauf        | direkte Checkout-Sessions, Zahlungs-Webhooks/Idempotenz, Go-Live-abhängiges19/99-Abo; echter kompletter Anbieterflow offen                                |
| Onboarding             | Inhalte/Rechtsdaten, Bildübergabe, Vorschau und Freigabe vorhanden; Mock-E2E vorhanden                                                                    |
| Admin                  | gruppierte Navigation, Lead-/Demo-/Brief-/Auftrags-/Fehleransichten und tatsächliche Kosten; kein neues Dashboard angelegt                                |
| Analytics              | Ereignisse/Varianten/Funnel, Einnahmen/Erstattungen/Kosten vorhanden; kein Nachweis tatsächlicher Geschäftsergebnisse oder messbarer eindeutiger Besucher |
| Firmenwebsite          | bestehendes Design, V4-Preisquelle, echte lokale Muster; Startseite wegen fünf langer Beispiele verkürzt                                                  |
| Recht                  | drei Seiten und Footerlinks vorhanden; V4-AGB und Datenschutz ergänzt, fehlende AngabenTODO, keine automatische Rechts-/Steuerfreigabe                    |
| Fehlerbehandlung/QA    | HTML/Axe/Layout/Lighthouse, Freigaben erste30, QueueRetries/Deadletter, SafeTest-DBs; defekte Bilder nun eigenes hartes Browsergate                       |
| Betrieb                | Worker/Supabase/S3-Vorbereitung erhalten; echte Backups/Restore/Queue/Worker und Providerabnahmen bleiben externe Aufgaben                                |

## Tatsächlich umgesetzt in diesem Paket

- Bildfreie Hero-Initialen entfernt; kompakte branchentypische Leistungsübersicht statt riesigem Buchstaben.
- Fallback-Inhalte für Friseur, Gartenbau, Reinigung und Sanitär in bestehender Bibliothek ergänzt.
- Friseur-Elegant bezeichnet Leistungen passend statt pauschal Behandlungen.
- Drei KI-Beispielmotive für Maler, Salon und Garten selbst erzeugt, im Manifest getrennt vonCC0
  dokumentiert, als WebP lokal gespeichert. Keine Behauptung realer Räume/Projekte und keine
  CC0-Behauptung für KI-Dateien; sichtbares Label und Live-Ausschluss. JeDatei unter150000Bytes.
- Bildwahl verlangt passende Schlüsselwörter, vorhandene Datei, zulässigen lokalen Pfad und
  dokumentierte Nutzungsgrundlage. Unbekannte Spezialität erhält kein zufälliges fremdes Motiv.
- Neue harte Prüfung dekodierbarer Bilder aufDesktop/Mobil im vorhandenen browserChecks-Gate.
- Öffentliche Startseite zeigt zwei statt fünf Beispiele; vollständige Galerie bleibt.
- Briefbildbereich erweitert und begrenzt; Regression mit langem Brief zeigte Überlappung.
  Textposition/Absatzabstände korrigiert; Schrift-/QR-/Anschriftgröße nicht verkleinert.
- V4-AGB:13Abschnitte zu VertragsschlussTODO, Preisen, Karte, Monatsbeginn, Domain, Support,
  Care+, Abnahme, Kündigung, Übergabe, Garantie und gesetzlichen Rechten. Datenschutz erweitert
  um Art14/21, LetterXpress, KI, Messgrenzen, zukünftige Anbieter und Übermittlungen.
- Fehlende ImpressumsangabenTODO; vorhandeneUSt-ID ausConfig, keine persönliche Steuernummer.
  Minderjährigkeit/Vertretung nicht behauptet; ggf. erforderliche Anbieterstruktur vor Livebetrieb klären.
- Footerlinks für alle öffentlichen Unterseiten durch Browserassertion ergänzt.

## Quellen der Rechtsrecherche

Eigenständige Entwürfe; keine Generator-/Anwaltsfreigabe. Tatsächlich konsultiert:
https://www.gesetze-im-internet.de/ddg/__5.html
https://www.gesetze-im-internet.de/bgb/__307.html
https://www.gesetze-im-internet.de/ttdsg/__25.html
https://amtliche-handbuecher.bundesfinanzministerium.de/ao/2026/Datenschutz-Grundverordnung/inhalt.html
https://www.letterxpress.de/datenschutzerklaerung
https://stripe.com/de/privacy
https://resend.com/legal/dpa
https://supabase.com/legal/customer-resources/data-processing-addendum
https://www.netlify.com/privacy/
https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data

Rathausauskunft: Betreiber teilt eine telefonische Zusage für Testphase vor Gewerbeanmeldung mit.
Nicht unabhängig bestätigt, keine pauschale Behörden-/Rechtsfreigabe oder Verkaufsfreigabe daraus ableiten.

## Visuelle Nachweise

Lokaler vorhandener Generator mit fiktiven Fakten: data/exports/ultimate-quality,
Malerhandwerk-klar, Friseurbeauty-elegant, Gartenbauhandwerk-solid, jeweilsDesktop/Tablet/Mobil,
Brief-PDF. Drei Originale der KI-Erzeugung unter/workspace/generated_images, optimierte abgeleitete
Dateien im Repository. Keine Live-Veröffentlichung, keine echten Kundenprojekte. Beispiel-QRs unter
example.test sind KEIN Beleg tatsächlich öffentlicher Demo-Erreichbarkeit.
Die öffentlichen fünf HTML-Muster und WebP-Karten wurden aus dem aktuellen Generator neu erstellt.

## Definition of Done – ausdrücklich noch offen

Technisch durch Codex weiterzuführen:

1. Drei wirklich eigenständige kuratierte Varianten für jede der fünf neuen Spezialbranchen;
   Bildbestand für Reinigung/Sanitär und passende Bildreihen/FocalPoints/mehrere Motive erweitern.
2. Bestehendes Compose zu verifizierter Dienstleistungs-Personalisierung erweitern, A/B/C visuell
   differenzieren und finalen PDF-QR dekodieren sowie echte Zielzuordnung in einem isolierten Serverlauf belegen.
3. Vollständiger0–100-Leadscore mit konfigurierbaren Kategorien und gewichtete Qualitäts-/Briefberichte,
   ohne technische Tests als gestalterische Freigabe zu deklarieren; bestehende Review-Gates erhalten.
4. Schriftgrößen/Bildkompositionen/Varianten je Spezialbranche manuell abnehmen; keine pauschale9/10.
5. Neue mobile Performance/Lighthouse-Messung für endgültigen Stand, echte Geräte/CDN später.
6. Firmenwebsite weiter verdichten (FAQ und früherer Leistungsblock), fehlende echte öffentliche
   Angaben aus sicherer privater Konfiguration verlangen; Kundendemos ausdrücklich als Muster erhalten.
7. Präziser endgültiger Abgleich aller29Anforderungspunkte, Kennzahlen-/Admin-Darstellung und
   Qualitätsbewertung erst nach diesen Umsetzungen, nicht aus erfolgreichen Builds ableiten.

Extern/freigabepflichtig bleiben: bestätigte Anbieter-/Steuer-/Vertretungsstruktur, Verträge/AV/TOM,
Runtime-Zugänge, VPS/Backup/Restore/Migration/Queue, echte Anbieter-Sandboxkette und getrennte
Deployment-/Zahlungs-/Versandfreigaben. Siehe vorhandeneV5-Go-Live-Checkliste; keine Sicherheitsgrenzen gelockert.

## Prüfprotokoll dieses Pakets

- GesamtlaufCore:432Fälle,430bestanden; zwei tatsächliche Fehler bei Briefüberlappung und
  geänderter Vertragsformulierung gefunden. Die127Browser-/HTML-/Axe-Layoutfälle bestanden dabei.
- Nachlauf ohne127erMatrix:307Fälle,306bestanden; einzig langerBrief weiter überlappend.
- Abschließender gezielter Brief-/Vertragslauf nach korrigierter Textposition:16/16bestanden,
  einschließlich aller langen Varianten und echter PDF-Geometrie.
- Bild-/Inhaltschecks8/8bestanden; defekte Inlinebilder scheitern in beiden Viewports.
- Template97/97 und Root17/17bestanden; TypeScript allerPakete und Lint bestanden.
- Produktions-Browser8/8:Footer/Rechtsseiten, V4Preise trotzLegacyConfig, Kauf/Onboarding und
  Go-Live-Monatsgate. Lauf fand vor abschließender Bildintegration statt; kein Nachweis des
  unveränderten endgültigen Bildstands durch diesen alten Browserlauf.
- LokalerNext-Build bestanden. Finale Gesamtregression und mobile Leistungswerte nach allen
  Ultimate-Paketen weiterhin erforderlich; Zwischenläufe nicht als vollständige Endabnahme zählen.
- Die neuen dreiPaare wurden gerendert, PDFs validiert, QR-Ausgangsbilder dekodiert; Desktopansichten
  tatsächlich betrachtet. Nach Bild-/Druckkorrektur erneut erzeugt. Finale PDF-QR-Decodierung und
  tatsächliche Serverzielprüfung sind weiterhin eigene offene Kriterien.

Logs:/tmp/ultimate-core.log,/tmp/ultimate-core-final.log,/tmp/ultimate-letter-verified.log,
/tmp/ultimate-quality-tests.log,/tmp/ultimate-template-verified.log,/tmp/ultimate-root.log,
/tmp/ultimate-e2e.log,/tmp/ultimate-types-verified.log,/tmp/ultimate-lint-verified.log,
/tmp/ultimate-build-verified.log. Kein echter Providerlauf aus diesen Tests ableiten.
