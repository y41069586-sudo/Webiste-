# Integrationsstand – 24.10.2026

## Supabase Storage

Privater Bucket `seitenwerk-private`, public=false, Objektgrenze 50MiB, im bestehenden Projekt
angelegt. Keine Browserpolicy ergänzt. Vorhandener S3Storage-Adapter wird wiederverwendet:
S3_ENDPOINT=https://nfecpmamgrcgnnyulioy.storage.supabase.co/storage/v1/s3
S3_REGION=eu-west-1, S3_BUCKET=seitenwerk-private. Diese Werte in Netlify zurückgelesen.

Es fehlen die **S3 Access Key ID und Secret Access Key** aus Supabase → Storage → S3.
Der Connector kann sie nicht erzeugen oder auslesen. Erst nach sicherer Hinterlegung von
S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY darf STORAGE_DRIVER=s3 gesetzt und der Healthcheck
als verbunden bewertet werden. Kein ungesicherter Übergangsspeicher oder öffentlicher Bucket.
Quelle: https://supabase.com/docs/guides/storage/s3/authentication

## Resend

Offizielles SDK resend@6.34.1 exakt im Webpaket, Lockfile aktualisiert. Bestehender Ausgangsprovider
bleibt erhalten. Neuer POST /api/webhooks/resend verifiziert unveränderten Body über SDK/Svix,
prüft Inbox/Empfänger, lädt Text über Provider-API, ignoriert HTML/Anhänge, begrenzt Payload und
Rate. Duplikate über Message-ID. Standard-Receiving und inbox.email.received unterstützt.

Webhook bf95c676-ba5b-4ea5-97b3-3893db045622 angelegt, auf die dynamische Netlify-App gerichtet.
Neue Inbound-API-Berechtigung ist nötig, weil ein reiner Sending-Key keine Nachrichten abrufen kann.
Schlüssel privat unter data/integration-credentials-private.json gesichert, niemals Git.
Der neue API-Key gewährt aufgrund der bei Resend verfügbaren Berechtigungen full_access; ausschließlich
Backend. Bestehender Onboarding-Key nicht ersetzt/gelöscht.

WICHTIG: automatische Sicherheitsprüfung hat ungeschütztes Hinterlegen des Schlüssels in Netlify
abgelehnt. Kein Umgehen. RESEND_API_KEY ist bis zur sicheren Einrichtung nicht hinterlegt. Ein kurzzeitiger
Platzhalter wurde wieder entfernt. Der neue Resend-Webhook ist bis zur sicheren
Konfiguration deaktiviert. Secretkennzeichnung und
Scopes müssen in Netlify ausdrücklich korrekt gesetzt werden, dann Readback ohne Wertausgabe.
RESEND_WEBHOOK_SECRET entsprechend. RESEND_INBOX_ID und RESEND_INBOUND_TO zurückgelesen.
EMAIL_FROM korrekt; EMAIL_PROVIDER=mock bleibt. Keine tatsächliche E-Mail versendet.

Der Supporteingang speichert mit queueProcessing=false direkt zur manuellen Prüfung und startet
weder Queue noch KI. Fremde Mails sind untrusted input, nicht authentifizierte Handlungsanweisungen.
Keine Ausführung, kein eigener Agent mit Werkzeugzugriff, keine automatischen Antworten. Damit kann
der Eingang später auch ohne Worker arbeiten. Bereits vorhandene Mail/Spam-Regeln bleiben erhalten.
Quellen: aktuelles offizielles Resend-SDK und https://github.com/resend/resend-skills/tree/main/skills/agent-email-inbox

## Stripe

Connector liefert ausschließlich `Website sandbox`, acct_1UToabGn2A630LhH, livemode=false.
Bestehender Endpunkt zeigte auf statische Domain; neuer Sandbox-Endpunkt auf
https://seitenwerkworld.netlify.app/api/webhooks/stripe angelegt, gleiche neun bestehende Events,
API2026-09-30.endive passend zum Bestand. Secret privat gesichert. Kein Live-Konto,
keine Zahlung/Erstattung, kein Kunde/Abo/Preis angelegt. Bestehenden Provider/Checkout wiederverwenden.

Für die App fehlt ein echter **Sandbox Restricted API Key** mit den vom bestehenden Code benötigten
Rechten. Über MCP gibt es keinen sicheren allgemeinen API-Key-Export. Keine Dummy-Schlüssel einsetzen.
STRIPE_SECRET_KEY und STRIPE_WEBHOOK_SECRET als geschützte Netlify-Variablen hinterlegen, erst dann
PAYMENT_PROVIDER=stripe im Testbetrieb. DRY_RUN allein sperrt echte Stripe-Keys nicht: Live-Key muss
zusätzlich ausgeschlossen bleiben. Test-/Produktiv-Ereignisse und unerwartete Käufe nicht einspielen.

## Grenzen und nächster Schritt

Code lokal geprüft; neuer Webhookcode muss noch in die App ausgeliefert werden. Konfigurierte
Anbieter-Webhooks allein beweisen keine erfolgreiche Zustellung. Anschließend erst ungültige
Signatur →400, fehlende Konfiguration →503 und nach sicherer Konfiguration echte Inbox-Zustellung
prüfen; keine Anbieter-E-Mail ohne ausdrücklichen Versandauftrag senden.

Steuer-/W-IdNr.-Klärung und offizielle Dienstleister-/Rechtsfreigabe bleiben offen; siehe recht/pruefprotokoll.md.
Demo-Probelauf und Worker ausdrücklich vertagt. Private Schlüsseldateien niemals ins öffentliche ZIP.

Der neu angelegte Stripe-Sandbox-Webhook wurde bis zur sicheren Anwendungskonfiguration ebenfalls
deaktiviert. Resend-/Stripe-Schlüssel sind für den Betreiber in der privaten Datei
`data/exports/integrationen-private-zugangsdaten.txt` abrufbar. Keine Secretwerte in diesem Dokument.

Abschlussprüfungen: ESLint gesamtes Repository, Core-/Web-TypeScript erfolgreich; drei isolierte
Resend-Signatur-/Empfängertests, zwei Rechtstext-/Konfigurationstests, zwei Site-Sicherheitstests
und vier TLS-Konfigurationstests bestanden. Kein Versand, keine Zahlung, kein DB-Reset.
Vollständiger lokaler Next-Build weiterhin nicht erneut als erfolgreich bestätigt.
