# SeitenWerk V4/V5 – verbindlicher Handoff

Aktuelle lokale Fortsetzung vom 26.10.2026: Aufgabe3 (Anbieterlogo und Kaufstrecke), siehe `docs/task3-checkout/status.md` und Prüfbericht. Vorherige Abnahmen bleiben zeitgebundene Nachweise; keine Live-Freigabe.


Stand 25.10.2026. **Bereit für interne Tests. Kein Versand-/Verkaufsstart. Nicht veröffentlicht.**
`DRY_RUN=true`; keine echten Briefe, Zahlungen/Erstattungen, Domainkäufe, DNS-/Produktionsänderungen.
Die ausdrücklich autorisierten Stripe-Sandbox-Tests bewegten nur Testgeld; Testabos beendet.

## Arbeitsbasis, Rettung und sichere Commits

Repository `y41069586-sudo/Webiste-`; Arbeitsverzeichnis `/workspace/seitenwerk-v4`,
Branch `codex/conversion-v4`. Originalworktree `/workspace/Webiste-` mit fremden Änderungen erhalten.
Phase 0: Status, Branch, letzte Commits, staged/unstaged/untracked geprüft; kein Reset/Force-Push.
Unterbrochener Patch zusätzlich `/tmp/seitenwerk-v4-rescue.patch`, neue Dateien
`/tmp/seitenwerk-v4-untracked-rescue.tar.gz` gesichert. Nicht auf dieses temporäre Backup verlassen.

Einstiegsliteratur geprüft: AGENTS, CLAUDE, README, spec-update-2, Entscheidungen, Übernahme,
Projektstand sowie V4-/Compliance-/Integrations-/Go-Live-/Stripe-Unterlagen. Aktuelle V5-Dokumente
unten ersetzen alte offene Statusangaben. Hauptarbeitsbranch per GitHub-Connector gelesen:
`claude/website-brief-maschine-0d0s37` weiterhin exakt `fbff0cc69d0b8e7a786333730893f89123c91f32`.

Vorheriger sicherer V4-Stand: `24d23f7`. Letzter sicherer Implementierungscommit: **48b6a99**.
Zum endgültigen QA-/Dokumentationsstand `git log -1 --oneline` lesen (Handoff gehört zu diesem Commit).

| Commit  | Abgeschlossenes Paket                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 312aba8 | Unterbrochene V4-Operations fertig: Mandat/Go-Live-Abo, Wechsel/Kündigung, Care+, tatsächliche Kosten und vorhandene Admin-/Kundenansichten   |
| 81098d0 | Worker-only Docker, Queue-Konfiguration/Rechte, Offline-Vorbereitung, Storage-/DB-Backup-/Restore-Härtung                                     |
| 3bea72e | Echter Sandbox-Befund korrigiert: allow_incomplete/off_session, bestätigte Refund-Zustände, Backend-RLS, Steuer-Gate                          |
| 910f612 | Drei Demo-Designs, Fallbacktexte, Review-Gates/CLI, 15 Briefe, Firmenwebsite und fünf statische Muster, Edge-Angebotsversion                  |
| 48b6a99 | Monats-Erstattungen, unveränderliche Differenzbelege, kumulative Steuer-Rundung, Legacy-Retry, Finanzsperre/Recovery bei unbekannter Rechnung |

Exakte geänderte Dateien seit 24d23f7: [Dateimanifest](v5-geaenderte-dateien.txt).
Keine neuen Dashboards/Logins/Zahlungsanbieter/Produktionsdatenbank. Plakat und Legacy-Verträge erhalten.

## Umsetzungsstand

- V4-Neukunden Basis 597+19 / Care+ 597+insgesamt99, zentral; Monatsbeginn erst nach tatsächlich
  bestätigtem Go-Live, bezahlter Einrichtung und ausdrücklicher Zustimmung/Mandat. Ältere manuelle
  V4-Snapshots behalten den separaten Checkout; Legacy 590/49/19 nicht neu berechnen.
- Genau eine Subscription, idempotente Rechnungen/Events/Retry. Async ist nicht vorzeitig paid.
  Wechsel am Periodenende ohne Proration, Kündigung, Care+-Kontingent 60 Minuten und dokumentierte Checks.
- Refund-Pending kein Geldabgang. Monats-/Einrichtungszahlungen getrennt; bestätigte kumulative
  Refunds monoton; immutable Differenz-PDFs mit eigener Nummer/Zustellung. Ungeklärte Zuordnung
  bleibt retriable und blockiert einen vollständig bestätigten Finanzsaldo/Deckungsbeitrag.
- Rechnungs-/Care-/Kostenfunktionen in bestehenden Oberflächen; keine fiktiven Gewinne oder Gewinner.
- Demos: drei Layouts verbessert, vorhandene CC0-Beispielfotos passend eingegrenzt; tatsächliche
  Fakten stärker sichtbar, keine erfundenen Betriebsfotos/Personen/Leistungen als bestätigte Fakten.
- Erste 30-Demo-Freigabe auch direkt im Service/CLI gesperrt ohne Fakten-/Desktop-/Mobil-/Bild-/Textcheck.
  Technisch bestanden, visuell geprüft, manuell freigegeben und versandbereit getrennt.
- V4-A korrigiert (Entwurf statt angeblich fertige Website). Alte gespeicherte Varianten nicht
  überschrieben/aktiviert; falsche Zusagen werden unter V4 blockiert. Keine neue Statistikbehauptung.
- Firmenwebsite mit großen tatsächlichen Vorschauen/fünf fiktiven Mustern. Garantie/AGB nur
  Arbeitsfassung zum implementierten Ablauf, keine Rechtsfreigabe. Statische Edge-Whitelist transportiert
  Angebotsversion ohne interne Billing-/Bank-/Steuerfelder.
- Worker-only Compose für dieselbe Supabase-DB; keine zweite Produktions-DB. Produktionsstarts
  migrieren/seeden nicht. Queue offline vorbereiten; Anwendung nur nach gesonderter Freigabe.
- Additive Migrationen 0011–0017 vorhanden, ausschließlich lokal angewandt. Supabase unverändert.

## Bestandene Prüfungen und Artefakte

| Prüfung                                                | Tatsächlicher Nachweis                                                                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core-Gesamtlauf ohne separat ausgeführte Browsermatrix | 304/304, `/tmp/seitenwerk-v5-core-complete-last.log`                                                                                                     |
| Letzter Korrektur-/Legacy-Nachlauf                     | 8/8, `/tmp/seitenwerk-v5-refund-final.log`; zusätzlicher Legacy-Fall nach Gesamtlauf                                                                     |
| Template-Browsermatrix / zehn Generator-Demos          | 128/128 Tests (127 Matrix + ein Test mit zehn Fällen), `/tmp/seitenwerk-v5-visual-final.log`                                                             |
| Template-Paket                                         | 97/97                                                                                                                                                    |
| Root-Tests                                             | 6/6 Testdateien, `/tmp/seitenwerk-v5-root-last.log`                                                                                                      |
| TypeScript / ESLint                                    | alle vier Pakete / Root bestanden, letzte Logs `seitenwerk-v5-types-final.log`, `seitenwerk-v5-lint-final.log`                                           |
| Produktionsbuild / kompletter Browser-E2E              | Build grün; **22/22**, keine übersprungenen Fälle, `/tmp/seitenwerk-v5-e2e-production-final.log`                                                         |
| PDF/QR                                                 | 15/15 einseitig, alle QR aus tatsächlicher PDF-Rasterung decodiert; DOM-/Adressprüfung bestanden                                                         |
| Stripe echt, nur Sandbox                               | Basis 1900/Care 9900 Cent bezahlt, vollständig erstattet, Abos canceled; GET-Readback, `stripe-v5-sandbox-abnahme.md`                                    |
| Worker-Image                                           | Node 22/Chromium, nicht-root/read-only, internes Netz, DB/Queue ok, PNG/PDF, SIGTERM Exit 0; `/tmp/seitenwerk-v5-worker-release.log`                     |
| Queue / Runtime-Rolle                                  | tatsächlicher Job/Retry/Dead-Letter/Cron; beschränkte Rolle ohne Superuser/CREATEDB/BYPASSRLS; nur lokal                                                 |
| Restore / Storage                                      | nach Migration 0017: neue lokale DB:49 Tabellen mit gleichen vollständigen Datenhashes; binärer Storage-/Hash-Test; keine produktive Sicherung behaupten |
| Statischer Firmenexport                                | elf Seiten aus Produktionsvorschau mit lokaler Edge-Fixture; V4-Handy/Desktop-Layout und Bilder ohne Fehler                                              |

Artefakte ignoriert unter `data/exports/v5-quality/` (Symlink nach `/tmp/seitenwerk-v5-quality-artifacts`),
`data/exports/conversion-v4/` und `apps/web/out`. V5 enthält 20 Demo-PNGs, Matrix, Worker-/DB-Proof,
vier Firmenwebsitebilder und 30 zusätzliche E2E-Screenshots. Tatsächlich betrachtet: zehn Demo-Fälle,
repräsentative A/B/C-PDFs und korrigiertes A, Firmenwebsite Desktop/Handy/Preise. Keine pauschale
Premium-Abnahme echter Unternehmen. Artefakte können bei Umgebungswechsel fehlen; reproduzieren.

Fehler/Nachläufe offen dokumentiert: Stripe default_incomplete ungeeignet; Legacy items-Webhook
abgesichert; erste Texte/Selektoren korrigiert; temporärer Docker-ENOSPC nach gezielter Bereinigung
eigenen Buildcaches behoben; Standardschema beim lokalen Restore korrigiert. Dev-E2E hatte HMR-
Reload-Schleife, verworfen. Produktions-E2E zeigte korrekt die Mock-Hosting-Sperre; nur lokale
Testkonfiguration freigeschaltet, final 22/22. Keine App-Sicherheitsgrenze abgeschaltet.

## Reproduktion – nur dedizierte lokale Wegwerf-Datenbanken

Core-/E2E-Setup löscht die Ziel-Test-DB. Niemals Supabase/Produktivdaten benutzen. Derzeit eigener
Postgres-Testcontainer `seitenwerk-v4-test-db`, Port 15432, Datenbanken wbm_v4_test/focus_test/e2e.
Andere vorhandene Container/Volumes bleiben unberührt. Alle Provider ausdrücklich Mock.

- Paketmanager `corepack pnpm`10.28.0; keine Lockfile-Migration zu System-pnpm11.
- Types/Lint: `corepack pnpm -r typecheck`, `corepack pnpm lint`.
- Core: TEST_DATABASE_URL auf lokale benannte Test-DB; `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`;
  `corepack pnpm --filter @wbm/core exec vitest run` (enthält auch die längere127er Browsermatrix).
- Produktions-E2E: zuerst lokaler Webbuild, dann E2E_DATABASE_URL auf lokale E2E-DB,
  E2E_PRODUCTION=true, SHOTS_DIR außerhalb Source, E2E_PORT=3214 und
  `corepack pnpm --filter @wbm/web exec playwright test`. Mock-Zahlung/Hosting werden ausschließlich
  in dieser Testkonfiguration freigegeben. Ports 3214/3215 dürfen nicht von alten Testprozessen belegt sein.
- Fünf statische Muster: `node --import ./packages/core/node_modules/tsx/dist/loader.mjs scripts/build-public-examples.mts`.
- Briefe: gleicher Loader für `scripts/preview-conversion-v4.mts` und `scripts/check-v4-pdfs.mts`.
- Queue-SQL: `corepack pnpm --filter @wbm/core queue:prepare` (standardmäßig offline).

## Externer Befund / noch nicht ausgeführte Abnahmen

Supabase aktiv, 32 Public-Tabellen, kein pgboss/offer_snapshot, privater Bucket vorhanden; Security-
Advisor ohne Befunde. Netlify: statischer Firmenauftritt und dynamische App getrennt, unverändert.
Resend: Domain verifiziert, Senden/Empfangen an, Support-Inbox und aktiver Eingangshook bestätigt.
Plugin ist kein Runtime-Key. Keine echte Mail/LLM-/Druck-/Registrar-/Hostingaktion ausgeführt.

Offen: kompletter597-Hosted-Checkout mit tatsächlicher Webhookzustellung; SEPA/SCA/Folgemonat/
Schedulewechsel; S3Put/Get/Delete und gesamte Uploadkette; Resend-Nachrichtenfluss; echte LLM-/
Lead-/Druck-/Domain-/Hostingabnahme; tatsächliches Produktionsbackup+Storage-Restore; VPS-Betrieb.
Mehrrechnungs-/Teilzahlungs-Erstattungen benötigen manuelle Zuordnung, keine erfundene Aufteilung.
Historische Korrekturbelege ohne neue Liste nicht automatisch neu interpretieren.

Automatische Sicherheitsprüfung lehnte vollständiges Netlify-ENV-Auslesen wegen möglicher Secret-
Offenlegung ab. Nicht umgangen. Aktuelle Runtime-Werte/Secret-Scopes bleiben ungeprüft.

## Offene Arbeit, nächster konkreter Schritt und Sperren

Keine angefangene Implementierung absichtlich offen; übrige Aufgaben sind externe Einrichtung,
Abnahme und Betreiberentscheidungen. Verbindliche Details: [Go-Live-Checkliste](v5-go-live-checkliste.md),
[Qualitätsbericht A–G](v5-quality-pruefung.md), [Provider-Audit](v5-betrieb-und-provider-audit.md).

Zuerst Steuer-/Leistungs-/Garantie-/Rechtsfragen und sichere Runtime-Secrets für ein begrenztes
externes Sandbox-Abnahmepaket klären. Danach separat freigegebene additive Migration/pgboss und
Worker auf genehmigtem VPS einrichten; genau einen fiktiven vollständigen Providerlauf dokumentieren.
Erst dann tatsächliche Betriebs-/Kampagnenfreigabe prüfen. Keine Live-Stripe-Freischaltung durch diese
Sitzung, keine produktiven DB-/DNS-/Deploy-Aktionen. Erste 30 echten Demos weiter manuell abnehmen.

## Verbindlicher Restaufgaben-Audit abgeschlossen

Fortsetzung nach 9a09ca8: aktueller Nachweis in `status-audit-abschluss-2026-10-25.md`.
432/432 Coretests inklusive 127 Template-Browserfälle,22/22 Produktions-E2E,97 Template-Tests,
6 Root-Testdateien, Types/Lint/Build und erneuter Worker-Smoke bestanden. Alle 20 Vorlagen als
vollständige Brief-Demo-Paare gerendert und visuell betrachtet, fünf Prüfbögen und PDF-Raster.
Mobile Labormessung mit CPU 4×/1,6Mbit/s: LCP-Mediane Marketing 2,184 s/Demo 0,792 s/
tatsächliche Mock-Bezahlseite 1,920 s; maximaler CLS 0,0152. Marketing-Erstwert 3,016 s dokumentiert.
Keine Feld-/CDN-Abnahme behaupten. Neue Skripte audit-final-pairs.mts und
audit-mobile-performance.mts; App unverändert, keine externen Aktionen. Artefakte unter
data/exports/final-audit mit SHA-256-Manifest. Frühere lokale Restpunkte durch diesen Audit ersetzt.
Offen bleiben ausschließlich die im neuen Bericht kategorisierten externen Schritte/Freigaben.

# Neuester Nachtrag: konkrete Betreiberantworten und öffentliche Preise

25.10.2026, nach214c255. Betreiber bestätigt V4 und keine49-Euro-Neukundenangebote; nur Karte
überStripe, VPS-Auswahlbudget15Euro/Monat und Testbudget10Euro. Gewerbe noch nicht angemeldet,
Steuerstatus unbestätigt. Keine Produktionsmutation oder Veröffentlichung freigegeben.
Rechtliche Nachprüfung und lesender Providerstand: docs/recht/nachpruefung-2026-10-25.md.

Gefundene Lücke: öffentliche Firmenwebsite konnte über gespeicherte Legacy-Einstellungen alte
Preise zeigen. getSiteConfig erzwingt jetzt V4 nur für öffentlichen Auftritt, dynamisch UND im
statischen Export. Interne Konfiguration und historische Vertrags-/Rechnungssnapshots unverändert.
Regression mit absichtlich gespeicherter Legacy-Konfiguration über/,/preise,/agb,/garantie bestanden.
6/6Firmenwebsite-Browsertests,41betroffene Core-Tests, TypeScript allerPakete, Lint und Next-Build
bestanden. Logs:/tmp/operator-site-tests.log,/tmp/operator-decisions-tests.log,
/tmp/operator-typecheck-final.log,/tmp/operator-lint.log,/tmp/operator-build.log.

QA-Skript leitet Briefempfänger aus Demo-Fakten ab, statt abweichender synthetischer Namen/Adressen.
20Paare erneut gerendert, QR dekodiert, PDF/DIN-Prüfungen bestanden; keine Netzaufrufe/Sendung.
Artefakte:data/exports/operator-preview. Aktuelle Firmenwebsite dort als Desktop-/Mobil-PNG,
V4-Preise automatisch geprüft; beide Seitenbilder tatsächlich angesehen. Absender in allgemeinen
Testdaten weiterhin fiktiv. Persönliche Vorschauen unter ignoriertem data/exports/deine-vorschau,
keine personenbezogenen Angaben im Git. Keine behauptete Versand- oder Rechtsfreigabe.

Neu zu beachten: gespeicherte Produktions-checkout.paymentMethods bleiben ungeprüft/unverändert;
Default jetzt['card']. Dies allein ändert keine Netlify-/Supabase-Laufzeitkonfiguration.
Resend-Postfach vorhanden, noch kein Eingangsbeleg und noch keine Testmail gesendet. Inbox-Sendetool
verlangt vor Versand konkrete Bestätigung des Empfängers/Betreffs/Wortlauts; allgemeinesJa reicht dort
nicht. Kein weiterer App-Neubau nötig; technische Providerabnahme und die externen Freigaben folgen.

## Ultimate-Fortsetzung in Arbeit (25.10.2026)

Gesicherter Push `e2f6da448a49bd56265743c3459b0c557f94af4e`, Branch `codex/conversion-v4`.
Zweites Paket mit Branchenbildern, echter PDF-QR-Prüfung, gewichteten manuellen Qualitätsfreigaben,
0–100-Leadscore, kompakter Firmenwebsite und Briefverbesserung lokal umgesetzt. Vollständiger
aktueller Arbeits-/Fehler-/Prüfstand: [Ultimate-Handoff](ultimate-quality-handoff.md).
Ältere Aussagen „lokal abgeschlossen“ gelten für den damaligen V4/V5-Stand, nicht automatisch für
alle neuen Ultimate-Anforderungen. Neue Endabnahme noch in Arbeit. Keine Live-Aktion.

## Abgeschlossene lokale Fortsetzung (26.10.2026)

Autoritativer neuer Nachweis: [Ultimate-Abschluss](ultimate-quality-abschluss.md).
461Core,97Template,19Root und23Browserfälle bestanden; danach33Versand-/Followup-Fälle und
6Werkstatt-Palettenfälle bestanden.15Primärbranchen-Demos/45PDFs sowie20weitere Vorlagenpaare
inklusivePlakat gerendert und visuell geprüft. Neue Versandprüfung verhindert alte Screenshot-/QR-
Zuordnung bei ersetzter Demo und blockiert nachträglich fehlgeschlagene QA. Lange Werkstatt-Headline
korrigiert und betroffene Paare erneut erstellt. Finale Typen/Lint/Build bestanden.
Worker-Offline-Image6fca5413a7df mit unveränderten installierten Abhängigkeiten und endgültigen Quellen
besteht Smoke; kalter Registry-Neubau bleibt durchHTTP503 blockiert. Mobile Labormessung abgeschlossen.
Vorherige Abschnitte mit „in Arbeit“ sind zeitgebundene Zwischenstände und durch diesen Abschluss ersetzt.
Keine Produktionsmigration/Veröffentlichung/Zahlung/Briefe/Domainkäufe. DRY_RUN=true.
Nächster Schritt: fachliche Anbieter-/Steuer-/Vertragsfreigaben und geschützte Runtimezugänge,
anschließend genehmigte externe Sandbox-/Infrastrukturabnahme gemäß Abschlussbericht.

Letzter sicherer Implementierungscommit: `c9af6a4515ebbcb6c07111a3382df081f2a2c827` auf `codex/conversion-v4`.
Alle Implementierungsänderungen dieses Pakets darin enthalten; dieser anschließende Dokumentationscommit
ergänzt nur den Wiederaufnahmepunkt. Tests und Grenzen siehe Ultimate-Abschluss.


## Neue gestalterische Zwischenabnahme (26.10.2026)

Der Betreiber hat die frühere visuelle Qualität ausdrücklich nicht abgenommen. Der obige technische
Abschluss ersetzt keine Designfreigabe. Neues, isoliertes erstes Redesign-Paket:
[Status](design-review/status.md), [zehn geprüfte Schwachstellen und Nachweise](design-review/README.md).
Drei Maler-Konzepte, vollständige echte Screenshots/PDFs und Vorher/Nachher sind vorhanden. Standard-
Renderer und andere Branchen unverändert. 100 Template-Tests, 45 relevante Core-Tests, Typen/Lint/Build
für dieses Paket bestanden. Frühere komplette Testzahlen nicht als erneute Durchführung ausgeben.
Funnel-Zustellschätzung/Testabgrenzung bleiben offene Kampagnenblocker. Keine Produktionsfreigabe.
**Jetzt auf die ausdrückliche gestalterische Zwischenabnahme warten; danach erst Branchenübertragung.**

Letzter sicherer Redesign-Implementierungscommit: `b618a7a2a9a0322f813906af4aa7320ee72189ab` auf `codex/conversion-v4`.
Stand zur visuellen Zwischenabnahme, ausdrücklich keine gestalterische oder produktive Freigabe.


## Laufende Premium-Completion nach Gerätefeedback (26.10.2026)

[Verbindlicher Zwischenstand](design-review/completion/status.md),
[Bericht mit offenen Punkten](design-review/completion/bericht.md). Neue kompakte Gerätebilder,
15 fiktive Brief-Demo-Paare und isolierte20-Template-Matrix vorhanden. Personalisierung nicht fertig;
keine abschließende Design-/Produktionsfreigabe. Neuer Auftrag verbietet Push ohne Freigabe.
Migration0018 ausschließlich gegen lokalen Testpostgres geprüft. Standardrenderer nicht auf neue
Maler-Stile umgestellt. Bei Wiederaufnahme keine belegten Ergebnisse erneut bauen.

## Neuester Einzelauftrag 1: Demoqualität (26.10.2026)

Der Betreiber hat den Ablauf auf fünf getrennte Prompts umgestellt. Nur Aufgabe1 ist jetzt bearbeitet:
[Abschlussbericht](task1-design/README.md), [Wiederaufnahmepunkt](task1-design/status.md),
[20-Vorlagen-Matrix](task1-design/qualitaetsmatrix.md). Bestehende IDs, Plakat, V4/V5 und akzeptierte
Laptop-/Handy-Geometrie erhalten. Bestehende Vorlagen lokal strukturell verbessert, keine Maler-Stilkopie
auf alle Branchen. Frühere Aussagen „Standardrenderer unverändert“ beschreiben den jeweiligen früheren Stand.

102 Template-/151 relevante Core-Tests, 560 Browserprüfungen für20 fiktive Profile, TypeScript/Lint/Build
bestanden. Sieben Dateisystem-Tracingwarnungen im Build bleiben. Echte Vorher-/Nachher-Galerie und ZIP
unter `data/exports/task1-design/`, ausgewählte Belege versioniert unter `docs/task1-design/evidence/`.
Sichtprüfung: alle20 Desktop-/Mobilübersichten plus ausgewählte vollständige Seiten; keine individuelle
gestalterische Betreiberfreigabe, keine Detailabnahme aller120 Screenshots, keine Provider-Liveabnahme.

Kein Push/Deployment/Produktionsmigration/Versand/Zahlung. DRY_RUN=true. Keine weitere Aufgabe vorwegnehmen.
Als Nächstes Aufgabe1-Ergebnisse vorstellen, Betreiberfeedback/nächsten Einzelprompt abwarten.

Letzter sicherer Aufgabe1-Implementierungscommit: `beb1f9834be3f4da80c0270d576601c003bdef45` auf `codex/conversion-v4`.

## Neuester Einzelauftrag2: Briefe und QR-Demofunnel (26.10.2026)

[Abschluss](task2-letters/README.md), [Prüfmatrix](task2-letters/pruefmatrix.md),
[Wiederaufnahme](task2-letters/status.md). Task1-Stand beibehalten. Normale V4-Briefe jetzt mit echter
Laptop-/Handy-Komposition, getrennten Preisen, belegten manuellen Detailangaben und8pt-Pflichtfuß.
Gemeinsame lokale Sperrlisten-/Dubletten-/Quellenprüfung, feste PDF-/Demo-/Bild-/Betriebsdaten-Hashes,
atomarer DB-Ersatz erst nach bestandener Neu-Erzeugung. Alte V4-Dateien ohne Bild-QA-Nachweis neu prüfen;
keine Migration. Gerätegeometrie, Preislogik und bestehende Claims/Slots/Quoten erhalten. Neue Folgebriefe pausiert.

20/20 fiktive Erstbrief-Paare mit tatsächlichen PDFs, Druckraster-QR, gleichen lokalen Kurz-/QR-Zielen,
Datums-/Preis-/Datenschutzkontrolle und390px ohne Überlauf bestanden.114 Core-Regressionen, anschließend8
Sicherheitsfälle mit zusätzlichem positiven Folgebrief3 (115 unterschiedliche),102 Template-Tests,
TypeScript/Lint/Build bestanden. Sieben bekannte Tracingwarnungen. Keine physische Druck-/Kameraprüfung,
keine Betreiber-/Rechts-/Provider-/Versandfreigabe. Alle20 Nachher-PDFs und ausgewählte Originale versioniert.
Volle Galerie und ZIP: data/exports/task2-letters/. Keine echten Geschäftsdaten oder Ereignisse.

DRY_RUN=true. Kein Push/Deployment/Providerauftrag. Aufgabe3 nicht anfangen, bis deren Einzelprompt vorliegt.

Letzter sicherer Aufgabe2-Implementierungscommit: `c621f9ef401588bdadcbfbd150babc0db11284a9` auf `codex/conversion-v4`.

Zusatzfeedback zu Aufgabe2: recherchegebundene Einstiege mit frischem manuellem Prüfnachweis implementiert. Zwei ausdrücklich fiktive Muster und35 aktuelle Tests/Typen/Lint/Build bestanden; Bericht task2-letters/README.md. Keine echte Recherche oder Kunden-/Leadgarantie behaupten.

Neuester Betreibertext für Aufgabe2 lokal optimiert: freundlicher Website-Ideen-Einstieg, kostenloser
QR-CTA ohne Verkaufsgespräch, knappe Preiszeile und kein Kostenanfall ohne Bestellung.20/20 neue Paare,
122 Core-/102 Template-Tests, Typen/Lint/Build bestanden; sieben bekannte Tracingwarnungen.
Aktuelle Belege copy-* in docs/task2-letters/evidence/, neue Vergleichsgalerie galerie-refined/ und
seitenwerk-aufgabe2-betreiberfassung.zip unter data/exports/task2-letters/. Alte Fassungen erhalten.
Keine externen Aktionen oder Freigaben. Nächster Schritt: Betreiberfeedback/nächsten Einzelprompt abwarten.

Letzter sicherer Implementierungscommit der optimierten Betreiberfassung: `031ffe96678add462751ff08592b23625b3b20f4`.


### 26.10.2026 – Anschluss: Betriebscharakter und Demoqualität

Geprüfter lokaler Implementierungscommit `941f7fe0ba9de01cb8d58a429d2db0f91bead675` auf `codex/conversion-v4`.
Aktuelle Wiederaufnahme und vollständige Nachweise unter `docs/vibe-upgrade/status.md` und
`pruefbericht.md`: 20 Vorlagen, 101 Core-/108 Template-Tests, 14 Browserfälle und drei
Produktionsbuild-Wiederholungen. Alle Anbieteraufrufe im Test Mock. Kein Push/Deployment,
keine reale Bildanalyse-Abnahme oder automatische Google-Maps-Fotorecherche behauptet.
V4/V5-Architektur und reale Betriebsfreigaben bleiben erhalten.
