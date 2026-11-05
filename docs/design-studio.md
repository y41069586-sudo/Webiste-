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

- Ein zusätzlicher logischer Creative-Aufruf (`demo_art_direction`, 3000 Ausgabetokens) pro Bau.
  Umsetzung weiterhin 10000; Studio-QA bis 4500 statt 3000, höhere Denktiefe. Bestehende Modelle
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
