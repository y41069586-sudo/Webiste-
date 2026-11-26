# Recht und Datenschutz: KI-Telefonassistent für Handwerksbetriebe (DE/EU, Stand November 2026)

> Recherche-Notizen, Stand 26.11.2026. **Keine Rechtsberatung.** Unsichere Punkte sind markiert.
> Rollenannahme: Wir = Anbieter/Auftragsverarbeiter, Handwerksbetrieb = Verantwortlicher, Anrufer = betroffene Person.
> Rechercheumfang: rund 20 Abrufe. Viele Quellen sind Anbieter- oder Kanzlei-Blogs, Primärquellen sind gekennzeichnet.
> Gerichtsentscheidungen speziell zu KI-Telefonassistenten wurden **nicht** gefunden.

## 1. EU AI Act Art. 50: Pflicht, Anrufer über die KI zu informieren (Geltung, Wortlaut, Bußgelder)

### Takeaway
Art. 50 Abs. 1 KI-VO gilt seit dem **2. August 2026** ohne Übergangsfrist. Ein KI-Telefonassistent muss so gebaut sein, dass Anrufer spätestens bei der ersten Interaktion klar erfahren, dass sie mit einer KI sprechen. Das gilt nur dann nicht, wenn es für einen verständigen Anrufer offensichtlich ist, und darauf sollte man sich bei einer natürlich klingenden Stimme nicht verlassen. Der Digital Omnibus hat Art. 50 Abs. 1 nicht verschoben. Bei Verstößen drohen bis zu 15 Mio. € oder 3 % des Jahresumsatzes, für KMU gilt jeweils der niedrigere Betrag.

### Cited Findings
- **Wortlaut Art. 50 Abs. 1:** Anbieter müssen KI-Systeme, die direkt mit natürlichen Personen interagieren, so konzipieren, dass diese Personen informiert werden, dass sie mit einem KI-System interagieren. Ausnahme: Es ist „aus Sicht einer angemessen informierten, aufmerksamen und verständigen natürlichen Person“ offensichtlich (unter Berücksichtigung von Umständen und Nutzungskontext). Weitere Ausnahme nur für gesetzlich zugelassene Strafverfolgungssysteme. — [artificialintelligenceact.eu, Art. 50](https://artificialintelligenceact.eu/article/50/) (Sekundär-Wiedergabe des Normtexts; amtlicher Text: [EUR-Lex VO (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj))
- **Zeitpunkt und Form (Art. 50 Abs. 5):** Die Information muss „klar und eindeutig erkennbar spätestens zum Zeitpunkt der ersten Interaktion oder Aussetzung“ erfolgen und den geltenden Barrierefreiheitsanforderungen entsprechen. — [artificialintelligenceact.eu, Art. 50](https://artificialintelligenceact.eu/article/50/)
- **Art. 50 Abs. 6:** Die Transparenzpflichten lassen andere Transparenzpflichten nach Unions- oder nationalem Recht unberührt, also etwa Art. 13 DSGVO. — [artificialintelligenceact.eu, Art. 50](https://artificialintelligenceact.eu/article/50/)
- **Art. 50 Abs. 3:** Betreiber von Systemen zur Emotionserkennung oder biometrischen Kategorisierung müssen die betroffenen Personen zusätzlich informieren. Das ist relevant, falls ein Voice-Stack Stimmungen oder Emotionen erkennt. — [artificialintelligenceact.eu, Art. 50](https://artificialintelligenceact.eu/article/50/)
- **Geltungsbeginn und Digital Omnibus:**
  - Art. 50 Abs. 1 wurde **nicht** verschoben und gilt seit dem 2.8.2026 ohne Übergangsfrist.
  - Nur für die Kennzeichnungspflicht nach Art. 50 Abs. 2 gibt es eine Schonfrist, und zwar nur für generative Systeme, die schon vor dem 2.8.2026 auf dem Markt waren. Für sie gilt die Pflicht ab dem **2.12.2026**.
  - Laut Usercentrics heißt der Digital Omnibus „Regulation (EU) 2026/1744“. Das EP stimmte am 16.6.2026 zu, der Rat am 29.6.2026, die Unterzeichnung war am 8.7.2026, die Veröffentlichung im ABl. am 24.7.2026 und das Inkrafttreten am 27.7.2026.
  - Hochrisiko-Pflichten wurden auf den 2.12.2027 und 2.8.2028 verschoben.
  - Quellen: [Usercentrics](https://usercentrics.com/knowledge-hub/eu-ai-act-high-risk-delay-article-50-transparency-consent/), [aiactblog.nl](https://www.aiactblog.nl/en/posts/article-50-transparency-deadline-2-august-2026), [datascale.de](https://datascale.de/blog/eu-ai-act-digital-omnibus-verschiebung/)
  - **Widerspruch:** Eine ältere Quelle spricht nur von einer politischen Einigung vom 7.5.2026, die förmliche Annahme stand dort noch aus. Die Verordnungsnummer und die ABl.-Daten wurden **nicht** direkt auf EUR-Lex geprüft.
- **Bußgeld:** Verstöße gegen Art. 50 können bis zu 15 Mio. € oder 3 % des weltweiten Jahresumsatzes kosten (Art. 99 Abs. 4). Für KMU gilt der jeweils niedrigere Betrag (Art. 99 Abs. 6). Der Omnibus hat daran nichts geändert. — [Usercentrics](https://usercentrics.com/knowledge-hub/eu-ai-act-high-risk-delay-article-50-transparency-consent/)
- **Wahrnehmung in der Praxis:** In einem heise-Interview heißt es, Menschen nähmen nicht mehr wahr, dass sie mit einer KI sprechen. Das ist ein Argument dafür, dass die Ausnahme „offensichtlich“ bei modernen Voice-Bots kaum greift. — [heise, Interview](https://heise.de/-11217373) (nur Titel ausgewertet)
- **Wettbewerberpraxis:** fonio schreibt, Anbieter müssten Anrufer ab dem 2.8.2026 „gesetzlich eindeutig darüber informieren“, dass sie mit KI sprechen. Im Footer stehen die Badges „DSGVO-konform“ und „EU AI Act konform“, Belege dafür nennt fonio nicht. — [fonio Blog, 06.11.2026](https://www.fonio.ai/de/news-cool-stuff/ki-telefonassistent-datenschutz-dsgvo/)

### Inferences
- **Rollen:**
  - Art. 50 Abs. 1 ist eine Konstruktionspflicht des **Anbieters**.
  - Bringen wir den Assistenten unter eigenem Namen auf den Markt, auch wenn er auf Drittanbieter-Modellen läuft, sind wir sehr wahrscheinlich „Anbieter“ im Sinne von Art. 3 Nr. 3 KI-VO.
  - Der Handwerksbetrieb ist dann „Betreiber“.
  - Die Pflicht trifft also primär uns. Sie sollte technisch erzwungen sein, als Begrüßungsansage, die der Kunde nicht abschalten kann.
- **Ansage:** Ein praktikabler Mustertext wäre etwa: „Guten Tag, Sie sprechen mit dem digitalen KI-Assistenten von [Firma]. …“. Die Ansage sollte gleich zu Beginn kommen, kurz und verständlich sein und nicht im Kleingedruckten verschwinden. Einen amtlich vorgeschriebenen Wortlaut gibt es nicht. Leitlinien oder Verhaltenskodizes der Kommission zu Art. 50 (Art. 50 Abs. 7) wurden in dieser Recherche nicht ausgewertet.
- **Barrierefreiheit:** Die Ansage sollte gut verständlich sein, also mit angemessenem Tempo und ohne Hintergrundmusik gesprochen werden. Wer nicht mit der KI sprechen will, sollte eine Alternative haben, etwa einen Rückruf durch einen Menschen.
- **Emotionen:** Auf Emotionserkennung (Art. 50 Abs. 3, ggf. auch Art. 5) und Stimmprofile sollte man verzichten. fonio schließt Voiceprints in seiner AVV ausdrücklich aus (siehe Abschnitt 3).

### Gaps
- Die Verordnungsnummer und die Amtsblatt-Daten des Digital Omnibus wurden nicht auf EUR-Lex selbst geprüft.
- Kommissions-Leitlinien oder ein Verhaltenskodex zu Art. 50 Abs. 1 wurden nicht gefunden bzw. nicht abgerufen.
- Welche deutsche Marktüberwachungsbehörde zuständig ist (KI-MIG und Bundesnetzagentur) und ob es dort schon Bußgeldpraxis gibt, wurde nicht recherchiert.
- Erwägungsgrund 132 wurde nicht im Wortlaut abgerufen.

## 2. § 201 StGB (Vertraulichkeit des Wortes): Aufzeichnung, Live-Transkription, Einwilligung

### Takeaway
Die Aufnahme des nichtöffentlich gesprochenen Wortes auf einen Tonträger ohne Einwilligung ist strafbar (§ 201 Abs. 1 Nr. 1 StGB). Die überwiegende Literatur- und Praxismeinung: Eine reine **Live-Transkription ohne gespeichertes Audio** ist **keine** „Aufnahme auf einen Tonträger“. Das ist aber **nicht gerichtlich geklärt**. Wird Audio über die flüchtige RAM-Verarbeitung hinaus gepuffert oder gespeichert, ist der Tatbestand wahrscheinlich eröffnet, und dann braucht man eine Einwilligung. Viele Anbieter speichern Audio standardmäßig, fonio etwa 30 Tage.

### Cited Findings
- **Live-Transkription:** Laut Dr. Riemer ist „eine reine Texttranskription … nicht ohne Weiteres mit einer Tonaufzeichnung gleichzusetzen“. Ohne abrufbaren gespeicherten Ton sei der enge Wortlaut von § 201 Abs. 1 Nr. 1 nicht erfüllt.
  - Ist Audio speicherbar, exportierbar, rekonstruierbar oder abspielbar, „liegt eine Aufnahme im Sinne des § 201 StGB nahe“.
  - Literaturhinweise dort: Klaas/Bertermann, BB 2026, 1100–1105; MüKo StGB, 5. Aufl. 2025, Rn. 67–68; Schumann/Mosbacher/König, Medienstrafrecht, 2023.
  - Konkrete Urteile nennt der Beitrag nicht.
  - Quelle: [Dr. Riemer](https://www.dr-riemer.de/heimliche-tonaufzeichnung-ki-transkription-und-beweisnot/)
- **Transkript weitergeben:** Wer nur ein schriftliches Transkript weitergibt, macht damit nicht automatisch die Aufnahme „zugänglich“ (§ 201 Abs. 1 Nr. 2). Gemeint ist, einem Dritten das Anhören zu ermöglichen, etwa durch eine Audiodatei oder einen Link. — [Dr. Riemer](https://www.dr-riemer.de/heimliche-tonaufzeichnung-ki-transkription-und-beweisnot/)
- **Einwilligung durch Fortsetzen des Gesprächs:** Werden die Gesprächspartner vorab klar über die Transkription informiert und setzen das Gespräch fort, „kann darin eine Einwilligung liegen“. — [Dr. Riemer](https://www.dr-riemer.de/heimliche-tonaufzeichnung-ki-transkription-und-beweisnot/)
- **Zwei Varianten bei DSN:**
  - Variante 1: Reine Live-Transkription ohne Audiospeicherung ist keine Aufnahme im Sinne von § 201.
  - Variante 2: Die meisten gängigen Tools puffern Audio über die flüchtige RAM-Verarbeitung hinaus. Dann ist § 201 eröffnet, und eine Einwilligung ist nötig.
  - Die strafrechtliche Einwilligung muss laut DSN wohl nicht die DSGVO-Anforderungen erfüllen. DSN empfiehlt, das fachanwaltlich prüfen zu lassen.
  - Quelle: [DSN Group](https://www.dsn-group.de/datenschutz-notizen/wenn-ki-mithoert-was-unternehmen-bei-der-transkription-von-gespraechen-beachten-muessen-0759242)
- **Aufsichtsbehörden:**
  - Der LfDI Baden-Württemberg weist im 40. Tätigkeitsbericht 2024 (S. 134 ff.) auf die Strafbarkeit nach § 201 StGB hin.
  - Der BayLDA geht im 15. Tätigkeitsbericht 2025 (S. 56 f.) laut DSN nicht auf § 201 ein.
  - Quelle: [DSN Group](https://www.dsn-group.de/datenschutz-notizen/wenn-ki-mithoert-was-unternehmen-bei-der-transkription-von-gespraechen-beachten-muessen-0759242)
- **Meinungsbild:** Die Websuche zeigt keine einheitliche Linie. Mehrere Fach- und Anbieterblogs halten Live-Transkription für unproblematisch, andere halten die Frage für Telefon-Sprachassistenten für nicht geklärt. Eine Warnung lautet, die Annahme „ohne Tonspur automatisch zulässig“ sei ein typischer Fehler, weil viele Tools Audio trotzdem speichern. — u. a. [lucidence.ai](https://lucidence.ai/blog/anrufaufzeichnung-201-stgb), [proxworks.de](https://proxworks.de/wissen/recht-datenschutz/vertraulichkeit-des-wortes), [validdata.de](https://validdata.de/blog/ki-telefonassistent) (Sekundärquellen, nur als Suchergebnis-Übersicht gesehen)
- **Wettbewerber:** fonio rät allgemein: „Beginne die Aufzeichnung erst nach Einwilligung.“ Schriftliche Transkripte gälten datenschutzrechtlich als Aufzeichnung und bräuchten eine ausdrückliche Einwilligung. Das ist allgemeine Beratung, keine Produktbeschreibung. — [fonio Blog](https://www.fonio.ai/de/news-cool-stuff/ki-telefonassistent-datenschutz-dsgvo/)
- **Audio-Speicherung bei fonio:** Laut AVV gilt standardmäßig „Audio-Aufnahmen: 30 Tage ab Anruf-Ende“. fonio speichert also Audio, was für eine eingeholte oder einzuholende Einwilligung spricht. Mehrere Subprozessoren (STT/TTS) arbeiten dagegen mit Zero-Data-Retention für Audio. — [fonio AVV, Stand 06.08.2026](https://a.storyblok.com/f/293491369270379/b222ef5a84/fonio-avv-de-06-08-2026.pdf)

### Inferences
- **Sicherstes Design:**
  1. Audio nur im Streaming und im RAM verarbeiten, nichts persistent speichern. STT- und TTS-Anbieter mit Zero-Data-Retention verwenden.
  2. Nur Text, also Transkript oder Zusammenfassung, an den Handwerker geben.
  3. Gleich zu Beginn ansagen, dass eine KI das Gespräch verarbeitet und verschriftlicht, und anbieten, aufzulegen oder einen Rückruf zu bekommen.
  4. Wer Audio aufzeichnen will, etwa zur Qualitätssicherung, holt eine ausdrückliche Einwilligung ein. Ein bloßes „wird aufgezeichnet“ reicht laut LfDI BW datenschutzrechtlich nicht, siehe Abschnitt 3.
- **§ 201 Abs. 2 Nr. 1 („Abhören mit Abhörgerät“):** Das zielt dem Wortlaut nach auf das Abhören eines Gesprächs, das nicht für den Abhörenden bestimmt ist. Die KI ist hier selbst der Gesprächspartner im Auftrag des Betriebs. Ein strafbares Abhören durch Dritte liegt daher eher fern. Das ist eine **unbelegte eigene Einschätzung**, keine Quelle wurde dazu gefunden.
- **Strafrechtliches Risiko:** Es trifft im Zweifel die natürlichen Personen, die aufzeichnen. Das können wir als Betreiber der Technik sein und der Handwerker als Veranlasser. Deshalb sollte Audio-Aufzeichnung standardmäßig aus sein.

### Gaps
- Es wurde kein Gerichtsurteil gefunden, das Live-Transkription oder KI-Telefonie unter § 201 StGB einordnet. Auch die BB-2026-Fundstelle wurde nicht selbst gelesen.
- Unklar ist, ab welcher Pufferdauer (z. B. Jitter-Buffer, STT-Chunking von wenigen Sekunden) ein „Tonträger“ vorliegt. Dazu wurde keine Kommentierung gefunden.

## 3. DSGVO: Rechtsgrundlage, Art. 13, AVV (Art. 28), Subprozessoren, Drittlandtransfer, Speicherfristen, TOMs

### Takeaway
- **Rechtsgrundlage:** Für die Annahme einer Anfrage und die Kurz-Zusammenfassung tragen meist Art. 6 Abs. 1 lit. b (vorvertragliche Anfrage) bzw. lit. f DSGVO. Für Audioaufnahmen und dauerhaft gespeicherte Wortlaut-Transkripte verlangen Aufsichtsbehörden regelmäßig eine **Einwilligung**.
- **Art. 13:** Informationen müssen zu Beginn kommen, pauschale Hinweise reichen nicht.
- **Vertrag:** Zwischen uns und jedem Handwerker ist eine AVV nach Art. 28 Pflicht. Subprozessoren brauchen eine Genehmigungs- und Widerspruchsregelung.
- **USA-Transfers:** Sie sind 2026 auf das EU-US Data Privacy Framework gestützt, das in erster Instanz bestätigt wurde. Das Rechtsmittel C-703/25 P ist anhängig. Deshalb sollten zusätzlich SCCs vereinbart und EU-Regionen sowie Zero-Data-Retention bevorzugt werden.

### Cited Findings
- **Rechtsgrundlage (Behördenlinie laut DSN):**
  - Live-Transkription für Zusammenfassungen ohne dauerhafte Speicherung des Transkripts kann auf Art. 6 Abs. 1 lit. f gestützt werden, mit Einzelfall-Erforderlichkeitsprüfung (BayLDA).
  - Ein vollständiges Wortlaut-Transkript dauerhaft zu speichern, erfordert in der Regel eine Einwilligung.
  - Laut DSK-Beschluss vom 23.3.2018 ist die Aufzeichnung von Telefongesprächen grundsätzlich nur mit Einwilligung zulässig.
  - Der Sächsische Datenschutzbeauftragte (TB 2022, S. 99 f.) lehnt lit. f für Gesprächsaufzeichnungen ab.
  - Der LfDI BW akzeptiert lit. f für allgemeine Zusammenfassungen, erwartet für Wortlaut-Transkripte aber eine Einwilligung und bei Gesundheitsdaten Art. 9 Abs. 2 lit. a.
  - Quelle: [DSN Group](https://www.dsn-group.de/datenschutz-notizen/wenn-ki-mithoert-was-unternehmen-bei-der-transkription-von-gespraechen-beachten-muessen-0759242)
- **Art. 13 (Information):**
  - Die Transkription muss nach Art. 13 offengelegt werden, und der LfDI BW empfiehlt, vorab zu informieren.
  - Wörtlich: „Pauschale Hinweise wie ‚Das Gespräch wird zur Qualitätssicherung aufgezeichnet' sind nicht ausreichend.“
  - Quelle: [DSN Group](https://www.dsn-group.de/datenschutz-notizen/wenn-ki-mithoert-was-unternehmen-bei-der-transkription-von-gespraechen-beachten-muessen-0759242)
- **Speicherfristen (Behördenlinie):** Es sollen Fristen festgelegt werden. Über die Beantwortung der Anfrage hinaus darf nur aufbewahrt werden, was einer gesetzlichen Aufbewahrungspflicht unterliegt. — [DSN Group](https://www.dsn-group.de/datenschutz-notizen/wenn-ki-mithoert-was-unternehmen-bei-der-transkription-von-gespraechen-beachten-muessen-0759242)
- **Muster-AVV fonio (Stand 06.08.2026, Anhang 3 Stand 16.09.2026):**
  - **Rollen und Vertragsform:** Kunde = Verantwortlicher, fonio GmbH (Wien) = Auftragsverarbeiter. Die AVV ist „integraler Bestandteil“ der AGB.
  - **Resale:** Bei Reseller-Partnern wird fonio Sub-Verarbeiter. Das ist relevant, falls wir auf fonio o. ä. aufsetzen.
  - **Subprozessoren:** Neue oder geänderte Subprozessoren werden vorab angekündigt, mit Widerspruchsmöglichkeit. Ein zusätzlicher Verarbeitungsort im Drittland gilt als Änderung.
  - **Rückgabe/Löschung:** Daten werden 30 Tage nach Vertragsende gelöscht, vorbehaltlich gesetzlicher Aufbewahrungspflichten.
  - **Kein KI-Training:** „Personenbezogene Daten werden weder durch den Auftragnehmer noch durch dessen Subprozessoren zum Training, zur Verbesserung oder zur Evaluierung von KI-Modellen verwendet.“
  - **Keine Stimmerkennung:** Es gibt keine Stimmidentifikation und keine Voiceprints. Audio dient nur der STT/TTS. Nach fonios Verständnis liegen deshalb keine biometrischen Daten im Sinne von Art. 9 vor.
  - **Standard-Löschfristen:**
    - Audio: 30 Tage
    - Transkripte und Zusammenfassungen: 90 Tage
    - Dialog- und technische Logs: 30 Tage
    - Telefonie-Metadaten: 6 Monate
    - Buchhaltungsbelege: 7 Jahre
  - Quelle: [fonio AVV PDF](https://a.storyblok.com/f/293491369270379/b222ef5a84/fonio-avv-de-06-08-2026.pdf)
- **Subprozessoren fonio (realer Voice-AI-Stack):**
  - **Hosting:** Hetzner (Nürnberg, Falkenstein, Helsinki; BSI C5-Testat 02.03.2026), ab 01.10.2026 zusätzlich OVH (DE/FR).
  - **Telefonie:** Twilio Ireland (DPF + SCC Modul 3 + BCR) sowie ab 01.10.2026 Voxbone/Bandwidth (BE).
  - **LLM:** OpenAI Ireland (SCC Modul 3, EU-Datenresidenz im Enterprise Agreement, Zero Data Retention).
  - **Echtzeit/STT/TTS:** LiveKit (US, DPF + SCC, Region-Pinning), Soniox (US, SCC, EU-Option, ZDR), Inworld (US, SCC, ZDR).
  - **Fallbacks:** Deepgram (STT), Google Ireland (LLM), ElevenLabs (TTS, DPF + SCC, ZDR).
  - **Sonstige:** Mailgun/Sinch (E-Mail), New Relic (US, Monitoring).
  - **Optional:** Nylas (Kalender), Meta (WhatsApp) u. a.
  - **Fallback-Anbieter:** Für Berufsgeheimnisträger standardmäßig deaktiviert, für andere Kunden aktiviert.
  - Quelle: [fonio AVV PDF](https://a.storyblok.com/f/293491369270379/b222ef5a84/fonio-avv-de-06-08-2026.pdf)
- **fonio-Werbeaussagen:** fonio sagt, es werde „alle Daten auf Servern in Deutschland sowie innerhalb der EU speichern“, und biete Löschung auf Anfrage. Das steht in einem gewissen Spannungsverhältnis zur eigenen AVV mit US-Subprozessoren (LiveKit, Soniox, Inworld, New Relic). Das ist eine eigene Beobachtung. — [fonio Blog](https://www.fonio.ai/de/news-cool-stuff/ki-telefonassistent-datenschutz-dsgvo/)
- **Weitere Referenzen (nicht im Detail ausgewertet):**
  - STRATO bietet für seinen KI-Telefonassistenten einen Baustein für die Datenschutzerklärung an. — [STRATO FAQ](https://www.strato.de/faq/ki-tools/ki-telefonassistent-wichtige-ergnzung-fr-ihre-datenschutzerklrung/)
  - IONOS hat eine Datenschutzseite zum „AI Frontdesk“. — [IONOS Hilfe](https://www.ionos.de/hilfe/ki/ai-frontdesk/datenschutz-und-rechtliches/ai-frontdesk-datenschutz-und-datenverarbeitung-im-ueberblick/)
  - CGM veröffentlicht eine eigene AVV für seinen TelefonAssistenten (Arztpraxen). — [CGM AVV PDF](https://www.cgm.com/_Resources/Persistent/b01f1086bfed89ae197db74dc69525918ef661a9/CGM-One-TelefonAssistent-OnlineRezeption-AVV-280426.pdf)
- **EU-US Data Privacy Framework, Stand 2026:**
  - Das EuG hat die Klage Latombe am 3.9.2025 abgewiesen (T-553/23). Am 31.10.2025 folgte das Rechtsmittel zum EuGH (C-703/25 P).
  - Laut einer Quelle ist es per 16.8.2026 anhängig, mit einem Verfahrensbeschluss vom 4.6.2026. Ein Verhandlungstermin war nicht bekannt, die Schätzung lautet auf eine Entscheidung 2027/2028.
  - Das Rechtsmittel setzt den Angemessenheitsbeschluss nicht aus.
  - noyb hat die Kommission am 30.6.2026 aufgefordert, den Beschluss geordnet aufzuheben.
  - Ein Kommentar sieht durch das US-Supreme-Court-Urteil Trump v. Slaughter (2026) die Unabhängigkeitsprämisse geschwächt.
  - Quellen: [EDPL 2026/1](https://edpl.lexxion.eu/article/EDPL/2026/1/15), [Captain Compliance](https://captaincompliance.com/education/eu-us-data-privacy-framework-litigation-status-2026/), [BTLJ](https://btlj.org/2026/02/third-times-the-charm-the-fate-of-the-eu-u-s-data-privacy-framework/), [gawel.ch](https://gawel.ch/insights/64-transatlantic-data-transfers-dpf/)
  - **Achtung:** Das sind überwiegend Sekundärquellen. Der Stand auf CURIA wurde nicht direkt geprüft.

### Inferences
- **Rollenmodell:** Handwerker = Verantwortlicher. Wir = Auftragsverarbeiter. Voice-, LLM-, Telefonie- und Hosting-Anbieter = Unterauftragsverarbeiter. Die AVV muss Art. 28 Abs. 3 vollständig abbilden: Weisungen, Vertraulichkeit, TOMs, Subprozessor-Regelung, Unterstützung bei Betroffenenrechten und Datenpannen, Löschung oder Rückgabe, Nachweise und Audits.
  - Als Ein-Personen-Firma ist es sinnvoll, die AVV in die AGB einzubinden, wie bei fonio. Dazu gehören eine öffentlich abrufbare Subprozessor-Liste und eine Änderungsankündigung mit Widerspruchsrecht.
- **Nutzung für eigene Zwecke:** Nutzen wir Gesprächsdaten selbst, etwa für Produktverbesserung oder Training, verlassen wir die Rolle des Auftragsverarbeiters (Art. 28 Abs. 10). Besser ausschließen, wie fonio.
- **Zweistufige Ansage zu Beginn:** Zuerst die KI-Ansage nach Art. 50 plus Kerninfo nach Art. 13 (wer verantwortlich ist, wofür die Daten verarbeitet werden, Hinweis auf die Datenschutzerklärung unter einer kurzen URL oder per SMS). Die vollständigen Art.-13-Angaben stehen dann in der Datenschutzerklärung des Handwerkers. Dafür sollten wir einen Textbaustein liefern, wie STRATO.
  - Mustertext: „…Ihre Angaben werden für die Bearbeitung Ihres Anliegens an [Betrieb] weitergegeben. Mehr unter [kurz-URL].“
- **Rechtsgrundlagen-Matrix (eigene Einschätzung):**
  - Anfrage aufnehmen und Rückruf-Notiz an den Betrieb: Art. 6 Abs. 1 lit. b oder f.
  - Kurz-Zusammenfassung speichern: lit. f mit kurzer Frist.
  - Audio-Aufnahme oder vollständiges Wortlaut-Transkript dauerhaft: Einwilligung (lit. a), aktiv abgefragt, mit Alternative.
  - Gesundheitsangaben vermeiden, etwa bei barrierefreiem Badumbau oder Pflegebedürftigkeit. Gegebenenfalls ist Art. 9 relevant.
- **Speicherfristen (Vorschlag):**
  - Audio: gar nicht oder kurz.
  - Transkript und Zusammenfassung: 30–90 Tage, wobei fonio 90 Tage als Marktreferenz nutzt.
  - Metadaten: bis zu 6 Monate.
  - Abrechnungsdaten: gesetzliche Fristen.
- **TOMs (Mindestumfang):**
  - EU-Hosting
  - Verschlüsselung in transit und at rest
  - Mandantentrennung
  - 2FA für das Admin-Dashboard
  - Zugriffsprotokollierung
  - Löschkonzept
  - Incident-Response-Prozess mit 72-h-Meldung an den Verantwortlichen
  - Zero-Data-Retention-Verträge mit LLM- und STT-Anbietern
  - kein Training
  - Logs ohne Gesprächsinhalte
- **Drittland:** US-Anbieter nur mit DPF-Zertifizierung und SCC Modul 3 als Rückfallebene, EU-Region bzw. EU-Datenresidenz bevorzugen, Transfer Impact Assessment dokumentieren. Kippt das DPF, sind die SCC sofort die tragende Grundlage. Zusatzmaßnahmen sollten vorbereitet sein.
- **Anthropic als LLM:** Das Datenresidenz- und ZDR-Angebot wurde nicht recherchiert. Dafür sind Vertrag und DPA von Anthropic bzw. eines EU-Hosters (z. B. Cloud-Plattformen mit EU-Region) zu prüfen.

### Gaps
- Der DSK-Beschluss vom 23.3.2018 und die Tätigkeitsberichte (LfDI BW 2024, BayLDA 2025) wurden nur über die DSN-Sekundärquelle ausgewertet, nicht im Original.
- Eine DSK-Orientierungshilfe speziell zu KI-Telefonassistenten oder Voicebots wurde nicht gefunden. Die DSK-OH „KI und Datenschutz“ (Mai 2024) wurde nicht abgerufen.
- Ob eine Datenschutz-Folgenabschätzung (Art. 35) nötig ist, etwa wegen Muss-Liste „Telefongespräche/KI“, wurde nicht geprüft.
- Die DPA- und ZDR-Konditionen von Anthropic und OpenAI 2026 wurden nicht direkt geprüft.
- Den CURIA-Stand zu C-703/25 P konnte ich nicht direkt verifizieren.

## 4. TKG/TDDDG: Fernmeldegeheimnis bei Rufumleitung an einen Dienstleister

### Takeaway
Das Fernmeldegeheimnis steht seit Dezember 2021 in **§ 3 TDDDG** (früher TTDSG, davor § 88 TKG a. F.). Es schützt Inhalt und nähere Umstände der Telekommunikation. Wer es konkret beachten muss, ergibt sich aus § 3 Abs. 2 TDDDG. Ob ein KI-Telefonassistent, der Anrufe als **Gesprächspartner im Auftrag** des Betriebs entgegennimmt, darunterfällt, konnte nicht belastbar geklärt werden. Am meisten spricht dafür, dass wir dann Endpunkt der Kommunikation sind und nicht Übermittler. Den Telefonie-Teil sollte man trotzdem einem regulierten Carrier überlassen, etwa Twilio oder Voxbone wie bei fonio.

### Cited Findings
- Das Fernmeldegeheimnis ist nicht mehr im TKG geregelt, sondern im TTDSG, das inzwischen TDDDG heißt. Nach § 3 Abs. 1 schützt es den Inhalt der Telekommunikation und ihre näheren Umstände, insbesondere die Tatsache, ob jemand an einem TK-Vorgang beteiligt ist. — [gesetze-im-internet.de, § 3 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__3.html) (Seite beim Abruf nicht erreichbar, HTTP 503; Inhalt laut Suchergebnis-Auszügen); [activeMind, § 3 TDDDG](https://www.activemind.legal/de/gesetze/tdddg/paragraf-3/)
- § 3 Abs. 2 nennt die Verpflichteten. Querverweise in Suchergebnissen sprechen von „Anbieter und mitwirkende Personen“. — [lexmea.de § 3 TDDDG](https://lexmea.de/de/gesetz/tdddg/3) (nur Suchergebnis-Auszug)
- Hintergrund: Ein Beitrag in DuD 2/2022 behandelt, ob Arbeitgeber gegenüber ihren Beschäftigten an das Fernmeldegeheimnis gebunden sind. Die Fallgruppe ist verwandt, der Beitrag wurde nicht gelesen. — [DSN/DuD 2022 PDF](https://www.dsn-group.de/fileadmin/user_upload/Blog_Beitraege/PDF/DuD_2_2022_ArbeitgeberUndDasFernmeldegehe.pdf)

### Inferences
- **Verpflichtete (aus Erinnerung, NICHT verifiziert):** Laut § 3 Abs. 2 TDDDG sind das, soweit ich mich erinnere:
  - Anbieter öffentlich zugänglicher TK-Dienste
  - Anbieter ganz oder teilweise geschäftsmäßig angebotener TK-Dienste
  - Betreiber öffentlicher TK-Netze
  - Betreiber von TK-Anlagen, mit denen geschäftsmäßig TK-Dienste erbracht werden
  - jeweils einschließlich mitwirkender Personen

  Vor Verwendung bitte gegen den Normtext prüfen.
- **Unsere Rolle:** Leitet der Handwerker per Rufumleitung zu uns um und nimmt unsere KI das Gespräch als Vertreterin des Betriebs an, sind wir eher **Kommunikationspartner** (wie ein externes Sekretariat oder Callcenter) als Übermittler der Kommunikation. Dann greift vor allem das Datenschutzrecht (DSGVO/AVV) und nicht das Fernmeldegeheimnis. Das ist eine Einschätzung ohne gefundene Quelle.
- **Mögliche Pflichten nach TKG/TDDDG:** Sie können entstehen, wenn wir selbst Rufnummern vergeben, Anrufe an Dritte weiterverbinden (z. B. Notfall-Durchstellung zum Handy des Meisters) oder SIP-Trunks betreiben. Mögliche Folgen sind eine Meldepflicht bei der BNetzA nach § 5 TKG, Notruf- und Rufnummernregeln und das Fernmeldegeheimnis für den Verbindungsteil.
  - Vermeiden lässt sich das, indem Telefonie und Rufnummern über einen regulierten Carrier laufen und wir nur dessen API nutzen.
  - Auch das ist eine Einschätzung, bitte fachlich prüfen.
- **Verpflichtung als Ein-Personen-Firma:** Sicherheitshalber sollten wir uns schriftlich zur Vertraulichkeit verpflichten. Werden später Mitarbeiter eingestellt, kommt eine Verpflichtung auf Datengeheimnis und Fernmeldegeheimnis hinzu.

### Gaps
- Der vollständige Wortlaut von § 3 Abs. 2 TDDDG wurde nicht abgerufen (gesetze-im-internet 503, buzer 403).
- Keine Kommentierung und keine BNetzA-Äußerung zur Frage gefunden, ob Anbieter von KI- oder Callcenter-Annahmediensten „mitwirkende Personen“ oder TK-Diensteanbieter sind.
- Eine TKG-Meldepflicht für Voicebot-Anbieter mit eigenen Rufnummern wurde nicht recherchiert.

## 5. Haftung: falsche Auskünfte, verpasster Notfall (Rohrbruch), Terminzusagen der KI, Verbraucherschutz

### Takeaway
Für KI gibt es kein Sonderhaftungsrecht. Erklärungen und Fehler des Assistenten werden nach allgemeinem Zivilrecht dem **Handwerksbetrieb** zugerechnet. Die KI ist kein Stellvertreter, weil sie keinen eigenen Willen hat. Ihre Erklärungen gelten als automatisierte Erklärungen des Betriebs, Übermittlungsfehler können wie Botenfehler behandelt werden. Unser Haftungsrisiko gegenüber dem Handwerker entsteht vertraglich und lässt sich nur begrenzt durch AGB beschränken. Konkrete Quellen zum Notfall-Szenario wurden nicht gefunden.

### Cited Findings
- Ein Vertreter nach §§ 164 ff. BGB braucht eine eigene Willenserklärung. Eine KI hat keinen eigenen Willen und kann daher nicht Stellvertreter sein. Die Erklärung stammt vom Nutzer selbst, „nur automatisiert“. — [Händlerbund, Agentic Commerce](https://www.haendlerbund.de/de/ratgeber/recht/agentic-commerce)
- Es gibt kein Sonderhaftungsregime für KI. Es gelten die allgemeinen Regeln des Zivilrechts: keine automatische Haftung „wegen KI“, aber auch keine leichte Enthaftung, nur weil eine KI beteiligt war. Übermittelt die KI eine Erklärung falsch, etwa durch einen Softwarefehler, kann das wie ein klassischer Übermittlungsfehler behandelt werden. — [Händlerbund](https://www.haendlerbund.de/de/ratgeber/recht/agentic-commerce)
- Handelt ein Unternehmer (§ 14 BGB) im B2B-Verhältnis über einen KI-Agenten, besteht kein Widerrufsrecht. — [Händlerbund](https://www.haendlerbund.de/de/ratgeber/recht/agentic-commerce)
- Eine Monografie (OAPEN) behandelt die Zurechnung computergenerierter Willenserklärungen und KI als Erfüllungs- bzw. Verrichtungsgehilfe. Nur das Inhaltsverzeichnis wurde gesehen. — [OAPEN PDF](https://library.oapen.org/bitstream/20.500.12657/46172/1/external_content.pdf)
- Ein Anbieter-Blog (Famulor) behauptet, eine neue Regel schließe die Verteidigung „die KI war's“ aus. Er nennt weder Norm noch Datum, die Aussage ist **nicht verifiziert**. — [Famulor Blog](https://www.famulor.io/de/blog/ai-agent-liability-who-is-responsible-for-voice-ai-mistakes)
- Laut ORF sollen Software- und KI-Anbieter künftig stärker für fehlerhafte Produkte haften. Das bezieht sich auf die neue EU-Produkthaftungsrichtlinie. — [ORF](https://orf.at/stories/3446389/); Richtlinie (EU) 2024/2853: [EUR-Lex](https://eur-lex.europa.eu/eli/dir/2024/2853/oj) (nicht im Rahmen dieser Recherche abgerufen)

### Inferences
- **Terminzusagen:** Bestätigt die KI einen Termin („Wir kommen Dienstag 8 Uhr“), muss sich der Betrieb das voraussichtlich zurechnen lassen. Mögliche Folge sind Schadensersatz bei Nichterscheinen, etwa wegen Urlaubstag des Kunden.
  - **Gegenmittel:** Die KI nimmt nur **Terminwünsche** auf, mit dem Satz „Der Betrieb bestätigt Ihnen den Termin“. Feste Buchungen gibt es nur in vom Betrieb freigegebene, kalendergebundene Slots.
  - Preise, Festpreise, Garantien und Fristen nennt die KI nicht, außer aus einer vom Betrieb freigegebenen Wissensbasis.
- **Notfälle (Rohrbruch, Gasgeruch, Stromausfall):**
  - Erkennt die KI eine Notlage nicht oder leitet sie nicht weiter, kann das zu Ansprüchen gegen den Betrieb führen, etwa bei einem Wartungsvertrag mit Notdienstzusage. Indirekt kann es auch zu Regress gegen uns führen.
  - **Gegenmittel:** feste Notfall-Erkennung über Schlüsselwörter und eine LLM-Klassifikation.
  - Bei Gas, Feuer oder Gefahr für Leib und Leben folgt der sofortige Hinweis auf 112 bzw. die Gas-Störungsnummer des Netzbetreibers.
  - Hinzu kommt eine Echtzeit-Weiterleitung oder SMS/Push an die Notdienstnummer des Betriebs, mit Protokoll.
  - Im Vertrag steht klar, dass der Assistent keinen Notdienst ersetzt.
  - Diese Empfehlung beruht auf eigener Einschätzung, keine Quelle wurde gefunden.
- **Verbraucher als Anrufer:**
  - Schließt die KI selbst Verträge mit Verbrauchern am Telefon, etwa verbindliche Aufträge, könnten die Fernabsatzregeln greifen: Widerrufsrecht, Informationspflichten, Bestätigung auf dauerhaftem Datenträger. Voraussetzung ist ein „für den Fernabsatz organisiertes Vertriebs- oder Dienstleistungssystem“ (§ 312c BGB).
  - Ein automatisierter Annahme-Assistent könnte als solches System gewertet werden.
  - Sicherer ist, dass die KI **keine Verträge schließt**, sondern nur Anfragen aufnimmt.
  - Das ist eine eigene Einschätzung, Normtext und Kommentierung wurden nicht abgerufen.
- **Unser Vertrag mit dem Handwerker (B2B):**
  - Haftungsbegrenzung in AGB ist nur in den Grenzen von §§ 307 ff. BGB wirksam. Kein Ausschluss bei Vorsatz oder grober Fahrlässigkeit und bei Verletzung von Leben, Körper oder Gesundheit. Bei wesentlichen Pflichten ist nur eine Begrenzung auf den vorhersehbaren Schaden möglich.
  - Klare Leistungsbeschreibung: Der Assistent ist ein Annahme- und Notizdienst, liefert keine verbindlichen Auskünfte und keine Notdienst-Garantie. Der Betrieb ist für Wissensbasis, Preise und Freigaben verantwortlich. Dazu kommt eine Verfügbarkeits-SLA ohne Garantie.
  - Eine Berufs- oder Betriebshaftpflicht- bzw. Cyber-Versicherung mit IT-Dienstleistungs-Deckung ist zu prüfen.
- **Produkthaftung:** Software gilt nach der neuen Produkthaftungsrichtlinie als Produkt. Die Umsetzungsfrist läuft nach meinem Kenntnisstand bis 9.12.2026, **nicht verifiziert**. Das betrifft vor allem Personen- und Sachschäden bei Privatpersonen. Für reine Vermögensschäden der Handwerker gilt sie nicht.

### Gaps
- Keine Rechtsprechung zu Fehlern von KI-Telefonassistenten oder Voicebots in Deutschland gefunden.
- Keine Quelle zur Anwendbarkeit von § 312c BGB auf KI-Annahmedienste von Handwerkern gefunden.
- Den Stand der deutschen Umsetzung der Produkthaftungsrichtlinie 2024/2853 (neues ProdHaftG) habe ich nicht recherchiert.
- Ob die KI-Haftungsrichtlinie 2025 endgültig zurückgezogen wurde, habe ich nicht recherchiert.

## 6. Praxisreferenz: Was deutsche und DACH-Wettbewerber auf Compliance- und AVV-Seiten sagen

### Takeaway
fonio, der am besten dokumentierte Wettbewerber, liefert eine Blaupause:
- AVV als AGB-Bestandteil
- öffentliche, versionierte Subprozessor-Liste mit Transfermechanismus je Anbieter (DPF + SCC Modul 3)
- EU-Hosting (Hetzner/OVH mit BSI C5)
- Zero-Data-Retention bei LLM, STT und TTS
- kein Training
- keine Voiceprints
- feste Löschfristen
- Fallback-Anbieter für Berufsgeheimnisträger aus

Werbeaussagen wie „alle Daten in Deutschland/EU“ oder Badges wie „EU AI Act konform“ halten einer genauen Prüfung der eigenen AVV nur teilweise stand. Aaron.ai und Teneo konnten im Rechercherahmen nicht ausgewertet werden.

### Cited Findings
- **fonio-Blog vom 06.11.2026:**
  - Die AVV ist standardmäßig Vertragsbestandteil.
  - Daten werden auf Servern in Deutschland und der EU gespeichert.
  - Die KI-Hinweispflicht gilt ab 2.8.2026.
  - Aufzeichnung erst nach Einwilligung, heimliche Aufzeichnung ist nach § 201 StGB strafbar.
  - Konkrete Fristen, TOMs oder Zertifikate werden auf der Seite nicht genannt.
  - Quelle: [fonio Blog](https://www.fonio.ai/de/news-cool-stuff/ki-telefonassistent-datenschutz-dsgvo/)
- **fonio-AVV:** Details siehe Abschnitt 3: Rollen, Subprozessoren mit Standorten und Transfergrundlagen, Löschfristen, kein Training, keine Stimmidentifikation, Reseller-Klausel, Fallback-Regelung für Berufsgeheimnisträger. — [fonio AVV PDF](https://a.storyblok.com/f/293491369270379/b222ef5a84/fonio-avv-de-06-08-2026.pdf); AGB: [fonio AGB PDF](https://a.storyblok.com/f/293491369270379/x/6f81ae5455/fonio-agb-de-06-08-2026.pdf) (nicht ausgewertet)
- **Weitere Anbieter mit eigenen Rechts- und Datenschutzseiten** (nur als Suchtreffer gesehen, nicht ausgewertet):
  - [IONOS AI Frontdesk](https://www.ionos.de/hilfe/ki/ai-frontdesk/datenschutz-und-rechtliches/ai-frontdesk-datenschutz-und-datenverarbeitung-im-ueberblick/)
  - [STRATO KI-Telefonassistent, Datenschutzerklärungs-Baustein](https://www.strato.de/faq/ki-tools/ki-telefonassistent-wichtige-ergnzung-fr-ihre-datenschutzerklrung/)
  - [CGM One TelefonAssistent AVV](https://www.cgm.com/_Resources/Persistent/b01f1086bfed89ae197db74dc69525918ef661a9/CGM-One-TelefonAssistent-OnlineRezeption-AVV-280426.pdf)
  - [Famulor DSGVO-Seite](https://www.famulor.io/de/ki-telefonassistent-dsgvo)
  - [zeeg.me-Vergleich](https://zeeg.me/content/dsgvo-konforme-ki-telefonassistenten)
- **zeeg.me (Konkurrent, also mit Vorsicht):** Listet fonio mit Serverstandort Deutschland und „OpenAI via Azure EU“. Die fonio-AVV nennt dagegen OpenAI Ireland direkt mit EU-Datenresidenz, die Angaben widersprechen sich. — [zeeg.me](https://zeeg.me/content/dsgvo-konforme-ki-telefonassistenten) vs. [fonio AVV](https://a.storyblok.com/f/293491369270379/b222ef5a84/fonio-avv-de-06-08-2026.pdf)

### Inferences
- **Mindest-Dokumentenpaket für den Marktstart als Ein-Personen-Anbieter:**
  1. AGB mit Leistungsbeschreibung und Haftungsbegrenzung
  2. AVV nach Art. 28 mit TOM-Anhang und versionierter Subprozessor-Liste
  3. Textbaustein für die Datenschutzerklärung des Handwerkers
  4. nicht abschaltbare Begrüßungsansage nach Art. 50 KI-VO und Art. 13 DSGVO
  5. Löschkonzept
  6. Transfer Impact Assessment für US-Anbieter
  7. Verzeichnis der Verarbeitungstätigkeiten als Auftragsverarbeiter (Art. 30 Abs. 2)
  8. Incident-Prozess
- **Keine Badges ohne Beleg:** „EU AI Act konform“ oder „100 % DSGVO-konform“ nicht ohne Nachweis verwenden. Solche Aussagen können als Irreführung nach § 5 UWG angreifbar sein. Das passt zur eigenen Projektregel „nur belegte Aussagen“.

### Gaps
- Die Compliance- und AVV-Seiten von **Aaron.ai** und **Teneo** wurden nicht abgerufen, das Recherchebudget war ausgeschöpft.
- Die fonio-AGB, darunter Haftungs- und Notfallklauseln, wurden nicht ausgewertet.
- Ob Wettbewerber in AGB oder AVV regeln, wer die KI-Ansage verantwortet (Anbieter oder Kunde), wurde nicht gefunden. Die fonio-AVV enthält dazu laut Textsuche keine Klausel.
