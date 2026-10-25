# SeitenWerk – Conversion-Optimierung V4

> Historischer Prüfstand vor der V4/V5-Fortsetzung. Aktuell gelten [V5-Qualitätsprüfung](v5-quality-pruefung.md), [Go-Live-Checkliste](v5-go-live-checkliste.md) und [Handoff](v4-quality-handoff.md). Insbesondere sind neuer Mandatsstart, Tarifwechsel/Care+/Kostenoberflächen, Korrekturbelege, Worker/Queue/Restore und zehn Demo-Render inzwischen ergänzt. A wurde wegen eines falschen Fertig-Versprechens korrigiert und ist kein unveränderter Kontrolltext. Alte offene Punkte und Testergebnisse unten nicht als heutigen Status lesen.

Stand: 25.10.2026. Entwicklungszweig `codex/conversion-v4`, Basis `fbff0cc` aus dem bestehenden Projekt. Dieser Stand ist **nicht live**. Bestehende ungesicherte Änderungen im ursprünglichen Arbeitsverzeichnis wurden durch ein eigenes Worktree erhalten. Auftrag: `master-implementation-v4.md`, ergänzt um den ausdrücklich beauftragten Stripe-Sandbox-Katalog und blaues Branding.

## 1. Umgesetzte Änderungen

Bestehende Next.js-/Core-/Drizzle-/pg-boss-Architektur erweitert. Keine zweite Anwendung, kein zweites Auth-System, kein neuer Datenbankanbieter. Neue versionierte Angebote mit Bestell-Snapshot, sichere zweistufige Checkout-Strecke, Kunden-/Admin-Tarifanzeige, Rechnungstexte, Branchenbriefe und zusätzliche tatsächliche Finanzzahlen. Plakatvorlagen bleiben registriert. Kein persönliches Betreiberfoto.

## 2. Neues Preismodell

| Tarif | Einrichtung beim Kauf | Monatlich nach Go-Live und Aboabschluss | Rechnerisch erstes volles Betriebsjahr |
| ----- | --------------------: | --------------------------------------: | -------------------------------------: |
| Basis |                 597 € |                          19 € insgesamt |                                  825 € |
| Care+ |                 597 € |                          99 € insgesamt |                                1.785 € |

Die Jahreswerte setzen zwölf berechnete Monate voraus und sind keine Vorauszahlung oder Mindestlaufzeit. Care+ enthält die Basisgebühr; niemals 19 + 99 Euro. Steuerstatus ungeklärt; keine Umsatzsteuerbefreiung oder endgültige rechtliche Freigabe behaupten. Zentrale Preisquelle: `packages/core/src/services/offers-v4.ts`.

## 3. Leistungsumfang Basis

Website auf Grundlage der vorhandenen Demo, bestätigte Betriebsangaben, Responsive Design, technische Einrichtung, Standard-Domain im vorhandenen technischen Kostenlimit von standardmäßig 15 €/Jahr (Vertragsabgleich noch nötig) und zwei Änderungsrunden vor Veröffentlichung. Monatlich Hosting, SSL, technische Bereitstellung und Basis-Support bei Betriebsstörungen. Keine pauschal unbegrenzten Inhaltsänderungen und keine unbelegte Verfügbarkeitsgarantie. Erreichbarkeitskontrolle und Support müssen vor echtem Verkauf einem verantwortlichen Betreiber und einer tatsächlich laufenden Überwachung zugeordnet sein.

## 4. Leistungsumfang Care+

Basis-Leistungen einschließlich Hosting plus persönlicher Support, monatlicher Technik-Check und höchstens 60 Minuten vereinbarter kleiner Text-/Bildänderungen. Ungenutzte Minuten verfallen. Größere Umbauten nur nach separatem Angebot und Zustimmung. Die vorhandene Änderungs-/Supportqueue wird weiterbenutzt. Automatische Minutenabrechnung, Kostenbuchung und nachgewiesene monatliche Prüfroutine sind noch nicht vollständig vorhanden; keine bereits laufende Erfüllung behaupten.

## 5. Monatsabrechnung ab Go-Live

1. Kunde wählt genau einen Tarif auf der Demo.
2. Hosted Checkout berechnet ausschließlich 597 € im Zahlungsmodus. Das Pflichtfeld bestätigt AGB und den gewählten Monatstarif; Stand und Zustimmungszeit werden gespeichert.
3. Bestehender Onboarding-/Vorschau-/Livecheck-Prozess bleibt bestehen.
4. Erst bezahlte Einrichtung, gültige Zustimmung, nicht beendeter Vertrag und eine tatsächlich als live bestätigte Website mit vergangenem `liveAt` erlauben den separaten Abo-Checkout.
5. Die Übergabemail enthält den privaten Bestätigungslink. Der Kunde bestätigt dort erneut und erteilt sein Zahlungsmittel/Mandat bei Stripe. Das Abo beginnt mit diesem Abschluss, **frühestens nach Go-Live**, ohne rückwirkende Berechnung und ohne fiktiven Trial-Termin.

Das ist die sichere zweistufige Sandbox-Lösung. Sie startet **nicht automatisch sekundengenau mit Go-Live**. Die Zeit bis zur Kundenbestätigung bleibt unberechnet und muss organisatorisch überwacht werden; vor Liveverkauf ist dieser Ablauf verbindlich zu akzeptieren oder durch ein gesondert getestetes SetupIntent-/Off-Session-Verfahren zu ersetzen. Kein Scheduler errät ein Live-Datum.

## 6. Briefvarianten

Je Handwerk, Beauty, Gastronomie, Einzelhandel und Kurse/Training: A bestehende Kontrolle, B Vorschau zuerst, C konkreter Branchennutzen zuerst. B/C verzichten auf Statistiken und behaupten keine zusätzlich recherchierten Firmenfakten. Name/Ort werden aus den jeweiligen Datensätzen eingesetzt. A bleibt bewusst die alte Kontrolle und braucht wie alle Varianten den vorhandenen Wahrheits-Check und manuelle Prüfung.

`letters/conversion-v4.ts` enthält die Kandidaten. Das lokale Seed legt 15 Kandidaten mit `status=paused`, `active=false` an; vorhandene aktive Quoten bleiben unverändert. Produktionsdaten wurden nicht angefasst. Ein fiktives Review-Protokoll mit 40 Einträgen setzt bei jedem Eintrag `send=false` und `requiresManualReview=true`. Das ist kein Versandauftrag, keine echte Adressliste und kein statistisch belastbarer Testsieger.

## 7. PDF-Design

Vorhandenes blaues A4-/DIN-5008-Layout und eingebettete Inter-Schrift erhalten, Absatzabstände geringfügig gestrafft, damit lange Texte und Fußnoten sauber passen. Schriftgröße, Anschriftenfenster und QR-Größe von 41 × 41 mm nicht verkleinert. Echte Render-Screenshots der fiktiven Demo werden eingebettet; keine frei erfundenen Produktbilder. Kurz-URL ergänzt den QR. Browser-Netzwerk für die lokalen Vorschauen blockiert.

Beispiele und Prüfdateien unter `data/exports/conversion-v4/` (absichtlich ignoriert): `brief-handwerk-1.pdf` bis `brief-kurse-3.pdf`, fünf mobile Screenshots/HTML-Dateien, `checks.json`, `pdf-layout-checks.json` und `startcharge-40-fictional.json`. Reproduktion aus dem Repository-Root: `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium packages/core/node_modules/.bin/tsx scripts/preview-conversion-v4.mts`, anschließend `packages/core/node_modules/.bin/tsx scripts/check-v4-pdfs.mts`. Lokal installierten Chromium-Pfad gegebenenfalls anpassen. Zusätzliche HTML-/Axe-/Layoutprüfung der fünf generierten V4-Demos: `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium packages/core/node_modules/.bin/tsx scripts/check-v4-demos.mts`.

## 8. Änderungen an Demos

Vorhandene persönliche Entwurfskennzeichnung, Firmenname, noindex, Musterkennzeichnung und Kontaktwege erhalten. Übernahmebereich mit „Gefällt Ihnen Ihre neue Website?“, zwei Tarifen, klaren CTAs „Mit Basis übernehmen“/„Mit Care+ übernehmen“, Jahreskosten und elf vertragsbezogenen FAQs. Kein vorgewähltes Care+, keine Kundenregistrierung, keine Fakebewertungen, keine Kundenlogos und kein Betreiberfoto. WhatsApp bleibt freiwilliger Link. Öffentliche Preise und Admin-Einstellungen zeigen den gleichen V4-Stand.

## 9. Stripe-Checkout

Über das Stripe-Plugin tatsächlich angelegt und zurückgelesen, ausschließlich `Website sandbox`, `livemode=false`:

| Komponente  | Stripe-Preis                     |              Betrag |
| ----------- | -------------------------------- | ------------------: |
| Einrichtung | `price_1UULWxGn2A630LhHdvSaUslJ` | 59700 Cent einmalig |
| Basis       | `price_1UULX3Gn2A630LhHDA6Or60k` |     1900 Cent/Monat |
| Care+       | `price_1UULX8Gn2A630LhH0F3MgcLP` |     9900 Cent/Monat |

Produkt-/Preisreferenzen liegen in `config/stripe-v4-sandbox.json`, ohne API-Schlüssel. Der vorhandene Stripe-Provider benutzt diese IDs, prüft Betrag und Währung und blockiert V4 mit Live-Key. Keine dynamischen Duplikatprodukte beim V4-Checkout. Der gewählte Tarif und sein genauer Monatsbetrag stehen zusätzlich ausdrücklich am Pflichtfeld und über dem Zahlbutton, weil beide Tarife denselben Einrichtungspreis benutzen. Legacy bleibt bei seinem bisherigen Ablauf.

Branding über Plugin gespeichert und zurückgelesen: Blau `#1F4FD8`, Hintergrund Weiß, Schrift Inter, weiße Buttonschrift. Kein erfundenes Logo hochgeladen. Keine Kunden, Sessions, Subscriptions, Belastungen oder Erstattungen über den Connector angelegt. Steuerverhalten bleibt `unspecified`; Stripe Tax nicht aktiviert. Produktionsprovider, Secrets, DNS und Webhooks nicht verändert.

Aktuelle offizielle Stripe-Doku am 25.10.2026 über Plugin geprüft: [Checkout/Preise](https://docs.stripe.com/api/checkout/sessions/create), [monatliche Zahlungen und SEPA](https://docs.stripe.com/billing/subscriptions/sepa-debit), [Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks). Vorhandenen stripe-node 23.0.1/API 2026-09-30.endive erhalten; kein unkontrolliertes SDK-Upgrade.

## 10. Abo-, Wechsel-, Kündigungs- und Erstattungslogik

Separater Abo-Checkout pro Auftrag durch Zeilensperre und stabilen Idempotency-Key geschützt. Offene Stripe-Session wiederverwenden; abgelaufene Session kontrolliert erneuern. Bereits abgeschlossene oder nicht sicher prüfbare Sessions blockieren einen zweiten Abschluss. Rechnungs-/Checkout-Webhook-Reihenfolge berücksichtigt, Rechnungen idempotent über Provider-Rechnungs-ID. Betrag, Währung und Vertragszuordnung werden geprüft. V4 wird im Admin mit Snapshot, Zustimmung und einem einzigen Monatsabo angezeigt.

Tarifwechsel sind als bestätigte Vorbereitung zum nächsten Periodenende ohne Proration modelliert (`prepareV4Switch`); noch kein automatischer Stripe-Update-Button. Kündigungsereignisse verwenden vorhandene Vertrags-/Supportprozesse; Domainübertragung bleibt manuelle Aufgabe. Die vorhandene Garantieerstattung berücksichtigt auch das V4-Abo. Keine Erstattung wurde tatsächlich ausgelöst. Neue V4-Garantiefrist wird erst beim bestätigten Go-Live gesetzt; alte Fristen bleiben unberührt. Verbindliche Frist-, Erstattungs- und Kündigungsregeln müssen vor Liveverkauf rechtlich und betrieblich freigegeben werden.

## 11. Lead-Scoring

Bestehender Lead-Finder, Dubletten-, Branchen-, Ketten-, Widerspruchs- und Websitefilter bleiben erhalten. V4 priorisiert vollständige Quellenanschrift, als geöffnet gemeldeten Betrieb, Social-only-Adresse und Kontaktdaten. Branchengewicht bleibt. Gründe inklusive Punkten und Quelle/Unsicherheit werden gespeichert und im bestehenden Lead-Detail gezeigt. „Keine eigene Website in der Quelle“ gilt ausdrücklich als manuell unbestätigt, nicht als bewiesene Nichtexistenz. Keine erfundenen Umsätze, Zahlungsbereitschaft oder Bewertungssummen als Finanzsignal. Legacy-Score bleibt verfügbar. Erste 30 Demos weiterhin manuell.

## 12. Tracking und Wirtschaftlichkeit

Engagement-Beacon standardmäßig aus; selbst ein alter DB-Wert `true` wirkt ohne `ENGAGEMENT_TRACKING_APPROVED=true` nicht. Keine Marketingdienste oder neuen Cookies eingeführt. Bestehende serverseitige Ereignisse und Opt-out bleiben. Die neue Ablaufübersicht zeigt 17 Betriebsstufen mit ausdrücklich benannten Zähleinheiten; sie ist keine Kohorte. Tarifbereich ohne Freigabe heißt „Nicht gemessen“, nicht 0. Historisch fehlende Nachweise werden nicht erfunden.

Finanzkarte trennt bezahlte Erstzahlungen, vereinnahmte Monatsrechnungen, Erstattungen, bekannten aktiven V4-MRR und Care+-Anteil an V4-Käufen. MRR ist kein Geldeingang. Alter geschätzter Vertragswert wird ausdrücklich als Legacy-Wert bezeichnet. `contributionV4` kann echte Kosten einschließlich geleisteter Care+-Zeit verrechnen; solange vollständige Hosting-/Domain-/Zahlungs-/Zeitkosten fehlen, zeigt das Dashboard keinen fingierten Deckungsbeitrag. Vollständige Kosten-/Zeitdatenerfassung und V4-Attribution pro Versuchsarm sind noch offen. 40 Briefe oder erste Verkäufe reichen nicht für belastbare Gewinnerbehauptungen.

## 13. Sicherheitsvorkehrungen

DRY_RUN=true, automatische Sendungen/Antworten/Optimierung/Aktivierungen aus, kein echter Versand, keine Produktionsmigration, kein Live-Deployment. Tests nur in lokalen, ausdrücklich benannten test/e2e-Datenbanken; destruktive Testsetups haben Host-/Namensschutz. Alle Testanbieter Mock, Stripe-SDK-Tests mit Fake-HTTP statt echten API-Aufrufen. Bestehende Admin-Authentifizierung und CSRF-/Webhook-Signaturprüfung erhalten. Private Dateien/Rechnungen nicht öffentlich machen.

Persönliche Betreiberangaben aus öffentlichen Source-/Dokumentationsdateien entfernt; private DB-Daten nicht überschrieben. OPERATOR_*-ENV oder vorhandene private Einstellungen verwenden. Dies redigiert aktuelle Arbeitsdateien, löscht aber keine bereits veröffentlichte Git-Historie und rotiert keine alten Schlüssel. Keine Secrets in Katalog oder Beispielen.

## 14. Auswirkungen auf bestehende Kunden

Legacy-Bestellungen behalten ihren Plan, Betrag, Rechnungssnapshot, Mindestlaufzeit und bisherigen Stripe-Zeitplan. Kein Update existierender Stripe-Abos. Neue nullable Spalten (`0011_conversion_v4.sql`, `0012_lead_priority_v4.sql`) verändern alte Datensätze nicht. Nur lokal migriert; Supabase unverändert. Bestehende Regressionstests wählen Legacy ausdrücklich, V4-Tests aktivieren V4 separat. Vor dem späteren Rollout Backup/Restore und Migrationsprüfung nötig.

## 15. Testergebnisse

Erster Lauf ohne lokal eingetragenen Chromium und ohne versionierte Legacy-Testfixtures scheiterte; nicht als Erfolg gewertet. Zweiter vollständiger Core-Lauf: 381/386 bestanden, fünf konkrete Fehler anschließend korrigiert; gezielter Nachlauf dieser Bereiche inklusive V4: 30/30 bestanden. Vollständige Browser-Template-Matrix in diesem Lauf bestanden. Weitere abschließende Prüfungen siehe Abschlussvermerk unten.

## 16. Noch offene Fragen und betriebliche Aufgaben

- Offizieller Steuerstatus, gegebenenfalls bereits zugeteilte W-IdNr.; keine persönliche Steuernummer öffentlich ergänzen.
- Vorhandenes technisches Standard-Domain-Limit (standardmäßig 15 €/Jahr) und Sonderdomainfreigabe vertraglich bestätigen.
- Zustimmung zum zweistufigen Abostart; unbezahlten Zeitraum zwischen Go-Live und Abschluss überwachen.
- Durchführbarer Care+-Support-/Prüfprozess, echte Zeit- und vollständige Kostenbuchung.
- Abnahme der 15 pausierten Briefkandidaten samt tatsächlichen Daten/Fristen/Claims vor Auswahl für echte Charge.
- Worker/Chromium-Dauerbetrieb bleibt später; Netlify allein führt keine langlebige Workerqueue aus.
- Backup mit nachgewiesenem Restore, Monitoring, Retention und Opt-out-Prüfung im realen Betrieb.
- V4-Auswertung pro Experimentarm, persistierte Wechselanfragen und vollständige automatisierte Tarifwechsel gesondert umsetzen.
- Legacy-E2E-Fixtures behalten ihre alten Verträge; V4-Spezifikationen schalten gezielt auf V4 und danach zurück. Ein kompletter erneuter Lauf sämtlicher E2E-Spezifikationen (Support, Screenshots usw.) bleibt vor Livebetrieb nötig.

## 17. Erforderliche rechtliche Prüfungen

Eigene V4-AGB-/Datenschutz-/Impressums-Arbeitsfassungen sind keine anwaltlich oder durch einen Generator freigegebenen Rechtstexte. Vor Verkauf: Steuer-/Preisangaben, wirksame B2B-Einbeziehung, wiederkehrende Tarifzustimmung/Mandat, Kündigungsfrist/Periodenende, Domain- und Websiteübergabe, Garantieumfang einschließlich Monatszahlungen, AV-Verträge und Anbietertransfers prüfen. Vor Briefen: Art. 14/21 DSGVO, rechtmäßige Datenquelle, Widerspruch/Löschung, tatsächliche Fristen und Werberecht. Nicht notwendige Demo-Messung erst nach dokumentierter DSGVO-/TDDDG-Prüfung. Keine Freigaben selbst erteilen.

## 18. Go-Live-Checkliste

- [ ] Diff/Entwicklungscommits und lokale Beispiele abnehmen.
- [ ] Alle offenen Steuer-/Rechts-/Leistungsfragen klären und freigegebene Rechtstexte hinterlegen.
- [ ] Worker-/Storage-/Backup-Restore-/Monitoring-Betrieb nachweisen.
- [ ] Vollständigen Stripe-Sandbox-End-to-End-Abschluss inklusive asynchroner SEPA-Zahlung, Kündigung, tatsächlicher Erstattung und korrekter Rechnungen gesondert abnehmen.
- [ ] Produktionsbackup und additive Migrationen prüfen und ausdrücklich freigeben.
- [ ] Beide Netlify-Projekte korrekt zuordnen: dynamische Admin-App und separater statischer Firmenauftritt.
- [ ] Live-Stripe-Katalog/Branding/Webhooks getrennt prüfen; aktuelle V4-Implementierung blockiert Live-Key absichtlich.
- [ ] Erst nach eigenem Auftrag Produktion veröffentlichen; Entwicklungserfolg ist keine Veröffentlichung.
- [ ] Versandfreigabe und rechtliche Prüfung separat; DRY_RUN nicht selbst abschalten.

### Abschlussprotokoll der lokalen Prüfungen

| Prüfung                                              | Nachgewiesenes Ergebnis                                                                                                                                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core-Nachlauf ohne unveränderte Template-A11y-Matrix | 34 Dateien, 265/265 Tests bestanden                                                                                                                                                                                  |
| Browser-Template-Matrix im vorherigen Gesamtlauf     | 127/127 bestanden; unveränderte Vorlagen/Paletten                                                                                                                                                                    |
| Abschließende Config-/V4-Sicherheitsprüfungen        | 17/17 bestanden, einschließlich Freigabeentzug bei warmem Tracking-Cache, exakter ausgewählter Tarifzustimmung und Legacy-Providerparametern                                                                         |
| Eigenes Template-Paket                               | 97/97 bestanden                                                                                                                                                                                                      |
| Neue V4-Demos                                        | alle fünf Gruppen: HTML, Axe auf Desktop/Mobil und Layoutprüfungen bestanden                                                                                                                                         |
| Isolierte Preis-/Legal-/Resend-/TLS-/DRY_RUN-Tests   | 16/16 bestanden                                                                                                                                                                                                      |
| TypeScript                                           | Core, Templates, Web und Worker bestanden; abschließender Core-/Web-Check ebenfalls bestanden                                                                                                                        |
| ESLint / Whitespace                                  | bestanden                                                                                                                                                                                                            |
| Lokaler Next.js-Produktionsbuild                     | bestanden, kein Upload/Deployment                                                                                                                                                                                    |
| PDF/DOM/QR                                           | 15 fiktive PDFs, jeweils eine Seite, keine festgestellten Überlappungen/Fenster-/Randfehler, 15/15 QR-Decodes, zusätzlich direkt aus den gerasterten PDFs geprüft; fünf mobile Vorschauen ohne horizontalen Überlauf |
| Startcharge                                          | 40 fiktive Revieweinträge: A 20, B 10, C 10; alle send=false, alle manuell zu prüfen                                                                                                                                 |

Die 265 Core-Tests und 17 Nachtests überlappen teilweise; nicht addieren und nicht als einen einzigen vollständigen grünen Gesamtlauf ausgeben. Der erste vollständige Lauf wurde zur Fehlerdiagnose benutzt, danach wurden die betroffenen Bereiche und übrigen Core-Tests erneut geprüft. Bei PDF-Prüfung wurde ein ungeeigneter hochkantiger Screenshot im ersten Beispielskript erkannt und durch die bereits vorhandene Laptop-/Handy-Komposition ersetzt; endgültige Beispiele wurden danach neu erzeugt.

Browsertests: zwei neue V4-Tests bestanden; 20 Admin-Bereiche im bestehenden Navigationstest bestanden, nachdem dessen alte Überschrifterwartung korrigiert wurde. Der gemeinsame Nachlauf mit getrennten Legacy-/V4-Fixtures bestand mit **4/4 Tests**: zwei V4-Tests, bestehender Legacy-Kauf bis Rechnung im Mock-Postausgang und Navigation durch alle 20 Admin-Bereiche. Vollständige echte Stripe-Zahlungsabnahme, Live-SEPA/Erstattung, Produktionsmigrationen, Veröffentlichung, Backup-Restore und echte Sendungen wurden nicht ausgeführt.

Gesichert in lokalen Entwicklungscommits auf `codex/conversion-v4`. Kein Push, Merge oder Produktionsdeploy ausgeführt. Das ursprüngliche Arbeitsverzeichnis mit vorherigen ungesicherten Änderungen bleibt erhalten.
