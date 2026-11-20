# Brief, Demo, Funnel – ehrliche Analyse (20.11.2026)

## Kurzfassung

| Teil | Note (meine Einschätzung) | Warum |
|---|---|---|
| Demo | **8 von 10** | Sieht echt aus, ist schnell, ehrlich gekennzeichnet. Kleine Schwächen unten. |
| Funnel (Klick bis Bezahlen) | **6 von 10** | Sauber gebaut, aber ein Extra-Schritt vor dem Preis, keine Garantie, kein Mensch zum Fragen. |
| Brief | **6 von 10** | Guter Aufhänger, aber kein Preis, keine Telefonnummer, kein Beweis, dass es uns gibt. |
| **Messbarkeit** | **2 von 10** | Wir wissen nicht, ob Briefe ankommen. Alle bisherigen „Scans“ sind eure eigenen Tests. |

**Das Wichtigste:** Nicht der Text ist das größte Problem, sondern dass wir blind sind. 58 echte Briefe sind raus (9.–11.11.), und wir haben **null** erkennbare Reaktion von echten Empfängern. Euer Hinweis, dass angekommene Briefe zurückkamen, ist darum der wichtigste Punkt dieser Analyse. Solange das nicht geklärt ist, nützt jede Textverbesserung wenig.

---

## 1. Was die Daten sagen (Datenbank, Stand heute)

- 58 echte Briefe (Serie 1), alle „versendet“, 2 Varianten („V4 allgemein A“, „V4 handwerk A“).
- **Zustellstatus: bei allen 58 leer.** `delivered_at` ist überall leer, „unzustellbar“ überall „nein“. Wir erfassen also weder Zustellung noch Rückläufer. Das stimmt nicht mit eurer Beobachtung (Rückläufer) überein, also fehlt die Datenquelle.
- Alle 6 Scans, 14 Klicks auf „Übernehmen“, 5 gestartete und 2 abgebrochene Käufe gehören zu **einem** Betrieb (Krawczyk), von euren eigenen Tests (gleicher IP-Hash, 17.–19.11.). Echte Empfänger-Scans: **0**.
- 9 Bestellungen, 0 bezahlt.
- Die 9–11 Tage seit Versand sind noch kein Beweis für Misserfolg (Handwerker lesen Post oft gesammelt, Folgebrief ist erst ab ca. 12 Tage nach Zustellung vorgesehen). Aber: ohne Zustelldaten kann man es auch nicht beruhigt abwarten.

**Mögliche Gründe für Rückläufer (nicht belegt, nur Verdacht):**
1. Die Anschriften stammen aus offenen Karten (OSM/Overture), nicht aus einem Postadress-Register. Betriebe ziehen um oder sitzen nur beim Inhaber zu Hause ohne Klingelschild.
2. „An das Team von …“ ohne Personennamen: Die Post wirft solche Briefe eher als „unzustellbar“ zurück, wenn kein Briefkasten die Firma ausweist.
3. Absenderzeile / Format im Fenster (muss geprüft werden, easyNova liefert den Rückläufergrund).

---

## 2. Der Brief

**Was gut ist:** Aufhänger „Ich habe Ihre Website schon gebaut“ ist stark und konkret. QR groß, Kurz-URL als Alternative, Ablaufdatum, Art.-14/21-Hinweis vorhanden, ehrlich („Entwurf“).

**Was Conversion kostet:**
1. **Kein Preis.** Ein Handwerker fragt sofort: „Was kostet das?“ Steht es nicht da, sieht der Brief aus wie ein Köder. Auch auf der Demo steht kein Preis. Den ersten Preis sieht man erst nach Klicks.
2. **Kein Mensch erreichbar.** Nur E-Mail. „Niemand ruft Sie an“ ist rechtlich richtig und vertrauensbildend, aber es gibt auch keinen Weg „ich rufe an / schreibe kurz auf WhatsApp“. Das ist erlaubt, wenn der Betrieb **uns** anschreibt (steht so im Projekt-Auftrag). Gerade ältere Inhaber vertrauen einer Nummer mehr als einer E-Mail.
3. **Mehrere Betrugsmuster auf einmal:** unbekannter Absender, QR-Code, Zeitdruck („bis 17. Dezember“), kein Preis. Jedes einzeln ist normal, zusammen wirkt es wie Phishing per Post. Gegenmittel: Preis, Nummer, ein sichtbarer Beweis „es gibt uns“ (z. B. Beispiel einer anderen Seite aus `/beispiele`, aber nur echte freigegebene).
4. **Vorschaubild** zeigt den Ausschnitt der Demo – gut. Aber wer den Brief nur flüchtig sieht, versteht nicht in 3 Sekunden „Das ist MEINE Seite“. Der Firmenname steht in der Betreffzeile, gut; er könnte noch größer im Bild stehen.
5. **Kopier-Eindruck:** Der lange Datenschutzblock am Ende wirkt wie Kleingedrucktes eines Vertrags. Rechtlich nötig, aber kleiner/ruhiger setzen.

---

## 3. Die Demo (so, wie der Empfänger sie sieht)

Geprüft: echte versendete Demo (Sanitärbetrieb), Handy 390 px und Desktop 1440 px.

**Stark:**
- Erster Bildschirm: Firmenname, Ort, Leistung, Telefonnummer, Anfrage-Button – wie eine echte Seite. Schriften und Farben passen zur Branche.
- Leiste oben/unten mit „Website übernehmen“ immer sichtbar.
- Ehrlich gekennzeichnet („Symbolbild“, „nicht die offizielle Website“) – rechtlich sauber.
- Lädt schnell (CDN).

**Schwach:**
1. **Kein Preis** (siehe oben). Der Satz „Tarif und Preis wählen Sie im nächsten Schritt“ macht neugierig, aber wirft auch Misstrauen auf.
2. **Wirkt stellenweise unfertig:** Drei gestrichelte Kästen „Entwurfsplatzhalter: Hier ergänzen Sie …“ direkt hintereinander und ein Aufklapper „Was für Ihre Seite noch fehlt“. Ehrlich, aber viel Baustellen-Eindruck. Besser: ein einziger ruhiger Hinweis.
3. **Drei konkurrierende Kontaktwege:** Anfrage-Formular (nur Vorschau, nicht absendbar), „Interesse oder Fragen?“ und „Frage zu diesem Entwurf“. Ein Besucher, der das erste Formular ausfüllt, wird enttäuscht („nicht absendbar“).
4. **Das Kaufangebot sitzt ganz unten** (Handyseite ca. 8500 px lang). Die feste Leiste rettet das, aber der überzeugende Block („Gefällt Ihnen Ihre neue Website?“ mit den Häkchen) wird von den meisten nie gesehen.
5. **Ältere Demos** haben den Termin-Button noch nicht (nur neu gebaute).
6. **Vertrauensblock** („Wer hat diesen Entwurf gebaut? Doaa Attia“) hat kein Foto und keine Nummer – eine Initialen-Scheibe „DA“ wirkt anonym.
7. **Kleiner Fehler gefunden und behoben:** In den Notfall-Kopien (falls Supabase gesperrt wäre) war der Button „Website übernehmen“ kaputt (Link `…netlify.appmailto:…`). Betrifft nur den Notfall. Skript repariert (siehe unten).

---

## 4. Der Funnel

Weg: QR → `/q` → Demo → „Website übernehmen“ → **Auswahl „Wie möchten Sie weitermachen?“** → entweder Tarifwahl (2 Min.) oder Angaben (15 Min.) → Prüfen → Stripe → Angaben / Onboarding → Live.

**Gut:** Kein Druck, Entwurf privat, Online erst nach Freigabe, 2 Änderungsrunden inklusive, Domain gehört dem Kunden, Rechnung zu jeder Zahlung, Preise werden serverseitig geprüft.

**Reibung / Risiko:**
1. **Extra-Entscheidung vor dem Preis.** Wer „Übernehmen“ klickt, will den Preis sehen, bekommt aber erst eine Frage („Wie möchten Sie weitermachen?“). Besser: direkt Tarife zeigen, „Angaben zuerst“ als kleiner Link darunter.
2. **Widerspruch:** Die Demo-Leiste sagt „Erst einrichten, dann kostenpflichtig bestellen“, aber der erste Weg lautet „Erst bestellen, Angaben danach“.
3. **Keine Garantie mehr** (seit 29.10. bewusst entfernt). Das Risiko liegt jetzt voll beim Kunden: 597 € zahlen, bevor man den fertigen Inhalt gesehen hat. Teilweise abgefedert durch „Online erst nach Freigabe“, aber das steht erst im Kaufweg.
4. **Tarif „Komplett“ ist aus** (0 € heute, 179 €/Monat). Dabei ist „0 € heute“ für kleine Betriebe wahrscheinlich der stärkste Einstieg. Entscheidung liegt bei euch.
5. **Kein Mensch:** Nur E-Mail. Wer am Kaufbutton zögert, hat niemanden zum Fragen in 5 Minuten.
6. **Messung:** Funnel-Zahlen sind durch eure Tests verfälscht (IP/Testbetrieb) – ohne Bereinigung sieht man später nicht, was echt ist.

---

## 5. Was ich empfehle (nach Wichtigkeit)

1. **Rückläufer klären, bevor mehr Briefe rausgehen** (kein Text hilft, wenn der Brief nicht ankommt):
   - Rückläufergrund und Zustellstatus von easyNova je Brief speichern (Feld ist vorhanden, wird nicht befüllt).
   - Adressen vor Versand zusätzlich prüfen (Hausnummer, Firmenklingelschild-Hinweis wie „Inhaber“).
   - Den nächsten Versand klein halten (5–10 Briefe) und die Zustellung beobachten.
2. **Preis in Brief und Demo zeigen** („597 € einmalig, danach 19 €/Monat, monatlich kündbar“). Brief: kleine Zeile unter den 3 Schritten. Demo: Zeile am Button.
3. **Einen Menschen erreichbar machen** – eure Entscheidung, da ihr nur per E-Mail erreichbar sein wollt: entweder nur ein **Rückruf-/WhatsApp-Weg**, bei dem der Betrieb uns schreibt, oder weiter nur E-Mail. Mit Nummer steigt Vertrauen spürbar, aber es bedeutet Telefon-Aufwand.
4. **Funnel verkürzen:** „Übernehmen“ führt direkt zu den Tarifen; „Angaben zuerst“ als zweiter Link.
5. **Demo aufräumen:** die drei Platzhalter-Kästen zu einem Hinweis, ein einziger Kontaktweg, Kaufblock weiter nach oben (z. B. direkt nach den Leistungen).
6. **Garantie/Zahlungs-Sicherheit sichtbar:** entweder „Zahlung erst nach Go-Live“ (technisch noch offen) oder Garantie wieder an. Mindestens im Kaufweg klar sagen, was bis zur Freigabe passiert.
7. **Messung bereinigen:** Tests als „intern“ markieren (nicht löschen) und im Dashboard ausblenden.

## 6. Schon erledigt

- Notfall-Kopien: „Website übernehmen“ und „Kein Interesse“ funktionieren wieder als E-Mail-Links (`infra/netlify/snapshot-demos.mjs`). Wirkt beim nächsten Veröffentlichen.

## 7. Offen und von euch zu entscheiden

- Weitere Briefe erst nach Klärung der Rückläufer? (Empfehlung: ja, nur kleine Menge.)
- Preis im Brief und in der Demo zeigen? (Empfehlung: ja.)
- Nummer/WhatsApp für Rückfragen, ja oder nein?
- „Komplett“ (0 € heute) wieder anbieten? Garantie wieder an?

## Grenzen dieser Analyse

Die Noten sind meine Einschätzung, keine gemessenen Werte. Echte Conversion lässt sich erst mit echten Empfänger-Scans berechnen. Zahlen aus Datenbank und Quellcode sind belegt; Gründe für Rückläufer sind Vermutungen.
