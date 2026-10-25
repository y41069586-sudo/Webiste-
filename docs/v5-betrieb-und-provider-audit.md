# V5 – Betriebs- und Provider-Audit

25.10.2026. Fortsetzung des vorhandenen V4-Worktrees, kein Neuaufbau. Alle folgenden Vorbereitungen
sind **nicht produktiv angewandt**. `DRY_RUN=true`; kein VPS bestellt, kein Deployment/DNS geändert.

## Aktueller externer Befund (nur lesend)

- Supabase `Webiste-`, `nfecpmamgrcgnnyulioy`, EU Irland, ACTIVE_HEALTHY, PostgreSQL 17.
  Abfrage bestätigt **32 Public-Tabellen, kein pgboss-Schema, keine orders.offer_snapshot-Spalte**,
  0 Leads/Bestellungen/Kunden und privaten Bucket `seitenwerk-private`.
- Netlify bestätigt zwei getrennte Projekte: `seitenwerkworld` (dynamische App,
  `80e75e2d-3149-49b0-a522-76a172bbd60b`) und `seitenwerk-website` (statischer Auftritt,
  `7660f1ee-1fac-4ce5-aa70-a7a8fa417f52`, seitenwerk.world).
- Alle Netlify-Umgebungsvariablen auszulesen wurde von der automatischen Sicherheitsprüfung wegen
  möglicher Secret-Offenlegung abgelehnt. Kein Umgehen, kein Credential-Export. Aktuelle Laufzeitwerte
  bleiben deshalb ungeprüft; historische Einträge sind kein aktueller Verbindungsnachweis.
- Stripe: nur Website sandbox, livemode=false. Tatsächliche Testzahlungen/Erstattungen und Grenzen
  unter `stripe-v5-sandbox-abnahme.md`.

## Zielbetrieb und Konfiguration

| Bestandteil | Aufgabe | Vorbereitung / Grenze |
| --- | --- | --- |
| Statisches Netlify-Projekt | Firmenwebsite | Export einfrieren; keine API/Webhooks dort; Codeänderung ist kein veröffentlichter Stand |
| Dynamisches Netlify-Projekt | Admin, Demos, Checkout, Webhooks, Kundenformulare | bestehende Next.js-Anwendung, serverseitiger DB-/S3-Zugriff |
| Supabase | dieselbe vorhandene PostgreSQL-DB und privater S3-Speicher | keine neue Produktionsdatenbank; additive Migrationen 0011–0016 erst separat freigeben |
| Späterer kleiner VPS | bestehender Node-/pg-boss-/Chromium-Worker | `docker-compose.worker.yml`; kein Postgres/Caddy/Webservice darin |

`docker-compose.yml` bleibt für den lokalen Gesamtstack erhalten. Für den späteren VPS ausschließlich
`docker compose -f docker-compose.worker.yml …` verwenden. `.env.worker.example` enthält keine Secrets.
Geheimnisse in `.env.worker` mit Modus 0600 außerhalb Git. Compose erzwingt Dry-Run und deaktivierte
Automatik; echte Adapter erst nach eigener Abnahme. Nicht blind starten: Cron kann auch bei Dry-Run
LLM-Kosten, Provider-Testaufträge oder E-Mails auslösen, sofern echte Provider gewählt werden.

Worker: nicht-root, read-only Rootfs, beschränktes tmpfs/shared memory, init/SIGTERM,
45 Sekunden Stopfrist, Restart, begrenzte CPU/RAM/PIDs, begrenzte JSON-Logs, DB-/Queue-Healthcheck.
Health ist kein Nachweis erledigter Jobs; `/api/health?strict=1` und Worker-Heartbeat zusätzlich prüfen.
Docker-Build nutzt bei Bedarf die bereitgestellte Proxy-CA, ohne TLS-Prüfung abzuschalten.

## Supabase-Verbindungen / pg-boss

Offizielle Referenz geprüft: https://supabase.com/docs/guides/database/connecting-to-postgres

- Web-Abfragen: vorhandener Transaction-Pooler 6543, kleine Pools, TLS mit gültiger CA.
- Dauerworker und Migrationen: Direct 5432 (IPv6-Zugang nötig) oder Session-Pooler 5432.
  `QUEUE_DATABASE_URL` trennt Verbindungsart, **nicht Datenbankbestand**. Gleiche Projekt-/DB-Zuordnung
  vor Start prüfen. Transaction-Pooler für Queue-Migration/Supervision/Scheduler ist technisch gesperrt.
- In Produktion migriert weder der Webproducer noch der Worker automatisch. `RUN_MIGRATIONS=false`,
  `BOSS_MIGRATE=false`, `BOSS_CREATE_QUEUES=false`. Web zusätzlich `BOSS_SUPERVISE=false`,
  `BOSS_SCHEDULE=false`; Worker setzt diese beiden auf true. Zuerst Queue explizit vorbereiten.
- `pnpm --filter @wbm/core queue:prepare` erzeugt standardmäßig **nur offline SQL** aus der installierten
  pg-boss-Version 12.38.0. Vorschau prüfen und Backup erstellen. Erst nach Freigabe mit Wartungsrolle:
  `QUEUE_PREPARE_CONFIRM=prepare-existing-database … queue:prepare --apply`.
- Keine Seeds oder Änderungen an Geschäftsdaten bei Queue-Einrichtung. Danach separat
  `infra/queue-permissions.sql` prüfen: bestehende interne Rolle `seitenwerk_admin_backend`, keine
  Browserrechte, kein Superuser/CREATEDB/BYPASSRLS für Laufzeit. Keine Data-API-Exposition von pgboss.
- Neue V4-Betreuungstabellen erhalten RLS und eine Policy ausschließlich für die vorhandene
  interne Backendrolle; keine anon/authenticated-Policies. In isoliertem Postgres ohne diese Rolle
  wird keine vermeintliche Browserberechtigung angelegt.
- Nach Queue-Upgrade erneut Rechte, Schemaversion, Producer, Worker, Retry und Dead-Letter prüfen.
  Keine automatische Schemaaktualisierung beim Start einer Netlify-Funktion.

## Domains / Routen ohne DNS-Änderung

Die vorhandene dynamische Adresse reicht für einen später freigegebenen Testbetrieb:

```dotenv
APP_URL=https://seitenwerkworld.netlify.app
DEMO_DOMAIN=seitenwerkworld.netlify.app
TRACK_DOMAIN=seitenwerkworld.netlify.app
PUBLIC_PROTOCOL=https
```

Diese Werte in **Web und Worker** identisch setzen. Sie sind Vorschläge, hier nicht in Netlify
gespeichert. In Netlify müssen Laufzeitwerte Functions/Builds abdecken; Änderungen benötigen einen
gesondert freigegebenen Build/Deploy. Keine lokale Secretdatei hochladen.

| Route | Verantwortliches System |
| --- | --- |
| seitenwerk.world / Preise / Kontakt / Recht | statischer Firmenexport |
| `/d/{slug}`, `/q/{token}`, `/t/{short}` | dynamische App; Demo noindex, Opt-out und Tracking-Gates |
| `/d/{slug}/uebernehmen`, `/checkout/…`, `/onboarding/…`, `/preview/…`, `/verlaengern/…` | dynamische App |
| `/api/webhooks/stripe`, `/api/webhooks/resend`, `/api/forms/…` | dynamische App, Signatur/Rate-Limits/Zuordnung |
| Kunden-Domain | vorhandener Hosting-/Registrar-Provider, erst nach separater Freigabe |

Eigene Subdomains app/demo/track sind optional, kein Hindernis für die interne Abnahme. Keine
Weiterleitung der gesamten statischen Website auf die App und kein SPA-Catch-all über Webhooks legen.

## Provider-Matrix

| Anbieter | Tatsächlicher Stand | Offener externer Nachweis / Zugang |
| --- | --- | --- |
| Anthropic | vorhandener Adapter, strukturierte Inhalte, Budget-/Fehler-/Fallbacktests | Laufzeit-Key/Modellzugang; echter Aufruf kostet Geld und wurde nicht ausgelöst |
| OpenStreetMap | vorhandener Overpass-Adapter, Qualifizierung, Quellen-/Website-/Dublettenfilter | aktuelle Abfrage/Ratenlimit und manuelle Betriebs-/Websiteprüfung; keine Ratings behaupten |
| LetterXpress | vorhandener Adapter, Testmodus und Freigaben; echte lokale PDFs/QR | Konto/API/Guthaben, Provider-Testkorb und später separat freigegebener eigener Druckbrief |
| Stripe | bestehender Checkout, versionierte V4-Preise, Mandat/Go-Live/Abos; reale API-Sandbox für beide Tarife | vollständiger Hosted-Checkout/SEPA/Webhook-/Periodenwechsel; keine Live-Freigabe |
| Resend | vorhandener Ausgang, signierter Eingang, manuelle Support-Ingestion, Schutz vor fremden Mailanweisungen | sichere Runtime-Secretbindung und echter Nachrichtenfluss; keine Mail gesendet |
| Supabase Storage | privater Bucket extern bestätigt, vorhandener S3-Adapter und lokale Sicherungs-/Restoretests | S3-Access-/Secret-Key in Web/Worker; privater Put/Get/Head/Delete und vollständige Upload-/PDF-Kette separat abnehmen |
| INWX | vorhandene Sandbox-/Kosten-/Registrierungsfreigaben und Adaptertests | Zugang und Registrar-Sandbox-Abnahme; keine Bestellung/Domainregistrierung |
| Netlify / Cloudflare | vorhandene alternative Kundenhosting-Adapter; Mock-Ausgabe lokal geprüft | gewählten Adapter mit Tokens, Domain/TLS/Deployment abnehmen; keine Kundenwebsite veröffentlicht |

Plugin-Verbindung ist kein Laufzeit-Key und Mock-Erfolg keine echte Providerverbindung. Keine
Anbieter wechseln, keine neuen Konten provisionieren. Schriftliche Kundenanfragen bleiben der
Standard; keine Kaltanrufe, Kaltmails oder ausgehenden WhatsApp-Nachrichten.

## Backup / Restore

Supabase-Datenbankbackup sichert keine Storage-Objektinhalte. Beide Teile getrennt sichern.

- `infra/backup/backup-managed.sh`: read-only pg_dump von Public/Drizzle/pgboss über Direct/Session,
  Client passend zu PostgreSQL 17, TLS verify-full bei externer Quelle, private Dateien, SHA-256.
  Keine Passwörter in Argumenten, keine Quell-DB-Statusmutation, kein Restore.
- `storage:backup create /privates/neues/verzeichnis`: bestehenden Storage-Provider nur lesen,
  Objektmanifest mit Größe/Prüfsumme, keine Überschreibung bestehender Sicherung. Bei veränderter
  Schlüsselliste abbrechen. Für konsistenten Gesamtstand Pipeline/Uploads kontrolliert pausieren;
  die Objekt-API garantiert keine datenbankübergreifende Transaktionskonsistenz.
- Sicherungen verschlüsselt außerhalb des VPS/Produktionsbuckets ablegen, Zugriff/Retention und
  Wiederanlaufverantwortung festlegen. Nicht unter public/Netlify-Export speichern.
- Restore nur in separaten isolierten lokalen Postgres und leeren privaten Teststorage; niemals
  produktive Tabellen/Buckets überschreiben. Historisches restore-test.sh blockiert externe Hosts.
- Ein lokaler Test darf **nicht** den produktiven `backup_status` auf grün setzen. Dump-Erstellung,
  Inhaltsverzeichnis und tatsächlicher Restore sind getrennte Nachweise.

## Betriebsbremsen / Freigabe

Bestehende Budgets, Not-Aus, Dead-Letter, Rate-Limits, Retention, Suppression und Lernsystem-Gates
bleiben erhalten. Fehlender Worker-Heartbeat, Rückstau, fehlendes Backup oder Storagefehler bleiben
sichtbare Blocker. Keine automatischen Gewinner- oder Kampagnenaktivierungen.

Steuerstatus, W-IdNr. falls zugeteilt, korrekte Unternehmens-/Rechnungs-/Bankdaten, freigegebene
Vertrags-/Datenschutztexte, AV-Verträge und Werberechtsprüfung sind Betreiberaufgaben. Eigene
Entwürfe sind keine Rechtsfreigabe. Erst danach getrennte Freigaben für Migration, Betrieb und Versand.

## Konkreter lokaler Betriebsnachweis

- Worker-Testimage gebaut und unter nicht-root/read-only/Cap-Drop/tmpfs/2 GB Limit betrieben.
  Internes Docker-Netz ohne Internet, nur lokale fiktive Datenbank. Health DB/Queue=true;
  Chromium rendert PNG/PDF; SIGTERM Exit 0. Kein VPS-Deployment.
- Tatsächliche Queue-Operationen mit `seitenwerk_admin_backend` ohne erhöhte DB-Rechte:
  Job/Cron/Abschluss sowie interne RLS-Zugriffe bestanden. Nur lokaler Rollen-Nachbau.
- Managed-Dump in neue lokale Datenbank restauriert: 49 Tabellen mit identischen Datenhashes.
  Dies belegt den Ablauf, **keine** vorhandene Produktionssicherung. Beim Restore muss das leere
  Standardschema der frisch erzeugten Datenbank vor dem Schema-Dump entfernt werden; bestehende
  Restore-Datenbanken werden nicht gelöscht. Produktionsserver 17 braucht Client 17.
- Resend-Readback: Domain verifiziert, Senden/Empfangen aktiv, Support-Inbox vorhanden;
  Webhook `/api/webhooks/resend` aktiviert für `email.received` und `inbox.email.received`.
  Secretbindung, Signaturprüfung und Ende-zu-Ende-Zustellung bleiben extern ungeprüft.
