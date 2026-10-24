# SeitenWerk: Übernahme von Claude Code durch Codex

Stand: 24.10.2026. Geprüfter Git-Stand: `13ffde2` (34 Commits im vorhandenen Verlauf).
Arbeitsbaum vor Beginn sauber. Diese Übernahme ändert Dokumentation, keine Anwendungslogik.
Keine externen Konten, laufenden Produktionssysteme oder Datenbankinhalte abgefragt; kein Deployment,
Versand, Kauf, Refund, DNS-Wechsel oder Worker-Start. `DRY_RUN=true` in `.env.example` und der
sichere Standard im Code wurden nicht verändert. Ein laufendes Fremdsystem wurde nicht überprüft.

## Ergebnis

Das Projekt ist weitgehend implementiert. Phasen 1–10, Update 2 Teil A und L1–L6 sind durch Code,
Migrationen, Tests und Commits belegt. Daraus folgt noch keine Produktionsreife im konkreten Konto:
Rechtstexte, Betriebsumgebung, externe Einrichtung und mehrere Abnahmen bleiben offen.
Keinen Neuaufbau beginnen; vorhandene Komponenten gezielt vervollständigen.

`AGENTS.md` ist der neue Einstieg für Codex und enthält die aktuellen Betreiberentscheidungen.
`CLAUDE.md` und die ursprüngliche Spezifikation bleiben als historische fachliche Grundlage erhalten.
Bei abweichenden alten Angaben gelten die ausdrücklich dokumentierten neuen Entscheidungen.

## Gelesene Grundlagen

- `CLAUDE.md`, `README.md`, `docs/spec-update-2.md`, `docs/entscheidungen.md`, `docs/AUFTRAG.md`.
- `docs/integrations.md`, `docs/go-live-checkliste.md`, `docs/compliance.md`,
  `docs/compliance-google.md`, `docs/agb-anforderungen.md`.
- `docs/auftragsverarbeiter.md`, `docs/verarbeitungsverzeichnis.md`, `docs/claims-verifikation.md`.
- `docs/experiments.md`, `docs/simulation-l5.md`, `docs/lern-agent-probelauf.md`,
  `apps/web/AGENTS.md` sowie Konfiguration, Paketdefinitionen und relevante Implementierungen/Tests.

Die mehrfach referenzierte `DESIGN.md` ist im aktuellen Repository nicht vorhanden. Die bedingt
erwähnte `docs/compliance-handelsregister.md` fehlt ebenfalls; Handelsregister bleibt daher außen vor.
Das Muster-PDF unter `docs/beispiele/` ist vorhanden; keine neue visuelle PDF-Abnahme durchgeführt.

## Architektur und Entwicklungsverlauf

| Bereich       | Vorhandener Bestand                                                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web           | Next.js 16.4.2, React 19.3.1, App Router; öffentliche Firmenwebsite, Admin, Demo-/QR-Routen, Stripe-Weiterleitung, Onboarding, Vorschau, Webhooks                                |
| Worker        | Node mit pg-boss; Pipeline alle 5 Minuten, Briefstatus alle 30 Minuten, wöchentliche Suche, Retention, Mahnverfahren, Optimizer/Lern-Agent                                       |
| Fachlogik     | `packages/core/src/services`, Provider-Interfaces und Registry, Budget/Audit/Idempotenz, Auth mit TOTP, Rendering per Chromium                                                   |
| Daten         | PostgreSQL/Drizzle; 11 versionierte Migrationen `0000`–`0010`, materialisierte Funnel-Sichten, Claims/Experimente/Einwände                                                       |
| Vorlagen      | 15 Basislayouts in fünf Gruppen plus fünf Plakat-Varianten, Paletten, Brief/Rechnung/Wartung; Dienstleistung als Fallback                                                        |
| Integrationen | Anthropic, OSM, optional Google; LetterXpress; Stripe; INWX; Cloudflare/Netlify; Resend/Postmark; lokal/S3. Mocks vorhanden                                                      |
| Betrieb       | Docker Compose, Caddy, Backup-/Restore-Skripte bereits vorhanden; derzeitiger Betreiberwunsch: VPS später                                                                        |
| Firmenwebsite | Statischer Export mit `SITE_STATIC` und `apps/web/scripts/export-site.mjs`; ausgelieferte Dateien brauchen keine DB, die Quell-App für den Export nutzt Einstellungen aus der DB |

Die statische Firmenwebsite ersetzt nicht Admin, Demo-Auslieferung, Checkout-Endpunkte, Webhooks oder
Worker. Eine Supabase-Datenbank allein betreibt weder Next.js noch pg-boss-Worker oder Chromium.

Historische Meilensteine:

- `8a25b47` bis `5e61361`: Fundament und Phasen 1–10, zunächst mit Pingen.
- `e04403d`: neue Preise, Monatsplan, Garantie, Segmente und Follow-ups.
- `f6c815b`: Betreiberantworten umgesetzt, u. a. Garantie ab Go-Live, Mahnverfahren und Live-Sperren.
- `8ef6cb9` bis `84612c5`: Claims/Playbooks, Branchenbriefe/-Demos, LetterXpress, Messung,
  Optimizer und Lern-Agent; Pingen seitdem nur Alternative.
- `9160581`, `923d4f1`: Firmenwebsite, weiß/blaues Design, direkter gehosteter Stripe-Checkout.
- `5535e63`, `5baa997`: diagonale Beispiel-Treppe statt Karussell, anschließend im Hero.
- `069bbeb`: Plakat für alle fünf Gruppen.
- `13ffde2`: ruhigere, größere Hero-Beispiele; statischer Export für das dokumentierte Netlify-Projekt
  `seitenwerk-website`. Tatsächlicher Hosting-/Domainstatus wurde hier nicht extern verifiziert.

## Aktuelle Entscheidungen und Abweichungen

| Neueste Vorgabe               | Befund / Konsequenz                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kein persönliches Foto        | Website hat bereits Initialen-Fallback; `readiness.ts` erzwingt trotzdem ein Foto. Foto-Pflicht muss entfallen, ohne andere Live-Prüfungen aufzuweichen. Keine Bitte um Foto |
| Plakat behalten               | In `packages/templates/src/sites/plakat.ts` und Registry vorhanden; unverändert erhalten                                                                                     |
| VPS später                    | Alte VPS-Anleitung ist eine spätere Betriebsoption, kein aktueller Arbeitsauftrag                                                                                            |
| Supabase bevorzugt            | Im Repository noch keine Supabase-Anbindung. Bestehende Postgres-/Drizzle-Architektur als Grundlage behalten                                                                 |
| Resend verbunden              | Betreiberangabe übernommen; Resend-Provider existiert. App-Key/Domain/Inbound hier nicht nachgewiesen und nicht verändert                                                    |
| Stripe und DNS beim Betreiber | Bestehende Integration erhalten, Einrichtungsschritte zuordnen, keinerlei Konten-/DNS-Änderungen durch Codex                                                                 |

## Offene Aufgaben nach Priorität

P0 bezeichnet Voraussetzungen für sichere Weiterarbeit bzw. späteren Livebetrieb, keinen Auftrag zu
sofortigen externen Aktionen. Zuständigkeiten sind Vorschläge für die weitere Arbeit.

| Prio | Aufgabe                                         | Zuständig                                           | Erledigt, wenn …                                                                                                                                                                      |
| ---- | ----------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0   | Foto-Pflicht entfernen                          | Codex, nächste Codeänderung                         | `sender.photoUrl` kein Go-Live-Blocker mehr; Website/Demos ohne Betreiberfoto stimmig; passende Readiness-Regression geprüft                                                          |
| P0   | Laufzeitplan ohne sofortigen VPS konkretisieren | Codex vorbereitet, Betreiber entscheidet            | Zuständigkeiten für öffentliche Website, dynamische App, dauerhaften Worker, Chromium und Dateien dokumentiert; keine Dienste provisioniert                                           |
| P0   | Supabase-Anbindung vorbereiten                  | Codex                                               | EU-Region, direkte PostgreSQL-Verbindung/Pooler-Kompatibilität mit pg-boss, Rechte, Migrationen, TLS und Backups geprüft; vorhandene Services bleiben; kein Testsetup gegen echte DB  |
| P0   | Sichere lokale Testumgebung festlegen           | Codex                                               | Explizite Mocks und isolierte lokale Test-DBs; keine übernommenen Live-Keys oder bestehenden Nutzdaten als Testziel                                                                   |
| P0   | Echte Firmen-/Absenderdaten und Rechtstexte     | Betreiber                                           | Gewerbe/Impressum, Datenschutz, AGB, Steuer-/Preisregel und Bankdaten hinterlegt; kein persönliches Foto verlangt                                                                     |
| P0   | Compliance und Verarbeitung prüfen              | Betreiber mit Beratung                              | Interessenabwägung, AV-Verträge auch für Kundenformulare, finale Dienstleister/Regionen, Aufbewahrung und § 25 TDDDG dokumentiert                                                     |
| P0   | Bewertungsquelle/Startfilter klären             | Betreiber, Codex dokumentiert                       | Entweder OSM ohne Ratings bewusst akzeptiert oder zulässige Bewertungsquelle freigegeben; „neu“, ≥4,5 Sterne und Bewertungszahlen nicht für OSM versprochen                           |
| P0   | Resend-App-Konfiguration prüfen                 | Codex lokal vorbereitet; Domain/DNS Betreiber       | Provider/Secret-Bindung, Absender und Region festgelegt; SPF/DKIM/DMARC vom Betreiber bestätigt. Verbundene App nicht mit Laufzeitkonfiguration gleichsetzen                          |
| P0   | Eingangskanal für Support/Opt-out festlegen     | Betreiber/Codex                                     | Vorhandener IMAP- oder Postmark-Inbound-Pfad passend eingerichtet und später isoliert getestet; Resend-Ausgangsverbindung allein reicht nicht                                         |
| P1   | Stripe-Einrichtung vervollständigen             | **Betreiber**                                       | Sandbox-Key/Signing Secret, SEPA, Smart Retries, Branding und später getrennte Live-Einrichtung; siehe bestehende Checkliste                                                          |
| P1   | Gehosteten Stripe-Checkout abnehmen             | Betreiber; Codex nur isolierte Prüfung              | Beide Pläne, B2B/AGB, Domain, Kundendatenübernahme, asynchrone SEPA-Zahlung, Rechnungen, 12→19-€-Wechsel und Garantie belegt; keine echte Zahlung in dieser Übernahme                 |
| P1   | LetterXpress einrichten und abnehmen            | Betreiber; Codex erst auf weiteren Auftrag          | Zugang/Guthaben, drei Testaufträge mit Anschrift, QR und Preisprüfung; anschließend separat freigegebener echter Betreiber-Testbrief. Bisherige Umsetzung ersetzt diese Abnahme nicht |
| P1   | Claims freigeben / Gastro-Quelle ersetzen       | Betreiber gibt frei; Codex recherchiert bei Auftrag | Nutzbare Claims geprüft/freigegeben; Gastro hat neue Primärquelle oder bleibt ohne Statistik; US-Claims bleiben gesperrt                                                              |
| P1   | Musterbriefe und Demos abnehmen                 | Betreiber                                           | Je zwei Brief-PDFs je Branche geprüft; erste 30 Demos manuell geprüft; keine unbelegten Aussagen                                                                                      |
| P1   | L4-Funnel vollständig abnehmen                  | Codex in isoliertem Testsystem                      | Scan → Demo → CTA → Stripe-Sandbox-Kauf nachvollziehbar; Status nicht allein aus existierender Sicht ableiten                                                                         |
| P1   | Mess-Beacon rechtlich entscheiden               | Betreiber                                           | `metrics.engagementBeacon` bewusst gewählt. Er ist im Bestand eingeschaltet; Cookie-Freiheit klärt § 25 TDDDG nicht automatisch                                                       |
| P1   | Betriebsprüfungen vor Start                     | Codex vorbereitet, Betreiber DNS/Stripe             | TLS, strikter Healthcheck, Uptime-Monitor, Backup samt Wiederherstellung und externe Sicherung, Sandbox-Domain/Hosting-Ende-zu-Ende belegt                                            |
| P1   | Statischen Export abnehmen                      | Codex lokal                                         | Elf Routen, Navigation, Assets, Kontaktwege, 404 und noindex funktionieren auf statischem Hosting; Einstellungen/Rechtstexte passen; Export nach Änderungen wiederholen               |
| P2   | Demo-/Preisvarianten B6.6 ergänzen              | Codex, späterer Auftrag                             | Varianten werden tatsächlich zugeteilt/ausgeliefert und gemessen. Der Typ `demo_banner\|price` existiert, vollständige Umsetzung nicht belegt; L6-Demo-Slot ausdrücklich vertagt      |
| P2   | L7 Zielgruppenmodell/Timing                     | Später                                              | Frühestens ≥300 ausgewertete Briefe, vorher kein aktives Modell; derzeit zurückgestellt                                                                                               |
| P2   | Dokumentationsaltlasten bereinigen              | Codex                                               | Fehlende DESIGN-Quelle geklärt; README-Templatezahl (noch sechs), alte Foto-/VPS- und Phasenformulierungen konsistent; historische Spezifikation erkennbar erhalten                   |

Die Go-Live-Checkliste ist bis auf den historisch dokumentierten Sandbox-Webhook weitgehend offen.
Checkboxen sind kein Live-Kontennachweis. Insbesondere Rechtsdaten, Claims-Freigaben und externe
Tests können aus dem Repository nicht als erledigt erklärt werden.

## Zusätzliche technische Befunde

- **Dry-Run ist begrenzt:** `effectiveSwitches` bildet `env.DRY_RUN || cfg.switches.dryRun`.
  Der E-Mail-Service ruft jedoch direkt den gewählten Provider auf; der Checkout-Modus wird aus
  Stripe-Provider/Key abgeleitet. `DRY_RUN=true` allein garantiert daher keine Wirkungslosigkeit.
  Für künftige Tests alle Provider ausdrücklich mocken. Ob eine zusätzliche globale Sperre gewünscht
  ist, kann als spätere Härtung umgesetzt werden; hier wurde keine Logik verändert.
- **Worker-Start verändert Zustand:** Migrationen und Seeds standardmäßig aktiv; danach Cron-Jobs.
  Während der Übernahme nicht gestartet.
- **Destruktives Testsetup:** `packages/core/test/global-setup.ts` führt DROP/CREATE DATABASE gegen
  `TEST_DATABASE_URL` aus. Nur für dedizierte lokale Wegwerf-DBs. Kein Supabase-/Produktionsziel.
- **L4-Fenster:** Die SQL-Sicht verwendet feste 45 Tage. Ein anderer ENV-Wert erzeugt laut
  Entscheidungsdokument Warnung; eine andere fachliche Frist braucht eine Anpassung der Sicht.
- **L3-Idempotenz:** Suche vor POST nur auf der ersten Listenseite, Rate-Limiter im Prozess.
  Für mehrere Worker/mehr als 15 passende Aufträge ist die dokumentierte Grenze vor Skalierung
  zu prüfen; kein pauschaler Beleg für globale Idempotenz.
- **L5-Grenzen:** Simulation nennt bei identischen Varianten 6 % falsche Gewinner am Ende und 16 %
  irgendwann während wiederholter Auswertung. Kein fehlerfreier Gewinnernachweis; Kontrolle und
  Review beibehalten. Der L6-Probelauf ist ausdrücklich Mock/Simulation, kein echter Versandnachweis.

## Verifikation dieser Übernahme

- ESLint über das gesamte Repository: erfolgreich.
- TypeScript `--noEmit` für Core, Templates, Web und Worker: erfolgreich.
- Template-Tests: **97/97 erfolgreich** (vorhandenes lokales Vitest 3.2.7).
- Keine vollständigen Core-/DB-/Playwright-E2E-Tests und kein Produktionsbuild ausgeführt; für die
  Dokumentationsübernahme keine Datenbank angelegt/gelöscht oder Laufzeit mit Jobs gestartet.
- Der erste Versuch `pnpm lint && pnpm typecheck` scheiterte vor ESLint an der Umgebung:
  installiertes pnpm 11.25.0 statt vorgesehenem 10.28.0 wollte Abhängigkeiten automatisch neu
  installieren und brach ohne TTY ab. Danach lokale vorhandene ESLint-/TypeScript-Binaries direkt
  verwendet, ohne Installation oder Lockfile-Änderung. Vor normaler Entwicklung pnpm-Version angleichen.

Sinnvolle nächste Codeaufgabe: die Foto-Pflicht gezielt entfernen und Readiness testen. Danach den
Betriebsplan mit Supabase und späterem VPS konkretisieren. Keine abgeschlossenen Phasen neu bauen.
