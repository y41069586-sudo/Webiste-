# SeitenWerk – aktueller Gesamtstand

Stand: 24.10.2026. Dieser Bericht ergänzt den historischen Übernahmebericht und ersetzt dessen
inzwischen überholte Aussagen zum aktuellen Betriebsstand. Nur Analyse/lesende Prüfungen in diesem
Arbeitsschritt, keine Veröffentlichung oder Geschäftsaktion.

## Ziel und Architektur

Websites für lokale Betriebe: Lead → Demo → Brief mit QR → Kauf → Onboarding → Kundenwebsite.
Bestehendes Monorepo weiterverwenden: Next.js-Webapp, Core mit Drizzle/PostgreSQL und Provider-
Schnittstellen, Vorlagen, Node-/pg-boss-Worker. Kein Neuaufbau. Angebote 590 Euro einmalig oder
49 Euro/Monat für mindestens zwölf Monate, danach 19 Euro/Monat nach bestehender Preislogik.

## Vorhanden und geprüft

| Bereich | Tatsächlicher Stand |
| --- | --- |
| Übernahme | CLAUDE-/Spezifikationsbestand geprüft, AGENTS.md lokal angelegt; Entscheidungen festgehalten. Nicht alle Übernahmedateien bereits im GitHub-Branch gesichert. |
| Supabase | Webiste-, EU Irland; 11 vorhandene Migrationen, 32 Tabellen; RLS und keine Browser-Tabellengrants bei Einrichtung geprüft. Dedizierte Backendrolle, keine zweite Datenarchitektur. |
| Öffentliche Konfiguration | Lesende Edge Function für freigegebene Websitefelder vorhanden. Statischer Export übernimmt Werte beim Build, nicht bei jedem Seitenaufruf. |
| Admin | Bestehender Passwort-/TOTP-Zugang eingerichtet, 20 Bereiche per Browser geprüft; modernisiertes Layout, gruppierte lokale Suche, responsive Navigation, Ladeanzeige und anfragebezogene Session-Deduplizierung veröffentlicht. |
| Netlify/Datenbank | TLS-CA korrekt eingebunden; wegen EMAXCONNSESSION Umstellung von Session-Port 5432 auf Transaction-Port 6543. Letzter Deploy 6add2a0a839192b88a83feb0 ready. Health aktuell HTTP 200, db=true. Belastungs-/Dauertest nach Umstellung noch offen. |
| Resend | Domain verifiziert, Inbox support@seitenwerk.world vorhanden; Empfang früher durch eingegangene Anbieter-Mail belegt. App-Versand und Support-Ingestion sind davon getrennt und noch nicht produktiv angebunden. |
| Vorlagen | Fünf Branchengruppen mit je drei Basislayouts plus Plakat: 20 Websitevorlagen; Brief-/Rechnungsvorlagen vorhanden. Kein Betreiberfoto erforderlich. |
| Fachfunktionen | Lead-Filter, Demos/QA, Briefe/Freigaben, Budget/Not-Aus, Checkout/Webhooks, Onboarding, Rechnungen, Support, Funnel, Optimizer/Lern-Agent im Code vorhanden; kein Nachweis eines produktiven Gesamtdurchlaufs. |
| Tests | Bisher TypeScript/Lint, 97 Template-Tests, zwei isolierte Site-Sicherheitstests und vier isolierte TLS-Tests bestanden. Kein destruktives Core-Testsetup gegen Supabase ausgeführt. |

## Aktuell extern festgestellt

- Öffentliche Domain seitenwerk.world: HTTP 200, weiterhin noindex. Kontaktseite zeigt hallo@example.com,
  Musterstraße 1, Dortmund und Mustertelefon; Impressum weiterhin alter Platzhalter. Nicht als fertig abnehmen.
- Admin-App seitenwerkworld.netlify.app ist ein separates Netlify-Projekt. Ein Deploy dieser App
  aktualisiert die statische Firmenwebsite nicht automatisch.
- Supabase: 1 Admin; 0 Leads, 0 Demos, 0 Briefe, 0 Bestellungen, 0 Kunden. Noch keine belastbare
  Vertriebs-/Umsatzerfahrung oder Grundlage für datengetriebene Optimierung.
- Health degraded: Datei-Speicher nicht beschreibbar, kein Worker-Herzschlag, kein geprüftes Backup.
- DB-Konfiguration: dryRun=true, automatische Sendungen/Antworten/Optimierung/Domains aus,
  echte Briefe nicht freigeschaltet. IBAN leer, freigegebene Rechtsfelder leer. Steuernummer hat
  einen nichtleeren Wert; Standard ist eine Musternummer, Echtheit noch prüfen, nicht als erledigt werten.
- Laufzeitprovider bisher ausdrücklich Mock; Connector-Verbindungen ersetzen keine App-Secrets.

## Nächste Schritte in sinnvoller Reihenfolge

1. **Öffentlichen Firmenauftritt korrigieren.** Vorbereitete echte Kontakt-/Betreiberdaten und
   Supabase-Exportanbindung prüfen, nur diese Änderungen versionssicher übernehmen und den
   bestehenden statischen Netlify-Auftritt aktualisieren. Kontaktwege, Footer, Preisangaben und
   Darstellung ohne Foto auf Mobilgerät prüfen. Rechtstexte nicht weiter bearbeiten oder als fertig
   ausgeben. Keine Domain-/DNS-Änderung nötig. Lokale Entfernung der Foto-Pflicht gezielt mitnehmen.
2. **Code-/Betriebsstand konsolidieren.** Übernahmedokumentation und weitere lokale Änderungen
   selektiv ins Repository sichern; keine alten Phasen erneut starten. Historische Checklisten als
   solche kennzeichnen. Netlify-Buildproblem lokal reproduzierbar machen; erfolgreicher externer
   Netlify-Build ersetzt keine vollständige lokale Testumgebung. Keine pauschale Lockfile-Erneuerung.
3. **Dauerhaften privaten Dateispeicher einrichten.** Bestehende S3-Schnittstelle für PDF/Demo-
   Dateien nutzen; Supabase Storage/S3-Kompatibilität prüfen. Keine öffentlichen Rechnungsdateien.
   /tmp ist keine dauerhafte Lösung. Zugangsdaten und Bucketregeln getrennt prüfen.
4. **Einen kontrollierten Demo-Probelauf vorbereiten.** Isolierte lokale Wegwerf-Testdatenbank,
   Mocks und eigene/fiktive Testdaten. Eine vorhandene Vorlage rendern, Demo/QR/Brief-PDF ansehen,
   Mobilansicht und Opt-out prüfen. Kein Versand, kein Kauf, keine echte Domainregistrierung.
5. **Workerbetrieb entscheiden und vorbereiten.** Bestehenden Worker erhalten. Netlify-Funktionen
   ersetzen keinen dauerhaften pg-boss-/Chromium-Prozess. VPS bleibt später; daher können automatische
   Lead-Suche, PDF-Erstellung, Versand und Folgeläufe noch nicht als laufend gelten. Queue-/Migrations-
   Rechte und passende Verbindung für den späteren Worker separat planen.
6. **Resend in die App integrieren.** Sichere Secretbindung und Absender, dann separat signierten
   Resend-Inbound an bestehenden Supportprozess anpassen. Aktueller Webhook erwartet Postmark/
   generisches JSON, kein fertiger Resend-Webhook. Untrusted-Mail-Schutz, Duplikate und Opt-out testen.
   Vorhandene Provider-/Supportlogik wiederverwenden; automatische Antworten bleiben aus.
7. **Kaufstrecke im Test abnehmen.** Stripe macht Betreiber. Signing Secret und Endpunkt müssen
   zur tatsächlich dynamischen App passen: Die statische Domain kann /api/webhooks/stripe nicht
   selbst ausführen. Historische Webhook-URL in der Checkliste deshalb nicht ungeprüft übernehmen.
   Beide Angebote, SEPA-Verzögerung, Rechnungen, Mindestlaufzeit, 12→19-Euro-Wechsel, Garantie testen.
8. **Betrieb vor Echtgeld absichern.** Backup plus nachgewiesener Restore, Monitoring, Last-/
   Navigationstest, Not-Aus und Budgets, Retention, Opt-out, Rechnungs-/Steuerdaten prüfen.
9. **Spätere Freigabe für echten Start.** Rechtstexte/Compliance derzeit ausdrücklich pausiert,
   bleiben aber Voraussetzung für Verkauf/Versand. Claims und Branchenbriefe abnehmen,
   LetterXpress erst im Test und nach separater Freigabe echter Brief. DRY_RUN nicht selbst abschalten.

## Bewusst später

- B6.6: vollständige Zuteilung/Messung von Demo-/Preisvarianten noch nicht belegt.
- L7 Zielgruppenmodell/Timing erst ab mindestens 300 ausgewerteten Briefen.
- Keine neue Kundenanmeldung, kein persönliches Foto, Plakat behalten. Stripe und DNS beim
  Betreiber, VPS später. Keine Providerwechsel oder neuen parallelen Backends.

Empfohlener nächster Arbeitsblock: öffentliche Kontaktdaten/Versionierung bereinigen und danach
Dateispeicher plus eine vollständige Demo im sicheren Testbetrieb. Erst dann den automatischen
Betrieb und die Kaufstrecke vervollständigen.
