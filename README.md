# Website-Brief-Maschine

**Wiederaufnahme 29.10.2026:** [Aktueller Audit, Fortsetzung und Nachweise](docs/resume-2026-10-29/README.md).
70 neue Claude-Commits gegenüber der Codex-Übergabe: App/Firmenwebsite aktualisiert,21Migrationen,
Queue/Worker und echte Recherche angebunden, easyNova im Testmodus. Stripe-Live wird explizit
vorbereitet; kein echter Versand oder Zahlungslauf aus dieser Fortsetzung. Ältere Statusberichte
unten sind datierte Momentaufnahmen, keine erneute Bestandsprüfung.

Findet lokale Betriebe ohne eigene Website, baut für jeden einen Website-Entwurf, schickt einen
personalisierten Brief mit QR-Code und verkauft die fertige Website ohne Verkaufsgespräch:
**Neukundenangebot V4:** Basis **597 € Einrichtung + 19 €/Monat** oder Care+ **597 € Einrichtung + insgesamt 99 €/Monat**. Neue Bestellungen speichern nach ausdrücklicher Zustimmung ein Zahlungsmittel/Mandat; genau ein Monatsabo startet erst nach bestätigtem Go-Live. Keine zwölfmonatige Mindestbindung. Ältere V4-Bestellungen mit separatem Abo-Checkout behalten ihr Verfahren.

Die bisherigen 590-/49-/19-Euro-Verträge bleiben unverändert. V4/V5 ist auf dem Entwicklungszweig vorbereitet, nicht produktiv freigegeben. Verbindlich: [Qualitätsprüfung](docs/v5-quality-pruefung.md), [Go-Live-Restpunkte](docs/v5-go-live-checkliste.md) und [wiederaufnehmbarer Handoff](docs/v4-quality-handoff.md). Der ältere [V4-Bericht](docs/conversion-optimization-v4.md) bleibt als historischer Nachweis erhalten.
Aktueller Nachweisbericht: [Ultimate-Abschluss](docs/ultimate-quality-abschluss.md).
Aktuelle Premium-/Qualitätsfortsetzung: [Ultimate-Handoff](docs/ultimate-quality-handoff.md).
Maßgebliche Projektbeschreibung: [CLAUDE.md](CLAUDE.md).

**Codex-Übernahme:** Dauerhafte Arbeitsanweisungen und neueste Betreiberentscheidungen stehen in
[AGENTS.md](AGENTS.md). Der [Übernahmebericht](docs/projektuebernahme-codex.md) enthält den geprüften
Entwicklungsstand, offene Aufgaben und Abweichungen älterer Dokumente (kein persönliches Foto,
VPS später, Supabase bevorzugt, Resend verbunden; Stripe und DNS beim Betreiber).

**Aktueller Betriebsstand:** [Gesamtübersicht](docs/projektstand-aktuell.md),
[Integrationen und ausstehende Schlüssel](docs/integrationen-abschluss.md),
[Rechtsprüfung und offene Tatsachen](docs/recht/pruefprotokoll.md).

**Sicherheitsprinzip:** Standard ist immer `DRY_RUN=true`. Echte Briefe, echte Domainkäufe und der
Wechsel auf echte Zahlungen passieren nur nach ausdrücklicher Freigabe (siehe
[Go-Live-Checkliste](docs/go-live-checkliste.md)).

---

## Inhalt

1. [Überblick](#überblick)
2. [Lokale Entwicklung](#lokale-entwicklung)
3. [Deployment auf einem VPS](#deployment-auf-einem-vps)
4. [Konfiguration](#konfiguration)
5. [Täglicher Betrieb](#täglicher-betrieb)
6. [Betriebshandbuch: Was tun, wenn …](#betriebshandbuch-was-tun-wenn-)
7. [Tests](#tests)
8. [Weitere Dokumente](#weitere-dokumente)

---

## Überblick

```
apps/web        Next.js 16 (App Router): Admin-Dashboard, Demo-Seiten /d, QR /q, Checkout,
                Onboarding, Vorschau, Webhooks, Formular-Endpunkt der Kundenseiten
apps/worker     pg-boss-Worker: Lead-Suche, Demos, Briefe, Versand, Rechnungen, Deploys,
                Support, Optimizer, Lösch-Job, Cron-Takte
packages/core   Datenbank (Drizzle), Services, Provider-Interfaces, Prompts, Rendering (Playwright)
packages/templates  20 Website-Templates (fünf Gruppen, je drei Layouts + Plakat) (Tailwind, kompiliert), Brief- und Rechnungslayout
infra/          Caddy (TLS), Backup-Container mit Wiederherstellungstest
docs/           Compliance, Integrationen, Verarbeitungsverzeichnis, Checkliste
```

**Pipeline (Lead-Status):** `discovered → qualified → demo_built → demo_approved → demo_published →
letter_generated → letter_approved → letter_sent → letter_delivered → scanned → cta_clicked →
checkout_started → paid → onboarding → preview_approved → live` (Nebenzustände: `rejected`,
`suppressed`, `expired`, `followup_sent`, `failed`). Jeder Übergang steht im Audit-Log.

**Externe Dienste** (alle hinter Interfaces, je mit Mock für Entwicklung/Tests):

| Zweck                | Anbieter                                                                         | Umschalten                                 |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| Lead-Quelle          | OpenStreetMap/Overpass (Standard), Google Places (nur nach Compliance-Freigabe)  | `LEAD_SOURCE`, Einstellungen → Lead-Quelle |
| KI-Texte             | Anthropic Claude (`MODEL_CREATIVE`, `MODEL_BULK`)                                | `ANTHROPIC_API_KEY`                        |
| Briefversand         | easyNova digiBrief (Testmodus zuerst); LetterXpress/Pingen inaktive Alternativen | `MAIL_PROVIDER`, `EASYNOVA_*`              |
| Zahlung              | Stripe Checkout                                                                  | `PAYMENT_PROVIDER`, `STRIPE_*`             |
| Domains              | INWX                                                                             | `REGISTRAR_PROVIDER`, `REGISTRAR_ENV`      |
| Hosting Kundenseiten | Cloudflare (Workers Static Assets) oder Netlify                                  | `HOSTING_PROVIDER`                         |
| E-Mail               | Resend oder Postmark, Eingang per IMAP oder Webhook                              | `EMAIL_PROVIDER`, `IMAP_*`                 |
| Dateien              | lokal oder S3-kompatibel                                                         | `STORAGE_DRIVER`                           |

Details und geprüfte API-Stände: [docs/integrations.md](docs/integrations.md).

---

## Lokale Entwicklung

Voraussetzungen: Node.js ≥ 22.12, pnpm 10, PostgreSQL 16 (oder Docker), Chromium (Playwright).

```bash
pnpm install
cp .env.example .env            # oder: sh scripts/init-env.sh --local (setzt Mocks + Zufalls-Secrets)
docker compose up -d postgres   # oder eigene Postgres-Instanz, DATABASE_URL anpassen
pnpm db:migrate                 # Migrationen + Standardwerte
pnpm admin:create               # Admin mit Passwort + 2FA (QR-Code im Terminal scannen)
pnpm css:build                  # Tailwind der Templates kompilieren
pnpm dev                        # Web (http://localhost:3000) und Worker
```

Ohne API-Keys laufen alle Anbieter als Mock: KI liefert geprüfte Textbausteine, Briefe werden nur als
PDF erzeugt, Zahlungen über eine simulierte Bezahlseite, Domains/Hosting simuliert (Kundenseiten unter
`/mock-hosting/…`), E-Mails landen im Dashboard unter „Postausgang“.

---

## Deployment auf einem VPS

Empfohlen: Hetzner Cloud (Standort Deutschland), z. B. CX32 (4 vCPU, 8 GB RAM), Ubuntu 24.04, Docker.

1. **DNS:** drei Hostnamen auf die Server-IP (A/AAAA): Admin/App (`APP_HOST`, z. B. `app.example.de`),
   Demos (`DEMO_DOMAIN`, z. B. `entwurf.example.de`), QR (`TRACK_DOMAIN`, z. B. `go.example.de` – kurz,
   steht im Brief).
2. **Code und Secrets:**
   ```bash
   git clone <repo> /opt/wbm && cd /opt/wbm
   sh scripts/init-env.sh          # .env mit zufälligem SESSION_SECRET und DB-Passwort
   nano .env                       # Domains, Schlüssel der Anbieter, ADMIN_EMAIL, ACME_EMAIL
   ```
3. **Start:**
   ```bash
   docker compose --profile prod up -d --build
   docker compose exec worker node --import tsx src/cli.ts admin:create
   ```
   Caddy holt die TLS-Zertifikate automatisch. Der Worker führt beim Start Migrationen aus.
4. **Webhooks einrichten:**
   - Stripe: Endpunkt `https://APP_HOST/api/webhooks/stripe` mit den Events
     `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`,
     `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`,
     `customer.subscription.deleted`; Signing Secret in `STRIPE_WEBHOOK_SECRET`. Zahlungsarten im
     Stripe-Dashboard aktivieren: Karte und SEPA-Lastschrift;
     Smart Retries für fehlgeschlagene Abo-Zahlungen einschalten.
   - Briefdienst: easyNova hat keine Webhooks – der Status wird alle 30 Minuten abgefragt.
   - E-Mail-Eingang: IMAP-Zugang in `IMAP_*` **oder** Postmark-Inbound auf
     `https://APP_HOST/api/webhooks/email-inbound?token=EMAIL_INBOUND_SECRET`.
5. **Monitoring:** externen Uptime-Check (z. B. UptimeRobot, Better Stack) auf
   `https://APP_HOST/api/health?strict=1` (503, wenn DB, Worker-Herzschlag, Speicher oder Backup ein
   Problem haben). Fehler-Mails gehen zusätzlich alle 15 Minuten gesammelt an `ADMIN_EMAIL`.
6. **Backups:** Der Container `backup` sichert täglich (`BACKUP_HOUR`, UTC) Datenbank und Dateien nach
   `./backups`, prüft jedes Backup per Probe-Wiederherstellung und meldet Fehler im Dashboard. Das
   Verzeichnis `./backups` zusätzlich außer Haus kopieren (z. B. Hetzner Storage Box per `rsync`).

**Updates:** `git pull && docker compose --profile prod up -d --build` (Migrationen laufen automatisch;
vorher prüfen, dass das letzte Backup „ok“ ist – Dashboard oder `/api/health`).

---

## Konfiguration

- **`.env`** – Secrets und Anbieter (Vorlage mit Erklärungen: [.env.example](.env.example)). Die
  Schalter dort sind Startwerte. `DRY_RUN=true` in der `.env` sperrt DRY_RUN unabhängig vom Dashboard
  (Zwei-Schlüssel-Prinzip).
- **Dashboard → Einstellungen** – alles Fachliche: Absender/Impressum, Preise und Steuern
  (Kleinunternehmer § 19 UStG umstellbar), Städte, Branchen, Suchbegriffe, Kettenliste, Filter, Budget
  und Segmentanteile, Fristen (Demo-Ablauf, Follow-up, Löschfristen), Review-Schwellen,
  Änderungsrunden, Briefoptionen, Rechtstexte (Impressum, Datenschutz, AGB) und Schalter inkl. Not-Aus.

Wichtige Schalter:

| Schalter                         | Wirkung                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `DRY_RUN`                        | keine kostenpflichtigen Aktionen (Briefe werden nur als PDF erzeugt, keine Domain-Registrierung) |
| Echte Briefe freigegeben         | erst nach erfolgreichem Testbrief an die eigene Adresse                                          |
| `AUTO_SEND`                      | freigegebene Briefe ohne Einzel-Freigabe versenden                                               |
| `AUTO_APPROVE_DEMOS`             | nach den ersten 30 manuell geprüften Demos nur Stichproben (10 %)                                |
| Domains automatisch registrieren | sonst jede Registrierung einzeln freigeben                                                       |
| `AUTO_REPLY`                     | Support-Antworten der gewählten Klassen ohne Freigabe                                            |
| `FOLLOWUP_ENABLED`               | zweiter Brief nach 12 Tagen ohne Scan                                                            |
| `AUTO_OPTIMIZE`                  | Wochen-Optimizer übernimmt Budgetanteile selbst                                                  |
| Not-Aus                          | stoppt sofort alle Jobs mit Kostenfolge                                                          |

---

## Firmen-Website

Aktuelle [Supabase-Anbindung und Betriebsgrenzen](docs/supabase-anbindung.md): öffentliche Inhalte per Edge Function, keine neuen Logins, eine privat konfigurierte geschäftliche Resend-Support-Inbox.

Startseite, „So funktioniert’s“, Preise, Garantie, Beispiele, Über mich, Kontakt sowie Impressum, Datenschutz, AGB und
Quellen liegen unter `apps/web/src/app/(site)` (Design nach DESIGN.md). Inhalte kommen aus den Einstellungen: Absender
(Name, Firma, Foto, Kurzvorstellung, Kontakt), Preise und Garantie. Beispielbilder neu erzeugen:
`pnpm --filter @wbm/core exec tsx scripts/example-shots.ts`. Screenshots aller Seiten (Desktop und Handy):
`SHOTS_DIR=… pnpm --filter @wbm/web exec playwright test e2e/screenshots.spec.ts`. Indexierung erst mit
`SITE_INDEXABLE=true`.

**Statisch auf Netlify (Projekt `seitenwerk-website`):** Die Firmen-Website läuft dort ohne Server und ohne
Datenbank; Admin, Demos, Checkout und Worker bleiben auf dem VPS. Ablauf:

1. `pnpm --filter @wbm/web exec next build`
2. Produktions-Instanz mit echten Einstellungen und `SITE_STATIC=true` starten (Kontaktformular aus, nur direkte
   Kontaktwege), z. B. `next start -p 3200`
3. `node apps/web/scripts/export-site.mjs http://localhost:3200` → `apps/web/out/` (mit `_headers`, `robots.txt`,
   `404.html`; ohne `SITE_INDEXABLE=true` per Header und robots.txt noindex)
4. `out/` hochladen (Netlify-Projekt ohne Build-Befehl, `publish = "out"`)

Preise, Absenderdaten und Rechtstexte werden beim Export eingefroren – nach jeder Änderung in den Einstellungen
neu exportieren und hochladen.

## Täglicher Betrieb

**Takte (Worker, Zeitzone Europe/Berlin):** Pipeline alle 5 Min., Briefstatus alle 30 Min., Follow-ups
9:05, Erinnerungen (Onboarding, Hosting-Ende) 8:10, Lösch-Job 3:15, Wochenbericht So 18:00,
Watchdog + Fehler-Mail alle 15 Min., IMAP-Abruf alle 5 Min., Claims-Abgleich und Ablaufprüfung 6:25,
Funnel-Sicht und Sicherheitsnetze :10 und :40, Lern-Agent So 18:30.

**Deine Aufgaben im Dashboard:**

1. **Übersicht** – offene Meldungen quittieren, Systemzustand prüfen.
2. **Demos (Review)** – neue Entwürfe ansehen, freigeben oder verwerfen (anfangs alle, später Stichproben).
3. **Briefe (Review)** – PDFs prüfen, freigeben, „Freigegebene jetzt versenden“ (Budget wird angezeigt).
4. **Support** – Entwürfe prüfen, anpassen, senden. Widersprüche werden automatisch umgesetzt.
5. **Kunden & Seiten** – Domainkäufe freigeben, Änderungswünsche außerhalb der Runden bearbeiten.
6. **Bestellungen** – Zahlungen, Rechnungen, Erstattungen (mit Bestätigung).
7. **Wochenberichte** (sonntags) – Vorschlag für Budgetanteile und Varianten-Zuteilung je Branche übernehmen oder nicht.
8. **Claims & Playbooks** – Statistiken für Briefe nach eigener Prüfung freigeben; abgelaufene Quellen ersetzen.
9. **Optimizer** – Spannen je Branche und Variante, Urteil („Gewinner“ erst ab 90 % und 100 Briefen je Arm),
   Power-Rechner, Kostenbremse, ausgelöste Sicherheitsnetze; pausierte Varianten nach Prüfung wieder aktivieren.
10. **Lern-Agent / Varianten-Labor** (sonntags) – Wochenbericht lesen, Vorschläge in der Review-Queue (Diff je Slot)
    freigeben oder mit Grund ablehnen; Logbuch als Markdown herunterladen.
11. **Einwände** – Top-Einwände je Branche; WhatsApp-Fragen dort von Hand erfassen (ohne Namen/Telefonnummer).

**Erste echte Charge:** [docs/go-live-checkliste.md](docs/go-live-checkliste.md) vollständig abhaken,
dann Testbrief an dich → Schalter „Echte Briefe freigegeben“ → `DRY_RUN=false` (in `.env` **und** im
Dashboard) → 40 Briefe (je ca. 13 Gastronomie, Handwerk, Beauty; je Branche 50/50 Startvariante gegen die neutrale
Kontrolle) freigeben und senden.

---

## Betriebshandbuch: Was tun, wenn …

**… ein Sicherheitsnetz ausgelöst hat (Mail „Sicherheitsnetz: …“)?** Opt-out- oder Beschwerde-Bremse: Variante ist
pausiert – Brieftext und Beschwerde lesen, ggf. Variante verwerfen; sonst im Optimizer „wieder aktivieren“.
Unzustellbar-Bremse: Versand pausiert – Rückläufer im Lead-Detail ansehen (Anschriftenquelle?), dann unter
Einstellungen „Versand pausiert“ ausschalten. Kostenbremse: Wochenbudget wurde halbiert – Funnel und Optimizer prüfen,
Budget nur bewusst wieder erhöhen.

**… etwas grundsätzlich schiefläuft (falsche Briefe, Kostenexplosion)?**
Dashboard → Einstellungen → **Not-Aus**. Alle Jobs mit Kostenfolge stoppen sofort (Lead-Suche mit
Google, KI, Briefversand, Domainkäufe). Danach Ursache klären, Not-Aus wieder lösen. Bereits an den
Briefdienst übergebene Aufträge lassen sich über die Schnittstelle nicht stornieren (easyNova bietet keinen
Storno-Endpunkt) – vor dem Druck beim Anbieter-Support melden.

**… ein Kunde die Zufriedenheitsgarantie nutzt (innerhalb von 14 Tagen)?** Bestellungen → Bestellung →
„Garantie ausführen“ (Bestätigung GARANTIE). Das erstattet die Zahlung (Option B: erste Rate und Vertrag
endet sofort), nimmt die Seite offline und schickt dem Kunden eine Bestätigung. Ist die Domain schon
registriert, erscheint eine Warnung: Auth-Code bei INWX erzeugen und dem Kunden geben oder die Domain kündigen.

**… eine Monatsrate (Option B) nicht eingezogen werden kann?** Stripe versucht es automatisch erneut
(Smart Retries); der Kunde bekommt eine Mail mit Bezahllink. Nach dem letzten Versuch geht die Seite in den
Wartungsmodus (neutrale Ersatzseite) und du bekommst eine Meldung. Sobald die Rate bezahlt ist, ist die
Seite automatisch wieder online. Endet ein Monatsvertrag vor Ablauf der Mindestlaufzeit, meldet das System
die offene Restlaufzeit.

**… das Wochenbudget erreicht ist?** Versand stoppt automatisch und setzt in der nächsten Woche fort.
Budget unter Einstellungen → Budget anpassen (Briefe/Places/KI getrennt).

**… eine Quelle veraltet ist („Quelle veraltet, neuere Studie suchen“)?** Der Claim ist schon gesperrt,
Briefe nutzen ihn nicht mehr. Neuere Primärquelle suchen, in `packages/core/claims/claims.yaml` eintragen
(mit `check`-Zitat), `docs/claims-verifikation.md` ergänzen, deployen und den Claim im Dashboard freigeben.

**… ein Brief „failed“ ist?** Briefe → Fehler: Grund lesen (Status des Briefdienstes, Layout-Prüfung,
„Ablaufdatum im Brief liegt zu nah“ → neu erzeugen). Bei
Adressproblemen Lead verwerfen; bei Layoutfehlern Brief neu erzeugen.

**… jemand widerspricht (Brief, Mail, Telefon)?** Per QR/„Kein Interesse“ und per Mail passiert das
automatisch. Bei Anrufen: Leads → Lead suchen → „Sperren“ (löscht Demo und Daten, bleibt als Hash auf
der Sperrliste). Bestätigung per Mail ist bei Mail-Widerspruch automatisch.

**… eine Beschwerde kommt?** Erscheint unter Support als „escalated“ mit Mail an dich. Persönlich
antworten; nichts versprechen, was nicht im Angebot steht.

**… ein Kunde bezahlt hat, aber keine Mail bekommt?** Bestellungen → Bestellung öffnen → E-Mails prüfen
(Status/Fehler). „Rechnung erneut senden“. Postausgang zeigt alle Mails. Spam-Ordner beim Kunden
erfragen; SPF/DKIM der Absenderdomain prüfen.

**… Stripe-Webhooks fehlen?** Stripe-Dashboard → Webhooks → Zustellungen prüfen und erneut senden. Die
Erfolgsseite gleicht Zahlungen zusätzlich direkt ab; ein Sicherheitsnetz im Pipeline-Takt holt fehlende
Rechnungen/Onboarding-Mails nach.

**… eine Erstattung nötig ist?** Bestellungen → Bestellung → Erstatten (Betrag, „ERSTATTEN“ tippen).
Stornorechnung entsteht automatisch. Seite ggf. unter Kunden & Seiten sperren.

**… die Domain des Kunden vergeben ist?** Meldung im Dashboard. Mit dem Kunden eine Alternative abstimmen,
unter Kunden & Seiten → „Domain ändern“ eintragen (wird live geprüft) und „Neu veröffentlichen“.

**… eine Seite nicht live geht?** Kunden & Seiten → Live-Check-Ergebnis lesen. Häufig: Nameserver/Zone
noch nicht aktiv (Cloudflare) oder DNS noch nicht verbreitet (bis 48 h; der Check läuft automatisch
weiter). „Live-Check jetzt“ startet sofort.

**… der Worker steht (Health „Worker-Herzschlag aus“)?** `docker compose ps`, `docker compose logs
--tail=200 worker`, dann `docker compose restart worker`. Jobs gehen nicht verloren (pg-boss).

**… ein Job immer wieder scheitert?** Jobs & Steuerung zeigt fehlgeschlagene Jobs; endgültig
gescheiterte landen als Meldung im Dashboard (Dead-Letter). Ursache beheben, Job dort neu anstoßen.

**… die Datenbank wiederhergestellt werden muss?**

```bash
docker compose stop web worker
docker compose exec backup sh -c 'ls -1t /backups/db | head'         # Dump wählen
docker compose exec backup sh -c 'dropdb wbm && createdb wbm && pg_restore --no-owner -d wbm /backups/db/<datei>.dump'
# Dateien (Volume „storage“; Projektname ggf. anpassen, siehe docker volume ls):
docker run --rm -v wbm_storage:/data -v "$PWD/backups:/backups" alpine tar -xzf /backups/storage/<datei>.tar.gz -C /data
docker compose start web worker
```

Probe ohne Risiko: `docker compose exec backup sh /scripts/restore-test.sh`.

**… der Server voll läuft?** `df -h`; alte Backups (Standard 14 Tage) und Docker-Images
(`docker image prune`) aufräumen. Dateien werden durch den Lösch-Job nach Fristen entfernt.

**… ein Secret geleakt ist?** Schlüssel beim Anbieter rotieren, `.env` anpassen,
`docker compose --profile prod up -d`. Bei `SESSION_SECRET`: alle Admin-Sitzungen werden ungültig.

**… ich mich nicht mehr einloggen kann (2FA verloren)?** Neuen Admin anlegen:
`docker compose exec worker node --import tsx src/cli.ts admin:create --email neu@…`; alten Admin
danach in der Datenbank deaktivieren.

---

## Tests

```bash
pnpm test                 # Unit- und Integrationstests (Postgres nötig, legt wbm_test an)
pnpm test:e2e             # Playwright: Demo/Opt-out, Checkout, Onboarding bis Live, Support, Admin
pnpm lint && pnpm typecheck
node scripts/load-test.mjs https://APP_HOST <demoSlug> <trackToken> 600 25   # Lasttest öffentlicher Routen
```

Abgedeckt u. a.: Qualifizierung, Domain-Vorschlag, Budget-Guard, Zustandsübergänge, Brief- und
Rechnungslayout (Anschriftenfeld per PDF-Analyse), Demo-Inhaltsregeln, Templates (axe, HTML, Layout,
Lighthouse ≥ 90), Pingen/Stripe/Resend/Postmark/INWX/Cloudflare/Netlify gegen Fake-APIs, Webhook-Replay,
Lösch-Job, Optimizer, Fehlerfälle (Ausfälle, Absturz während Verarbeitung).

---

## Weitere Dokumente

- [docs/AUFTRAG.md](docs/AUFTRAG.md) – Auftrag und Spezifikation (Kurzfassung)
- [docs/go-live-checkliste.md](docs/go-live-checkliste.md) – Checkliste vor dem ersten echten Versand
- [docs/compliance-google.md](docs/compliance-google.md) – Google-Places-Bedingungen, Entscheidung OSM
- [docs/integrations.md](docs/integrations.md) – geprüfte API-Dokumentation je Anbieter
- [docs/claims-verifikation.md](docs/claims-verifikation.md) – Prüfprotokoll der Claims (Statistiken in Briefen)
- [docs/verarbeitungsverzeichnis.md](docs/verarbeitungsverzeichnis.md) – Verzeichnis der Verarbeitungstätigkeiten (Entwurf)
- [docs/auftragsverarbeiter.md](docs/auftragsverarbeiter.md) – Auftragsverarbeiter, Standorte, EU-Optionen
