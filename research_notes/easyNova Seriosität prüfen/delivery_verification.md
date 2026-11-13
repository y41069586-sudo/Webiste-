# Nachweis, dass easyNova digiBrief die Briefe wirklich druckt und einliefert (Stand 13.11.2026)

Alle Webquellen abgerufen am 13.11.2026. „Schluss“ = eigene Schlussfolgerung, nicht belegt.
Keine Anmeldung, kein Kontakt, keine Änderung an Projektdateien außer dieser Notiz.

## 1. Welche Nachweise bietet easyNova selbst (API, Portal, Rechnung)?

### Takeaway
easyNova bietet für normale Briefe **keinen Einlieferungsbeleg und keine Sendungsverfolgung**, aber die API liefert pro Brief mehr Beweisfelder, als das Projekt heute speichert: `printUploadDate`, `printFeedbackDate`, `frankierID`, `destinationAreaStatus` + Datum und den tatsächlich abgerechneten Preis. Dazu kommen das Postausgangsbuch im Web-Client und eine Monatsrechnung im Folgemonat.

### Cited Findings
- Statuscodes laut Produktseite: 1 „Annahme der Sendung“, 2 „Verarbeitung der Sendung“, 3 „Einlieferung in das Druckzentrum“, 4 „Verarbeitung im Druckzentrum“, 99 „Verarbeitungsfehler“ (Grund in `errorList`); Testsendungen bleiben dauerhaft auf 1. Weiter heißt es dort: „Ein Zustellergebnis kann Tage später folgen.“ — [easyNova API-Schnittstelle](https://www.easynova.de/produkte/digibrief/automatisierung/api-schnittstelle/)
- Die Seite erwähnt weder Einlieferungsbeleg noch Druck- oder Frankierprotokoll. Eine Sendungsnummer (`registeredLetterID`) gibt es nur bei Einschreiben. — [easyNova API-Schnittstelle](https://www.easynova.de/produkte/digibrief/automatisierung/api-schnittstelle/)
- Das Statusmodell `LetterStatus` der OpenAPI V1 enthält unter anderem `createdDate`, `processedDate`, `printUploadDate`, `printFeedbackDate`, `frankierID`, `destinationAreaStatus`, `destinationAreaStatusDate`, `registeredLetterStatus`, `premiumAdress`, `batchID`, `noOfPages`, `testFlag`, `errorList`, `priceNet` und `priceWithTax`. Die Felder sind im Schema nicht weiter beschrieben. — [easyNova OpenAPI swagger.json](https://digibrief-api.easynova.de/swagger/v1/swagger.json)
- Preisfelder: „Sobald der Druckdienstleister die Sendung abgerechnet hat, tragen die Felder `priceNet` … und `priceWithTax` … den TATSAECHLICH abgerechneten Betrag … Vorher sind beide LEER“. Laut Statusbeschreibung erscheint der Wert „typischerweise OHNE Statuswechsel“. — [OpenAPI, GET /api/letter/{letterId}](https://digibrief-api.easynova.de/swagger/v1/swagger.json)
- Die Abrechnungsdaten von `GET /api/companyBilling` sind „eine Momentaufnahme — nicht zur Rechnungsprüfung geeignet“. — [OpenAPI, GET /api/companyBilling](https://digibrief-api.easynova.de/swagger/v1/swagger.json)
- **Neu gegenüber dem Projektstand vom 27.10.:** Die OpenAPI hat jetzt einen Endpunkt `POST /api/letter/cancel` zum Stornieren, „solange sie noch nicht in der Produktion sind“. `cancelStatus` kann `tooLate` sein, wenn der Brief „bereits in der Produktion“ ist. Stornierte Briefe werden nicht berechnet und stehen danach auf Status 99 „Storniert“. Außerdem gibt es `GET /api/letter/Batch`. `docs/integrations.md` und `docs/entscheidungen.md` sagen dagegen noch „kein Storno-Endpunkt“. — [OpenAPI](https://digibrief-api.easynova.de/swagger/v1/swagger.json)
- FAQ zum Postausgangsbuch: „Prüfen Sie jederzeit, ob Ihr Brief bereits gedruckt, kuvertiert oder verschickt wurde.“ — [easyNova Hilfe/FAQ](https://www.easynova.de/briefe-online-versenden-easynova-hilfe/)
- FAQ zu Rechnungen: „Rechnungen werden monatlich erstellt und werden automatisch im Folgemonat mit ausgewiesener Umsatzsteuer zugestellt.“ Aufladungen von Guthaben erhalten nur eine Zahlungsbestätigung, keine Rechnung. — [easyNova Hilfe/FAQ](https://www.easynova.de/briefe-online-versenden-easynova-hilfe/)
- Laut FAQ ist bereits eingezahltes Guthaben erstattbar („Ja, bereits eingezahltes Guthaben kann zurückerstattet werden.“). Support: info@easynova.de, Mo–Fr 9–18 Uhr. — [easyNova Hilfe/FAQ](https://www.easynova.de/briefe-online-versenden-easynova-hilfe/)
- Anbieter ist die Siecom IT-Systemhaus GmbH in Dresden. Laut Produktseite hat sie die **Postlizenz L 4436 der Bundesnetzagentur nach § 6 PostG**, „Druck und Verarbeitung ausschließlich in Deutschland“, sowie ISO 9001/14001/27001 (Zertifikat der DICIS AG, gültig bis 16.10.2028). Bewertungen: Trustpilot 4,1 (5 Bewertungen), Google 5,0 (7 Bewertungen). — [easyNova digiBrief](https://www.easynova.de/produkte/digibrief/)

### Inferences
- Schluss: **Status 4 bzw. `processedDate` heißt „im Druckzentrum verarbeitet“, nicht „bei der Deutschen Post eingeliefert“.** Das Projekt bildet Status 4 auf `sent` ab (`mapEasyNovaStatus`). Das ist als Sammelbegriff vertretbar, belegt aber nur den Druck.
- Schluss: Der stärkste anbieterseitige Nachweis, den das Projekt noch nicht ausliest, sind `frankierID` und `destinationAreaStatus`/`destinationAreaStatusDate`. Bei der Deutschen Post ist die FrankierID die Pflichtkennung jeder Teilleistungssendung, und die kostenlose Teilleistungs-Verfolgung meldet genau einen Termin: die Bearbeitung im **Briefzentrum Eingang**, also im Briefzentrum der Zielregion (siehe Abschnitt 2). „destinationAreaStatus“ passt dem Namen nach dazu. Das ist eine **Vermutung**: easyNova dokumentiert die Bedeutung nicht. Prüfen ließe sich das rein lesend mit `GET /api/letter/{id}` für die 58 Briefe. Sind `frankierID` und `destinationAreaStatusDate` gefüllt, wäre das ein von der Deutschen Post stammendes Ereignis.
- Schluss: Weil easyNova bei 0,65 € netto liegt, also unter dem Einzelporto von 0,95 €, und eine eigene Postlizenz sowie eine „Portooptimierung“ (`optimizePrice`) hat, liefert easyNova vermutlich über den Teilleistungs- bzw. Konsolidierungszugang mit Rabatt bei der Deutschen Post ein und nicht als Einzelbrief mit Marke.

### Gaps
- Die Bedeutung von `printUploadDate`, `printFeedbackDate`, `frankierID` und `destinationAreaStatus` ist nirgends öffentlich beschrieben. Das wäre eine schriftliche Frage an den easyNova-Support.
- Der Name des Druckzentrums bzw. Druckdienstleisters und die Uhrzeit, bis zu der ein Brief noch am selben Tag zur Post geht, stehen nicht auf den öffentlichen Seiten.
- AGB: Auf der digiBrief-Seite fand sich kein AGB-Link, daher nicht geprüft.

## 2. Was kann die Deutsche Post unabhängig bestätigen?

### Takeaway
Bei normalen Briefen gibt es für den Absender keinen Zustellnachweis. Die Deutsche Post nennt Einschreiben als Weg zum Nachweis. Unabhängig prüfen lässt sich aber: (a) die **Briefankündigung** an einer eigenen Empfängeradresse, die ein Foto des Umschlags aus der Sortierung liefert, (b) Teilleistungsdaten zum Briefzentrum Eingang, die aber nur der Einlieferer bekommt, also easyNova, und (c) Rückläufer an die Rücksendeangabe.

### Cited Findings
- „Eine Sendungsverfolgung gibt es für Briefe mit Matrixcode und für Einschreiben.“ Weiter: „Bei normalen Briefen mit Matrixcode gibt es keinen Scan bei der Zustellung.“ Und: „Wenn Sie einen Nachweis der Zustellung benötigen, empfehlen wir ein Einschreiben.“ Ein Nachforschungsauftrag ist frühestens nach 7 Werktagen sinnvoll. — [Deutsche Post, Briefversand 2025](https://www.deutschepost.de/de/p/post2025/blogartikel-briefversand-2025.html)
- „Verfolgen Brief Teilleistungen“ ist kostenfrei, dokumentiert aber nur „den Bearbeitungstag im Briefzentrum Eingang … nicht die Zustellung durch den Zusteller“. Grundlage ist die FrankierID. Die Daten gehen nur an den Teilleistungskunden bzw. den Empfänger der Rabattgutschrift. Die Post darf sie nicht an dessen Kunden weitergeben, also nicht an den Betreiber. — [Deutsche Post, Verfolgen Brief Teilleistungen](https://www.deutschepost.de/de/s/sendungsverfolgung/verfolgen-brief-teilleistungen.html)
- Beim Teilleistungs-ID-Rabatt verlangt die DPAG die „elektronische Übermittlung von den FrankierIDs der Einzelsendungen“. — [Deutsche Post Handlingbroschüre TL](https://deutschepost.de/dam/jcr:6b84d10e-7d02-4d75-a7e3-fad94b14276f/dp-am-handlingbroschuere-tl-auftraege-anlegen-202501.pdf) (über die Suchergebnisse, nicht vollständig gelesen)
- Briefankündigung: Bilder entstehen „vollautomatisch im Rahmen der Sortierung“, der Empfänger erhält ein Foto der Umschlagvorderseite per App oder E-Mail. Für die Registrierung schickt die Post einen Bestätigungscode an die Anschrift, das dauert also einige Tage. Nötig ist ein DHL-Konto oder ein GMX-/WEB.DE-Postfach. — [Deutsche Post Briefankündigung](https://www.deutschepost.de/briefankuendigung), [Leistungsbeschreibung 05/2025](https://www.deutschepost.de/dam/jcr:120b8218-bb1f-41ed-90bf-d3a3a42b4f90/dp-briefankuendigung-leistungsbeschreibung-05-2025.pdf)
- Laut Erfahrungen von Testnutzern werden gedruckt adressierte Briefe „meistens, aber nicht immer“ angekündigt. — [paketda.de](https://www.paketda.de/news-briefe-digitale-sendungsankuendigung.html) (Sekundärquelle)
- Premiumadress ist laut easyNova-API „ein Produkt der Deutschen Post: zu unzustellbaren Sendungen erhalten Sie eine elektronische Rückmeldung“. Es muss für das Konto freigeschaltet sein (`GET /api/account`, `premiumAdress.variants`, z. B. „Report“). — [OpenAPI](https://digibrief-api.easynova.de/swagger/v1/swagger.json)
- Premiumadress-Preise (Preisliste Stand 10/2024): Unzustellbarkeitsinformation 0,33 €. Bei der Variante „Report“ sind laut FAQ Unzustellbarkeitsinfos kostenfrei, unzustellbare Sendungen werden dann aber vernichtet. — [Premiumadress Preise 10/2024](https://deutschepost.de/dam/jcr:cffc5342-35a7-4534-94ac-a68168d439b0/dp-premiumadress-preise-de-102024.pdf), [Premiumadress FAQ](https://www.deutschepost.de/de/p/premiumadress/faq.html) (über die Suchergebnisse)

### Inferences
- Schluss: Ein Absender ohne eigenen Teilleistungsvertrag kann die Einlieferung bei der Post für normale Briefe nicht selbst einsehen. Unabhängige Belege entstehen nur auf der **Empfängerseite**: eigene Adressen bzw. Kontrolladressen mit Briefankündigung, tatsächlicher Erhalt, QR-Scans und Rückläufer.
- Schluss: Das Projekt nutzt Premiumadress nicht. Unzustellbare Briefe gehen daher vermutlich physisch an die Rücksendeangabe über dem Adressfeld. Laut `packages/templates/src/letter.ts` ist das die Absenderanschrift des Betreibers. Bisher werden sie nur von Hand erfasst (`docs/entscheidungen.md`, „Rücksendung von Hand im Lead-Detail erfassen“).

### Gaps
- Keine Quelle gefunden, die festlegt, ob unzustellbare Teilleistungs- bzw. Konsolidierungsbriefe ohne Premiumadress immer an den Absender zurückgehen oder vernichtet werden.
- Ob easyNova die Premiumadress-Variante „Report“ für das Betreiberkonto freigeschaltet hat, ist unbekannt. Prüfbar rein lesend mit `GET /api/account`.

## 3. Laufzeiten: Standardbrief, Dialogpost, und was easyNova nutzt

### Takeaway
easyNova nennt nur „Standardbrief / Kompaktbrief / Großbrief“ und GoGreen Plus, **keine Laufzeit und nicht ausdrücklich Dialogpost**. Für Standardbriefe gilt seit 2025: 95 % am 3., 99 % am 4. Werktag nach Einlieferung. Dialogpost hat ein Qualitätsziel von 4 Werktagen mit „variabler Zustellung“. Wegen der Mindestmengen von Dialogpost ist der Einsatz für einzelne, verschiedene Briefe unwahrscheinlich, das ist aber nicht belegt.

### Cited Findings
- Die easyNova-Preisliste nennt Standardbrief bis 20 g mit 0,65 € (s/w einseitig) bis 0,75 € (Farbe beidseitig) netto, Kompaktbrief und Großbrief, ohne Grundgebühr und ohne Mindestumsatz. Dialogpost oder Laufzeiten werden nicht erwähnt. — [easyNova digiBrief](https://www.easynova.de/produkte/digibrief/)
- Briefe werden „mit GoGreen Plus der Deutschen Post zugestellt“. — [easyNova Hilfe/FAQ](https://www.easynova.de/briefe-online-versenden-easynova-hilfe/)
- Deutsche Post: „Standardbriefe werden in der Regel innerhalb von 2 Werktagen zugestellt … laut Postgesetz müssen sie spätestens nach 4 Werktagen beim Empfänger sein.“ Dialogpost erreicht ihr Ziel „meist innerhalb unseres Qualitätsziels von vier Werktagen“ und ist als „Wenige Werktage (Variable Zustellung)“ beschrieben. Werktage sind Montag bis Samstag. — [Deutsche Post, Wann kommt mein Brief an?](https://www.deutschepost.de/de/p/postgesetz.html)
- Seit dem 01.01.2025 gilt: 95 % am 3. und 99 % am 4. Werktag nach Einlieferung (vorher 80 % E+1). Die Laufzeit hat sich laut Post im Schnitt um etwa 0,6 Tage verlängert. Für 2025 meldet die Post selbst, nicht unabhängig geprüft, 97,4 % in 3 Werktagen. — [test.de](https://www.test.de/neues-postgesetz-6127885-0/), [logistik-heute.de](https://logistik-heute.de/news/briefdienste-neues-zustellsystem-sorgt-haeufiger-fuer-leere-briefkaesten-272469.html), [Berliner Zeitung](https://www.berliner-zeitung.de/article/kommt-ihr-brief-noch-puenktlich-an-die-wichtigste-kontrolle-faellt-jahrelang-aus-10168185) (über die Suchergebnisse)
- Gründe für Verspätungen laut Post: unvollständige Adressen, hohes Sendungsaufkommen, Wetter, Feiertage, späte Einlieferung. — [Deutsche Post, Wann kommt mein Brief an?](https://www.deutschepost.de/de/p/postgesetz.html)
- Mindestmengen für Dialogpost: bundesweit 5.000 Stück, Dialogpost EASY ab 500, regional 200 je Leitregion. — [Deutsche Post Dialogpost-FAQ](https://www.deutschepost.de/de/p/print-mailing/dialogpost-faq.html) (Werte aus den Suchergebnissen, Seite nicht vollständig gelesen; Drittquellen nennen teils andere Schwellen)
- Das Einzelporto für einen Standardbrief beträgt seit Januar 2025 0,95 € und ist bis Ende 2026 festgelegt. — [Bundesnetzagentur Bericht Briefpreise 2026](https://www.bundesnetzagentur.de/SharedDocs/Mediathek/Berichte/2026/BerichtBriefpreise2026.pdf) (Inhalt über die Suchergebnisse)
- Bei Teilleistungs-Rabatten ist die Laufzeit wählbar („Auswahl Laufzeit E+1“). — [Deutsche Post Handlingbroschüre TL 2025](https://deutschepost.de/dam/jcr:6b84d10e-7d02-4d75-a7e3-fad94b14276f/dp-am-handlingbroschuere-tl-auftraege-anlegen-202501.pdf) (über die Suchergebnisse)

### Inferences
- Schluss: Rechnerisch gilt bei Einlieferung am Drucktag: Druck Montag 9.11. → E+3 = Donnerstag 12.11., E+4 = Freitag 13.11. Druck Mittwoch 11.11. → E+3 = Samstag 14.11., E+4 = Montag 16.11. Geht ein Brief erst am Tag nach dem Druck zur Post, verschiebt sich alles um einen Werktag. **Zum Stand 13.11. abends ist also selbst bei pünktlicher Zustellung nur ein Teil der 36 Briefe vom 9.11. sicher angekommen, von den 22 Briefen vom 11.11. womöglich noch keiner.** Die internen Schätzungen (12.11. bzw. 16.11.) liegen am frühen Rand.
- Schluss: Ein günstigeres Teilleistungsprodukt mit längerer Laufzeit (z. B. E+2/E+3 statt E+1) ist wegen des Preises unter Porto plausibel. Das ist nicht belegt.

### Gaps
- easyNova nennt kein Postprodukt und keine Laufzeitklasse. Das wäre eine schriftliche Frage an den Support.
- Auf der Dialogpost-Seite der Post wurde keine verbindliche Laufzeit in Werktagen gefunden, nur das Qualitätsziel von 4 Werktagen.

## 4. Warum kommt ein Hybridbrief nicht an, und wie erfährt der Absender davon?

### Takeaway
Typische Ursachen sind eine falsche oder veraltete Anschrift, unlesbare Adressfelder, Verzögerungen bei der Sortierung, ein Betrieb ohne Briefkasten oder Beschriftung, und Post, die im Betrieb ungelesen weggeworfen wird. Der Absender erfährt davon nur über Status 99 (vor dem Druck), Rückläufer an die Rücksendeangabe oder Premiumadress.

### Cited Findings
- easyNova liest die Anschrift ausschließlich aus dem Adressfenster des PDFs. Ist sie nicht lesbar oder verletzt der Inhalt eine Sperrfläche, gibt es Status 99 mit Begründung. — [OpenAPI, POST /api/letter](https://digibrief-api.easynova.de/swagger/v1/swagger.json)
- Laut Post verzögern unvollständige Adressen, hohes Aufkommen, Wetter und Feiertage die Zustellung. — [Deutsche Post, Wann kommt mein Brief an?](https://www.deutschepost.de/de/p/postgesetz.html)
- Sendungen mit ausländischer Absenderadresse werden „an den Einlieferer zurückgesendet“, bezahlte Entgelte werden nicht erstattet. — [easyNova Hilfe/FAQ](https://www.easynova.de/briefe-online-versenden-easynova-hilfe/)
- Elektronische Meldung unzustellbarer Briefe nur mit Premiumadress. — [OpenAPI](https://digibrief-api.easynova.de/swagger/v1/swagger.json)

### Inferences
- Schluss: Die Anschriften stammen aus OSM bzw. Webrecherche. Ein paar Prozent falsche oder veraltete Anschriften sind realistisch, also bei 58 Briefen vermutlich 0 bis 3 Rückläufer innerhalb von etwa 1 bis 3 Wochen. Es gibt keine belegte Quote. **Kommen nach 3 Wochen gar keine Rückläufer, ist das ein schwaches Warnsignal, mehr nicht.**

### Gaps
- Keine belegte Quote unzustellbarer Briefe für B2B-Adressen aus OSM gefunden.

## 5. Günstig selbst testen und Alternativen

### Takeaway
Am billigsten und am aussagekräftigsten sind **Kontrollbriefe in jedem Versandstapel**: 2–3 Briefe an eigene Adressen bzw. Adressen von Freunden, je ca. 0,81 €, über denselben Weg und am selben Tag wie die echten Leads, an Adressen mit aktiver Briefankündigung. Alternativen: LetterXpress (laut Preisrechner 0,76 € netto), Pingen, onlinebrief24, Binect und Deutsche Post E-POST. Deren Preise ließen sich nur teilweise prüfen.

### Cited Findings
- easyNova: Standardbrief ab 0,65 € netto, ohne Grundgebühr und ohne Vertragsbindung. — [easyNova digiBrief](https://www.easynova.de/produkte/digibrief/)
- LetterXpress-Preisrechner (Einstellung nicht beschriftet): „0,76 €“ netto bzw. „0,90 € brutto“, keine weiteren Kosten. Zu Einlieferungsnachweis, Verfolgung oder Rückläufern sagt die Seite nichts. Anbieter ist die A&O Fischer GmbH & Co. KG. — [LetterXpress Preise](https://www.letterxpress.de/preise)
- Deutsche Post E-POST (Hybridbrief direkt bei der Post: E-POST MAILER, E-POSTBUSINESS BOX). Die Post druckt, kuvertiert und frankiert selbst. — [Deutsche Post E-POST](https://www.deutschepost.de/epost) (über die Suchergebnisse, Preise nicht geprüft)

### Inferences
- Schluss: Ein Kontrollbrief zum Betreiber **im selben Stapel** prüft den ganzen Weg: Druck, Einlieferung, Laufzeit und Scan. Der Testbrief vom 13.11. lief allein und nach den 58 Briefen. Er belegt den Weg allgemein, aber nicht die beiden Stapel vom 9.11. und 11.11.
- Schluss: Der bisherige Preis von genau 0,81 € brutto je Brief (46,98 € / 58) entspricht dem Listenpreis für Farbe einseitig, 0,68 € netto × 1,19. Er passt zu einem einzeln abgerechneten, wirklich verarbeiteten Brief und nicht zu einer Pauschale.

### Gaps
- Pingen-Preisseite antwortete mit HTTP 503. Preise von Pingen, onlinebrief24, Binect und E-POST wurden nicht geprüft.
- Unabhängige Erfahrungsberichte zu easyNova sind dünn (5 bzw. 7 Bewertungen laut eigener Seite). Keine Presse- oder Verbraucherschutzberichte gefunden.

## 6. Was die Projektdaten schon zeigen (gelesen, nichts geändert)

### Takeaway
Die eigenen Daten zeigen mit hoher Sicherheit, dass easyNova alle 58 Briefe angenommen, verarbeitet (Status 4 / `processedDate`) und **einzeln abgerechnet** hat. Dass die Briefe bei der Deutschen Post eingeliefert und zugestellt wurden, zeigen sie noch nicht. 0 Scans am 13.11. sind wegen der Laufzeiten noch kein Gegenbeweis.

### Cited Findings (Projektdateien)
- `packages/core/src/providers/mail/easynova.ts`: `mapEasyNovaStatus` bildet Status 99 auf `failed` ab, Status 4 **oder** gesetztes `processedDate` auf `sent`, Status 1–3 auf `queued`. Die Kosten (`easyNovaCostCents`) kommen aus `priceWithTax`, das erst nach der Abrechnung gefüllt ist. `getStatus` liest nur Status und Preis. `frankierID`, `printUploadDate`, `printFeedbackDate` und `destinationAreaStatus` werden **nicht** ausgewertet. `premiumAdress` und `addressCorrection` werden bewusst nicht gesendet. `testFlag` wird nur im Testmodus gesetzt.
- `docs/integrations.md` (easyNova-Abschnitt, geprüft 27.10.2026): Status 1–4/99 wie oben, „keine Webhooks, kein Storno-Endpunkt“ (inzwischen überholt, siehe Abschnitt 1). Preise erst nach Abrechnung, „typischerweise morgens am nächsten Produktionstag“. Testmodus: `testFlag`, kein Druck, das verarbeitete PDF kommt per E-Mail.
- `docs/entscheidungen.md`: 27.10. Wahl von easyNova mit dem Ablauf „3 Testaufträge → 1 echter Brief an den Betreiber → echte Leads“. Am 03.11. Go-Live mit „3/3 Testaufträge. Eigener physischer Probedruck auf Wunsch des Betreibers ausgelassen“. Laut CLAUDE.md wurde das Rückgabe-PDF der 3 Testaufträge geprüft. Am 13.11. ging ein echter Testbrief an die Testanschrift des Betreibers (81 Cent, geschätzte Zustellung 18.11.). Der QR-Code darin führt zur neuesten Demo, ein Scan des Betreibers wird gezählt und danach entfernt.
- Bekannte Daten vom 13.11. abends (vom Auftraggeber genannt): 58 echte Briefe, alle mit easyNova-letterID, alle verarbeitet, alle einzeln abgerechnet (zusammen 46,98 €), keiner als unzustellbar markiert. Alle 58 QR-Codes und Kurzlinks wurden getestet und führen zu funktionierenden Demos. Bisher 0 echte Scans. 36 Briefe gedruckt am 9.11. (Schätzung 12.11.), 22 am 11.11. (Schätzung 16.11.).

### Inferences — faire Bewertung
- **Spricht für ordnungsgemäße Verarbeitung:** eindeutige letterIDs; Status 4 mit Produktionsdatum; ein Preis je Brief, der laut API vom Druckdienstleister kommt und ohne Statuswechsel nachgetragen wird; Preis exakt gleich Listenpreis (0,81 € brutto); kein Status 99. Ein Anbieter, der nichts druckt, müsste diese Daten fälschen. Ausschließen lässt sich das aus den eigenen Daten nicht, wahrscheinlich ist es nicht. Dafür sprechen die Postlizenz der BNetzA, die ISO-Zertifikate und der seit Jahren bestehende Anbieter.
- **Noch nicht belegt:** Einlieferung bei der Post und Zustellung. Die Status-API reicht nur bis „Verarbeitung im Druckzentrum“.
- **0 Scans sind noch kein Warnsignal:** Rechnerisch (Abschnitt 3) sind die 22 Briefe vom 11.11. womöglich noch nicht zugestellt. Von den 36 Briefen vom 9.11. sind erst etwa 1 bis 2 Werktage seit der wahrscheinlichen Zustellung vergangen, und Betriebe lesen Werbepost oft verzögert. Aussagekräftig wird das Ausbleiben von Scans erst nach etwa 2 bis 3 Wochen.
- **Das wichtigste kommende Signal:** Ob der Testbrief vom 13.11. bis etwa 18.–19.11. ankommt, idealerweise vorher mit Foto in der Briefankündigung. Kommt er an, ist der Weg grundsätzlich belegt. Kommt er bis etwa 20.11. (E+4 plus Puffer) nicht an, ist das ein ernstes Warnsignal.

### Gaps
- Die Werte von `frankierID`, `printUploadDate`, `printFeedbackDate` und `destinationAreaStatus` für die 58 Briefe sind unbekannt, weil das Projekt sie nicht speichert. Rein lesender API-Abruf nötig.
- Die easyNova-Monatsrechnung für November kommt erst im Dezember. Dann prüfen, ob sie 59 Briefe zu je 0,68 € netto ausweist.

---

### Checkliste für den Betreiber (Zusammenfassung, Schluss aus den obigen Belegen)

**Beweise vom Anbieter**
1. Für alle 58 (59) Briefe rein lesend `GET /api/letter/{id}` abrufen und `processedDate`, `printUploadDate`, `printFeedbackDate`, `frankierID`, `destinationAreaStatus(Date)`, `priceWithTax` und `testFlag=false` sichern.
2. Im easyNova-Portal das Postausgangsbuch ansehen: Status „gedruckt / kuvertiert / verschickt“ je Brief.
3. Monatsrechnung im Dezember: Anzahl, Einzelpreise und Datum mit der eigenen Liste abgleichen.
4. Schriftlich beim Support fragen: Welches Postprodukt und welche Laufzeitklasse wird genutzt? Was bedeuten `frankierID` und `destinationAreaStatus`? Gibt es einen Einlieferungsnachweis oder eine Einlieferungsliste der Post je Tag? Ist Premiumadress „Report“ möglich und zu welchem Preis? Wohin gehen Rückläufer?

**Beweise von der Deutschen Post / Empfängerseite**
5. Für die eigene Anschrift und 1–2 Kontrolladressen die Briefankündigung aktivieren. Der Bestätigungscode kommt per Post, also rechtzeitig vor dem nächsten Stapel starten.
6. Testbrief vom 13.11.: Eingang und Datum notieren. Die Rücksendeangabe und die Frankierzone auf dem Umschlag fotografieren. Die Frankierart (Absender- bzw. Teilleistungsvermerk, Matrixcode) zeigt, wer eingeliefert hat.
7. Ab jetzt in jeden Stapel 2–3 Kontrollbriefe legen, gleicher Tag und gleicher Weg. Kosten je ca. 0,81 €.
8. Optional künftig Premiumadress setzen, falls freigeschaltet, für elektronische Meldungen unzustellbarer Briefe.

**Eigene Daten**
9. QR-Scans und Kurzlink-Aufrufe nach Stapel und Zeit seit der geschätzten Zustellung auswerten. Erst nach 2–3 Wochen beurteilen.
10. Rückläufer an der Absenderanschrift sammeln und im Lead-Detail erfassen.
11. Doku nachziehen: Status 4 = „im Druckzentrum verarbeitet“. Es gibt inzwischen einen Storno-Endpunkt (`POST /api/letter/cancel`).

**Warnsignale**
- Testbrief oder Kontrollbriefe kommen nicht bis etwa E+4 plus 2 Werktage an (Testbrief: ungefähr nach dem 20.11.).
- Nach ca. 3 Wochen weder ein einziger Scan noch ein einziger Rückläufer aus 58 Briefen.
- `frankierID` bzw. `destinationAreaStatus` bleiben dauerhaft leer, obwohl der Status 4 ist. Das ist nur ein Signal, wenn der Support bestätigt, dass die Felder gefüllt sein sollten.
- Die Rechnung weicht von den API-Preisen ab, oder der Support kann keinen Einlieferungsweg nennen.
- Briefe hängen dauerhaft auf Status 1–3, oder es kommen Preise ohne `processedDate`.
