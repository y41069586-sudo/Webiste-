# Aufgabe 1 – ausschließlich Kunden-Demos

Ausgangscommit fc2ab35, Branch codex/conversion-v4, 26.10.2026. Vorhandene Änderungen erhalten.
Kein Push/Deployment, keine Produktionsdatenbank/Provideraktionen. DRY_RUN=true.
Die akzeptierte Laptop-/Handy-Komposition und Brief-/Zahlungslogik werden in dieser Aufgabe nicht geändert.
Der neue Einzelauftrag autorisiert lokale Verbesserungen aller bestehenden Demo-Familien; keine pauschale
Übernahme eines Maler-Stils auf sämtliche Branchen. IDs/Plakat/Architektur bleiben erhalten.

Arbeitspakete:
1. Audit aller20 Familien/Generatoren/Bilder und tatsächliche Vorher-Aufnahmen – vorhanden unter data/exports/task1-design/before.
2. Struktur, Typografie und Bildkomposition in bestehenden Vorlagen verbessern – implementiert und lokal geprüft.
3. Unpassende Branchen-Fallbacks und deterministische Auswahl korrigieren – implementiert und getestet.
4. QA-Lücken gezielt schließen, 20 fiktive realistische Fälle bei1440/360/390/430 rendern – 560/560 Prüfungen bestanden.
5. Kritischer Übersichtsvergleich, zusätzliche Vollansichten, Nachbesserung, Tests, Galerie/Qualitätsmatrix – abgeschlossen im dokumentierten Prüfumfang; keine Betreiberabnahme.

Gefunden: ähnliche Handwerk-/Beauty-Split-Heroes; Fallback-Adresskarten als einziges Bildmotiv;
Elektriker/Kosmetik/Nagel/Barber/Musik-Bildlücken; Branchenalias kann falschen Fallback erhalten;
beliebige Bildrotation ohne Motivrolle; synthetische Bildabmessungen1000×750; große Iconflächen
bei fehlenden Fotos; ähnliche KI-/Fallback-Headlines; neun zusätzliche Formular-/Beispielabschnitte
können das Kundenerlebnis unnötig verlängern. Keine technischen Testergebnisse als Designfreigabe werten.

## Abschließender Wiederaufnahmepunkt

102 Template-Tests und 151 relevante Core-Tests bestanden. TypeScript, Lint und regulärer Projektbuild
bestanden; sieben vorhandene dynamische Dateisystem-Tracingwarnungen bleiben. 20 Profile mit 120 echten
Nachher-Aufnahmen; 40 Originalaufnahmen vor den Änderungen erhalten. Fünf mobile Performance-Messungen
97–100; keine Feld-/Providerabnahme. [Bericht](README.md), [Matrix](qualitaetsmatrix.md),
[dauerhafte Nachweise](evidence/), vollständige Galerie/ZIP unter `data/exports/task1-design/`.

Behobener tatsächlicher Regressionsfehler: Lazy-Bilder blockierten Screenshots. Aufnahmehilfe korrigiert;
eigener zeitbegrenzter Test und bestehender Zehn-Demo-Lauf danach bestanden. Gerätegeometrie unverändert.
Keine Tests laufen für dieses Paket weiter; die Build-/Testläufe sind abgeschlossen.

Noch offen: gestalterisches Betreiberfeedback; freigegebene Fotos/ausführlichere Fakten für manche Branchen;
physische Mobile-/Safari- und Kundentests. Technische QA ist keine Versandfreigabe. Öffentliche Firmenwebsite,
Brief-/Zahlungsüberarbeitung und weitere vier Aufgaben wurden nicht vorweggenommen. DRY_RUN=true.
Kein Push/Deployment/Produktionszugriff. Nächster Schritt: Ergebnisse von Aufgabe1 zeigen und den nächsten
Einzelprompt des Betreibers abwarten. Alte breitere Handoffs sind kein Auftrag zum Start weiterer Phasen.

Letzter sicherer Implementierungscommit: `beb1f9834be3f4da80c0270d576601c003bdef45` auf `codex/conversion-v4`.
Ein anschließender reiner Dokumentationscommit hält diesen Wiederaufnahmepunkt fest.
