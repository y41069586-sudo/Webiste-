# Premium-Fortsetzung: nachweisbarer Zwischenstand, keine Gesamtfreigabe

26.10.2026. Ausgangscommit c7f3f2b, Branch codex/conversion-v4. Nur lokal, kein Push/Deployment,
keine Produktionsmigration, keine Anbieteraufträge oder echten Kontakte. DRY_RUN=true.

## Geräte und Galerie

Der aktuelle Betreiberhinweis verlangt kompakte Geräte wie im vorgelegten Musterbrief. Der vorhandene
Compositor zeichnet jetzt einen Laptop mit 16:10-Display und ein Smartphone im Verhältnis 390:844.
Die mobile Aufnahme steht rechts leicht vor dem Laptop. Beide Displays stammen aus demselben gespeicherten
Demo-HTML. Keine erfundenen Bildschirmtexte, keine KI-Gerätebilder. Die eigenen Geräteillustrationen sind
keine Produktfotografien. Minimal, Editorial und Studio sind separat gerendert; sie sind nicht drei neue Websites.

Die drei vorhandenen Maler-Konzepte bleiben isoliert. Galerie und ZIP enthalten vollständige Desktop-/
Mobilaufnahmen, Hero, Leistungen, Kontakt, Anbieterangebot, Gerätevarianten/Einzelansichten, PDFs und
Vorher/Nachher. PDF-Druckbilder der drei Malerbriefe liegen zusätzlich mit 300 dpi vor. Firmenname als
Lesebeschriftung über den Geräten; kleine Navigation im Druck bleibt nicht vollständig lesbar.
Der geometrische Fallback schaltet bei zu kleiner Druckfläche/fehlendem Namen auf klare Ansichten.
Das ist eine technische Untergrenze, kein automatischer Nachweis menschlicher Lesbarkeit.

## 15 fiktive Profile und Personalisierung

15 ausdrücklich fiktive Profile über fünf Branchen wurden mit bestehenden Templates gerendert. Keine
Übertragung der neuen Maler-Stile. Briefe und Demo verwenden dieselben vorgegebenen Leistungsdetails.
Der neue deterministische Helfer akzeptiert nur als verifiziert markierte Details mit Quellenreferenz.
Die Referenzen hier sind Test-Fixtures, keine externe Firmenrecherche. Ausgabe wird nicht als menschlich
verfasst bezeichnet. 15 einseitige PDFs, Anschrift-/Abstandskontrolle und QR aus fertigem PDF bestanden.
Alle QR-Adressen sind lokal: nach dem Test kein öffentliches Briefziel und kein Zustellnachweis.

**Personalisierung noch nicht vollständig bestanden:** Jaccard-Wortmengenvergleich der vollständigen
Einleitungen ergibt 0,42–0,84, Mittel 0,57. Pflicht-/Entwurfshinweise sind darin enthalten. Einige Texte
bleiben zu ähnlich und sprachlich zu schematisch. Die 15 Renderings sind Nachweise und Prüfmaterial,
keine freigegebene Kampagne. Nächster Schritt: insbesondere ähnliche Paare in checks.json konkret
überarbeiten, Faktenbezug erhalten und erneut prüfen. Der Helfer ist noch kein aktivierter Recherche-/LLM-Pfad.
Fünf vollständige Druckansichten stehen in fuenf-briefe.jpg nebeneinander.

## Die zehn ursprünglichen Probleme

| Problem              | Tatsächliche Änderung / Nachweis                                                                                                                                                                                                                                                                                                                                                                                   | Reststatus                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generische Demos     | Drei strukturelle Maler-Prototypen bleiben erhalten; vollständige Galerie.                                                                                                                                                                                                                                                                                                                                         | Gestalterische Entscheidung ausstehend. Andere Branchen nicht umgestaltet.                                                                                                                                                                                                                    |
| Bilder               | Bestehende korrekt gekennzeichnete Motive erhalten; Geräte zeigen echte Rendereraufnahmen.                                                                                                                                                                                                                                                                                                                         | Keine tatsächlichen Betriebsfotos, keine pauschale Bildqualitätsfreigabe.                                                                                                                                                                                                                     |
| Brieftexte           | Quellengebundener Personalisierungshelfer, 15 Profile, 15 PDF-/QR-Prüfungen, Ähnlichkeitsmessung.                                                                                                                                                                                                                                                                                                                  | Einige Texte zu ähnlich; kein vollständiger Abschluss.                                                                                                                                                                                                                                        |
| Kaufhürde            | Ruhigere Preiszeile mit 597/19/99; Care+ insgesamt, Monatsbeginn Go-Live. Bestehender Checkout erhalten.                                                                                                                                                                                                                                                                                                           | Domain-/Support-/Vertragsumfang und steuerliche Angaben fachlich bestätigen.                                                                                                                                                                                                                  |
| Anbieteridentität    | Galerie verwendet ausschließlich ausdrücklich fiktive Testabsender. Keine echten Kontaktdaten ins öffentliche Git übertragen.                                                                                                                                                                                                                                                                                      | Vollständige produktive Identitätsabnahme über beide Bereitstellungen weiterhin erforderlich.                                                                                                                                                                                                 |
| Kaufstrecke          | Zahlungsmodus am Checkout persistiert; Mock-/Sandbox-/unbekannte Zahlungen aus Realumsatz getrennt. Core-Regressionsfälle für Checkout/Onboarding bestehen im großen Lauf.                                                                                                                                                                                                                                         | Kein tatsächlicher Stripe-Sandbox-Provider-End-to-End-Test in diesem Paket.                                                                                                                                                                                                                   |
| Mobile Firmenwebsite | Keine neue Gestaltung ohne Zwischenabnahme vorgenommen.                                                                                                                                                                                                                                                                                                                                                            | Gezielte Kürzung und aktueller Vorher/Nachher-Nachweis noch offen; kein Produktionsupdate.                                                                                                                                                                                                    |
| Referenzen           | Keine Bewertungen, Kundenprojekte oder Erfolge erfunden. Geräte zeigen fiktive Muster.                                                                                                                                                                                                                                                                                                                             | Echte unabhängige Nutzertests nicht durchgeführt.                                                                                                                                                                                                                                             |
| Lead-Auswahl         | Vollständige Anschrift zählt nicht mehr als geprüfte Anschrift; gute Eignung verlangt zusätzlich unabhängigen Betrieb als Nachweis.                                                                                                                                                                                                                                                                                | Beschaffung, Speicherung und Admin-Erfassung weiterer Nachweise noch nicht vollständig angebunden.                                                                                                                                                                                            |
| Messkette            | Scan und verstrichene Schätzung erzeugen keine Zustellung mehr. Migration 0018 trennt alte scan-/schätzbasierte Zustellung anhand Auditspur, speichert Zahlungsmodus und korrigiert Materialized Views. Nur Live-Zahlungen erzeugen Realumsatz; keine fingierten paid-Events. Erlös aus tatsächlichen Beträgen statt alter 590/49-Modellwerte. Kontroll-/Testmarkierungen werden in der Auswertung ausgeschlossen. | Keine echten eindeutigen Personen messbar; tägliche technische Deduplizierung ist keine Besucheridentität. Operator-Kontrollmarkierung noch nicht durchgehend in Admin-Links angebunden. Historisch unbekannte Zahlungsmodes bleiben ausgeschlossen. Produktionsmigration ausdrücklich offen. |

## Preisangaben im Werbebrief

Am 26.10.2026 nachgeschlagen: [§1 PAngV](https://www.gesetze-im-internet.de/pangv_2022/__1.html)
bezieht sich auf Angebote gegenüber Verbrauchern. SeitenWerk ist als B2B-Angebot geplant. Das ist kein
Freibrief für unklare Pflichtkosten: [§5a UWG](https://www.gesetze-im-internet.de/uwg_2004/__5a.html)
erfasst auch sonstige Marktteilnehmer. Deshalb bleiben Einrichtung, zwingender gewählter Monatstarif,
Beginn und Kündbarkeit gut lesbar im Brief; Preise dominieren nicht mehr mit 15-Punkt-Schrift.
Vollständiger Leistungs-/Vertragsumfang bleibt vor Checkout nötig. Keine juristische Einzelfallfreigabe.
Steuerstatus, tatsächliche Anbieterstruktur und Art.-14/21-Informationen müssen vor Versand fachlich passen.

## Tests und sichere Wiederaufnahme

- Migration 0018 ausschließlich durch Core-Testsetup gegen lokale Wegwerf-DB geprüft.
- Erster großer Core-Lauf: 459 von 466 Fällen bestanden; sieben Fehler in alten Zustell-/Kohortenannahmen.
- Danach gezielt 55 betroffene Fälle: 54 bestanden; letzter Fall betraf eine datumsabhängige Vorwochen-Fixture.
- Nach Kalenderkorrektur alle 12 Fälle dieser Datei bestanden. Kein neuer vollständiger Gesamtlauf behauptet.
- 100 Template-Tests, TypeScript und Lint bestanden. Regulärer Produktionsbuild nach sauberem Neuaufbau
  bestanden; keine Veröffentlichung. Erste Turbopack-Versuche scheiterten am Port-Binding, alternativer
  Webpack-Versuch an Browser-Abhängigkeiten. Kein dauerhafter Bundlerwechsel vorgenommen.
- Drei Maler-Prototypen: vollständige Browser-/HTML-/Axe-/Layout-/Lighthouse-/PDF-/QR-Prüfungen erneut bestanden.
- 20-Template-Belastungsmatrix separat: normal, lange Inhalte/größere Leistungsmenge und bildfrei,
  1440/360/390/430. Ergebnisdatei unter template-matrix-final/checks.json ist maßgeblich. Automatische Geometrie
  ist keine gestalterische Abnahme. Frühe Abbrüche stammten aus wiederholter Mutation gemeinsam genutzter
  Test-Fixtures (exponentiell viele Leistungen); Harness korrigiert und Artefakte neu gerendert.

Offen: vollständige menschliche Sichtabnahme aller Belastungszustände, unabhängige Unternehmerprüfung,
Papier-/Umschlagtest, Provider-Sandbox-E2E, weitere Personalisierung und mobile Firmenwebsite.
Nach gestalterischer Entscheidung erst den gewählten Ansatz in vorhandene Branchenlayouts übernehmen
und dann 20 vollständige aktuelle Brief-Demo-Paare abnehmen. Keine automatische Freigabe aus dieser Galerie.

Abschluss der isolierten Matrix: 20 Vorlagen × 3 Zustände × 4 Breiten = 240 tatsächliche Renderaufnahmen, keine horizontalen Überläufe oder defekten Bilder; alle Vollaufnahmen erstellt. Keine pauschale gestalterische Freigabe.
