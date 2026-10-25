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

## Zwischenstand Paket 2/3 – 25.10.2026

Letzter gesicherter Featurecommit: **312aba8**. Danach weiterhin uncommitted:
Worker-/Queue-/Backup-Härtung, neue Qualitätsgates und zehnfache Browsermatrix, Demo-/Home-Design,
fünf statische Muster, RLS-Migration 0015 und bestätigte Erstattungszustände 0016.

Belegte neue Prüfungen:
- 10 fiktive Demos durch buildDemo/qaDemo, 20 Desktop-/Mobilbilder unter
  `data/exports/v5-quality/`, Kontaktbögen tatsächlich betrachtet; alle zehn technische QA grün.
  Fallback nach zwei kaputten KI-Antworten explizit geprüft. Kein echter Anthropic-Aufruf.
- Sichtbarer Mobilfehler bei langen Firmennamen (schmale umgebrochene Headerbuttons) korrigiert;
  finale Matrix nach Korrektur noch ausführen. Café-Fotos künftig nur passende Treffer.
- Storage-Dateien lokal binär gesichert/zurückgelesen, Hashfehler erkannt. Root-Listing-Bug
  im vorhandenen LocalStorage behoben.
- Echte lokale Queue: Job/Retry/Dead-Letter/Cron nach Testkorrektur grün. Vorheriger Test nutzte
  verzögert aktualisierte Stats; direkter Dead-Letter-Fetch ist der belastbare Nachweis.
- Echte Stripe-Sandbox: Basis 1900 und Care+ 9900 bezahlt, jeweils vollständig erstattet und Abos
  beendet; Endzustände per GET bestätigt. IDs in stripe-v5-sandbox-abnahme.md.
  **default_incomplete war ungeeignet** für automatischen Erstmonat; allow_incomplete+off_session
  wurde real getestet und im Code korrigiert.
- Neues Erstattungs-Pending-Verhalten: zwei Regressionen + sechs Provider-Tests + Queue-Test grün.
  Pending ist kein Geldabgang; kein zweiter Request bei Wiederholung; bestätigte Events monoton.

Noch laufend: vollständige Core-Suite `/tmp/seitenwerk-v5-core-full.log`, Docker-Build
`/tmp/seitenwerk-v5-docker-build.log`. Erster V4-Browserlauf scheiterte am wegen laufender
Codeänderungen zurückgesetzten Mock-Zahlformular (kein POST, Bestellung pending); stabilisierte
Hydration im Helper und erneuter Lauf erforderlich. 60 Template-Assertions verwenden noch das alte
Bannerwort; konkrete neue Kennzeichnung angepasst, Suite erneut ausführen. Keine Fehler verschweigen.

Nächste Schritte: laufende Tests auswerten, PDF/QR neu rendern, vollständige E2E ohne parallele
Source-Änderungen, isolierter DB-Restore, Screenshots final ansehen, Prüfergebnisse dokumentieren
und zusammenhängende Änderungen committen. Produktions-/Rechts-/Provider-Sperren bleiben bestehen.

## Paket 2 – Betrieb lokal nachgewiesen

- Worker-Image mit Node 22 und ausschließlich Chromium gebaut; keine WebKit/Firefox-Last.
  Tatsächlicher Starttest entdeckte restriktive COPY-Dateirechte. COPY gehört nun dem
  nicht privilegierten node-Benutzer; korrigiertes Testimage startet mit read-only Rootfs.
- Echte lokale Healthantwort DB/Queue ok, PNG 9424 Bytes, PDF 8052 Bytes,
  SIGTERM beendet mit Exit 0. Internes Testnetz, sämtliche Provider Mock; Container/Netz bereinigt.
- Queue mit eigener beschränkter Rolle ohne Superuser/CREATEDB/BYPASSRLS tatsächlich geprüft:
  Start ohne Migration, Job senden/holen/abschließen, Cron und drei neue RLS-Tabellen erreichbar.
- Read-only Managed-Dump und Restore in NEUE lokale Test-DB: 49 Tabellen einschließlich
  Datenprüfsummen gleich. Standardschema-Kollision beim ersten Versuch behoben; bestehende
  Restore-Ziele werden nicht mehr automatisch gelöscht. Kein produktiver Backup-Status verändert.
- Resend erneut gelesen: Domain verifiziert, Senden/Empfangen aktiviert, Support-Inbox und
  aktivierter Eingangswebhook vorhanden. Keine Nachricht gesendet; echter Nachrichtenfluss offen.
- Vollständige Core-Suite ohne separat geprüfte Browsermatrix: 292/292 grün. Zuvor 127/127
  Template-Browserprüfungen grün. Template-Paket 97/97, Types aller vier Pakete und ESLint grün.
- Vollständiger E2E-Lauf: 20 bestanden, 1 übersprungen, 1 veraltete Dashboard-Überschrift erwartet.
  Erwartung aktualisiert; Nachlauf noch offen. V4-Kauf bis Mock-Go-Live/Abo/Kündigung bestanden.
- Bei echter PDF-Sichtprüfung A noch mit Fertig-Versprechen entdeckt. V4-A wird ehrlich korrigiert,
  bestehende gespeicherte Varianten werden nicht überschrieben; Wahrheitsgate sperrt alte Zusagen.
  Korrigierte 15 PDFs und V4-Garantie-/Vertragstexte werden erneut geprüft.

Temporärer Docker-Speicherfehler (ENOSPC) hat einen Zwischenlauf ungültig gemacht. Ausschließlich
IDs des eigenen Buildcaches bereinigt, keine Datenbanken/Volumes gelöscht; danach 18 GB frei und
Core-Nachlauf grün. Keine Produktionsabnahme aus lokalen Nachweisen ableiten.

## Paket 3 – Zahlungs- und Freigabegrenzen

- Echter Sandbox-Befund in bestehendem Stripe-Adapter korrigiert: automatischer Erstmonat
  `allow_incomplete` + `off_session`, keine Doppelposition und keine vorzeitige Rechnung.
- Bestätigter Mandats-Checkout und ältere manuelle V4-Snapshots bekommen jeweils passende
  Zustimmungstexte; Providerwechsel passt nicht stillschweigend zu einer bestehenden Bestellung.
- Erstattungsanforderung und tatsächlicher Geldabgang getrennt. Pending/Fails erzeugen keine
  Erstattungsrechnung und keine Erfolgsmail. Wiederholung legt keinen zweiten Request an;
  Status-Webhooks und lesender Sweep führen bestätigte Erstattungen monoton nach.
- Neue Tabellen-RLS nur bestehende interne Backendrolle, Browserrechte entzogen; Migrationen
  0015/0016 nur lokal getestet. Extern keine Schemaänderung.
- Explizite Steuerbestätigung als zusätzlicher Go-Live-Blocker (Standard false). Keine unbekannte
  Kleinunternehmer-/USt-Angabe durch KI bestätigt.
- Noch offen: allgemeine Reconciliation extern im Stripe-Dashboard erstatteter Monatsrechnungen;
  aktuelle bestätigte Erstattungsstrecke bezieht sich auf die Bestell-/Einrichtungszahlung.
  Vor Liveverkauf als Blocker behandeln, keine vollständige Refund-Abnahme behaupten.
