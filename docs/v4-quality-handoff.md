# SeitenWerk V4/V5 – verbindlicher Handoff

Aktuellste Fortsetzung: [Aktivierungsprüfungen 30.10.2026](activation-2026-10-30/README.md).
Live-Konto/Katalog/Webhook und 12,61 € Briefguthaben bestätigt. Alte eigene PDF wird wegen
veralteter Bindung vor Testübertragung blockiert; Zähler 1/3. Produktiver Push wurde von der
automatischen Freigabeprüfung zunächst abgelehnt; konkrete Zustimmung liegt jetzt vor.
Veröffentlichung wird geprüft; der Betreiber führt den anschließenden Server-Update selbst aus.

## 27.10.2026 – Claude-Übernahme auf `codex/conversion-v4` (lokaler Branch `claude/v4-restarbeiten`)

Ausgangspunkt `96498d3` (= Remote-HEAD bei Übernahme, keine neueren Arbeiten). Früherer Claude-Branch vollständig
enthalten. Lokale Commits, **kein Push, kein Deploy**, DRY_RUN=true, nur lokale Wegwerf-DBs (`wbm_test`,
`wbm_export_test`, `wbm_rehearsal_test`). Externe Anbieter ausschließlich lesend abgefragt.

**Externer Stand rein lesend (27.10.2026):**

- Supabase `nfecpmamgrcgnnyulioy`: 11 Migrationen, Hashes 0000–0010 identisch mit lokal; 0011–0018 fehlen
  (lokal jetzt zusätzlich 0019). Kein `pgboss`. 0 Leads/Demos/Briefe/Bestellungen. RLS auf allen 32 Tabellen,
  anon/authenticated ohne Lesezugriff, Rolle `seitenwerk_admin_backend` mit Richtlinie `admin_backend_access`.
  Privater Bucket `seitenwerk-private` mit 1 Objekt. Standardrechte für neue Tabellen nur postgres/service_role.
- Stripe-Sandbox: genau drei aktive V4-Preise (597 € einmalig, 19 €/Monat, 99 €/Monat) wie in
  `stripe-v4-sandbox.json`. Webhook `seitenwerkworld.netlify.app/api/webhooks/stripe` aktiv, statischer
  `seitenwerk.world`-Endpunkt deaktiviert – Routing korrekt. Keine Signatur-/Kaufkette geprüft.
- Resend: Domain `seitenwerk.world` verifiziert, Senden und Empfangen aktiv, Tracking aus.
- Netlify: `seitenwerk.world` (statisch) läuft noch mit dem Export vom 24.10.: **öffentlich 590 €/49 €,
  example.com-Kontakt, „Vorname Nachname“, Musterstraße** (noindex). `seitenwerkworld.netlify.app` (App)
  zeigt ebenfalls 590/49 auf Start-, Preis- und Ablaufseite. Beide brauchen ein freigegebenes Deployment.

**Behoben bzw. ergänzt (lokale Commits):**

- `3b3fb61` Exportsperre `apps/web/scripts/export-guard.mjs`: Export bricht ab bei Platzhalter-Anbieterdaten,
  Legacy-Preisen 590/49, internen `TODO`-Vermerken oder fehlender 597-€-Einrichtung auf `/preise`.
  Gegenprobe: der öffentliche Altstand liefert 19 Befunde. Gefundener echter Fehler: `/so-funktionierts`
  zeigte „597 € einmalig oder 49 €/Monat“ – jetzt V4-Zweig (597 € + 19 € Basis / 99 € Care+ ab Go-Live).
  Opt-in Website-Vorprüfung `leads/website-probe.ts` (Schalter `targeting.acquisition.websiteProbe`,
  Standard aus, nie für Mock-Quellen, höchstens 4 Abrufe je Betrieb, Lauf-Obergrenze, keine Wiederholung).
  Fund nur bei Telefon oder PLZ+Straße auf der Seite → Ausschluss über bestehende Qualifizierung. Kein Fund
  beweist nichts; die vier manuellen WEBSITE_METHODS bleiben Pflicht. 7 neue Tests, ohne Netz.
- `e7439a5` Migration **0019** nach Generalprobe: Backend-Rolle durfte die Funnel-Sichten nie auffrischen
  (nur Eigentümer) und verliert nach 0018 sogar SELECT – Funnel und Sicherheitsnetze wären in Produktion
  gebrochen. 0019: SELECT-Recht plus `SECURITY DEFINER`-Funktion `seitenwerk_ops.refresh_funnel_views()`
  in nicht veröffentlichtem Schema; anon/authenticated ohne Zugriff; ohne Rolle wirkungslos.
  `scripts/rehearse-production-upgrade.ts` wiederholt die ganze Probe (Produktionsstand → 0011–0019 →
  Backend-Lesen/Auffrischen über App-Code → Browserrollen gesperrt → pg-boss-SQL, Queue-Anlage,
  `queue-permissions.sql` → Job-Zyklus, Zeitplan, Wartung als Backend-Rolle): `ok: true`.
  Grenze: lokales PostgreSQL 16 statt 17, keine Supabase-Pooler/-Erweiterungen; ersetzt kein Backup/Restore.

**Statischer Export aktuell gesperrt** (richtig so): Impressum, Datenschutz und AGB aus der privaten
Supabase-Konfiguration enthalten sichtbare `TODO`-Vermerke (USt-/W-IdNr., Steuerstatus,
Vertragsannahmezeitpunkt, AV-Vertrag LLM-Anbieter, Kundenhosting). Erst nach Betreiberentscheidung exportierbar.
Der Standard-Turbopack-Build lief in dieser Umgebung durch.

**Vollständiges Chromium-Worker-Image** (vorher am vfs-Speicherlimit gescheitert): hier mit overlayfs gebaut
(2,1 GB) und gehärtet gestartet (read-only, cap_drop ALL, 2 GB-Limit) gegen die Generalprobe-DB als
Backend-Rolle, alle Anbieter Mock: Health ok, Queue-Job `refresh-funnel` erledigt, Chromium-PDF/-Screenshots,
RAM-Spitze 623 MiB, SIGTERM sauber, Neustart gesund, Logs ohne Secrets. VPS-Vorschlag mit Messwerten:
[vps-vorschlag-2026-10-27.md](vps-vorschlag-2026-10-27.md) (netcup VPS 500 G12.5, 9,50 €/Monat, nicht bestellt).

**Tests nach allen Änderungen:** Core-Volllauf **577/577 in 65 Dateien, ein einziger Durchlauf**, Templates 111/111,
Root-Prüfungen 25/25, TypeScript und Lint. Browser-E2E nicht erneut vollständig. Matrix aller 18 Restaufgaben:
[claude-uebernahme-2026-10-27.md](claude-uebernahme-2026-10-27.md).

##27.10.2026 – alle neun Qualitätsbereiche lokal bearbeitet

Sicherer Implementierungscommit ef694ae; vorherige Anbieterdarstellung7a2c6c0 separat erhalten.
Beide lokal, kein Push. Dokumentationscheckpoint danach; Quellcode und Prüfstände siehe dort.

Aktuellster Bericht und Wiederaufnahme: [Qualitätsabschluss](quality-completion/report.md),
[Status](quality-completion/status.md), [sichtbare Galerie](quality-completion/evidence/galerie.html).
Kein Push/Deploy, Produktionsmigration oder Echtweltauftrag. DRY_RUN=true und Mockadapter erhalten.
14/14 finale Browserfälle auf dem Produktionsbuild grün,10 komplette Mock-Käufe;
24 einseitige9pt-Briefe mit echten Gerätebildern/QR,20 Vorlagen mit660 Browserchecks.
TypeScript/Lint,111 Template-Tests,53 finale gezielte Core-Tests,40 Brief-/QR-Tests bestanden.
Next-Webpack-Build und lokaler Node22-Workerstart bestanden; Turbopack-Port und vollständiges
Chromium-Dockerimage hier durch Umgebungsgrenzen nicht abgenommen. Details/Fehlerläufe erhalten.
Supabase erneut rein lesend:11Migrationen, kein pgboss,0Produktionsobjekte, Backupabnahme offen.
Alle neun Bereiche haben eine eigene ehrliche Bewertung; kein durchgehendes9,5/10 behauptet.
Externe Restschritte und sichere Reihenfolge stehen im Bericht. Nicht wieder blind neu aufbauen.

Neueste Betreiberklarstellung und Anschlusskorrekturen: [Gründungsphase](founding-status/README.md).
Natürliche Person, keine Gewerbeanmeldung/Handelsregistereintragung, steuerlich unbestätigt. Keine
Behauptung eines bestehenden Einzelunternehmens. Anbietertexte lokal angepasst, private Entwürfe
mit hinterlegter Identität erzeugt; kein Deploy. Zwischenzeitliche Steuerbestätigung zurückgenommen.
Stripe-Sandboxrouting inzwischen korrigiert, noch keine vollständige Signatur-/Kaufabnahme.
Frühere Auditwerte bleiben historische Momentaufnahme. Migrationen, Worker und Providerabnahmen offen.

Aktuellster Gesamt-Audit **27.10.2026**: [Projekt-/Betriebs-/Conversionbericht](project-audit-2026-10-27/README.md).
Nur Analyse und lesende Providerprüfung, keine Anwendungs- oder Produktionsänderung. Lokal a820158,
17 Commits vor dem abgefragten GitHub-Entwicklungsbranch. Live-App weiterhin fbff0cc; statische
Firmenwebsite vom 24.10. zeigt 590/49 und Musterdaten. Aktiver Stripe-Sandbox-Webhook zeigt auf
statische 404-Route; dynamischer App-Endpunkt deaktiviert. Supabase hat 11 von 19 Migrationen,
kein pgboss; offen sind jetzt **0011–0018**, nicht nur 0017. Keine Leads, Briefe oder Bestellungen.
92 relevante Core-Tests, 109 Template-Tests, TypeScript/Lint frisch bestanden; keine neue vollständige
E2E-/Build-/Dockerabnahme. Bestehende Schlüssel teilweise bereits in Netlify hinterlegt, Provider
weiterhin Mock; nicht pauschal neue Schlüssel anfordern. Vollautomatische Quellen-/Bildreferenzbeschaffung
und echte LLM-Qualität offen. DRY_RUN=true, kein Push/Deploy/Kontakt/Anbieterauftrag. Details im Audit.

Neueste lokale Fortsetzung26.10.2026: Zielkampagne Maler→Reinigung→Fliesen, belegter Akquisebedarf,
Website-/Aktivitäts-/Gründungsprüfung und Faktenübergabe. Wiederaufnahme:
[Akquise-Handoff](acquisition-priorities/status.md), [Nachweis](acquisition-priorities/README.md).
Keine Produktions-Konfiguration überschrieben, keine echte Recherche/Kontakte/Sendungen, DRY_RUN=true.

Neuester lokaler Briefauftrag26.10.2026: persönliche, preisfreie Vorschau-Einladungen,
zusammenhängender KI-Schreib-/Faktenprüfpfad im vorhandenen Provider und20 fiktive PDF-/QR-Paare.
Autoritativ dazu: [Brief-Handoff](letter-preview-upgrade/status.md) und
[Prüfbericht](letter-preview-upgrade/README.md). Ältere Pflicht zu Briefpreisen ersetzt;
V4-Angebots-/Checkoutpreise unverändert. Offline-Beispieltexte sind Fixtures, keine echte
KI-Textabnahme. DRY_RUN=true, kein Push/Deployment/Versand. Exakten lokalen Commit mit git log lesen.

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

### 27.10.2026 – Echter Recherche-/Gestaltungsprobelauf

Ausgangscommit `0ebc6e4`, weiterhin `codex/conversion-v4`. Aktueller Stand und konsolidierte
Nachweise unter `docs/real-painter-check/status.md` und `verification.json`. Ein passender realer
Privatkunden-/Renovierungsanbieter quellengebunden geprüft, keine eigene Website in dokumentierter
Suche gefunden. Unbekanntes Alter/Vollerwerb/Auslastung nicht erfunden, keine Kundenkontakte.

Bekannte historische Ereignisdaten können Signale jetzt nicht durch frische Sichtung verjüngen.
Beanstandete abstrakte Maler-Grafik entfernt; passendes nichtgeneriertes Pexels-Foto mit eigener
geprüfter Lizenz ergänzt. Echtes Einzelfoto-Rasterproblem (halbe Breite) behoben. Bestehende20 IDs,
Plakat, V4-Preise, preisfreie Einladungsbriefe und Providerarchitektur unverändert.

42 relevante Core-/109 Template-Tests, Typen/Lint und Web-/Workerbuild bestanden, sieben bekannte
Tracingwarnungen. Ein echtes lokales Demo-/Brief-Kontrollpaar mit 360/390/430/1440px, korrekter
QR-Zuordnung und einer A4-Seite in 300dpi geprüft. Axe ohne automatisch erkannte Verstöße;
manuelle Kontrastfälle offen. Private Galerie/ZIP/Quellen und Empfängerdaten nur unter
`data/exports/real-painter-check/`, nicht ins Git übernehmen.

Text für diesen Kontrollfall redaktionelle Offline-Fixture, keine echte LLM-Abnahme. Aktuelle
Laufzeit ohne Anthropic-/Stripe-Sandbox-/Webhook-Schlüssel. Kein echter externer E2E-Abschluss,
keine Rechts-/Steuer-/Versandfreigabe. `DRY_RUN=true`, kein Push/Deploy/Versand. Nach Ansichtsprüfung
weitere echte Kandidaten gleicher Nachweisqualität; echten Providerlauf erst sicher anbinden.

### 27.10.2026 – Stilbelege und VPS-Abrechnung

Anschluss an `12ad382`: `docs/vibe-upgrade/automation-and-billing.md`. Bestehende Stilauswertung
verlangt jetzt getrennte Beobachtungen zu Farben, Typografie, Atmosphäre und Komposition sowie
explizit ausreichende Belege. Eine Dimension oder niedrige Sicherheit reicht nicht. Fehlende
Originalfarben/-schriften werden auch bei sonst passendem Stil nicht aus Modellantworten übernommen.
Cacheversion erhöht, keine bestehende Demo still verändert, manuelle Freigaben erhalten.

46 Coretests in fünf betroffenen Suiten bestanden, darunter vier neue Fälle zu fehlender Evidenz/
Originalschrift, tatsächlicher Demo-/Briefpfad und unveränderter Gestaltung im Onboarding. Tests
nutzen ausschließlich Mockanbieter und lokale wbm_visual_evidence_test. Typen und Lint bestanden.
Build/Nachweisabschluss im verlinkten Bericht festhalten. Keine echte Bildanalyse, Kosten,
Provideranbindung, Produktionsänderung, VPS-Bereitstellung oder Veröffentlichung.

VPS-Worker fragt bei echter Anbindung den vorhandenen Anthropic-API-Provider ab und nutzt kein
ChatGPT-Plus-/Codex-Kontingent. API-Kosten separat. Quellen-/Bildbeschaffung weiterhin nicht
vollständig automatisch; ausreichend berechtigte Referenzen müssen im bestehenden Pfad vorliegen.

### 27.10.2026 – Konsolidierte Qualitätsrunde und Claude-Übergabe

Implementierungscheckpoint `ef694ae`, geprüfte Dokumentation `9bcd21a`. Der aktuelle
[Qualitätsbericht](quality-completion/report.md) ersetzt überholte Test-/Restangaben früherer
Abschnitte: alle neun Bereiche bearbeitet, 14/14 finale Mock-Browserfälle, 24 druckfertige lokale
Testpaare, 20 Vorlagen mit Geometrie-/Palettenchecks. Tatsächliche Anbieter- und Betriebsabnahme
bleibt offen; vollständiges Chromium-Image und Standard-Turbopack hier nicht erfolgreich geprüft.

Vollständiger Fortsetzungsauftrag: [Claude-Handoff](claude-handoff-2026-10-27.md). Enthält aktuellen
Preis-/Rechts-/Stilstand, bereits erledigte Änderungen, Testgrenzen und sämtliche Restarbeiten mit
sicherer Reihenfolge. Claude soll zuerst den neuesten Remote-Stand erneut analysieren und nicht
auf dem früheren Claude-Branch blind weiterarbeiten. Keine neue Architektur oder weitere Produktphase.

Neueste Betreiberanweisung erlaubt ausdrücklich Commit und Push dieses vorhandenen Standes auf
`codex/conversion-v4`. Vorgesehene Commitmarker `[skip ci] [skip netlify]`, kein PR, kein Force-Push.
Der ursprüngliche Claude-Branch bleibt erhalten. Die gesonderten Grenzen für Deployment, DNS,
Migrationen, VPS, Live-Zahlung/Versand/Domainkauf bleiben unverändert. DRY_RUN=true.

## Launch-Landingpage `apps/launch` (27.10.2026, lokal)

Eigenständige statische Akquise-Seite, unabhängig von `apps/web` (Firmenwebsite unverändert). Helles Design (weiß,
graues Punkteraster, blaue Akzente), Hero-Animation „Eintrag → iPhone“ mit drei fiktiven Musterbetrieben,
Beispiele, Ablauf, Versprechen, qualitativer Vergleich, Preise aus `offers-v4.ts`, FAQ, Anfrageformular
(Netlify Forms, Name/Ort/E-Mail + Einwilligung) mit Danke-Animation, `/entfernen/`, Rechtstexte aus
`legalDrafts()` plus Datenschutzabschnitt zu den Formularen. Build: `pnpm --filter @wbm/launch build` → `dist/`
(noindex, Exportsperre aktiv). Kein Deployment: braucht ein neues Netlify-Projekt, Formularerkennung und
Benachrichtigungs-E-Mail – erst nach Freigabe.

**Deploy 27.10.2026 (vom Betreiber freigegeben):** Upload-Deploy `6ae0e479280cb6357aa4fb20` in das bestehende
Netlify-Projekt `seitenwerk-website` (seitenwerk.world), Formulare aktiviert und erkannt (`anfrage`, `entfernen`),
alte Pfade per `_redirects` auf Abschnitte umgeleitet, weiterhin noindex. Der Deploy ist bereit, aber noch nicht
veröffentlicht, weil der vorherige Produktionsdeploy gesperrt ist (Auto-Publishing aus) → in Netlify
„Publish deploy“ klicken. Formular-Benachrichtigung per E-Mail im Netlify-Dashboard einrichten.

## Briefdienst easyNova (27.10.2026, lokal)

Betreiberentscheidung: easyNova statt LetterXpress. Neuer `MailProvider` (`packages/core/src/providers/mail/easynova.ts`)
nach offizieller OpenAPI V1: Token-Anmeldung, `Idempotency-Key`, Testmodus per `testFlag` (kein Druck, keine
Kosten), Status 1–4/99, Preisvorschau, Guthaben. Freigabe wie bisher: 3 Testaufträge → 1 echter Brief an den
Betreiber → Freischaltung. Brief trägt jetzt die von easyNova verlangte Absenderzeile über dem Adressfenster
(DIN 5008), Layoutprüfung angepasst. Datenschutz Abschnitt 11 nennt easyNova. Admin-Testknopf für easyNova.
Kein Konto, kein Aufruf mit Zugangsdaten, keine Kosten. Offen: Konto + AV-Vertrag, Zugangsdaten sicher
hinterlegen (`EASYNOVA_USERNAME`, `EASYNOVA_PASSWORD`, `EASYNOVA_TEST_EMAIL`), Sperrflächen per `GET /api/account`
mit unserem Brief abgleichen. Die veröffentlichte Landingpage-Vorschau nennt noch LetterXpress; der nächste
Upload enthält den neuen Text.

## 29.10.2026 – Wiederaufnahme nach70Claude-Commits

Quelle `484b060`; eigener Zweig `codex/resume-2026-10-29`. Aktueller vollständiger Audit und
Fortsetzungsstand: [resume-2026-10-29/README.md](resume-2026-10-29/README.md).
Neue Implementierungscheckpoints `a01e02d` (expliziter Stripe-Live-Modus, Kataloge, Abo-Lifecycle,
Test-/Live-Trennung, Worker-Export/atomarer Einmal-Code) und `0c18d92` (eigener Probedruck mit
Mock-Demo ausschließlich an gebundene Testanschrift; normale Mock-Akquise weiter gesperrt).

705Core-Tests bestanden,3übersprungen;2zusätzliche Eigenbrief-Tests,112Template-Tests,3Root-Dateien,
Gesamt-Typecheck/Lint, finaler Standard-Turbopack-/Worker-Build, Compose/Bash und13Browser-E2E grün.
Ein unveränderter langer Briefmatrixfall und2osmium-Fälle nicht abgeschlossen/ausgeführt; keine
echte Stripe-Sandbox-/Live-Zahlung oder kostenpflichtige Briefaktion. Keine neue Modell-API-Abnahme.

Produktionsstand neu gelesen: App aktuell auf484b060, Firmenwebsite aktuellere statische Fassung,
21Migrationen, pgboss/Worker-Takte/privater Storage vorhanden.420Leads,4Mock-Demos,1Testbrief,
0Bestellungen und0qualifizierte echte Leads. research-lead-Queue fehlt trotz implementiertem
Handler. Vor Serverupdate kontrolliert vorbereiten; keine produktive DB-Schreibaktion hier.

Steuerbestätigung weiter false (Frage gestellt), easyNova1von3Testaufträgen, E-Mail/Hosting/Registrar
Mock, Backup-Nachweis offen. Betreiber-Ja zu Stripe/easyNova-live aus Screenshots berücksichtigt,
keine neue Zustimmung dazu verlangen; tatsächliche Voraussetzungen und Empfängerfreigabe erhalten.
Neue Implementierung noch nicht veröffentlicht. Server braucht die neue App-Umgebung inklusive
OPTOUT_EMAIL; bestehende Test-PDF nach Update neu erzeugen. Teststandard bleibt DRY_RUN=true.
