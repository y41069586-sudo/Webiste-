# V4 / V5 – fortlaufende Übergabe

Stand 25.10.2026. **Nicht veröffentlicht. DRY_RUN=true.** Keine produktiven Migrationen,
DNS-Änderungen, Briefe, Zahlungen, Erstattungen oder Domainkäufe freigegeben.

## Sicherung und Arbeitsbasis

- Repository `y41069586-sudo/Webiste-`, bestehendes Worktree `/workspace/seitenwerk-v4`,
  Branch `codex/conversion-v4`; Ursprung `fbff0cc`, letzter sicherer Commit vor Fortsetzung
  `24d23f7`. Hauptbranch nicht zurückgesetzt. Originalworktree `/workspace/Webiste-` nicht ändern.
- Phase 0: Status, Branch, letzte Commits, staged/unstaged/neue Dateien geprüft. Kein staged Diff.
- Unterbrochener Diff zusätzlich `/tmp/seitenwerk-v4-rescue.patch`, neue Dateien
  `/tmp/seitenwerk-v4-untracked-rescue.tar.gz` gesichert. Diese temporären Sicherungen ersetzen
  keine überprüften Git-Commits.
- Grundlagen: AGENTS/CLAUDE/README, Spezifikation/Entscheidungen, Übernahme-/Projektstand,
  V4-Bericht, Integrationen, Compliance und Go-Live-Unterlagen. Alte Preis-/Betriebsangaben sind
  historische Momentaufnahmen; jüngster V4/V5-Auftrag hat Vorrang.

## Bestandsaufnahme vor Fortsetzung

| Bereich | Stand | Nächster Nachweis |
| --- | --- | --- |
| V4 597 + 19 / 99, Bestell-Snapshot, Legacy-Erhalt | implementiert und zuvor lokal getestet | Regression nach Fortsetzung |
| Automatischer Monatsstart erst nach echtem Go-Live | teilweise, uncommitted | gespeichertes Mandat, Fehler-/Retry-/Webhooktests |
| Tarifwechsel / Kündigung | Services teilweise, uncommitted | Oberfläche, Periodenwechsel, Idempotenz |
| Care+-Zeit / monatlicher Technikcheck | Services und additive Migration vorbereitet | Oberfläche, Integrationstests |
| Echte Kosten / Deckungsbeitrag je Brief und Versuchsarm | Service vorbereitet | Oberfläche, Datenvollständigkeit, Tests |
| Stripe-Sandbox-Katalog / blaues Branding | zuvor extern angelegt und zurückgelesen | keine Duplikate; Zahlungen getrennt abnehmen |
| Demos / Briefe | 20 Vorlagen vorhanden; zuvor fünf V4-Demos und 15 PDFs geprüft | mindestens zehn echte Desktop-/Mobilrender, sichtbare Verbesserungen |
| Öffentliche Website | V4-Preise im Code, getrennte statische Bereitstellung | Qualität, Export-/Linkprüfung; keine Veröffentlichung |
| Worker / pg-boss | vorhandener langlebiger Worker, lokale Testqueue möglich | Supabase-tauglicher Betrieb ohne zweite Produktions-DB |
| Storage / Resend / weitere Provider | Adapter vorhanden, externe Abnahme teilweise offen | Mock und echter Provider klar getrennt ausweisen |
| Backup / Restore | Skripte vorhanden, Betriebsnachweis offen | isolierter lokaler Restore, Supabase-/Storage-Konzept |
| Steuer / finale Rechtstexte / Bankdaten | externe Angaben bzw. Freigabe erforderlich | niemals erfinden oder selbst freigeben |

## Angefangene Dateien

`packages/core/src/services/{billing-v4,care-v4,economics-v4,tariffs-v4}.ts`,
Migration `0013_v4_operations.sql` samt Meta, Schema, Config, Stripe-/Mock-Payment-Provider,
Payment-Typen, Orders/Recurring/Renewals/Budget/Finance, Livecheck, E-Mails, Core-Exports und
Worker-Pipeline. Sie waren bei Wiederaufnahme noch **nicht abgenommen**.

## Prüfstand

- Vorherige belegte Prüfungen: `conversion-optimization-v4.md`, nicht als neuer Lauf ausgeben.
- Unterbrochener Stand: Core-TypeScript zuletzt erfolgreich; Migration nur generiert/lokal vorgesehen.
- Noch auszuführen: neue Operations-Integrationstests, komplette Regression, E2E, visuelle Matrix,
  PDF/QR, sicherer Queue-/Restore-Nachweis, Build/Lint/Types.
- Testziele ausschließlich lokale explizite `*_test` / `*_e2e`-Datenbanken.
  Niemals Supabase für destruktives Testsetup verwenden.

## Aktueller Arbeitsschritt

Bestehende V4-Operationsservices fertigstellen und an bestehende Kunden-/Adminansichten anbinden;
danach isoliert testen und zusammenhängend committen. Weitere Pakete: Worker/Queue/Betrieb,
Demo-/Brief-/Firmenwebsitequalität, vollständige QA und Abschlussbewertung.

## Go-Live-Sperren

Keine Produktionsfreigabe. Kein dauerhaft abgenommener Worker, keine produktive Queue-/Storage-/
Backup-Abnahme, kein vollständiger echter Provider-End-to-End-Nachweis. Finale Rechts-/Steuer-/
Vertragsfreigaben fehlen. V4-Live-Stripe technisch gesperrt. Erste 30 Demos bleiben manuell zu prüfen.
Aktueller Status: **bereit für interne Weiterentwicklung und isolierte Tests; kein Versandstart**.

## Paket 1 – V4-Betriebsfunktionen abgeschlossen (lokal)

- Automatischer Mandatsstart nach Go-Live mit Zeilensperre, stabilem Idempotency-Key und
  Wiederfinden bereits angelegter Stripe-Abos nach einem DB-Abbruch. Alte V4-Checkout-Snapshots
  und Legacy bleiben kompatibel. Noch kein Nachweis eines externen Hosted-Checkout-Gesamtlaufs.
- Kunden verwalten Tarifwechsel und Kündigung über ihren privaten Link. Admin prüft Wechsel;
  Provider plant genau eine Subscription zum Periodenende, ohne Proration. Erst Preisnachweis
  aktiviert den neuen Leistungsstand; ursprünglicher Kaufsnapshot bleibt unverändert.
- Care+-Arbeitszeit, Kontingent, Zusatzfreigabe, interne Bewertung/Storno und monatliche technische /
  manuelle Prüfzustände in bestehender Kundenansicht. Mock-Checks sind ausdrücklich simuliert.
- Budgetansicht: tatsächliche Kosten, Zahlungszeitraum, Attribution zum ersten versandten Briefarm,
  Deckungsbeitrag nur bei bestätigter vollständiger Datenlage; Änderungen entwerten Bestätigung.
- Migrationen 0013/0014 additiv generiert und ausschließlich in Wegwerf-Testdatenbanken geprüft.
- **Nachgewiesen:** 24/24 gezielte Core-/Stripe-Fake-HTTP-Tests; TypeScript Templates/Core/Web/Worker;
  ESLint. Erste Testfehler (Regex-Großschreibung, Syntax im Test) korrigiert, vollständiger Nachlauf grün.
- Weiter offen: komplette Regression/E2E, reale Sandbox-Abnahme, asynchrone Erstattungsbewertung,
  Betriebs-/Queue-/Backup-Härtung, zehn echte Demo-Render und Design-/Brief-/Website-Prüfung.
