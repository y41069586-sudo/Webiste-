# Aufgabe3 – Vertrauen, Kaufstrecke und Anbieterlogo

26.10.2026. Bestehende V4/V5-App, Ausgangsstand f50d533, Branch codex/conversion-v4.
Nur lokale Änderungen; DRY_RUN=true, kein Push, Deployment, echter Kauf, Versand oder Domainauftrag.
Diese Prüfung ist keine rechtliche oder gestalterische Betreiberfreigabe.

## Tatsächliche Kaufhürden und Änderungen

| Vorher                                                                                                    | Änderung                                                                                                                                                             | Nachweis / Grenze                                                                                                                              |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Drei simultane Hosted-Klicks konnten drei Bestellungen anlegen                                            | Vorhandene Lead-Zeile sperren, Kontext erst danach frisch lesen; alle Abfragen über dieselbe Transaktionsverbindung                                                  | Fehlgeschlagener Vorher-Test: 3 statt 1; danach Legacy/Basis/Care+ jeweils genau eine Bestellung/Sitzung. Provider-Idempotency-Key bleibt erhalten      |
| Abbruch verlor gewählten Tarif                                                                            | Gemeinsame Abbruch-URL für Mock und Stripe enthält nur erlaubten Tarif und springt zum richtigen Demo-Angebot                                                        | Core-Test für beide Tarife; Browser-Abbruch Basis. Hinweis behauptet nicht, ein Abbruch beweise Nichtzahlung                                   |
| Processing und Paid zeigten dieselbe Bestellbestätigung                                                   | Kontext liefert getrennten paymentState; keine E-Mail-/Onboarding-Erfolgsbehauptung bei ausstehender Zahlung                                                         | Processing-Test sperrt zweiten Checkout; bestehende asynchrone Zahlungsfälle erhalten                                                          |
| Gegenwert und Schritte bis Go-Live nur im internen Review erklärt                                         | Kurze Einrichtungs-/Freigabe-Erklärung, sofortige Tarifkarten, aufklappbare Leistungsgrenzen/Ablauf; vorhandene FAQ und schriftliche Kontakte erhalten               | Echte mobile Sichtprüfung: erste erweiterte Erklärung war zu lang, deshalb vor Präsentation gekürzt. Keine neuen Formulare vor Hosted Checkout |
| Unbedingtes TLS-Schloss, Default-Anbieter und pauschale Garantie konnten unbelegtes Vertrauen suggerieren | TLS-Siegel entfernt; bestehender Betreiber-Sanitizer auch für Demo/Checkout/QR/Onboarding/Vorschau; V4-Garantie nur bedingt gemäß vereinbarten Bedingungen           | Starteridentität wird nicht als realer Anbieter ausgegeben. Testangaben ausdrücklich fiktiv. Rechts-/Steuer-/Live-Key-Sperren erhalten         |
| Rückkehr-/Zahlungstexte nannten unpassende Zahlungsarten oder feste Onboarding-Dauer                      | Allgemeine Bestätigung mit Wiederholungsschutz; Inhalte in Ruhe zusammentragen; kein verbindliches Zehn-Minuten-Versprechen auf Erfolgsseite                         | Paid-Return, erneuter Return und Onboarding in bestehender App                                                                                 |
| Verschiedene Provider-Wortmarken und Buchstabenlogos                                                      | Geliefertes blaues Monogramm in Anbieterkopf/-fuß, Login/Admin, Kauf-/Onboarding-Rahmen, Demo-Anbieterleiste, Angebot, Fehlerseiten, Brief/Rechnung und Bestellmails | Transparente PNG-Ableitung aus der Chatvorlage; kein Original-SVG im Workspace. Keine Kundenmarken ersetzt, keine neue Gerätegeometrie         |
| Demo versprach automatische Löschung direkt nach Ablauf                                                   | Präzise: anschließend nicht mehr öffentlich erreichbar                                                                                                               | Bestehendes410-/Retentionverhalten; keine neue Löschfrist behauptet                                                                            |

Die normale mobile Demo bleibt unmittelbar sichtbar. Anbieterleiste hat44px-Bedienelemente, fest definierte
Logogeometrie, getrennte Kundenmarke und sicheren unteren Inhaltsabstand. Aufklappbare Informationen sind
auch ohne JavaScript bedienbar. Kein zusätzliches Kundenkonto, Verkaufsgespräch oder eigenes Bestellformular.

## Preis-, Vertrags- und Datenschutzabgleich

| Punkt             | Tatsächliche Umsetzung / verbleibende Freigabe                                                                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Einrichtung       | Beide Tarife: 59700 Cent aus offers-v4.ts; genau eine Einrichtung im Checkout                                                                                                                                                                                                                 |
| Laufender Tarif   | Basis: 1900 Cent, Care+ insgesamt: 9900 Cent; keine zusätzliche Basisgebühr. Angebotskarten, gewählte Checkout-Beschreibung, Snapshot und laufende Abrechnung stimmen überein                                                                                                                        |
| Monatsbeginn      | Einrichtung im payment-Modus, ausdrückliche Zustimmung und gespeichertes Zahlungsmittel; Monatsabo erst nach bestätigter Zahlung, Zustimmung und Go-Live. Alte manual_checkout-Snapshots behalten kompatiblen zweiten Aboschritt                                                           |
| Kündigung/Wechsel | Monatlich, zum vereinbarten Periodenende; kein neues Zwölfmonatsmodell, keine zusätzliche Subscription beim Wechsel. Vertrags-/Fristfreigabe bleibt erforderlich                                                                                                                           |
| Domain            | Arbeitsfassung: verfügbare Standard-.de-Domain im konfigurierten Jahreskostenrahmen; Default aktuell 15 €. Domain auf Kunden, keine Premiumdomain ohne Zusatzauftrag. Konkrete Betreiberbestätigung und echte Registrar-Abnahme bleiben offen; nicht eigenmächtig auf anderen Betrag geändert |
| Änderungen        | Vorhandene AGB-Arbeitsfassung und Defaultonboarding sehen zwei vereinbarte Änderungsrunden vor. Care+ höchstens 60 Minuten kleiner Inhalte/Monat ohne Übertrag; Zusatzseiten/Umbauten separat. Kein unbegrenzter Support versprochen                                                               |
| Mitwirkung        | Käufer ergänzt tatsächliche Firmen-, Kontakt-, Rechtsdaten, Leistungen und berechtigte Bilder; prüft Vorschau und gibt Veröffentlichung frei. Kein fester Veröffentlichungstermin ohne diese Voraussetzungen                                                                               |
| Steuer            | operatorConfirmed standardmäßig false; keine ungeklärte §-19-Bestätigung erfunden. Demo zeigt offenen Steuer-/Rechtsstand, V4-Live-Key weiter gesperrt                                                                                                                                         |
| Garantie          | Rechtliche Arbeitsfassung sieht freiwillige Einrichtungsgarantie vor; genauer Umfang noch nicht ausdrücklich freigegeben. Keine zusätzliche pauschale V4-Zufriedenheitsgarantie im Angebot/Checkout-Text hinzugefügt. Legacy-Verträge bleiben unberührt                                    |
| Anbieter          | Aus freigegebener privater Konfiguration/OPERATOR_*, keine neuen echten Personendaten im Repository. Fiktive Anbieter im Test sind keine neue echte Firmenidentität                                                                                                                        |
| Datenschutz       | QR-/Funnelarchitektur ohne neue Cookies/Tracker, Beaconfreigabe unverändert. Vertragsfassungen beschreiben Anbieterrollen; AV-Verträge, Übermittlungen, Fristen, Werbeabwägung und Kunden-AV bleiben fachlich freizugeben                                                                  |

Gegenstand des Abgleichs: tatsächliche Servicesorders/recurring/renewals/sites/care-v4/readiness,
Angebotsquelleoffers-v4, apps/web/src/lib/legal-drafts.ts und docs/recht/nachpruefung-2026-10-25.md.
Kein neuer Rechtstextgenerator, kein Anwaltsprüfungs- oder DSGVO-Konformitätssiegel. Ungeklärte Gewerbe-/
Anbieterstruktur und gegebenenfalls Vertretungsberechtigung bleiben vor echten Verkäufen zu klären.

## Prüfungen und visuelle Nachweise

Aktuelle vollständige Ergebnisse und Abschlussstatus stehen instatus.md. Reproduzierbare Prüfdateien:

- Core:checkout-hosted,checkout, conversion-v4,v4-stripe-lifecycle,v4-operations,monthly-refunds,
  refund-confirmation,providers-payment-email,funnel. Bestehende Fake-SDK- und Signaturprüfungen
  sind kein Beweis einer tatsächlichen Stripe-Verbindung oder Zahlung.
- Browser:trust-checkout.spec.ts mit10fiktiven Branchen,320/360/390/430/1440px, QR→richtige Demo,
  CTA→Tarif→Mock-Checkout→simulierter signierter Webhook→Paid/Rechnungsnummer→Onboarding.
  Beide Tarife je 5 Fälle; Rückkehr wiederholbar, keine Laufzeitfehler. Tatsächliche Rechnungs-/
  Zahlungsidempotenz wird zusätzlich in Core geprüft, nicht aus einem sichtbaren Danke-Text abgeleitet.
- Bestehendeconversion-v4.spec.ts prüft zusätzlich abgeschicktes Onboarding, generierte Vorschau,
  Kundenfreigabe, simulierten Go-Live, erst danach aktives Monatsabo, Tarifwechsel und Kündigung.
  Die10Branchenfälle öffnen das korrekt zugeordnete Onboarding; nicht alle10werden bis Go-Live geschickt.
- Gerätebilder aus Aufgabe2 erhalten. Separater Brief-/Rechnungsdruck mit neuem Logo ist ein
  Brand-/Layoutnachweis, keine neue Versandfreigabe und kein echter Rechnungsversand.
- Vorher-Aufnahmen sind unveränderte gespeicherte Aufgabe2-Demos. Nachher sind neue App-Fixtures.
  Der Strukturvergleich ist nachvollziehbar; kein pixelidentischer oder kundenseitig validierter A/B-Test.
- QA-Scores in den vorhandenen E2E-Freigabefixtures sind synthetische Testzustände, keine gemessene
  Gestaltungsbewertung und keine Erlaubnis, echte erste30Demos automatisch freizugeben.

Artefakte: data/exports/task3-checkout/index.html, komplette Bilder unterbefore/after/brand-print,
ZIPdata/exports/seitenwerk-aufgabe3-kaufstrecke.zip. Ausgewählte dauerhafte Belege unter evidence/.
Vollauflösung ist anklickbar. Fixierte Demo-Leiste nur für die lange Angebotselement-Aufnahme ausgeblendet;
reale Handy-Erstansicht und Performancebilder zeigen sie unverändert.

## Echte Stripe-Sandbox und externe Grenzen

Lesend verifiziert: KontoWebsite sandbox,livemode=false, genau3 aktive EUR-Preise:
Setup 59700, Basis 1900/Monat, Care+ 9900/Monat, bekannte V4-Metadaten. Keine Duplikate oder neuen Preise erstellt.
Siehe stripe-readonly.json. Keine Stripe-Kontoeinstellungen geändert und kein Logo hochgeladen.

Die Cloudlaufzeit meldet keine gebundenen Providersecrets. Das beweist nicht, dass im Netlify-Projekt
keine Schlüssel liegen. Ein Connector ist kein Schlüssel für den SDK-Prozess. Deshalb wurde keine
vollständige tatsächliche Stripe-Sandbox-Zahlung dieser Runde ausgeführt und keine solche behauptet.
Die vorhandene Stripe-API-Version2026-09-30.endive/SDK23bleibt erhalten; aktuelle Hosted-Checkout-
Dokumentation wurde konsultiert. Keine neue PaymentIntent- oder eigene Checkoutarchitektur.

Nächste notwendige Schritte, getrennt vom lokalen Abschluss:

1. In einer ausdrücklich freigegebenen Testlaufzeit vorhandenen Sandbox-Key sicher alsSTRIPE_SECRET_KEY
   und zugehörigesSTRIPE_WEBHOOK_SECREThinterlegen; beide nie im Chat oder Git. PAYMENT_PROVIDER=stripe,
   weiterhin DRY_RUN=true und die anderen kostenpflichtigen ProviderMock. Test- und Produktionswerte trennen.
2. Von Stripe erreichbare Test-Webhookadresse zur selben Testinstanz freigeben. Eine neue Testbereitstellung
   oder ein Tunnel benötigt gesonderte Zustimmung; dieser Auftrag erlaubt keinen Deploy. Rückkehr-/Demo-/
   Trackingadressen konsistent zur Testinstanz setzen, TLS und Proxyverhalten prüfen.
3. Mit den bestehenden 3 Preisen Basis und Care+ über den echten Hosted Checkout testen: Karte, Abbruch,
   Fehler, erforderliche Authentifizierung und verspätetes/replayEvent; bestätigte Einrichtung, genau eine Rechnung,
   Onboarding, bestätigten Test-Go-Live und danach erste Monatsrechnung samt Kündigung prüfen. Monatliche
   Testzeitsimulation nur isoliert mit ausdrücklich passenden Sandbox-Fixtures. Keine realen Zahlungen.
4. Betreibername, Support und hochgeladenesSeitenWerk-Logo im echten Stripe-Hosted-Checkout visuell
   abnehmen; heutige Connector-Kontonamensanzeige beweist nicht den sichtbaren Händlertext. Nichts liveändern.
5. Vor echten Verkäufen erst Steuer-/Gewerbe-/Vertrags-/Datenschutz-/Anbieterfreigaben, reale Hosting-/
   Worker-/Storage-/Backup-/Domain- und Mailwege abnehmen. Danach separate Veröffentlichung-/Betriebsfreigabe.

Keine gemessenen Kundeneffekte, keine erfundene Conversion, keine Bewertung„alles9/10“.

## Abschließender lokaler Nachweis

VERIFIED: 70 Core-Tests, 102 Template-Tests, 12 Browserprüfungen im Hauptlauf und 2 zusätzliche
Browser-Fehlerfälle. TypeScript, Lint und regulärer Produktionsbuild einschließlich Worker bestanden.
Keine echte Stripe-Zahlung und kein produktiver Providerauftrag.

| Lokale 390-px-Messung |     LCP |     CLS | Sichtbare Bild-/Laufzeit-/Überlauffehler |
| --------------------- | ------: | ------: | ---------------------------------------- |
| demo                  | 0.888 s | 0.00000 | keine                                    |
| preise                | 1.792 s | 0.02457 | keine                                    |
| checkout-mock         | 1.948 s | 0.00007 | keine                                    |

Chromium, kalter Cache, synthetisch 150 ms RTT / 1,6 Mbit/s / 4-fache CPU-Verlangsamung. Einzelmessung auf
lokalem Produktionsbuild, keine Lighthouse-Punktzahl, kein Perzentil echter Nutzer und keine echte
Stripe-Hosted-Checkout-Ladezeit. `bytes` ist die HTML-Navigationsantwort, kein vollständiger Ressourcenetat.
Eine belastbare Performance-Verbesserung gegenüber der veröffentlichten Website ist nicht nachgewiesen.

Alle zehn fiktiven Branchenfälle besitzen genau eine bezahlte Mock-Bestellung mit genau einer eindeutigen Rechnung,
siehe ledger-check.json. Bilder und technische QA je tatsächlich ausgewählter Vorlage siehe Demo-Matrix.
Angebots- und mobile Kontaktbögen wurden tatsächlich angesehen; keine überlaufenden Tarifkarten oder
vertauschten Anbieter-/Kundenmarken festgestellt. Die bildfreien/fallbacknahen Überschriften bleiben
sachlich; sie sind nicht mit echten Unternehmern gestalterisch oder auf Conversion validiert.

Der neue Logobrief wurde tatsächlich im PDF gerendert und angesehen:eine A4-Seite, richtige Fensteranschrift,
QR aus dem fertigen PDF dekodiert und passendes lokales Testziel bestätigt. Geräteproportionen erhalten.
Die zusätzlich gerenderte Rechnung stammt aus einer ausdrücklich simulierten Bestellung und enthält
fiktive Test-/Steuerdaten; sie ist kein gültiger Nachweis einer echten Rechnung oder Steuerfreigabe.
Der Brief behält die bereits vorhandene Garantie-Arbeitsfassung und ist ausdrücklich nicht versandfreigegeben.

## Geänderte Dateien und Zweck

Vollständige Dateiliste in`changed-files.txt`; keine fremden lokalen Arbeiten verworfen.

- `packages/core/src/services/orders.ts`: atomare Hosted-Wiederverwendung, getrennte Zahlungszustände,
  tarifbezogener Abbruch und nur gewähltes V4-Angebot. `tracking.ts`: optionale bestehende Transaktion
  für Demo-Lookup; keine neue Trackingdatenbank oder Messdefinition.
- `packages/core/src/demos/build.ts`: vorhandener Betreiber-Sanitizer, klare Tarifpunkte/Steuerentwurf,
  bedingte Garantieaussage. `src/index.ts`: bestehende Helfer für Web verfügbar machen.
- `packages/templates/src/partials/shared.ts` und`styles/site.css`: Anbieterlogo, klare Angebotsdarstellung,
  aufklappbare Leistungsgrenzen, mobile Leiste mit 44 px Mindesthöhe, präzise Ablaufkennzeichnung. CSS enthält zusätzlich
  Formatierungsänderungen; abgelehnte Rücksetzung nicht ausgeführt.
- `packages/templates/src/brand*.ts`, `assets/brand`, `apps/web/public/brand` und`components/brand.tsx`:
  lokale PNG-Größen und selbständige Print-/CSP-Einbettung derselben Anbietergrafik.
- `packages/templates/src/letter.ts` und`invoice.ts`, `packages/core/src/emails/templates.ts`:
  proportionaler Anbieterheader; Brief-/Gerätegeometrie, Zahlbetrag und Mailversandlogik erhalten.
- Öffentliche Shell, SiteHeader/-Footer, Root-Metadata, Login/Admin: Markenbild und Favicon.
  Checkout-/Erfolgsseiten: ehrliche Zahlungstexte. QR-/Demo-/Onboarding-/Preview-Seiten: keine
  internen Startkontakte als echter Anbieter. Bestehende statische Exportfunktion kopiert die neuen Public-Assets.
- `apps/web/e2e/seed.ts`, `packages/core/scripts/e2e-seed-demo.ts` und`e2e-offer-version.ts`:
  explizite fiktive Profile innerhalb der bereits vorhandenen lokalen Mock-/DB-Sperren.
- Neue`trust-checkout`, `trust-states`, `trust-performance`: aktuelle lokale Journey-/Fehler-/Drosselnachweise.
  Core-Checkouttests ergänzen echte Nebenläufigkeitsregression und Zahlungszustandsprüfung.
- `scripts/task3-*` und`export-task3-checkout.mjs`: unveränderte Vorher-Belege, reproduzierbarer
  Druck und sichtbare Vergleichs-/Downloadgalerie; keine zweite Anwendung.
- `AGENTS.md` und Handoffs: aktueller Einzelauftrag, Freigabegrenzen und Wiederaufnahme.

## Abschlussstatus

Lokal für interne Prüfung bereit. **Nicht für echte Zahlungen oder Briefe freigegeben.**
Das neue Logo ist im lokalen Quellstand eingebunden; veröffentlichte Netlify-Seiten und Stripe-Account
bleiben unverändert. Vollständige tatsächliche Stripe-Sandbox-Abnahme sowie Rechts-/Steuer-/Anbieter-
und Betriebsfreigaben bleiben offen. Keine Aufgabe 4/5 vorweggenommen.

Lokaler Implementierungscommit: `5e7e7677ff798e97daa74338faddf86a7726f933`. Branch `codex/conversion-v4`.
Die Hosted-Transaktionssperre umfasst die Provideranfrage; Verhalten bei echten Providerlatenzen/Poolergrenzen
ist Teil der noch offenen Sandbox-/Infrastrukturabnahme. Keine Freigabe aus lokalen Tests ableiten.
