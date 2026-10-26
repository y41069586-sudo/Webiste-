# Aufgabe 1: Demo-Design und Personalisierung

Abschlussbericht, 26.10.2026. Ausgangsstand fc2ab35 auf codex/conversion-v4.
Nur diese erste Aufgabe. Kein neues System, keine Datenbankänderung, kein Push oder Deployment.
DRY_RUN=true. Briefe, Preise, Zahlungslogik und die akzeptierte Gerätekomposition bleiben erhalten.
Die Aufnahmehilfe lädt jetzt Lazy-Bilder vor Screenshots vollständig; die Gerätegeometrie ist unverändert.

## Gefundene Schwächen

- Handwerk und Beauty verwendeten mehrfach denselben Split-Hero mit austauschbarer rechter Bild-/Adressfläche.
- Ein einzelnes Raumfoto ersetzte bei Malern Arbeits- und Materialbezug; teils fehlte passendes Bildmaterial ganz.
- Unbekannte Branchen konnten unpassende Standardleistungen erhalten, etwa Yoga für Musikunterricht oder Blumen für Buchhandel.
- Ein Ballettmotiv war allein aufgrund des Labels Tanzschule zulässig, ohne bestätigte Spezialisierung.
- Synthetische Bildmaße1000×750 passten nicht zu allen Quellen. Motivrollen/Ausschnittdaten fehlten.
- Große Iconflächen und wiederholte Adresskarten wirkten wie Baukasten-Ersatzbilder.
- Überschriften waren teilweise generisch; Standort/Tätigkeit standen nicht immer im Mittelpunkt.
- CTA-Text und tatsächliche Aktion waren teils verschieden: eine Anfragebeschriftung führte zum Telefonlink.
- Im Fragebereich zur SeitenWerk-Demo stand teilweise die Adresse des dargestellten Betriebs statt des Anbieters.
- Die Template-Auswahl nutzte bei Gleichstand geringe, kollisionsanfällige Unterschiede der ID-Länge.
- Die bestehende QA kontrollierte keine fehlenden internen Sprungziele und keine erwartete Firmenidentität im HTML.

## Tatsächlich umgesetzt

Die vorhandenen20IDs und Plakat bleiben registriert. Fünf bestehende Hero-Bereiche wurden strukturell
umgebaut: Handwerk Klar als Editorial mit Bildfolge; Solide als sachlicher Informationsbereich mit
Kontaktleiste; Werkstatt als grafischer Titel mit Bildband. Beauty Elegant erhält zentrierten Titel und
offenen Leistungsindex; Modern eine kräftige grafische Komposition. Sanft bleibt als bewusst weichere
Familie erhalten. Die Änderungen sind keine Übertragung desselben Maler-Layouts auf alle Branchen.

Im Foto-System unterscheiden sich nun auch Einzelhandel und Kurse im Aufbau. Das Geschäft erhält
Produkt-/Sortimentsbild plus Besuchsinformation; Kurse eine eigene Titel-/Aktivitätsbildfolge.
Magazin und Split behalten ihre guten Grundlagen, bekommen ruhigere Typografie/Abstände. Plakat
behält den markanten Charakter; die Desktop-Headline ist begrenzt und bildfreie Varianten verwenden
eine inhaltliche Komposition statt eines riesigen Icons.

Die vorhandene Bildbibliothek wird gezielt genutzt: Motivrolle, tatsächliche Auflösung und Fokalpunkt
sind im Manifest hinterlegt. Arbeits-/Materialmotive bekommen Vorrang vor einem weiteren generischen
Interieur. Zwei bereits vorhandene, gekennzeichnete KI-Maler-Motive wurden in die normale Entwurfsauswahl
aufgenommen; keine neue Bild-API oder Anbieterintegration. Bildquellen und Nutzungsgrundlagen bleiben
im Manifest, CC0 und generierte Beispielbilder werden unterschieden. Ballett erfordert nun eine passende
Spezialisierung. Ohne rechtmäßig passendes Motiv wird bewusst bildfrei gestaltet. Kundenfotos werden
nicht als Beispielbilder beschriftet; illustrative Fotos werden nicht als tatsächliche Betriebsräume ausgegeben.

Fallbacks für Barber, Buchhandel, Musikunterricht und Fitness wurden ergänzt; weitere bekannte Aliase
werden richtig zugeordnet. Unbekannte Tätigkeiten erhalten neutrale Angebots-/Kontaktinformationen.
Headlines nennen bekannte Tätigkeit und Ort. Der LLM-Prompt untersagt zusätzlich das Ableiten von
Spezialisierungen aus Firmennamen und das Behaupten einer fehlenden Website allein aus einem Social-Link.
Keine erfundenen Mitarbeiter, Zertifikate, Angebote, Erfahrungen oder Bewertungen.

Demo-CTAs führen als „Kontakt ansehen“ zum tatsächlichen Kontakt-/Standortbereich; echte Telefonlinks
bleiben ausdrücklich als solche erkennbar. Das gesonderte Fragenformular bleibt an SeitenWerk gerichtet
und zeigt dessen Anschrift. Eine Anfrage wird nicht als bestätigte Buchung dargestellt. Gastro-Demos zeigen
Angebotskategorien ohne wiederholte erfundene Gericht-/Preiszeilen. Ein Standort wird nicht als bestätigtes
Einzugsgebiet ausgegeben.

Die Auswahl bleibt deterministisch und berücksichtigt die vorhandene Auslastung. Ein vollständiger Hash
pro Betrieb/Vorlage ersetzt die ID-Längen-Kollisionen; keine zufällige Neuordnung bei jedem Aufruf.

## Nachweise und Qualitätskontrolle

Die Galerie verwendet dieselben20 ausdrücklich fiktiven Betriebe vor und nach der Änderung. Vorher:
1440 und390px; nachher:1440/360/390/430px, zusätzlich lange Firmen-/Überschriften und fehlende Bilder.
Die HTML-Dateien stammen aus den vorhandenen Renderern und dem vorhandenen Content-Fallback.
Es sind keine frei erfundenen Website-Bilder. Zusätzliche Generator-Integration verwendet Mock-LLM
und erzwingt auch einen Fallback nach ungültiger Modellausgabe. Kein echter Anthropic-Aufruf wurde geprüft.

Erweiterte QA: genau eine Hauptüberschrift, vorhandene interne Linkziele und erwartete Firmen-/Ortsangaben.
Bild-, Axe-, Konsole- und Layoutkontrollen bleiben erhalten. Der bestehende manuelle Qualitätsreview und
insbesondere die ersten30Demos bleiben gesperrt, bis sie tatsächlich geprüft wurden. Technische Checks
setzen keine künstliche gestalterische Punktzahl und erteilen keine Versandfreigabe.

Ein Integrationstest fand eine echte Regression: Lazy-Bilder konnten die Screenshot-Aufnahme blockieren.
Die Aufnahme-/Prüfumgebung aktiviert sie vor dem Dekodieren; das ausgelieferte HTML behält Lazy Loading.
Ein eigener zeitbegrenzter Regressionstest und der bestehende Zehn-Demo-Generatorlauf prüfen diesen Fall.

## Abschließend ausgeführte Tests

| Prüfung am endgültigen Quellstand | Ergebnis |
| --- | --- |
| Template-Unit-Tests und Design-Review-Tests | 102/102 bestanden |
| Core: templates-a11y, v5-demo-quality, demo-pipeline, task1-design, demo-content, demo-quality-score | 151/151 bestanden |
| Darin: alle registrierten Templates/Paletten mit vollen und minimalen Daten | 127 Fälle bestanden |
| Darin: bestehender Zehn-Demo-Generatorlauf, inklusive ungültiger LLM-Ausgabe/Fallback | bestanden, nur lokale Mock-Provider |
| 20 fiktive Demo-Profile: HTML, Struktur, interne Ziele, Bilder, Konsole, Axe, Layout; Normal-/Langtext-/Ohne-Bild-Zustände | 560/560 bestanden |
| Geometrie und Bilder bei 1440/360/390/430 px, zusätzlich langer Name/Headline bei 360 px | kein horizontaler Überlauf, keine defekten Bilder in den geprüften Normalzuständen |
| TypeScript, ESLint, kompletter regulärer Projektbuild inkl. Web und Worker | bestanden |

Der Build meldet weiterhin sieben Warnungen über dynamische Dateisystemzugriffe/umfangreiches
Turbopack-Tracing (unter anderem bestehende Claims-/Vorlagen-/Bildbibliotheken). Das ist kein
fehlerfreier Deployment-Nachweis; hier erfolgte kein Deployment. Die ausführlichen lokalen Laufprotokolle
liegen unter `/tmp/task1-final-*.log`; kompakte dauerhaft versionierte Nachweise in [evidence](evidence/).

Die QA-Fehlertests prüfen gezielt falsche Firmenidentität und fehlende interne Ziele. Sie ersetzen
keinen semantischen Faktencheck sämtlicher Texte. Getestet wurde eine isolierte lokale PostgreSQL-
Testdatenbank, niemals Supabase. Keine neuen Finanz-/Migrations-/Providerabnahmen für diese Aufgabe.

Mobile Lighthouse-Labormessung vor/nachher auf fünf repräsentativen Seiten:

| Vorlage | Performance vorher → nachher | Accessibility | Best Practices | SEO nachher |
| --- | --- | --- | --- | --- |
| handwerk-klar | 98 → 99 | 100 | 100 | 66 |
| beauty-elegant | 100 → 100 | 100 | 100 | 63 |
| gastronomie-foto | 97 → 97 | 100 | 100 | 66 |
| einzelhandel-magazin | 99 → 99 | 100 | 100 | 66 |
| kurse-split | 98 → 98 | 100 | 100 | 66 |

Die absichtliche Nichtindexierung von Demos bleibt bestehen und senkt den SEO-Wert. Der gespeicherte
allgemeine `score` ist der kleinste Kategorie-Wert, **nicht** die Performance. Maßgeblich sind die
einzelnen Kategorien in [performance.json](evidence/performance.json). Einzelne lokale Labormessungen
sind weder statistischer Leistungsnachweis noch eine Garantie für öffentliche Infrastruktur.

## Sichtprüfung und zugängliche Ergebnisse

[Qualitätsmatrix aller 20 Vorlagen](qualitaetsmatrix.md),
[Desktop-Übersicht nachher](evidence/after-desktop-uebersicht.webp),
[Mobil-Übersicht nachher](evidence/after-mobil-uebersicht.webp).
Alle 20 wurden als Desktop-/Mobilübersicht verglichen, ausgewählte komplette Seiten zusätzlich
angesehen. Die Matrix benennt diesen Prüfumfang und die Grenzen ausdrücklich; keine vollständige
manuelle Detailabnahme aller 120 Nachher-Aufnahmen wird behauptet.

Die vollständige [lokale Vergleichsgalerie](../../data/exports/task1-design/galerie/index.html)
enthält pro Vorlage Vorher/Nachher in 1440 und 390 px, weitere 360-/430-px-Aufnahmen, lange Texte,
bildfreie Varianten und tatsächliches HTML mit eingebetteten Bildern. Insgesamt 40 Vorher- und
120 Nachher-Screenshots. [ZIP-Export](../../data/exports/task1-design/seitenwerk-aufgabe1-galerie.zip):
entpacken und `index.html` öffnen. Der Export ist ein isolierter Test mit Testabsender; Kauf-,
Formular- und Trackinglinks sind keine öffentlich erreichbare Provider-Integration.

Wiederholbare sichere Ausführung: Templates bauen; `scripts/task1-design-review.mts --after`
mit dem vorhandenen TSX-Runner und lokalem Chromium ausführen, anschließend
`node scripts/export-task1-design.mjs`. `--before` **nicht erneut** mit verändertem Code ausführen:
die erhaltene Baseline stammt tatsächlich aus dem Ausgangsstand. Datenbanktests stets separat und
nacheinander gegen die lokale Wegwerf-Datenbank ausführen; deren Setup löscht und erstellt sie neu.

## Bestehende Grenzen

- Individualisierung nutzt nur tatsächlich verfügbare Fakten. Recherchierte Spezialisierungen, Kundenbranding
  und freigegebene Betriebsbilder fehlen in vielen Datensätzen. Sie werden nicht erfunden.
- Elektrik, Kosmetik, Nägel, allgemeiner Tanz und Musik haben teilweise weiterhin keine geeigneten
  lizenzierten Motive. Die bildfreien Lösungen sind ehrlicher, aber nicht gleichwertig mit guten Kundenfotos.
- Die öffentliche Firmenwebsite, Briefpersonalisierung, Checkout-Backend und weitere vier Betreiberaufgaben
  wurden in dieser ersten Aufgabe nicht bearbeitet.
- Labormessung und Chromium-Emulation sind keine Felddaten, Safari-/iPhone-Hardwareprüfung oder Kundenstudie.
- Die vollständigen Demo-Seiten bleiben durch vorhandene Beispiel-, Fragen- und Angebotsbereiche lang.
  Hero-/Branchenstrukturen sind individueller, aber einige untere Bereiche weiterhin gemeinsam.
  Dieses Paket behauptet deshalb kein vollständig einzigartiges individuelles Agenturprojekt pro Datensatz.
- Keine pauschale9/10- oder10/10-Bewertung, keine gemessene Verkaufssteigerung. Die gestalterische
  Betreiberabnahme und die individuelle Prüfung jeder späteren Kampagnen-Demo bleiben erforderlich.
