# Admin-Oberfläche: Modernisierung

Stand 24.10.2026. Diese Änderungen liegen lokal vor; kein neuer Live-Deploy ausgelöst.

## Umgesetzt

- SeitenWerk-Layout mit fester Desktop-Seitenleiste, vier Navigationsgruppen, lokalem
  Suchfilter und mobilem aufklappbarem Menü. Alle bisherigen 20 Navigationsziele erhalten.
- Neue Übersicht mit Pipelinezahlen aus vorhandenen Daten, Schnellzugriffen und Budgets.
  Systemwarnungen bleiben sichtbar; eingeschränkter Betrieb wird gelb, Ausfall rot dargestellt.
- Eigener Admin-Designbereich in CSS; öffentliche Website nicht umgestaltet.
- Direkte Ladeanzeige für Navigation; keine schweren Animationen und kein blur auf Eingabebereichen.
- Navigationssuche rein lokal, ohne Netzwerkzugriff pro Zeichen. Bestehende Formulare bleiben
  unkontrollierte Eingaben, keine automatische Speicherung pro Tastendruck.
- Prefetch der 20 Navigationsziele deaktiviert, um unnötige parallele Seitenabfragen zu vermeiden.
  Das kann den ersten Aufruf eines Bereichs langsamer machen; loading.tsx zeigt den Wechsel an.
- React cache bündelt doppelte Sitzungsprüfungen nur innerhalb einer Serveranfrage, keine
  benutzerübergreifende Sessionzwischenspeicherung.
- Gemeinsame TLS-Konfiguration für Drizzle und pg-boss, einschließlich der Supabase-CA und
  Zertifikatsprüfung. Kein Worker gestartet, keine Queue initialisiert.

## Prüfungen

- Live vor der Modernisierung: Login mit Passwort/TOTP erfolgreich; 20 verlinkte Adminseiten
  HTTP 200 ohne Application Error. Health: db=true, degraded wegen Speicher/Worker/Backup.
- Lokal: ESLint und Web-/Core-TypeScript erfolgreich. Vier isolierte TLS-Konfigurationstests
  erfolgreich, keine Datenbankverbindung oder DB-Reset.
- Browser mit isolierten Fixtures: tatsächliche Layout-/Seiten-/Navigationskomponenten gerendert.
  Desktop 1440px, Tablet 820px und Handy 390px ohne horizontalen Überlauf. Mobiles Menü,
  Suchfilter und Suche ohne Treffer erfolgreich geprüft. Keine Live-Daten im Vorschaubild.
- Vollständiger Produktionsbuild nicht erfolgreich bestätigt: Turbopack kann in dieser Umgebung
  seinen lokalen Port nicht binden; Webpack-Fallback scheitert am bestehenden Playwright-Bundling
  (optionale electron/chromium-bidi-Module). Keine neuen Abhängigkeiten installiert oder diese
  bestehenden Build-Grenzen durch Dummy-Module verdeckt.
- Keine Aussage über gemessene Verbesserung der Eingabelatenz auf dem echten iPad. Ein
  Vergleich dort nach dem späteren Deploy bleibt erforderlich.

## Weiterhin offen

Dauerhafter Dateispeicher (vorhandene S3-Schnittstelle weiterverwenden), Queue-/Workerbetrieb
und Wiederherstellungstest eines Backups. VPS weiterhin später. Resend-Inbox vorhanden, die
Anwendung nutzt noch Mock-E-Mail; bestehender Inbound-Webhook erwartet Postmark/generisches JSON,
kein ungeprüftes direktes Anstecken von Resend-Events. Stripe/DNS beim Betreiber. Rechtstextarbeit
pausiert; Freigabesperren und DRY_RUN bleiben erhalten.

## Veröffentlichung beauftragt

Betreiber hat „Deploy“ ausdrücklich freigegeben. Alle elf vorgesehenen Dateien als atomarer
Commit `5d9a2b5633fc49808f22ce6878b599d3bb4e248e` auf
`claude/website-brief-maschine-0d0s37` veröffentlicht, mit geprüftem Vorgänger `ab1bbdb`.
Andere lokale Firmenwebsite-/Rechtstextänderungen nicht übertragen; keine Secrets enthalten.
Remote per git fetch bestätigt. Noch kein neuer veröffentlichter Netlify-Deploy bestätigt;
zuletzt weiterhin `6add2452c850a2d93bdc4a41`. GitHub-Status bisher leer. Der Netlify-Connector
hat keine Start-/Retry-Build-Funktion; falls Git-CD nicht auslöst, ist Trigger deploy → Deploy site
im bestehenden Projekt nötig. Nicht als live behaupten.
