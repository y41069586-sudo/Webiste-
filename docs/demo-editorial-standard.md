# Generatorstandard: seitenwerk-editorial-1

Auftrag vom 04.11.2026. Ausgangspunkt: Claude-Branch `claude/website-brief-maschine-0d0s37`, `8b10675`.
Die eigenständigen Studien Kalk & Kante / Osteria Sera dienen als gestalterische Messlatte. Dieser Stand
verbessert die vorhandene echte Erzeugungskette; kein neuer Dienst und keine weitere KI-Plattform.

## Was neue Generierungen bekommen

- `kits/editorial.ts`: deterministischer Gestaltungs-/Redaktionsplan je Gewerk und belegtem Angebot.
  Keine beliebig generierten Komponenten, kein ausführbarer Modellcode, kein zusätzlicher KI-Aufruf.
- `demos/content.ts`: derselbe Standard im tatsächlichen Creative-Prompt. Widersprüchliche Pflichtzahl
  von FAQ/Über-uns-Absätzen entfernt; auch der sichere Fallback lässt doppelte Über-uns-/FAQ-Texte weg.
- `designBrief`: speichert Standard, Besucheraufgabe, Bildauftrag und Komposition in den bestehenden
  Metadaten. Die vorhandene Admin-Anzeige erhält diese Angaben über `proposals`. Modelltext ist kein
  eigenständiger Faktenbeleg; Umfang nach bestätigten Leistungen/eigenen Bildern.
- Renderer: belegte Leistungsschwerpunkte im Einstieg, kurze Betriebsnavigation, nummerierte
  Leistungslisten, keine leeren Porträt-/Projektkästen. Fehlendes aufklappbar für die Einrichtung.
- Maler: Panorama bei belegter Innenraum-/Wand-/Tapeziertätigkeit mit verfügbarem Bild; sonst eigener
  Werkstattaufbau. Kein Bild → vorhandene typografische Variante. Lizenzierter Innenraum ergänzt die
  Bildbibliothek nur für passende belegte Innenraumbegriffe. Symbolbild bleibt sichtbar gekennzeichnet.
- Gastronomie: Masthead, Bild und farbiger Einladungsbereich, mobil Karte und Tischanfrage vor dem Foto.
  Keine erfundenen Gerichte/Preise. Andere Kits behalten ihre eigenständige Branchenkomposition und
  erhalten die gemeinsamen Verbesserungen. Einzelhandel/Kurse bleiben bei den bestehenden Vorlagen;
  die verbesserten Textregeln gelten auch dort.
- `visual-review.ts`: Desktop- und Mobilstartansichten des gespeicherten HTML gehen in den vorhandenen
  budgetierten Kit-QA-Aufruf, nicht in eine zweite KI-Runde. Anbieter zählt Bildtokens vor Reservierung.
  Modelle und Wochenbudgets bleiben unverändert. Keine echten KI-Aufrufe bei der lokalen Prüfung.
- Visuelle Befunde nennen einen konkreten Fehler, keine selbst erfundene Qualitätsnote. Hohe visuelle
  Befunde lösen keine automatische Text-Neugenerierung aus. Die bestehende Betreiberfreigabe bleibt.

## Geschützter Bestand

Kauf-/Angebotsleiste, Preise, echter Formularrenderer, Zahlungs-/Versandlogik und Freigabeschalter
unverändert. Gegen `8b10675` wurden sechs Kits in Demo- und Live-Modus gerendert: alle Kaufleisten,
Angebote und Formulare identisch bei gleicher Testzeit. Der Kontakt-Renderer-Quellabschnitt ist ebenfalls
bytegleich. Keine Datenbankverbindung, Freigabe, Demo-Neuerstellung in Produktion, Migration,
Serveraktualisierung, E-Mail, Brief, Zahlung oder Domainaktion ausgelöst. Elektro Reiche/Pintura Bau
bleiben unverändert; bereits gespeichertes HTML ändert sich durch den Code nicht automatisch.

## Verifikation

- TypeScript: Templates und Core.
- ESLint: geänderte TypeScript-Bereiche.
- Template-Suite: 153 Tests, einschließlich Lizenz-/Dateigröße, Live-/Demo-Trennung und Schutzregeln.
- Isolierte Core-Tests: Demo-Inhalt und neuer Redaktions-/Bildprüfauftrag; ohne DB-Setup/Reset.
- Zwölf fiktive Referenzfälle × 320/390/768/1440 px: 48 Prüfungen. Alle Betriebsinhalte ohne
  horizontalen Überlauf, genau eine Hauptüberschrift, Bilder geladen, keine leeren Fotoplatzhalter.
- axe WCAG2 A/AA + WCAG2.1 AA in zwölf Fällen auf Desktop und Mobil: keine gemeldeten Verstöße.
- Screenshots ausgewählter kompletter Seiten und Startansichten lokal geprüft. Kein Beleg einer
  vollständigen Barrierefreiheit oder einer gemessenen Conversion. Keine Lighthouse-Neumessung;
  die bestehende Produktions-QA und ihre unveränderte Leistungsgrenze bleiben verbindlich.
- Protokolle: `demo-editorial-qa/browser-results.json` und `protected-markup.json`.

Bei schmalen Geräten meldet `chromeOverflow` teilweise einen bereits vorhandenen Überlauf der
SeitenWerk-Kaufleiste. Er ist von `overflow` der Betriebsinhalte getrennt dokumentiert. Die Kaufleiste
wurde entsprechend der ausdrücklichen Auftragsgrenze nicht angefasst. Das ist kein fehlerfreier
Gesamtstrecken-Nachweis.

## Veröffentlichung / Server

Entwicklungsbranch `codex/demo-art-direction`. Lokaler Code und GitHub-Sicherung aktivieren den
Produktionsworker nicht. Web-App und VPS müssen nach Freigabe denselben Quellstand erhalten;
bestehende Live-/Budget-/Freigabeeinstellungen dabei erhalten. Die zwei bestehenden Demos nicht
automatisch neu bauen oder freigeben. Neue Demos weiterhin einzeln auf der ganzen Seite prüfen.

Die statischen öffentlichen Beispiel-Dateien sind gespeicherte Momentaufnahmen; die lokalen
Referenzfälle wurden mit dem echten Renderer neu erzeugt, die öffentliche Galerie wurde in diesem
Auftrag nicht veröffentlicht. Reproduzierbar ohne KI: `node --import tsx
packages/core/scripts/render-reference-demos.ts <isolierter Ausgabeordner>` (tsx aus Core verfügbar).
