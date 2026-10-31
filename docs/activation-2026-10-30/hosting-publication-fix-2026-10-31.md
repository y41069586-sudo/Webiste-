# Fehlgeschlagener Kunden-Abnahmelauf: Veröffentlichung

Der Betreiber hat den regulären Worker am31.10.2026 neu gebaut. Der gezeigte Abnahmelauf
scheitert bei Basis nach zwölf `dns_https_pending`-Versuchen. Kein bestätigter Monatsstart;
Care+ wird in diesem Lauf noch nicht erreicht. DRY_RUN=true bleibt bestehen.

## Tatsächlich nachgeprüft

- Netlify-Testprojekt `777d37ed-d57d-4543-9935-95455feda432`, aktueller Deploy
  `6ae599e31a350f5a0b1c6b35`, ready.
- `https://basis-test.seitenwerk.world/` und dessen netlify.app-Adresse liefern tatsächlich HTTPS200.
  Zertifikatsprüfung des HTTP-Clients nicht abgeschaltet.
- Gespeichertes `live-v1.html` über regulär angemeldeten bestehenden Admin-Dateidownload gelesen:
  102481Bytes, SHA256 `bf6d1506686650f2b9be39815d02b315a6ca72fa67f95da3605743e7137f7671`.
- Öffentlich ausgeliefertes HTML: 102473Bytes, SHA256
  `453df62e0350045f7056383a6db9de4b8c7dded04352d332611c41a5a6785685`.
- Die zwei betroffenen Links: `impressum.html` → `/impressum` und `datenschutz.html` →
  `/datenschutz`; jeweils zusätzlich geänderte Attribut-Anführungszeichen. Sonstiger Inhalt
  unverändert. Das entspricht Netlifys dokumentiertem Pretty-URLs-Postprocessing.
- Separater Codefehler: `getDomainStatus` verwendete POST statt GET für jede Statusprüfung.
  Die aktuelle API dokumentiert für das erneute Anlegen eines bestehenden Zertifikats422.
  Die tatsächliche API-Antwort des Worker-Kontos wurde hier nicht gelesen; dieser Teilbefund
  beruht auf Code und offizieller Spezifikation, nicht auf einem behaupteten Produktions-API-Trace.

## Korrektur

Der bestehende Netlify-Adapter deaktiviert Pretty URLs vor dem Deploy, auch bei bereits
vorhandenen Testprojekten. Gespeichertes und ausgeliefertes HTML sollen identisch bleiben;
der Abnahmelauf vergleicht weiterhin den vollständigen SHA256-Hash ohne Ausnahmen.

Die Zertifikatsprüfung liest das bestehende Zertifikat. Noch nicht ausgestellte, abgelaufene
oder nicht zur Domain passende Zertifikate bleiben gesperrt; eine erfolgreiche
Bereitstellungsanfrage allein reicht nicht. Berechtigungsfehler werden sichtbar weitergegeben.

Der vorhandene CLI-Abnahmelauf zeigt bei ausstehender Veröffentlichung getrennt Hostingstatus,
SSL-Status, HTTP-Status, Inhaltsgleichheit und Fehlerklasse. Keine HTML-Inhalte, privaten
Kundenlinks oder Zugangsdaten im Protokoll. Monatsstart weiterhin erst nach Browserprüfung,
Root-Vergleich und normalem Live-Check; kein manuelles Setzen eines Go-Live-Zeitstempels.

## Lokale Prüfungen

- 49 gezielte Core-Tests bestanden:20 Hosting/Registrar,3 CLI-Schutzprüfungen,9 Onboarding,
  11 V4-Stripe-Lifecycle und6 Stripe-Modus-/Preisprüfungen. Darunter14 neue Adapterfälle für
  den konkreten Fehler und die beibehaltenen Sperren. Externe Provider in diesen Tests simuliert.
- Vollständiger Workspace-Typecheck, Lint und Produktionsbuild einschließlich Worker bestanden.
  Die sieben bekannten Turbopack-Dateitracing-Warnungen bleiben; kein Buildfehler.
- Isolierte lokale Datenbank `wbm_hosting_test`, keine Produktions-/Supabase-Testresets.
  Im ersten Lauf fehlte die erwartete Playwright-Browserdatei; nach Auswahl des vorhandenen
  `/usr/bin/chromium` bestanden auch die drei betroffenen Browser-/Onboardingfälle.
- Zwei Browser-E2E gegen den Produktionsbuild bestanden (mobile V4-Tarif-/Zustimmungsstrecke,
  Monatsstart vor Go-Live gesperrt, öffentliche Preise). Getrennte lokale Datenbank
  `wbm_hosting_e2e`, Port3180, alle externen Provider simuliert.
- Lesender tatsächlicher Datenbankabgleich bestätigt weiterhin: Basis deploying, Care+ onboarding,
  beide payment_mode=test, beide ohne live_at, billing_started_at und Subscription-ID.

## Noch zu bestätigen

Die Änderungen betreffen Core-Code im Worker-Image. Der eben durchgeführte VPS-Neuaufbau lag
vor dieser Fehlerkorrektur; ein aktualisiertes Image ist deshalb erforderlich. Vorhandene
Secrets bleiben erhalten, kein NEU=1, LIVE=0. Danach denselben begrenzten bestehenden
Sandbox-Abnahmelauf ausführen. Tatsächliche Veröffentlichung und beide Monatsstarts werden
erst nach diesem Lauf sowie Datenbank-/Stripe-Readback als bestanden gewertet.

Keine Live-Zahlung, Domainbestellung, weitere Testmail oder Briefsendung ausgelöst. Keine
allgemeine Provider-/Versand-/Vertragsfreigabe. Die offene Spam-Einstufung bleibt dokumentiert;
der Betreiber hat weitere Diagnosefragen dazu vorerst beendet.
