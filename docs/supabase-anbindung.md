# Supabase-Anbindung der Firmenwebsite

Stand 24.10.2026. Ausdrücklich beauftragt nach der zunächst rein dokumentarischen Übernahme.

## Eingerichtet und geprüft

- Supabase-Projekt **Webiste-**, Ref `nfecpmamgrcgnnyulioy`, EU Irland (`eu-west-1`). Projektzuordnung in `supabase/project.json`, keine Secrets darin.
- Die elf vorhandenen Drizzle-Migrationen sind übernommen. 32 Tabellen, keine Paralleltabellen. Originale Drizzle-Hashes und Zeitstempel in `drizzle.__drizzle_migrations`, damit spätere Drizzle-Läufe die alten Migrationen nicht erneut anwenden.
- Alle 32 Tabellen mit RLS, keine direkten Rechte für `anon`, `authenticated` oder `PUBLIC`, auch nicht auf materialisierte Sichten. Service-Zugriff bleibt serverseitig. Keine Anmeldung oder Kundendatenbank-API im Browser.
- Betreiberkonfiguration in `settings.app_config`: Doaa Attia, Seitenwerk, Wilhelm-Diess-Weg 3a, 94081 Fürstenzell, Telefon/WhatsApp +4915219682134, Kontakt `support@seitenwerk.world`, kein Foto, formulierte Kurzvorstellung.
- `dryRun=true`, automatische Briefe, Antworten, Domainregistrierung und Optimierung aus. Keine Zahlungs-, Brief- oder Domainaktionen gestartet.
- Edge Function `seitenwerk-site-config` aktiv. GET liefert nur freigegebene öffentliche Felder (Name/Kontakt/Preise/Garantie/Rechtstextfelder); Bankdaten, Steuer-ID und interne Schalter ausgeschlossen. `?view=sources` liefert öffentliche Quellen nach denselben Kriterien wie der bestehende Core-Service. POST wird mit 405 abgelehnt.
- Die Edge Function ist bewusst öffentlich ohne Login, aber nur lesend. Privater Supabase-Key ausschließlich aus der Funktionsumgebung, nie im Website-Bundle. Keine Auth- oder E-Mail-Automatik eingerichtet.
- Neue Firmenwebsite-Logins wurden vom Betreiber wieder verworfen. Bereits vorhandener interner Admin bleibt unverändert.

## Verbindung zur Firmenwebsite

Alle öffentlichen Seiten verwenden `apps/web/src/lib/site-config.ts`. Bei `SITE_STATIC=true` kommen Einstellungen und Quellen über die Edge Function aus Supabase. Beim Export werden sie in HTML eingefroren. Der ausgelieferte statische Netlify-Auftritt benötigt keinen Server und keine Datenbank-Secrets.

Änderungen an Supabase-Einstellungen erscheinen auf der statischen Website **erst nach erneutem Export und Deployment**. Für die dynamische App bleibt die bestehende direkte PostgreSQL-Verbindung über `DATABASE_URL` vorgesehen. Der pg-boss-/Chromium-Worker wird nicht durch eine Edge Function ersetzt und bleibt für später. Keine Produktions-DB als Testziel verwenden.

Die öffentliche Website und bestehende interne Admin-App sind verschiedene Betriebsbestandteile. Diese Einrichtung macht noch keine Briefe, Demos, Checkout-Webhooks oder Workerjobs ohne Server lauffähig.

## Reproduzierbare Vorbereitung

`./packages/core/node_modules/.bin/tsx scripts/prepare-supabase.ts /tmp/seitenwerk-bootstrap.sql`

Das Skript erzeugt ausschließlich SQL aus den vorhandenen Migrationen und Betreiberangaben. Es baut keine Verbindung auf. Die SQL-Datei ist nur für ein **leeres** Ziel vorgesehen und bricht andernfalls ab. Sie ist kein Updateskript und darf nicht erneut gegen das eingerichtete Projekt angewandt werden. Die erstmalige Einrichtung wurde mit dem Supabase-Connector als Migration `seitenwerk_existing_drizzle_bootstrap` angewandt. Für weitere Änderungen additive Migrationen schreiben; kein Reset.

## Rechtstexte und E-Mail

Impressum, Datenschutz und AGB verwenden ausdrücklich markierte eigene Entwürfe, falls keine freigegebenen Texte hinterlegt sind. Das sind keine eRecht24-Generatorausgaben. Es gibt keinen angebundenen eRecht24-Generatorzugang in dieser Sitzung. Rechtlich zu prüfende Vertragsbestandteile sind offengelegt; die freigegebenen `legal.*`-Felder bleiben leer und der Live-Verkauf gesperrt.

**Aktualisiert 24.10.2026, 17:53 UTC:** Resend bestätigt die Domain vollständig einschließlich DKIM, SPF und Empfangs-MX. Die Inbox `support@seitenwerk.world` wurde erfolgreich angelegt und anschließend über den Connector bestätigt (Anzeigename Seitenwerk, Postfach Seitenwerk Support). Keine Test-Mail verschickt; tatsächliche Zustellung noch nicht getestet. Die frühere 422-Sperre ist behoben.

## Prüfungen

- Datenbankabfrage: 32 Tabellen, 11 Drizzle-Einträge, 0 Tabellen ohne RLS, 0 Browser-Tabellengrants.
- Edge Function GET 200; Quellen 200; POST 405; REST-Zugriff auf `settings` mit öffentlichem Key abgelehnt (401).
- Sicherheitsberater meldet keine Warnungen/Fehler, aber 32 Infohinweise „RLS Enabled No Policy“. Das ist hier absichtlich deny-by-default für ausschließlich serverseitige Tabellen; keine allgemeinen Benutzerpolicies ergänzen. [Supabase-Erläuterung](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Lokaler Sicherheitstest: `./packages/core/node_modules/.bin/tsx --test tests/site-integration.test.ts`, ohne DB-Reset.

## Veröffentlichung

Das bestehende Netlify-Projekt `seitenwerk-website` ist identifiziert. Die verfügbaren Netlify-Connector-Tools bieten in dieser Sitzung keinen Datei-Upload/Deploy-Start; auch kein Netlify-CLI-Token ist in der Laufzeit konfiguriert. Der Website-Export wird lokal vorbereitet, nicht als veröffentlicht behauptet. Für den späteren Upload nur `apps/web/out` verwenden, niemals das vollständige Next-Build mit internen Admin-Routen.

Stripe, DNS und Domainverwaltung bleiben beim Betreiber. Server und Worker später, Plakat-Vorlagen bleiben erhalten.

Abschlussprüfung: ESLint und TypeScript aller vier Pakete erfolgreich; zwei isolierte Sicherheitstests erfolgreich; Next-Produktionsbuild erfolgreich (bestehende Warnungen zur dynamischen Dateiverfolgung). Statischer Export aller elf Seiten erfolgreich, noindex erhalten. Browserprüfung von Impressum und mobilem Kontakt inkl. WhatsApp/E-Mail und Überschriften durchgeführt. In dieser Cloudumgebung benötigt Node-HTTPS den vorhandenen Proxy; beim lokalen Exportserver wurde Node 24 mit `NODE_USE_ENV_PROXY=1` gestartet. Kein Worker gestartet, kein DB-Resettest.
