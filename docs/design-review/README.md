# Drei Maler-Konzepte – erste gestalterische Zwischenabnahme

**Nicht gestalterisch freigegeben. Keine Übertragung auf andere Branchen.**
26.10.2026, Ausgangsstand `ea8ba3d`. DRY_RUN=true, keine Produktionsänderung, keine realen Zahlungen,
Briefe oder Domainkäufe. Alle Geschäfts-, Kontakt- und Leistungsangaben sind ein ausdrücklich fiktiver
Testdatensatz. Die beiden neuen Motive sind KI-Beispiele, keine Mitarbeiter oder Referenzen eines Betriebs.

## Entwürfe zum Ansehen

Alle drei Entwürfe verwenden dieselben Fakten, dieselbe Palette und dieselben Texte.

| Konzept / bestehende ID            | Vollständiger Desktop                               | Vollständig mobil390px                           | Brief-PDF                                    | Druckansicht aus PDF                            |
| ---------------------------------- | --------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- | ----------------------------------------------- |
| Premium Editorial / handwerk-klar  | [Desktop](evidence/handwerk-klar-desktop.webp)      | [Mobil](evidence/handwerk-klar-mobile.webp)      | [PDF](evidence/handwerk-klar-brief.pdf)      | [Druck](evidence/handwerk-klar-druck.webp)      |
| Modern Business / handwerk-solid   | [Desktop](evidence/handwerk-solid-desktop.webp)     | [Mobil](evidence/handwerk-solid-mobile.webp)     | [PDF](evidence/handwerk-solid-brief.pdf)     | [Druck](evidence/handwerk-solid-druck.webp)     |
| Bold Creative / handwerk-werkstatt | [Desktop](evidence/handwerk-werkstatt-desktop.webp) | [Mobil](evidence/handwerk-werkstatt-mobile.webp) | [PDF](evidence/handwerk-werkstatt-brief.pdf) | [Druck](evidence/handwerk-werkstatt-druck.webp) |

[Hero-Vergleich](evidence/konzepte.webp) · [Graustufenvergleich](evidence/graustufen.webp).
Vollständige HTML-Dateien unter `evidence/<template-id>.html` sind lokale, eigenständige Renderartefakte.
Keine öffentlich veröffentlichten Websites. Die QR-Codes wurden während des Tests gegen einen lokalen
HTTP-Testserver dekodiert und weitergeleitet. **Sie sind keine öffentlich erreichbaren Briefziele.**
Die Kaufziele verweisen ausschließlich auf lokale Testadressen; diese HTML-Dateien allein sind kein
betriebsbereiter Checkout. Keine Live-Zieladresse oder echte Zahlung wird daraus abgeleitet.

### Vorher / Nachher und weitere Größen

Die Dateien `<template-id>-vorher-desktop.webp` und `-vorher-mobile.webp` zeigen den Ausgangsrenderer
mit identischen neuen Testdaten. Damit werden Struktur und nicht unterschiedliche Firmen verglichen.
Zusätzlich liegen je Konzept `-mobile-360.webp`, `-mobile-430.webp` und `-angebot.webp` vor.
Desktop1440×900; Mobil360×800,390×844 und430×932, jeweils ganzseitige Aufnahmen.
Einzelne Hero-Details liegen als `<template-id>-hero.jpg` vor. Angebotsdetails blenden nur für die
Detailaufnahme die klebende Werkzeugleiste aus; die vollständigen Screenshots enthalten die echte UI.
Die Druckansichten wurden mit pdftoppm aus den **fertigenPDFs** gerastert, keine Bild-Mockups.

| Konzept   | Vorher Desktop                                            | Vorher Mobil                                                   | Hero-Detail                                  | Angebotsdetail                                      |
| --------- | --------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| Editorial | [Vorher](evidence/handwerk-klar-vorher-desktop.webp)      | [Mobil vorher](evidence/handwerk-klar-vorher-mobile.webp)      | [Hero](evidence/handwerk-klar-hero.jpg)      | [Angebot](evidence/handwerk-klar-angebot.webp)      |
| Business  | [Vorher](evidence/handwerk-solid-vorher-desktop.webp)     | [Mobil vorher](evidence/handwerk-solid-vorher-mobile.webp)     | [Hero](evidence/handwerk-solid-hero.jpg)     | [Angebot](evidence/handwerk-solid-angebot.webp)     |
| Creative  | [Vorher](evidence/handwerk-werkstatt-vorher-desktop.webp) | [Mobil vorher](evidence/handwerk-werkstatt-vorher-mobile.webp) | [Hero](evidence/handwerk-werkstatt-hero.jpg) | [Angebot](evidence/handwerk-werkstatt-angebot.webp) |

## Was sichtbar anders ist

- **Editorial:** Serifenschrift, übergreifende Titelzeile, versetzte Werkzeug-/Raumbilder und offene
  nummerierte Leistungszeilen. Kein linker Textblock neben einem einzigen rechten Bild.
- **Business:** große fotografische Bühne mit blickdichter Informationsfläche, anschließendes
  Leistungskatalog-Raster, Fragen vor dem gebündelten Standort-/Kontaktbereich. Mobil steht der Text
  vor dem Arbeitsmotiv; die Leistungsbereiche werden einzeln und ohne überlappende Nummern gezeigt.
- **Creative:** kräftige Typografie, horizontale Material-/Ergebnis-/Arbeitskomposition und abwechselnde
  Leistungsbänder. Auf Mobilgeräten verdichtet sich die Bildkomposition auf zwei Motive.

Die Konzepte bleiben ohne unterschiedliche Farben unterscheidbar. Gemeinsame technische Bausteine
sind absichtlich erhalten. Die SeitenWerk-Tarife gehören zur separaten Anbieterzone nach dem Betriebsentwurf.
Das Frageformular erscheint erst über „Fragen“ und ist ausdrücklich an SeitenWerk gerichtet. Die
Kontakt-CTA des Betriebs scrollt zu dessen Kontaktdaten, nicht in ein falsch adressiertes Formular.

## Prüfung der zehn Schwachstellen

| Problem                | Ergebnis / Änderung / Nachweis                                                                                                                                                                                                                     | Verbleibende Grenze und plausible Wirkung                                                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Generische Demos     | Drei unterschiedliche Hero- und Leistungsstrukturen; vollständige Screenshots, Graustufen und Browser-QA.                                                                                                                                          | Der gemeinsame Betreiberbereich bleibt gleich. Business verwendet bewusst einen sachlichen Katalog, dessen Wirkung du noch beurteilen musst. Unterschiede erleichtern die Wahl; keine gemessene Verkaufswirkung.                                           |
| 2 Bildsprache          | Werkzeuge, Farbmuster und anonyme Arbeitssituation ergänzen das Raumbeispiel. Je Konzept festgelegte Komposition, sichtbare KI-Kennzeichnung, überprüfte mobile Ausschnitte.                                                                       | Keine echten Betriebsbilder. Die Arbeitssituation ist kein Nachweis realer Leistungen. Bildbezug ist klarer, Authentizität realer Kundenfotos bleibt unerreicht.                                                                                           |
| 3 Briefe               | Persönlicher Betreff/Empfänger, kurzer Branchennutzen, unbeschnittener Hero,41mmQR und eigene Preiszeile. PDF-Geometrie und QR aus dem PDF geprüft; Druckbilder liegen bei.                                                                        | Kein physischer Papier-/Fensterumschlagtest. Lokale QR-Ziele sind nach Testende nicht öffentlich abrufbar. Das Angebot ist leichter zu scannen; keine Scanquoten gemessen.                                                                                 |
| 4 Kaufhürde597€        | Setup, Basis und Care+ im Brief getrennt; zentrale V4-Preise. Anbieterzone erklärt Bestellung, Inhalte, Freigabe, Go-Live und Grenzen zusätzlicher Arbeiten. Care+ enthält Basis.                                                                  | Domainumfang, Support und Vertrag brauchen reale Betreiber-/Rechtsfreigabe. Das verbessert das Verständnis, beweist aber keine höhere Kaufbereitschaft.                                                                                                    |
| 5 Firmendaten          | Fiktive Angaben eindeutig bezeichnet; Anbieteranschrift im Fragebereich stammt vom Anbieter statt vom dargestellten Malerbetrieb. Test verhindert diese Verwechslung. Standard-/Live-Renderer werden nicht umgestellt.                             | Keine Änderung oder Abnahme tatsächlicher Produktionskonfiguration. Globale Identitätsprüfung bis Rechnung/echterE-Mail bleibt vor Livebetrieb nötig. Richtige Zuordnung vermindert potenzielles Misstrauen.                                               |
| 6 Kaufprozess          | Demo zuerst, danach klarer Anbieterbereich. „Website-Angebot ansehen“ bezeichnet den tatsächlichen Sprung; Kontakt und Anbieterfrage sind getrennt. Bestehende Tarife/Checkout-Schnittstellen bleiben erhalten.                                    | Lokale Gestaltungs-/Bedienprüfung; kein neuer tatsächlicher Stripe-Sandbox-End-to-End-Lauf. HTML-Prototypen haben keinen eigenständigen Bezahlserver.                                                                                                      |
| 7 Mobile Firmenwebsite | Die personalisierte Demo wurde für360/390/430px geprüft, das lange Frageformular aus der Erstansicht genommen. Anbieterinformationen bleiben per bewusster Rückfrage erreichbar.                                                                   | Die allgemeine Marketingwebsite wurde nicht ausgerollt/redesignt. Ihre spätere Kürzung und Beispielauswahl folgen erst nach Zwischenabnahme; keine versteckte Branchenübertragung.                                                                         |
| 8 Fehlende Referenzen  | Keine Sterne, Kundenlogos, Kundenzahlen oder fingierten Erfolgsgeschichten. Beispiele und Anbieterrolle klar bezeichnet.                                                                                                                           | Reales Kundenvertrauen ist noch nicht nachgewiesen. Gestaltung und Transparenz ersetzen keine echte Referenz, sollen aber nachvollziehbare Orientierung geben.                                                                                             |
| 9 Leadqualität         | Bestehenden0–100-Score und Nachweise geprüft; Finder/Gewichte unverändert, keine echte Suche. Fehlende Website-Tags sind weiter kein Nachweis.                                                                                                     | Vollständige Anschrift ist keine bestätigte Anschrift; Unabhängigkeit und verfügbare Inhalte sind nicht vollständig als gesonderte Nachweise modelliert. Manuelle Prüfung bleibt nötig. Keine erfundenen Kaufwahrscheinlichkeiten.                         |
| 10 Conversion-Messung  | Bestehende Ereignis-/Finanzpfade geprüft. Konkrete Restfehler dokumentiert: coalesce von bestätigter/geschätzter Zustellung, scanbasierte Zustellmarkierung und unzureichende Trennung allerTest-/Kontrollereignisse in der operativenGesamtsicht. | **Nicht durch dieses Designpaket behoben, Kampagnenblocker.** Keine reale Quote behauptet. „ErreichteLeads“ sind keine eindeutigen Personen.2% ist nur Ziel. Vor Kampagne diese Datenkorrekturen und Herkunftsnachweise im vorhandenen Funnel abschließen. |

**Für alle zehn Punkte gilt:** keine Validierung durch echte angeschriebene Unternehmen oder echte Käufe.
Keine statistisch belegte Conversion-Steigerung. Die Zwischenabnahme betrifft Gestaltung und Kaufverständnis,
nicht Recht, Providerbetrieb oder Kampagnenfreigabe.

## Tests und eigene kritische Prüfung

- Vorlage standardmäßig unverändert; Designprüfung nur intern opt-in und nur Maler/demo/screenshot.
  Live und andere Branchen werden bei gesetztem Prüfparameter abgewiesen. Neue reviewOnly-Bilder
  tauchen in normaler Bildrotation nicht auf. Plakat und alle20IDs erhalten.
- Drei vollständige Entwürfe bei1440/360/390/430px. Technische Browser-QA einschließlich Konsole,
  HTML-/Bild-/Kontrast-/Layoutprüfung in Desktop und Mobil, zusätzlich geöffnetes Frageformular.
- Jeder Brief einseitig, gültige Anschriftzone und Freiräume; QR41mm aus fertigemPDF dekodiert.
  Lokaler Redirect öffnet das zum Konzept gehörendeHTML, keine öffentliche Providerabnahme.
- Neu gefundene Fehler behoben: unsichtbare Kaufbutton-Beschriftung durch zu breiteCSS-Regel,
  überlappende Leistungsnummern, zu tiefer Briefinhalt und falsche Anbieteranschrift im Fragebereich.
- Vorher/Nachher-Lighthouse unter identischer lokaler Methode. Details in `evidence/checks.json`;
  niedriger SEO-Wert bei bewusstemnoindex ist keine Performancezahl. Keine Felddaten/INP-Aussage.
- TypeScript, Lint,100Template-Tests und45relevanteCore-Tests bestanden. Lokaler Produktionsbuild
  bestanden. Core-Lauf umfasst Brief/Wahrheitscheck, Demo-Pipeline, gehosteteCheckout-Schnittstelle
  mitMocks und V4-Verträge. Kein tatsächlicher Stripe-Testzahlungslauf ausgeführt.
  Der Build meldet sieben Warnungen zum dynamischen Dateizugriff/Tracing (Claims, Playbooks, Template-CSS/Bilder).
  Das ist kein Build-Abbruch; Größe und Inhalt des späteren Provider-Bundles sind damit noch nicht abgenommen.

Reproduzierbar mit `scripts/review-maler-redesign.mts`, externes Render-Netz gesperrt,
HTTP-Zuordnung ausschließlichLoopback. Alle DB-Tests nur gegen die ausdrücklich lokale Testdatenbank.
Die bisherige vollständige Browser-/V4/V5-Abnahme wird hier nicht als neue Durchführung behauptet;
die umfassende Schlussregression folgt nach der genehmigten Branchenübertragung.

### Mobile Labormessung (Lighthouse, 390 × 844)

| Konzept   | Performance vorher | Performance nachher | Accessibility nachher | Best Practices nachher |
| --------- | -----------------: | ------------------: | --------------------: | ---------------------: |
| Editorial |                 98 |                 100 |                   100 |                    100 |
| Business  |                 98 |                 100 |                   100 |                    100 |
| Creative  |                 98 |                  99 |                   100 |                    100 |

Ein synthetischer Lauf je Stand, keine belastbare Messung einer Geschwindigkeitssteigerung oder realer
Core Web Vitals. SEO 66 bei allen Entwürfen: bewusstes noindex und lokale Prüfziele; kein öffentliches
SEO-Abnahmeziel für diese Demos. Maßgeblich sind die Kategorien in `checks.json`, nicht dessen
zusammenfassendes `score`-Feld (das Minimum aller Kategorien).

### Reproduktion und Testnachweis

Vom Repository-Root mit pnpm 10.28.0 und installiertem Chromium:

1. `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium DRY_RUN=true packages/core/node_modules/.bin/tsx scripts/review-maler-redesign.mts`
2. Für jede der drei IDs: `pdftoppm -f 1 -singlefile -r 120 -png data/exports/maler-design-review/<id>-brief.pdf data/exports/maler-design-review/<id>-druck`
3. `node scripts/export-maler-review.mjs`

Kurzer tatsächlicher Abschlussnachweis: [verification.txt](evidence/verification.txt). Der Renderer benötigt
keine Datenbank. Die genannten Core-Tests dürfen ausschließlich gegen eine entbehrliche lokale
Testdatenbank laufen, weil das globale Setup die Ziel-Datenbank neu erstellt.

### Selbstkritische Grenzen

Die Bildwelt ist passender, aber weiterhin illustriert. Die Texte sind ein bewusst begrenzter fiktiver
Leistungskatalog, keine automatische Recherche realer Spezialisierungen. Der gemeinsame SeitenWerk-
Angebotsbereich bleibt sachlich und relativ umfangreich. Im gedruckten Screenshot ist der Hero erkennbar,
kleine Navigation jedoch nicht zum Lesen gedacht. Reale Druckwirkung und Kundenverständnis sind offen.
Keine pauschalePremium-/9von10-Abnahme durch technische Tests.

## Verbindlicher Stopp

**Andere Branchen und die allgemeine Firmenwebsite werden erst nach ausdrücklicher gestalterischer
Zwischenabnahme umgesetzt.** DRY_RUN bleibt an. Der nächste Schritt ist deine Rückmeldung zu den
sichtbaren Konzepten; eine Auswahl ist keine Freigabe für Veröffentlichung, Zahlung oder Versand.
