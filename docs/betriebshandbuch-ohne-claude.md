# Betriebshandbuch: SeitenWerk ohne Claude Code (Stand 17.11.2026)

Für Doaa. Alles läuft auch ohne Claude Code weiter. Dieses Handbuch erklärt Schritt für Schritt, was du selbst
machen kannst und was du besser lässt.

## 1. Was wo läuft

| Teil | Wo | Was es macht | Kosten |
|---|---|---|---|
| Firmen-Website `seitenwerk.world` | Netlify (Projekt `seitenwerk-website`) | Startseite; leitet QR-Codes und Kurz-Links weiter | im Netlify-Tarif |
| App `seitenwerkworld.netlify.app` | Netlify (Projekt `seitenwerkworld`) | Admin, Demos, QR-Pförtner, Kauf, Einrichtung | im Netlify-Tarif |
| Worker (Server) | Contabo-VPS `77.237.235.161`, Ordner `/opt/seitenwerk` | sucht Betriebe, baut Demos, erzeugt und verschickt Briefe, lädt Demos alle 6 h vor | Contabo-Rechnung |
| Datenbank | Supabase (Organisation „Website Sale“) | alle Daten | kostenlos |
| Briefe | easyNova | druckt und verschickt | ca. 1 € pro Brief (Guthaben aufladen) |
| Zahlungen | Stripe (live) | Kauf und Monatsbeträge | Gebühr pro Zahlung |
| E-Mails | Resend | Benachrichtigungen an dich, Mails an Kunden | kostenlos bis 3 000/Monat |
| KI (Demos, Brieftexte, Prüfung) | Anthropic-API-Schlüssel im Worker | schreibt Demo-Texte, prüft Betriebe | Guthaben beim API-Konto |

**Netlify:** Du hast den Personal-Tarif (9 $ im Monat, 1 000 Credits). Jede Veröffentlichung kostet 15 Credits. Der
QR-Pförtner und die vorgeladenen Demos kosten fast nichts. Den Stand siehst du unter app.netlify.com → Usage & billing.
Wenn die Credits ausgehen, schaltet Netlify die Seiten ab. Dann funktionieren keine QR-Codes mehr. Schau deshalb
einmal pro Woche nach. „Auto recharge“ sollte aus bleiben, sonst kostet es ohne Nachfrage Geld.

**Wichtig – ohne Geld läuft nicht alles:** Neue Demos und KI-Prüfungen brauchen Guthaben beim Anthropic-API-Konto.
Briefe brauchen Guthaben bei easyNova. Ist eines davon leer, stoppt der Worker den Schritt sauber und meldet es im
Admin. Kaputt geht dabei nichts.

## 2. Jeden Tag (2 Minuten)

- In deinem Postfach auf diese Mails achten:
  - „QR-Code gescannt: …“: Der Betrieb hat seine Demo geöffnet. Nichts tun, außer er meldet sich.
  - „„Übernehmen“ geklickt: …“ oder „Bestellung begonnen: …“: Der Betrieb interessiert sich ernsthaft.
  - „Neue Frage“ oder „Änderungswunsch“: im Admin unter **Support** innerhalb eines Tages beantworten.
- **Niemals** einen Betrieb von dir aus anrufen, ihm eine E-Mail oder eine Nachricht schicken (§ 7 UWG). Ein Scan ist keine
  Erlaubnis. Antworten darfst du nur, wenn er dir zuerst schreibt oder seine E-Mail selbst eingetragen hat.

## 3. Der nächste Versand, Schritt für Schritt

Die Begründung steht in `reports/Beste Zielbetriebe für Websitebriefe.md`.

1. **Geld bereitstellen:** easyNova-Guthaben für die geplanten Briefe aufladen (ca. 1 € pro Brief). Im Admin unter
   **Einstellungen → Budget** das Wochenbudget passend setzen, zum Beispiel 40 €.
2. **Betriebe suchen:** Admin → **Suche**. Diese Branchen in dieser Reihenfolge nehmen:
   1. Dachdecker
   2. Heizung und Klima
   3. Sanitär
   4. Garten- und Landschaftsbau
   5. Tischler
   6. Entrümpelung
   7. Gebäudereinigung
   8. danach Maler, Fliesenleger, Elektriker
   9. Kosmetik- und Nagelstudios nur, wenn sie neu sind
   - **Nicht nehmen:** Imbiss, Kiosk, Bäckerei, Café, Friseur mit Stammkunden.
   - Städte: größere Städte mit vielen Treffern.
   - Die Suche vergibt Punkte. Einträge, die jemand vor Ort geprüft hat, teure Gewerke und gepflegte Öffnungszeiten
     kommen nach oben. Ketten und leerstehende Läden fliegen automatisch raus.
3. **Von Hand prüfen, die besten 60–70, je ca. 3 Minuten.** Das ist der wichtigste Schritt.
   - Google Maps: Gibt es den Betrieb noch? Steht dort „dauerhaft geschlossen“ oder ist eine Website verlinkt? Dann
     **aussortieren**.
   - Name plus Stadt googeln, Instagram-/Facebook-Profil ansehen: Ist dort eine Website verlinkt? Dann
     **aussortieren**.
   - Stimmt die Anschrift (Straße, Hausnummer, PLZ)? Wenn Zweifel bestehen: **aussortieren**. Ein Rückläufer kostet
     Geld.
   - Alles nur von Hand nachsehen, nichts automatisch abfragen und **nicht anrufen**.
4. **Demos prüfen:** Admin → **Demos**. Jede Demo einmal auf dem Handy ansehen:
   - Stimmen Name und Ort?
   - Ist nichts Peinliches drin?
   - Dann freigeben. Was nicht passt: „Ablehnen mit Wunsch“, dann baut der Worker die Demo neu.
5. **Briefe:**
   - Admin → **Briefe**. Zuerst „Testbrief an mich“ und das PDF ansehen.
   - Danach jeden Brief einzeln freigeben. easyNova schickt nur freigegebene Briefe.
   - Der Brief ist Vorlage 5 (Version 8): Name zuerst, Bildbühne mit Laptop und Handy, QR-Karte „Ihre Website ansehen“.
6. **Nach dem Versand:**
   - Die meisten Scans kommen in der ersten Woche nach der Zustellung, fast alle innerhalb von 3 Wochen.
   - 0 bis 2 Scans bei 40 Briefen sind normal.
   - Rückläufer im Admin beim Betrieb als **„Rücksendung unzustellbar“** eintragen. Ab 3 % Rückläufern pro Woche stoppt
     das System den Versand vorsichtshalber.

## 4. Wenn ein Betrieb kauft

Das läuft automatisch: Zahlung über Stripe, Rechnung, Einrichtungsformular, Vorschau, Freigabe, Domain, Go-Live.
Du bekommst zu jedem Schritt eine Mail.

Deine Aufgaben:
- Änderungswünsche im Admin umsetzen bzw. freigeben.
- Fragen beantworten.
- Die Domain wird nicht automatisch gekauft. Der Admin zeigt dir, was zu tun ist; danach freigeben.

## 5. Termius-Befehle (nur wenn nötig)

Verbinden mit `77.237.235.161`, dann:

| Zweck | Befehl |
|---|---|
| Ist der Worker gesund? | `sudo docker ps --filter label=com.docker.compose.service=worker` (Spalte STATUS: „healthy“) |
| Worker neu starten | `sudo docker restart $(sudo docker ps -q --filter label=com.docker.compose.service=worker)` |
| Letzte Meldungen ansehen | `sudo docker logs --tail 50 $(sudo docker ps -q --filter label=com.docker.compose.service=worker)` |
| Auf eine neue Version aktualisieren | `cd /opt/seitenwerk && sudo RELEASE=<Commit> bash infra/vps/update-worker.sh` |
| Wecker wieder an (nur im Notfall, kostet Credits) | `cd /opt/seitenwerk && echo "KEEP_WARM_MINUTES=4" >> .env.worker`, danach mit dem Update-Befehl (gleicher Commit) neu starten |

Ohne Claude brauchst du normalerweise **keinen** dieser Befehle. Ändere nichts an `.env.worker`, außer dieses Handbuch
sagt es.

## 6. Notfälle

| Was | Was tun |
|---|---|
| QR-Code öffnet nicht | app.netlify.com → beide Projekte prüfen. Steht dort „paused“ oder sind die Credits leer, aufladen bzw. Tarif prüfen. |
| Admin zeigt „Datenbank nicht erreichbar“ | supabase.com → Projekt öffnen. Ist es pausiert, auf „Restore“ klicken. Die QR-Codes der verschickten Briefe zeigen solange eine gespeicherte Kopie (Notbetrieb). |
| Worker-Fehler im Admin unter „Meldungen“ | Worker neu starten (Befehl oben). Fehler-Mails sind absichtlich aus. |
| Kunde will „Kein Interesse“ | Läuft automatisch über den Knopf in der Demo. Per Mail: im Admin auf die Sperrliste setzen. |
| Rückläufer im Briefkasten | Im Admin beim Betrieb „Rücksendung unzustellbar“ eintragen. |

## 7. Was nicht ohne Freigabe passieren darf

- Echte Briefe gehen nur nach deiner Freigabe pro Brief raus.
- Domains werden nur von Hand gekauft.
- Preise und Rechtstexte nicht ändern, ohne zu wissen, was sie bedeuten. Bei Unsicherheit bleibt alles wie es ist.
- In Briefen und Demos stehen keine erfundenen Zahlen (§ 5 UWG).

## 8. Neue Version ohne Claude?

Der Code liegt auf GitHub im Branch `claude/website-brief-maschine-0d0s37`. Neue Funktionen brauchen später wieder
Claude Code oder eine andere Entwicklerin bzw. einen anderen Entwickler. Für den normalen Betrieb ist das nicht nötig.
