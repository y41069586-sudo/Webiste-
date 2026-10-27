# Claude-Übernahme 27.10.2026 – Restaufgabenmatrix

Basis `96498d3` (`codex/conversion-v4`), lokaler Branch `claude/v4-restarbeiten`, lokale Commits, kein Push/Deploy.
Legende: **I** implementiert · **L** lokal getestet · **M** nur mit Mock getestet · **A** echter Anbieter geprüft
(lesend) · **E** extern einzurichten · **F** Betreiberfreigabe/-entscheidung fehlt.

| # | Aufgabe | Stand | Nächster Schritt (Nachweis) |
|---|---|---|---|
| 1 | Automatische Recherche | I/L: manueller Recherchepfad mit 4 Website-Methoden (Codex); **neu** opt-in Website-Vorprüfung (Schalter aus) | F: Vorprüfung freischalten (`targeting.acquisition.websiteProbe=true`) und an echten Leads beobachten; vollautomatische Namens-/Ortssuche braucht einen Such-Anbieter → Anbieter- und Nutzungsbedingungsentscheidung |
| 2 | Betriebscharakter/Demoqualität | I/L (Codex, Bericht 9 Bereiche) | F: visuelle Abnahme; Maler-Beispiel im Startseiten-Hero zeigt noch die nicht gewünschte Farbflächen-Studie |
| 3 | Echte Modellqualität | I, nur Fixtures | E/F: Anthropic-API-Schlüssel sicher in Laufzeit + Kostenrahmen → echte Antworten prüfen |
| 4 | Briefe/physischer Druck | I/L (24 PDFs, QR aus Raster) | F: 1:1-Probedruck (kostenfrei am eigenen Drucker möglich) mit Smartphones und Fensterumschlag |
| 5 | Anbieter-/Vertrags-/Steuerangaben | Entwürfe; Export sperrt wegen `TODO` in Impressum/Datenschutz/AGB | F: Steuerstatus, USt-/W-IdNr., Annahmezeitpunkt, AV-Vertrag LLM-Anbieter, Kundenhosting entscheiden; Rechtsprüfung |
| 6 | Supabase-Backup/Restore | Skripte vorhanden (`infra/backup/*`, `storage:backup`) | E: Datenbank-Passwort/Session-Pooler-Zugang sicher bereitstellen → verschlüsseltes Backup + isolierter Restore mit Hashvergleich |
| 7 | Migrationen/pg-boss | **L: Generalprobe ok** (`rehearse-production-upgrade.ts`); **0019** behebt Funnel-Rechte | F: nach Backup Freigabe für 0011–0019, `queue:prepare --apply`, `queue-permissions.sql` (Reihenfolge im VPS-Dokument) |
| 8 | Privater Storage | Bucket vorhanden (1 Objekt), Adapter vorhanden | E: S3-Zugangsdaten in sichere Laufzeit → Put/Get/Head/List/Delete mit fiktiven Objekten |
| 9 | Worker-Image/Betrieb | **L: Chromium-Image gebaut und gehärtet geprüft** (Health, Job, PDF, SIGTERM, Neustart, 623 MiB Spitze) | F: VPS bestellen (Vorschlag netcup VPS 500 G12.5, 9,50 €/Monat); danach Alarme/Kostenlimits im Dauerbetrieb |
| 10 | Secrets/Runtime | Stripe/Resend/S3 laut Codex in Netlify; Resend-Key nur senden (geprüft) | E: Anthropic- und LetterXpress-Zugang; Worker-`.env.worker` (chmod 600) auf VPS |
| 11 | Website/App/Routen | **beide öffentlich veraltet (590/49; statisch zusätzlich Platzhalter)**; Exportsperre + `/so-funktionierts`-Fix | F: Rechtstext-TODOs klären → Export → Deployment-Freigabe statisch; App-Deployment-Freigabe; DEMO_DOMAIN/TRACK_DOMAIN |
| 12 | Stripe-Sandbox | A: Preise 597/19/99 aktiv, Webhook-Routing korrekt | E/F: App mit aktuellem Code deployen (Sandbox-Keys) → Basis und Care+ Kaufkette inkl. Fehlerfälle |
| 13 | Resend/Support | A: Domain verifiziert, Senden/Empfang aktiv | F: ausdrücklich autorisierte eigene Testnachrichten |
| 14 | LetterXpress | I (Adapter, Testmodus) | E/F: Zugang + Freigabe ggf. kostenpflichtiger Testaufträge |
| 15 | Domain/Kundenhosting | I (INWX-Sandbox, Hostingadapter) | E/F: Sandbox-Zugang, Testausgabe |
| 16 | Vollständige Anbieter-E2E | M (14/14 Browser-E2E, Codex) | nach 6–15 |
| 17 | Funnel/Conversion | I/L: Test-/Kontroll-/Mock-/Nicht-Live-Ereignisse ausgeschlossen (0018, `funnel-v4.ts`) | echte Daten fehlen; 2 % bleibt Ziel, kein Messwert |
| 18 | Finale Qualität | **L: Core-Volllauf 577/577 (65 Dateien) in einem Durchlauf**, Templates 111/111, Root 25/25, TypeScript, Lint, Turbopack-Build | Browser-E2E (`pnpm test:e2e`) nach den Änderungen nicht erneut vollständig gelaufen; nur gezielte Website-Prüfung |

## Neue Befunde dieser Übernahme

1. **Öffentlich falsche Angaben:** `seitenwerk.world` zeigt 590 €/49 €, example.com, „Vorname Nachname“,
   Musterstraße; `seitenwerkworld.netlify.app` zeigt 590/49 auf Start-, Preis- und Ablaufseite. Beides noindex,
   aber erreichbar. Behebung nur per freigegebenem Deployment.
2. **Produktionsfehler vor Migration gefunden:** Backend-Rolle konnte Funnel-Sichten nie auffrischen und hätte
   nach 0018 auch keinen Lesezugriff → 0019.
3. **Ablaufseite** mischte 597 € mit dem Legacy-Monatspreis 49 € → korrigiert.
4. **Rechtstext-Entwürfe** enthalten sichtbare `TODO`-Vermerke → Export gesperrt, bis entschieden.
