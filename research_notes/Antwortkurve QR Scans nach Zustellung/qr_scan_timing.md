# Antwortkurve von QR-Scans auf Werbepost nach der Zustellung (Zeitverteilung, Format, B2B, Scan-Raten)

Recherche vom 17.11.2026. Ziel: **neue** Belege zusätzlich zu den früheren Notizen in `research_notes/Scan Zeitpunkt nach Briefzustellung/` (qr_timing.md, response_curve.md) und `research_notes/Erster Scan bei ähnlichen Anbietern/` (vendor_timing_data.md, practitioner_first_scan.md).

Bereits bekannt und hier **nicht** neu recherchiert (nur als Bezug genannt): CMC 2023 QR-Kurve (Woche 1 = 54 %, Woche 2 = 19 %, Woche 3 = 7 %, 73 % in 14 Tagen, ab Versand gezählt), CMC-Bestellkurven 2020–2026, JICMAIL-Lebensdauer 7–9 Tage, Linkbreakers-Abklingindex, QRLynx (Zeit bis erster Scan ab Code-Erstellung), QR Insights „Scans ab Tag 2–3 nach Zustellung“, TwoDollarQR-Dachdecker „most scans within 2 days of mail arrival“, QRStuff/Uniqode-Wochentag/Uhrzeit, Stannp-Median 1,63 %, Postlaufzeiten DE.

Kennzeichnung: **[gemessen]** = Messung mit offengelegter Stichprobe/Methode; **[Anbieterangabe]** = Zahl von einem Anbieter aus eigener Plattform, Methode nicht oder nur grob offengelegt; **[Anekdote]** = Einzelfall/Erfahrungsbericht; **[Modell/Faustregel]** = ohne Datenbasis. [DE]/[UK]/[US]/[global] = Land der Daten.

## 1. Zeitverteilung der Scans nach Zustellung: Zustelltag, erste 48 Stunden, Woche 1, Wochen 2–4, Nachlauf

### Takeaway
Es gibt weiterhin **keine** veröffentlichte Scan-Kurve auf Tagesbasis (Zustelltag, 48 h). Neu gefunden wurden nur indirekte Belege aus dem UK-Haushaltspanel JICMAIL: Ca. **zwei Drittel** der adressierten Werbepost werden sofort gelesen bzw. angesehen, rund **ein Viertel** wird beiseitegelegt und später im Monat angesehen; Sendungen, auf die eine kommerzielle Handlung folgt, werden zu fast zwei Dritteln am ersten Tag gelesen. Das stützt die bekannte CMC-Kurve (54 % der Scans in Woche 1) und legt nahe, dass der Großteil der Woche-1-Scans in den ersten 1–3 Tagen nach Zustellung liegt, mit einem echten Nachlauf von rund einem Viertel.

### Cited Findings
**JICMAIL (UK, Haushaltspanel, neue Belege zu „sofort vs. später“)**
- [UK] [gemessen] JICMAIL-Broschüre (ISBA, Mai 2021), Datenbasis „JICMAIL Item data Q2 2017 to Q2 2020; n = All Mail 150.316; Addressed Mail 69.023; Door Drops 31.633“: 95 % der Direct Mail werden „engaged with (not discarded immediately)“, 67 % „read or looked at“; **25 % der Direct Mail werden „put aside and looked at later“**; 10 % lösen eine Online-Handlung aus („initiates an online journey“); 14 % werden mit jemandem besprochen; Direct Mail ist im Schnitt **7,92 Tage** im Haushalt (Door Drops 5,72 Tage); Interaktionshäufigkeit Direct Mail 4,23, Door Drops 2,81. Zuordnung von Zahl und Text wurde aus einer PDF-Textextraktion abgeleitet (Layout zweispaltig), daher leichte Unsicherheit bei der Zuordnung der 25 %. — [JICMAIL „Gold Standard Audience and Item Data for Advertising Mail“ (PDF, ISBA 2021)](https://www.isba.org.uk/system/files/media/documents/2021-05/JICMAIL%20-%20Gold%20Standard%20Audience%20and%20Item%20Data%20for%20Advertising%20Mail.pdf)
- [UK] [gemessen] Gleiche Quelle, Corona-Effekt: Öffnungsrate Direct Mail Q2 2019 → Q2 2020 von 69 % auf 80 %, Leserate von 68 % auf 74 %, Anteil mit Besuch der Absender-Website von 7 % auf 11 % (+57 %). — [JICMAIL (PDF, ISBA 2021)](https://www.isba.org.uk/system/files/media/documents/2021-05/JICMAIL%20-%20Gold%20Standard%20Audience%20and%20Item%20Data%20for%20Advertising%20Mail.pdf)
- [UK] [gemessen, nur über Suchauszug geprüft] PrintWeek zum ersten JICMAIL-Jahr (ca. 2018/2019): 69 % aller Direct Mail werden geöffnet, **63 % sofort gelesen oder angesehen, 25 % beiseitegelegt und später im Monat angesehen**; bei Sendungen, auf die eine kommerzielle Handlung folgt, werden **„nearly two-thirds“ am ersten Tag gelesen**. Seite lieferte HTTP 403, Wortlaut daher nicht im Original geprüft; Daten vor 2019 erhoben. — [PrintWeek, „JICMail's impact assessed one year on“](https://www.printweek.com/articles/jicmail-s-impact-assessed-one-year-on)
- [UK] [gemessen, nur über Suchauszug] DMA-Webinar zu JICMAIL: 71 % der Direct Mail werden geöffnet, **64 % sofort**, weitere 18 % später („opened subsequently“). Seite inzwischen HTTP 410, nicht im Original geprüft; Datum unbekannt. — [DMA, Webinar „7 Essential Insights on Business Mail“](https://dma.org.uk/article/webinar-7-essential-insights-on-business-mail)
- [UK] Die Tageszeitpunkte pro Sendung („When consumers open your mail“) stehen nur in der kostenpflichtigen JICMAIL Mail Item Database (über 133.000 Sendungen). — [JICMAIL (PDF, ISBA 2021)](https://www.isba.org.uk/system/files/media/documents/2021-05/JICMAIL%20-%20Gold%20Standard%20Audience%20and%20Item%20Data%20for%20Advertising%20Mail.pdf)

**Deutsche Post / CMC (Bestätigung, keine neue Kurve)**
- [DE] [gemessen] Englische Fassung der CMC-Auswertung 2023 bestätigt die bekannte Kurve: Balken in „7-Day Sections“ 54 %, 19 %, 7 %, 3 %, 3 %, 2 %, 2 %, danach elfmal 1 %, dann 0 %; „73 % of the QR codes integrated in the print mailings were scanned in the first 14 days … After that, the curve flattens out rapidly.“ Die y-Achse ist fälschlich mit „Number of partners“ beschriftet. Keine Tagesauflösung, keine Formatunterscheidung (alle Varianten im Briefumschlag). — [CMC Print Mailing Study 2023, englische Auswertung (PDF), S. 16](https://www.deutschepost.com/dam/jcr:1fd80ab2-e807-4dfc-95fa-96b3852fbc91/dp-cmc-auswertung-printmailing-studie-en-072023.pdf)
- [DE] Alle CMC-Testvarianten 2023 waren Briefe im neutralen Umschlag (Standardbrief, QR-Code, Rubbelfeld, Gutscheinkarte). Die Kurve gilt also für **verschlossene Briefe**, nicht für Postkarten. — [CMC 2023 englisch (PDF), S. 9–10](https://www.deutschepost.com/dam/jcr:1fd80ab2-e807-4dfc-95fa-96b3852fbc91/dp-cmc-auswertung-printmailing-studie-en-072023.pdf)

**Anbieter und Fallberichte (neu, aber ohne Tagesdaten)**
- [global] [Anbieterangabe] Bitly (2026): QR-Scans aus Direct-Mail-Kampagnen +10,9 % im Q1 2026 ggü. Vorjahr, März 2026 Rekordmonat mit 466.000 Scans; Spitzen im März und Juni–August; „Response data arrives 6–8 weeks after deployment“ bezieht sich auf klassisches Matchback, nicht auf Scans. Keine Verteilung nach Tagen ab Zustellung. — [Bitly, Direct Mail Campaign Tracking](https://bitly.com/blog/direct-mail-campaign-tracking/)
- [US] [Anekdote] Scribendi (2026, B2B-Fachbranche): 596 Landingpage-Besuche, 11 qualifizierte Leads (1,85 %) in unter 5 Wochen; „initial scans/visits“ in Woche 1 ohne Zahlen; Stückzahl und Format nicht genannt. — [Scribendi Digital Marketing, 2026 Direct Mail Case Study](https://www.scribendi.net/blog/general-marketing/2026-direct-mail-case-study/)
- [UK] [Anbieterangabe/Empfehlung] Stannp empfiehlt Erinnerung an Nicht-Scanner „after 5–7 days“ und E-Mail-Ankündigung „2–3 days before mail arrives“ (Ratschlag, keine Messung). — [Stannp, 21.11.2025](https://go.stannp.com/blogs/understanding-direct-mail-engagement-rates-what-to-expect-how-to-improve)
- Gezielte Suche nach Fallstudien mit Scans pro Tag („Day 1/Day 2“) ergab nur hypothetische Beispiele (z. B. „500 Postkarten, 67 Scans in Woche 1“ als Rechenbeispiel), keine echten Tageskurven. — [qrforever.com (Beispielrechnung)](https://qrforever.com/blog/qr-code-analytics-what-data-can-you-track-2026)

### Inferences
- Kombiniert man JICMAIL (ca. 63–67 % sofort gelesen, ca. 25 % später im Monat) mit der CMC-Kurve (54 % der Scans in den ersten 7 Tagen **ab Versand**, also inkl. 1–4 Tagen Laufzeit), dann liegt ein großer Teil der Woche-1-Scans sehr wahrscheinlich am Zustelltag und den 1–2 Folgetagen. Eine grobe, **nicht gemessene** Arbeitsannahme für Briefe ab Zustellung: Zustelltag + 48 h ≈ 35–50 % aller Scans, Woche 1 ≈ 55–65 %, Wochen 2–4 ≈ 20–30 %, ab Woche 5 ≈ 10–20 %.
- Der „später im Monat“-Anteil von ~25 % bei JICMAIL passt größenordnungsmäßig zu den 27 % der CMC-Scans nach Tag 14. Beide Quellen sind unabhängig voneinander (UK-Haushaltspanel vs. DE-Online-Shop-Kampagnen) und zeigen dasselbe Muster: schnelle Hauptwelle, dann ein Nachlauf von etwa einem Viertel.
- Für das Projekt heißt das: Ein Kampagnenergebnis nach 48 h sagt wenig; nach ca. 14 Tagen ab Zustellung sind grob drei Viertel der Scans erfolgt; Demos sollten wegen des Nachlaufs länger als 30 Tage erreichbar bleiben (deckt sich mit früheren Notizen).

### Gaps
- Kein Anbieter (Lob, PostGrid, Postalytics, Inkit, Click2Mail, Pingen, Deutsche Post, Bitly, Uniqode, QR Code Generator PRO) veröffentlicht einen Anteil „Scans am Zustelltag“ oder „in den ersten 48 Stunden“. Click2Mails Artikel zu QR-Tracking (2024) enthält keine Zahlen. — [Click2Mail Blog, 03.10.2024](https://blog.click2mail.com/2024/10/03/response-tracking-with-qr-codes-measuring-campaign-success/)
- JICMAIL-Tagesdaten liegen nur in der kostenpflichtigen Datenbank; die „sofort gelesen“-Werte beziehen sich auf Lesen, nicht auf Scannen.
- Zu Pingen wurde nichts zu Scan-Auswertungen oder Zeitpunkten gefunden.

## 2. USPS Informed Delivery: Wann findet digitale Interaktion statt?

### Takeaway
USPS veröffentlicht Öffnungs- und Klickraten der Informed-Delivery-Mails, aber **keine** Zeitverteilung der Interaktion relativ zur physischen Zustellung. Die Klickrate auf Kampagnen im Daily Digest ist sehr niedrig (ca. 0,2–0,3 %), d. h. die Digitalvorschau ist kein relevanter eigener Antwortkanal. Für Deutschland gibt es kein vergleichbares Angebot mit Werbekampagnen; nicht übertragbar.

### Cited Findings
- [US] [gemessen, USPS-intern] Informed Delivery Year in Review 2025: 72,9 Mio. aktive Nutzer (Stand 31.03.2025), 34,7 % nationale Abdeckung, durchschnittliche E-Mail-Öffnungsrate des Daily Digest **58,6 %** (01.04.2024–31.03.2025), quartalsweise 54,8–60,6 %; 1.025.694 abgeschlossene Kampagnen; Klickraten der interaktiven Kampagnen **0,22 % bzw. 0,26 %** (Basic- und Dual-Kampagnen; Zuordnung der beiden Werte aus der PDF-Extraktion nicht eindeutig). USPS-Werbeaussage: Kunden „can take action on their mail piece immediately — regardless of whether they retrieve mail from the physical mailbox“, ohne Zeitmessung. — [USPS, Informed Delivery Year in Review (PDF)](https://www.usps.com/business/pdf/informed-delivery-year-review.pdf)
- [US] [Anbieterangabe] Lob weist darauf hin, dass nicht alle Empfänger Informed Delivery abonniert haben; Lob zeigt Häufigkeit und Zeitpunkt der QR-Scans im eigenen Dashboard, veröffentlicht aber keine aggregierten Zeitwerte. — [Lob Help, Mail analytics](https://help.lob.com/print-and-mail/getting-data-and-results/mail-analytics); [Lob Blog, Smarter Metrics](https://www.lob.com/blog/introducing-smarter-metrics-for-smarter-campaigns)
- [US] Ein USPS-OIG-White-Paper (2021) enthält nur Meinungen von Werbetreibenden, keine Zeitmessung (aus früherer Recherche bestätigt). — [USPS OIG](https://www.uspsoig.gov/reports/white-papers/marketers-perceptions-informed-delivery-and-informed-visibility)

### Inferences
- Die 0,22–0,26 % Klickrate auf die Digitalvorschau liegen eine Größenordnung unter typischen QR-Scan-Raten auf dem physischen Stück (Stannp-Median 1,63 %). Der physische Brief bleibt der eigentliche Auslöser.
- Für Deutschland irrelevant (kein Informed-Delivery-Äquivalent mit Kampagnenfeld); daher keine Vorab-Interaktion vor der Zustellung zu erwarten.

### Gaps
- Keine Quelle misst, ob Informed-Delivery-Nutzer früher (am Morgen vor Zustellung) reagieren als Nicht-Nutzer.

## 3. Postkarte vs. verschlossener Brief: schneller oder höher?

### Takeaway
Es gibt **keine** Messung, die QR-Scan-Zeitpunkte zwischen Postkarte und Brief vergleicht. Ältere USPS-Haushaltsdaten zeigen, dass Postkarten seltener beiseitegelegt werden (ca. 2 % vs. ca. 5 % bei Briefumschlägen), was für eine etwas schnellere Reaktion spricht; bei der Antwortquote sind die Belege widersprüchlich, im B2B-Einzeltest und in einer randomisierten (Nicht-Werbe-)Studie schnitt der Brief besser ab.

### Cited Findings
- [US] [gemessen, alt, nur über Suchauszug geprüft] USPS Household Diary Study, Tabellen 2007 (mit Vergleichswerten 1987/2006): „Set aside“ bei Postkarten 2,1 % (1987), 1,4 % (2006), 1,7 % (2007) gegenüber 6,6 %, 5,6 % und 5,1 % bei Briefumschlägen im Briefformat; „read by household member“ 47,2 % (Postkarte) vs. 43,1 % (Briefumschlag) 2007. Spaltenzuordnung aus den Tabellenköpfen abgeleitet, nicht im Original geprüft; Daten weit vor 2019. — [USPS Household Diary Study 2007, Tabelle](https://about.usps.com/studying-americans-mail-use/household-diary/2007/appendix%20a3%20tables-files/sheet037.htm); [Tabelle 2](https://about.usps.com/studying-americans-mail-use/household-diary/2007/appendix%20a3%20tables-files/sheet044.htm)
- [US] [Anbieterangaben, widersprüchlich] Antwortquoten nach Format: ANA-Zahlen werden mit „postcards 5,7 %“ bzw. „4,3 %“ zitiert; ReSimpli nennt Postkarte 2,79 % vs. Brief im Umschlag 8,38 %; UPrinting behauptet, Postkarten antworteten 7,9 % besser als Briefumschläge. Keine misst QR-Scans, keine nennt Zeitpunkte. — [ReSimpli](https://resimpli.com/blog/direct-mail-statistics/); [UPrinting](https://www.uprinting.com/blog/postcard-marketing-statistics/); [Postalytics Statistics](https://www.postalytics.com/?p=12534)
- [US] [Anekdote, nur über Suchauszug] iExit-Test (B2B): Zweiseitiger Brief brachte 60 % mehr gekaufte Sponsorings als eine Postkarte. — zitiert bei [Yotru, B2B Direct Mail Statistics](https://yotru.com/blog/b2b-direct-mail-statistics) (Seite beim Abruf 404, nur Suchauszug)
- [global] [gemessen, keine Werbung] Randomisierte Studie (BMC Med. Res. Methodol. 2023): Rücklauf 13,2 % bei Brief vs. 7,7 % bei Postkarte (aus früherer Recherche, hier nur als Bezug). — [BMC 2023](https://link.springer.com/10.1186/s12874-023-01992-8)
- [UK] Stannp-Benchmark 2025 enthält keine Formataufschlüsselung (nur ein Selfmailer-Test, ca. 27.200 Empfänger je Variante). — [Stannp, 21.11.2025](https://go.stannp.com/blogs/understanding-direct-mail-engagement-rates-what-to-expect-how-to-improve)

### Inferences
- Postkarte: kein Öffnen nötig, seltener beiseitegelegt → plausibel eher früher gescannt (mehr Scans am Zustelltag), aber nicht gemessen.
- Verschlossener Brief: wirkt bei erklärungsbedürftigem B2B-Angebot (Website für 597 €) eher glaubwürdiger; die einzige B2B-Anekdote (iExit) und die BMC-Studie sprechen für den Brief. Die CMC-Scan-Kurve (bereits sehr schnell) stammt aus Briefen, d. h. auch Briefe werden überwiegend früh gescannt.
- Das Projekt verschickt ohnehin `letter` (Postkarte nur, wenn der Briefdienst sie dokumentiert); die Datenlage gibt keinen Grund, das zu ändern.

### Gaps
- Kein A/B-Test Postkarte vs. Brief mit QR-Scan-Zeitstempeln gefunden (weder DE noch international).

## 4. B2B / Kleinbetriebe: Verzögerung, Wochentag, Uhrzeit

### Takeaway
Auch in dieser Runde wurden **keine** gemessenen Scan-Zeitdaten für Werbepost an kleine Betriebe gefunden. Neu ist nur, dass Bitly bei Direct-Mail-QR-Kunden in 28,6 % der Konto-Monate null Scans sieht (Hinweis auf hohe Streuung) und ein B2B-Einzelfall ohne Zahlen. Die früheren Annahmen (Werktage, Mittag/Feierabend, gebündelte Postdurchsicht in Inhaberbetrieben) bleiben unbelegt.

### Cited Findings
- [global] [Anbieterangabe] Bitly: „Across observed account-month combinations, 28.6 % produced zero scans“; Scans pro Konto stark unterschiedlich nach Branche (Specialty Retail 334, Consumer Services 88). Keine Wochentags- oder B2B-Aufschlüsselung, Datenbasis nicht offengelegt. — [Bitly, Direct Mail Campaign Tracking](https://bitly.com/blog/direct-mail-campaign-tracking/)
- [US] [Anekdote, nur über Suchauszug] Wildfront: 1.000 Postkarten an neu gegründete Unternehmen, **null QR-Scans** (in einer Tabelle bei Yotru zitiert). — [Yotru, B2B Direct Mail Statistics](https://yotru.com/blog/b2b-direct-mail-statistics) (Seite beim Abruf 404, nur Suchauszug)
- [US] [Anekdote] Scribendi (B2B, 2026): erste Scans/Besuche in Woche 1, Hauptarbeit über 3 Wochen mit drei Folge-E-Mails; keine Tageszahlen. — [Scribendi 2026](https://www.scribendi.net/blog/general-marketing/2026-direct-mail-case-study/)
- [US] [Anbieterangabe] Yotru: kein verlässlicher öffentlicher Benchmark für B2B-Postkarten-Scanraten (aus früherer Recherche, erneut im Suchauszug bestätigt). — [Yotru](https://yotru.com/blog/b2b-direct-mail-statistics)

### Inferences
- Bei kleinen B2B-Empfängern ist mit hoher Streuung zwischen Kampagnen zu rechnen (Wildfront 0/1.000; Bitly 28,6 % Null-Monate). Eine Woche ohne Scan bei 40–60 Briefen ist kein Beweis, dass die Kampagne nicht funktioniert.
- Wochentag/Uhrzeit-Auswertung nur deskriptiv protokollieren; für Muster braucht es nach Linkbreakers ≥ 50 Scans (Woche) bzw. ≥ 200 (Stunde) (frühere Notiz).

### Gaps
- Keine DE-/EU-Messung zu Öffnungs- und Scanzeitpunkten in Handwerks-/Kleinbetrieben; keine B2B-Scan-Kurve; kein B2C-vs.-B2B-Vergleich der Zeitachse.

## 5. Realistische QR-Scan-Raten pro 100 Sendungen (kalte Werbepost)

### Takeaway
Die belastbarste breite Zahl bleibt Stannp (5 Mio. Sendungen, 1.400 Kampagnen, 2025): **Median 1,6 Scans pro 100 Sendungen**, mittlere Hälfte 0,4–3,6, Top 10 % ≥ 5,3, unterste 10 % ≤ 0,17. Werte von 4–10 % (Linkbreakers) oder 9,2 % (ProspectUp) sind Anbieterangaben ohne Methode; zweistellige Werte (CMC 8,5–22 %) gelten nur für **Bestandskunden** mit Gutschein, nicht für Kaltansprache. Für kalte Briefe an Kleinbetriebe ist **ca. 0,5–5 Scans pro 100** eine realistische Spanne, mit echter Möglichkeit von 0.

### Cited Findings
- [UK/global] [Anbieterangabe mit offengelegter Basis] Stannp (veröffentlicht 21.11.2025): 5 Mio. Sendungen, 1.400 Kampagnen, 16 Branchen, 2025, Ausreißer entfernt; QR-Scans über die Stannp-Plattform: **Median 1,63 %, Mittelwert 2,22 %, mittlere 50 % 0,43–3,55 %, Top 25 % ≥ 3,55 %, Top 10 % ≥ 5,29 %, unterste 25 % ≤ 0,43 %, unterste 10 % ≤ 0,17 %**. Keine Trennung B2B/B2C, keine Formattrennung. — [Stannp](https://go.stannp.com/blogs/understanding-direct-mail-engagement-rates-what-to-expect-how-to-improve)
- [global] [Anbieterangabe/Modell] Linkbreakers: Direct Mail **4–10 %** Scan-Rate („median performance“ aus „aggregated campaign data across QR tracking platforms and industry reports“), Begründung: Empfänger „more likely to be stationary and can take time to scan“; personalisierte Codes am besten; Benchmarks erst ab 500+ Kontakten aussagekräftig. Keine Stichprobengröße. — [Linkbreakers, Scan Rate Benchmarks by Industry](https://linkbreakers.com/help/article/qr-code-scan-rate-benchmarks-by-industry)
- [global] [Anbieterangabe] QR Code Generator PRO: nennt für Direct Mail ausdrücklich **keine** Zahl („evaluated differently“); für Poster/Print „lower to mid single-digit“, ohne Quelle. — [QR Code Generator PRO, Scan Rate Benchmark](https://www.qr-code-generator.com/blog/qr-code-scan-rate-benchmark/)
- [global] [Anbieterangabe] Uniqode: 12,8 % durchschnittliche „scan-through rate“ über alle Kanäle (Scans je Person, die den Code sah) – nicht Direct-Mail-spezifisch, nicht übertragbar. — [Uniqode Blog](https://www.uniqode.com/blog/?p=8124)
- [US] [Anbieterangabe] ProspectUp: 9,2 % durchschnittliche QR-Scan-Rate auf eigenen Postkarten, ohne Methode (aus früherer Recherche). — [ProspectUp](https://www.prospectup.ai/features/physical-postcards)
- [US] [Anbieterangabe] U2L nennt 26 %, Gitnux 41 % – ohne Quelle, nicht verwendbar. ScanKit weist darauf hin, dass die oft zitierte Zahl „44 % haben QR auf Werbepost gescannt“ keine auffindbare Originalstudie hat. — [U2L](https://u2l.ai/blog/qr-code-marketing-guide); [Gitnux](https://gitnux.org/direct-mail-effectiveness-statistics/); [ScanKit](https://scankit.app/en/blog/qr-codes-for-direct-mail)
- [US] [Anekdote] Immobilienmaklerin (Postkarte an Hausbesitzer, B2C, 18.04.2024): **19 Scans auf 1.000 Postkarten (1,9 %)**, laut Autorin über fünfmal mehr als üblich (d. h. üblich < 0,4 %); keine Zeitangabe. — [BAM / nowbam.com](https://nowbam.com/the-postcard-that-increased-my-qr-code-scan-rate-by-5x/)
- [US] [Anekdote] TwoDollarQR-Dachdecker: 120 Scans auf 5.000 Postkarten (2,4 %) (aus früherer Recherche). — [TwoDollarQR](https://twodollarqr.com/blog/qr-code-on-direct-mail)
- [US] [Anekdote] Wildfront: 0 Scans auf 1.000 B2B-Postkarten (siehe Abschnitt 4). — [Yotru](https://yotru.com/blog/b2b-direct-mail-statistics)
- [US] [Anbieterangabe] Anbieter von Immobilienbewertungs-Postkarten: Scan-Raten „as high as 2 % per mailing“. — [Wise Pelican](https://wisepelican.com/product/direct-mail-postcards/automated-home-valuation-postcards/)
- [DE] [gemessen, nur Bestandskunden] CMC: Besuchsquote (QR-Scan-basiert) 2023 ca. 22 %, 2024 14 %, 2025 ca. 12 %, 2026 8,5 %; Gutschein-im-Warenkorb-Hinweis +52 % Scan-Rate. Gilt für Kunden, die im letzten Jahr bestellt haben – nicht für Kaltansprache. — [CMC 2023 englisch (PDF), S. 14–15](https://www.deutschepost.com/dam/jcr:1fd80ab2-e807-4dfc-95fa-96b3852fbc91/dp-cmc-auswertung-printmailing-studie-en-072023.pdf); [CMC 2026](https://www.deutschepost.de/de/d/dialogmarketing/cmc-studie-2026.html)

### Inferences
- Rechnung für das Projekt (Schlussfolgerung, Poisson-Näherung): Bei 40 Briefen und 1,6 % → ca. 0,6 erwartete Scans, P(0 Scans) ≈ 53 %; bei 4 % → 1,6 Scans, P(0) ≈ 20 %; bei 10 % → 4 Scans, P(0) ≈ 2 %. Bei 58 Briefen: 1,6 % → 0,9 Scans, P(0) ≈ 39 %; 4 % → 2,3, P(0) ≈ 10 %. Null Scans bei der ersten Charge ist also mit Stannp-Median-Raten ein häufiges Ergebnis, mit stark personalisierter Demo (eher oberes Quartil) deutlich seltener.
- Eine persönliche, fertig gebaute Demo-Website mit Firmennamen ist eher mit dem „Gutschein liegt schon im Warenkorb“-Effekt vergleichbar (konkreter Nutzen nach dem Scan) als mit generischer Werbung; das spricht für das obere Stannp-Quartil (3,5–5 %+), ist aber nicht belegt.
- Als Plangröße pro 100 kalten Briefen an Kleinbetriebe: konservativ 1–2 Scans, erwartbar 2–5, gut ≥ 5; Werte > 10 nur mit belegtem Sondereffekt.

### Gaps
- Keine Scan-Rate speziell für kalte B2B-Briefe an Kleinbetriebe in DE.
- Keine Trennung „unique scans“ vs. „alle Scans“ in den meisten Benchmarks (Stannp: Plattform-Scans; Linkbreakers: unklar). Für das Projekt sind eindeutige Scans je Lead die richtige Kennzahl.
