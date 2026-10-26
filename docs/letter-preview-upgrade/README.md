# Persönliche Vorschau-Einladungen – Nachweis und Grenzen

26.10.2026 · Branch codex/conversion-v4 · Ausgangspunkt f09a840, damals sauberer Arbeitsbaum.
Nur bestehende Briefstrecke erweitert. DRY_RUN=true, keine Sendung, bezahlte KI-Anfrage,
Produktionsmigration, Anbieteränderung, Veröffentlichung oder Push.

## Sichtbare Ergebnisse

- [Fünf vollständige Briefe nebeneinander](evidence/fuenf-briefe.jpg)
- [Vorher / nachher](evidence/vorher-nachher.jpg)
- [Elektroinstallation](evidence/01-brief.pdf) · [Photovoltaik](evidence/03-brief.pdf)
- [Farbgestaltung](evidence/04-brief.pdf) · [Barber](evidence/11-brief.pdf)
- [Farbangebote im Salon](evidence/12-brief.pdf) · [Restaurant](evidence/15-brief.pdf)
- [Musikunterricht mit langem Firmennamen](evidence/19-brief.pdf)

Die vollständige lokale Galerie mit20 PDF-/300dpi-Druck-/Demo-/Mobilansichten liegt unter
/workspace/seitenwerk-v4/data/exports/letter-preview-upgrade/galerie.html.
ZIP: /workspace/seitenwerk-v4/data/exports/letter-preview-upgrade/seitenwerk-testbriefe.zip.
Archiv und Galerie enthalten ausschließlich ausdrücklich fiktive Betriebs-/Absenderdaten.
Lokale QR-Ziele wurden während des Renderlaufs geprüft; danach ist der Testserver geschlossen.
Diese Codes sind keine öffentlich versandfähigen Links und vom Handy aus nicht erreichbar.

## Warum der bisherige Ansatz nicht genügte

| Priorität | Befund | Tatsächliche Änderung |
|---|---|---|
| P0 | Details wurden hauptsächlich an Standardabsätze angehängt. Auch viele Branchenprofile blieben feste Textbausteine. | Zusammenhängender budgetierter KI-Schreibschritt für Betreff, Einstieg, Nutzen und QR-Satz, danach separater Fakten-/Demo-/Sprachabgleich. Branchenprofile bleiben ausdrücklich Ersatztexte. |
| P0 | Preis-/Tarifblock lenkte vom Ansehen ab. | Neue V4-Briefe ohne Beträge/Tarife; kostenloses Ansehen und spätere kostenpflichtige Umsetzung ausdrücklich getrennt. Vollständiges V4-Angebot unverändert in der Demo vor Bestellung. |
| P0 | Änderungen an geprüften Details machten die bestehende PDF-Zuordnung nicht ungültig. | Neue Kopierrichtlinie und Faktenhash an bestehenden Demo-/Bild-/Empfänger-/PDF-Nachweis gebunden; Freigabe/Versand prüfen erneut. |
| P1 | Ein mittellanger Name überschritt das reale Adressfenster trotz Zeichenprüfung. | Empfängerpräfix früher auf eigene Zeile; Name vollständig erhalten; echter DOM-Regressionstest. |
| P1 | Ein längerer neuer Text rückte in den Pflichtfuß. | Inhalt gekürzt und PDF erneut gerendert; Fußschrift8pt, Gerät114mm und QR41mm unverändert. Produktionsgate blockiert solche Befunde weiterhin. |

## Wie die automatische Personalisierung jetzt funktioniert

1. Bestehende qualifizierte Lead-/Demo-/Suppression-/Quellen- und Review-Gates laufen weiter.
2. Nur belegte review.letterFacts mit Quelle und Freigabe sind Unternehmensfakten. Ein generierter
   Demo-Text oder ein fehlendes OSM-Website-Tag ist kein Nachweis. Höchstens zwei kurze Details werden
   für den Brief ausgewählt. Preise werden auch aus solchen Details herausgefiltert.
3. Der vorhandene Service llmStructured erhält Identität, belegte Angaben, Versandfolge,
   Variantenhypothese und Lesetext des exakt gespeicherten Demo-HTML. Skripte/Styles werden entfernt;
   die Inhalte bleiben untrusted Daten. Kein neuer LLM-Anbieter oder eigene Recherchearchitektur.
4. Das Modell formuliert einen eigenständigen Zusammenhang: Welche Information könnte ein Besucher
   gerade bei diesem Angebot suchen, und warum lohnt sich ein Blick in diesen konkreten Entwurf?
   Beispiele: Photovoltaik versus Umbauinstallation; Farbangebote versus Bartpflege.
5. Struktur, Textlänge, Firmenname, tatsächlich verwendete Quellenreferenzen, Preisfreiheit,
   Pflichtbezug zum Entwurf und Werbe-/Recherchegrenzen werden deterministisch geprüft.
6. Ein separater Modellaufruf prüft Fakten, Funktionserwartungen und Sprache. Beispiel-Leistungen
   aus der Demo sind ausdrücklich keine Belege. Ein Reparaturversuch ist erlaubt; danach bleibt
   eine markierte Ersatzfassung zur manuellen Kontrolle. Budget-/Anbieterfehler werden nicht
   endlos wiederholt. Bestehende Budget-/Not-Aus-/Kostenbuchung bleibt zuständig.
7. Composer setzt unabhängig davon korrekte Anrede, recherchierte Hinweise, erlaubte Slot-Claims
   mit Fußnoten, Einordnungs-/Widerspruchstext, Absender und echte Screenshot-/QR-Zuordnung zusammen.
   Ein unsicherer alter Variantenarm wird nicht durch neuen Text verdeckt; das Wahrheitsgate blockiert ihn.
8. Der bisherige Wahrheitscheck sowie echter DOM-/PDF-/QR-Check bleiben vorgeschaltet.
   Alle neuen Qualitätsbriefe benötigen weiterhin individuelle Bewertungen; kein automatisches9,5/10.

Das Modell kann über den vorhandenen Provider automatisch schreiben, sobald dieser separat freigegeben
und konfiguriert ist. In dieser Abnahme wurde **kein echter LLM-Anbieter aufgerufen**. Im normalen
Mockbetrieb schreibt der Worker eine ausdrücklich markierte regelbasierte Ersatzfassung. Wenige Fakten
erlauben nur begrenzte Individualisierung. Eine neue Datenrecherche wurde nicht als erledigt ausgegeben.

## Was die20 Beispiele belegen

Die20 Beispieltexte sind **redaktionell vorgegebene Offline-Modellantworten (Fixtures)**. Sie laufen
durch denselben Schreib-/Referenz-/Composer-/PDF- und QR-Pfad. Auch der unabhängige Modellprüfer ist
dabei gemockt. Deshalb belegen sie Layout, Zuordnung, Textregeln und das gewünschte Sprachniveau,
aber **nicht** die tatsächliche sprachliche Qualität des externen Modells. Das wird nicht verschleiert:
engine=fixture steht im Prüfdatensatz und der Galerie.

Alle20: tatsächlich gerenderte einseitige A4-PDFs, echte Desktop-/Handy-Demoaufnahmen, proportionale
Gerätekomposition, QR41mm mit Ruhezone. QR aus dem finalen300dpi-PDF-Raster auch in Graustufen
dekodiert. Kurz- und QR-URL laufen zum richtigen lokalen Betrieb. Preise entfernt, Art.14/21 und
Datum vorhanden; die390px-Demo hat keinen horizontalen Überlauf.13 bestehende Template-IDs aus
allen fünf Gruppen wurden verwendet; das ist keine neue Abnahme aller20 Demo-Layouts.

Die Textähnlichkeit wird mit Dreiwortfolgen nach Entfernung von Firma/Ort/exakten Fakten verglichen;
gleichbleibende rechtliche Einordnung und Scan-Anleitung sind ausgenommen.190 Paarvergleiche,
keine identischen persönlichen Texte. Das ist nur eine Diagnose dieses redaktionellen Korpus,
kein Test auf menschliche Autorschaft und keine Vorhersage künftiger KI-Ausgaben oder Conversion.

## Tests und korrigierte Fehler

-90 Tests in11 relevanten Core-Suiten: Writer, Einladung, echter Briefpfad, V4-Vertrag,
  Personalisierung, Recherche, Legacy-Briefe, Qualität, Wahrheit, Abschluss-QA und Folgebriefe.
-108 Template-Tests in3 Suiten.
- Monorepo-TypeScript, ESLint und vollständiger Paket-/Next.js-/Worker-Build.
-20 vollständige PDF-/QR-/Druck-/390px-Demo-Prüfpaare; Details in pruefmatrix.md und checks.json.
- Negative Fälle: unbestätigte/veraltete Angaben, fremder Firmenkontext, erfundene Funktion
  im Modellreview, falsche/missing Faktenreferenzen, ungültiger Review, Textlänge, Preise auch
  ohne Eurozeichen, Werbeversprechen, Budget-/Providerfehler, begrenzte Reparatur und Faktenänderung.
- Vorherige PDF bleibt bei gescheiterter Regenerierung erhalten; Sperrlisten, Dubletten und
  unveränderte QR-/Bild-/Empfängerbindung weiter geprüft.
- Eine Testzustands-Kollision wurde behoben: Task2 pausierte Varianten und ließ sie für die
  Legacy-Tests pausiert. Der Test räumt seine Daten jetzt auf; keine Produktivvarianten geändert.
- Erster gestarteter Prüfbefehl verwendete versehentlich die gesamte Suite ohne installierten
  Browserpfad und wurde beendet. Er zählt nicht als Nachweis. Der gezielte korrigierte Lauf
  verwendet /usr/bin/chromium und ausschließlich die lokale Wegwerf-Testdatenbank.

## Visuelle Bewertung und verbleibende Grenzen

| Kriterium | Nachweis / Ergebnis | Grenze |
|---|---|---|
| Seriosität | Absender, unabhängiger Entwurf und spätere Kostenpflicht sichtbar; keine Erfolgszusage | Fiktive Kontaktdaten nur im Muster, Betreiber-/Rechtsfreigaben bleiben offen |
| Textqualität | Unterschiedliche Einstiege, kurze Besucherperspektive, belegte Leistung im Zusammenhang | Redaktionelle Fixtures, keine echte KI- oder Zielgruppenabnahme |
| Personalisierung | Unterschiedliche Schwerpunkte innerhalb Handwerk/Beauty/Gastro, dokumentierte verwendete Testfakten | Ohne reale verifizierte Details bleibt Basic-/Ersatzfassung |
| Design | Einseitig, Logo/blau-weiß, Geräte proportional, QR frei, Pflichtfuß lesbar | Große obere Freifläche folgt dem Brief-/Adressfenster; kein Werbeposter |
| Bild | Tatsächlich dieselbe Demo auf beiden Geräten, hochauflösende Quelle | Bei sehr langen Namen wird das Demo-Design im kleinen Gerätebild unruhiger; insbesondere Reinigungsbetrieb09 manuell prüfen |
| QR |41mm, Ruhezone,300dpi-/Graustufen-Dekodierung und lokale Zielprüfung20/20 | Kein physischer Druck-/Handykamera-Test, keine öffentlichen Versandziele |
| Kaufmotivation | Passender Anlass zum Ansehen, kostenlos/ohne Anmeldung, keine Preisdominanz | Kein Unternehmer-Nutzertest, keine gemessene Scan-/Kaufverbesserung |

Die vollständigen Druckseiten wurden in vier Kontaktbögen kontrolliert; Elektro-, PV-, Salon-,
Restaurant- und Musikbrief zusätzlich einzeln vergrößert gelesen. Visuelle Betreiberabnahme bleibt
offen; keine pauschale Bewertung mit9,5/10. Vorher/nachher zeigt zwei tatsächlich gerenderte PDFs
für denselben fiktiven Elektrobetrieb; lokale Testanschrift/Demoasset stammen aus unterschiedlichen
Prüfständen. Keine Darstellung als kontrolliertes Conversion-Experiment.

## Geänderte Zuständigkeiten im Code

- letters/personalization.ts: faktenbezogener sicherer Fallback und neue Preisfrei-Richtlinie.
- letters/writer.ts: vorhandener LLM-Service, Eingangs-/Text-/Quellenprüfung, unabhängiger Review,
  Reparaturgrenze und ausdrückliche Fallback-/Fixture-Metadaten.
- letters/compose.ts: neue Einladung, unveränderte Slot-Claims, Kontextbindung, Adresskorrektur.
- letters/conversion-v4.ts: nur neue pausierte Kandidaten preisfrei; keine DB-Armaktivierung.
- letters/binding.ts: Preisfrei-Version und überprüfte Fakten im Zuordnungsnachweis.
- render/letter.ts: tatsächliche Demo dem Writer übergeben; Metadaten/Reviewgründe im bestehenden
  Briefdatensatz, keine Migration. V4 benötigt keine Domain-Verfügbarkeitsabfrage für diesen Brief.
- render/letter-preview.ts und templates/letter.ts: kompatible Vorschau, Gerätebild/Einladung,
  Pflichtinformationen und historischer Legacy-Renderer erhalten.
- Relevante Tests sowie zwei Export-/Galerieskripte und Offline-Textfixtures.

## Vor echtem Betrieb noch erforderlich

Echte KI-Text-/Reviewqualität an autorisierten Fakten separat kostenbewusst abnehmen; reale Quellen und
Bildrechte prüfen; visuelle Einzelabnahme; freigegebene Betreiber-/Steuer-/Rechtskonfiguration;
öffentliche Demo-/Tracking-Routen und Provider-/Workerbetrieb vollständig abnehmen. Physischer
Probedruck/Scan und neutraler Nutzertest sind nicht durchgeführt. Keine Versandfreigabe aus diesem
Bericht ableiten. DRY_RUN und alle vorhandenen Versand-/Live-Zahlungs-/Domain-Sperren bleiben aktiv.
