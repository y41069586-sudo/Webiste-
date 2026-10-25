# Verbindlicher Restaufgaben-Audit – Abschlussprüfung 25.10.2026

Basis 9a09ca8. Keine vorhandenen Änderungen beim Einstieg; keine aktiven Node-/Chromium-Testprozesse
(nur bereits beendete Zombie-Prozesse). Keine fremden Prozesse beendet. Getrennte lokale Testziele:
Core wbm_v4_test, E2E wbm_v4_e2e, Worker/Leistungsmessung wbm_v4_focus_test. DRY_RUN=true,
alle Provider Mock. Keine produktiven Aktionen, keine externen Anbietermutationen.

Nachtrag der Betreiberabnahme: siehe recht/nachpruefung-2026-10-25.md. Bei erneuter Ansicht der
synthetischen Paare fiel auf, dass Adress-/Namensdaten des Brief-Fixtures von der Demo abwichen.
Der frühere Sichtnachweis bestätigt das Layout, aber keine vollständige Faktenkonsistenz der Paare.
QA-Skript korrigiert: Empfänger wird jetzt aus denselben BusinessFacts wie die Demo abgeleitet.
Neue Artefakte getrennt unter data/exports/operator-preview; alte Nachweise bleiben erhalten.

## Nachweise der zehn beauftragten Aufgaben

Alle nachstehenden Ergebnisse wurden tatsächlich ausgeführt; historische Zwischenläufe sind keine endgültige Abnahme.
Artefakte: data/exports/final-audit; Testlogs /tmp/final-audit-*.log. Keine Mock-Verbindung als
Anbieterabnahme ausgeben. Alle Pfade und Programme gehören zu diesem vorhandenen Projekt.

## Ausschließlich offene externe Aufgaben

| Kategorie                | Blocker                                                                                   | Exakt nächster Schritt                                                                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entscheidung/Freigabe    | Steuerstatus, Bank-/Rechnungsdaten und ggf. W-IdNr. ungeklärt                             | Bestätigte Angaben sicher hinterlegen; Steuerbestätigung erst danach setzen, keine Steuernummer öffentlich machen                                                                                                                       |
| Entscheidung/Freigabe    | Vertrags-/Garantie-/Leistungs-/Datenschutz- und Postwerbefreigabe                         | Vorhandene Arbeitsfassungen und tatsächlichen Ablauf prüfen lassen, freigegebene legal.*-Felder versionieren; Domain-/Care+-Umfang bestätigen                                                                                           |
| Entscheidung/Freigabe    | Kosten und produktive Aktionen gesperrt                                                   | Separat VPS-Budget, Migration, Workerbetrieb und spätere Deployments freigeben; Versand- und Zahlungsgenehmigung getrennt halten                                                                                                        |
| Anbieterzugänge          | Runtime-Secrets fehlen oder sind ungeprüft                                                | Benötigte Schlüssel über sichere Umgebungsverwaltung nur in Web/Worker hinterlegen, passende Scopes prüfen; keine Schlüssel im Chat/Git                                                                                                 |
| Anbieterzugänge          | Vollständige Stripe-Sandbox-Kette offen                                                   | Test-Checkout597 über App bis signiertem Webhook, Go-Live, genau19/99, SEPA/SCA, Folgeperiode, Wechsel/Kündigung/Refund mit vorhandenen Testpreisen abnehmen                                                                            |
| Anbieterzugänge          | S3/Resend/Anthropic/OSM/LetterXpress/INWX/Kundenhosting nicht vollständig echt abgenommen | Je vorhandenen Adapter mit begrenzten fiktiven Testdaten abnehmen: Storage-Objektkette; genehmigte eigene Mail; begrenzter LLM-/OSM-Test; freigegebener LetterXpress-Testauftrag; Registrar-/Hosting-Sandbox ohne Kauf/Veröffentlichung |
| Produktive Infrastruktur | Kein genehmigter dauerhaft laufender Worker/pgboss                                        | Worker-only Compose auf genehmigtem VPS nutzen; gleiche Supabase-DB über Session/Direct5432, keine zweite Produktions-DB                                                                                                                |
| Produktive Infrastruktur | Migrationen0011–0017, Queue und Recovery nicht produktiv abgenommen                       | Zuerst echte verschlüsselte DB-/Storage-Sicherung und isolierter Restore, dann SQL/Rollen prüfen und separat freigegebene additive Migration/Queue-Einrichtung ausführen                                                                |
| Produktive Infrastruktur | Zwei Netlify-Bereitstellungen, Routen und Secrets ungeprüft                               | APP_URL/DEMO_DOMAIN/TRACK_DOMAIN und TLS für Web/Worker prüfen; App, öffentliche Edge-Funktion und statischen Export nur nach gesonderter Freigabe aktualisieren                                                                        |
| Entscheidung/Freigabe    | Konkrete Kampagnenfreigabe fehlt                                                          | Erste30 tatsächlichen Demos/Fakten/Briefpaare persönlich freigeben, eigenen Druck-/Fensterumschlagtest genehmigen, kleine erste Charge mit Kostenlimit bestimmen                                                                        |

## Sichere Reihenfolge

1. Steuer-/Vertrags-/Leistungsentscheidungen und begrenzte Betriebsfreigabe klären.
2. VPS erst nach Kostenfreigabe bereitstellen. Supabase- und Storage-Backup isoliert zurückspielen.
3. SQL0011–0017 und Queue prüfen, separat freigegeben anwenden; eingeschränkte Runtime-Rollen,
   Session-Pooler5432, Worker zunächst ausschließlich Mock/DRY_RUN mit Health/Heartbeat abnehmen.
4. Sichere Provider-Secrets, S3 und Resend abnehmen; Route/TLS-Zuordnung beider Netlify-Projekte prüfen.
5. Stripe zuerst vollständig Sandbox prüfen. Keine Live-Schlüssel durch diese Prüfung aktivieren.
6. LetterXpress erst lesend/Konfiguration; Testauftrag und eigener Druck nur mit Kosten-/Versandfreigabe.
7. Einen vollständig fiktiven echten Provider-E2E-Lauf dokumentieren. Danach getrennte Freigaben
   für Veröffentlichung, echte Zahlungen und eine begrenzte echte Briefcharge prüfen.

Der automatische Sicherheitsreview hatte im vorherigen Audit vollständiges Netlify-ENV-Auslesen
wegen möglicher Secret-Offenlegung abgelehnt. Keine Umgehung; aktuelle Runtime-Werte bleiben ungeprüft.

## Sichtprüfung aller 20 Brief-Demo-Paare

VERIFIED: alle vorhandenen Templates als fiktives vollständiges Paar gerendert, Desktop-/Mobil-PNG,
PDF und rasterisierte PDF-Seite gespeichert; fünf Prüfbögen tatsächlich betrachtet. Keine abgeschnittenen
Headlines/Buttons, Bilddefekte oder überlaufende Briefinhalte in den betrachteten Fällen.
Bewertung gilt für diese Layout-Fixtures, nicht für Fakten oder Freigabe eines echten Betriebs.
Beauty-soft ist bewusst die schlichte bildfreie Alternative, keine pauschale Premium-Zusage.
Plakat bleibt für alle Branchen erhalten. Keine Vorlage wegen eines nachgewiesenen Layoutfehlers
auszuschließen; erste 30 echte Freigaben bleiben einzeln und manuell geschützt.

| Vorlage              | Ergebnis                                                 | Nachweis                                                                                            |
| -------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| beauty-elegant       | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-beauty-elegant-desktop.png / -mobile.png; brief-beauty-elegant-1.pdf; review-1.png             |
| beauty-modern        | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-beauty-modern-desktop.png / -mobile.png; brief-beauty-modern-1.pdf; review-1.png               |
| beauty-plakat        | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-beauty-plakat-desktop.png / -mobile.png; brief-beauty-plakat-1.pdf; review-1.png               |
| beauty-soft          | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-beauty-soft-desktop.png / -mobile.png; brief-beauty-soft-1.pdf; review-1.png                   |
| einzelhandel-foto    | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-einzelhandel-foto-desktop.png / -mobile.png; brief-einzelhandel-foto-1.pdf; review-2.png       |
| einzelhandel-magazin | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-einzelhandel-magazin-desktop.png / -mobile.png; brief-einzelhandel-magazin-1.pdf; review-2.png |
| einzelhandel-plakat  | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-einzelhandel-plakat-desktop.png / -mobile.png; brief-einzelhandel-plakat-1.pdf; review-2.png   |
| einzelhandel-split   | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-einzelhandel-split-desktop.png / -mobile.png; brief-einzelhandel-split-1.pdf; review-2.png     |
| gastronomie-foto     | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-gastronomie-foto-desktop.png / -mobile.png; brief-gastronomie-foto-1.pdf; review-3.png         |
| gastronomie-magazin  | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-gastronomie-magazin-desktop.png / -mobile.png; brief-gastronomie-magazin-1.pdf; review-3.png   |
| gastronomie-plakat   | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-gastronomie-plakat-desktop.png / -mobile.png; brief-gastronomie-plakat-1.pdf; review-3.png     |
| gastronomie-split    | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-gastronomie-split-desktop.png / -mobile.png; brief-gastronomie-split-1.pdf; review-3.png       |
| handwerk-klar        | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-handwerk-klar-desktop.png / -mobile.png; brief-handwerk-klar-1.pdf; review-4.png               |
| handwerk-plakat      | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-handwerk-plakat-desktop.png / -mobile.png; brief-handwerk-plakat-1.pdf; review-4.png           |
| handwerk-solid       | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-handwerk-solid-desktop.png / -mobile.png; brief-handwerk-solid-1.pdf; review-4.png             |
| handwerk-werkstatt   | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-handwerk-werkstatt-desktop.png / -mobile.png; brief-handwerk-werkstatt-1.pdf; review-4.png     |
| kurse-foto           | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-kurse-foto-desktop.png / -mobile.png; brief-kurse-foto-1.pdf; review-5.png                     |
| kurse-magazin        | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-kurse-magazin-desktop.png / -mobile.png; brief-kurse-magazin-1.pdf; review-5.png               |
| kurse-plakat         | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-kurse-plakat-desktop.png / -mobile.png; brief-kurse-plakat-1.pdf; review-5.png                 |
| kurse-split          | VERIFIED – visuell geprüft, keine sichtbare Layoutsperre | demo-kurse-split-desktop.png / -mobile.png; brief-kurse-split-1.pdf; review-5.png                   |

Der Prüfskript-Fehler bei der Bildauswahl wurde korrigiert: Screenshotmodus behält dieselben
Demo-Optionen für denselben Foto-Seed. Kein zusätzliches Feature oder Umbau der Anwendung.
Offline-QRs verwenden example.test und verweisen je Branchenszenario auf dasselbe fiktive Unternehmen;
die tatsächliche App-Token-/Dubletten-/Funnelzuordnung wird gesondert durch Core/E2E getestet.

## Tatsächlich abgeschlossene Regressionen

| Audit-Aufgabe                      | Status                           | Nachweis                                                                                                           |
| ---------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1 Regressionen / Konfliktfreiheit  | VERIFIED                         | sauberer Einstieg, getrennte DBs; Core: 44 Dateien / 432 Tests bestanden                                           |
| 2 Monats-Erstattungen, Belege,0017 | VERIFIED                         | monthly-refunds6, refund-confirmation2, invoice-render2 sowie kompletter Migrationslauf lokal                      |
| 3 Types/Lint/Build/sichere Tests   | VERIFIED                         | vier Pakete TypeScript, ESLint, Produktionsbuild,97Template-Tests,6Root-Testdateien und22/22Produktions-E2E        |
| 4 Worker-Image                     | VERIFIED                         | erneuter nicht-root/read-only/internal-network-Test; DB/Queueok, PNG9424/PDF8052Bytes, SIGTERMExit0                |
| 5 mindestens10Brief-Demo-Paare     | VERIFIED                         | 20 Paare, volle Desktop-/Mobilbilder, PDF-Raster und fünf tatsächlich betrachtete Prüfbögen                        |
| 6 sämtliche übrigen Templates      | VERIFIED                         | alle 20 vorhandenen Vorlagen betrachtet;127 Browser-/HTML-/Axe-/Layoutfälle bestanden; reale Einzelfreigabe bleibt |
| 8 Preise/Verträge/CTAs             | VERIFIED – technische Konsistenz | V4-Vertrags-/Wahrheits-/SDK- und Browsertests;597+19 bzw.597+insgesamt99, Go-Live-Beginn; keine Rechtsfreigabe     |
| 9 QR/Funnel/Checkout/Dubletten     | VERIFIED                         | tracking/funnel/lead-finder/qualify/followups/checkout-Tests im 432er Lauf; Browser inklusive Opt-out und V4       |

Keine erneute Implementierung dieser Funktionen nötig. Der einzige neu gefundene Fehler betraf das
zusätzliche QA-Paar-Skript (abweichender Bild-Seed); korrigiert und alle20 Paare neu gerendert.
Anbieteradapter blieben Mock; alle Abnahmen hier sind lokale Nachweise.

## 7 – Mobile Ladeleistung: VERIFIED

Drei kalte Kontexte je Route; lokaler Produktionsbuild, 390×844, CPU4×,150ms Latenz,1,6Mbit/s. Andere Renderläufe beendet. Checkout-Endpfad /checkout/mock/, keine Zahlung abgesendet. Keine Feld-INP-/Lighthouse-Abnahme.

| Route     | LCP Median | LCP Maximum | CLS Maximum |
| --------- | ---------: | ----------: | ----------: |
| marketing |     2.184s |      3.016s |      0.0152 |
| demo      |     0.792s |      1.012s |      0.0000 |
| checkout  |     1.920s |      1.976s |      0.0001 |

Alle neun Antworten HTTP200, kein Überlauf. Keine kritischen Lade-/Layoutblocker im gemessenen Szenario (LCP unter 4 s, CLS unter 0,1). Marketing-Erstwert 3,016 s bleibt gegenüber 2,5 s verbesserungswürdig; Median 2,184 s. Keine Garantie für echte Mobilnetze. Nach genehmigtem Deployment CDN/TLS/Region und reale Geräte prüfen.

## 10 – Konsolidierung: VERIFIED

Anwendungscode unverändert zu 9a09ca8. Zusätzliche reproduzierbare QA-Skripte und dieser Bericht; keine Features neu gebaut. Types/Lint/Build/Core/E2E grün. Prüfsummen: data/exports/final-audit/evidence-manifest.json. Nur lokaler Commit, kein Push/Deploy.

## Verbleibende Codex-Arbeit und Bereitschaft

Ohne externe Mitwirkung ist keine Pflichtaufgabe dieses definierten lokalen Audits mehr offen. Echte Anbieter-/Infrastrukturabnahmen folgen erst nach sicheren Zugängen und jeweils nötiger ausdrücklicher Freigabe.

- Lokal im definierten Umfang vollständig getestet: ja; keine Abnahme aller denkbaren Geräte oder echten Providerzustellungen.
- Produktionsbereit: nein – Infrastruktur, Runtime-Secrets, Rechts-/Steuerfreigaben fehlen.
- Erste echte Zahlungen: nein – echte vollständige Sandbox-Abnahme und Livefreigabe fehlen.
- Erste echte Briefe: nein – rechtliche/Kampagnenfreigabe, tatsächliche Einzelfakten und Drucktest fehlen.
