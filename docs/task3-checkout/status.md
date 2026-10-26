# Aufgabe3 – Vertrauen, Demo und bestehender Hosted Checkout

26.10.2026. Ausgangscommit f50d533, Branch codex/conversion-v4, zu Beginn sauber.
DRY_RUN=true, kein Push/Deploy, keine realen Zahlungen/Briefe/Domainkäufe. Vorhandene Task1/2-Arbeit erhalten.
Bestehende Stripe-Sandbox heißt Website sandbox, Connector bestätigt livemode=false; Runtimeumgebung hat
keine konfigurierten Secrets. Mock-/Fake- und echte Providerprüfungen getrennt dokumentieren.

Pakete:

1. Bestehende Demo-/Kaufstrecke und Rechts-/Preis-/Anbieterzustände prüfen, Vorher-Aufnahmen sichern.
2. Geliefertes blaues Logo als SeitenWerk-Marke auf Anbieteroberflächen/Print verwenden; Kundenmarken behalten.
3. Kompakte mobile Demo-/Angebotsdarstellung, klare Leistungen, Mitwirkung und Schritte bis Go-Live.
4. Abbruch mit Tarifbezug, korrekte Processing-/Erfolgstexte, keine falschen Sicherheits-/Garantiesiegel.
5. Nebenläufige Klicks, fehlerhafte/späte/mehrfache Events, Rechnung/Onboarding im bestehenden System prüfen.
6. Mindestens10 Branchenfälle lokal Ende-zu-Ende, echte Screenshots320/360/390/430/1440 und gedrosselte Messung.
7. Lokale Regressionen, Typen/Lint/Build, Bericht/ZIP/Commit. Externe Sandbox- und Rechtsblocker ehrlich aufführen.

Erste Befunde: startHostedCheckout prüft Session-Wiederverwendung außerhalb einer Sperre (Race prüfen).
Cancel-URL verliert Tarif. Context ordered bündelt paid/processing; Oberfläche behauptet für beides bereits
versendeten Onboarding-Link. PublicShell verspricht pauschal TLS mit Schloss. Lange gemeinsame Demo-
Frage-/Beispielabschnitte und Preis-/Garantieformulierungen prüfen. Logo ist im Chat sichtbar, Originaldatei
nicht im Uploadverzeichnis vorhanden; Assetbereitstellung noch offen. Keine neue Anwendung/DB/Checkoutarchitektur.

## Zwischenstand der Umsetzung

Logo als transparente PNG-Ableitung der gelieferten Chatvorlage vorhanden; kein Original-SVG verfügbar.
Anbieterlogo in Firmenheader/-footer, Login/Admin, PublicShell, Demo-Anbieterleiste und Angebot,
HTML-Fehlerseiten, Brief, Rechnung und Bestellmails eingebunden. Kundenmarken unverändert.
Gedruckte Gerätekomposition aus Aufgabe2 unverändert; kein gestrecktes neues Gerätebild.

Race tatsächlich reproduziert: drei simultane Hosted-Klicks erzeugten drei Bestellungen. Bestehende
Lead-Zeilensperre + durchgereichte Transaktion beheben dies ohne neue Tabelle/Migration/Checkout.
Abbruch enthält erlaubten Tarif, Processing separat; keine Onboarding-Erfolgsaussage vor Zahlung.
Nur gewählter V4-Tarif in Checkout-Beschreibung. Keine pauschalen TLS- oder unbestätigten V4-Garantiesiegel.
Starter-Anbieteridentität auf Demo/Checkout/QR/Onboarding/Vorschau über vorhandenen Sanitizer entfernt.

Regulärer Build inkl. Worker bestanden (7 bekannte dynamische Dateitracing-Warnungen). Zunächst
Turbopack-EPERM aus eingeschränktem Lauf; cache unverändert unter /tmp/seitenwerk-task3-turbopack-cache-preserved
aufbewahrt, danach regulärer Build mit lokalen Portrechten bestanden. Keine Buildkonfiguration geändert.
TypeScript/Lint bestanden.70 Core-Tests in9 Dateien und102 Template-Tests bestanden.
Produktions-Browserlauf läuft noch: eigene DB wbm_task3_e2e auf127.0.0.1:15432, Web3210/Worker3211,
E2E_PRODUCTION=true, alle7 Provider mock, DRY_RUN=true. Vorheriger Entwicklungsserverlauf durch
Quelländerung/HMR unterbrochen; keine Endabnahme daraus ableiten. Erster Produktionslauf meldete
legitim noch nicht geladene Offscreen-Lazy-Bilder als Fehler; Test zählt nun echte/viewportnahe Fehler getrennt.

Stripe-Connector bestätigt lesend exakt3 aktive EUR-Sandbox-Preise (livemode=false):59700/1900/9900Cent.
Keine Kontomutation, kein Stripe-Logo-Upload, keine tatsächliche Stripe-Testzahlung. Runtime enthält
keinen gebundenen Sandbox-Schlüssel/Webhook; spätere Ende-zu-Ende-Sandbox-Abnahme bleibt extern offen.
Rechts-/Steuerfreigaben und Live-Key-Sperren unverändert. Noch kein Push/Deploy/Versand.

Automatische Sicherheitsprüfung lehnte das Zurücksetzen einer rein formatbezogenen CSS-Differenz ab,
weil lokale Arbeiten verloren gehen könnten. Diese Bereinigung wurde aufgegeben; ganze Datei erhalten.

## Abschließend VERIFIED – lokaler Stand

Alle oben als laufend bezeichneten lokalen Prüfungen sind abgeschlossen:

- 70 Core-Tests/9 Dateien,102 Template-Tests/2 Dateien bestanden.
- 12 Produktions-Browserprüfungen plus2separate Fehlerzustände bestanden. Zehn Branchen, jeweils5Basis/
  5Care+,320/360/390/430/1440px. Zusätzliche Zustände auf eigener wbm_task3_states_e2e/Port3214.
- Zehn eindeutige bezahlte Mock-Bestellungen und Rechnungen gegen lokale DB abgeglichen; keine Doppelzählung.
- TypeScript, Lint, regulärer Web-/Workerbuild bestanden;7bekannte Tracing-Warnungen bleiben.
- Brief mit neuem Logo tatsächlich gerendert:eine A4-Seite, QR aus PDF korrekt, Adresse/Fenster/Ränder ohne Befund.
  Laptop/Smartphone-Proportionen erhalten. Simulierte Rechnung gerendert. Keine echten Belege versendet.
- Mobile LCP im lokalen gedrosselten Einzelversuch: Demo 0,888 s, Preisseite 1,792 s, Mock-Checkout 1,948 s.
  Kein echter Stripe-/Produktions-CWV-Nachweis. Keine Bildfehler, Layoutüberläufe oder Laufzeitfehler dort.
- Kontaktbögen, vollständige Angebotsansichten, Brief und Rechnung tatsächlich angesehen; keine pauschale
  Premium-Bewertung. Fallback-Texte bleiben sachlich, echte Kunden-/Conversionvalidierung weiterhin offen.

Vollständiger Bericht README.md, dauerhafte Ergebnisse unter evidence/. Galerie und ZIP unter
data/exports/task3-checkout/index.html und data/exports/seitenwerk-aufgabe3-kaufstrecke.zip.
Testbetriebe/Anbieter/Rechnungen ausschließlich fiktiv; siehe explizite Scope-Angaben in JSON/Galerie.

Externe Restpunkte: freigegebene Testlaufzeit mit sicher gebundenem Stripe-Sandbox-Key und Webhook,
komplette echte Hosted-/Monatsabrechnungs-Abnahme, tatsächlicher Stripe-Logo-/Händlerauftritt,
Rechts-/Steuer-/Anbieter- und technische Betriebsabnahme. Keine neue Provider-/VPS-Auswahl erforderlich.
Keine Produktivänderung, kein Push, kein Deploy. Keine Aufgabe 4/5 begonnen.

Letzter sicherer Implementierungscommit: `5e7e7677ff798e97daa74338faddf86a7726f933` auf `codex/conversion-v4`.
Der anschließende Handoff-Commit enthält nur Nachweis-/Dateilistenpflege. Kein Push/Deploy.
