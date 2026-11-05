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
