# Fortsetzung von Claude und Reparatur des Netlify-Builds

Ausgangspunkt: veröffentlichter Commit 9cff2c0. Separater Checkout unter /tmp, alle vorhandenen
Arbeitsverzeichnisse und ihre offenen Änderungen erhalten. Aktuelle Betreiberentscheidungen
und neue Generator-/Kostenregeln übernommen; keine Rückkehr zu älteren Codex-Ständen.

## Ursache und Reparatur

Der neue Selbsttest in demos/build.ts importierte browserChecks aus render/qa.ts. Dadurch wurde
auch dessen dynamischer Lighthouse-Import vom Next.js-Bundler verfolgt. Der unveränderte Stand
scheitert lokal im vollständigen Next-16.4.2-Turbopack-Produktionsbuild mit zehn Modul-/Exportfehlern,
unter anderem ParsedURL in @paulirish/trace_engine. Die Netlify-Deploys dieses Standes sind ebenfalls
fehlgeschlagen; die letzte erfolgreiche Produktion blieb aktiv.

Nur die gemeinsame Browserprüfung in ein eigenes render/browser-checks.ts verschoben und den
Import im Demo-Bau dorthin geändert. render/qa.ts exportiert browserChecks und BrowserQaOptions
weiter, damit alle bestehenden QA-Aufrufer dieselbe Implementierung erhalten. Der komplette
Browser-Prüfblock wurde mit dem Git-Ausgangsstand verglichen und ist unverändert. HTML-Validierung
und Lighthouse-Implementierung bleiben in qa.ts unverändert. Keine Build-Prüfung abgeschaltet,
keine Lighthouse-Version oder Paketauflösung verändert und keine Abhängigkeiten aktualisiert.

## Erhaltene Regeln und Bestandsdaten

- Selbsttest und einmalige Nachbesserung bleiben im Worker aktiv; ein regelkonformer erster
  Entwurf bleibt bei gescheiterter Nachbesserung erhalten.
- Nicht wiederholbare Inhaltsfehler und die Kostenbremse für wiederholt gescheiterte Betriebe
  bleiben erhalten.
- Genau ein begründeter Gestaltungs-Hinweis führt zur manuellen Prüfung. Zwei Hinweise oder
  unverifiable sowie technische/harte Inhaltsfehler blockieren weiter.
- full-page-2, Handy-Layout, bestehende Kauf-/Formular-/Zahlungs-/Versandgrenzen unverändert.
- Produktionszugriff ausschließlich lesend: keine offenen build-/qa-demo-Jobs beim Abgleich.
  Cyc Beauté bleibt pending_review. Hagemann und Kampert bleiben mit ihren vorhandenen Befunden
  erhalten. Keine Produktionseinstellungen oder Demo-Datensätze verändert, kein bezahlter Neubau.

## Verifikation

Der vollständige lokale Next-Produktionsbuild ist nach der Reparatur erfolgreich. Für eventuelle
Build-Datenbankabfragen eine eigene lokale Fixture-Datenbank verwendet. Die Core-Suite läuft
separat auf einer anderen isolierten lokalen Testdatenbank; keine parallel geteilte Testdatenbank.
Das vorhandene Docker-/System-Dateisystem ist voll. Deshalb bestehende Dateien/Docker-Daten
nicht gelöscht, Abhängigkeiten aus dem vorhandenen Stand nach /tmp kopiert und PostgreSQL17.11
als lokale Test-Binaries dort entpackt. Keine Produktionsdaten als Testziel.

Abgeschlossene Prüfungen am 07.11.2026:

- Vollständige Core-Suite ohne Dateifilter, ein einziger Lauf auf wbm_test_handoff_core:
  **115 Dateien bestanden, 1035 Tests bestanden, null Fehler; drei optionale osmium-Tests
  mangels lokalem Binary übersprungen**. Dauer 1907,07 Sekunden. Keine Tests/Fixtures/Grenzwerte
  für diese Reparatur geändert. Die sechs im Claude-Bericht erwähnten Ausfälle sind in diesem
  isolierten Lauf nicht reproduziert worden; dessen externe Umgebung wurde nicht als repariert
  ausgegeben.
- Vollständiger Next-16.4.2-Turbopack-Produktionsbuild einschließlich TypeScript, Page-Data-
  Sammlung und Prerendering erfolgreich. Die sieben Hinweise zum bisherigen dynamischen
  Dateisystem-Tracing in Claims/Playbooks/Assets sind nicht fatal und wurden nicht durch
  pauschales Ignorieren von Dateien verdeckt.
- Core-, Worker- und Web-Typechecks sowie ESLint der drei geänderten TS-Dateien bestanden.
- Tatsächlichen erzeugten Standalone-Server mit separater Fixture-Datenbank, Mock-Providern
  und eigenem zufälligem lokalem Session-Secret gestartet: / und /login liefern HTTP200,
  /admin und /admin/demos ohne Anmeldung HTTP307 nach /login. Session-Schutz nicht gelockert.
- Git-diff-Prüfung und Vergleich des unverändert verschobenen Browser-Prüfblocks bestanden.

Testumgebung: Node24.19.0, vorhandene unverändert kopierte Lockfile-Abhängigkeiten, offizielles
PostgreSQL17.11 lokal auf Port55432 und echtes /usr/bin/chromium. Keine bezahlten Modellaufrufe
oder echten E-Mails/Briefe/Zahlungen/Domainkäufe durch diese Tests. Der Web-Build nutzte eine
andere Testdatenbank als der komplette Core-Lauf; keine parallel geteilte Testdatenbank.

Ein Git-Push oder erfolgreicher Web-Build bestätigt kein aktualisiertes Worker-Image auf dem VPS.
Der vorhandene Update-Aufruf mit gepinntem Release erhält den tatsächlichen laufenden/pausierten
Container-Zustand, Compose-Dateien, private ENV und DRY_RUN. Keine Wiederaufnahme oder Aufhebung
eines Betreiber-Not-Aus erzwingen. Die frühere Codex-Reparaturpause ist bereits aufgehoben;
RESTORE_REPAIR_PAUSE ist für diese Übergabe nicht erforderlich.
