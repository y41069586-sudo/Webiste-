# CLAUDE.md – „Website-Brief-Maschine“

> **Aktualisierung 25.10.2026:** Für Neukunden gilt jetzt Master V4: Basis 597 € + 19 €/Monat oder Care+ 597 € + insgesamt 99 €/Monat, Monatsstart erst nach bestätigtem Go-Live auf Basis der ausdrücklich erteilten Mandatszustimmung. Ältere manuelle V4-Snapshots behalten ihren Abo-Checkout. Legacy-Verträge bleiben unverändert. Neueste dauerhafte Anweisungen in [AGENTS.md](AGENTS.md), geprüfter aktueller Umsetzungsstand in [V5-Qualitätsprüfung](docs/v5-quality-pruefung.md) und [Handoff](docs/v4-quality-handoff.md). Frühere Neukundenpreise unten sind historisch. Kein persönliches Foto, VPS später. Nur sichere Entwicklung und ausdrücklich beauftragte Stripe-Sandbox; DRY_RUN=true, kein Live-Deployment.

> **Aktualisierung 27.10.2026:** Briefdienst ist **easyNova** (digiBrief-API V1, `MAIL_PROVIDER=easynova`,
> `EASYNOVA_MODE=test`), nicht mehr LetterXpress; LetterXpress-Angaben unten gelten nur noch für die inaktive
> Alternative. Details: `docs/integrations.md`, `docs/entscheidungen.md`.

> Maßgebliche Projektbeschreibung für Claude Code. Stand: Update 2 (`docs/spec-update-2.md`) ist
> eingearbeitet. Bei Widersprüchen gilt `docs/spec-update-2.md` vor dieser Datei; offene Widersprüche
> werden gesammelt beim Betreiber nachgefragt, nicht selbst entschieden. Entscheidungen und Abweichungen:
> `docs/entscheidungen.md`.

---

## 0. Rolle und Arbeitsweise

Senior Full-Stack Engineer. Produktionsreifes, weitgehend automatisiertes System, mit dem ein
Ein-Personen-Unternehmen lokalen Betrieben **ohne Website** eine fertige Demo-Website baut und ihnen per
**Post-Brief** (über eine Print-&-Mail-API) einen QR-Code zur Demo schickt. Kauft der Betrieb per
Online-Checkout, geht die Seite automatisch auf seiner eigenen Domain live.

**Regeln:**

1. In Phasen bauen (Abschnitt 8). Laufende Phase nicht unterbrechen; Änderungen nur additiv
   (bestehende Tests bleiben grün, Migrationen nur additiv).
2. **Niemals ohne ausdrückliche Freigabe:** echte Briefe versenden, echte Zahlungen auslösen, Domains
   kaufen, Produktionsdaten löschen. Standard ist immer `DRY_RUN=true`.
3. Vor jeder externen API die aktuelle offizielle Dokumentation prüfen (Endpunkte, Felder, Preise,
   Limits, Nutzungsbedingungen). Dokumentation in `docs/integrations.md`. Nichts raten.
4. Bei Unklarheiten nachfragen, Fragen bündeln.
5. Jede externe Anbindung steckt hinter einem **Interface** (Provider-Pattern).
6. Alles ist **idempotent** und **kostenbewusst** (jede kostenpflichtige Aktion im Budget-Ledger).
7. Keine personenbezogenen Daten in Logs. Secrets nur über `.env`.
8. **Nur belegte Aussagen** (§ 5 UWG): keine unbelegten Zahlen oder Wirkungsversprechen in Briefen
   und Demos, Zahlen nur aus freigegebenen Claims (Baustein L1/L2), US-Daten nie als deutsche Daten.

## 1. Geschäftsmodell

- **Zielgruppe:** Lokale Betriebe in Deutschland ohne eigene Website, die gut laufen (gute
  Bewertungen). Start-Stadt: Dortmund. Branchen über Config/Playbooks erweiterbar (Handwerk, Beauty,
  ab L1 zusätzlich Gastronomie, Einzelhandel, Kurse & Training, Dienstleistung; Gesundheit und Recht
  ausgeschlossen).
- **Angebot – zwei gleichwertige Optionen, beide sofort beim Checkout bezahlt (keine 0-€-Anzahlung):**
  - **Option A „Einmalzahlung“: 590 €** (Stripe `mode=payment`) inkl. eigener Domain und 12 Monaten
    Hosting. Danach optional „Hosting & Pflege“ **19 €/Monat** ab Monat 13 (in v1: Erinnerungs-Mail
    30 Tage vor Ablauf mit Abo-Link).
  - **Option B „Monatlich“: 49 €/Monat** (Stripe `mode=subscription`), erste Rate sofort,
    **Mindestlaufzeit 12 Monate**; ab Monat 13 automatisch **19 €/Monat**, dann monatlich kündbar
    (Stripe Subscription Schedule: 12 Monate à 49 €, danach 19 €).
  - Mindestlaufzeit steht überall neben den 49 € (Brief, Demo-Karte, Checkout), ebenso
    „ab Monat 13 nur noch 19 €/Monat“ (Demo-Karte, Checkout).
  - **14-Tage-Zufriedenheitsgarantie** (Config, Standard an): Erstattung per Admin-Button, Seite
    offline, Domain freigeben bzw. übertragen; bei Option B Vertrag beenden und erste Rate erstatten.
  - Zahlungsarten: Karte und SEPA-Lastschrift (PayPal vorerst nicht – die Kunden sind Betriebe).
  - Alle Preise, Laufzeiten und die Garantie sind in der Config einstellbar.
- **Vertriebskanal:** ausschließlich personalisierter Werbebrief per Print-&-Mail-API. Keine
  Kalt-E-Mails, keine Kaltanrufe, keine SMS/WhatsApp (§ 7 UWG). E-Mails nur an Kontakte, die ihre
  Adresse selbst gegeben haben (Demo-Formular, Checkout). WhatsApp nur als Link, über den der Betrieb
  **uns** schreibt (kein Bot, keine ausgehenden Nachrichten).
- **Kauf ohne Gespräch:** Demo → „Seite übernehmen“ (zwei Preiskarten) → Stripe Checkout → Onboarding
  → Go-Live.
- Betreiber greift nur ein bei Freigaben (Review-Queue), Sonderfällen und Kundenfragen, die der
  Support-Agent nicht lösen kann.
- Startbudget klein (erste Charge ca. 40 Briefe). Kostenkontrolle kritisch.
- Rechtsform: Kleinunternehmer nach § 19 UStG. Per Config umstellbar.

## 2. Pipeline (Zustandsmaschine)

```
discovered → qualified → demo_built → demo_approved → demo_published
→ letter_generated → letter_approved → letter_sent → letter_delivered
→ scanned → cta_clicked → checkout_started → paid
→ onboarding → preview_approved → live
```

Nebenzustände: `rejected`, `suppressed`, `expired`, `followup_sent`, `failed` (mit Fehlergrund).
Jeder Übergang wird in `audit_log` protokolliert (Zeitstempel, Auslöser, Kontext).

## 3. Tech-Stack

- TypeScript strict, Node ≥ 22.12, pnpm-Monorepo
- `apps/web`: Next.js (App Router) – Admin, Review-Queues, `/q/[token]`, Kurz-URL `/{kurzcode}`,
  `/d/[slug]`, Checkout, Onboarding, Opt-out
- `apps/worker`: pg-boss – Cron-Jobs, Lead-Suche (wöchentlich), Generierung, Versand, Webhooks, Optimizer
- `packages/core`: Drizzle ORM, Typen, Provider-Interfaces, Services, Prompts
- `packages/templates`: Website-Templates (HTML + Tailwind kompiliert) und Brief-Template
- PostgreSQL 16, Playwright (Screenshots, PDF), `qrcode`, Anthropic SDK
  (`MODEL_CREATIVE=claude-opus-5-5`, `MODEL_BULK=claude-sonnet-5-5`, Tool-Use mit JSON-Schema,
  Prompt-Caching, Token-Verbrauch im Budget-Ledger)
- Stripe (Checkout, Subscriptions, Subscription Schedules), `MailProvider` (**easyNova digiBrief-API V1**
  als aktiver Briefdienst seit 27.10.2026; LetterXpress v3 und Pingen inaktive Alternativen), `RegistrarProvider` (INWX),
  `HostingProvider` (Cloudflare Workers Static Assets, Alternative Netlify), `EmailProvider`
  (Resend/Postmark), `LeadSource` (OSM Overpass, Google Places API (New) nur gemäß
  `docs/compliance-google.md`)
- Deployment: Docker Compose auf VPS, Caddy, tägliche Postgres-Backups mit Wiederherstellungstest
- Tests: Vitest, Playwright

## 4. Datenmodell

Tabellen: `leads`, `demos`, `letters`, `events`, `variants`, `orders`, `order_payments`, `customers`,
`sites`, `change_requests`, `support_messages`, `suppression_list` (nur Hash), `budget_ledger`,
`settings`, `audit_log`, `outbound_emails`, `webhook_events`, `reports`, `alerts`.
Dateien in Object Storage hinter Interface (lokal, später S3-kompatibel).

Ergänzungen aus Update 2 (Teil A, umgesetzt): `orders.plan` (`one_time`|`monthly`),
`orders.stripe_subscription_id`, `orders.min_term_ends_at`, `orders.guarantee_ends_at`,
`orders.refunded_at`; `leads.lead_segment` (`neu`|`social_only`|`etabliert`), `leads.first_seen_at`,
`leads.short_code`; `letters.sequence` (1–3), `letters.format` (`letter`|`postcard`, Standard `letter`),
`letters.stated_expires_at` (im Brief genanntes „online bis …“), `letters.estimated_delivered_at`;
neue Tabelle `order_payments` (Monatsraten mit eigener Rechnung).
Ergänzungen aus Teil B (B7) folgen mit den Bausteinen L1–L6.

## 5. Module

5.1 Lead-Finder (wöchentlich; OSM-Overpass als Standardquelle, Google nur im geprüften Modus;
Qualifizierung: keine Website / nur Social, geöffnet, Rating ≥ 4,5, vollständige Anschrift, nicht
gesperrt, 12 Monate nicht kontaktiert, keine Ketten, Score). **Segmente mit Priorität
neu > social_only > etabliert:** „neu“ = neu in den Suchergebnissen aufgetaucht mit 3–20 Bewertungen
(Mindestanzahl entfällt, Rating ≥ 4,5 bleibt); „social_only“ = Website-Link nur auf Instagram,
Facebook, TikTok, Linktree (Score-Bonus); „etabliert“ = übrige qualifizierte Leads (≥ 30 Bewertungen).
Handelsregister nur nach Compliance-Prüfung (`docs/compliance-handelsregister.md`), sonst nicht.

5.2 Demo-Generator (Claude-Content als JSON, harte Inhaltsregeln: keine erfundenen Fakten, keine
Testimonials, keine Logos/Fotos des Betriebs, Leistungen als Beispiel gekennzeichnet; ≥ 3 Templates je
Branchengruppe × 3 Paletten; WCAG 2.1 AA, Lighthouse ≥ 90; Demo-Banner mit
**[Seite übernehmen] [Frage per WhatsApp] [Kein Interesse]**; „Seite übernehmen“ zeigt zwei
gleichwertige Preiskarten (590 € einmalig / 49 €/Monat mit 12 Monaten Mindestlaufzeit, danach
19 €/Monat), keine Vorauswahl, keine versteckten Kosten; WhatsApp = `wa.me`-Link mit vorausgefülltem
Text „Frage zu meinem Website-Entwurf {slug}“; Vertrauensblock (Foto, Name, 2 Sätze, Kontakt,
Impressum-Link; niemals erfundene Referenzen); Formular an uns; Absender-Impressum; noindex via Meta,
Header, robots.txt; Ablauf nach 30 Tagen → 410; automatische QA; Review-Pflicht der ersten 30).
Branchen-Aufhänger auf der Demo (Speisekarte, Terminanfrage …) kommen mit L2.

5.3 Screenshots (Desktop 1440×900, Mobil 390×844, ohne Banner, Komposit mit eigenen Mockups).

5.4 QR + Tracking (`/q/{token}` und Kurz-URL `{TRACK_DOMAIN}/{kurzcode}` → Event `scan` → 302;
keine vollständige IP, keine Tracking-Cookies).

5.5 Brief-Generator (DIN 5008 Form B, Anschriftenfeld nach Anbieter-Spezifikation mit Test,
„An das Team von {Firmenname}“, 1 Seite, Art.-14- und Art.-21-Hinweis, darf nicht wie Rechnung
aussehen, Rating-Zeile nur mit `USE_RATING_IN_LETTER`, A/B-Varianten, Domain-Vorschlag mit
Verfügbarkeitsprüfung). QR-Code **mind. 4 × 4 cm** mit Nutzen-Satz („Scannen und Ihre fertige
Website ansehen – online bis {Ablaufdatum}“), Kurz-URL als Alternative, **beide Preisoptionen**
(590 € einmalig oder 49 €/Monat, 12 Monate Mindestlaufzeit) und Garantie-Satz (falls aktiv),
„bis {Ablaufdatum} online“ statt Löschfrist in Tagen. Ab L1/L2: Brieftexte aus Branchen-Playbooks als
Slot-Templates mit blockierendem Wahrheits-Check.

5.6 Versand (MailProvider, Budget-Guard gegen `WEEKLY_BUDGET_CENTS`, Freigabe solange
`AUTO_SEND=false`, `DRY_RUN`, Testmodus → Testbrief an Betreiber → echte Leads). Briefdienst
easyNova (Idempotency-Key, Status-Polling alle 30 Min., geschätzte Zustellung =
Versand + `DELIVERY_BUSINESS_DAYS`, Guthaben-Wächter, 3 Testaufträge mit `testFlag` → 1 echter Brief an den
Betreiber → erst dann echte Leads; Absenderzeile über dem Adressfenster Pflicht). LetterXpress (L3) und Pingen
bleiben nur als inaktive Alternativen im Code.

5.7 Follow-up (max. **3 Sendungen** pro Lead, alle als Brief): (2) kein Scan 12 Tage nach
geschätzter Zustellung → kurzer einseitiger Brief mit großem Demo-Bild „Ihre Website ist nur noch bis
{Datum} online“ (Datum = geschätzte Zustellung + 7 Tage), die Demo wird mindestens bis dahin verlängert; (3) heißer Lead (≥ 2 Demo-Aufrufe oder
CTA-Klick, kein Kauf nach 7 Tagen) → „Wir haben Ihre Seite verbessert“ (Demo wird vorher wirklich
überarbeitet); eine einzige Erinnerungs-Mail nur, wenn der Lead uns selbst mit E-Mail kontaktiert hat
(mit Abmeldelink). Format `letter` (Postkarte nur, falls der Briefdienst sie dokumentiert).

5.8 Checkout und Rechnung (Stripe Checkout, Plan-Wahl ohne Vorauswahl, Daten + Wunschdomain mit
Live-Prüfung, Pflicht-Checkboxen B2B und AGB inkl. Mindestlaufzeit bei Option B; Webhooks
`checkout.session.*`, `charge.refunded`, `invoice.paid`, `invoice.payment_failed`,
`customer.subscription.updated`, `customer.subscription.deleted`; Rechnung mit fortlaufender Nummer
und § 19 UStG-Hinweis für jede Zahlung, auch Monatsraten; fehlgeschlagene Monatszahlung:
Stripe Smart Retries, danach Seite im Wartungsmodus und Meldung an den Betreiber).

5.9 Onboarding und Go-Live (Onboarding-Link, Formular inkl. Impressum-Pflichtangaben und vom Kunden
eingefügter Datenschutzerklärung, Überarbeitung per Claude, Vorschau, max. 2 Änderungsrunden, Domain
auf den Kunden registrieren, Deploy ohne Banner/noindex, Formular an Kunden-E-Mail, Live-Check,
Übergabe-Mail).

5.10 Support-Agent (Klassifizierung `frage|aenderungswunsch|beschwerde|opt_out|rechnung|spam`,
Opt-out automatisch, sonst Entwurf → Review-Queue, Auto-Reply nur mit Schalter, keine Versprechen
außerhalb des Angebots; ab L6 zusätzlich Einwand-Kategorien).

5.11 Admin-Dashboard (ein Admin, Passwort + TOTP, Rate-Limiting, KPIs mit Filtern inkl. Anteil
Einmalzahlung vs. Monatlich, Review-Queues, Steuerung inkl. Not-Aus, Lead-Detail mit Timeline,
Garantie-Erstattung).

5.12 Optimizer und Lernsystem: wird durch die Bausteine **L5 (Bayes, Partial Pooling, Thompson
Sampling, Kontrollgruppe ≥ 15 %, Exploration ≥ 20 %, Power-Rechner, Sicherheitsnetze)** und
**L6 (wöchentlicher Lern-Agent mit Ein-Slot-Regel, Experiment-Logbuch, Review-Queue)** ersetzt
(Details `docs/spec-update-2.md` B6). Bis dahin läuft der bestehende Thompson-Sampling-Optimizer
(sonntags, Wochenbericht, Budgetänderung nur mit `AUTO_OPTIMIZE`).

5.13 Datenschutz (Verarbeitungsverzeichnis, Löschfristen, nächtlicher Lösch-Job, Auftragsverarbeiter,
Platzhalter für eigene Rechtstexte).

## 6. Konfiguration

Siehe `.env.example` und `packages/core/src/config/settings.ts`. Neu aus Update 2: Absender mit
WhatsApp-Nummer, Foto und Kurzvorstellung; alle Preise (590 €, 49 €, 19 €), Laufzeiten (12 Monate),
Garantie (an/aus, 14 Tage); `MAIL_PROVIDER=easynova`, `EASYNOVA_USERNAME`, `EASYNOVA_PASSWORD`,
`EASYNOVA_MODE=test`, `EASYNOVA_TEST_EMAIL` (LetterXpress-Variablen `LXP_*` nur für die Alternative),
`DELIVERY_BUSINESS_DAYS=3`, `MIN_LETTERS_PER_ARM=100`,
`AUTO_ACTIVATE_VARIANTS=false`, `MAX_CAC_CENTS=20000`, Auswertungsfenster 45 Tage.

## 7. Qualitätsregeln

TypeScript strict, ESLint/Prettier, idempotente Jobs mit Retries/Backoff/Dead-Letter, Webhook-Signaturen
und Replay-Schutz, JSON-Logging ohne PII, LLM-Token im Ledger, Unit- und E2E-Tests, Health-Endpoint,
Alerts per E-Mail, tägliche Backups mit Wiederherstellungstest, README mit Betriebshandbuch.

## 8. Phasen

| Phase | Inhalt                                                                                                                                        | Stand                                                              |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1     | Fundament                                                                                                                                     | fertig                                                             |
| 2     | Lead-Finder und Compliance                                                                                                                    | fertig                                                             |
| 3     | Demo-Generator, Demo-Hosting, QR                                                                                                              | fertig                                                             |
| 4     | Brief-Generator                                                                                                                               | fertig                                                             |
| 4a    | **L1** Claims und Playbooks (vor Phase 4)                                                                                                     | fertig, Claims-Freigabe im Dashboard offen                         |
| 4b    | **L2** Branchen-Briefe, Slot-Templates, Wahrheits-Check, Quellenseite, Branchen-Demo-Abschnitte                                               | fertig (Muster-PDFs zur Abnahme verschickt)                        |
| 5     | Versand → **L3** LetterXpress, seit 27.10.2026 ersetzt durch **easyNova** (Provider, Polling, Laufzeitschätzung, Guthaben-Wächter, Testmodus) | fertig im Testmodus; live erst nach 3 Testaufträgen und OK         |
| 6     | Checkout und Rechnung (inkl. Update 2 Teil A: 590 € / 49 €-Plan, Garantie, Abo-Webhooks)                                                      | fertig                                                             |
| 6a    | **L4** Messung (alle Events B6.1, Funnel-Sicht, Zeitfenster, Dashboard-Funnel)                                                                | fertig (Mess-Skript: Rechtsprüfung § 25 TDDDG offen)               |
| 7     | Onboarding und Go-Live                                                                                                                        | fertig                                                             |
| 8     | Support-Agent                                                                                                                                 | fertig                                                             |
| 9     | KPIs; Optimizer → ersetzt durch **L5** (Optimizer und Statistik) und **L6** (Lern-Agent)                                                      | KPIs fertig, L5 fertig (Simulationsbericht), L6 fertig (Probelauf) |
| 10    | Härtung und Go-Live-Vorbereitung                                                                                                              | fertig                                                             |
| –     | **L7** Zielgruppen-Modell und Timing (erst ab ≥ 300 ausgewerteten Briefen)                                                                    | zurückgestellt                                                     |

## 9. Checkliste vor dem ersten echten Versand

Siehe `docs/go-live-checkliste.md`.

## 10. Erste echte Charge (aus Update 2, B10)

- 40 Briefe, verteilt auf Gastronomie, Handwerk, Beauty (je ca. 13), Dortmund, Wochenbudget 60 € (Config)
- Lead-Filter: Rating ≥ 4,5; Segment „neu“ (3–20 Bewertungen) und „social_only“ zuerst, danach
  „etabliert“ (≥ 30 Bewertungen)
- Pro Branche: Startvariante mit Statistik gegen die neutrale Variante ohne Statistik als Kontrolle, 50/50
- Ziel der ersten 4 Wochen: Messkette prüfen und erste Scan-Raten mit Spannen sehen, nicht Gewinner finden
- Preise: 590 € einmalig oder 49 €/Monat (12 Monate Mindestlaufzeit, danach 19 €/Monat)
