# Einordnung: 0 echte Scans aus 58 Briefen (Stand 17.11.2026)

Ausgangslage (vom Auftraggeber genannt): 58 Werbebriefe an Handwerksbetriebe, DIN-lang-Fensterumschlag, über easyNova (digiBrief), gedruckt am **Mo 09.11.2026 (36 Briefe)** und **Mi 11.11.2026 (22 Briefe)**, normale Geschäftspost über die Deutsche Post. Heute ist **Di 17.11.2026**. Bisher 0 echte QR-Scans, 1 Brief kam als unzustellbar zurück. Gerechnet wird daher mit **57 zugestellten Briefen** (35 aus dem ersten, 22 aus dem zweiten Stapel; welcher Stapel den Rückläufer hatte, ist für das Ergebnis unerheblich).

Wiederverwendet aus früheren Notizen: `research_notes/Scan Zeitpunkt nach Briefzustellung/` (CMC-Scan-Kurve), `research_notes/Erster Scan bei ähnlichen Anbietern/` (Laufzeiten, QRLynx, Praxisfälle), `research_notes/easyNova Seriosität prüfen/delivery_verification.md` (Statusmodell, Teilleistung, Rückläufer). Wochentage für November 2026 per Kalender geprüft (09.11. = Mo, 11.11. = Mi, 14.11. = Sa, 17.11. = Di). Alle Rechnungen sind eigene Rechnungen (Skript im Scratchpad, Formeln unten), keine Quelle.

---

## (a) Wann wurden die Briefe wahrscheinlich zugestellt? (Laufzeiten nach dem Postgesetz 2025, Teilleistung, Dialogpost)

### Takeaway
Wahrscheinlich kamen die 36 Briefe vom 09.11. zwischen **Mi 11.11. und Sa 14.11.** an (am ehesten Do 12.11.), die 22 Briefe vom 11.11. zwischen **Fr 13.11. und Di 17.11.** (am ehesten Sa 14.11., also für einen Betrieb faktisch erst Mo 16.11. auf dem Tisch). Für den zweiten Stapel ist damit heute erst 0–4 Tage „Lesezeit“ vergangen, für den ersten 3–6 Tage. Der Rückläufer belegt außerdem, dass Briefe tatsächlich in den Postlauf gegangen sind.

### Cited Findings
- Postgesetz seit 01.01.2025: mindestens 95 % der Briefe am 3. Werktag und 99 % am 4. Werktag nach Einlieferung (vorher 80 % E+1). Die Laufzeit hat sich laut Post im Schnitt um etwa 0,6 Tage verlängert. — [test.de, Neues Postgesetz](https://www.test.de/neues-postgesetz-6127885-0/); [Logistik Heute, neues Zustellsystem](https://logistik-heute.de/news/briefdienste-neues-zustellsystem-sorgt-haeufiger-fuer-leere-briefkaesten-272469.html) (aus früherer Notiz übernommen)
- Deutsche Post meldet für 2025 nach eigener Messung 97,4 % in 3 und 99,0 % in 4 Werktagen. Die Bundesnetzagentur kann das nicht unabhängig prüfen, weil die Vergabe des Messauftrags wegen eines Rechtsstreits gestoppt ist. — [Logistik Heute](https://logistik-heute.de/news/postversand-ob-der-postmann-puenktlich-klingelt-ist-unklar-246507.html); [Techbook](https://www.techbook.de/shop-pay/shops-marktplaetze/brieflaufzeiten-bundesnetzagentur-2028) (aus früherer Notiz übernommen)
- Deutsche Post (Seite „Wann kommt mein Brief an?“, heute abgerufen): „Standardbriefe werden in der Regel innerhalb von 2 Werktagen zugestellt“, „laut Postgesetz müssen sie spätestens nach 4 Werktagen beim Empfänger sein“. Dialogpost erreicht ihr Ziel „meist innerhalb unseres Qualitätsziels von vier Werktagen“. „Werktage: Montag bis Samstag (ausgenommen Feiertage)“. Ursachen für Verzögerungen: „falsche oder unvollständige Adressen, hohes Sendungsaufkommen, extreme Wetterbedingungen“, „Feiertage oder Verzögerungen beim Absender (z. B. spätes Einliefern)“. — [Deutsche Post, Postgesetz/Laufzeiten](https://www.deutschepost.de/de/p/postgesetz.html)
- Teilleistungen Brief (rabattierte Einlieferung durch Großkunden/Konsolidierer, heute abgerufen): „Teilleistungen Basis“ und „Teilleistungen ID“ mit „Regellaufzeit E+1 bis 2“; dazu: „Die Zustellung erfolgt zuverlässig in der Regel am übernächsten Werktag (E+2: ~90% )“. Die teurere Variante „Teilleistungen E+1“ erreicht ca. 85 % am nächsten Werktag. Rabatte (Format Standard, bis 31.12.2026): Basis BZE 47 %, ID BZE 50 %, E+1 BZE 45 %; BZA-Rabatte niedriger. — [Deutsche Post, Teilleistungsportfolio Brief](https://www.deutschepost.de/de/b/brief_postkarte/teilleistungen_brief.html)
- Dialogpost: Regellaufzeit **E+4**, Zustellung nur **dienstags bis samstags**; „Dabei handelt es sich um ein Qualitätsziel und nicht um eine Laufzeitzusage.“ — [Deutsche Post, Versandhandling 2026 (PDF)](https://www.deutschepost.de/dam/jcr:c04d3395-6cd3-45b8-8ee5-ab8a82dabb83/dp-prd-handling-broschuere-2026.pdf) (aus früherer Notiz übernommen)
- Dialogpost hat Mindestmengen (bundesweit 5.000, Dialogpost EASY ab 500, regional 200 je Leitregion). — [Deutsche Post Dialogpost-FAQ](https://www.deutschepost.de/de/p/print-mailing/dialogpost-faq.html) (Werte aus früherer Notiz, dort nur über Suchergebnisse)
- easyNova nennt weder Postprodukt noch Laufzeit; Preis Standardbrief ab 0,65 € netto (also unter dem Einzelporto von 0,95 €), eigene Postlizenz, Zustellung „mit GoGreen Plus der Deutschen Post“. Der API-Status endet bei „4 – Verarbeitung im Druckzentrum“, „Ein Zustellergebnis kann Tage später folgen.“ — [easyNova digiBrief](https://www.easynova.de/produkte/digibrief/); [easyNova API-Schnittstelle](https://www.easynova.de/produkte/digibrief/automatisierung/api-schnittstelle/) (aus früherer Notiz übernommen)
- Für normale Briefe gibt es keinen Zustell-Scan: „Bei normalen Briefen mit Matrixcode gibt es keinen Scan bei der Zustellung.“ — [Deutsche Post, Briefversand 2025](https://www.deutschepost.de/de/p/post2025/blogartikel-briefversand-2025.html) (aus früherer Notiz übernommen)
- Die Post stellt seit 2025 häufiger nicht mehr täglich zu („leere Briefkästen“), dadurch schwankt der Zustelltag stärker. — [Logistik Heute](https://logistik-heute.de/news/briefdienste-neues-zustellsystem-sorgt-haeufiger-fuer-leere-briefkaesten-272469.html) (aus früherer Notiz übernommen)

### Inferences
- Weil easyNova unter Porto verkauft und eine Postlizenz hat, liefert es sehr wahrscheinlich über **Teilleistung (Basis oder ID, E+1 bis 2)** ein, nicht als Dialogpost (Mindestmengen passen nicht zu Einzelbriefen) und nicht als teure E+1-Teilleistung. Daraus folgt als Regelfall: **Zustellung E+2 nach Einlieferung**, mit Ausreißern bis E+4. Ob zwischen Druck und Einlieferung noch ein Werktag liegt, ist nicht dokumentiert.
- Drei Szenarien (Werktage Mo–Sa):

| Szenario | Annahme | Stapel 1 (36, Druck Mo 09.11.) | Stapel 2 (22, Druck Mi 11.11.) | Tage seit Zustellung am 17.11. (S1 / S2) |
|---|---|---|---|---|
| Optimistisch | Einlieferung am Drucktag, E+2 | Mi 11.11. | Fr 13.11. | 6 / 4 |
| **Mittel (wahrscheinlich)** | Einlieferung 1 Werktag nach Druck, E+2 | Do 12.11. | Sa 14.11. → im Betrieb faktisch Mo 16.11. | 5 / 1 |
| Pessimistisch | Einlieferung +1 Werktag, E+4 (Dialogpost-artig) | Sa 14.11. → faktisch Mo 16.11. | Di 17.11. (heute) | 1 / 0 |

- Die bisherige interne Schätzung (12.11. bzw. 16.11., `DELIVERY_BUSINESS_DAYS=3`) liegt im mittleren Szenario. Samstagszustellungen an Werkstätten oder Büros werden oft erst am Montag gesehen (eigene Annahme, kein Beleg).
- **Der Rückläufer ist ein gutes Zeichen für die Lieferkette:** Ein Brief kann nur als unzustellbar zurückkommen, wenn er gedruckt, eingeliefert, sortiert und einem Zusteller übergeben wurde. Damit ist für mindestens einen Brief belegt, dass er im Postlauf war. Das macht „easyNova hat nicht eingeliefert“ als Erklärung für 0 Scans deutlich unwahrscheinlicher (eigener Schluss).
- Bei 57 Briefen und 99 % Zustellung bis E+4 ist im Mittel höchstens etwa 1 Brief deutlich verspätet. Verspätung erklärt also nicht 0 Scans aus dem ersten Stapel, sondern nur, warum der zweite Stapel noch kaum zählt.

### Gaps
- Welches Teilleistungsprodukt easyNova nutzt und ob am Drucktag eingeliefert wird, ist öffentlich nicht beschrieben (Frage an den Support; alternativ `destinationAreaStatusDate` aus der API lesen, falls es den Bearbeitungstag im Briefzentrum Eingang meint, siehe easyNova-Notiz).
- Keine unabhängige Laufzeitmessung für 2025/2026 (BNetzA-Messauftrag gestoppt). Keine Daten zur Laufzeit im November speziell. Die Weihnachts-Pressemitteilung der DHL Group 2026 war beim Abruf nicht erreichbar (HTTP 503).

---

## (b) Wie wahrscheinlich sind 0 Scans bis heute, je nach Scanquote und Antwortkurve?

### Takeaway
**0 Scans bis heute sind bei jeder realistischen Scanquote bis 5 % das wahrscheinlichste oder ein häufiges Ergebnis.** Im mittleren Zustell-Szenario liegt P(0 Scans bis heute) bei 79–89 % für 1–2 % Scanquote, bei 42–64 % für 5 % und selbst bei 10 % noch bei 17–41 %. Nur eine sehr hohe Quote (≥ 10 %) mit schneller Kurve wird durch die Null schon heute etwas unwahrscheinlich.

### Cited Findings (Grundlagen für die Annahmen)
- Einzige belegte Scan-Zeitkurve (DE, CMC 2023, 1,42 Mio. Mailings an Bestandskunden von Online-Shops, gemessen **ab Versand**): Woche 1 = 54 %, Woche 2 = 19 %, Woche 3 = 7 %, Woche 4–5 je 3 %, danach ca. 1–2 % pro Woche; 73 % der Scans in 14 Tagen. — [CMC Print-Mailing-Studie 2023, S. 16 (PDF)](https://www.deutschepost.de/dam/jcr:2d2aac21-29d2-4154-a912-f9873a49ada3/dp-cmc-print-mailing-studie-2023-bestandskundenaktivierung.pdf) (aus früherer Notiz übernommen)
- Briefe bleiben in UK-Haushalten im Schnitt ca. 7–9 Tage und werden ca. 4,4–4,8-mal in die Hand genommen (Haushaltspanel, keine Betriebe). — [Royal Mail MarketReach, JICMAIL Q1 2026](https://www.marketreach.co.uk/blog/jicmail-q1-2026-results) (aus früherer Notiz übernommen)
- In Handwerksbetrieben liegt die Büroarbeit oft bei der Partnerin oder wird vom Inhaber abends erledigt; Daten zur Bearbeitung von Werbepost gibt es nicht. — siehe `research_notes/Wann Handwerker ihre Post lesen/handwerk_office_routines.md` (itb/UFH-Studie, dort zitiert)
- Scanquoten-Benchmarks (keine B2B-Kaltquelle mit offengelegter Methode): Stannp-Median 1,63 % QR-Engagement (Spanne ca. 0,4–3,6 %, Top 5,29 %+, 5 Mio. Sendungen 2025, Anbieter) — [Stannp](https://go.stannp.com/blogs/understanding-direct-mail-engagement-rates-what-to-expect-how-to-improve); deutsche Mailing-Literatur 0,5–2 % Reaktion bei klassischen Kaltmailings — [business-schreibkurse.de, Rücklaufquoten](https://www.business-schreibkurse.de/kurse/werbebriefe/einfuehrung/ruecklauf-quoten/) (aus früherer Notiz übernommen); ANA/DMA 2025 Kaltlisten 2,0–4,4 % Reaktion (Zweitquelle) — [4over4](https://www.4over4.com/statistics/direct-mail-response-rate-benchmarks); Anbieter-Fälle mit stark personalisierten Postkarten 7–27 % Scanquote (Yotru, Lob, ohne unabhängige Prüfung); Yotru selbst: „no reliable public benchmark“ für B2B-Scanquoten — [Yotru](https://yotru.com/blog/b2b-direct-mail-statistics) (alle aus früheren Notizen übernommen)

### Rechnung (eigene Rechnung)

**Modell.** Jeder zugestellte Brief führt mit Wahrscheinlichkeit *p* (endgültige Scanquote) irgendwann zu einem Scan. Ob dieser Scan bis heute schon passiert ist, hängt von der Antwortkurve *F(t)* ab (Anteil der endgültigen Scans, die *t* Tage nach Zustellung schon erfolgt sind). Dann gilt:

P(0 Scans bis heute) = (1 − p·F(t₁))^35 · (1 − p·F(t₂))^22

Erwartete Scans bis heute = p · (35·F(t₁) + 22·F(t₂)). Die Größe n_eff = 35·F(t₁) + 22·F(t₂) ist die Zahl der „schon voll ausgeschöpften“ Briefe.

**Drei Antwortkurven** (ab Zustellung, Kalendertage, F(t) = 1 − e^(−λt)):

| Kurve | Annahme | F(3 T) | F(7 T) | F(14 T) | F(21 T) |
|---|---|---|---|---|---|
| A schnell | wie CMC: 54 % in 7 Tagen | 28 % | 54 % | 79 % | 90 % |
| B mittel | 50 % in 10 Tagen (Vorgabe aus der Aufgabe) | 19 % | 38 % | 62 % | 77 % |
| C langsam | 50 % in 14 Tagen (Handwerker lesen gebündelt) | 14 % | 29 % | 50 % | 65 % |

**Endgültig, also wenn man unendlich lange wartet:** P(0 Scans aus 57) = (1 − p)^57

| p | 1 % | 2 % | 5 % | 10 % |
|---|---|---|---|---|
| P(nie ein Scan) | **56 %** | **32 %** | 5,4 % | 0,25 % |

**Bis heute (17.11.), je Zustell-Szenario und Kurve** — Format: erwartete Scans / P(0)

| Zustellung | Kurve | n_eff | p = 1 % | p = 2 % | p = 5 % | p = 10 % |
|---|---|---|---|---|---|---|
| Optimistisch (6 / 4 T) | A | 24,9 | 0,25 / 78 % | 0,50 / 61 % | 1,24 / 28 % | 2,49 / 8 % |
| Optimistisch | B | 17,2 | 0,17 / 84 % | 0,34 / 71 % | 0,86 / 42 % | 1,72 / 17 % |
| Optimistisch | C | 12,9 | 0,13 / 88 % | 0,26 / 77 % | 0,65 / 52 % | 1,29 / 27 % |
| **Mittel (5 / 1 T)** | A | 17,2 | 0,17 / 84 % | 0,34 / 71 % | 0,86 / 42 % | 1,72 / 17 % |
| **Mittel** | **B** | **11,7** | **0,12 / 89 %** | **0,23 / 79 %** | **0,59 / 55 %** | **1,17 / 30 %** |
| **Mittel** | C | 8,7 | 0,09 / 92 % | 0,17 / 84 % | 0,44 / 64 % | 0,87 / 41 % |
| Pessimistisch (1 / 0 T) | A | 3,7 | 0,04 / 96 % | 0,07 / 93 % | 0,18 / 83 % | 0,37 / 69 % |
| Pessimistisch | B | 2,3 | 0,02 / 98 % | 0,05 / 95 % | 0,12 / 89 % | 0,23 / 79 % |
| Pessimistisch | C | 1,7 | 0,02 / 98 % | 0,03 / 97 % | 0,08 / 92 % | 0,17 / 84 % |

**Was die Null bisher über die Scanquote aussagt (Dreier-Regel, 95 %-Obergrenze ≈ 3 / n_eff):** im mittleren Szenario heute ca. 17–34 % je nach Kurve. Das heißt: Die Daten schließen bisher nur **sehr hohe** Quoten (über ca. 20–30 %) aus, also die oberen Anbieter-Fallwerte, aber nichts im realistischen Bereich von 1–10 %.

**Kleine Bayes-Probe** (eigene Rechnung, mittleres Szenario, Kurve B, gleiche Vorab-Gewichte 20 % für „Brief wirkt gar nicht (p ≈ 0)“, 1 %, 2 %, 5 %, 10 %):

| Stand | p ≈ 0 | 1 % | 2 % | 5 % | 10 % |
|---|---|---|---|---|---|
| vorher | 20 % | 20 % | 20 % | 20 % | 20 % |
| nach 0 Scans bis 17.11. | 28 % | 25 % | 22 % | 16 % | 8 % |
| falls weiter 0 bis 01.12. | 44 % | 30 % | 20 % | 6 % | 1 % |
| falls weiter 0 bis 15.12. | 49 % | 29 % | 18 % | 4 % | 0,5 % |

### Inferences
- Heute ist die Null **fast ohne Aussagekraft**: Die Gewichte verschieben sich kaum (20 % → 28 % für „wirkt gar nicht“). Das passt zu den früheren Notizen (Poisson-Rechnung bei 40 Briefen: P(0 in Woche 1) ≈ 22 % schon bei funktionierender Kampagne; QRLynx: 53 % aller neuen QR-Codes ohne Scan in den ersten 7 Tagen).
- Selbst wenn bis Mitte Dezember nichts kommt, kann man **„wirkt gar nicht“ nicht von „wirkt schwach (1–2 %)“ unterscheiden**. Bei 57 Briefen und 1 % Quote kommt in 56 % aller Fälle nie ein Scan. Unterscheidbar ist nur: „Quote eher ≤ 2 %“ gegenüber „Quote ≥ 5 %“.
- Die Rechnung nimmt an, dass alle Betriebe unabhängig voneinander handeln und jeder höchstens einmal zählt. Die Kurven sind Annahmen, keine Messung für B2B; CMC misst B2C, ab Versand und mit Gutschein-Anreiz.

### Gaps
- Keine gemessene Scan-Zeitkurve für Kaltbriefe an Kleinbetriebe (DE oder international); deshalb drei Kurven als Spanne.
- Keine belastbare B2B-Kalt-Scanquote mit offengelegter Methode; die 1–10 %-Spanne ist eine Annahme aus den Benchmarks oben.

---

## (c) Ab wann ist „0 Scans“ ein starkes Signal, dass der Brief nicht wirkt?

### Takeaway
„Stark“ (P(0) < 10 %) wird die Null nur gegen die Hypothese „Quote ≥ 5 %“, und das frühestens **um den 27.11.–15.12.2026** je nach Kurve. Gegen „Quote ≥ 10 %“ reicht etwa **20.11.–27.11.**. Gegen 1–2 % wird die Null **nie** ein starkes Signal, weil bei 57 Briefen 32–56 % der Kampagnen mit dieser Quote auch auf Dauer ohne Scan bleiben.

### Rechnung (eigene Rechnung, mittleres Zustell-Szenario: Stapel 1 ab 12.11., Stapel 2 ab 16.11.)

P(0 Scans bis Datum), wenn die Quote stimmt:

| Datum | Kurve A: p=1/2/5/10 % | Kurve B: p=1/2/5/10 % | Kurve C: p=1/2/5/10 % |
|---|---|---|---|
| 17.11. (heute) | 84 / 71 / 42 / 17 % | 89 / 79 / 55 / 30 % | 92 / 84 / 64 / 41 % |
| 20.11. | 75 / 56 / 24 / 5 % | 82 / 67 / 36 / 13 % | 86 / 73 / 46 / 21 % |
| 24.11. | 68 / 46 / 14 / 2 % | 75 / 56 / 23 / 5 % | 80 / 63 / 31 / 10 % |
| 27.11. | 64 / 41 / 11 / 1 % | 71 / 50 / 17 / 3 % | 76 / 57 / 25 / 6 % |
| 01.12. | 61 / 38 / **8** / 1 % | 67 / 45 / 13 / 2 % | 72 / 52 / 19 / 3 % |
| 08.12. | 59 / 34 / 7 / 0 % | 63 / 39 / **9** / 1 % | 67 / 45 / 13 / 2 % |
| 15.12. | 57 / 33 / 6 / 0 % | 60 / 36 / 8 / 1 % | 64 / 40 / **10** / 1 % |
| Grenzwert (∞) | 56 / 32 / 5 / 0,2 % | gleich | gleich |

Tage nach Zustellung, bis P(0) unter 20 % / 10 % / 5 % fällt (alle 57 Briefe am selben Tag zugestellt gedacht):

| Kurve | p = 1 % | p = 2 % | p = 5 % | p = 10 % |
|---|---|---|---|---|
| A schnell | nie / nie / nie | nie / nie / nie | 8 / 15 / nie | 3 / 5 / 7 |
| B mittel | nie / nie / nie | nie / nie / nie | 12 / 23 / nie | 5 / 8 / 11 |
| C langsam | nie / nie / nie | nie / nie / nie | 17 / 32 / nie | 7 / 11 / 15 |

### Inferences
- **Praktische Entscheidungsregel (Vorschlag):**
  - Bis ca. **24.11.**: Null ist normal, nichts ändern; nur die Lieferkette prüfen (siehe d).
  - **Ca. 01.12.** (etwa 14–19 Tage nach Zustellung, ~60–80 % der Scans wären da): Bei 0 Scans ist eine Quote von ≥ 10 % praktisch ausgeschlossen und ≥ 5 % unwahrscheinlich (8–19 %). Ab hier ist es vernünftig, Brief und Angebot als „eher schwach“ zu behandeln und die nächste Charge mit geänderter Variante zu planen.
  - **Ca. 15.12.**: 0 Scans heißt mit ~90 % Sicherheit „Quote unter ca. 5 %“. Mehr lässt sich aus 57 Briefen nicht herausholen.
- Das deckt sich mit dem bestehenden Folgebrief-Trigger im Projekt (kein Scan 12 Tage nach geschätzter Zustellung): Zu diesem Zeitpunkt sind nach Kurve A ~75 %, nach Kurve C ~45 % der Scans eingetroffen.
- Ein **einziger** Scan ändert das Bild stark: Er schließt „wirkt gar nicht“ aus. Zwei bis drei Scans bis Anfang Dezember passen zu einer Quote von ca. 3–7 %.
- Für ein belastbares Urteil über eine Quote im Bereich 1–3 % braucht es mehrere hundert Briefe. Bei 1 % und 300 Briefen ist P(0) = 0,99^300 ≈ 5 % (eigene Rechnung).

### Gaps
- Die Schwellen hängen an der unbelegten Kurvenform für Handwerker. Mit den eigenen Scan-Zeitstempeln aus späteren Chargen sollte die Kurve nachkalibriert werden.

---

## (d) Was kann 0 Scans sonst erklären?

### Takeaway
Neben „noch zu früh“ und „Brief überzeugt nicht“ kommen vor allem in Frage: Briefe ungeöffnet entsorgt (Werbung im Fensterumschlag ohne Absender-Marke), **Misstrauen gegenüber QR-Codes in Briefen** (2024–2026 Polizei- und Verbraucherschutz-Warnungen vor „Quishing“ per Brief, auch an Firmenkunden), Jahresend-Hochbetrieb im Handwerk und, deutlich unwahrscheinlicher seit dem Rückläufer, ein Fehler in der Lieferkette oder im Tracking.

### Cited Findings
- **Quishing per Brief:** Verbraucherzentrale NRW (Stand 23.10.2025): „Die betrügerischen Codes kommen nicht über digitale Kommunikationswege, sondern per Briefpost“; Rat: „Scannen Sie einen QR-Code nur, wenn Sie sich sicher sind, dass er seriös ist.“ und „Wenn Sie einen zweifelhaften Brief bekommen haben, rufen Sie beim Absender an.“ — [Verbraucherzentrale NRW, „Quishing“](https://www.verbraucherzentrale.nrw/node/98612)
- BSI-Newsletter vom 01.04.2026: „Verbraucherinnen und Verbraucher sollten QR-Codes nur aus vertrauenswürdigen Quellen scannen und wachsam bleiben.“ — zitiert in [MonsterDealz Magazin, Quishing](https://www.monsterdealz.de/magazin/quishing) (Sekundärquelle, BSI-Original nicht geprüft)
- Polizeiwarnungen 2026 vor gefälschten Bankbriefen mit QR-Code laut derselben Sekundärquelle: Polizei Südosthessen (11.08.2026), Polizei Euskirchen (22.10.2026; **Firmenkunden** der VR Bank Nordeifel sollten eine Gewerbeanmeldung per QR-Code bestätigen), Polizeiinspektion Leer/Emden (26.10.2026; „Das Gefährliche an dieser Betrugsmasche ist, dass QR-Codes auf den ersten Blick unverdächtig wirken.“); Targobank-Warnung 03.07.2026. — [MonsterDealz Magazin, Quishing](https://www.monsterdealz.de/magazin/quishing) (Sekundärquelle; eine eigene Suche fand die Euskirchen-Meldung im Presseportal **nicht**, daher unbestätigt)
- Weitere Berichterstattung über QR-Code-Phishing per Brief: [Tagesspiegel Background, Warnung vor gefälschten QR-Codes in Briefen](https://background.tagesspiegel.de/it-und-cybersicherheit/briefing/warnung-vor-gefaelschten-qr-codes-in-briefen); [heise, Zunahme von Quishing](https://heise.de/-9852213) (nur Suchtreffer, nicht gelesen)
- **Adressqualität:** Allgemein werden laut Branchenquellen etwa 10 % aller Adressen pro Jahr unbrauchbar; Firmen ziehen in Deutschland ca. 250.000-mal pro Jahr um, ca. 200.000 Unternehmen pro Jahr werden insolvent oder gelöscht (Dienstleister-Beitrag, absolute Zahlen, keine Quote). — [Deutscher Presseindex](https://www.deutscherpresseindex.de/?p=189621); [Post CH, Adressen aktualisieren](https://www.post.ch/de/geschaeftsloesungen/adressmanagement/adressen-aktualisieren) (nur Suchauszüge)
- Laut Post sind falsche oder unvollständige Adressen und „hohes Sendungsaufkommen“ häufige Gründe für Verzögerungen. — [Deutsche Post, Postgesetz/Laufzeiten](https://www.deutschepost.de/de/p/postgesetz.html)
- Für normale Briefe gibt es keinen Zustellnachweis; unzustellbare Briefe melden sich ohne Premiumadress nur als physischer Rückläufer. — [Deutsche Post, Briefversand 2025](https://www.deutschepost.de/de/p/post2025/blogartikel-briefversand-2025.html); [easyNova OpenAPI](https://digibrief-api.easynova.de/swagger/v1/swagger.json) (aus früherer Notiz übernommen)
- Deutsche Post (Grüske): Ein Brief „wird direkt geöffnet, unabhängig davon, wie der Umschlag gestaltet ist“ (Anbieteraussage, keine Messung). Im B2B-Teil der CMC 2025 wirkte ein gebrandeter Umschlag mit individueller Marke am besten (CVR 3,06 % vs. 2,61 %; nur 2 Versender, nicht repräsentativ). — [CMC 2025 (PDF)](https://www.deutschepost.de/dam/jcr:b79358de-8e32-4a36-aac1-4e977c875197/DP-CMC-PRINT-Mailing-Studie_2025.pdf) (aus früherer Notiz übernommen)
- Im Handwerk gibt es Hinweise auf hohe Bürolast (HWK Dortmund: jeder zweite Betrieb 5+ Stunden pro Woche zusätzlich), aber keine Daten zum Jahresende. — siehe `research_notes/Wann Handwerker ihre Post lesen/handwerk_office_routines.md`

### Inferences (Ursachen nach eigener Einschätzung der Wahrscheinlichkeit, nicht belegt)

| Mögliche Ursache | Einschätzung | Prüfbar durch |
|---|---|---|
| Noch zu früh (Stapel 2 kaum zugestellt, Kurve flach) | **sehr wahrscheinlich Hauptgrund** (siehe b) | abwarten bis ~01.12. |
| Brief/Angebot überzeugt nicht oder Quote nur ~1–2 % | plausibel, mit 57 Briefen kaum von „zu früh“ zu trennen | erst ab Dezember bzw. mit größeren Chargen |
| Ungeöffnet entsorgt (Fensterumschlag wirkt wie Werbung/Rechnung, Partnerin sortiert vor) | plausibel | nicht direkt; nur über Varianten (Umschlag, Absender) testbar |
| QR-Misstrauen (Quishing-Warnungen, besonders gegenüber Briefen von Unbekannten) | plausibel, eher für Teilgruppe; Kurz-URL als Alternative mildert | Aufrufe über die Kurz-URL getrennt auswerten; Kontakt per Telefon/WhatsApp im Brief anbieten |
| November: Jahresendgeschäft, Baustellen vor dem Winter, Rechnungsstellung | möglich, unbelegt | Vergleich mit Charge im Januar/Februar |
| Lieferkette (easyNova nicht eingeliefert) | **unwahrscheinlich**, weil ein Rückläufer eingetroffen ist und alle Briefe einzeln abgerechnet wurden | Kontrollbrief vom 13.11. (erwartet bis ~18.–20.11.); `frankierID`/`destinationAreaStatus` lesen |
| Tracking defekt (Scans kommen an, werden aber nicht gezählt, z. B. Operator-Filter zu breit, Bot-Filter, Ausfall) | gering, aber billig zu prüfen | Server-/Netlify-Logs der `/q/`- und Kurz-URL-Routen auf Aufrufe seit 11.11. prüfen; Testscan von einem fremden Handy |
| Adressfehler über den einen Rückläufer hinaus | gering bis mäßig (Rückläufer kommen verzögert, 0–3 von 58 wären normal) | Rückläufer weiter sammeln bis Anfang Dezember |

- Der Rückläufer liefert eine grobe Adressqualität: 1 von 58 (1,7 %) nach einer Woche, weitere können noch kommen. Er schließt aber nicht aus, dass Briefe zugestellt und dann nicht beachtet wurden.
- Die Quishing-Welle 2025/2026 trifft genau das Format des Projekts (unbekannter Absender, Brief, QR-Code). Dass die Kurz-URL im Brief steht, ist hier ein wichtiger Ausweg. Wenn Kurz-URL-Aufrufe und QR-Scans getrennt zählbar sind, lässt sich das in späteren Chargen messen.

### Gaps
- Keine Studie zum Anteil ungeöffnet weggeworfener Werbebriefe in Kleinbetrieben (DE).
- Keine Messung, wie stark Quishing-Warnungen die Scanbereitschaft bei legitimen Werbebriefen senken. Die Euskirchen-Warnung an Firmenkunden ist nur aus einer Sekundärquelle bekannt.
- Keine belastbare Rückläuferquote für Firmenadressen aus OSM/Webrecherche.
- Keine Daten zur November-/Dezember-Bürozeit im Handwerk.
