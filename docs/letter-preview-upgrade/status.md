# Persönliche Einladungsbriefe – Testmodus

Auftrag 26.10.2026. Start f09a840, Branch codex/conversion-v4, Arbeitsbaum sauber.
Neue ausdrückliche Entscheidung: Preise/Tarife aus neuen Verkaufsbriefen entfernen. Demo/Checkout
behalten vollständige V4-Preise/Vertragsangaben. Die ältere Pflicht zu Briefpreisen ist damit ersetzt.
Bestehende Brief-/Slot-/Claim-/QR-/Sperrlisten- und QA-Architektur erhalten. Gerätegeometrie nicht ändern.
DRY_RUN=true, alle lokalen Provider Mock. Kein echter Versand, Anbieterauftrag, Push oder Deployment.

Befunde: Geprüfte Details landen bislang nur in einem Standardabsatz; Betreff und Nutzen bleiben
überwiegend gleich. V4-Renderer erzwingt separaten Preisblock. Quellenänderung im Faktenreview ist
noch nicht in der unveränderlichen Briefzuordnung erfasst. Quelle der neuen Personalisierung bleibt
manueller überprüfter Demo-Faktenreview, keine erfundenen Leistungen aus Demo-Beispieltexten.

Aktueller Fortschritt: implementiert und lokal geprüft. Neuer expliziter Betreiberhinweis verlangt
zusammenhängende KI-Texte, nicht weitere feste Branchenabsätze. Deshalb vorhandenen budgetierten
LLM-Service für Schreiben + separaten Fakten-/Demo-/Sprachabgleich erweitert; einmal reparieren,
sonst markierte Ersatzfassung. Keine bezahlte KI-Anfrage in dieser Sitzung. Beispiele sind
redaktionelle Offline-Modellantworten (engine=fixture), externe Modellqualität noch offen.

Abgeschlossen: preisfreie V4-Einladung, Fakten-/Kopierrichtlinie an bestehende PDF-Zuordnung gebunden,
Slot-Claims und Sperren erhalten, mittellange Anschrift korrigiert, 20 vollständige einseitige PDFs
mit echtem Gerätelayout und 300dpi-/Graustufen-QR geprüft. Ein Text-/Fußüberlauf durch kürzeren
Werbetext korrigiert; keine Pflichtschrift-/Bild-/QR-Verkleinerung. Kontaktbögen20/20 visuell geprüft,
Elektro/PV/Salon/Gastro/Musik zusätzlich einzeln gelesen. Bei langem Reinigungsbetriebsnamen
bricht das bestehende Demo-Hero ungünstig um; keine automatische gestalterische Freigabe.

Nachweise: README.md, pruefmatrix.md, evidence/checks.json, evidence/similarity.json sowie PDFs
und Vergleiche. Vollständige lokale Galerie: data/exports/letter-preview-upgrade/galerie.html.
90 Core-Tests in11 Suiten,108 Template-Tests, TypeScript/Lint bestanden; abschließenden Build und
genauen lokalen Commit im evidence/verification.json bzw. git log nachsehen. Keine laufenden
Fachimplementierungen offen; nächster Schritt ist gestalterische Betreiberkontrolle der Briefe
und später separat freigegebene echte KI-Text-/Providerabnahme mit berechtigten Fakten.

DRY_RUN=true; kein Push, Deployment, echte Recherche/Kontaktaufnahme/Sendung. QR-Testserver nach
dem Lauf geschlossen; Testcodes nicht öffentlich erreichbar. Keine gemessene Scan-/Kaufwirkung.
