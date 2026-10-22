# Auftrag: „Website-Brief-Maschine“

> Originaler Projektauftrag (Spezifikation). Abweichungen und Entscheidungen sind in
> `docs/entscheidungen.md` dokumentiert.

---

## 0. Rolle und Arbeitsweise

Senior Full-Stack Engineer. Produktionsreifes, weitgehend automatisiertes System, mit dem ein
Ein-Personen-Unternehmen lokalen Betrieben **ohne Website** eine fertige Demo-Website baut und ihnen per
**Post-Brief** (über eine Print-&-Mail-API) einen QR-Code zur Demo schickt. Kauft der Betrieb per
Online-Checkout, geht die Seite automatisch auf seiner eigenen Domain live.

**Regeln:**

1. In Phasen bauen (Abschnitt 8).
2. **Niemals ohne ausdrückliche Freigabe:** echte Briefe versenden, echte Zahlungen auslösen, Domains
   kaufen, Produktionsdaten löschen. Standard ist immer `DRY_RUN=true`.
3. Vor jeder externen API die aktuelle offizielle Dokumentation prüfen (Endpunkte, Felder, Preise,
   Limits, Nutzungsbedingungen). Dokumentation in `docs/integrations.md`.
4. Bei Unklarheiten nachfragen, Fragen bündeln.
5. Jede externe Anbindung steckt hinter einem **Interface** (Provider-Pattern).
6. Alles ist **idempotent** und **kostenbewusst** (jede kostenpflichtige Aktion im Budget-Ledger).
7. Keine personenbezogenen Daten in Logs. Secrets nur über `.env`.

## 1. Geschäftsmodell

- **Zielgruppe:** Lokale Betriebe in Deutschland ohne eigene Website, die gut laufen (viele gute
  Google-Bewertungen). Start-Branchen: Handwerk (Maler, Elektriker) und Beauty (Kosmetikstudio,
  Nagelstudio). Start-Stadt: Dortmund. Über Config erweiterbar.
- **Angebot:** „Website-Paket“ für **390 € einmalig** inkl. eigener Domain und 12 Monaten Hosting.
  Danach optional „Hosting & Pflege“ für **19 €/Monat** (ab Monat 13). Alle Preise in der Config.
- **Vertriebskanal:** ausschließlich personalisierter Werbebrief per Print-&-Mail-API. Keine
  Kalt-E-Mails, keine Kaltanrufe, keine SMS/WhatsApp (§ 7 UWG). E-Mails nur an Kontakte, die ihre
  Adresse selbst gegeben haben (Demo-Formular, Checkout).
- **Kauf ohne Gespräch:** Demo → „Diese Seite für 390 € übernehmen“ → Stripe Checkout → Onboarding →
  Go-Live.
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

- TypeScript strict, Node 20+, pnpm-Monorepo
- `apps/web`: Next.js (App Router) – Admin, Review-Queues, `/q/[token]`, `/d/[slug]`, Checkout,
  Onboarding, Opt-out
- `apps/worker`: pg-boss – Cron-Jobs, Lead-Suche, Generierung, Versand, Webhooks, Optimizer
- `packages/core`: Drizzle ORM, Typen, Provider-Interfaces, Services, Prompts
- `packages/templates`: Website-Templates (HTML + Tailwind kompiliert) und Brief-Template
- PostgreSQL 16, Playwright (Screenshots, PDF), `qrcode`, Anthropic SDK
  (`MODEL_CREATIVE=claude-opus-5-5`, `MODEL_BULK=claude-sonnet-5-5`, Tool-Use mit JSON-Schema,
  Prompt-Caching, Token-Verbrauch im Budget-Ledger)
- Stripe, `MailProvider` (Pingen, Alternative LetterXpress), `RegistrarProvider` (INWX),
  `HostingProvider` (Cloudflare Pages), `EmailProvider` (Resend/Postmark), `LeadSource`
  (Google Places API (New), Fallback OSM Overpass)
- Deployment: Docker Compose auf VPS, Caddy, tägliche Postgres-Backups
- Tests: Vitest, Playwright

## 4. Datenmodell

Tabellen: `leads`, `demos`, `letters`, `events`, `variants`, `orders`, `customers`, `sites`,
`support_messages`, `suppression_list` (nur Hash), `budget_ledger`, `settings`, `audit_log`.
Dateien in Object Storage hinter Interface (lokal, später S3-kompatibel).

## 5. Module

5.1 Lead-Finder (Places Text Search mit minimaler Feldmaske, Overpass-Fallback, Qualifizierung:
keine Website / nur Social, OPERATIONAL, Rating ≥ 4,5, ≥ 30 Bewertungen, vollständige Anschrift,
nicht gesperrt, 12 Monate nicht kontaktiert, keine Ketten, Score) inkl. Compliance-Prüfung
`docs/compliance-google.md`.

5.2 Demo-Generator (Claude-Content als JSON, harte Inhaltsregeln: keine erfundenen Fakten, keine
Testimonials, keine Logos/Fotos des Betriebs, Leistungen als Beispiel gekennzeichnet; ≥ 3 Templates je
Branchengruppe × 3 Paletten; WCAG 2.1 AA, Lighthouse ≥ 90; Demo-Banner mit
[Für 390 € übernehmen] [Frage stellen] [Kein Interesse]; Formular an uns; Absender-Impressum; noindex
via Meta, Header, robots.txt; Ablauf nach 30 Tagen → 410; automatische QA; Review-Pflicht der ersten 30).

5.3 Screenshots (Desktop 1440×900, Mobil 390×844, ohne Banner, Komposit mit eigenen Mockups).

5.4 QR + Tracking (`/q/{token}` → Event `scan` → 302; keine vollständige IP, keine Tracking-Cookies).

5.5 Brief-Generator (DIN 5008 Form B, Anschriftenfeld nach Anbieter-Spezifikation mit Test,
„An das Team von {Firmenname}“, 1 Seite, Art.-14- und Art.-21-Hinweis, darf nicht wie Rechnung
aussehen, Rating-Zeile nur mit `USE_RATING_IN_LETTER`, A/B-Varianten, Domain-Vorschlag mit
Verfügbarkeitsprüfung). Brieftext Variante A siehe `packages/core/src/letters/variants.ts`.

5.6 Versand (MailProvider, Budget-Guard gegen `WEEKLY_BUDGET_CENTS`, Freigabe solange
`AUTO_SEND=false`, `DRY_RUN`, Sandbox → Testbrief an Betreiber → echte Leads, Status-Webhooks).

5.7 Follow-up (kein Scan 12 Tage nach Zustellung → zweiter kürzerer Brief, max. 2 Briefe).

5.8 Checkout und Rechnung (Stripe Checkout, Daten + Wunschdomain mit Live-Prüfung, Pflicht-Checkboxen
B2B und AGB, Paket 390 €, optionales Abo 19 €/Monat ab Monat 13 – in v1 aus, stattdessen
Erinnerungs-Mail 30 Tage vor Ablauf; Rechnung mit fortlaufender Nummer und § 19 UStG-Hinweis).

5.9 Onboarding und Go-Live (Onboarding-Link, Formular inkl. Impressum-Pflichtangaben und vom Kunden
eingefügter Datenschutzerklärung, Überarbeitung per Claude, Vorschau, max. 2 Änderungsrunden, Domain
auf den Kunden registrieren, Deploy ohne Banner/noindex, Formular an Kunden-E-Mail, Live-Check,
Übergabe-Mail).

5.10 Support-Agent (Klassifizierung `frage|aenderungswunsch|beschwerde|opt_out|rechnung|spam`,
Opt-out automatisch, sonst Entwurf → Review-Queue, Auto-Reply nur mit Schalter, keine Versprechen
außerhalb des Angebots).

5.11 Admin-Dashboard (ein Admin, Passwort + TOTP, Rate-Limiting, KPIs mit Filtern, Review-Queues,
Steuerung inkl. Not-Aus, Lead-Detail mit Timeline).

5.12 Optimizer (sonntags, Thompson Sampling auf Kaufrate mit Scan-Rate als Prior, ≥ 20 % Exploration,
Wochenbericht, Budgetänderung nur mit `AUTO_OPTIMIZE`).

5.13 Datenschutz (Verarbeitungsverzeichnis, Löschfristen, nächtlicher Lösch-Job, Auftragsverarbeiter,
Platzhalter für eigene Rechtstexte).

## 6. Konfiguration

Siehe `.env.example` und `packages/core/src/config/settings.ts`.

## 7. Qualitätsregeln

TypeScript strict, ESLint/Prettier, idempotente Jobs mit Retries/Backoff/Dead-Letter, Webhook-Signaturen
und Replay-Schutz, JSON-Logging ohne PII, LLM-Token im Ledger, Unit- und E2E-Tests, Health-Endpoint,
Alerts per E-Mail, tägliche Backups mit Wiederherstellungstest, README mit Betriebshandbuch.

## 8. Phasen

1. Fundament · 2. Lead-Finder und Compliance · 3. Demo-Generator, Demo-Hosting, QR ·
4. Brief-Generator · 5. Versand · 6. Checkout und Rechnung · 7. Onboarding und Go-Live ·
8. Support-Agent · 9. KPIs und Optimizer · 10. Härtung und Go-Live

## 9. Checkliste vor dem ersten echten Versand

Siehe `docs/go-live-checkliste.md`.

## 10. Startparameter

- Stadt: Dortmund
- Suchbegriffe: „Nagelstudio Dortmund“, „Kosmetikstudio Dortmund“, „Malerbetrieb Dortmund“,
  „Elektriker Dortmund“
- Filter: ≥ 4,5 Sterne, ≥ 30 Bewertungen, keine eigene Website
- Erste Charge: 40 Briefe (20 Beauty, 20 Handwerk), Wochenbudget 60 €
- Preis: 390 € einmalig inkl. Domain und 12 Monaten Hosting
