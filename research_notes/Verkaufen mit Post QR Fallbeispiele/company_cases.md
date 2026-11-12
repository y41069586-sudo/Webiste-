# Fallbeispiele: Verkaufen per Brief/Postkarte mit QR-Code – Zeitverlauf (Scan, Spitze, Abschluss)

Kontext: 58 Briefe mit QR-Code zu einer persönlichen Demo-Website an Handwerksbetriebe in Deutschland, Zustellung 12.–17.11.2026. Recherche am 12.11.2026.
Kennzeichnung: [DE]/[UK]/[US]/[CA]/[?] = Land der Daten; [Anbieter] = Fallstudie oder Blog eines Dienstleisters mit Eigeninteresse, nicht unabhängig geprüft.
Abgrenzung: Die Scan-Kurve der CMC-Studie 2023 und Rücklauf-Benchmarks sind schon in `../Scan Zeitpunkt nach Briefzustellung/qr_timing.md` und `../Verkäufe aus versendeten Werbebriefen/benchmarks.md` ausführlich beschrieben. Hier stehen sie nur als Bezugsgröße.

Gesamtergebnis vorweg: **Ich habe keine einzige Firmen-Fallstudie gefunden, die für einen QR-Brief zugleich Stückzahl, Scan-Quote, Tagesverlauf der Scans (erster Scan, Spitzentag, Anteil nach 1/2/4 Wochen) und Verkaufszyklus veröffentlicht.** Die Fallstudien der Anbieter (Lob, Uniqode, PostcardMania, Yotru, SaaSMQL, Sapper) nennen Ergebnisse, aber fast nie Zeitstempel. Belastbare Zeitkurven gibt es nur aggregiert: die CMC-Studie [DE] und Matchback-Angaben von Postie [US, Anbieter].

---

## 1. Fallstudien der Direct-Mail- und QR-Plattformen (Lob, PostGrid, Postalytics, Stannp, PFL, Sendoso, Uniqode …) mit Zeitangaben

### Takeaway
Die Plattformen veröffentlichen Scan-Quoten und Ergebnisse, aber keine Tageskurven je Kampagne. Die einzigen quantitativen Zeitangaben sind Durchschnittswerte über viele Kampagnen: Postie nennt eine Spitze bei 7–14 bzw. 14–21 Tagen nach Zustellung, LinkBreakers eine Abklingtabelle. Beide sind Herstellerangaben ohne offengelegte Methode. Die einzige methodisch beschriebene Kurve ist die deutsche CMC-Studie (B2C-Bestandskunden): 54 % der Scans in Woche 1, 73 % in den ersten 14 Tagen.

### Cited Findings
- **[US/?, Anbieter] Lob – Branch (Versicherung, Bestandskunden, kein B2B-Kaltkontakt):** 5.000 Postkarten in einer automatisierten Kampagne, „25–30 percent QR code scan rate from mailed letters“, 25 % bessere Kundenbindung. **Keine Zeitangabe** zu Scans nach Zustellung. — [Lob Case Study Branch](https://www.lob.com/case-studies/branch)
- **[US, Anbieter] Lob-Blog zu Versand-, Zustell- und Reaktionsdatum (März 2026):** empfiehlt, die Messung ab dem Zustelldatum („in-home date“) und mit einem festen Fenster („a set number of days post-delivery“) zu führen. Keine Zahlen, nur „it depends on your offer and buying cycle“. — [Lob Blog](https://www.lob.com/blog/drop-date-vs-in-home-date-vs-response-date)
- **[US, Anbieter] Postie (Matchback „across hundreds of campaigns“):** „mail-driven conversions peak at 14–21 days after in-home delivery“, „meaningful tail extending to 45–60 days for higher-consideration purchases“, empfiehlt für Modelle eine Halbwertszeit von 14–21 Tagen. Keine Stichprobengröße, kein Zeitraum, kein Kampagnentyp angegeben. — [Postie Blog](https://postie.com/blog/why-most-media-mix-models-structurally-undervalue-direct-mail/)
- **[US, Anbieter] Widerspruch innerhalb von Postie:** Eine andere Postie-Seite nennt laut Suchauszug eine Spitze bei 7–14 Tagen nach Zustellung mit Nachlauf bis 45 Tage und eine Halbwertszeit von ca. 10–18 Tagen (Seite nicht im Volltext geprüft). — [Postie](https://postie.com/blog/building-an-in-house-media-mix-model-heres-how-to-make-sure-direct-mail-gets-counted-correctly/)
- **[global, Anbieter] LinkBreakers, Abklingwerte für QR auf Direct Mail/Postkarte** (normiert auf Woche 1 = 100 %, „medians from aggregated campaign data“, ohne Fallzahl): Woche 1 = 100 %, Wochen 2–4 = 40–60 %, Monat 2 = 10–20 %, Monate 3–6 = 3–8 %, ab 6 Monaten 1–3 %. Unklar ist, ob „Wochen 2–4“ pro Woche oder zusammen gemeint ist. Eine Halbwertszeit wird nicht genannt. — [LinkBreakers](https://linkbreakers.com/help/article/qr-code-campaign-lifespan-scan-decay-benchmarks)
- **[DE, Studie mit Deutscher Post; offengelegte Methode] CMC Print-Mailing-Studie 2023:** 45 Online-Shops, 1.417.873 Mailings an Bestandskunden. „73 % der … QR-Codes wurden in den ersten 14 Tagen gescannt“, Wochenverteilung laut Diagramm: W1 54 %, W2 19 %, W3 7 %, W4 3 %. Hochgerechnet besucht „nahezu jede:r fünfte“ Empfänger den Shop. Bestellungen kommen dagegen langsamer: 38 % in den ersten 14 Tagen nach Versand, 47 % ab der fünften Woche. Durchschnittliche Conversion Rate 5,4 %. — [CMC/Deutsche Post 2023 (PDF)](https://www.deutschepost.de/dam/jcr:2d2aac21-29d2-4154-a912-f9873a49ada3/dp-cmc-print-mailing-studie-2023-bestandskundenaktivierung.pdf) (Text per pdftotext geprüft; Wochenwerte aus `qr_timing.md` übernommen)
- **[CA, Anbieter] Uniqode – Direct Response Media Group:** über 68.000 Scans von mehr als 28.000 einzelnen Nutzern in über 200 kanadischen Städten. Kein Zeitverlauf, keine Stückzahl. — [CaseStudies.com/Uniqode DRMG](https://www.casestudies.com/company/uniqode/case-study/direct-response-media-group-drives-68000-direct-mail-engagements-with-uniqode)
- **[?, Anbieter] Uniqode – Rose Marketing Solutions:** ca. 2.800 Scans, über 2.000 Leads („nearly 75%“, rechnerisch ca. 71 %). Kein Brief belegt, keine Zeitangabe. Für Post-Briefe nicht verwertbar. — [CaseStudies.com/Uniqode Rose](https://www.casestudies.com/company/uniqode/case-study/rose-marketing-solutions-generates-2000-leads-with-75-conversion-using-uniqode)
- **[UK/EU] Stannp:** Hilfeseiten beschreiben nur die Funktion (dynamischer QR-Code je Empfänger, Auswertung je Person). Eine Fallstudie mit Tageskurve habe ich nicht gefunden. — [Stannp Knowledge Base](https://knowledge.stannp.com/eu/adding-qr-codes)
- **[US] PFL und Sendoso:** keine Fallstudie mit Zeit bis zur Reaktion oder zum Termin gefunden. Die gefundene Sendoso-Kundengeschichte nennt keine Kennzahlen. — [Sendoso Invoca](https://www.sendoso.com/success-stories/%20invoca)

### Inferences
- Der Unterschied „Scans schnell, Käufe langsam“ zeigt sich in der einzigen sauberen Quelle (CMC [DE]): 73 % der Scans fallen in 14 Tage, aber nur 38 % der Bestellungen. Für ein Angebot mit längerer Überlegung (597 € Website) ist der Abschluss eher später zu erwarten als der Scan.
- Postie (Spitze der Conversions bei 7–21 Tagen) passt dazu, dass Käufe einige Tage bis Wochen nach dem Scan kommen. Die Zahl ist aber US-Matchback, B2C und nicht prüfbar.

### Gaps
- PostGrid, Postalytics, Inkit, Poplar, Thanks.io, Mailmodo und QR Code Generator PRO: keine Fallstudie mit Zeitangaben gefunden (Postalytics nur ROI-Benchmarks).
- Keine Plattform veröffentlicht „Zeit bis zum ersten Scan“ als Median je Kampagne.

---

## 2. B2B-Kampagnen (SaaS, Agenturen, Gewerbe) mit Zeitverlauf und Verkaufszyklus

### Takeaway
Die wenigen B2B-Fälle mit Zeitangaben arbeiten alle mit **aktivem Nachfassen per Telefon oder E-Mail** und messen Termine, nicht Scans. Typisch sind Termine innerhalb von etwa 30 Tagen und erste Abschlüsse nach etwa 6 Wochen (Sapper). Ein reiner QR-Brief ohne Nachfassen ist in keinem dieser Fälle dokumentiert.

### Cited Findings
- **[US vermutlich, Anbieter] Sapper Consulting – regionaler Stahlhändler:** eine angepasste Fallstudie per Post an **75 Werksleiter**, „followed up with phone calls within 3 days of delivery“. **Nach 30 Tagen:** 48 Telefonkontakte, **11 Verkaufstermine** (≈ 15 % der Empfänger). **3 Neukunden innerhalb von 6 Wochen** (4 %), 2,1 Mio. $ Pipeline (nicht Umsatz). Datum des Beitrags 15.05.2025, Kampagnenjahr unbekannt, die Bundesstaaten (IN, OH, MI) deuten auf die USA. — [Sapper Consulting](https://www.sapperconsulting.com/tag/direct-mail-marketing)
- **[UK, Awards-Fallstudie 2017] KCOM (Telekommunikation, Großunternehmen):** 500 Pakete (Dimensional Mail), **25 % der Firmen stimmten einem Erstgespräch zu** (Ziel 10 %), 28 neue Kundengespräche, 15,7 Mio. £ Pipeline, Kosten 22.270 £. Zeitverlauf: Kampagne August–November, erste Termine mit Budget im November. Kein abgeschlossener Umsatz genannt („discussions are ongoing“). Liegt außerhalb des Zeitraums 2019–2026. — [B2B Marketing](https://www.b2bmarketing.net/case-studies/how-kcom-achieved-a-25-conversion-rate-by-using-direct-mail)
- **[?, Agentur] SaaSMQL – Intellimize (B2B-SaaS):** 800 Zielaccounts, Post kombiniert mit E-Mail und LinkedIn. Weinpaket an 250 Entscheider in 200 Accounts für 9.380 $. Ergebnis: **54 Opportunities, über 4,6 Mio. $ ARR-Pipeline**. Zur Zeit nur „faster sales cycle“, ohne Tage. Veröffentlicht 03.09.2020. — [SaaSMQL](https://www.saasmql.com/blog/case-study-targeted-direct-mail)
- **[?, Agentur] SaaSMQL, eigenes ABM-Programm:** laut Suchauszug **16 % von zugestellter Sendung zu gebuchtem Erstgespräch** (nicht im Volltext geprüft). — [SaaSMQL B2B Direct Mail Examples](https://www.saasmql.com/blog/b2b-direct-mail-examples)
- **[?, Anbieter] Yotru – Vigour Marketing (Marketing für Studios):** 359 personalisierte Karten an Studio-Inhaber, **8 Termine** (2,2 %), „12x“ Rendite. Keine Zeitangaben, keine Scan-Quote. — [Yotru Case Studies](https://yotru.com/case-studies)
- **[US, Agentur 2026] Scribendi – „B2B service company“:** Post mit QR auf eigene Landingpage plus drei E-Mails in den Wochen 2–4. 596 Seitenbesuche (QR und E-Mail zusammen), **11 qualifizierte Leads** (1,85 % der Besuche). Zeitverlauf nur qualitativ: Woche 1 Zustellung und „initial scans/visits“, Verkehr stieg bis Woche 4 weiter, Auswertung in Woche 5, insgesamt unter 5 Wochen. Keine Stückzahl, keine Scan-Zahl, kein Abschluss. Allgemeine Aussage: „qualified leads typically emerge within 2-4 weeks of the mail drop“. — [Scribendi](https://www.scribendi.net/blog/general-marketing/2026-direct-mail-case-study/)
- **[?, Anbieter] Lettr Labs:** Ein Payroll-Startup gewann mit einem Geschenk-Mailing **18 Termine aus 60 Empfängern** (30 %). Keine Zeitangabe. — [Lettr Labs](https://www.lettrlabs.com/post/b2b-direct-mail)
- **[US, Anbieter] Topline Film** (laut Suchauszug Sapper/Branchenblog): Pakete an 50 Interessenten, 5 Termine, 2 Neukunden. Keine Zeitangabe, nicht im Volltext geprüft. — [Sapper Consulting](https://www.sapperconsulting.com/tag/direct-mail-marketing)
- **[DE] CMC 2025, B2B-Auswertung (Deutsche-Post-Blog):** Conversion B2B 2,8 % vs. B2C 4,1 %, 47 % der Bestellungen erst ab Woche 5 nach Versand, keine Scan-Zeitkurve (aus den Vor-Notizen übernommen). — [Deutsche Post Blog](https://www.deutschepost.de/de/p/print-mailing/insights/blog/b2b-marketing-print-mailings.html)

### Inferences
- Die hohen B2B-Quoten (15–30 % Termine) gehören zu **teuren Paketen oder Geschenken an wenige Entscheider plus Telefon-Nachfassen**. Beides ist in diesem Projekt nicht vorgesehen (kein Kaltanruf nach § 7 UWG). Auf einen normalen Brief mit QR-Code lassen sich diese Quoten nicht übertragen.
- Wo ein Abschluss belegt ist, liegt er bei **etwa 4–6 Wochen nach Zustellung** (Sapper: 3 Kunden in 6 Wochen). Die CMC-Daten [DE] zeigen ebenfalls, dass fast die Hälfte der Käufe erst ab Woche 5 kommt.

### Gaps
- Keine B2B-Fallstudie misst Tage von der Zustellung bis zum ersten Scan oder bis zum Kauf ohne Nachfassen per Telefon.
- Kein deutscher B2B-Fall mit QR-Brief und Verkaufszyklus gefunden.

---

## 3. Lokale Dienstleister (Dachdecker, Handwerker, Garten, Hausdienste) mit QR-Postkarten: wie schnell kamen Scans und Anfragen?

### Takeaway
Die dokumentierten Fälle aus dem lokalen Gewerbe (alle USA, alle von Anbietern) zeigen **niedrige Scan-Zahlen bei Massenpostkarten** (z. B. 15 Scans auf 6.000 Karten) und messen meist Anrufe statt Scans. Nur eine Quelle nennt eine Zeitangabe („die meisten Scans innerhalb von 2 Tagen nach Ankunft“), und auch die ist ein unbelegter Blog-Fall.

### Cited Findings
- **[US, Anbieter] PostcardMania – Dachdecker in Clearwater, Florida:** 6.000 Postkarten mit QR-Code und Angebot (62 $/Monat). **15 QR-Scans** (≈ 0,25 %), 8 Reaktionen, 6 Neukunden. Zeitraum der Scans nicht genannt. Laut Suchauszug, Seite lieferte beim Abruf HTTP 403. — [PostcardMania](https://www.postcardmania.com/case-studies/roofing/clearwater-florida-roofing/)
- **[US, Anbieter] Valpak – Dachdecker/Pflasterbetrieb:** eigene Telefonnummer, URL und QR-Code je Sendung. Der Erfolg kam durch **wiederholte Aussendungen über mehrere Saisons**, nicht durch einen einzelnen Versand. Lead-Anrufe +29 % gegenüber dem Vorjahr. — [Valpak](https://www.valpak.com/advertise/case-study/roofing-paving-direct-mail-postcards-lead-generation-case-study)
- **[US, Anbieter] Yotru, Seite für Dachdecker:** „27% unique QR scan rate“ auf einer Produktseite, nicht als Fallstudie mit Stückzahl und Zeitraum belegt. — [Yotru Roofing](https://yotru.com/industries/roofing)
- **[US?, Anbieter-Blog] Kleine Kampagne mit kostenloser Inspektion als Angebot:** über **3 Wochen 120 Scans und 18 qualifizierte Leads**, „most scans happened within 2 days of mail arrival“ (laut Suchzusammenfassung; Stückzahl und Firma nicht genannt, Primärquelle nicht eindeutig zugeordnet). — Kandidaten: [QR Insights](https://www.qr-insights.co.uk/blog/qr-code-tracking-direct-mail), [twodollarqr](https://twodollarqr.com/blog/qr-code-on-direct-mail)
- **[US, Anbieter, 2011–2012, außerhalb des Zeitraums] Mail Shark – Pizzeria:** 10.000 Postkarten (1.000 pro Woche über 10 Wochen, 21.11.2011–30.01.2012), **über 550 Scans (≈ 5,5 %)** bis 29.02.2012. Keine Wochenverteilung, keine Einlösungen. — [Mail Shark](https://www.themailshark.com/resources/blog/using-qr-code-coupons-for-direct-mail/)
- **[UK, Anbieter] QR Insights:** allgemeine Faustregel ohne Datenbasis: Scans beginnen 2–3 Tage nach dem Versand (wegen der Postlaufzeit), Spitze in der ersten Woche, Ausklingen über 2–4 Wochen. Messfenster mindestens 2–4 Wochen. — [QR Insights](https://www.qr-insights.co.uk/blog/qr-code-tracking-direct-mail)
- **[US, Anbieter] ForeverScan (Baustellenschilder, nicht Post):** 47 Scans, 23 Formulare, 8 Aufträge. Nur als Vergleich für Scan → Auftrag im Handwerk, nicht für Post. — [ForeverScan](https://foreverscanqr.com/blog/lead-capture-qr-code-service-businesses)

### Inferences
- Bei Massenpostkarten an Haushalte liegt die Scan-Quote im Bereich 0,25–5,5 %. Ein persönlich adressierter Brief mit einer **eigens gebauten Demo des Betriebs** ist eher mit personalisierten B2B-Sendungen vergleichbar (Stannp-Median 1,63 % Interaktion, Spitzen ≥ 5 %, siehe `benchmarks.md`). Belegt ist das nicht.
- Die einzige Zeitangabe aus dem lokalen Gewerbe (Großteil der Scans in 2 Tagen) und die CMC-Kurve [DE] (54 % in Woche 1) deuten auf einen schnellen Beginn hin. Für die 58 Briefe heißt das: Wenn es Scans gibt, kommt etwa die Hälfte voraussichtlich **bis ca. 19.–24.11.2026** und rund drei Viertel **bis ca. 26.11.–01.12.2026**.

### Gaps
- Kein Fall mit Tagesverlauf (erster Scan, Spitzentag) für Handwerker- oder Hausdienste-Postkarten gefunden.
- Kein deutscher Fall aus dem lokalen Handwerk gefunden.
- Kein dokumentierter Fall „Agentur schickt Demo-Website per Brief an Betriebe ohne Website“ mit Ergebnissen. Die Suche ergab nur Werkzeuge und Ratgeber für Kalt-E-Mails mit Demo-Link (z. B. [LocalReachHQ](https://www.localreachhq.com/), [PreyReach](https://preyreach.com/guides/cold-email-businesses-without-websites/)) ohne Ergebniszahlen. Die Reddit- und Indie-Hackers-Anekdoten stehen in `benchmarks.md` und `tactics.md`.

---

## 4. Gemessene Werte für „Zeit bis zum ersten Scan“ und „Halbwertszeit“

### Takeaway
Eine sauber gemessene Halbwertszeit für QR-Scans auf Briefen habe ich nirgends gefunden. Aus der CMC-Kurve [DE] lässt sich aber ableiten, dass die **Hälfte aller Scans innerhalb der ersten Woche nach Versand** erfolgt (54 % in W1). Die Herstellerangaben von 10–21 Tagen (Postie) beziehen sich auf **Käufe bzw. Conversions**, nicht auf Scans.

### Cited Findings
- **[DE]** CMC 2023: W1 54 %, W2 19 %, kumuliert 73 % nach 14 Tagen. Die Hälfte der Scans fällt also in die erste Woche nach Versand (die Zustellung dauert laut CMC 2021 üblicherweise 2–4 Tage nach dem Versandtermin). — [CMC 2023 (PDF)](https://www.deutschepost.de/dam/jcr:2d2aac21-29d2-4154-a912-f9873a49ada3/dp-cmc-print-mailing-studie-2023-bestandskundenaktivierung.pdf); [CMC 2021 (PDF)](https://alles-ueber-mailings.deutschepost.de/dam/dmcp/download/dp-cmc-print-mailing-studie-2021-bestandskundenaktivierung-082021.pdf) (Angabe zur Zustellung laut Suchauszug)
- **[US, Anbieter]** Postie: Halbwertszeit der Conversions 14–21 Tage bzw. 10–18 Tage (die eigenen Seiten widersprechen sich), Spitze 7–14 bzw. 14–21 Tage nach Zustellung, Nachlauf 45–60 Tage. — [Postie](https://postie.com/blog/why-most-media-mix-models-structurally-undervalue-direct-mail/)
- **[global, Anbieter]** LinkBreakers: Spitze in den Tagen 1–7 nach dem Start, steiler Rückgang in den Wochen 2–4, Nachlauf über Monate. Keine Halbwertszeit genannt. — [LinkBreakers](https://linkbreakers.com/help/article/qr-code-campaign-lifespan-scan-decay-benchmarks)
- **[UK, Anbieter]** Stannp: Interaktionen können noch Wochen nach der Zustellung kommen, frühe Ergebnisse unterschätzen also das Endergebnis. — [Stannp Blog](https://go.stannp.com/blogs/understanding-direct-mail-engagement-rates-what-to-expect-how-to-improve)
- **[US?, Anbieter]** Eine einzelne Blog-Fallangabe: „most scans happened within 2 days of mail arrival“ (siehe Abschnitt 3, Quelle nicht eindeutig).

### Inferences
- Praktische Faustregel für die 58 Briefe: Scan-Halbwertszeit **ca. 5–7 Tage ab Zustellung**, Kauf-Halbwertszeit **eher 2–5 Wochen** (CMC: 47 % der Bestellungen ab Woche 5; Sapper: Abschlüsse nach 6 Wochen; Postie: Spitze bei 14–21 Tagen). Die Scan-Halbwertszeit ist aus der CMC-Kurve abgeleitet und nicht direkt gemessen.
- Bei 58 Briefen erzeugen kleine Zahlen große Schwankungen: Bei 1,6–5 % Interaktion sind 1–3 Scans zu erwarten, bei 27 % (Yotru-Höchstwert, unbelegt) etwa 16. Eine Abschlussquote von 1–3 % pro Betrieb (siehe `benchmarks.md`) ergibt rechnerisch 0,6–1,7 Verkäufe. **0 Verkäufe in den ersten 4 Wochen wären mit allen Fallstudien vereinbar**, eine Aussage über den Erfolg ist frühestens nach etwa 6–8 Wochen sinnvoll.

### Gaps
- Kein Anbieter (Lob, PostGrid, Postalytics, Stannp, Uniqode u. a.) veröffentlicht eine gemessene „Zeit bis zum ersten Scan“ (Median) oder eine Scan-Halbwertszeit mit Methode.
- Alle Zeitangaben für den Verkaufszyklus stammen aus US-/UK-Fällen mit Telefon-Nachfassen oder aus B2C-Bestellungen [DE]. Für B2B-Käufe über 500 € nur per Brief und Self-Checkout gibt es keine Daten.
