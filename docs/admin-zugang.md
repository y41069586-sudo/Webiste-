# Bestehender Admin-Zugang

Stand 24.10.2026. Arbeiten an Rechtstexten auf ausdrücklichen Wunsch gestoppt.

- Bestehende App: https://seitenwerkworld.netlify.app/login (Netlify-Projekt `seitenwerkworld`, nicht die statische Firmenwebsite).
- Admin-Konto `support@example.test` in der bestehenden Tabelle `admin_users` angelegt, scrypt-Passworthash und verschlüsseltes TOTP-Secret, 2FA aktiv. Kein bestehendes Konto überschrieben.
- Passwort und Einrichtungsschlüssel ausschließlich in der ignorierten privaten Datei `data/exports/admin-zugang.txt`; Authenticator-QR unter `data/exports/admin-2fa.png`. Nicht ins Repository oder in die öffentliche Website übernehmen.
- Dedizierte PostgreSQL-Rolle `seitenwerk_admin_backend`, kein Superuser/CREATEDB/CREATEROLE/BYPASSRLS, keine Schema-Erstellrechte. DML-Rechte und explizite RLS-Policies nur für diese interne Backendrolle; Browserrollen bleiben ausgesperrt. Hauptpasswort von Supabase unverändert.
- Netlify: DATABASE_URL, SESSION_SECRET und ENCRYPTION_KEY als Secrets, Builds/Functions. APP_URL, DRY_RUN=true, sämtliche externen Provider als Mock und automatische Schalter aus gesetzt. Kein Worker gestartet.
- DATABASE_URL verwendet den vom Connector bestätigten direkten Supabase-Host mit TLS-Prüfung. Die Verbindung aus Netlify ist noch nicht getestet; sollte die Laufzeit kein IPv6 unterstützen, ist ein projektbezogener IPv4-Poolerhost aus Supabase Connect nötig. Der Connector liefert diesen Host nicht. Keine Poolerhostnamen geraten.

## Noch erforderlich

Im bestehenden [Netlify-Projekt → Deploys](https://app.netlify.com/projects/seitenwerkworld/deploys) **Trigger deploy → Deploy site** (bzw. den letzten Deploy erneut ausführen). Die hier verfügbaren Tools können keinen Deploy starten. Umgebungsänderungen gelten erst nach einem neuen Deploy.

Danach Login mit E-Mail, Passwort aus der privaten Datei und dem Code aus der Authenticator-App prüfen. `/api/health` und Admin-Startseite testen. Der Zugang ist bis dahin vorbereitet, nicht als funktionierend verifiziert. Vorheriger Aufruf von `/login` lieferte HTTP 500.

Funktionen mit Worker/Dateispeicher brauchen weiterhin den späteren Betriebsaufbau. Die Datenbankrolle ist absichtlich nicht für Migrationen oder die erstmalige pg-boss-Schemaerstellung vorgesehen.

## Diagnose nach dem neuen Deploy

Deploy `6adcf8689563a03408a5c61f` ist ready/veröffentlicht. `/login` HTTP 200, `/api/health` HTTP 503. Fehlerprotokoll bestätigt weiterhin `ECONNREFUSED 127.0.0.1:5432`. Netlify-Tool meldet Upsert erfolgreich, aber direktes Readback liefert auch nach Versuch mit explizitem Produktionskontext eine leere Liste. Die frühere Aussage, die Laufzeiteinstellungen seien eingerichtet, ist daher nicht verifiziert und für die aktuelle App widerlegt. Kein weiteres blindes Redeploy empfehlen.

Private Importdatei `data/exports/netlify-admin.env` für Netlify-Umgebungsvariablen vorbereitet. Enthält Secrets, nicht ins Git oder ins öffentliche Websitepaket. Nach echtem Import und Redeploy muss die Datenbankverbindung getestet werden; eventuell ist weiterhin ein IPv4-Poolerhost erforderlich.

## Bestätigte Folgeursache

Nach Import und Deploy `6adcfb949232e1ed8d3aa4ba` zeigen die Netlify-Logs nun
`getaddrinfo ENOTFOUND db.nfecpmamgrcgnnyulioy.supabase.co` statt localhost.
Die DATABASE_URL wird somit übernommen; die direkte Verbindung funktioniert aus dieser
Netlify-Laufzeit nicht. Laut aktueller Supabase-Dokumentation ist der direkte Host standardmäßig
IPv6, der gemeinsame Supavisor-Pooler unterstützt IPv4. Benötigt wird der tatsächlich dem Projekt
zugeordnete Host aus Supabase → Connect → Session pooler. Die verfügbaren Connector-Tools
liefern diese Zuordnung nicht. Keinen Poolerhost raten, keine TLS-Prüfung deaktivieren,
kein kostenpflichtiges IPv4-Add-on buchen. Benutzer muss lediglich den Pooler-Host mitteilen,
kein Datenbankpasswort. Danach DATABASE_URL mit vorhandener dedizierter Rolle und
Benutzername `seitenwerk_admin_backend.nfecpmamgrcgnnyulioy` anpassen, neu deployen und Login
prüfen. Bisher weiterhin nicht als funktionsfähig bestätigt.

## Pooler eingestellt

Betreiber hat den projektbezogenen Session-Pooler bestätigt:
`aws-0-eu-west-1.pooler.supabase.com:5432`. DATABASE_URL lokal und in Netlify auf diesen
Host mit bestehender Rolle `seitenwerk_admin_backend.nfecpmamgrcgnnyulioy` und
`sslmode=verify-full` geändert. Connector meldete zwar HTTP 422, anschließendes Readback
bestätigt jedoch den korrekten neuen Wert in production/dev/branch-deploy/deploy-preview.
Nicht blind wiederholen. DRY_RUN weiterhin true. Ein neuer Deploy ist zur Aktivierung nötig;
Datenbankverbindung und Login sind erst danach prüfbar. Keine Login-Funktion behaupten.

## TLS-Korrektur nach Pooler-Deploy

Deploy `6add22d61291d2b9a491c6ad` ready, Loginseite 200, Health 503, Startseite 500.
Netlify-Logs bestätigen jetzt `SELF_SIGNED_CERT_IN_CHAIN`: Pooler erreichbar, aber
Supabase-CA nicht im Node-Truststore. Öffentliche Supabase Root 2021 CA aus dem offiziellen
Download geladen (SHA-256 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA,
Ablauf 26.04.2031). `packages/core/src/db/client.ts` ergänzt diese CA ausschließlich für
exakte Supabase-Hostmuster. `rejectUnauthorized: true`, normale Hostnamenprüfung bleibt an.
URL-SSL-Parameter werden in diesem Fall entfernt, damit pg die CA nicht überschreibt.
Optional eigene CA über DATABASE_SSL_CA; Neuanlage dieser Variable per Connector wurde
nicht zurückgelesen, deshalb veröffentlichte Supabase-CA direkt im Backendcode hinterlegt.
Andere Datenbankhosts behalten ohne eigene CA das bisherige Verhalten.

Lint, Core-Typecheck und isolierte Konfigurationsprüfung mit pg.Client bestanden, ohne
Datenbankverbindung oder Schreibtests. Änderung gezielt als einzelner Datei-Commit
`ab1bbdb4ff66024337fb4014b1e4a735507bb0d2` über GitHub-Connector auf dem bestehenden
Netlify-Branch veröffentlicht; andere lokale Änderungen nicht veröffentlicht.
Neuer Deploy und anschließende echte Verbindung/Login noch ausstehend.

## Zugang erfolgreich geprüft

Deploy `6add2452c850a2d93bdc4a41`: Datenbankverbindung bestätigt. Browseranmeldung mit
Passwort/TOTP erfolgreich, alle 20 verlinkten Adminbereiche HTTP 200 ohne Application Error.
Unauthentifizierter Aufruf von /admin leitet weiter auf /login. Health HTTP 200, db=true,
weiterhin degraded wegen Dateispeicher, Worker und Backup. Keine Geschäftsaktionen ausgeführt.
Lokale weitere Oberfläche/TLS-Änderungen siehe `docs/admin-modernisierung.md`; noch nicht live.

## Verbindungsabbrüche beim Seitenwechsel

Deploy `6add292170fbc98c90fd1992` veröffentlicht Commit `5d9a2b5`. Logs bestätigen
`EMAXCONNSESSION ... pool_size: 15`: der Session-Pooler ist für die kurzlebigen,
parallel skalierten Netlify-Funktionen ungeeignet. DATABASE_URL auf demselben bestätigten
Supavisor-Host von Port 5432 auf Transaction-Port 6543 geändert. TLS/Benutzer/Passwort
unverändert. Runtime-Änderung benötigt neuen Deploy. Späteren langlebigen Worker separat
planen (Migrationen/Queue-Initialisierung nicht unbesehen über Transaction-Pooler).
