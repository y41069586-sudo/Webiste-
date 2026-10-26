# Aufgabe 2 – Brief → QR → Kunden-Demo

26.10.2026, Ausgangscommit adb1019, Branch codex/conversion-v4, Arbeitsbaum zu Beginn sauber.
Nur lokale Entwicklung. DRY_RUN=true; alle Provider mock/lokaler Speicher. Kein Push/Deployment,
keine echten Briefe, Zahlungen oder Produktionsdaten. Gerätegeometrie aus Aufgabe1 erhalten.

Priorisierte Arbeitspakete:
1. Bestand und tatsächliche Vorher-PDFs für20 fiktive Paare sichern.
2. V4-Briefdarstellung: Gerätebild statt Desktop-Ersatz, ruhige getrennte Preise, lesbare Pflichttexte.
3. Belegte Personalisierung mit bestehendem Composer/Varianten verbinden; unbestätigte Angaben neutral.
4. Wiederholte Sperrlisten-/Quellen-/Adressprüfung und konsistente atomare Brief-Demo-Verknüpfung.
5.20 Nachher-Paare mit tatsächlichem PDF-/Raster-/QR-/Smartphone-Test, eigene Sichtprüfung, Nachbesserung.
6. Relevante Regressionen, Typen/Lint/Build, Bericht/ZIP, lokaler Commit. Keine automatische Freigabe.

P0-Befunde: Neu-Erzeugung löscht alten Brief vor Abschluss; Quellen/Sperrliste werden vor Freigabe
nicht erneut geprüft; keine unveränderliche PDF-/Demo-/Screenshot-Zuordnung am Brief. V4-Premiumansicht
verdrängt Gerätebild; Angebot als dichter Text, Pflichtinformationen7pt. Personalisierungshelfer nur Review.
Alte aktive/gespeicherte Varianten nicht still überschreiben oder aktivieren; Wahrheitsgate bleibt bestehen.

## Abschluss

20/20 fiktive Erstbrief-Paare bestanden: tatsächliche PDFs, Druckraster,41mm-QR, gleiche QR-/Kurz-URL-Ziele,
Datum, Preise, Art.14/21 und390px ohne Überlauf. Übersichts-Sichtprüfung aller20 plus ausgewählte Vollseiten.
114 Core-Regressionen +8 abschließende Sicherheitsfälle (115 unterschiedliche Tests),102 Template-Tests,
TypeScript/Lint/Build bestanden. Sieben bekannte Tracingwarnungen, keine externe Anbieterabnahme.
Vergrößerter Pflichtfuß erzeugte zuerst Überlappungen; nach Copy-/Abstandskorrektur20/20 ohne Befund.
Alte PDF-Dateien bei falscher Neu-Erzeugung bleiben erhalten. Normales Gerätebild, klare Preise, geprüfte Fakten.
Alle20 Nachher-PDFs und ausgewählte Originale/Druckbilder unter evidence/, volle Galerie/ZIP unter data/exports/task2-letters/.

Kein Push, Deployment, Providerauftrag oder echter Versand. DRY_RUN=true. Recht/Steuern, reale Fakten,
Variantenaktivierung, Papier-/Fenster-/Smartphonescan und öffentliche Infrastruktur weiterhin freigabepflichtig.
Keine echten Kauf-/Scanwirkungen bekannt. Keine Aufgabe3 vorwegnehmen. Nächster Schritt: Ergebnisse zeigen,
gestalterisches Betreiberfeedback und nächsten Einzelprompt abwarten.

Letzter sicherer Aufgabe2-Implementierungscommit: `c621f9ef401588bdadcbfbd150babc0db11284a9` auf `codex/conversion-v4`.
