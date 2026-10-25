# V5 – priorisierte Freigabe- und Go-Live-Checkliste

25.10.2026. Status: **bereit für interne Tests**, kein Versand-/Verkaufsstart.
`DRY_RUN=true`, Produktions-Stripe V4 gesperrt, keine Veröffentlichung/DNS/Migration beauftragt.
Umsetzung: [Qualitätsbericht](v5-quality-pruefung.md). Fortsetzung: [Handoff](v4-quality-handoff.md).

## Bereits implementiert und lokal getestet

- [x] Unterbrochene V4-Services gerettet, kompatibel vervollständigt und in Paketen committet.
- [x] Basis 597+19 / Care+ 597+insgesamt99, Snapshots, Legacy-Erhalt, keine Jahresbindung für V4.
- [x] Monatsstart nach bezahlter Einrichtung + Zustimmung + tatsächlich bestätigtem Go-Live.
- [x] Idempotenz/Fehlerzustände, Tarifwechsel/Kündigung, Care+-Kontingent und tatsächliche Kosten.
- [x] Steuer-/Rechts-/Versand-Gates erhalten, Steuerbestätigung zusätzlich erforderlich.
- [x] Erste 30-Demo-Review service-seitig durchgesetzt, konkrete Desktop-/Mobil-/Fakten-/Bild-/Textprüfung.
- [x] 10 echte Demo-Render, Plakat erhalten, Prompt/Fallback/3 Designs verbessert.
- [x] 15 einseitige V4-Briefe, tatsächliche PDF-/QR-Prüfung und repräsentative Sichtprüfung.
- [x] Firmenwebsite, fünf statische Muster und lokale statische Exportkette verbessert/geprüft.
- [x] Worker-only Docker für dieselbe Supabase-DB vorbereitet, lokaler Container/Chromium/Shutdown geprüft.
- [x] Queue-Installation offline vorbereitet, lokale Runtime-Rollen/Rechte/Retry/Dead-Letter geprüft.
- [x] Datenbank-Dump/Restore in neuer lokaler Testdatenbank und binäre Storage-Backups geprüft.
- [x] Monats-Erstattungen getrennt zugeordnet, unveränderliche Differenzbelege, VAT-Rundung und Legacy-Zustellung lokal geprüft.
- [x] Echte Stripe-Sandbox: Basis19/Care99 bezahlt, vollständig erstattet, Testabos beendet.

## P0 – vor vollständiger externer Sandbox-Abnahme

| Aufgabe                        | Zustand                                               | Konkreter Abschlussnachweis                                                                                                                       |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime-Secrets je Web/Worker  | externe sichere Einrichtung erforderlich              | nur benötigte Namen/Scopes prüfen; Secrets geschützt eintragen, niemals im Chat/Git                                                               |
| VPS für dauerhaften Worker     | vorbereitet, kostenpflichtige Freigabe erforderlich   | kleiner Server, Verantwortlichkeit/Zugriff/Updates, privates ENV, Image und beobachteter Betrieb                                                  |
| Supabase-Migrationen 0011–0017 | lokal geprüft, produktive Anwendung gesperrt          | aktuelles Backup, SQL/Rollenprüfung, gesonderte Freigabe, additive Anwendung und Readback                                                         |
| pgboss-Schema                  | offline/local geprüft, Produktion fehlt               | Session/Direct5432, Wartungsrolle, Queue-Version/Rechte, danach beschränkter Runtime-Producer/Worker                                              |
| Privater S3-Speicher           | Bucket/Adapter vorhanden, echter Test offen           | Put/Get/Head/List/Delete mit rein fiktiven eigenen Testobjekten, Upload/Screenshot/PDF über Web+Worker                                            |
| Domains/Routen                 | dokumentiert, Laufzeitwerte ungeprüft                 | APP_URL/DEMO_DOMAIN/TRACK_DOMAIN identisch in Web/Worker, HTTPS-QR/Demo/Checkout/Webhooks erreichbar                                              |
| Stripe komplette Sandbox       | teilweise tatsächlich getestet                        | Hosted597 → signierter Webhook → Onboarding → bestätigter Mock-Go-Live → genau19/99; SEPA/SCA/Retry/Ausfall; Folgemonat/Schedule/Kündigung/Refund |
| Resend-Nachrichtenfluss        | Domain/Inbox/Webhook bestätigt, Zustellung ungetestet | gezielt autorisierte eigene Testmail hinein/Antwort heraus, Signaturen, Support-Zuordnung, keine Werbemails                                       |
| LLM/Leadquelle                 | Mock-/Fallbacktests, echte Anbindung offen            | genehmigter begrenzter Anthropic-Test, aktuelle OSM-Abfrage, Kosten/Rate-Limit, manuelle Fakten-/Websiteprüfung                                   |
| LetterXpress                   | vorhandener Adapter/Mock, kein Providerauftrag        | Zugang/Testkorbprüfung und später gesondert freigegebener eigener Druck-/Fensterumschlagtest; kein Kampagnenversand                               |
| INWX/Kundenhosting             | vorhandene Adapter, echte Abnahme offen               | vorhandene Sandbox, Domain/TLS/Formular/Opt-out/Abschaltung prüfen; keine Domainbestellung/Veröffentlichung ohne Freigabe                         |
| Produktionsbackup/Restore      | Prozess vorbereitet, nur lokale Testdaten gesichert   | PG17-Client, privater verschlüsselter Dump+Storage, außerhalb des Produktionssystems wiederherstellen, Rollen/Schlüssel/Hashes prüfen             |

Keine zweite PostgreSQL-Produktionsdatenbank anlegen. `QUEUE_DATABASE_URL` muss dieselbe vorhandene
Projekt-Datenbank über Session/Direct ansprechen. Web darf keine Queuemigration/Scheduler starten.

VPS-Vorbereitung: `.env.worker.example` als private `.env.worker` mit Modus0600 ausfüllen.
`docker compose -f docker-compose.worker.yml config --quiet` prüft nur Syntax (nicht starten).
Queue-SQL ohne Datenbankkontakt: `pnpm --filter @wbm/core queue:prepare`.
Erst nach separater Betriebs-/Migrationsfreigabe `--apply` und Workerstart; keine Seeds verwenden.

## P0 – vor kostenpflichtigem Verkauf oder Briefversand

- [ ] Betreiber bestätigt steuerlichen Status, korrekte Preis-/Rechnungsangaben und ggf. W-IdNr.;
      persönliche Steuernummer nicht veröffentlichen. Keine KI-Annahme über §19 UStG.
- [ ] Vollständige private Unternehmens-/Bankdaten sicher in App-Konfiguration hinterlegen.
- [ ] Leistungsumfang Domain/Basis-Support/Care+, Reaktionszeiten und Zusatzarbeiten verbindlich klären.
- [ ] Einrichtungsgarantie inklusive Monatsleistungen/Verzögerungen und Kündigung rechtlich freigeben.
- [ ] Impressum/Datenschutz/AGB, Vertragsschluss/AGB-Einbeziehung, AV-Verträge und Auftragsverarbeitung
      von Kundenformularen prüfen und ausdrücklich freigegebene `legal.*`-Felder versioniert hinterlegen.
- [ ] Postwerbung/Datenquellen/Art14+21/Opt-out/Löschfristen prüfen; aktive Leads/Anschriften/manuell
      recherchiertes Fehlen einer Website bestätigen. Demo-Messung bleibt ohne Rechtsfreigabe aus.
- [ ] Erste 30-Demos wirklich durch Betreiber prüfen; passende Briefe/PDF/QR/Preise einzeln freigeben.
- [ ] Vollständige externe Testkette protokollieren; keine Mock-Ergebnisse als Anbieterabnahme zählen.
- [ ] Not-Aus, Budgetgrenzen, Queue-/Worker-Heartbeat, Dead-Letter, Backup-/Storagefehleralarm und
      Verantwortlichkeit bei Ausfall abnehmen. Technischer Healthcheck ersetzt keine Job-/Backup-Kontrolle.
- [ ] Gesonderte Freigaben für Produktivmigration, Workerbetrieb, Edge Function, App-Deployment und
      statischen Firmenexport. Zwei Netlify-Projekte separat aktualisieren; keine DNS-Aktion automatisch.
- [ ] Erst danach tatsächliche Live-Stripe-Einrichtung und Aufhebung der Codesperre gesondert prüfen.
- [ ] Kontrollierte erste Briefcharge mit klarer Kosten-/Stückzahlfreigabe; nicht blind200 versenden.

## P1 / P2

P1 vor konkretem Versand: eigene Testdrucke, echte fachliche Inhalte/Bildrechte, lange Überschriften
redigieren, Brief-/Demo-Zuordnung kontrollieren. Gute technische Tests sind keine Premium-Abnahme.
P2 nach ausreichender Datenbasis: weitere Vorlagen, kontrollierte A/B-Tests, optionaler Druckanbieter,
Optimierungsautomatik. Keine Affiliate-/Ads-/zweite Agenteninfrastruktur ausbauen.

## Nächster konkreter Schritt

Zunächst Steuer-/Leistungs-/Garantieangaben mit dem Betreiber abschließen und sichere Runtime-Secrets
für ein begrenztes **externes Sandbox-Abnahmepaket** vorbereiten. Der lokal nachgewiesene Worker und
die additive Migrations-/Queue-Vorschau sind konkret prüfbar, dürfen aber ohne separate Freigabe
nicht produktiv eingerichtet werden. Danach genau einen fiktiven vollständigen Providerlauf mit
Hosted-Checkout und signierten Webhooks abnehmen. Erst mit diesen Nachweisen eine konkrete
Betriebs-/Kampagnenfreigabe einholen. Jetzt keine Live-Aktion.
