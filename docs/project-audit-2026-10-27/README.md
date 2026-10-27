# SeitenWerk – Projekt-, Betriebs- und Conversion-Audit

27.10.2026, ca. 06:58 UTC. Geprüfter Quellstand `a820158b06fee63cbb940b5d0b1889e16d944e14`,
Branch `codex/conversion-v4`, anfangs sauber. Auftrag: Gesamtstand untersuchen, Restarbeiten und
plausible Conversion-Hebel benennen. Keine neue Produktphase, keine Anwendung oder Anbieter umgebaut.
`DRY_RUN=true` unverändert. Keine Produktionsmutation, Migration, Veröffentlichung, Kosten oder Kontakte.

## Ergebnis

**Umfangreiche lokal geprüfte Anwendung; noch kein abgenommener autonomer Verkaufsbetrieb.**
Die größte Lücke besteht zwischen lokalem Entwicklungsstand, veröffentlichten Oberflächen und den
realen Anbieterwegen. Zusätzlich fehlt die vollständige automatische Beschaffung der Firmenfakten
und berechtigten visuellen Referenzen, die die gewünschte individuelle Gestaltung ermöglichen.

Supabase enthält 0 Leads, 0 Demos, 0 Briefe, 0 Bestellungen und 0 Kunden. Eine Kaufquote dieses Systems ist
nicht messbar. Starke Steigerung ist ein Ziel, kein hier nachgewiesenes Ergebnis. Ein Modellwechsel
oder neue Farben allein belegen keine Conversion-Verbesserung.

## Prüfungen und Grenzen

Git/Anweisungen, Architektur, Providerregistry, Daten-/Vorlagenmodelle, Recherche-/Stilpfad, Demo-
und Briefgenerator, Kauf-/Abo-/Erstattungslogik, Tracking, Worker, Backup und Handoffs untersucht.
GitHub, beide Netlify-Projekte, Supabase, Stripe-Sandbox und Resend aktuell **lesend** abgefragt.
Keine Secret-Werte protokolliert oder ins Repository übernommen.

Öffentliche Start-, Preis-, Kontakt-, Beispiel- und Rechtsseiten abgerufen; Start/Preise/Kontakt
zusätzlich mit Chromium bei 390 px geprüft. Vorhandene gerenderte Demo-/Brief-/Angebotsnachweise
gesichtet, darunter der neuere private Maler-Kontrollfall. Ältere Handwerk-Galerien enthalten inzwischen
ersetzte Farbflächen; diese sind keine aktuellen Generatorfehler. Keine neue Detailabnahme aller 20 Vorlagen.

**Frisch bestanden:** TypeScript aller Pakete, ESLint, 92 Core-Tests in 12 Suiten und 109 Template-Tests
in 3 Suiten. Core ausschließlich auf `127.0.0.1:15432/wbm_audit_20261027_test`, alle sieben Provider
Mock. Der lokale Migrationslauf gehört dazu; keine Produktionsmigration.

Vollständiger Build, Docker-Smoke und Browser-E2E sind frühere dokumentierte Nachweise, hier nicht
erneut ausgeführt. Der unveränderte Implementierungsstand hat einen dokumentierten Build mit sieben
bekannten dynamischen Tracingwarnungen. Das ist kein Deploymentnachweis.

[Maschinenlesbarer Befund](evidence.json), [Core](core.txt), [Templates](templates.txt),
[TypeScript](typecheck.txt), [Lint](lint.txt), [öffentlicher Snapshot](public-snapshot.json),
[Browsermessungen](live-browser.json).

## Aktuell extern bestätigt

| Bereich | Tatsächlicher Stand | Bedeutung |
|---|---|---|
| Lokaler Code/GitHub | Lokal a820158; 17 Commits vor GitHub-Entwicklungsbranch c7f3f2b | Nicht alle neuen Verbesserungen gepusht; dieser Audit pusht nichts. |
| Dynamische App | Ready; 25.10.; Commit fbff0cc auf ursprünglichem Branch | Nicht der lokale V4/V5-/Qualitätsstand. |
| Firmenwebsite | Separater statischer Deploy 24.10. ; keine Functions; locked | App-Deploy aktualisiert die Firmenwebsite nicht. Neuer Export und eigene Freigabe nötig. |
| Öffentliche Preise | Start/Preise zeigen 590 € und 49 €/Monat mit 12 Monaten | Widerspruch zu 597 + 19/99. Lokale V4-Preisquelle ist bereits vorhanden. |
| Anbieter/Recht | hallo@example.com, Musterstraße/-telefon; Impressum/AGB Platzhalter | Konkreter Vertrauens- und Veröffentlichungsblocker. |
| Supabase | ACTIVE_HEALTHY; PG 17; 32 Tabellen; 11 Migrationen | Repository hat 19 Migrationen: 0011–0018 fehlen produktiv. |
| Queue/Worker | Kein pgboss-Schema, keine entsprechend erkennbaren DB-Verbindungen | Kein nachgewiesener dauerhaft funktionsfähiger Queue-Worker. |
| Datenzugriff | RLS bei allen 32 Tabellen aktiv ; keine anon/authenticated-Tabellen-/Viewgrants | Positiver Metadatencheck; kein vollständiger Sicherheitstest aller Funktionen/Accounts. |
| Storage | Privater Bucket; S3-Variablen in App eingerichtet | Echte Objekt-/Upload-/PDF-/Backupkette noch nicht abgenommen. |
| App-Provider | Alle sieben ausdrücklich auf Mock | Schlüssel allein aktivieren keinen realen Ablauf. |
| Öffentliche Routen | APP_URL eingerichtet; DEMO_DOMAIN/TRACK_DOMAIN fehlen | Öffentliche Demo-/QR-Ziele für Web+Worker nicht konsistent abgenommen. |
| Stripe-Katalog | Nur Sandbox; 59700 einmalig / 1900 monatlich / 9900 monatlich | V4-Katalog richtig. Keine neuen Produkte nötig. |
| Stripe-Webhook | Aktives Ziel auf statischer Domain liefert 404; dynamischer App-Endpunkt deaktiviert | Vollständige Zahlungskette kann so nicht als funktionsfähig abgenommen werden. |
| Resend | Domain verified; Senden/Empfang enabled; Tracking aus; App-Inbound enabled | Vorbereitung bestätigt; eigener Nachrichtenfluss und Support-Zuordnung offen. |
| Freigaben | Freigegebene legal.*-Felder leer; Steuerbestätigung fehlt; IBAN leer | Arbeitsfassungen vorhanden, keine finalen Verträge/Rechnungsdaten. |
| Sicherheitsgrenzen | dryRun=true; Send/Reply/Optimize/Domainregistrierung/Echtbriefe aus | Unverändert lassen, keine Live-Freigabe aus Testerfolg ableiten. |
| Recovery | Kein backup_status-Datensatz; lokaler Recovery-Code vorhanden | Kein aktueller vollständiger Supabase-/Storage-Restorenachweis. Anbieterbackups dadurch nicht als abwesend behaupten. |

**Webhook-Ziele:** Aktiv `https://seitenwerk.world/api/webhooks/stripe`; deaktiviert
`https://seitenwerkworld.netlify.app/api/webhooks/stripe`. Nur GET/Metadaten geprüft, keine Events
geschickt oder Endpunkte umgeschaltet. Der 404-Befund passt zum bestätigten statischen Hosting ohne Functions.

Stripe-Key/Webhook-Secret und Resend-/S3-Secrets sind im Netlify-Projekt bereits hinterlegt.
**Nicht erneut sämtliche Schlüssel verlangen oder ersetzen.** Offen sind Gültigkeit, Rechte,
Zusammenpassen mit dem passenden Endpunkt und die Versorgung eines späteren Workers.
Anthropic-, LetterXpress-, INWX- und Hosting-Appzugänge sind dort nicht eingerichtet; das beweist
nicht, dass der Betreiber keine entsprechenden Konten besitzt.

DATABASE_URL, SESSION_SECRET und ENCRYPTION_KEY sind nicht als Secret markiert. Markierung/Scopes
vor Betrieb härten, keine Werte veröffentlichen oder pauschal rotieren. Das Repository ist öffentlich;
ChatGPT-Accountauth nicht in öffentliche Repo-CI kopieren.

## Bereits vorhanden – nicht neu bauen

- 20 Templates/Plakat, lokale Fonts/Paletten, responsive QA, deterministische Vorlagenauswahl.
- Lead-Finder, Dubletten/Suppression, belegte Akquise-/Websiteprüfung und Branchenprioritäten.
- Quellen-/rechtegebundene Stilbeobachtungen, Mindestbelege, Cache und ehrlicher Branchen-Fallback.
- Strukturierter LLM-Pfad für Demo-Texte, Faktenregeln und begrenzte Reparatur/Fallback.
- Preisfreie persönliche Briefe mit unabhängigem Fakten-/Demo-/Sprachreview, proportionalem echten
  Laptop-/Handybild, 41-mm-QR und atomaren PDF-/Empfänger-/Demo-Bindungen.
- V4-Angebot 597 + 19 oder 597 + insgesamt 99, Snapshots, bestätigter Go-Live-Monatsbeginn, Care+-Kontingent.
- Hosted Checkout, Klick-Idempotenz, Abbruch-/Processingzustände, Onboarding und Rechnungen.
- Abo, Tarifwechsel/Kündigung, getrennte Monats-/Einrichtungszahlungen und Differenzbelege.
- Private Kundenvorschau/Freigabe, bestehende Registrar-/Hostingadapter, Admin/Funnel/Not-Aus/Budgets.
- Worker-only Compose, Queue-Rechte, Backup-/Restorewerkzeuge; keine zweite Produktionsdatenbank nötig.

Die Website entsteht aus vorhandenen Templates, Fakten, Bildern und begrenzten Stilentscheidungen.
Der LLM-Textgenerator schreibt nicht für jeden Betrieb eine völlig neue Anwendung. Wartbare hochwertige
Ergebnisse sind möglich; eine individuelle Agenturabnahme erfolgt dadurch nicht automatisch.

## Verbleibende Arbeiten und genau nächster Schritt

| Prio | Aufgabe | Konkreter nächster Schritt | Benötigt |
|---|---|---|---|
|P0|Versions-/Releasekonsolidierung|17 lokale Commits prüfen, Zielbranch/Deployverhalten abgleichen; prüfbaren Release vorbereiten|Push/Deploy separat freigeben|
|P0|Firmenwebsite/Identität|Vorhandenen V4-Auftritt mit bestätigten privaten Daten und freigegebenen Rechtstexten exportieren, Vorschau prüfen, statischen Deploy separat aktualisieren|Angaben/fachliche und Veröffentlichungsfreigabe|
|P0|Vertrags-/Steuerstand|Domainkosten/-umfang, Basis-Support, Änderungsrunden, Care+, Mitwirkung, Übergabe/Export und Einrichtungsgarantie verbindlich festlegen; Steuer-/Rechnungs-/Vertragsfähigkeit klären|Betreiber + fachliche Rechts-/Steuerprüfung|
|P0|Recovery|PG 17-Dump+Storage verschlüsselt extern sichern, isoliert wiederherstellen, Inhalte/Hashes prüfen|Sichere Verbindung/Ziel und konkrete Freigabe; kein Produktionsrestore|
|P0|Datenbank/Queue|0011–0018/Rollen/Session 5432 prüfen, nach Freigabe additiv anwenden/zurücklesen, pgboss vorbereiten|Migrationsfreigabe; keine Startup-Seeds|
|P0|VPS|Vorhandenes Worker-Image auf genehmigtem Server innerhalb 15 €/Monat zunächst mit Mock-Anbietern betreiben; Heartbeat/Retry/Shutdown/Alarm prüfen|Budgetrahmen bekannt; Bestellung/Betrieb noch gesperrt|
|P0|URLs/Dateikette|APP/DEMO/TRACK in Web+Worker einheitlich setzen; HTTPS und private Objektkette mit eigenen Testdateien prüfen|Konfiguration/DNS/Deployfreigabe|
|P0|Stripe-Sandbox|Richtiges dynamisches Testziel+Secret zuordnen; nur genehmigte Testlaufzeit auf stripe stellen|Konto-/Testbereitstellungsfreigabe, kein Live|
|P0|Kartenkauf vollständig|Je Basis/Care+:597 € Hosted Checkout→Signatur→genau eine Bestellung/Rechnung→Onboarding→bestätigter Test-Go-Live→19/99→Folgemonat / Kündigung / Erstattung|Bestehende Preise; auch 3DS / Abbruch/Fehler/verspätete und doppelte Events|
|P0|E-Mail/Support|Eigene autorisierte Eingangsmail und Antwort/Bestellmail, Zuordnung/Signatur/Dubletten testen|Bestehenden Resend-Zugang nutzen; keine Werbe-E-Mail|
|P0|Kundenhosting/Domain|Einen vorhandenen Hostingadapter und INWX-Sandbox konfigurieren; Vorschau/Formular/TLS/Abschaltung abnehmen|Passende Appzugänge; kein Kauf/Livebetrieb ohne Freigabe|
|P0|Briefprovider|LetterXpress-Zugang sicher binden; Testmodus/Preise prüfen; eigenen physischen Probedruck separat freigeben|Anbieterzugang+Kosten-/Versandfreigabe|
|P0|Gesamtprobelauf|Ein fiktiver Betrieb über tatsächlich genehmigte Anbieter vom Lead bis zur Testwebsite, danach beide Tarife/Fehlerfälle protokollieren|Mocks getrennt; vollständiger externer Nachweis|
|P1|Automatische Recherche|Dokumentierte zulässige Quellenbeschaffung/Websiteprüfung im bestehenden Leadworkflow ergänzen|Bisher Belege über Admin/Settings; kein autonomer Webrecherche-Agent im Worker|
|P1|Echte Modellqualität|10 identische berechtigte Profile mit tatsächlichen Antworten auf Fakten, Stil, Brief, Nacharbeit und Kosten prüfen|Anthropicadapter vorhanden; OpenAI/Codex noch nicht. Zugang/Kosten-/Datenschutzrahmen|
|P1|Zielbranchenbilder|Reinigung/Fliesen mit passenden rechtmäßigen Motiven oder autorisierten Firmenbildern versorgen; Crops/Print/Mobil prüfen|Rechte, keine falschen Projekte oder beliebigen Ersatzfotos|
|P1|Zielkonfiguration/Budgets|Gespeicherte alte Branchen-/Tarif-/Budgeteinstellungen kontrolliert auf freigegebenen Stand bringen|Produktivkonfiguration nicht durch neue Defaults überschreiben; Testgrenze 10 €|
|P1|Einzelfreigaben|Erste 30 Demos/Briefe auf Fakten, Mobil/Desktop, Bildrechte, QR/PDF und Anbieter prüfen|Betreiberkontrolle, keine automatische Score-Freigabe|
|P2|Wirkung lernen|Nach kleiner genehmigter Kampagne echte Abbruchpunkte auswerten, eine Hypothese zugleich prüfen|Keine Gewinner aus wenigen Käufen; kein neues Portal, Ads- oder Agentensystem|

Die bestätigte Startzahlungsart ist **Karte**: SEPA ist kein weiterer Startblocker, solange nicht
angeboten. Beide Hostinganbieter parallel oder ein sofortiger OpenAI-Wechsel sind ebenfalls keine
Voraussetzung für den ersten Verkauf. Bestehende Providerkonten nicht neu anlegen.

Gespeicherte Wochenlimits: 60 € Briefbudget / 30 € LLM / 20 € Places, erste Charge 40. Das ist keine Erlaubnis,
diese Summen im Test auszugeben. Bestätigter 10 € Testkostenrahmen und abgeschaltete Anbieter bleiben
maßgeblich. Vor Aktivierung die konkrete Testbegrenzung einstellen.

Rathaus-Telefonat allein ist kein hier vorliegender Nachweis einer vollständigen rechtlichen
Betriebs-/Vertragsfreigabe. Arbeitsfassungen nicht als anwaltlich geprüft oder final behandeln.

## Conversion – priorisierte Hypothesen

|Rang|Konkrete Verbesserung|Plausibler Nutzen|Nachweis erst durch|
|---|---|---|---|
|1|Aktuelle Preise, echte Identität und zuverlässige Zahlungs-/Bestätigungsstrecke|Beseitigt belegte Widersprüche und vermeidbaren Vertrauensverlust|Oberflächenabgleich, vollständige Sandbox, neutraler Verständnistest|
|2|Betriebe mit belegtem aktuellem Akquisesignal auswählen|Der Entwurf trifft eher ein tatsächliches Anliegen; Website-Abwesenheit allein reicht nicht|Originalbelege und spätere qualifizierte Kohorten, keine Kaufwahrscheinlichkeiten|
|3|1–2 echte Besonderheiten bereits im Demo-Hero und Brief sichtbar machen|Empfänger erkennt seine Tätigkeit und sein Angebot; Farbwechsel allein reicht nicht|Gemeinsame Quellen und 5-Sekunden-Verständnistest mit unabhängigen Personen|
|4|Bildwelt der priorisierten Branchen verbessern|Aktuelle Routineauswahl: 1 Malerfoto, 0 Reinigungs-/Fliesenfotos; bildfreie Fallbacks zeigen weniger vom Angebot|Erlaubte Motive/Crops tatsächlich auf Mobil und im A4-Gerätebild prüfen|
|5|Gegenwert der 597 € konkret machen|Unklarer Domain-/Anpassungs-/Supportumfang erzeugt Rückfragen vor Zahlung|Freigegebener Lieferumfang, Kundentätigkeiten und Go-Live-Schritte vor Tarifwahl verständlich zeigen|
|6|Brief am konkreten Entwurf ausrichten|Gerätekomposition ist brauchbar; ein individueller belegter Anlass macht die Vorschau relevant|Echte Modellausgaben statt Offline-Fixtures, Fakten-/Sprachprüfung, physischer Scan|
|7|Mobile Informationsfolge straffen|Live-Startseite 390 × 5578 px; wichtigste Informationen sollen früh verständlich sein|Hero→beste 2–3 Beispiele→Ablauf→Leistung/Preis ; 360/390/430 px und Rückfragen prüfen|
|8|Tatsächliche Abbruchpunkte messen|Zeigt, ob Auswahl, Brief, Demo, Angebot oder Checkout die größte Lücke ist|0018 + Messfreigabe; Test/Kontrolle ausnehmen, Zustellung bestätigt/unbekannt trennen|

Die reale Bild-/Stilidentität vieler Betriebe ist noch unbekannt. Die vorhandene Stilanalyse verarbeitet
berechtigte Belege, beschafft sie aber nicht selbstständig. Ohne Belege bleibt die Gestaltung ein
ehrlicher Branchenvorschlag. Mehr Reasoning erzeugt keine Originalfotos, Rechte oder Firmenfakten.

Die aktuellen Bildzahlen wurden über den tatsächlichen `stockPhotos('handwerk',0,branch)`-Pfad
mit bestehenden Standardfiltern ermittelt: Maler 1; Gebäudereinigung/Fliesenleger/Garten-/Landschaftsbau/
Elektriker/Sanitär 0. Autorisierte Betriebsuploads sind separat möglich. Ein bildfreies Design ist nicht
automatisch schlecht; seine konkrete Überzeugungskraft muss gesichtet werden.

Modellauswahl ist deshalb ein Qualitätstest innerhalb der Architektur, kein Ersatz für diese Punkte.
OpenAI/Codex ist noch nicht angebunden. CLI-Abo wäre begrenzt, braucht privaten sicheren Runner und
Pausen bei Limits; kein unbegrenzter VPS-Automat, keine Account-Tokens in öffentlicher GitHub-CI.

## Sichtnachweise und korrigierte Fehlinterpretationen

[Live-Hero bei 390 px](live-marketing-hero-390.png), [Live-Startseite nach Scroll](live-marketing-scrolled-390.png),
[Live-Preise](live-preise-scrolled-390.png), [Bilddiagnose](live-image-diagnostics.json).

Große Weißräume in der ersten Vollseitenaufnahme waren noch nicht aktivierte Offscreen-Reveals.
Nach echtem Scroll waren alle 16 Reveal-Elemente sichtbar: **keine leeren Websiteabschnitte behaupten**.
Anfänglich sechs unvollständige Lazy-/Animationsklone sind ebenfalls kein 404-Nachweis. Der Nachlauf
zeigt keine fehlgeschlagenen Bildanfragen; identische Quellen werden sichtbar geladen. Deshalb keine
sechs kaputten Live-Bilder melden. Die alten Preise/Musterdaten bleiben davon unabhängige echte Befunde.

Auf drei 390 px-Seiten kein horizontaler Überlauf und keine JS-Laufzeitfehler. Keine neue gedrosselte
Lighthouse-/Feldmessung in diesem Audit. Frühere lokale Labormessungen bleiben entsprechend begrenzt.

## Sichere Reihenfolge

1. Anbieter-/Steuer-/Leistungs-/Rechtsentscheidungen und begrenzte Testkosten klären.
2. Vollständigen Supabase-/Storage-Recovery-Nachweis herstellen.
3. Nach Freigabe 0011–0018/Queue anwenden; genehmigten VPS-Worker zunächst mit Mock-Anbietern starten.
4. Öffentliche URLs, Storage und Mail abnehmen; passenden Testcode bereitstellen; Stripe-Webhook zur
   dynamischen Test-App richten. DRY_RUN bleibt true.
5. Tatsächlichen Basis-/Care+-Hosted-Kauf mit Folgemonat, Onboarding und Kündigung prüfen.
6. Echte Quellen-/KI-/Bildqualität an wenigen freigegebenen Profilen, LetterXpress-Probedruck und
   vollständige Anbieter-E2E-Abnahme.
7. Gesonderte Freigabe für Push, beide Veröffentlichungen, echte Zahlungen und kleine Briefcharge.

**Codex kann lokal selbst erledigen:** Release-/Konfigurationsvorbereitung, gezielte Bild-/Layoutarbeit
mit geklärten Rechten, sichere Regressionen, konkreten Quellenbeschaffungsweg vorbereiten. Reale KI-/
Providerqualität benötigt sicheren Zugang und Kosten-/Datenschutzumfang. Migration, VPS, Providerumschaltung,
DNS und Deploy bleiben gesperrt. Dieser Audit enthält die Untersuchung/Nachweise, keine Funktionsänderung.

Status: **für weitere interne Tests geeignet; Produktion, echte Zahlungen und echte Briefe noch nicht
vollständig abgenommen oder freigegeben.** Keine 9,5/10-Bewertung und keine neue Kaufquote.
