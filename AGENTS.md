# SeitenWerk – dauerhafte Anweisungen für Codex

## Aktuellster Betreiberstatus 27.10.2026

Neueste ausdrückliche Klarstellung: natürliche Person in der Gründungsphase, noch keine Gewerbeanmeldung
und kein Handelsregistereintrag. SeitenWerk ist der Projektname. Keine bestehende Unternehmensregistrierung
oder Steuerregelung behaupten. Die zwischenzeitliche §19-Bestätigung wurde zurückgenommen;
tax.operatorConfirmed ist wieder false. Natürlichen vollständigen Namen und ladungsfähige Anschrift
aus privater Konfiguration verwenden, nichts davon öffentlich ins Repository schreiben.
Rechts-/Startvoraussetzungen und aktueller Umsetzungsstand: docs/founding-status/README.md.
Keine echten Briefe, Zahlung, Migration oder Veröffentlichung; DRY_RUN bleibt true.

## Auftrag und Quellen

Bestehendes Projekt übernehmen und gezielt weiterentwickeln. **Nichts erneut bauen, was bereits
existiert.** Vor jeder Änderung Implementierung, Tests, Git-Verlauf und Entscheidungen prüfen.
Mit dem Betreiber auf Deutsch kommunizieren. Entscheidungen und technische Grenzen offen benennen;
„implementiert“, „getestet“, „abgenommen“ und „live“ sind verschiedene Zustände.

Rangfolge: aktuelle ausdrückliche Betreiberanweisung → neueste dokumentierte Betreiberentscheidung
→ diese Übernahmevorgaben → `docs/spec-update-2.md` → `CLAUDE.md` → ältere Beschreibungen in README.
Unaufgelöste fachliche Widersprüche gesammelt klären; unabhängige sichere Arbeit fortsetzen.
Die neueren Entscheidungen unten ersetzen ausdrücklich die alten Foto- und VPS-Vorgaben.
Historische Aufforderungen zum Start einer bereits abgeschlossenen Phase nicht erneut ausführen.

Beim Einstieg lesen: diese Datei, `CLAUDE.md`, `README.md`, `docs/spec-update-2.md`,
`docs/entscheidungen.md`, `docs/projektuebernahme-codex.md`. Je Aufgabe die Compliance-, Integrations-,
Claims-, AGB- und Betriebsdokumente in `docs/` ergänzen. Unter `apps/web` gilt zusätzlich die dortige
`AGENTS.md`: vor Next.js-Codeänderungen relevante lokale Next.js-Dokumentation lesen.

## Neueste Betreiberentscheidungen (24.10.2026)

- **Kein persönliches Foto.** Keine Fotoanforderung an den Betreiber, kein erfundenes Porträt.
  Vertrauensblock mit Name/Firma, Kurzvorstellung, Kontakt und Impressum gestalten.
  Die frühere Foto-Pflicht im Livegang-Check ist entfernt; andere Freigaben bleiben erforderlich.
- **Plakat-Vorlage behalten**, einschließlich Registrierung und Paletten für alle fünf Template-Gruppen.
  Die ruhigeren Hero-Beispiele sind eine separate Präsentationsentscheidung.
- **VPS später.** Docker/Caddy/Backup-Code behalten, jetzt keinen Server provisionieren oder deployen.
  Die öffentliche Firmenwebsite hat bereits einen statischen Netlify-Export. Das ist nicht das Hosting
  der gesamten Anwendung: Admin, Demos, Checkout, Worker und DB brauchen weiterhin eine Laufzeit.
- **Supabase verbunden.** Projekt `Webiste-` (`nfecpmamgrcgnnyulioy`, EU Irland), bestehende 11 Drizzle-Migrationen übernommen; siehe `docs/supabase-anbindung.md`. Für weitere Anbindungen den vorhandenen
  PostgreSQL-/Drizzle-/pg-boss-Bestand weiterverwenden; kein paralleles Backend. Eine öffentliche, auf Website-Inhalte begrenzte Edge Function ist eingerichtet.
  Neue Logins hat der Betreiber ausdrücklich wieder verworfen; bestehenden internen Admin erhalten. Worker, Chromium/PDFs und Dateispeicher
  brauchen auch bei einer verwalteten Datenbank eine gesonderte Betriebsplanung.
- **Resend verbunden**; Kontaktadresse `support@example.test`. Domain einschließlich DKIM/SPF/MX verifiziert; Support-Inbox am 24.10.2026 angelegt und per Connector bestätigt. Bestehenden Resend-Provider verwenden; Verbindung im Chat
  bedeutet nicht automatisch, dass die App `EMAIL_API_KEY`, verifizierte Domain und Inbound hat.
  Keine erneute Anbieterwahl, keine Test-Mail ohne entsprechenden Auftrag.
- **Stripe und DNS übernimmt der Betreiber.** Bestehenden Stripe-Code behalten; offene Einrichtung
  präzise dokumentieren. Keine Änderungen an Stripe-Konto, Webhooks, Zahlungsmethoden, DNS oder Domains.

## Sicherheitsgrenzen

- **`DRY_RUN=true` beibehalten**, in Umgebung und wirksamen Einstellungen. Keine echten Briefe,
  Zahlungen, Erstattungen, Domainkäufe, Produktionslöschungen oder Live-Deployments auslösen.
  Eine Codeänderung oder ein früherer Phasenabschluss ist keine Live-Freigabe.
- Automatische Schalter nicht eigenständig freischalten: insbesondere `AUTO_SEND`, `AUTO_REPLY`,
  `AUTO_OPTIMIZE`, `AUTO_ACTIVATE_VARIANTS`, Domainregistrierung und Echtbrief-Freigabe.
  `EASYNOVA_MODE=test` (bzw. `LXP_MODE=test`), Registrar-Sandbox und `SITE_INDEXABLE=false` bis zur passenden Freigabe belassen.
- **DRY_RUN ist kein universeller Offline-Modus.** `effectiveSwitches` sperrt per ENV das Abschalten
  des Dry-Runs, aber Provider können weiterhin externe Aufrufe ausführen. E-Mail-Versand hat keinen
  generellen Dry-Run-Guard; Zahlung richtet sich auch nach dem Stripe-Key. LLM-Aufrufe, Hosting und
  easyNova-/LetterXpress-Testaufträge sind ebenfalls nicht pauschal ausgeschlossen.
- Für lokale Abläufe alle externen Provider ausdrücklich auf Mock setzen (`LLM_PROVIDER`,
  `LEAD_SOURCE`, `MAIL_PROVIDER`, `PAYMENT_PROVIDER`, `REGISTRAR_PROVIDER`, `HOSTING_PROVIDER`,
  `EMAIL_PROVIDER`), lokalen Speicher und eine isolierte lokale Datenbank verwenden. Worker nicht
  unbesehen starten: Start führt standardmäßig Migrationen/Seeds aus und aktiviert Cron-Jobs.
- Secrets weder ausgeben noch ins Repository schreiben. Keine vollständigen IPs oder PII in Logs.
  Keine fremden Änderungen überschreiben. Keine produktiven Daten für Test-Seeds verwenden.
- Core-Testsetup löscht und erstellt die Ziel-DB aus `TEST_DATABASE_URL` neu, E2E hat ebenfalls
  DB-Setup. Vor Ausführung dedizierte Wegwerf-Testdatenbank prüfen; nie Produktions-/Supabase-DB
  als Testziel verwenden. Vorhandene Testfälle dürfen abweichende Schalter ausschließlich isoliert testen.

## Produktregeln

- Lokale Betriebe ohne eigene Website; Start Dortmund. Akquise nur per adressiertem Postbrief,
  keine Kalt-E-Mails, Kaltanrufe, SMS oder ausgehenden WhatsApp-Nachrichten. WhatsApp nur `wa.me`.
  E-Mails nur an selbst bereitgestellte Adressen; maximal eine Demo-Erinnerung mit Abmeldelink.
- Zwei gleichwertige Angebote ohne Vorauswahl: **590 € einmalig** inkl. Domain und 12 Monate Hosting,
  danach optional 19 €/Monat; **49 €/Monat**, erste Rate sofort, 12 Monate Mindestlaufzeit, danach
  automatisch 19 €/Monat und monatlich kündbar. Preise/Laufzeiten aus Config, nicht duplizieren.
  Zahlungsarten Karte/SEPA; PayPal laut späterer Entscheidung vorerst nicht.
- 14-Tage-Garantie nach dokumentierter neuerer Regel: ab Go-Live, spätestens ab Tag 14 nach Zahlung
  bei Kundenverzögerung; siehe `guarantee.ts`, AGB-Anforderungen und Entscheidungs-Commit `f6c815b`.
  Rechnungen je Zahlung, B2B- und AGB-Bestätigung, Versionierung und Mindestlaufzeit erhalten.
- Demos: keine erfundenen Fakten, Referenzen, Bewertungen oder Kundenlogos. Beispielinhalte und
  Stockfotos kennzeichnen, live nur Kundenfotos. Kein persönliches Betreiberfoto voraussetzen.
  Demo noindex, Ablauf standardmäßig 30 Tage, Opt-out sofort sperren und Daten bereinigen.
- Briefe: DIN 5008, kein Rechnungs-Look, Art. 14/21 DSGVO, QR mindestens 40 × 40 mm, Kurz-URL,
  beide Preisoptionen/Mindestlaufzeit, wahrheitsgemäßes „online bis …“. Höchstens drei Sendungen;
  Folgebrief 3 erst nach tatsächlicher Demo-Überarbeitung und manueller Prüfung.
- Zahlen/Wirkungsbehauptungen nur aus freigegebenen Claims mit Fußnoten und Quellenseite.
  Wahrheits-Check blockiert Freigabe und Versand; keine Claims selbst freigeben. Quellenablauf nach
  24 Monaten beachten. Gastro-Claims derzeit laut Prüfprotokoll abgelaufen/ohne Primärquelle.
- Lead-Quelle standardmäßig OSM; Google-Signal nur mit dokumentierter Rechtsprüfung, Google als
  Primärquelle gesperrt ohne Genehmigung. Keine gespeicherten Google-Bewertungen. OSM liefert keine
  Ratings: Ratingfilter und Segment „neu“ nicht als im Standardmodus verfügbar darstellen.
- Keine Tracking-Cookies/vollen IPs; Engagement-Beacon ist abschaltbar, Rechtsprüfung § 25 TDDDG offen.

## Architektur und Bestand

- pnpm-Monorepo, TypeScript strict, Node ≥ 22.12, vorgesehen **pnpm 10.28.0** laut `packageManager`.
- `apps/web`: Next.js 16.4.2/React 19, Admin mit Passwort/TOTP, Firmenwebsite, Demos/QR/Kurz-URL,
  direkter gehosteter Stripe-Checkout, Onboarding/Vorschau, Opt-out und Webhooks.
- `apps/worker`: langlebiger Node-Prozess mit pg-boss, Cron, Retries/Dead-Letter; Jobmodule unter
  `src/jobs`, fachliche Logik überwiegend in Core.
- `packages/core`: PostgreSQL 16/Drizzle, Schema und additive Migrationen `0000`–`0010`, Services,
  Auth, Queue, Provider-Interfaces/Registry, Rendering per Playwright/Chromium, Claims/Playbooks.
- `packages/templates`: bestehende Website-, Brief-, Rechnungs- und Wartungslayouts. Fünf Gruppen
  mit je drei Basislayouts plus Plakat; zentrale Registry/Paletten erhalten. `dienstleistung` ist Fallback.
- Externe Anbieter hinter vorhandenen Interfaces: Anthropic, OSM/optionales Google, easyNova (Briefdienst,
  Betreiberentscheidung 27.10.2026), Stripe, INWX, Cloudflare/Netlify, Resend/Postmark, lokaler/S3-Speicher.
  LetterXpress und Pingen nur inaktive Alternativen.
  Kein zweites Interface/Schema für bereits abgebildete Information erfinden.
- Konfiguration: `.env.example`, `src/config/env.ts`, `settings.ts`, `service.ts`; fachliche Werte in
  DB, Secrets aus Umgebung. Idempotenz, Audit-Log, Budget-Ledger und Freigaben erhalten.
- Phasen 1–10 und L1–L6 sind im Repository vorhanden; nicht neu starten. Abnahmen/Produktionsbetrieb
  sind gesondert offen. B6.6 Demo-/Preisvarianten nicht vollständig ausgeliefert; L7 bleibt bis
  mindestens 300 ausgewerteten Briefen zurückgestellt. Details im Übernahmebericht.
- Vor externer API-Implementierung aktuelle offizielle Doku prüfen und `docs/integrations.md`
  aktualisieren; historische Preise/Modellnamen/SDK-Felder nicht ungeprüft übernehmen.

## Arbeits- und Prüfablauf

1. `git status`, relevante Dateien/Tests und `git log` prüfen. Bestehende Services erweitern,
   Änderungen möglichst klein; Migrationen additiv, keine fertigen Phasen neu implementieren.
2. Passende Prüfung: `pnpm lint`, `pnpm typecheck`; Core-/Template-Tests mit `pnpm test`, E2E mit
   `pnpm test:e2e` nur unter den oben genannten Isolationsbedingungen. Dokumentationsänderungen
   brauchen keine neue Testsuite. `pnpm format` nicht ungefragt auf das ganze Repository anwenden.
3. Bei abweichender pnpm-Version keine automatische Neuinstallation/Lockfile-Migration akzeptieren.
   Bestehende lokale Binaries können für Lint/TypeScript benutzt werden; Einschränkungen berichten.
4. Dokumentation bei Änderungen pflegen. Neue Entscheidungen in `docs/entscheidungen.md` festhalten.
   Abschluss: Änderung, Prüfung, verbleibende Aufgaben und Live-Grenzen präzise benennen. Keine
   bestandenen Tests, externen Verbindungen oder Deployments behaupten, die nicht verifiziert wurden.

Die in älteren Dateien erwähnte `DESIGN.md` fehlt im Git-Bestand der Übernahme. Nicht erfinden;
vorhandene Komponenten, CSS, Bilder und die dokumentierten späteren Designentscheidungen verwenden.

Aktuelle Firmenangaben: [Name aus privater Konfiguration], Seitenwerk, [Anschrift aus privater Konfiguration], [PLZ] [Ort],
[Telefon aus privater Konfiguration] (auch WhatsApp). Öffentliche Kurzvorstellung in `packages/core/src/config/operator.ts`.
Rechtstexte sind eigene gekennzeichnete Entwürfe, kein eRecht24-Export; nicht automatisch in die
freigegebenen `legal.*`-Felder oder den Live-Checkout übernehmen. Supabase-Einrichtung und die
Support-Adresse sind inzwischen ausdrücklich beauftragt; Brief-/Zahlungs-/Domain-Sperren gelten weiter.

## Aktuelle Arbeitsrichtung

Rechtstext-Arbeit wurde vom Betreiber gestoppt. Keine weiteren Generator-, Konto- oder Marketingaktionen. Bestehenden internen Admin zugänglich machen; neue Firmenwebsite-Logins bleiben verworfen. Status und noch nicht verifizierte Verbindung unter `docs/admin-zugang.md`. Private Zugangsdaten ausschließlich unter ignoriertem `data/`, nie ins Git oder in einen Website-Export.

## Admin-Weiterentwicklung

Betreiber wünscht deutlich übersichtlichere, moderne Admin-Oberfläche und flüssigere Eingaben.
Bestehende 20 Bereiche erhalten, gruppierte Navigation und lokale Suche. Umsetzungs- und Prüfstand
in `docs/admin-modernisierung.md`. Session-Caching ausschließlich anfragebezogen; keine
benutzerübergreifende Auth-Zwischenspeicherung. Keine Netzwerkmutation pro Tastendruck.

### Aktualisierung: Rechtstexte und Integrationen wieder beauftragt

Die jüngste Betreiberanweisung hebt die vorherige Pause für Rechtstexte auf. Eigene Texte aus
bestätigten Firmenangaben erstellen und gegen tatsächlichen Betrieb prüfen; keine Generator- oder
anwaltliche Freigabe behaupten. Betreiber kennt §19-Status und W-IdNr. nicht: nichts erfinden,
Live-Verkauf bleibt gesperrt. Dateispeicher, Resend und Stripe-Anbindung nun ausdrücklich beauftragt;
Stripe-Connector hat nur Sandbox. Keine echten Zahlungen/Briefe. Demo-Test und Worker bleiben später.
Automatische Sicherheitsprüfung lehnte ungeschützte Speicherung von Resend-API-Key in Netlify ab;
nicht über Umwege umgehen. Details docs/integrationen-abschluss.md und docs/recht/pruefprotokoll.md.

## Verbindliche Aktualisierung V4 (25.10.2026)

Aktuelle Betreiberanweisung und `docs/master-implementation-v4.md` ersetzen frühere Neukundenpreise.
Fortlaufender Umsetzungsstand: `docs/v4-quality-handoff.md`; früherer Prüfstand: `docs/conversion-optimization-v4.md`.

- Für **neue** Bestellungen genau Basis 597 € + 19 €/Monat oder Care+ 597 € + insgesamt 99 €/Monat.
  Care+ enthält die Basisgebühr vollständig, inklusive höchstens 60 Minuten kleiner Änderungen monatlich ohne Übertrag.
- Preise ausschließlich aus `offers-v4.ts`. `cfg.pricing` mit 590/49/19 ist der erhaltene Legacy-Bestand, kein V4-Preisformular.
  Angebotssnapshot an der Bestellung erhalten; historische Rechnungen, Abos und Verträge nicht neu berechnen.
- Monatsabrechnung erst nach bezahlter Einrichtung, dokumentierter Tarifzustimmung und tatsächlich bestätigtem Go-Live.
  Neue V4-Bestellungen speichern nach ausdrücklicher Zustimmung ein Stripe-Zahlungsmittel/Mandat bei der
  Einrichtung. Genau ein Monatsabo startet erst nach bestätigtem Go-Live, ohne Rückdatierung.
  Alte V4-Snapshots ohne billingMode oder mit manual_checkout behalten den separaten Abo-Checkout.
  Zahlungsbestätigung kommt über invoice.paid; active allein ist kein Geldeingang. Incomplete/SEPA/SCA
  dürfen kein zweites Abo auslösen. V4 bleibt ausschließlich Sandbox.
- Keine zwölfmonatige Standardbindung für V4. Tarifwechsel nur als bestätigter Wechsel zum nächsten Periodenende
  ohne Proration vorbereiten; keine zweite Subscription erzeugen. Rechts-/Kündigungsdetails bleiben freigabepflichtig.
- Stripe-Plugin wurde für **Sandbox** ausdrücklich beauftragt. Drei Produkte/Preise und blaues Branding sind vorhanden:
  `packages/core/src/config/stripe-v4-sandbox.json`. Wiederverwenden, keine Duplikate anlegen.
  V4-Checkout mit Live-Key bleibt technisch gesperrt. DNS und Domains nicht ändern.
- **Kein Live-Deployment, keine Produktionsmigration und keine Produktionskonfiguration für diesen V4-Auftrag.**
  DRY_RUN=true und Mock-Provider beibehalten. Vorherige Deploy-Aufträge sind keine V4-Produktionsfreigabe.
- V4-Briefkandidaten A/B/C je fünf Branchen nur pausiert anlegen; bestehende aktive Quoten und Freigaben erhalten.
  Kein automatisches Aktivieren oder Versenden; erste 30 Demos weiterhin manuell prüfen.
- Engagement-Messung standardmäßig aus; zusätzlich `ENGAGEMENT_TRACKING_APPROVED=true` nötig.
  „Nicht gemessen“ nicht als 0 oder gemessene Conversion darstellen. Keine juristische Freigabe behaupten.
- Keine persönlichen Betreiberangaben hart im öffentlichen Repository. Private DB-Konfiguration oder OPERATOR_*-ENV
  verwenden; fiktive Kontaktdaten in Tests und PDFs. Kein Betreiberfoto. Historische Redaktionen als solche verstehen.
- Test-Reset nur auf lokalen ausdrücklich benannten test/e2e-Datenbanken. Externe Dienste mocken.
  Lokaler Core-/E2E-Testpostgres darf nie durch einen Supabase-Verbindungsstring ersetzt werden.
- Finanzansicht trennt vereinnahmte Erst-/Monatszahlungen, Erstattungen, bekannten V4-MRR und Legacy-Vertragswert.
  Ohne belegte Hosting-/Domain-/Zahlungskosten und tatsächlich erfasste Care+-Zeit keinen Deckungsbeitrag erfinden.

## Verbindliche Fortsetzung V5 (25.10.2026)

- Autoritativer aktueller Stand: `docs/v4-quality-handoff.md`, `docs/v5-quality-pruefung.md`,
  `docs/v5-go-live-checkliste.md`, `docs/v5-betrieb-und-provider-audit.md`. Alte Phase-/V4-Berichte
  sind zeitgebundene Nachweise, kein Auftrag zum Wiederaufbau oder zur Preisrücksetzung.
- Zielarchitektur: bestehende zwei Netlify-Bereitstellungen, dieselbe Supabase-DB/privater Storage,
  später genehmigter dauerhafter Node-/Chromium-Worker. `docker-compose.worker.yml` enthält
  ausdrücklich KEINEN Produktionspostgres. VPS nicht bestellen; keine Produktionsmigration/deploy.
- Produktions-Web/Worker migrieren und seeden nicht automatisch. Queue offline mit `queue:prepare`
  vorbereiten, Anwendung nur nach gesonderter Freigabe. Worker/Queue über Direct/Session5432;
  `QUEUE_DATABASE_URL` muss dieselbe DB ansprechen. Keine Transaction6543 für Scheduler/Migration.
- Health/Mock-Checks sind keine tatsächliche Provider-, Datenschutz- oder Betriebsabnahme.
  Container-Smoke, lokale Rollen-/Queue-/Restoretests ersetzen keine Supabase-/S3-Produktionssicherung.
- Erste30-Demos benötigen konkrete Fakten-/Desktop-/Mobil-/Bild-/Textprüfung; Bulk/CLI darf das
  nicht umgehen. Technisch bestanden und manuell freigegeben bleiben getrennte Zustände.
- V4-A enthält inzwischen eine Entwurfskennzeichnung; alte Fertig-Versprechen werden vom Wahrheitsgate
  blockiert. Bestehende aktive DB-Arme nicht überschreiben, keine Varianten unbemerkt aktivieren.
- Erstattungen nur bei bestätigtem Erfolg. Monatszahlung und Einrichtung getrennt buchen;
  Korrekturbelege unveränderlich als Differenz, keine doppelte Gutschrift bei Replay. Unklare
  Zuordnungen bleiben offen und sperren einen vollständig bestätigten Finanzsaldo/Deckungsbeitrag.
- Garantie-/Vertragstexte sind Arbeitsfassungen zum implementierten Ablauf, keine Betreiber- oder
  Rechtsfreigabe. Steuerbestätigung bleibt standardmäßig false, V4-Live-Key bleibt blockiert.

## Ultimate-Qualitätsfortsetzung (25.10.2026)

- Aktuellste Entwicklungsprüfung: `docs/ultimate-quality-handoff.md`. Fünf kuratierte KI-Motive
  sind ausdrücklich **Beispielbilder**, keine echten Betriebsfotos und kein CC0. Im Manifest getrennt
  dokumentieren, nur Entwürfe; Live nur berechtigte Kundenbilder. Unpassende/fehlende Bilder blockieren
  bzw. bildfreien Fallback verwenden; kein zufälliges anderes Gewerbe illustrieren.
- Neue Demo-/Brief-Qualitätsberichte enthalten gewichtete manuelle Kriterien. Unbekannt bleibt `null`,
  nicht künstlich90/100. Technisch bestanden ist keine gestalterische Freigabe. Erste30-Demos und
  neue Briefe einschließlich Folgebrief3 benötigen tatsächlich dokumentierte individuelle Prüfung.
- Screenshot aus exakt gespeichertem/ausgeliefertem Demo-HTML; spätere Templateänderungen dürfen das
  Briefbild nicht still verändern. QR-Ziel aus dem **fertigen PDF** dekodieren und vergleichen.
  Empfängeranschrift niemals zur optischen Reparatur abschneiden; unpassende Anschrift zur Prüfung.
- 0–100-Leadscore nur für neue begründete Bewertungsdatensätze. Fehlendes OSM-Website-Tag und der
  technische OSM-Default `OPERATIONAL` sind kein Verifikationsnachweis. Aktivität/fehlende eigene
  Website und Eignung der Demo durch tatsächlichen Faktenreview bestätigen. Score ist keine Versandfreigabe.
- Primärbranchenprofile Friseur/Garten/Reinigung/Sanitär sind nur inaktiv vorbereitet. Keine bestehende
  Such-/Variantenquote oder Produktivkonfiguration durch neue Defaults ungefragt überschreiben.
- Bei großen lokalen Render-/Browser-/Dockerläufen Speicher- und RAM-Grenzen beachten. Schwere
  Browserpakete nacheinander, Paare in kleinen Gruppen. Speicherabbruch/OOM/Registry503 ist kein
  bestandenes Ergebnis. Nur eigene entbehrliche Build-Artefakte bereinigen, keine fremde Arbeit/DBs.
- Push auf den Arbeitsbranch ausdrücklich beauftragt, mit `[skip ci] [skip netlify]`. Keine Freigabe
  für automatisches Produktionsdeployment, Migrationen, Zahlungen, Werbeversand oder DNS ableiten.

- Vor Versand muss die Brief-Demo weiterhin die aktuell über QR erreichbare Demo sein. Ersetzte
  Demos und nachträglich fehlgeschlagene/offene Qualitätsprüfungen blockieren Versand erneut.
  Ein früheres approved darf diesen späteren Befund nicht umgehen.


## Verbindliches Redesign-Gate (26.10.2026)

- Frühere technische Ultimate-Abnahme ist keine gestalterische Freigabe. Drei Maler-Konzepte zuerst,
  identische fiktive Fakten; Ergebnisse und Grenzen in `docs/design-review/README.md` und `status.md`.
- `designReview` und `reviewOnly` sind interne Prüfparameter, keine Produktivaktivierung. Bestehende
  IDs und Plakat erhalten. Vor ausdrücklicher visueller Zwischenabnahme keine Übertragung auf weitere
  Branchen und kein allgemeines Firmenwebsite-Redesign. Nächste Sitzung dort fortsetzen, nicht neu bauen.
- Screenshots/PDFs sind echte lokale Renderartefakte; QR-Testserver ist nur lokal, kein öffentliches
  Briefziel. Lokale Mock-/Browserprüfungen nicht als echte Stripe-Sandbox-/Providerabnahme darstellen.

## Neuester Completion-Auftrag

Kein Push ohne neue ausdrückliche Freigabe. Lokale allgemeine Funktionskorrekturen, Geräte-Mockups,
Personalisierung und Abnahmegalerie sind beauftragt. Drei neue Maler-Stile weiterhin nicht auf andere
Branchen übertragen. Vorhandene andere Templates dürfen mit fiktiven Profilen geprüft werden.


## Aktueller Einzelauftrag 1 – Demoqualität

Der Betreiber bearbeitet jetzt fünf Prompts nacheinander. Ausschließlich den aktuell beauftragten Prompt
umsetzen; weitere Aufgaben nicht vorwegnehmen. Aufgabe1 autorisiert lokale Verbesserungen aller20
bestehenden Demo-Vorlagen, Bild-/Textauswahl und QA; keine einheitliche Maler-Stilkopie. Belege und
aktueller Stand in `docs/task1-design/`. Gerätegeometrie, Brief-/Zahlungsmodell und Marketingwebsite
bleiben in dieser Aufgabe erhalten. Aufnahmehilfe darf für korrektes Lazy-Image-Rendering repariert werden.
Kein Push/Deployment ohne neue Freigabe; technische Tests sind keine gestalterische Betreiberabnahme.

## Aktueller Einzelauftrag 2 – Briefe und QR-Demofunnel

Aufgabe1 ist lokal abgeschlossen. Jetzt ausschließlich bestehende Briefstrecke verbessern; Bericht und
Wiederaufnahme unter `docs/task2-letters/`. Gerätegeometrie erhalten. Neue V4-Ansicht zeigt Laptop/Handy,
41mm-QR und ruhige, getrennte Preise; Pflichttexte nicht zum Einpassen verkleinern oder abschneiden.
Verifizierte Leistungsdetails nur aus manuellem `review.letterFacts` mit Quellenreferenz; Beispiel-Leistungen
und generierter Demo-Text sind keine verifizierten Firmenfakten. Ohne Details neutral formulieren.
Neue Briefdateien an QA-/PDF-/Empfänger-/Angebotshashes binden, vor Freigabe/Versand erneut prüfen.
Fehlgeschlagene Regenerierung darf den bisherigen Brief nicht löschen. Neue Varianten bleiben pausiert;
keine aktiven DB-Arme oder Quoten still überschreiben. Kein Push/Deployment oder echter Anbieterauftrag.

Rechercheformulierungen in Briefen nur mit explizitem manuell geprüftem `letterFacts.kind` (`public_observation`
oder `website_search`), Quelle und aktuellem `checkedAt`. Website-Suchbefund verlangt dokumentierte Namen-/Ort-
Suche, Verzeichnis- und Social-Link-Prüfung; kein Nachweis aus fehlendem OSM-Tag. Fiktive Recherche-Muster niemals
als tatsächlich recherchierte Betriebe präsentieren. Keine garantierten Kunden, Leads oder Umsätze.

## Aktueller Einzelauftrag 3 – Vertrauen und bestehender Checkout

Aufgabe2 bleibt erhalten. Aktueller Stand unter `docs/task3-checkout/`. Geliefertes SeitenWerk-Monogramm
nur auf Anbieteroberflächen/Print verwenden, keine Kundenmarke ersetzen. Bestehender Hosted Checkout,
V4-Preise und Go-Live-Monatsstart bleiben. Bezahlte und noch verarbeitete Bestellungen getrennt anzeigen;
keinen Onboarding-Link über halböffentlichen Demo-Kontext ausgeben. Gleichzeitige Hosted-Klicks mit
bestehender Lead-Zeile serialisieren; innerhalb der Sperre dieselbe DbOrTx-Verbindung durchreichen.
Mock-Browserprüfungen sind keine Stripe-Sandbox-Zahlungen. Keine neue Aufgabe4/5, kein Push/Deploy.

## Aktueller Auftrag – Betriebscharakter und Demoqualität (26.10.2026)

Der neueste Betreiberauftrag erweitert Aufgabe3 ausdrücklich um bestehende Demo-/Automatisierungsqualität.
Stand/Nachweise: `docs/vibe-upgrade/`. Alle20 IDs/Plakat und V4/V5 erhalten, keine Produktionsaktionen.
KI-Bilder gehören nicht mehr zur normalen Demoauswahl; archivierte Prüfassets nicht löschen oder
umetikettieren. Lizenzierte nichtgenerierte Motive dezent, aber lesbar als Beispielbildwelt kennzeichnen.
Betriebsbilder im Entwurf ausschließlich mit explizit bestätigtem Darstellungsrecht. Analyseberechtigung
ist ein eigenes Feld und erlaubt noch keine Fotoveröffentlichung. Öffentlich sichtbar bedeutet nicht frei
verwendbar. Keine Google-Compliance-Schalter oder Quellenbedingungen umgehen.
Stilprofil bestimmt Farbe, Typografie, Komposition und passende bestehende Vorlage; daraus keine
Leistungen, Qualitätsaussagen oder Firmenfakten ableiten. Ohne Belege bleibt es ein Branchenvorschlag.
Private Belege über bestehende Leadverwaltung/Settings/Storage, kein zweites Datenmodell. Bestehender
Anthropic-Provider unterstützt Bildblöcke; Mock-Stilantworten sind keine echte Bildanalyse-Abnahme.

## Neueste Briefentscheidung – persönliche Vorschau statt Preisangebot (26.10.2026)

Die jüngste ausdrückliche Betreiberanweisung ersetzt für neue V4-Werbebriefe alle älteren Vorgaben,
Preise/Tarife im Brief zu zeigen. Keine 597-/19-/99-Euro-Angaben im Einladungstext. Demo und bestehender
Checkout behalten die vollständigen unveränderten V4-Kosten und Vertragsbedingungen vor jeder Bestellung.
Kostenloses Ansehen und spätere kostenpflichtige Beauftragung klar unterscheiden.

Nicht nur Name/Ort in Branchensätze einsetzen: vorhandenen budgetierten LLM-Provider für zusammenhängende
Überschrift, Einstieg, konkreten möglichen Nutzen und QR-Satz aus überprüften Betriebsangaben verwenden.
Nur quellengebundene review.letterFacts sind Betriebsfakten; generierte Demo-Beispieltexte sind es nicht.
Demo-Funktionsabgleich und separate Fakten-/Sprachprüfung, höchstens ein Reparaturversuch. Unbekannte
Fakten nicht erfinden. Fehlende Fakten, Anbieterfehler und Mockbetrieb ergeben eine ausdrücklich markierte
Ersatzfassung zur individuellen Kontrolle, keine fingierte KI-/Rechercheabnahme.

Quellen-/Demo-/Empfängerbindung, Slot-Claims, Sperrlisten, manuelle Qualitätsabnahme, echtes Gerätebild,
41mm-QR, Art.-14/21-Texte und deren lesbare Größe erhalten. Neue Kopierrichtlinie/Faktenänderung macht
alte PDFs vor Freigabe erneut prüfpflichtig, historische Dateien nicht pauschal löschen. Offline redaktionell
vorgegebene Modellantworten als fixture kennzeichnen; keine echten LLM-Ergebnisse daraus behaupten.
Stand und Belege: docs/letter-preview-upgrade/. Nur lokale Mocktests, kein Push/Deployment oder Versand.

## Neueste Akquiseentscheidung – belegter Bedarf statt Website-Lücke (26.10.2026)

Autoritativ: docs/acquisition-priorities/. Lokale V4-Kampagnenpriorität: Maler mit privatem
Renovierungs-/Sanierungsangebot, Gewerbereinigung, Fliesenleger mit Privatkunden-/Badrenovierungsfokus.
Zweite Wahl Garten, Boden, Parkett, Entrümpelung. Bestehende Templates/andere Branchen erhalten;
Produktionskonfiguration nicht unbemerkt überschreiben. Beim Rollout gespeicherte Branchenlisten
gegen die neue geprüfte Konfiguration abgleichen.

Eigene Website anhand Namen/Ort, Telefon und verlinkten Verzeichnis-/Profilseiten aktuell prüfen.
Leeres Website-Feld, OSM-OPERATIONAL-Default, neue Verzeichnisaufnahme und allgemeiner Demo-Faktenhaken
sind keine Verifikation von Website-Abwesenheit, Aktivität oder Gründung. Postalische Eignung braucht
belegte Aktivität, eigenständigen Betrieb, Anschrift, passenden Leistungs-/Kundenfokus und aktuelles
Akquisesignal. Aktive Profile, Leistungswerbung/freie Termine, neues Angebot, Expansion oder Übernahme
gesondert belegen; Bewertungen/Arbeitsbilder sind nur Qualitätssignale und keine Kapazitätsbelege.

6–36 Monate nur aus tatsächlichem belegtem Geschäftsbeginn plus Vollerwerbsnachweis bevorzugen.
Alter oder Vollerwerb unbekannt lassen; ältere wachsende Betriebe nicht pauschal ausschließen.
Geschlossene/reine Subunternehmer und ausgelastete Betriebe ohne Wachstumsbeleg nicht anschreiben.
Auslastung plus Expansion bleibt ein manueller Konflikt. Keine Kaufwahrscheinlichkeiten erfinden.

Research im bestehenden privaten Settings-/Lead-/Reviewpfad, keine neue Tabelle/Produktionsmigration.
Fakten mit Quelle/Datum an bestehende Demo-/Briefkomposition durchreichen; keine typischen
Beispielleistungen als Betriebsfakten übernehmen. Inhaltsänderungen erfordern neue Demo-QA; reine
Datums-/Bedarfsaktualisierung baut eine inhaltlich unveränderte Demo nicht neu. Brieffreigabe prüft
den aktuellen Gesamtbelegstand erneut. Opt-out/Löschung entfernt auch Research. Google-Sperren,
Foto-Nutzungsrechte, erste30-Review, V4-Preise, preisfreie Briefe und DRY_RUN unverändert erhalten.

## 27.10.2026 – Realer Recherche-/Gestaltungsprobelauf

Aktueller Handoff: `docs/real-painter-check/status.md`. Betreiber verlangt gründliche Suche nach
tatsächlich passenden Betrieben; Mindestkriterien nicht für schnelle Ergebnisse lockern.
Die abstrakte Farbflächen-Studie im Maler-Hero ist ausdrücklich nicht gewünscht. Bestehende Vorlagen
verwenden passende rechtmäßig nutzbare Arbeitsmotive oder das sachliche Betriebs-/Leistungspanel.
Kuratierte Pexels-Lizenz nicht als CC0 bezeichnen. Nichtgenerierte Beispielbildwelt weiterhin ehrlich
kennzeichnen; fremde Arbeitsbilder nicht als echte Projekte des Betriebs ausgeben.
Echter recherchierter Kontrollfall und reine redaktionelle Offline-KI-Fixture bleiben unterschiedliche
Nachweise. Keine komplette echte LLM-/Stripe-Abnahme behaupten. Private Empfängerdaten/Quellenkopien
nur in ignoriertem `data/`, keine Produktionsaufnahme oder Kontaktaufnahme. Alle bisherigen Gates erhalten.

## 27.10.2026 – Stilangleichung nur bei ausreichenden Informationen

Vorhandenen berechtigten visuellen Kontext jedes Betriebs auf Farben/Materialien, sichtbare
Schrift/Beschilderung, Atmosphäre/Bildsprache und Komposition prüfen. Branche, Name, Leistungen
oder Stockfoto sind kein Nachweis eines tatsächlich ermittelten Betriebscharakters. Fehlendes
unbekannt lassen. Ohne ausreichende Belege keine persönliche Stilangleichung erzwingen und keine
vollständige Foto-/Markenanalyse behaupten. Bestehender Branchenvorschlag und manuelle Kontrolle
bleiben möglich; ein einzelner echter Farbhinweis bleibt als Teilhinweis gekennzeichnet.
Aktueller Code verlangt mindestens zwei beschriebene Dimensionen, ausdrücklich ausreichende
Modellangaben und keine niedrige Sicherheit. Nicht belegte Originalfarben/-schriften nicht aus
Modellvorschlägen übernehmen. Diese Schwelle ist keine automatische Qualitäts-/Faktenfreigabe.
Bestehende Referenzrechte, Quellenbindung, Budgetprüfung und erste30-/Einzelprüfung erhalten.
Dokumentiert in `docs/vibe-upgrade/automation-and-billing.md`. Kein automatischer Fotocrawler.
VPS-Worker verwendet direkte Anthropic-API, kein ChatGPT-Plus-Login; API-Abrechnung und Chat-/Codex-
Kontingent getrennt erklären. Lokale Mocktests sind keine echte Anbieter-/Kostenabnahme.

## Wiederaufnahme 29.10.2026 – aktueller Claude-Stand und Live-Vorbereitung

Der Betreiber hat seit der Codex-Übergabe mit Claude weitergearbeitet und die Fortsetzung anhand
seiner letzten Screenshots beauftragt. 70 neue Commits bis `484b060`; aktueller Audit/Fortschritt
unter `docs/resume-2026-10-29/README.md`. Alte Aussagen „keine Queue/kein Worker/alle Provider Mock/
öffentliche590/49Preise“ sind überholt:21Migrationen, Queue/Worker-Takte, echte OSM-/Anthropic- und
easyNova-Testanbindung sowie aktuelle öffentliche Preise wurden erneut gelesen. Kein Wiederaufbau.

Die Screenshots enthalten das Betreiber-Ja zu Stripe/easyNova live. Bestehende Voraussetzungen
nicht überspringen: easyNova erst1von3Testaufträgen, eigene echte Briefprüfung vor Empfängerfreigabe,
Steuerbestätigung noch false, Backup-/E-Mail-Abnahme offen. Keine tatsächliche Zahlung ausführen.
Neue explizite Stripe-Auswahl mit getrennten Secrets/Katalogen ist lokal vorbereitet; test bleibt
Standard. Live-Schlüssel allein schalten nichts frei. ENV/DB-DRY_RUN und Produktion wurden in
dieser Fortsetzung nicht verändert. Konkrete spätere Aktivierung getrennt protokollieren.

Worker-Einmal-Code exportiert jetzt auch OPTOUT_EMAIL und die explizite Stripe-Auswahl; parallele
Einlösung ist atomar. Das ersetzt kein tatsächliches Serverupdate. Fremde lokale Arbeiten im
ursprünglichen Worktree unverändert lassen; Entwicklung auf `codex/resume-2026-10-29`.

Eigener Probedruck: ausdrücklich markierte Testbriefe dürfen eine Mock-Demo verwenden, weil der
Empfänger die konfigurierte eigene Testanschrift ist. Gewöhnliche Mock-Akquisepost bleibt im echten
Betrieb gesperrt. Testanschrift und Testbrief-Kennzeichnung an PDF binden; Änderung verlangt neue
Generierung. Drei Provider-Testaufträge, Opt-out und manuelle Empfängerfreigabe nicht umgehen.

## 30.10.2026 – beauftragte Aktivierung und tatsächliche Betriebsprüfungen

Aktueller Fortschritt: docs/activation-2026-10-30/README.md. Betreiber verlangt die fünf offenen
Betriebsschritte. Live-Stripe-Connector ist jetzt verbunden: Konto zahlungs-/auszahlungsfähig,
Live-Katalog und Webhook korrekt. easyNova-Guthaben tatsächlich 12,61 €. Regulärer Admin-Zugang
funktioniert; eigene PDF aus S3 geladen, gerendert und QR bis zur mobilen Demo geprüft.

Wichtiger Blocker: vorhandene Test-PDF enthält noch widerspruch@example.com. Tatsächlicher Versuch
über die bestehende Provider-Testaktion wird vor Anbieterübertragung wegen veralteter PDF-Bindung
abgewiesen; Zähler bleibt 1/3. Erst App/Worker mit OPTOUT_EMAIL-Export aktualisieren und PDF neu
erzeugen, dann zwei weitere echte Testaufträge. Rückgabe-PDFs gehen an eine hier nicht verbundene
Testadresse. Keinen Counter oder Prüfstatus künstlich bestätigen, keine echte Druckfreigabe daraus.

Automatische Freigabeprüfung lehnte den konkreten Push auf Claudes Betriebsbranch samt dadurch
ausgelöstem Netlify-Produktionsdeploy ab. Konkrete Zustimmung dafür wurde angefragt. Bis zur Antwort
keine Umgehung per anderer API, Build-Hook oder indirekter Bereitstellung. Unabhängige sichere
Arbeiten weiterführen. Steuerstatus noch unbestätigt, SSH-Zugang nicht eingerichtet. Eigene Druck-
abnahme bleibt vor Empfängerfreigabe erforderlich. Originale private Zugangsdaten unverändert lassen.

## 30.10.2026 – konkrete Freigabe für Produktionspush und Netlify-Deploy

Neueste ausdrückliche Betreiberantwort: „Ja push und veröffentlich“. Die zuvor von der automatischen
Prüfung verlangte konkrete Zustimmung liegt damit vor. Geprüften Patch auf den bestehenden Branch
claude/website-brief-maschine-0d0s37 übernehmen und tatsächliche Veröffentlichung prüfen. DRY_RUN=true
und die Empfänger-/Zahlungsfreigaben bleiben für diesen Deploy erhalten; Steuerstatus nicht erfinden.
Der Betreiber führt VPS-Updates selbst in Termius aus. Keine erneute SSH-Verbindung verlangen.
Nach erfolgreicher App-Veröffentlichung den vorhandenen Setup-Aufruf mit NEU=1 bereitstellen, damit
OPTOUT_EMAIL und die getrennten Stripe-Einstellungen neu übernommen werden. Kein LIVE=1 beim Update.

## 30.10.2026 – Worker aktualisiert, Provider-Testzähler tatsächlich 3

Betreiber hat Worker-Update durchgeführt; neuer Einmal-Code und nachfolgende Worker-Takte geprüft.
Eigener Testbrief über „Testbrief an mich“ neu erzeugt, reale PDF gerendert: richtige Widerspruchsadresse,
QR dekodierbar, Testempfängerbindung vorhanden. Zwei weitere easyNova-Testaufträge tatsächlich
eingeliefert: 125250 und 125251, Audit/Zähler jetzt 3/3. Nicht noch einmal zwei Aufträge verlangen.
**Rückgabe-PDFs noch nicht geprüft**, weil die eingestellte Testadresse hier nicht verbunden ist;
API-Annahme nicht als Druckfreigabe ausgeben. PDF-Proofs vom Betreiber anfordern und vor eigenem
echtem Probedruck ansehen. Kein Kundenversand freigeben. DRY_RUN=true und realLettersUnlocked=false.
Aktueller Nachweis docs/activation-2026-10-30/post-worker-update.json. Diese Runde ändert nur Dokumentation.

## 30.10.2026 – easyNova-Rückgabe 125251 geprüft

Betreiber hat die tatsächliche Rückgabe-PDF für Auftrag 125251 hochgeladen. Gerendert und geprüft:
Absender/Empfänger in Anbieterfenstern, DV-Fläche frei, Originaltext vollständig erhalten,
41,01mm-QR aus PDF und gerenderter Gesamtseite korrekt dekodiert. Für eigenen physischen Probedruck
druckgeometrisch geeignet. Nur dieser Proof geprüft, keine globale Rechts-/Gestaltungsfreigabe.
Prüfmarkierungen NICHT in Original-/Versand-PDF übernehmen. Kein echter Brief ausgelöst; Worker
weiter mit LIVE=0/DRY_RUN=true, Kundenfreigabe false. Nachweis docs/activation-2026-10-30/provider-proof-125251.json.

## 30.10.2026 – vier Betriebsabnahmen, Steuerstatus bewusst offen

Neuester Auftrag: tatsächlicher Stripe-Sandbox-Zyklus Basis/Care+ mit Monatsstart, Mail/Onboarding/
Kundenseiten-Hosting, Backup/isolierter Restore samt fehlender Recherche-Queue und ein echter
qualifizierter Kontrollbetrieb. Keine §19-/USt-Bestätigung verlangen oder erfinden; Steuerstatus
ausdrücklich offen. Live-Verkaufssperre bleibt. Seitenwerk.world ist vorhanden, Test nur auf eigener
Subdomain; keine Root-Seite überschreiben/Domain kaufen. Aktueller Prüfstand:
docs/activation-2026-10-30/acceptance-progress.md.

Stripe-Sandbox verbunden, vorhandener Katalog/Webhook stimmen. PAYMENT_PROVIDER in Netlify nun
stripe gespeichert; Code-Standard test. Neuer Deploy erforderlich. Mail/Hosting/Registrar weiter
mock. Hosting-Token hinterlegt Betreiber als Functions-Secret; regulären Einmal-Code-Export nutzen.

Backup-Wrapper lokal geprüft, nicht als Supabase-Abnahme ausgeben. App-Rolle hat keine Vollbackup-
Rechte: separate private berechtigte Verbindung derselben DB, keine App-Hochstufung/RLS-Abschaltung.
Queues erst nach echtem Backup/Restore im --queues-only-Modus ergänzen, ohne Migration/Seeds.
VPS bedient Betreiber, nicht erneut nach SSH fragen. Neue Queue kann budgetierte Recherche
aktivieren, aber niemals Briefe/Domainkäufe/Live-Zahlungen automatisch freigeben.

Tatsächliche Stripe-Hosted-Sandbox-Käufe Basis und Care+ jetzt durchgeführt, je597EUR; signierte
Webhooks verarbeitet, Kunden/Mandatszustimmung und gespeicherte off_session-Zahlungsmittel vorhanden.
Noch keine tatsächliche Monatsabbuchung und kein echter Hosting-Go-Live. Basis-Onboarding und
private Vorschau tatsächlich erstellt. Resend-App-Mail noch mock, keine Zustellung behaupten.
Neue Rechnungen ohne bestätigten Kleinunternehmerstatus enthalten keinen §19-Standardhinweis;
gespeicherte alte Testrechnung unverändert lassen. Steuerstatus weiterhin unbestätigt.
Erfolgsseite kennzeichnet Testzahlung/Mock-Nichtzustellung, Betriebsfunnel zählt Test-Go-Lives,
Mock-Leads/-Demos und Test-Tarifwechsel nicht als echte Kampagnenergebnisse. Zwei tatsächliche
Testkäufe sind kein Umsatz-/Conversionbeleg. Externen positiven Monatsstart nicht durch einen
fingierten Go-Live-Eintrag erzwingen. Nachweise unter acceptance-progress.md/stripe-sandbox-purchases.json
im bisherigen Aktivierungsverzeichnis; VPS-Backup und Queue-Ergänzung weiter nicht ausgeführt.

## 30.10.2026 – Hosting-Zugang tatsächlich lesend bestätigt

Betreiber hat Hosting-Secret im richtigen Projekt seitenwerkworld gespeichert. Tatsächlicher Name
NELITFY_API_TOKEN (Buchstabendreher); Screenshot zunächst falsch gelesen. Kanonischer Name
NETLIFY_API_TOKEN hat Vorrang, genau dieser vorhandene Alias wird zusätzlich akzeptiert und beim
regulären Worker-Bootstrap ausschließlich kanonisch exportiert. Kein neuer Token nötig und kein
Secret über Metadaten-/Bootstrap-Umwege auslesen. Interne authentifizierte Laufzeitprüfung HTTP200
am30.10.11:26UTC bestätigt Zugriff. Hosting allgemein weiter mock, DRY_RUN=true.

Vorbereiteter CLI-Probelauf hosting-acceptance.ts nur für gespeicherte fiktive, bezahlte Stripe-
Sandbox-Bestellung an eigenes Absenderpostfach; eigenes Testprojekt und feste test.seitenwerk.world.
Keine privaten Links/aktiven Formulare veröffentlichen; Root-Projekte schützen, HTTPS-Inhalt prüfen.
Keine App-Go-Live-/Abozustände fingieren. Noch nicht auf VPS ausgeführt; Betreiber bedient VPS selbst.
Nachweis/Befehle: docs/activation-2026-10-30/hosting-acceptance.md und hosting-connection.json.

## 30.10.2026 – VPS-Hosting-Probelauf tatsächlich bestanden

Betreiber hat Worker aktualisiert und Test veröffentlicht. test.seitenwerk.world: HTTP200,
gespeicherter HTML-Hash identisch, TLS gültig, Root-Website unverändert; Audit 11:39:58 UTC.
Desktop1440/Mobil390 ohne Überlauf/Font-/JS-Fehler. Details hosting-publication.json im bisherigen
Aktivierungsverzeichnis. Kein weiterer NEU=1-Aufruf für diesen bereits bestandenen Test nötig.
App-Kundenseite bewusst weiter preview, beide Stripe-Testbestellungen ohne tatsächlichen Monatsstart.

Begrenzter E-Mail-Abnahme-CLI email-acceptance.ts vorbereitet: nur fiktive, bezahlte Stripe-Sandbox-
Bestellung, Original-Testbeleg ohne unbestätigte Steuerbehauptung, ausschließlich eigenes konfiguriertes
Absenderpostfach. --apply und EMAIL_ACCEPTANCE_CONFIRM=own-inbox erforderlich. Prozesslokal Resend,
keine globale Provider-/Auto-Reply-Änderung. Separater idempotenter acceptance_invoice-Postausgang;
historische Mock-Sent-Zustände/Bestell-/Onboardingfelder unverändert. Noch keine echte Zustellung.
Tests und Betreiberbefehl: docs/activation-2026-10-30/email-acceptance.md. VPS bedient Betreiber selbst.

## 30.10.2026 – Eigene App-Bestätigung tatsächlich empfangen, jedoch Spam

CLI72be5ac vom Betreiber ausgeführt: Resend delivered, Empfang13:42:10UTC, Message-ID identisch.
Original-Test-PDF aus empfangener Mail hashgleich, gültig/korrekt ohne unbestätigten §19-Hinweis.
Privater Onboarding-Link tatsächlich390px/HTTP200/richtiger Käufer/kein Überlauf/kein Login geprüft.
Nicht erneut nach dieser bereits empfangenen Testmail fragen. Kein neuer globaler Providerwechsel;
normale Kundenmails weiter mock, kein Monatsstart/Go-Live. Empfangsnachweis email-delivery.json im
bisherigen Aktivierungsverzeichnis. Historisches deliveryVerified=false im Sendeaudit nicht umschreiben.
Spam-Einstufung bleibt offen: Resend Domain/DKIM/SPF verified, DMARC und externer Inbox-Test nicht
unabhängig bestätigt; Ursache unbekannt. Kein automatisches Nicht-Spam-Markieren, DNS-Wechsel oder
Neusenden. Backup/Restore/Queues und tatsächlicher Sandbox-Monatsstart weiter ausstehend.

## 30.10.2026 – verbleibende Kunden-/Backup-Abnahmen konkret vorbereitet

Neuester Auftrag: verbleibende Go-Live-Punkte weiter abarbeiten. Bestehender Deploy bindet nun auch
vorhandene Domains an; neue Domain weiter erst nach Verfügbarkeits-/Kauffreigabe. Keine Bestätigung
über Standard-Hosting-URL bei noch offener gewünschter Domain. Stripe-Monatsstart zusätzlich nur bei
Vorschaufreigabe, echtem Hosting, erfolgreichem gespeichertem Live-Check und HTTPS, Modus beidseitig
abgleichen. Keine Fake-Go-Live-Writes, Mock-Registrar belegt keinen realen Domainablauf.
Stripe-Sandbox-Publikationen anhand gespeichertem Zahlungsmodus dauerhaft Test/noindex/Formular aus,
auch bei geänderter Betreiberadresse. Normale Live- und Legacy-/Mock-Abläufe erhalten.

customer-acceptance.ts: nur zwei festgelegte eigene fiktive, bezahlte Stripe-Testbestellungen, zwei
eigene feste Testhosts, echte Root-Zuordnung und HTTPS/Hash/Layout vor normalem Live-Check. Bestehende
Services/Tabellen verwenden; queuefreie synchrone interne Optionen nicht aus öffentlichen Eingaben
übernehmen. Monat1900/9900Cent und tatsächliche order_payments prüfen, wiederholter Start gleicheID,
danach regulär Testverlängerung kündigen. Noch NICHT auf VPS gelaufen. Core geändert: regulärer
Worker-Code-Neuaufbau nötig, kein neuer Secret-Abruf/NEU=1 nötig. customer-acceptance.md im bekannten
Aktivierungsverzeichnis enthält Ablauf.38gezielteCore-Tests,2Produktions-Browser-E2E, Workspace-
Typecheck/Lint/Build grün; lokale Tests sind kein externer Monatsnachweis.

Backup-Script unterstützt ASK_BACKUP_URL=1/QUIESCE_WORKER=1, verdeckte private Terminaleingabe,
Wiederanlauf via Trap, Queue-Erfolg erst nach echtem Restore/Queue-Aufruf. App-Rolle nicht aufwerten,
RLS nicht abschalten. Backup-Verbindung weiterhin privat durch Betreiber nötig, noch kein produktiver
Dump/Restore/backup_status. backup-next.md enthält genaue Schritte.

Nutzer hat ausdrücklich eine eigene Gmail-Adresse für genau eine zusätzliche Testbestätigung genannt.
Über Resend-Connector einmal mit Original-App-Inhalt/-PDF/-Privatlink gesendet; Provider delivered.
Eigentliche Inbox-/Spam-Platzierung angefragt, noch unbekannt. Nicht erneut senden; private Adresse
nicht ins öffentliche Repository. Details external-email-delivery.json. Allgemeiner Mail-Provider
bleibt mock. Keine Registrar-Zugänge in App-Metadaten, Kontostatus INWX angefragt. Keine neuen Provider.
Root-Firmenwebsite neu gelesen: aktuelle597/19/99, offensichtliche gesuchte Platzhalter/Altpreise nicht
gefunden; §19-Erwähnung in AGB ausdrücklich keine Befreiungszusage. Keine Rechtsfreigabe daraus ableiten.

App-Codebc97fb8 tatsächlich veröffentlicht: Netlify6ae4ad23bc965189a55852f8 ready/production,
14:44:44UTC. Geschützte Laufzeit danach bestätigtDRY_RUNtrue, Stripe/test/HTTP200, S3/Resend lesbar,
HostingMock mit gültigem Token/HTTP200, ausgehendeMailMock. Neuer Kunden-/Backup-CLI noch nicht
auf VPS ausgeführt; die aktuelle Veröffentlichung ersetzt diese externen Nachweise nicht.
Sicherer Nachweis customer-acceptance-deployment.json im bekannten Aktivierungsverzeichnis.

## 30.10.2026 – INWX-Konto bestätigt, geschützter Worker-Import korrigiert

Betreiber bestätigt vorhandenes INWX-Konto und hat Zugangsdaten im Chat genannt. Werte nicht
wiederholen/ins öffentliche Git oder Test-Fixtures übernehmen. Geändertes Passwort privat als
Functions-/Production-Secret REGISTRAR_PASSWORD, echten API-Login als REGISTRAR_USER hinterlegen.
Letzter App-Metadatenabruf weiterhin nur REGISTRAR_PROVIDER. Keine Kontoanmeldung als bestanden behaupten.
Bootstrap-Allowlist um USER/PASSWORD/ENV/TOTP_SECRET ergänzt, bisher fehlten diese tatsächlichen
Felder im VPS-Export. Sieben Bootstrap-Tests grün; keine Erhöhung der Secret-/Versand-/Kaufrechte.
registrar-preflight.ts nur explizite Sandbox-Leseprüfung, DRY_RUNtrue, --check plus Bestätigungsvariable,
keine Registrierungen/DNS-Änderungen und keine kontobezogenen Rohfehler. Nach tatsächlich neu
hinterlegten Secrets einmal NEU=1 LIVE=0 nötig; frühere eigene Monats-/Backup-Tests bleiben unabhängig.
Anleitung/Nachweise: docs/activation-2026-10-30/inwx-setup.md. Kein externer INWX-Zugriff bisher.
