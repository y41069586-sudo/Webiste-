# Vollständige freie Demos — 05.11.2026

Neue Generierungen liefern `design.contentVersion = full-page-1`. Die KI gestaltet weiterhin
HTML/CSS selbst, wählt Reihenfolge, Typografie, Raster und Farben frei. Mindestinhalte ersetzen
keine freie Gestaltung durch eine neue Branchenvorlage:

- Leistungen mit klar gekennzeichnetem allgemeinem Branchenwissen; nur belegte Leistungen als Betriebsangebot.
- Sichtbar gekennzeichneter Beispielablauf einer Anfrage ohne Zusagen zu Preisen, Rückrufen oder Terminen.
- Anfrage-Checkliste mit mindestens drei konkreten Angaben.
- Stadt und Umgebung als ausdrücklich unbestätigter Gebietsvorschlag, über `service_area` eingesetzt.
- Bestehender Öffnungszeiten-/Kontaktbereich; unbekannte Zeiten bleiben unbestätigt.
- Bildstrecke mit verfügbaren, freigegebenen Bildslots und automatischer Symbolbildkennzeichnung;
  bei fehlenden Bildern ein gekennzeichneter Foto-Platzhalter.
- Drei bis vier Ablauf-Fragen, auch im FAQ-Inhaltsfeld.
- Eigene Fotos, Team und Referenzen als eindeutig gekennzeichnete Entwurfsplatzhalter.

Die Bereiche erhalten semantische `data-ad-section`-Markierungen, ohne eine feste Reihenfolge.
Die Inhaltsprüfung blockiert fehlende Bereiche, zu kurze Checklisten, unmarkierte Abläufe,
fehlende Gebietstokens, unvollständige Platzhalter und abweichende FAQ-Anzahlen. Das Schema
fordert drei bis vier FAQs und ein zugeschnittenes Schriftprofil. Neue Generierungen müssen
den Standard liefern; ältere gespeicherte Inhalte ohne Versionsfeld bleiben kompatibel.

Der Gebietsvorschlag wird im Entwurf als „Stadt und Umgebung · Vorschlag zum Einsatzgebiet,
noch nicht bestätigt“ ausgegeben. Ohne Bestätigung bleibt live nur die bekannte Stadt.
Foto-/Team-/Referenz-Platzhalter werden vor Vorschau/Live entfernt; eine Bildstrecke ohne
freigegebene eigene Bilder wird dort ausgeblendet. Keine Personen, Projekte, Bewertungen oder
zusätzlichen Betriebsmerkmale werden dafür erfunden. Faktenfilter und KI-QA unterscheiden
gekennzeichnete Vorschläge von tatsächlichen Betriebsbehauptungen; keine pauschale Freigabe
für erfundene Garantien, Teamgrößen oder weitere Einzugsgebiete.

## Größe und Kontaktgestaltung

`authored/render.ts` nutzt `purgeCss` für das gemeinsame Utility-CSS und das vorhandene
Kontakt-CSS. Frei verfasstes CSS mit Medienregeln und Details-Zuständen bleibt ungekürzt.
Neue Archivo-Entwürfe wählen eines der vorhandenen zugeschnittenen Profile anhand der
benötigten Stärke/Breite, unabhängig von der Branche. Die vollständige Archivo-Datei bleibt
nur für ältere gespeicherte Entwürfe zulässig. Keine Pflichtpaarung oder Branchen-Farbwelt.

Zusätzliche, vertrauenswürdige CSS-Regeln unter `#anfrage` übernehmen Schriftfamilien,
Hintergrund-/Textfarben, Feldränder, Buttons und Fokusfarben aus dem KI-Entwurf. Der Quelltext
von Kontaktbaustein und gemeinsamem Formular-/Kaufbereich wurde nicht verändert. Keine
Änderung an Feldnamen, Aktionen, Formularlogik, Preisen, Freigaben oder Performance-Schwellen.

Beim Testen wurde außerdem eine bestehende Zuordnung korrigiert: „Elektroinstallation“ darf
nicht allein wegen des Teilworts „installat“ auf Sanitär-/Heizungstexte der Mock-Bibliothek fallen.

## Prüfungen

187 Template-/Renderer-Tests und 28 isolierte Core-Tests bestehen. Dazu Template-/Core-Typechecks,
ESLint für die geänderten Dateien, HTML- und Inhaltsvalidierung. Kein DB-Reset gegen Produktionsdaten,
kein bezahlter Modellaufruf und keine neuen produktiven Demos oder Freigaben.

Die vollständige fiktive Testseite wurde in Demo- und Live-Modus bei 390/1440 px geprüft:
keine Überläufe oder JS-Fehler, FAQ aufklappbar, kein axe-WCAG-A/AA-Befund. Berechnete Formularfarben
entsprechen dem dunklen Theme, Schriftfamilien sind Archivo/Karla. Demo-Felder bleiben deaktiviert;
live bleibt der konfigurierte Endpoint erhalten. Entwurfsplatzhalter erscheinen nicht live.
Prüfartefakte: `docs/authored-full-qa/`.

Die Live-Testausgabe liegt bei rund 102 KB HTML. Die Demo ist mit eingebetteten Symbolbildern
entsprechend größer; eine kleinere Live-Ausgabe ist keine Größen-Garantie für jede künftige Demo.
Abschließender Produktionsbuild bestanden. Lighthouse Performance/Accessibility/Best-Practices/SEO jeweils 100; 102.499 Byte HTML bzw. 66.413 Byte gzip in der lokalen Live-Testseite. Der CPU-Abgleich und die unveränderte 90-Punkte-Schwelle sind im Lighthouse-Protokoll dokumentiert.
Lokaler Test ist kein Leistungsnachweis auf dem VPS und keine Abnahme realer Modellinhalte.
Bestehende gespeicherte HTML-Demos werden nicht automatisch neu gebaut oder freigegeben.
