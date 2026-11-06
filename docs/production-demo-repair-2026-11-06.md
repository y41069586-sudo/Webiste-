# Produktionsstau bei Demo-Erstellung – 06.11.2026

## Befund und begrenzter Eingriff

Die vorhandenen pg-boss-Queues verwenden policy=standard. Ein singletonKey allein besitzt dort
keinen Index, der wartende Duplikate verhindert. Gelesen: 313 wartende/retry Builds für 23 Leads,
vier QA-Aufträge, keine aktiven Jobs oder Flow-Abhängigkeiten. Zur Reparatur den vorher falschen
Not-Aus mit eigenem Actor/Audit vorübergehend aktiviert. Unter dieser Pause 290 überzählige
wartende Jobs storniert, nicht gelöscht; je Lead einen Auftrag erhalten. Kontrollabfrage bestätigt
21 created + zwei retry Builds für 23 verschiedene Leads, drei created + eine retry QA.
Keine Demo/Brieffreigabe, neue Generierung, Modellkosten oder Veröffentlichung durch den Eingriff.

## Implementierung

- Zentrale Admission für build-demo/qa-demo: kanonischer singletonKey, PG-Transaktions-Advisory-Lock
  je Entity, Prüfung sämtlicher created/retry/active Jobs einschließlich alter unkeyed Payloads,
  boss.send über denselben Transaktionsclient. Andere Queues unverändert. Pipeline zählt nur
  tatsächlich eingereihte Jobs. Zusätzliche Lead-Zeilensperre verhindert doppelte Demo-Persistierung.
  Ein erneuter Build-Aufruf für eine vorhandene building-Demo stellt deren deduplizierte QA sicher.
- Ein Builder und ein globaler CPU-Renderplatz, maximal180 Sekunden Wartezeit (über der maximal165 Sekunden langen regulären Lighthouse-Phase, innerhalb der Job-Deadline). Context/Page einschließlich
  evaluate/image.decode und Cleanup begrenzen; Lighthouse einschließlich Launch/Teardown zusätzlich
  begrenzt. Abbruch schließt den tatsächlichen Context/Browser. Keine Bewertungsschwelle abgesenkt.
- Prüftafeln aus CSS-Auflösung statt vierfacher DPR2-Pixelmenge; Übersicht sowie Anfang/Mitte/Ende
  bleiben erhalten. Separate Brief-/Startansichten bleiben DPR2. Studio-QA: 2800 Tokens, effort=low,
  ein Versuch und 90 Sekunden gemeinsam für Tokenzähler und Modellantwort. Alle sechs begründeten
  Dimensionen erforderlich; ungültige/abgeschnittene Antwort blockiert weiter.
- Worker-interne Deadlines: Build 900s vor pg-boss 1200s, QA 600s vor pg-boss 900s. Signal bis in SDK
  und Persistierungsgrenzen weiterreichen. QA-Laufzeitfehler ergeben qa_failed/reviewRequired statt
  dauerhaft building. Phasenlaufzeiten im Log helfen bei tatsächlicher VPS-Nachkontrolle.
- Abgeschlossenes visuelles Urteil als JSON-Checkpoint vor späteren technischen Phasen sichern;
  Wiederverwendung nur bei identischem HTML-, Empfängerfakten- und Recherchehash. Auch negatives
  Urteil bleibt negativ. Keine Modellkosten für denselben unveränderten Befund nach Artefaktfehler.
  Kein SQL-Schemawechsel; neues optionales Feld im bestehenden QA-JSON.
- Fachlich mobile Gewerke erhalten einen ausdrücklich unbestätigten Gebietsvorschlag; andere
  Betriebe Standort/Anfahrt zur vorhandenen Anschrift. Keine Fahrt-/Parkversprechen erfinden.
  Ältere authored-Gebietsüberschriften bei stationären Betrieben gezielt zu Anfahrt korrigieren.
- Die letzten fünf Konzepte derselben Branche dienen als ausdrücklich untrusted Vergleichsdaten.
  Lizenzierte relevante Bildmotive deterministisch je Lead mischen und zuletzt verwendete Motive
  nachordnen. Fachliche Relevanz/Rechteprüfung bleibt vor Vielfalt; keine Stil-/Layoutlotterie.

## Prüfungen und verbleibender Rollout

Die sechs gemeldeten Integrationstest-Dateien erhalten explizite Studio-QA-Fixtures mit sämtlichen
Dimensionen. Der normale Mock bleibt unverifiable; Fixtures sind keine echte Designabnahme.
Die bisherige große Briefmatrix wird pro Branche mit denselben neun Fällen geprüft, ohne einen
gemeinsamen Zehn-Minuten-Timer. Kein Fall entfernt und keine PDF-/Layoutgrenze gelockert.

Lokale Umgebung: kein systemweiter postgresql-Service; vorhandenes Test-Docker-Dateisystem voll.
Statt fremde Dateien/Docker-Daten zu löschen, offiziellen PostgreSQL17.11-Binaries nach /tmp
extrahiert, isolierten lokalen Testserver an Port55432 gestartet. Nur ausdrücklich benannte lokale
Testdatenbanken zurückgesetzt, vollständige Core-vitest-Konfiguration mit Migrationen und echtem
Chromium verwendet. Keine Produktions-DB als Testziel und keine bezahlten KI-Aufrufe.

Vollständiger Suite-Ausgang wird nach Abschluss ergänzt. Lokale Prüfungen beweisen keine echte
Modelllaufzeit oder bestandene Demo auf dem VPS. Neues Image dort noch nicht installiert.
Der Update-Aufruf muss zuerst den alten Worker stoppen, dann nur die eigene Reparaturpause
aufheben; spätere Betreiber-Not-Aus-Änderungen blockieren. Private ENV, Modi, Preise, Budgets und
manuelle Freigaben bleiben erhalten. Laufzeitbeleg erst nach DB-/Queue-/Container-Health.
