# SeitenWerk – dauerhafte Anweisungen für Codex

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
  `LXP_MODE=test`, Registrar-Sandbox und `SITE_INDEXABLE=false` bis zur passenden Freigabe belassen.
- **DRY_RUN ist kein universeller Offline-Modus.** `effectiveSwitches` sperrt per ENV das Abschalten
  des Dry-Runs, aber Provider können weiterhin externe Aufrufe ausführen. E-Mail-Versand hat keinen
  generellen Dry-Run-Guard; Zahlung richtet sich auch nach dem Stripe-Key. LLM-Aufrufe, Hosting und
  LetterXpress-Testaufträge sind ebenfalls nicht pauschal ausgeschlossen.
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
- Externe Anbieter hinter vorhandenen Interfaces: Anthropic, OSM/optionales Google, LetterXpress,
  Stripe, INWX, Cloudflare/Netlify, Resend/Postmark, lokaler/S3-Speicher. Pingen nur inaktive Alternative.
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
