# Freier Website-Generator als Gestaltungsstudio

Betreiberauftrag 05.11.2026: gestalterische Sorgfalt der separaten Osteria-Sera-Studie erreichen,
ohne diese oder andere Branchenlayouts als Vorlage auszugeben. Basis: c5bf351 mit Strict-Schema-Fix.

## Ursache und neuer Ablauf

Bislang dominierten Textregeln und Pflichtfelder das Briefing. Freies HTML/CSS war ein Zusatzfeld;
eine zufällige Tonalität bzw. ein Branchen-Fallback bestimmte die Richtung mit. Die visuelle QA
sah nur Startansichten und behandelte gestalterische Schwächen kaum als Ablehnungsgrund.

Der reguläre `buildDemo`-Pfad arbeitet jetzt so:

1. **Art Direction:** Ein eigener budgetierter Creative-Aufruf erhält Fakten und bis zu drei
   berechtigte Bildmotive. Er entwickelt zwei unterschiedliche Richtungen, wählt eine und
   beschreibt Besucheraufgabe, Komposition, Typografie, Bildregie, Mobilansicht, Seitenverlauf
   und bewusst ausgelassene Mittel. Keine Layout-Enums oder kopierten Beispiel-HTML-Dateien.
   Ein ungültiger Plan stoppt den Bau.
2. **Umsetzung:** Der Creative-Aufruf erhält die gewählte Richtung und die tatsächlichen Bilder.
   Er schreibt HTML/CSS selbst. Pflichtinhalte sind semantische Anforderungen, keine Schablonen.
   Die Hauptüberschrift darf eigenständig sein; Tätigkeit/Ort bleiben im Einstieg verständlich.
   Ein Branchen-Fallback legt den Charakter nicht mehr fest. Plan gespeichert in `_meta.studio`.
3. **Validierung:** Bestehende Fakten-, Inhalts-, HTML-/CSS-, Kontrast- und Vollständigkeitsprüfungen.
   Höchstens zwei logische Umsetzungsversuche mit konkretem Inhaltsfeedback und demselben Plan.
   Bei Scheitern Fehler, keine Bibliotheks-/Kit-Ersatzseite.
4. **Sichtprüfung:** Der bestehende QA-Aufruf erhält Desktop-/Mobil-Prüftafeln aus dem exakt
   gespeicherten HTML: Gesamtübersicht plus größere Ausschnitte aus Anfang, Mitte und Ende.
   Identität, Hierarchie, Rhythmus, Bilder, Mobilkomposition und Handlung benötigen je einen
   konkreten Befund. `revise`, `unverifiable`, fehlende Dimensionen oder ungültige Antworten
   bestehen nicht. Korrekturbedarf verlangt einen ausführbaren Hinweis.
5. **Betreiberabnahme:** Befunde stehen in bestehenden QA-Checks im Admin. Keine automatische
   Qualitätsnote oder Conversion-Zusage. Keine unbegrenzte kostenpflichtige Design-Neubauschleife.

## Kosten, Belege und Grenzen

- Ein zusätzlicher logischer Creative-Aufruf (`demo_art_direction`, aktuell höchstens 8000
  Ausgabetokens) pro Bau. Umsetzung höchstens 16000; Studio-QA höchstens 6000. Mittlere Denktiefe,
  je Studio-Schritt ein physischer API-Versuch. Bestehende Modelle
  und Budgets unverändert. Jeder physische Provideraufruf einschließlich Wiederholungen nutzt
  weiter den vorhandenen Tokenzähler und das Budget-Ledger.
- Keine bezahlten Modellaufrufe bei dieser lokalen Umsetzung/Verifikation. Mock-Plan und
  Mock-Website sind Datenfluss-Fixtures, keine Qualitätsbelege. Mock-QA meldet `unverifiable`.
- Prüftafeln zeigen eine vollständige **Übersicht**, keine Detailprüfung jeder Textzeile.
  Bei mehr als 18000 CSS-Pixeln Seitenhöhe stoppt die Aufnahme. Die separate Frage an
  SeitenWerk wird nur für die Tafeln ausgeblendet, das Betriebsformular bleibt sichtbar.
  Gespeichertes HTML und Brief-Startansichten bleiben unverändert.
- Tafeln im privaten Speicher: `demos/<id>/studio-desktop.jpg` und `studio-mobile.jpg`.
  QA-Check `studio-evidence` bindet ihre SHA-256 an das HTML. Eine alte Hero-only-QA kann
  nicht als neue bestandene Studio-Prüfung wiederverwendet werden.
- Zahlungen, Preise, Kontaktformular-Markup/-Logik, Freigaben, Budgets und Not-Aus bleiben
  unverändert. Vorhandene Demos werden nicht automatisch neu erzeugt. Passive HTML/CSS-Sandbox
  und lokale Ressourcen bleiben bestehen; keine Modellskripte oder beliebigen Ressourcen-URLs.
- Osteria Sera ist eine fiktive Studie. Deren erfundene Beispielgerichte, Zeiten und Geschichten
  werden nicht auf reale Betriebe übertragen. Der konkrete neueste schlechte Demo-Link wurde
  beim Betreiber angefragt; eine aktuelle Produktionsdemo wurde noch nicht begutachtet.

## Verifikation

Isolierte Tests für Plan-Auswahl, Fehlerabbruch vor Umsetzung, begrenzte Umsetzungsversuche,
vollständige Review-Evidenz, ablehnende Qualitätsurteile und Strict-Schema-Kompatibilität;
bestehende Inhalts-/Revisions-/Template-Tests, TypeScript und gezieltes ESLint. Tatsächlicher
Chromium-Lauf für Desktop-/Mobil-Tafeln eines fiktiven gerenderten Testentwurfs; Tafeln visuell
inspiziert. Keine Produktionsdatenbank als Testziel.

Ergebnis dieses Stands: 39 isolierte Core-Tests und 190 Template-Tests bestanden;
Core-/Template-Typecheck, gezieltes ESLint und Produktionsbuild der Web-App bestanden.
Browser-Tafeln des fiktiven Testentwurfs: Desktop 118469 Byte, Mobil 175663 Byte.
Diese Messwerte betreffen Prüfartefakte, nicht die Seitengröße oder ein Modellurteil.

**Offen:** echter neuer Modelllauf und visuelle Abnahme seines Ergebnisses. Grüne Code-/Mock-Tests
beweisen weder Sera-Qualität noch höhere Conversion. Code, Deployment, Worker-Update und
Modellabnahme getrennt berichten.

## Einzelprobe auf dem vorhandenen VPS

`infra/vps/studio-preview.sh` aktualisiert auf einen veröffentlichten, vollständigen Commit und
pausiert den Worker ausdrücklich für genau einen fiktiven Elektrobetrieb. Vorhandene Compose-Dateien
und Secrets bleiben erhalten. Der Dauerdienst wird anschließend nicht gestartet. Das Script ruft
`packages/core/scripts/studio-preview.ts` als separaten Node-Prozess auf; alle anderen Provider
sind dabei Mock, DRY_RUN ist true. Keine Leads/Demos/Bestellungen werden angelegt oder verändert,
keine Jobs gestartet. Der normale Generator und die Probe verwenden denselben `authorStudioContent`.
Kosten laufen ohne erfundene Lead-ID durch das normale Ledger. Kein direkter SDK-Aufruf am Budget vorbei.

Not-Aus und Wochenbudget gelten auch für die Probe. Aktiver Not-Aus stoppt vor dem ersten
kostenpflichtigen Aufruf. Zum Ausführen im Admin gezielt prüfen; der Worker muss pausiert bleiben.
Es wird kein Budget oder Modell umgestellt. Bis zu zwei Umsetzungsversuche wie im normalen Generator,
danach eine unabhängige Sichtprüfung, technische Browserprüfung und Lighthouse. Kein automatischer
bezahlter Neubau nach Sichtprüfung.

Private Dateien: `/opt/seitenwerk-design-preview/` und `/opt/seitenwerk-design-preview.tar.gz`.
Das Archiv enthält `index.html`, `content.json`, Desktop/Mobil-Ansichten, Prüftafeln, Review und
`result.json`. Das endgültige Ergebnis wartet immer auf manuelle Abnahme. Kein öffentlicher Link
und keine bestandene Gestaltung behaupten, bevor der VPS-Lauf tatsächlich zurückgemeldet wurde.
Ein exklusiver Startmarker verhindert unbeabsichtigte Wiederholung auch nach einem Fehler.
Vorhandene Artefakte werden nicht automatisch gelöscht; ein weiterer bezahlter Versuch ist eine
bewusste neue Entscheidung. Lokale CLI-Tests verwenden ausschließlich Fake-Git/Docker.

Prüfstand der Einzelprobe: 40 isolierte Core-Tests, vier neue Preview-CLI-Tests und sechs
bestehende Update-CLI-Tests bestanden; Core-Typecheck, gezieltes ESLint, Shell-Syntax und
Web-Produktionsbuild bestanden. Der Aufruf ohne Testbestätigung blockiert wie vorgesehen
vor einer externen Aktion. Die 190 Template-Tests aus dem unveränderten Rendererstand bleiben
der zuletzt ausgeführte Template-Nachweis. Ein bezahlter VPS-Lauf wurde hier nicht ausgeführt.

## Vorhandene Probe direkt im Browser ansehen

`packages/core/scripts/share-studio-preview.ts` läuft separat mit dem Netlify-Token des Workers.
Nur die vorhandene fiktive `index.html` und ein restriktiver `_headers`-Text werden als manueller
Draft-Deploy auf dem bestehenden Projekt `seitenwerkworld` hochgeladen. Keine erneute Generierung,
kein Build/Worker-Neustart, keine Produktionsveröffentlichung, keine Projekt-/DNS-Änderung.
Die Netlify-Antwort muss `draft:true` bestätigen, bevor Datei-Bytes übertragen werden. Ein Receipt
`share.json` bindet Deploy und SHA-256 der Quelldatei; wiederholte Aufrufe verwenden ihn weiter.
Fehlende Testdateien, unerwartetes Projekt, Secret-Muster oder unbestätigter Draft stoppen.

Die Vorschau ist **mit dem Link öffentlich erreichbar**, kein privat authentifizierter Zugang.
Nur die ausdrücklich fiktive Testseite wird geteilt; JSON-Berichte, Archiv und Zugangsdaten bleiben
auf dem VPS. `noindex`, Skript-/Formularsperre und Cache-Control werden als Header mitgeliefert.
Vier isolierte Tests prüfen Uploadumfang, Draft-Status, Wiederverwendung und Fehlerabbruch;
TypeScript/ESLint bestanden. Ein realer Upload ist erst durch den VPS-Aufruf möglich.

## 05.11.2026 – Korrektur des pausierten Updates nach VPS-Rückmeldung

Der Betreiber-Screenshot belegt einen fertigen Image-Build einschließlich Importprüfung,
danach Abbruch bei `docker compose create --no-deps worker`. Der ungültige Flag stammte
aus unserem Updater. `create worker` ist der unterstützte Aufruf und startet keine Container.
Die vorhandenen CLI-Fakes akzeptierten den falschen Flag; beide Fakes lehnen ihn jetzt ab.
Die Optionen wurden zusätzlich mit dem vorhandenen echten `docker compose create --help` geprüft.

`STUDIO_PREVIEW_USE_BUILT_IMAGE=true` überspringt Git-/Build-/Create-Schritte und prüft das
vorhandene Image auf Studio-Version und Testdateien, bevor es einen einzelnen Test startet.
`STUDIO_PREVIEW_SHARE=true` teilt bei erfolgreichem Test anschließend die vorhandene HTML-Datei
als Netlify-Draft. Der Dauerdienst bleibt pausiert. Not-Aus, Budget und Doppelstartmarker gelten
weiterhin. Sechs Update- und sechs Preview-CLI-Tests bestanden, einschließlich fehlendem
Neubuild im Resume-Modus und Share nur nach erfolgreichem Test. Keine echte Generierung
oder Sichtabnahme durch diese lokale Korrektur behaupten.

## 05.11.2026 – Erster echter Studio-Aufruf am Ausgabelimit abgebrochen

Der VPS-Screenshot zeigt zwei abgerechnete `demo_art_direction`-Antworten mit
`stop_reason=max_tokens`, zunächst bei 3000, dann durch die bisherige Provider-Wiederholung
bei 6000 Ausgabetokens. Kein vollständiger Tool-Aufruf und keine erzeugte HTML-Datei.
Das ist ein tatsächlicher Providerbefund; Mock-/Build-Tests hatten diese Laufzeitgrenze nicht
nachgewiesen. Ursache der ganzen Ausschöpfung (Denken/Text/angefangenes JSON) ist ohne
Antwortmetadaten nicht weiter belegt. Keine Behauptung, eine neue Grenze garantiere Erfolg.

Korrektur: kurze konkrete Planausgabe mit fünf bis sieben Seitenmomenten, mittlere Denktiefe,
8000 Tokens für Konzept, 16000 für Umsetzung, 6000 für Review. Zentrale `STUDIO_CALL_OPTIONS`
setzen überall `maxAttempts:1`; Studio-Tokenabbrüche erzeugen `LlmOutputLimitError` mit korrektem
Limit und allen bekannten Kosten. Keine stille Verdopplung, kein abgeschnittenes Tool-JSON.
Inhaltsvalidierung darf weiter genau einen logischen Korrekturversuch auslösen; ein Tokenabbruch
wird dagegen nicht nochmals automatisch bezahlt. Der gültige Plan wird im Einzeltest als
`plan.json` vor der Umsetzung gespeichert. Modell- und Wochenbudgetkonfiguration unverändert.

`STUDIO_PREVIEW_USE_CHECKOUT=true` aktualisiert bei pausiertem Worker nur den geprüften
Quellcode und bindet Core/src sowie Core/scripts read-only in den Einzelprozess ein. Keine
Image-Neuerstellung. Änderungen an Abhängigkeiten, Dockerfile, Worker-Entrypoint oder gebauten
Templates blockieren diesen Modus. Für den bewusst neuen Test einen neuen Ausgabeordner
verwenden, z. B. `/opt/seitenwerk-design-preview-v2`; den ersten Lauf samt Startmarker und
Kostenbelegen behalten. Kein automatisches Löschen oder Zurücksetzen des Doppelstartschutzes.

Gezielte Tests: physische Wiederholung unterbinden, vor dem Tool abgeschnittene Antworten,
unvollständiges Tool-JSON und genau eine Budgetreservierung/-abrechnung; außerdem prüft die
Orchestrierung die zentralen Aufrufoptionen. CLI-Tests prüfen Quellcode-Bind-Mounts und Abbruch
bei geänderten Abhängigkeiten. Echte Modellabnahme bleibt nach neuem VPS-Lauf offen.

## 05.11.2026 – EACCES behoben, gesamter Preview-Lauf geprüft

Die letzte VPS-Ausgabe zeigt `EACCES` beim Import von `core/src/demos/studio.ts`.
Das Skript verwendet `umask 077`; von root neu ausgecheckte Dateien können dadurch Modus
600 haben. Der als UID 1000 laufende Node-Prozess konnte sie im direkten Checkout-Mount nicht
lesen. Die bisherige Sammelmeldung „Image enthält den Einzeltest nicht“ war dafür falsch.
Dieser Abbruch erreichte die Modellgenerierung nicht. Kein Beleg für fehlenden Studio-Code.

Der Quellcode-Modus erstellt jetzt einen temporären Snapshot mit `git archive` des gepinnten
Commits, nur für `packages/core/src` und `packages/core/scripts`. Dateien 644/ausführbare 755,
Unterordner 755; oberster Hostordner bleibt 700. Nur die zwei lesbaren Quellcode-Wurzeln werden
read-only eingebunden. Keine `.git`-/`.env`-Dateien oder lokalen Änderungen kopieren, keine Links
oder Spezialdateien zulassen, keine Rechte des Checkouts oder privater Konfiguration ändern.
Ein EXIT-Trap entfernt nur diesen neu angelegten Snapshot. Abhängigkeits-/Template-Änderungen
blockieren weiterhin den Modus ohne Neubuild. Worker bleibt pausiert.

`--preflight` führt vor dem exklusiven Startmarker tatsächliche Ausgabe-Schreibprüfung,
Bildoptimierung, Schriftdekodierung und Chromium aus. Bei angefordertem Share wird zusätzlich
der Netlify-Projektzugang nur lesend geprüft. Keine Modellkosten oder Startmarker bei diesen
Voraussetzungsfehlern. Direkt vor der Generierung werden die Voraussetzungen nochmals geprüft.
Strukturierte Umsetzungsantworten und Validierungsbefunde werden als `attempt-N.json` gesichert;
keine versteckten Gedankengänge oder privaten Konfigurationswerte anfordern/speichern.

Bereits vorhandenes HTML mit fiktivem Startnachweis wird ohne Neubau, Modellaufrufe oder
Image-Build geteilt. Auch ein späterer QA-Ausfall verhindert die Ansicht nicht; die fehlende
Freigabe bleibt bestehen. Ohne HTML verhindert der Startmarker weiterhin eine weitere bezahlte
Generierung. Default-Ablage jetzt `/opt/seitenwerk-design-preview-v2`; ein früherer Lauf wird
nicht gelöscht. Bereits gespeicherte Draft-Receipts werden wiederverwendet. Vor Ausgabe des
Links wird die tatsächliche Deploy-URL abgerufen und der fiktive Betrieb geprüft; SHA-256-
Gleichheit wird separat gemeldet. Leserechtefehler sind keine „Datei fehlt“-Diagnose mehr.
Die HTML-Vorschau ist weiterhin für jeden mit dem Link erreichbar; private Berichte und Archiv
werden nicht hochgeladen. Keine Produktionsveröffentlichung oder Designfreigabe.

Zusätzlicher Laufzeitbefund: Der Einzeltest hatte Symbolfotos in die simulierte Kunden-Liveversion
mitgegeben; reguläre QA nutzt dort ausschließlich freigegebene Betriebsfotos. Die Einzelprobe
verwendet jetzt dieselbe Fotoauswahl. Entwurfsseite und Screenshots behalten gekennzeichnete
Symbolbilder. Keine Renderer-/Kontaktformular-/Preisänderung oder abgesenkte Messgrenze.

Verifiziert: 56 gezielte Core-Tests (55 gemeinsam, zusätzlicher Leserechtefall separat),
190 Template-Tests, 11 Preview- und 6 Updater-Orchestrierungstests sowie 4 Snapshot-/Rechtetests.
Die Rechtetests enthalten den echten Fehlervergleich root/600 gegen UID 1000 in einem lokalen
Container, nur in einem isolierten temporären `/dev/shm`-Pfad; keine SQL-/Datenbankaktionen.
Der Preview-Runtime-Test nutzt echte Dateien, Schrift-/Bilddateien, Chromium, Screenshots,
HTML-/Axe-/Layoutprüfungen und Lighthouse. Er besteht technisch. Modellantworten, Konfiguration,
Datenbankzugriff und externes Netlify-HTTP sind dort isolierte Fixtures: Mock-QA bleibt ausdrücklich
`unverifiable`, manuelle Freigabe false. Core-Typecheck, gezieltes ESLint, Shell-Syntax und
Diff-Prüfung bestanden. Template-CSS wurde in der isolierten Reparaturablage gebaut.

Kein echter Anthropic-Aufruf und kein Netlify-Upload während dieser lokalen Reparatur. Kein
neuer Web-Produktionsbuild nötig (Web/Template-Code unverändert). Der tatsächliche VPS-Lauf
und seine sichtbare Gestaltung bleiben offen; keinen fertigen Preview-Link erfinden.

## 05.11.2026 – Bezahlten, inhaltlich blockierten Kandidaten ohne neue KI ansehen

Neue VPS-Rückmeldung: Snapshot und beide Preflights bestanden; Konzept und zwei Umsetzungen
lieferten tatsächlich Toolantworten und wurden abgerechnet. Beide Umsetzungen hatten einen
Inhaltsregelverstoß; zuletzt `design / Preise/Rabatte / Preis`. Keine unabhängige QA erreicht,
kein HTML gerendert. Die alte Diagnose zeigte nur den Seitenanfang, nicht die betroffene Stelle;
ein Fehlalarm oder eine tatsächlich erfundene Preisaussage ist damit noch nicht belegt.

`validateDemoContent` zeigt jetzt Kontext um die tatsächliche Trefferposition. Die bestehende
Preisprüfung bleibt wirksam, einschließlich Beträgen, Rabatten und Gratisversprechen. Der
Umsetzungsprompt erklärt zusätzlich, dass der aktuelle lexikalische Prüfer auch allgemeine
Preisfragen blockiert; FAQ auf Anfrageangaben, Unterlagen, Fotos und Wunschzeitraum beschränken.
Keine Kaufpreise oder geschützten Kontakt-/Checkoutbereiche geändert.

`STUDIO_PREVIEW_RECOVER=true` nutzt ausschließlich bereits gespeicherte `attempt-2.json`,
ersatzweise `attempt-1.json`, mit gültigem fiktivem Studio-Startnachweis. Kein neuer Ordner,
kein Reset des Markers, keine Modell-/DB-/Konfigurations-/Queue-Aufrufe. Fehlende gespeicherte
Umsetzung blockiert ohne Rückfall auf Generierung. `recover-studio-preview.ts` normalisiert
den vorhandenen Inhalt und behält die HTML-/CSS-Sandbox bei. Das gerenderte HTML erhält einen
deutlich sichtbaren Hinweis „Fiktiver Prüfentwurf · Nicht freigegeben“ außerhalb des Modellbereichs.
Auch bei Inhaltsverstößen darf dieser ausdrücklich ungeprüfte, fiktive Kandidat zur Ansicht
als Draft geteilt werden; niemals als freigegebene Kundendemo. Keine Ersatzvorlage und keine
neue Modellgestaltung. Das ursprüngliche `result.json`, beide Versuche und der Startmarker
bleiben unverändert. `recovered-content.json` und `recovery.json` dokumentieren Quelle/SHA,
erneute Regelbefunde, ausgebliebene QA und null neue KI-Aufrufe. Vorhandenes HTML wird nicht
überschrieben; Wiederholung teilt die vorhandene Seite weiter.

Sieben isolierte Wiederherstellungstests prüfen vorhandenen Inhalt, exakten Diagnosekontext,
erhaltene Originaldateien, Modus 600, neueste/erste Antwort, fehlende Artefakte, fiktiven Nachweis,
Sandbox und Nichtüberschreiben. Shell-Tests decken zusätzlich Wiederherstellung/Share ohne
Generierung oder Build ab, einschließlich Fehlern und fehlenden Artefakten. Echte VPS-Dateien
sind hier nicht zugänglich; erst der Betreiberlauf liefert ihren Preview-Link und Trefferkontext.

## 05.11.2026 – Echte Netlify-Antwort statt idealisiertem Draft-Fixture

Betreiberlauf hat `index.html` aus Versuch zwei erfolgreich wiederhergestellt. Die beanstandete
Textstelle ist jetzt belegt: „keine Zusage zu Terminen, Preisen oder Rückmeldung“. Das ist keine
Preisbehauptung. Der Preisprüfer ignoriert nun ausschließlich die Preisnennung innerhalb dieser
explizit negativen Zusageformulierung. Reale Preis-/Rabatt-/Gratisbehauptungen davor oder danach
bleiben gesperrt. Keine allgemeine Negationsheuristik oder Abschaltung der Faktenprüfung.
Der historische Fehlerbericht bleibt erhalten; keine nachträgliche QA-/Gestaltungsfreigabe.

Der anschließende Upload stoppte zweimal bei der eigenen Draft-Prüfung vor Dateiübertragung.
Die authentifizierte Netlify-Leseprüfung bestätigt zwei manuelle Deploy-Previews in `uploading`,
mit richtiger Site-ID, `context: deploy-preview`, `published_at: null`, aber **ohne** `draft`-Feld.
Die alten Tests hatten dieses optionale OpenAPI-Feld immer geliefert. Jetzt basiert das
Haupt-Fixture auf ausschließlich bereinigten relevanten Feldern dieser echten Antwort, ohne
Tokens/Personen-/Kontodaten. Das dokumentierte `draft:true` im Request bleibt zwingend;
die Antwort darf auch den nachweislich unveröffentlichten Preview-Kontext bestätigen.
Explizites false, falsche Site/ID/Kontext, Veröffentlichung oder aktueller Produktionsdeploy
blockieren weiter. Netlify-Projekt und Produktionszuordnung werden nicht verändert.

`STUDIO_PREVIEW_DEPLOY_ID` setzt die konkret vorhandene unvollständige Vorschau fort. Der
Helfer prüft diese lesend, bindet sie an Site und HTML-SHA und erneuert ausschließlich ihr
`draft:true`-Dateimanifest über das dokumentierte Update-Endpoint. Nur geforderte bekannte
HTML-/Header-Dateien werden hochgeladen. Dasselbe gilt für unterbrochene Uploads mit Receipt:
GET liefert am echten noch unvollständigen Deploy `required: []`; der Manifest-Update liefert
die aktuell benötigten Hashes. Kein neuer POST/Deploy bei Wiederaufnahme, kein Retry unsicherer
Mutationen. Ready-Deploys ohne passenden bestehenden Receipt werden nicht übernommen.
Der verifizierte Permalink und die Kontrolle der Produktionszuordnung bleiben bestehen.

Neue Tests decken die tatsächliche optionale Antwortform, den alten booleschen Draft-Beleg,
fehlende/widersprüchliche Evidenz, konkrete Upload-Wiederaufnahme ohne POST, Wiederaufnahme
nach Abbruch, Weitergabe der Deploy-ID sowie den negierten Preishinweis mit daneben weiterhin
gesperrten Preis-/Gratisbehauptungen ab. Der tatsächliche Datei-Upload muss weiterhin auf dem
VPS erfolgen; kein privater Worker-Token wird hier ausgelesen oder umgangen.

## 05.11.2026 – Betreiber akzeptiert die Ansicht und beauftragt den regulären Rollout

Betreiber: Link angesehen, Gestaltung gefällt; anschließend „alles an machen und Übernahme“.
Die bestehende Pause wird damit für den Worker-Rollout aufgehoben. Keine Befreiung neuer
Kundendemos von technischen/Inhalts-/Studio-Prüfungen und keine pauschale Demo-/Brieffreigabe.
Der fiktive Test ist kein Kundendatensatz, seine Ansicht war keine unabhängige QA.

Die veröffentlichte Testansicht wurde nochmals abgerufen: Deploy `6aecf41768610ee9e39ac6e1`,
HTML-SHA256 `e9cf8167113100c9252572e056ee47993c70b4e09740f160b7639f90c7a9053f`.
Die gestalterische Betreiberbestätigung gilt dieser Version. Regulärer `generateDemoContent`
und Einzelprobe verwenden bereits denselben `authorStudioContent`; keine weitere Vorlagen-
oder Generatorumstellung nötig. Die Übernahme erfolgt durch ein aktuelles dauerhaftes Image.

Direkt gelesener Betriebsstand vor Rollout: Not-Aus false, autoApproveDemos false, reguläre KI-
und Lighthouse-QA true, 30 €/Woche KI, 8 Recherchekandidaten pro Takt. Wöchentliche Suche und
automatische Domainregistrierung bleiben false gemäß bisherigen Betreiberentscheidungen.
Keine aktiven/erstellten/Retry-Queuejobs, keine Briefe. Bestehende Demos bleiben unverändert.
Keine Schalter-/Budgetänderung erforderlich oder ausgeführt; kein erneuter Testbrief/Kauf.

Der vorhandene Updater unterstützt nun ausdrücklich `RESUME_WORKER=true`: vorhandene Compose-
Auswahl und Dry-Run-Modus privat abgleichen, Worker bauen, Studioversion und normalen Autorpfad
im neuen Image importieren/prüfen. `worker-resume-check.ts` prüft Not-Aus, manuelle Demo-Freigabe,
aktivierte KI-/Lighthouse-QA, Anthropic-Konfiguration und freien Standard-Renderadapter. Kein
Modell-/Hosting-/Brief-/Queue-Aufruf in der Vorprüfung. Bei Fehler kein Start. Ohne Flag bleibt
der vorher pausierte Container wie bisher pausiert.
Die fiktive Einzelprobe setzt beim Aufruf des Updaters ausdrücklich `RESUME_WORKER=false`,
damit auch ein geerbtes Rollout-Flag keine normale Automatik während eines Tests startet.

Nach `up -d --no-deps worker` und Docker-Healthcheck läuft der Prüfer per `compose exec` im
tatsächlichen Container mit `--record`: lokalen Health-Endpoint inklusive DB und Queue prüfen,
dann atomar `worker-runtime-release` und Audit mit Commit, Version, Zeit, Gates und Budget
schreiben. Kein Erfolgsnachweis bei negativem Health oder ungültigem Release. Zeitstempel
belegt den beobachteten Start, nicht unbegrenzt spätere Gesundheit. Scheitert nur das Speichern,
meldet der Updater keinen Erfolg; ein bereits gestarteter Worker kann trotzdem laufen.

Fünf neue isolierte Prüferfälle und zehn Updater-Orchestrierungstests bestehen: pausierter
Standard, ausdrückliches Resume, gesperrte Gates, unveränderte Compose-/Dry-Run-Auswahl und
ausbleibender Erfolgsnachweis bei Fehler. Konfiguration/DB/Health im Test sind Fixtures, keine
echten Provideraufrufe. Kein lokaler Image-Build oder VPS-Start behauptet; hier fehlt VPS-Zugang.
Tatsächlicher Build und Workerstart bleiben bis zum Betreiber-Terminalaufruf offen.
