# SeitenWerk V4/V5 – verbindlicher Handoff

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
