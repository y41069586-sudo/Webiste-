# Einrichtung vor Zahlung

Betreiberauftrag 31.10.2026: Website übernehmen → vollständige Einrichtung → Zusammenfassung und Tarif → Zahlung.
Keine Preisanzeige im Hauptbutton; kostenpflichtiger Folgeschritt und verlinkte Preise bereits beim Einstieg erkennbar.

## Umsetzung

- Neutraler Demo-Button öffnet die private Einrichtung. Auch bestehende gespeicherte Demos erhalten den neuen Toolbar-Einstieg bei der Auslieferung. Preiskarten bleiben zugänglich.
- Bestehendes Formular wiederverwendet: Betriebsdaten, Texte/Leistungen, Öffnungszeiten, Impressum/Datenschutz, Wunschdomain und tatsächlicher Empfänger der Kontakt-/Terminanfragen. Logo und bis zu sechs eigene Fotos optional.
- Rechnung und Bestellbestätigung verwenden die ausdrücklich erläuterten Impressums-/Kontaktdaten. Keine erfundenen Steuer- oder Registerangaben.
- Bilder einzeln bis 4 MiB pro Request, damit das Serverless-Payloadlimit nicht durch Sammeluploads überschritten wird. Uploads erhalten ungespeicherte Textfelder. Bildbeschreibungen werden mit dem Hauptformular gespeichert.
- Zwischenspeicherung serverseitig; zufälliges HttpOnly-/SameSite-Cookie, unter HTTPS Secure. Kein Token in URL, kein lokaler PII-Speicher und kein Tracking-Cookie. Zugang höchstens sieben Tage im selben Browser.
- Bestehende private Settings-Tabelle, keine neue Migration oder öffentlich zugängliche Tabelle. Bilder nur mit passendem Entwurfs-Cookie abrufbar; Herkunftsprüfung beim Upload, Größen-/Formatlimits und Rate-Limits.
- Zusammenfassung zeigt gespeicherte Daten und Bilder, vollständige Texte zum Aufklappen, identische serverseitige Preise und Laufzeiten. Keine Tarif- oder Zustimmungs-Vorauswahl. Bearbeiten und Abbrechen erhalten den Entwurf.
- Nur die ausdrückliche letzte POST-Aktion erzeugt den normalen Checkout. GET/Eingabe/Upload lösen weder Zahlung noch Veröffentlichung, Domainkauf oder Nachrichten aus.
- Bestätigte Daten und Bildschlüssel werden vor der Provider-Anfrage atomar mit der Bestellung gespeichert. Fingerprint bindet die angezeigte Zusammenfassung an diesen Stand. Doppelklicks derselben Einrichtung sind serialisiert; geänderte Inhalte überschreiben keine bereits angelegte Bestellung.
- Erst nach bestätigter Zahlung werden genau diese Angaben in die Kundenseite übernommen. Bestehende Kunden behalten ihr bezahltes Onboarding. Die Vorschau wird über den bestehenden Worker aufgebaut; Veröffentlichung und Monatsstart brauchen weiterhin die vorhandenen Freigaben.
- Bestätigungsmail und Erfolgsseite unterscheiden vorbereitete Einrichtungen von alten Bestellungen, die ihre Angaben noch ergänzen müssen.
- Bestehender Retention-Job entfernt abgelaufene Entwürfe und unreferenzierte Uploads. Bildreferenzen laufender Bestellungen und übernommener Kundenseiten bleiben erhalten. Der Datenschutztext erläutert die neue Verarbeitung.

## Prüfungen und Betrieb

Lokale Tests ausschließlich mit isolierten localhost-Testdatenbanken und Mock-Providern; keine kostenpflichtigen API-/Stripe-/Brief-/Domainaktionen.
41 gezielte Core-Tests und 97 Template-Tests bestanden. Vier Produktionsbuild-Browsertests bestanden: mobile Einrichtung mit Logo und Speichern/Neuladen, bezahlte Übernahme, Care+-Abbruch/Rückkehr ohne Vorauswahl, ausstehende und fehlgeschlagene Zahlungen. Die zusätzlich verschärften acht Einrichtungstests prüfen auch, dass wiederholte Übergabeaufrufe nur einen ausstehenden Website-Bauauftrag erzeugen. Lint und Produktionsbuild bestanden. Veröffentlichung wird nach tatsächlichem Abschluss ergänzt.

DRY_RUN, Stripe-Modus, Echtbriefsperren, Steuerbestätigung und Workerstart werden durch diesen Auftrag nicht umgestellt.
Der pausierte VPS-Worker benötigt den neuen Code im Image, damit er die vorbereiteten Einrichtungen automatisch baut und die neue Entwurfsbereinigung ausführt.
Nach dem Git-Push kann der Betreiber das Image ohne Workerstart aktualisieren:

```sh
cd /opt/seitenwerk
git pull --ff-only
docker compose -f docker-compose.worker.yml build worker
```

Dieser Befehl startet weder den Automatisierungsworker noch einen echten Versand. Kein NEU=1 und kein erneuter Einrichtungs-/Secret-Dialog nötig.
