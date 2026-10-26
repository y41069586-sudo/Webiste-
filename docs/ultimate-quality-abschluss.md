# SeitenWerk – Qualitätsabnahme 25./26.10.2026

Status: lokale Endabnahme abgeschlossen, mit ausdrücklich benannten Grenzen. **DRY_RUN=true. Kein Produktionsbetrieb.**
Branch `codex/conversion-v4`; gesicherter Vorgänger `e2f6da448a49bd56265743c3459b0c557f94af4e`.
Details und Historie: [Handoff](ultimate-quality-handoff.md).

## Tatsächliche Änderungen

Der vorhandene V4/V5-Bestand wurde fortgeführt: keine zweite Anwendung, Datenbank oder Zahlungsarchitektur.
V4 bleibt597€ Einrichtung plus19€ Basis oder insgesamt99€ Care+, Monatsstart nach bezahlter Einrichtung,
Zustimmung und bestätigtem Go-Live. Historische Verträge bleiben unverändert.

- Fünf kuratierte, ausdrücklich fiktive KI-Branchenmotive; drei vorhandene unterschiedliche Layoutfamilien
  pro Primärbranche. Passende WebP-Bilder statt riesiger Initialen; bildfreier sachlicher Fallback.
- Branchengerechte Standardtexte und A/B/C-Briefnutzen. Keine erfundenen Mitarbeiter, Projekte oder Resultate.
- Größere echte Demo-Hero-Screenshots im einseitigen Brief; lange Texte behalten den sicheren Kompositfallback.
  Screenshot aus genau dem gespeicherten HTML, Adressen vollständig oder blockiert, QR41mm mit Ruhezone.
- QR-Decodierung aus dem fertigen PDF statt allein aus dem Ausgangsbild. Layout-/Wahrheitsfehler blockieren.
- Gewichtete manuelle Demo- und Briefkriterien, unbekannt bleibt unbekannt. Individuelle Admin-Freigabe,
  konfigurierbare Mindestwerte, keine künstlichen90er-Noten. Erste30-Demos bleiben geschützt.
- Nachvollziehbarer0–100-Leadscore, Schwellen75/40 konfigurierbar; OSM-Defaults sind keine Faktenbelege.
- Kompaktere Firmenwebsite mit zwei Beispielen, frühem Leistungsblock, fünf Schritten und sechs FAQs.
  Öffentliche Starteridentität entfernt; echte Betreiberangaben ausschließlich aus privater Konfiguration.
- Impressum, V4-AGB und Datenschutz erweitert und im Footer erreichbar. Fehlende FaktenTODO;
  freigegebene Rechtstextfelder und Steuerbestätigung nicht automatisch gesetzt.

## Gefundene und behobene Fehler

1. Fehlende/ungeeignete Branchenmotive und fachfremde Fallbacktexte.
2. Lange Briefe überlappten nach erweitertem Datenschutzhinweis mit dem Fußbereich. Abstände und
   Screenshot-Zuschnitt korrigiert; keine Abschwächung der Druckprüfung.
3. Verdeckte verschachtelteFAQ-Summaries erzeugten falsche Layoutfehler. Sichtbarkeitsprüfung korrigiert;
   wirkliche Überlappungen bleiben blockiert.
4. Neue Brief-B-Formulierung bestand das vorhandene Kostenlos-Wahrheitsgate nicht. Text eindeutig
   auf „kostenlos ansehen“ korrigiert, Gate unverändert.
5. Paket-Glob im Root-Build wurde von der Shell vorzeitig expandiert. Filter zitiert, Paketbuilds laufen wirklich.
6. Admin zeigte nach erfolgreicher Qualitätsfreigabe noch den alten Warnhinweis. Anzeige auf offene Reviews begrenzt.

Ressourcenabbrüche wurden nicht als Erfolg gezählt. Eigene verwaiste E2E-Server geordnet beendet;
schwere Browserläufe danach sequenziell. Keine Testdatenbank außerhalb lokaler test/e2e-Ziele.

## Nachweise

| Aufgabe                                                                                               | Status und Nachweis                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core inklusive Monats-Erstattungen, Korrekturbelegen, Migrations-/Idempotenz-/Funnel-/Dublettenfällen | **VERIFIED**,461/461 in50 Dateien, `/tmp/ultimate-core-verified.log`                                                                                                                                                                     |
| Template-Unitprüfungen                                                                                | **VERIFIED**,97/97, `/tmp/ultimate-verified-templates.log`                                                                                                                                                                               |
| Übergreifende Sicherheits-/Anbieteridentitätsprüfungen                                                | **VERIFIED**,19/19, `/tmp/ultimate-verified-root.log`                                                                                                                                                                                    |
| TypeScript/Lint/Build                                                                                 | **VERIFIED**, letzte Logs `ultimate-release-types`, `ultimate-release-lint`, `ultimate-build-final-source` unter `/tmp/`                                                                                                                 |
| Format der64 geänderten Text-/Quelldateien                                                            | **VERIFIED**, `/tmp/ultimate-format-check.log`                                                                                                                                                                                           |
| Vollständiger Browserlauf einschließlich neuer Admin-Qualitätsfreigabe                                | **VERIFIED**,23/23 inklusive Screenshots, `/tmp/ultimate-browser-final-source.log`                                                                                                                                                       |
| 15 Branchen-Demos × drei Briefe, Desktop/Tablet/Mobil, fertige PDF-QRs                                | **VERIFIED**,15Demos/45einseitigePDFs, Desktop/Tablet/Mobil, vollständige Datenschutztexte; `data/exports/ultimate-final-pairs/`                                                                                                         |
| Alle20 erhaltenen Vorlagen einschließlich Plakat                                                      | **VERIFIED**,20zusätzliche gerenderte Paare und fünf Sichtprüfbögen unter `data/exports/ultimate-all-templates/`                                                                                                                         |
| Mobile Ladeleistung und Lighthouse                                                                    | **VERIFIED**,3kalte Läufe je Seite und Lighthouse; Tabelle unten, keine Felddaten/INP                                                                                                                                                    |
| Worker                                                                                                | **VERIFIED**,finales Offline-Image `6fca5413a7dfdc4c073278fba7579f1c13d648e593d1b176b97635a5056a655c`; DB/Queuehealthy, Chromium/PNG/PDF, non-root/read-only/internes Netz, Shutdown0. `data/exports/ultimate-browser/worker-smoke.json` |

Die fünf Bildmotive sind keine individuellen realen Betriebsfotografien. Personalisierung reicht nur so weit
wie verifizierte Eingangsdaten. Eine automatische Note beweist keine professionelle Designqualität.
Keine pauschale9–10/10-Abnahme und keine nachgewiesene Verkaufsquote.

## Verbleibende Betreiber- und Betriebsaufgaben

### Entscheidung/Freigabe

- Steuerstatus, gegebenenfalls W-IdNr., Anbieter-/Vertretungsstruktur, Leistungsumfang und Garantie bestätigen.
  Nächster Schritt: tatsächliche Angaben und Vertragsbedingungen fachlich prüfen lassen, anschließend die
  freigegebenen `legal.*`-Felder versioniert hinterlegen. Bereits mitgeteilte Anschrift nicht neu erfinden.
- AV-Verträge/TOM, postalische Werbung/Art14+21, Löschfristen und Messung freigeben. Rathausauskunft ist
  nur die mitgeteilte telefonische Auskunft, keine unabhängig bestätigte umfassende Rechtsfreigabe.
- VPS höchstens15€/Monat und begrenztes externes Testpaket höchstens10€ konkret freigeben;
  Veröffentlichungen, echte Zahlung und Briefcharge jeweils gesondert freigeben.
- Erste30 reale Demos/Briefe tatsächlich prüfen; vorbereitete Branchen/Briefvarianten gezielt aktivieren.

### Externe Zugänge

Runtime-Secrets geschützt für Web und Worker bereitstellen: Supabase-Backend/Storage, Anthropic,
Resend, Stripe-Sandbox/Webhook, LetterXpress sowie spätere Domain-/Hostinganbieter. Pluginverbindung
ist kein Nachweis funktionierender Runtime-Zugänge. Keine Schlüssel im Chat oder Git.

Nächste Schritte: ein eigenes fiktives Storageobjekt vollständig durch die Kette prüfen; autorisierte
Support-Testnachricht zustellen und zuordnen; Hosted597€ → signierter Webhook → Onboarding →
bestätigter Test-Go-Live → genau19€/99€ einschließlich Fehler, Folgeperiode, Kündigung/Erstattung abnehmen.
LetterXpress zunächst Testmodus; echter eigener Testdruck benötigt gesonderte Freigabe.

### Produktive Infrastruktur

1. Verschlüsseltes Supabase-/Storage-Backup herstellen und außerhalb der Produktionsdatenbank restaurieren.
2. Additive Migrationen0011–0017 und pg-boss-SQL/Rollen prüfen und separat freigeben; Session/Direct5432,
   keine zweite Produktionsdatenbank und kein unkontrolliertes Seed.
3. Genehmigten VPS mit privatemENV, finalem Worker, Limits, Health/Heartbeat, Dead-Letter und Not-Aus betreiben.
4. Web/Worker/Storage sowie APP_URL/DEMO_DOMAIN/TRACK_DOMAIN und TLS gemeinsam prüfen; keine DNS-Änderung automatisch.
5. Stripe-Sandbox und LetterXpress-Testkette sowie vollständige Anbieter-E2E abnehmen.
6. Erst danach beide Netlify-Bereitstellungen separat freigeben; Live-Zahlung und kontrollierte Briefcharge folgen getrennt.

### Technisch noch durch Codex

Keine weitere bekannte lokale Funktionskorrektur offen. Vollständiger frischer Dockerbuild weiterhin durch
Registry503 blockiert; der lokale Offline-Aufbau verwendet dieselben bereits installierten Abhängigkeiten
und endgültige Quellen. Nächster Schritt bei wieder erreichbaren Registries: Standard-Dockerfile erneut
vollständig bauen und denselben Smoke-Test wiederholen. TLS-/Proxy-Schutz nicht umgehen.

## Versandbereitschaft

**Bereit für interne Tests. Nicht produktionsbereit, nicht für erste echte Zahlungen oder Briefe freigegeben.**
Lokale Mock-E2E ist keine tatsächliche Stripe-/LetterXpress-/Supabase-Betriebsabnahme.
Die statische Firmenwebsite wurde durch diese Arbeit nicht veröffentlicht. Ein Git-Push ist kein Deployment.

## Finale zusätzliche Regressionen und visuelle Bewertung

Nach dem461erGesamtlauf: **33/33** Versand-/LetterXpress-/Followup-Prüfungen, einschließlich zweier
neuer Regressionen. Briefversand blockiert jetzt auch, wenn die QR-Zuordnung inzwischen auf eine
neuere Demo zeigt oder die vorhandene Demo erneut eine QA nicht besteht. Kein Budget/API-Aufruf
bei dieser Sperre. Log `/tmp/ultimate-send-match-tests.log`.

Die lange Werkstatt-Headline war im großen Briefausschnitt zu hoch. Textlängenabhängige Desktopgröße
korrigiert, Reinigung/Sanitär erneut vollständig mit je neunPDFs gerendert und angesehen.
**6/6** gezielte Werkstatt-Paletten-/Datenfälle danach bestanden;121andere Fälle dieses gezielten
Nachlaufs absichtlich nicht ausgeführt, vorher im vollständigen127erMatrixlauf enthalten.
Logs `/tmp/ultimate-workshop-final-tests.log`, `/tmp/ultimate-repair-reinigung.log`, `/tmp/ultimate-repair-sanitaer.log`.

Tatsächlich betrachtet: fünf Primärbranchen-Prüfbögen mit je dreiDesktop-/Mobil-/Briefansichten sowie
fünf weitere Prüfbögen aller20Vorlagen einschließlich Plakat; außerdem einzelne Vollansichten,
Firmenhomepage und Brief-PNGs. A/B/C-PDFs technisch geprüft. Alle Prüfunternehmen/Absender fiktiv,
keine manuelle Freigabe realer Kampagnen daraus ableiten. Beispiel-QRs aufexample.test sind absichtlich
keine öffentlichen Ziele; tatsächliche lokaleQR→Demo-/Frage-/Opt-out-Zuordnung im Browser geprüft.

| Mobile Messung                 | LCP-Median,3kalte Läufe | CLS maximal | Lighthouse Performance / Accessibility / Best Practices / SEO |
| ------------------------------ | ----------------------- | ----------- | ------------------------------------------------------------- |
| Firmenwebsite                  | 2292ms                  | 0           | 94 /100 /96 /66                                               |
| Demo                           | 1228ms                  | 0           | 98 /100 /100 /66                                              |
| Tatsächlicher V4-Mock-Checkout | 1968ms                  | 0,00150     | 96 /100 /96 /54                                               |

390×844, CPU4×,150msLatenz,1,6Mbit/s, lokaler Produktionsbuild. Ein kalter Marketinglauf lag bei2592ms;
keine Aussage über stabile Felddaten oder echtes Stripe-Hosting. Niedrigere SEO-Werte bei bewusstem
noindex/robots-Schutz und lokalerHTTP-Umgebung; Indexierung wurde nicht für einen Score freigeschaltet.
JSONs und neue V4-Mobilansichten unter `data/exports/ultimate-browser/`; Messreihen unter
`data/exports/final-audit/mobile-performance.json`.

Subjektive interne Einschätzung, keine unabhängige Zertifizierung:

| Bereich                  | Einschätzung | Grenze                                                                               |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------ |
| Demo-Design              | 8–9/10       | Unterschiedliche Layouts, passende Motive; Plakat bleibt bewusst auffälliger         |
| Branchenpersonalisierung | 8/10         | Nur tatsächlich verfügbare Fakten; konkrete reale Leistungen brauchen Bestätigung    |
| Bildauswahl              | 8/10         | Fünf passende kuratierte KI-Motive, noch keine echte individuelle Betriebsfotografie |
| Briefdesign              | 8–9/10       | Großes echtes Bild, QR, geprüfteGeometrie; physischer Testdruck fehlt                |
| Briefpersonalisierung    | 8/10         | Branchenbezug/Name/Ort, keine erfundenen Betriebseinblicke                           |
| Firmenwebsite            | 8–9/10       | Kompakter, konsistent; echte Anbieterangaben/Liveabnahme gesondert                   |
| Mobile UX                | 9/10lokal    | Browser-/Laborprüfung, keine echte Geräte-/Felddatenabnahme                          |
| Preise/Angebot           | 9/10lokal    | Einheitliche V4-Quelle; rechtliche/steuerliche Freigabe fehlt                        |
| Kaufprozess              | 9/10Mock     | Erfolgreiche lokale Kette; vollständiger echter Provider-Sandboxlauf fehlt           |
| Admin                    | 8–9/10       | Neue individuelle Reviewform tatsächlich geprüft; produktive Arbeitsabnahme fehlt    |
| Zuverlässigkeit          | 9/10lokal    | Tests/Worker-Smoke; keine externe Infrastrukturabnahme                               |

Damit ist das9–10/10-Ziel nicht pauschal als erreicht zu erklären. Reale individuelle Daten, eigene
Kundenbilder und Betreiberfeedback sind für die endgültige gestalterische Abnahme notwendig.

## Git-Übergabe

Implementierung gesichert in `c9af6a4515ebbcb6c07111a3382df081f2a2c827`, Branch `codex/conversion-v4`.
Nachfolgender Dokumentationscommit hält diesen Stand fest; beide tragen Skip-CI-/Skip-Netlify-Marker.
Keine Produktionsveröffentlichung. Private Render-/Messartefakte liegen ignoriert unter `data/exports/`;
Quellen, QA-Skripte und dieser Nachweisbericht sind versioniert.
