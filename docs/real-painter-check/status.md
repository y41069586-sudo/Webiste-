# Erster realer Recherche-/Gestaltungsprobelauf – 27.10.2026

Ausgangscommit `0ebc6e4`, Branch `codex/conversion-v4`, anfangs sauber. Vor Beginn keine laufenden
Node-/Browser-Testprozesse außerhalb von Zombies; vorhandene lokale PostgreSQL-Dienste erhalten.
User bestätigt echten recherchierten Maler-Probelauf; anschließend ausdrücklich gründliche Suche,
keine Absenkung der Mindestkriterien. Abstrakte Grafik im Einstieg ausdrücklich beanstandet.

## Erledigt

- Öffentliche reale Quellen tatsächlich recherchiert, Originalanzeigen und Profile gelesen.
  Geschlossene Betriebe, eigene Websites und nicht mehr erreichbare Anzeigen nicht als passende
  neue Leads übernommen. Ein geeigneter lokaler Prüfkandidat mit eigenem Privatkunden-/Renovierungs-
  Angebot, aktueller Leistungswerbung und eigener Geschäftsanschrift belegt. Keine eigene Website
  in dokumentierter Namen-/Orts-/Telefon-/Linksuche gefunden. Kein absoluter Abwesenheitsnachweis.
- Gründung, Vollerwerb und Auslastung unbekannt gelassen. Neuer Plattformaccount nicht als Gründung
  gewertet; keine Bewertungs-/Bilddaten aus Google-abgeleiteten Verzeichnissen als Fakten gespeichert.
- Tatsächliche Lücke reproduziert: `occurredOn` einer alten Anzeige/Übernahme/Bewertung wurde bei
  frischem `observedAt` ignoriert. Zwei neue Tests schlugen vor Änderung fehl; bekannte tatsächliche
  Ereignis-/Veröffentlichungsdaten begrenzen nun die Aktualität. Geschäftsbeginn bleibt historische
  Information für das bestehende Altersfenster. Rechercheformular erläutert die Unterscheidung.
- Fehlende nichtgenerierte Maler-Bildwelt festgestellt. Ein passendes kostenloses Pexels-Arbeitsfoto
  mit geprüfter offizieller Lizenz, Fotograf/Quelle im Manifest/EXIF und 123111 Bytes ergänzt.
  Keine Kundenfotos übernommen, keine neue Bild-API oder Kontoeinrichtung. Illustrative Kennzeichnung
  erhalten, keine CC0-Umetikettierung und kein automatischer Stockbildtransfer auf Live-Seiten.
- Beanstandete abstrakte Maler-Grafik aus bestehendem Fallback entfernt. Ohne Bild sachliches Panel.
- Beim echten Rendern halbleeres Einzelfoto-Raster auf Desktop/Mobil entdeckt; Einzelbild spannt nun
  die gesamte Breite auf. Kein Stretching der Laptop-/Handy-Screenshots.
- Ein reales Demo-/Brief-Kontrollpaar mit bestehender Vorlage und tatsächlich belegten Leistungen
  erstellt. Brief auf konkrete Kombination von Wand-/Bodenarbeiten abgestimmt, preisfrei.
  V4-Demo-Angebot unverändert. Redaktionelle Texte als Offline-Fixture, **kein realer LLM-Aufruf**.
- Bestehender Renderer erzeugte vier vollständige Screenshots (360/390/430/1440), Gerätebild,
  Angebotsansichten, einseitiges Brief-PDF, 300-dpi-Druckansicht und Galerie/ZIP. Tatsächlich angesehen.
  Vorher-Fassung aufbewahrt. Private Empfängerdaten/Quellenkopien nur im ignorierten `data/`.

## Nachweise und Grenzen

Private zugängliche Ergebnisse:
`data/exports/real-painter-check/proof/index.html`, `README.md`, `checks.json`, `accessibility.json`,
`brief.pdf`, `druckansicht.png`, `demo-{360,390,430,1440}.jpg`, `laptop-smartphone.jpg`, `vorher/`.
ZIP: `data/exports/real-painter-check/seitenwerk-erster-realer-probelauf.zip`.
Reproduktion: alle sieben Provider ausdrücklich `mock`, `DRY_RUN=true`, Chromium-Pfad setzen und
`tsx scripts/review-researched-lead.mts data/exports/real-painter-check/input.json data/exports/real-painter-check/proof`.
Kein DB-/Queue-/Sendeaufruf in diesem lokalen Prüflauf. Loopback-Server nur während der Prüfung.

QR aus finalem PDF dekodiert und gegen richtige gespeicherte Demo getestet, eine A4-Seite,
keine Überläufe/Bildfehler bei vier Breiten, kein halbleeres Bildraster. Axe390/1440: keine automatisch
erkannten Verstöße/Laufzeitfehler, zusätzliche manuelle Kontrastprüfung bleibt offen. Keine pauschale
9,5/10-Abnahme. Eigenes Firmenbranding und eigene Bilder sind nicht bestätigt; Gestaltungsvorschlag.

Absender bewusst fiktiv und als Testabsender markiert. Lokales QR-Ziel ist kein öffentlicher Link.
Keine Nachricht, kein Brief, kein Kauf, keine produktive Datenaufnahme oder Freigabe. Rechtliche
Quellen-/Versandabnahme und erneuter produktiver Sperrlisten-/Dubletten-/Adresscheck bleiben offen.
In der aktuellen Laufzeit fehlen Anthropic- und Stripe-Sandbox-/Webhook-Schlüssel. Automatisierte
echte LLM-Qualität und komplette externe Kaufstrecke bleiben daher unabgenommen.

VERIFIED: 42 relevante Coretests/4 Suiten, 109 Template-Tests/3 Suiten, TypeScript, Lint und kompletter
Web-/Workerbuild bestanden. Die sieben bekannten dynamischen Dateitracing-Warnungen bleiben.
Konsolidiert unter `verification.json`, zugehörige lokale Logs daneben. Kein Push/Deploy.

Nächster konkreter Schritt: Gestaltungsprobe ansehen; weitere passende reale Betriebe nach derselben
Nachweisqualität auswählen. Für echte automatisch generierte Texte zuerst vorhandenen Anthropic-Provider
in einer genehmigten Testlaufzeit sicher anbinden; aktueller Fall darf nicht als echte KI-Abnahme gelten.
Sicheren Implementierungscommit mit `git log -1` feststellen; lokale Änderungen dieses Pakets vollständig
committieren, private Daten/Exports bleiben ignoriert. Keine produktiven Änderungen.
