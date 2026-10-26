# Handoff – Betriebscharakter und Demoqualität

Stand: 26.10.2026. Repository `/workspace/seitenwerk-v4`, Branch `codex/conversion-v4`.
Letzter geprüfter Implementierungscommit: `941f7fe0ba9de01cb8d58a429d2db0f91bead675`.
Ausgangscommit: `0c788f5`; Arbeitsbaum war beim Einstieg sauber. Der neueste Betreiberauftrag erweitert
Aufgabe 3 ausdrücklich um Demoqualität und Automatisierung. Keine parallele Anwendung oder neue
Produktivdatenbank. Alle bisherigen V4/V5-/Task-1/2/3-Arbeiten und Exporte erhalten.

## Fertig implementiert

- Stilprofile mit sechs Charakterrichtungen, drei Schriftkombinationen und vier Kompositionsprioritäten;
  vorhandene 20 Template-IDs und Plakat erhalten. Sichere Hexfarben, Kontrastkorrektur, lokale Fonts/OFL.
- Neue Gastro-Kompositionen, ruhigere Handwerk-Leistungen, illustrative Maler-Farbstudie,
  sachlichere Fallback-Einstiege und stilbezogener Sprachton ohne neue Betriebsbehauptungen.
- KI-Motive aus normaler Auswahl entfernt. Passende CC0-Beispiele mit lesbarer Bildwelt-Einordnung;
  kein Umbenennen von KI-Motiven. Neues primärquellengeprüftes Barberfoto, kein Wasserzeichen entfernt.
- Quellengebundene private Referenzen in bestehender Leadverwaltung/Settings/Storage; getrennte
  Speicherung-/KI-Analyse- und Darstellungsrechte. Bilder mit offenen Namens-/Lizenzpflichten nicht
  über die Darstellungsbestätigung freigeben. Upload: Auth, Origin, Format-/Größenlimit, private Ansicht.
- Vorhandener Anthropic-Provider kann bis zu drei worker-seitig re-encodierte Bildblöcke auswerten.
  Erlaubte Stilantworten, Budgetbuchung, Cache je Quelle/Modell/Version, gemeinsame laufende Analyse.
  Keine Quellen-URL wird abgerufen, keine Anweisung aus einem Bild kann Aktionen auslösen.
- OSM `brand:colour` als frischer Quellenhinweis; ohne Belege ausdrücklich Branchenvorschlag.
- Gestaltung im Demo-Snapshot, nach Kauf und Textrevision erhalten. Keine stille Änderung alter Demos
  oder Briefe. Neue Gestaltungskontexte benötigen individuelle visuelle Freigabe, auch im QA-Autopfad.
- Opt-out/Retention bereinigen Referenzen/Cache. Späte Stil- oder Textantwort kann weder Cache noch
  Demo-HTML nach Sperrung wiederherstellen. DB-Zeilensperren erst nach LLM-Arbeit, gleiche Tx-Verbindung.
- Fünf bestehende öffentliche Muster lokal neu erzeugt, ohne KI-Fotomotive. Kein Marketing-Neuaufbau,
  kein separater statischer Firmenwebsite-Export und keine Veröffentlichung.

## Nachgewiesen

- 101 Core-Tests in 13 betroffenen Suites bestanden, einschließlich Rechte/Cache/Quelle/Retention,
  verzögertem Opt-out, tatsächlichem Demo-Generator, Briefzuordnung, V4-Kauf und Onboarding.
- 108 Template-Tests, TypeScript und ESLint bestanden.
- Vollständiger Paket-/Next-/Workerbuild bestanden; sieben bekannte dynamische Tracingwarnungen.
- 14 unterschiedliche Browserfälle bestanden: zehn Branchen-Kaufstrecken, zwei Zahlungszustände,
  Onboarding und geschützter Bild-Upload. Drei davon zusätzlich im lokalen Produktionsbuild bestanden.
- 20 Vorlagen bei 1440/360/390/430 px plus lange Namen/fehlende Bilder: 120 Zustände, 540 Browserchecks,
  keine gemeldeten Fehler. Alle Hero-/Mobilansichten in Branchenübersichten tatsächlich gesichtet;
  komplette Seiten und Stressansichten gerendert/technisch geprüft, keine menschliche Gesamtfreigabe.
- Mobile Lighthouse-Stichproben: Handwerk 100, Beauty 96, Gastro 95 Performance; A11y/Best Practices 100.
  Einzelmessungen teils zwei Punkte unter vorherigem Wert. Keine Feldmessung oder Conversionbehauptung.

Reproduktionsbefehle in `README.md`, exakte Matrix/Abgrenzung in `pruefbericht.md` und `verification.json`.
Exporte: `data/exports/vibe-upgrade/`, Galerie `galerie.html`, kompakte Übersichten unter `evidence/`.
Der Implementierungscommit `941f7fe0ba9de01cb8d58a429d2db0f91bead675` enthält den geprüften Quellstand.
Der folgende Dokumentationscommit hält diesen Hash fest; kein Push.

## Aufgetreten und korrigiert

Fotoloser Gastro-Hero überlappte mobil; Höhenbegrenzung behoben. Frühere Prüfeingaben enthielten alte
Textkopien; finale Nachweise mit aktueller Fallbackbibliothek neu erzeugt. Barber-Foto nicht mehr auf
unbestimmte Friseure ausdehnen. Galerie-Leerfläche unter Desktopbildern korrigiert. Performancebericht
trennt Dev-Server und Produktionsbuild. Upload-Test erwartete zuerst 401 statt vorhandenem 307-Redirect,
anschließend korrigiert und zweimal bestanden. Ein Renderlauf beim Umgebungswechsel nach fünf Fällen
unterbrochen, aus gespeichertem Stand fortgesetzt; alle 20 finalen Fälle vorhanden.

## Offen / nächster Schritt

1. Betreiber bewertet die Galerie. Fotoabhängige Beauty-/technische Handwerks-Fallbacks ohne echte
   Referenzen sind weiterhin schwächer, keine pauschale Premiumabnahme oder Versandbereitschaft.
2. Erlaubte Referenzen für tatsächliche Betriebe erfassen: Admin → Lead → „Charakter des Betriebs“.
   Quelle/Berechtigung dokumentieren, Analyse/Darstellung getrennt bestätigen, Demo bewusst regenerieren.
3. Vorhandenen Anthropic-Zugang sicher an Worker binden und nach Kosten-/Datenschutzfreigabe mit einem
   echten erlaubten Fall abnehmen. Bislang Mock-Stilantworten und SDK-Request-Test, keine echte Vision-Abnahme.
4. Veröffentlichungs-/Pushfreigabe getrennt. Bestehende Rechts-/Steuer-/Provider-/Infrastrukturblocker aus
   der zentralen V5-Checkliste bleiben; dieser Auftrag schaltet nichts frei.

DRY_RUN=true. Alle Testanbieter explizit Mock, ausschließlich benannte lokale Wegwerf-/E2E-Datenbanken.
Keine echten Briefe, Zahlungen, Erstattungen, Domainkäufe, Produktionsmigrationen, DNS- oder Deploy-Aktionen.
Kein Google-Maps-Fotocrawler und keine behauptete echte Quellenanalyse. Keine Secrets in den Nachweisen.
