# Wiederaufnahme nach Claude – 29.10.2026

Übernommen: `484b060906d0e9b47f28c35b907306ca75dd6696`,
`origin/claude/website-brief-maschine-0d0s37`, 70 Commits nach `96498d3`.
Eigener Arbeitszweig `codex/resume-2026-10-29`; alte Worktrees einschließlich fremder lokaler
Änderungen unverändert. Kein paralleler Entwickler-/Testprozess beim Einstieg aktiv.

Die Screenshots dokumentieren eine spätere Betreiberzustimmung zu **Stripe/easyNova live**.
Das ist keine Freigabe einer Werbecharge: zuerst drei Provider-Testaufträge, dann eigener echter
Probedruck, erst nach dessen Prüfung echte Empfänger. Auch die vorhandenen fachlichen Gates bleiben.
Die unterbrochene Live-Codeänderung ist im zuletzt gepushten Claude-Commit noch nicht enthalten.

## Neu gelesen / tatsächlich extern geprüft

| Bereich | Aktueller Nachweis |
|---|---|
| GitHub | Claude-Branch `484b060`; Codex-Handoff ist Vorfahr, keine auseinanderlaufenden Änderungen |
| Dynamische App | Netlify `6ae3aafe619f0d38be405dc0`, veröffentlicht 29.10. 20:23 UTC, exakt Commit `484b060` |
| Firmenwebsite | Separater Upload `6ae2157ec3a7ddea987bb56c`, veröffentlicht 28.10. 15:51 UTC, weiterhin locked |
| Öffentliche Preise | Firmenstartseite und App-Preisseite HTTP200, 597 €, keine gefundenen aktuellen 590-/49-Euro-Angaben |
| Öffentliche Platzhalter | In den vier abgerufenen Seiten keine gefundenen `hallo@example.com`/`Vorname Nachname`/`Musterstraße`; kein pauschaler Beweis aller Inhalte |
| Briefdienst | Datenschutz nennt easyNova; Netlify `MAIL_PROVIDER=easynova`, `EASYNOVA_MODE=test` |
| Supabase | 21 angewandte App-Migrationen; pg-boss vorhanden; 420 Leads (416 OSM, 4 Mock), 4 Demos, 1 Brief, 0 Bestellungen |
| Pipeline | Frischer abgeschlossener Takt 20:30:33 UTC bei Prüfung 20:32:39 UTC; laufender Worker durch Queue belegt, genaue Serverversion nicht per SSH geprüft |
| Lead-/Demo-Zustände | 409 abgelehnt, 7 discovered, 3 demo_built, 1 cta_clicked; Demos: 1 building, 2 qa_failed, 1 published. Kein versandfertiger Kampagnenbestand daraus ableitbar |
| Wichtiger späterer Abgleich | Alle 4 Demos gehören zu Mock-Betrieben; 0 qualifizierte echte Leads. Keine research-lead-Jobs vorhanden; Queue research-lead fehlt in pgboss.queue |
| Jobs | 3 fehlgeschlagene Jobs (find-leads, qa-demo/Browser, generate-letter), keine aktiven Jobs im Snapshot. Alter/Behebung einzeln prüfen |
| Storage | 31 Objekte im privaten Bucket; 4 Demo-/1 Briefdatensätze sind kein vollständiger Restore-Nachweis |
| DB-Schutz | Keine öffentliche Basistabelle ohne RLS im Metadatencheck; kein vollständiger Sicherheitstest aller Rollen |
| Stripe | `PAYMENT_PROVIDER=mock`; Live-Key und Live-Webhook-Secret geschützt in Netlify vorhanden, Code verwendet sie noch nicht |
| Stripe-Connector | In dieser Sitzung nur „Website sandbox“ verbunden. Live-Katalog aus Repository referenziert, nicht neu angelegt oder live per Connector bestätigt |
| Provider-Testaufträge | `easynova_test_jobs=1`; der eine Brief ist ein Testbrief, Status generated |
| Steuer / Recht | `tax.operatorConfirmed=false`; Impressum/Datenschutz/AGB und Bankdaten vorhanden. Keine rechtliche Freigabe daraus ableiten |
| E-Mail / Hosting | `EMAIL_PROVIDER=mock`, `HOSTING_PROVIDER=mock`, `REGISTRAR_PROVIDER=mock` |
| Sicherheit | ENV und DB DRY_RUN=true; realLettersUnlocked=false. DB-Automatikschalter sind bereits eingeschaltet; daher globales Dry-Run nicht beiläufig abschalten |
| Recovery | Kein gespeicherter backup_status-Nachweis; vorhandene Anbieterbackups dadurch nicht als nicht existent behaupten |

Nur Metadaten, Zustandszahlen und freigegebene Nicht-Secret-Konfiguration gelesen. Keine produktiven
DB-Schreibzugriffe, Zahlungen, Erstattungen, Briefaufträge, DNS-/Serveränderungen oder Veröffentlichung.

## Relevante Claude-Änderungen seit der Übergabe

- Migrationen 0019/0020, Funnel-/pg-boss-Rechte, Produktionseinrichtung und Worker-Setup per Einmal-Code.
- Neue veröffentlichte statische Launchseite im bestehenden Firmenprojekt; aktuelle V4-Preise/Rechtstexte.
- easyNova statt LetterXpress, passende Brief-Sperrflächen und Rücksendeangabe.
- Branchen-Demos, persönliche Rechercheeinstiege, vereinfachter Admin, kostenlose Änderungsanfrage.
- OSM-Auszug/Geofabrik, automatische KI-Webrecherche mit Quellenprüfung und geblockten Quellen.
- Tatsächliche Anthropic-Anbindung und dokumentierte reale KI-Probeläufe, begrenzte Demo-/Briefreparatur.
- Jarvis/Sprachausgabe, Testlauf im Admin, SameSite=Lax, Chromium im schreibgeschützten Container.
- Live-Stripe-Katalog als Referenz. Keine Garantie mehr nach späterer Betreiberentscheidung.

Historische Restlisten vom 27.10. sind damit teilweise erledigt und dürfen nicht blind neu abgearbeitet werden.

## In dieser Fortsetzung behoben

1. **Explizite Stripe-Umgebung:** STRIPE_MODE=test bleibt Standard; Live nur bei ausdrücklicher Auswahl
   und DRY_RUN=false. Getrennte Test-/Live-Schlüssel und Signatursecrets, kein unsicherer Fallback.
2. **Vorhandene Live-Preise eingebunden:** 597 Einrichtung und genau 19/99 € monatlich. Betrag/Währung/Katalog
   geprüft. Unverändert kein Monatsabo vor bezahlter Einrichtung, Zustimmung und bestätigtem Go-Live.
3. **Gesamter Abo-Lebenszyklus:** Kündigung/Planfreigabe auch für explizit aktivierten Live-Provider;
   Tarifwechsel/Reconciliation verwenden den richtigen Katalog, nicht fest den Sandbox-Preis.
4. **Testvorgänge beim Umschalten:** Mock-Betriebe können keine echten Käufe starten. Offene Sessions
   werden nur innerhalb desselben Providers und Zahlungsmodus wiederverwendet/extern beendet.
   Signierte Events mit falschem livemode werden vor Verarbeitung abgelehnt.
5. **Worker-Übernahme:** OPTOUT_EMAIL wurde bisher nicht exportiert – dadurch konnte der Worker
   trotz richtiger Netlify-Adresse den alten Platzhalter drucken. Adresse und neue Stripe-Auswahl samt
   geschützten Secrets werden jetzt über den vorhandenen Einmal-Code-Pfad übernommen.
6. **Einmal-Code wirklich einmalig:** Gleichzeitige Einlösungen jetzt über Datenbank-Zeilensperre
   serialisiert; nur eine Anfrage erhält erfolgreich die Exportfreigabe. Audit in derselben Transaktion.
7. **Beide Testschalter gelten:** Auch DB-/Dashboard-Dry-Run sperrt echte neue Käufe und Monatsstarts.
   Eine frühere Testzahlung darf nicht zu einem echten Monatsabo hochgestuft werden.
8. **Server-Aktivierung ausdrücklich:** Neue additive `docker-compose.worker.live.yml` und `LIVE=1`
   im bestehenden Setup. Basis unverändert DRY_RUN=true. Im lokalen Compose-Readback bleiben selbst
   mit Live-Override easyNova-Testmodus und Empfängerfreigabe gesperrt, solange diese so konfiguriert sind.
9. **Eigener echter Probedruck:** Ein explizit markierter Testbrief an die konfigurierte eigene
   Testanschrift darf auch eine fiktive Demo zeigen. Der alte Mock-Guard blockierte ihn nach Abschalten
   des Dry-Runs ebenfalls. Gewöhnliche Akquisepost an Mock-Betriebe bleibt gesperrt. Testanschrift und
   Testbrief-Kennzeichnung sind jetzt zusätzlich unveränderlich mit der geprüften PDF gebunden;
   Änderungen erfordern Neugenerierung. Sperrliste, drei Provider-Testaufträge und Empfängerfreigabe bleiben.

Keine dieser lokalen Änderungen schaltet Netlify oder den bestehenden Server bereits live.

## Prüfstand

- 66/66 gezielte Tests in 8 Suiten bestanden: Runtime-/Katalogtrennung, Fake-Stripe-SDK, 597/19/99,
  Monatsstart, Refunds, Hosted-Checkout, easyNova und Worker-Bootstrap einschließlich Nebenläufigkeit.
- Drei Root-Prüfdateien bestanden. Erstversuch hatte falschen tsx-Loaderpfad; korrekt wiederholt.
- Initialer Core-Typecheck vor Änderungen und danach erfolgreich. Finale Gesamtprüfung ebenfalls bestanden (siehe Schlussprüfungen).
- Ein Volltest begann vor Erzeugen des Template-CSS im neuen Worktree; abgebrochen und nach
  erfolgreichem CSS-Build neu gestartet. Diesen ersten Lauf nicht als grün werten.
- Gesamt-Typecheck, vollständiges ESLint, 112 Template-Tests, Template-CSS-Build, Worker-TypeScript-
  Build und tatsächlicher Standard-Turbopack-Produktionsbuild bestanden; letzterer nach den finalen
  Runtime-Änderungen wiederholt. Kein Turbopack-EPERM-Blocker aus dem 27.10. mehr behaupten.
- Bash-Syntax und Compose-Readback für beide Modi bestanden, ohne Containerstart/Secrets/Produktionspostgres.
- Der anschließende ungekürzte Core-Lauf wurde durch Umgebungsneustart unterbrochen. Der abgeschlossene
  Wiederholungslauf nahm ausschließlich den unveränderten langen Branchen-Brief-Matrixtest aus
  (`--testNamePattern '^(?!.*alle Branchen × Varianten)'`). Nicht als ungekürzten Volltest melden.
  Er prüft tatsächlich auch alle 120 Template-/Paletten-/Datenfälle und die zusätzlichen Branchenfälle.
- Browser-E2E-Erstlauf zur Ressourcentrennung bewusst unterbrochen; kein grüner Nachweis daraus.
  Der spätere Lauf gegen den endgültigen Produktionsbuild ist bestanden; Ergebnisse unten.

Sichere Implementierungscheckpoints: `a01e02d` (Stripe/Runtime/Worker), `0c18d92` (eigener Probedruck).
Beide Commits mit `[skip ci] [skip netlify]`, keine Produktionsveröffentlichung.

### Abgeschlossene Schlussprüfungen

- **705 Tests bestanden, 3 übersprungen, 83 Core-Dateien** im breiten Lauf. Enthalten:147 gerenderte
  Template-/HTML-/A11y-/Kontaktchecks, Demo-/Brief-/QR-/Rechnungs-/Onboarding-/Refund-/Recherche-/
  Datenschutz-/Budget-/Pipeline-/Assistentenregressionen. Ein langer unveränderter Branchen-Brief-
  Matrixtest bewusst ausgenommen, zwei optionale OSM-PBF-Tests mangels lokalem osmium übersprungen.
  Kein ungekürzter vollständiger grüner Lauf daraus ableiten.
- **62/62 gezielte finale Tests** für die neue Stripe-Auswahl, Live-SDK-Faketransporte, Monatsstart,
  Dashboard-Dry-Run, Checkout-Idempotenz, easyNova-Gates und Bootstrap parallel zusätzlich bestanden.
- **2/2 separate Eigenbrief-Tests** nach der letzten Korrektur bestanden: Mock nur als eigene Vorlage,
  Opt-out bleibt wirksam; Testanschrift und Testbrief-Kennzeichnung lassen sich nicht nachträglich ändern.
- **112/112 Template-Unit-Tests**, **3 Root-Prüfdateien**, Gesamt-Typecheck, ESLint, Worker-Build,
  finales Turbopack-Build, Bash-Syntax und beide Compose-Modi bestanden.
- **12 öffentliche GET-Prüfungen** HTTP200, keine Treffer der geprüften alten Preise/Kontaktplatzhalter.
  Datenschutz der Firmenwebsite nennt easyNova. Keine Rechtsfreigabe durch diese Suchprüfung.
- **13/13 Browser-E2E bestanden** gegen den endgültigen Turbopack-Produktionsbuild: neuer Admin-
  Testlauf bis Testzahlung, 10 Branchenstrecken über QR/Demo/Angebot bis Rechnung/Onboarding,
  ausstehende und fehlgeschlagene Zahlung. Ausschließlich Mock-Provider, keine echte Stripe-Zahlung.
- Echte Bildschirmaufnahmen: [Demo mobil](evidence/demo-mobile.jpg),
  [Angebot mobil](evidence/angebot-mobile.jpg), [Mock-Checkout](evidence/checkout-mock-mobile.jpg).
  Alle Angaben fiktiv. Der Mock-Checkout zeigt bewusst den Testmodus und einen Standard-Testabsender;
  kein Screenshot der echten Stripe-Hosted-Seite oder einer fertig freigegebenen Kundenbestellung.

Nachweise in [evidence/](evidence/); Konsolenlogs ohne ANSI/temporäre lokale Debugger-Transportzeilen.
Unbereinigte lokale Protokolle und alle Browserbilder unter `data/exports/`, nicht im Git.

Die breite Suite startete vor dem zusätzlichen Eigenbrief-Patch; dessen gezielte Tests und finale
Builds wurden separat ausgeführt. Keine echte Stripe-Sandbox-/Live-Zahlung oder Provider-Briefsendung.

## Noch offen – konkret nächster Schritt

1. Steuerstatus verbindlich beantworten, passende Rechnung-/Preisangaben prüfen; die Frage ist gestellt.
   Keine alte zurückgenommene §19-Bestätigung wiederverwenden oder Bestätigungsfeld blind setzen.
2. Zwei weitere easyNova-Testaufträge im weiterhin aktiven Testmodus einreichen und die Rückmails
   mit Sperrflächen prüfen. Nicht nur den Zähler hochsetzen. Dann Guthaben und eigener Probedruck.
3. Echten E-Mail-/Bestätigungs-/Onboardingfluss mit vorhandenem Resend-Zugang abnehmen, bevor Käufer
   auf eine funktionierende Zustellung angewiesen sind. Mock bedeutet keine tatsächliche Zustellung.
4. Geprüftes Backup plus isolierten Restore nachweisen; keine erneuten bereits angewandten Migrationen.
5. Nach Testabschluss Patch in den tatsächlich verwendeten Betriebsbranch übernehmen, Code kontrolliert
   bereitstellen und Server-Umgebung mit NEU=1 erneuern. Server-SSH ist hier nicht eingerichtet.
   Basiskompose erzwingt weiter DRY_RUN=true. Erst nach Voraussetzungen explizit LIVE=1 ergänzen
   (additive Live-Kompose), dazu ENV **und** Dashboard-Testmodus bewusst freigeben. Nicht schon beim
   gewöhnlichen Update einschalten. Spätere Live-Updates ebenfalls mit LIVE=1, sonst sicherer Teststandard.
   **Vor Worker-Neustart die fehlende research-lead-Queue kontrolliert vorbereiten:** vorhandene
   `queue:prepare --apply`-Routine erst nach Versions-/Rollen-/Backupprüfung und entsprechender
   Betriebsfreigabe verwenden; sie kann auch pg-boss-Migrationen ausführen. Kein Startup-Autoseed.
   Im Code sind Recherche-Handler und Pipeline-Anbindung vorhanden, in der Produktionsqueue fehlt
   der Eintrag. Der Pipeline-Aufruf fängt Recherchefehler derzeit als 0 ab; ein gesunder Takt belegt
   deshalb nicht, dass die KI-Recherche tatsächlich lief. Das wurde nicht produktiv umgangen.
6. Vollständigen echten Stripe-Sandbox-Zyklus/Basis/Care+ und danach aktuelle Live-Katalog-/Webhook-
   Berechtigung rein lesend abnehmen. Eigene Testkäufe sind keine echte Umsatz-/Conversionbasis.
7. Erst nach den Voraussetzungen Stripe/easyNova gezielt aktivieren; Empfängerfreigabe bis zur
   erfolgreichen eigenen Brief-/QR-/Demo-Prüfung geschlossen lassen.

Zusätzlich für den Kampagnenstart: genau einen realen geeigneten Betrieb mit Quellen-/Website-/
Bedarfsprüfung bis Demo/Brief nachweisen; die 420 gefundenen Betriebe sind keine 420 passenden Empfänger.
Die automatische Textrecherche ersetzt keine Rechteklärung und echte Bild-/Stilbelege. Diese
Personalisierung und die erste 30-Einzelabnahme bleiben notwendig. Keine neue kostenpflichtige
Recherche oder echte Kontaktaufnahme in dieser Sitzung.

Visuell geprüftes Kaufangebot: beide Tarife/Einrichtung/Monatsbeginn klar erkennbar; der gesamte
mobile Angebots-/Vertrauens-/Fragenbereich ist mit 390 px etwa 3400 px lang. Eine spätere Kürzung darf
Preise und Mitwirkung nicht verstecken. Keine unabhängige Kunden- oder Conversionvalidierung.

Vor unbeaufsichtigtem Zahlungsbetrieb zusätzlich Stripe-Risikomeldungen (Dispute/Fraudwarning)
und Änderungen an Kundendaten prüfen: Der derzeitige Adapter normalisiert überwiegend Checkout-,
Abo-, Rechnungs- und Erstattungsereignisse. Diese Grenze wird nicht durch Mock-Kaufprüfungen beseitigt.

Erste 30-Prüfung, Quellen-/Fakten-/Foto-/PDF-/QR-Bindung und Kostenlimits unverändert erhalten.
Kein pauschales „alles fertig“ oder 9,5/10 aus dem Git-Fortschritt ableiten.
