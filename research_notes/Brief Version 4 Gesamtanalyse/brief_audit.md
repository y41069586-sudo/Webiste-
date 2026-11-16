# Brief Version 4: Prüfung nach Direktwerbe-Regeln (Abschnitt für Abschnitt)

> Geprüft: `reports/brief-v5/brief4.html` (Titel „Brief-Entwurf V5.4“) und das gerenderte Bild `reports/brief-v5/v4-1.png`. Grundlage sind die Vorberichte `reports/Oberes Drittel im Werbebrief.md` und `reports/Wann Handwerker ihre Post lesen.md`, dazu Webquellen und der Projekt-Code, mit dem Aussagen im Brief gegen das tatsächliche Systemverhalten geprüft wurden.
> Kennzeichnung: **[Quelle]** = belegt mit Link. **„Schlussfolgerung“** = eigene Ableitung, nicht gemessen. Repo-Dateien sind als Pfad angegeben.
> Rahmen laut Auftrag: B2B an Handwerksbetriebe, keine erfundenen Zahlen, kein falscher Zeitdruck, keine Testimonials. Kontakt nur per E-Mail (keine Telefonnummer, kein WhatsApp). Preise stehen bewusst nicht im Brief; das ist dokumentiert in `docs/entscheidungen.md` (ca. Z. 311: „Preise und Tarifdetails entfallen im Brief“). Geprüft wird deshalb nur, ob der Brief klar sagt, **dass** die Übernahme Geld kostet.

---

## 1. Welche stummen Leserfragen beantwortet der Brief, wo, und welche fehlen oder kommen zu spät?

### Takeaway
Zwei Fragen beantwortet V4 gut und früh: „Wer schreibt mir?“ (Briefkopf rechts oben) und „Was muss ich tun?“ (QR-Kasten „Jetzt ansehen“). „Was ist das?“ wird oben beantwortet, unten aber wieder verwischt: Dieselbe Sache heißt einmal „Entwurf“, einmal „Ihre Website ist fertig und schon online“ und einmal „Vorschau“. Drei Fragen fehlen oder kommen zu spät. **„Was habe ich davon?“** steht nur als negative Angstgeschichte da. **„Was kostet es?“** wird oben scheinbar mit „nichts bezahlen“ beantwortet; dass die Übernahme Geld kostet, steht nur in 7-pt-Kleingedrucktem in der Fußzeile. **„Was passiert, wenn es mir gefällt?“** beantwortet der Brief gar nicht.

### Cited Findings
- Die Deutsche Post nennt nach dem Siegfried Vögele Institut fünf „stumme Leserfragen“: „Wer schreibt mir? Was wird mir angeboten? Was sind Vorteile für mich? Was kostet das? Was muss ich tun, um mehr zu erfahren?“ Eine gute Antwort erzeugt ein „kleines Ja“ (Verstärker), eine fehlende oder schwache ein „kleines Nein“ (Filter) — [Deutsche Post, Themenheft Werbebriefsendung, S. 12](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf)
- Auf der Filter-Liste von Vögele stehen unter anderem „fehlende Produkt- und Serviceinformationen“, „schwache Vorteilsargumentation“, „Hervorhebung des eigenen Unternehmens- oder Produktnamens“ und **„Kleingedrucktes“** — [Deutsche Post, Themenheft, S. 13](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf)
- Ein wirksames Anschreiben enthält nach der Deutschen Post unter anderem „ein gutes und konkret benanntes Angebot“ und „eine klare Aufforderung, was der Empfänger tun soll“. Das Schreiben „teilt dem Empfänger genau mit, was er tun muss, um das Angebot anzunehmen“ — [Deutsche Post, Themenheft, S. 22](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf)
- Die IHK Berlin nennt bei Adressbuch- und Korrekturabzug-Schwindel ausdrücklich **„Kosten im Kleingedruckten“** als Merkmal, außerdem Schreiben, in denen der Betrieb „seine eigene alte Werbeanzeige“ erkennt (zitiert im Vorbericht) — [IHK Berlin, Merkblatt Adressbuchschwindel](https://www.ihk.de/blueprint/servlet/resource/blob/3302852/acc8828f4a6c7b3e713d886b071d6bb2/merkblatt-adressbuchschwindel-data.pdf), via `reports/Oberes Drittel im Werbebrief.md`
- § 5a UWG: Unlauter ist auch das Vorenthalten einer wesentlichen Information. Als Vorenthalten gilt auch, sie „in unklarer, unverständlicher oder zweideutiger Weise“ oder „nicht rechtzeitig“ bereitzustellen (Abs. 2). Das gilt auch gegenüber „sonstigen Marktteilnehmern“, also auch gegenüber Betrieben (Abs. 1) — [dejure.org, § 5a UWG](https://dejure.org/gesetze/UWG/5a.html)
- Bob Stones Sieben-Schritte-Formel lautet: stärkster Nutzen zuerst, Nutzen ausbauen, genau sagen, was man bekommt, Beweis, was man verliert, Zusammenfassung, Handlungsaufforderung — [HubSpot, Bob Stone's Gem](https://blog.hubspot.com/marketing/bob-stones-gem-copywriting-formula); [VeryGoodCopy](https://verygoodcopy.com/verygoodcopy-blogs-12/bob-stones-gem)
- Nach der 40/40/20-Faustregel, die Ed Mayer zugeschrieben wird, entscheiden Liste und **Angebot** je zu 40 % über den Erfolg eines Mailings, Gestaltung und Text nur zu 20 %. Die Quellen sind Sekundärquellen (Druckereien, Blogs) — [PsPrint](https://content.psprint.com/resources/404020-rule-of-direct-mail-marketing); [Chief Marketer](https://chiefmarketer.com/broken-graphics-and-the-404020-rule)
- Der Code zeigt, welche Zusagen das Angebot tatsächlich hergibt und die der Brief nutzen könnte: „Kostenlose Anpassung vor dem Kauf – ein kurzer Wunsch genügt“, „Online erst nach Ihrer Freigabe“, „Die Domain wird auf Ihren Betrieb registriert – bei Kündigung nehmen Sie sie mit“, „Basis monatlich kündbar“ — `packages/core/src/demos/offer-options.ts` (Z. ca. 138–147)

**Wo V4 die Fragen beantwortet** (eigene Prüfung von `brief4.html` / `v4-1.png`):

| Leserfrage | Wo im Brief | Bewertung |
|---|---|---|
| Wer schreibt mir? | Briefkopf rechts: „Doaa Attia · Websites für Handwerksbetriebe · support@… · seitenwerk.world“; Logo links; Unterschrift | **Gut, aber geteilt.** Logo „SeitenWerk“ links und Person rechts wirken wie zwei Absender. Kein Ort im Kopf, die Anschrift steht nur in der 6,6-pt-Rücksendezeile und im Kleingedruckten. Die Frage „Warum schreibt mir jemand aus Fürstenzell nach Göttingen?“ bleibt offen. `support@` klingt nach Callcenter, nicht nach einer Person. |
| Was ist das? | Betreff rechts: „Ich habe für Dachdeckerbetrieb Müller schon eine Website gebaut.“ + „Ein unverbindlicher Entwurf zum Ansehen.“ | **Gut oben, unten verwässert.** Der Einleitungsabsatz behauptet wieder „Ihre Website ist fertig und schon online“. Das ist genau die Formulierung, die der Vorbericht als Nähe zum Korrekturabzug-Muster einstuft. |
| Was habe ich davon? | Nur indirekt: Sofa-Geschichte („… ruft er den Nächsten an. Sie erfahren nie davon.“) | **Schwach.** Kein positiver Nutzen, nur Verlustangst. Was auf der Seite steht und was sie für den Betrieb tut, sagt der Brief nicht. |
| Was kostet es? | Oben: „Sie müssen … nichts bezahlen.“ Unten in 7 pt: „Kostenpflichtig wird es nur, wenn Sie die Website übernehmen.“ | **Zu spät, zu klein und auf den ersten Blick widersprüchlich.** Beim Überfliegen bleibt „nichts bezahlen“ hängen. |
| Was muss ich tun? | QR-Kasten „Jetzt ansehen“, „Handykamera auf den Code halten“ | **Gut.** Ein klarer Hauptschritt, der Code ist groß (42 mm). |
| (Zusatz) Was passiert, wenn es mir gefällt? | Nirgends. Nur „Auf Wunsch läuft die Website unter Ihrer eigenen Adresse …“ | **Fehlt.** Es fehlen: übernehmen, Domain auf den Betrieb, online erst nach Freigabe, Anpassung möglich. |
| (Zusatz) Wo ist der Haken / Woher haben Sie meine Daten? | Datenherkunft im Art.-14-Kleingedruckten; der „Haken“ (Kosten) nur in 7 pt | Teilweise beantwortet, aber nur im Kleingedruckten. |

### Inferences
- Schlussfolgerung: Das Kostenproblem ist der wichtigste Mangel. Wer nur Betreff und Entwarnung liest, versteht „nichts bezahlen“. Die Einschränkung steht im Kleingedruckten. Genau dieses Muster (Gratis-Eindruck oben, Kosten unten klein) beschreiben die Kammern als Betrugsmerkmal. Für einen Brief, der ohnehin wie ein Korrekturabzug wirken kann, ist das ein vermeidbares Vertrauensrisiko. Juristisch ist es vermutlich noch vertretbar, weil der Preis vor der Kaufentscheidung in der Vorschau erscheint. Es passt aber schlecht zu § 5a Abs. 2 UWG („unklar … zweideutig“). Die Lösung ist billig: **ein ehrlicher Satz im Text**, zum Beispiel „Ansehen kostet nichts. Wenn Sie die Website behalten möchten, kostet sie Geld – den Preis sehen Sie vorher in der Vorschau.“ Preise müssen dafür nicht in den Brief.
- Schlussfolgerung: Nach Bob Stone fehlen die Schritte 2 (Nutzen ausbauen) und 3 (genau sagen, was man bekommt) fast ganz. Schritt 5 (Verlust) ist dagegen überbetont: Geschichte, „gelöscht – mit allem“ und P.S. arbeiten alle mit Verlust oder Bedauern.
- Schlussfolgerung: Das Angebot, also die 40 % nach Mayer, ist im Brief unsichtbar. Das liegt nicht an der Preisentscheidung, denn auch ohne Preise lässt sich sagen, was man bekommt: Domain auf den eigenen Betrieb, online erst nach Freigabe, Anpassung vor dem Kauf.

### Gaps
- Es gibt keine Messung, ob Handwerker auf „Ansehen kostet nichts – behalten kostet Geld“ besser oder schlechter reagieren als auf die jetzige Fassung. Die Empfehlung ist aus Vertrauens- und Rechtsquellen abgeleitet.
- Ob die Formulierung „nichts bezahlen“ im B2B-Kontext rechtlich angreifbar ist, kann nur eine Rechtsberatung klären. Die Sondertatbestände im Anhang zu § 3 Abs. 3 UWG (etwa „gratis“-Angaben) gelten nach meinem Kenntnisstand nur gegenüber Verbrauchern. Die Gesetzesseite war beim Abruf nicht erreichbar (HTTP 503), daher ist das nicht geprüft.

---

## 2. Gibt es einen klaren „Reason why“ (warum dieser Betrieb, warum ich, warum jetzt)?

### Takeaway
Nein. Der Brief sagt *was* gemacht wurde, aber nicht *warum*. **Warum dieser Betrieb?** Nicht genannt; dabei ist der Auswahlgrund ehrlich und stark: Es wurde keine eigene Website gefunden. **Warum ich, warum zuerst bauen?** Nur angedeutet und grammatisch schief („bevor Sie mich kennen“). **Warum jetzt?** Nur über die Frist „14 Tage … danach gelöscht“. Diese Frist passt außerdem nicht zum tatsächlichen Systemverhalten (siehe Frage 3) und widerspricht der eigenen Projektregel („bis {Datum} online“ statt Löschfrist in Tagen).

### Cited Findings
- Claude Hopkins’ „Reason-why“-Ansatz: Werbung soll konkrete Gründe nennen statt allgemeinem Lob, weil man von Verkäufern Übertreibung erwartet und „allgemeine Aussagen deshalb wenig zählen“ — [Wikipedia, Claude C. Hopkins](https://en.wikipedia.org/wiki/Claude_C._Hopkins); [SOFII über Hopkins](https://sofii.org/article/advertisings-earliest-genius-and-how-he-can-help-your-advertisements-to-work-better-predictably)
- Die Deutsche Post rät, den Empfänger „direkt zu Beginn emotional ‚abzuholen‘“: Der Absender soll auf dessen Bedürfnisse eingehen und „das Angebot als Lösung anbieten“ — [Deutsche Post, Themenheft, S. 22](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf)
- Laut Projekt-Spezifikation wählt der Lead-Finder Betriebe „ohne Website / nur Social“ mit vollständiger Anschrift aus. Seit Task 57 prüft zusätzlich eine KI mit Websuche — `CLAUDE.md` §5.1; Taskliste #57
- Laut Projekt-Spezifikation soll der Brief „‚bis {Ablaufdatum} online‘ statt Löschfrist in Tagen“ nennen — `CLAUDE.md` §5.5
- Der Vorbericht nennt „Fristen, Countdown, Rot, ‚löschen‘“ als Elemente, die nach Rechnung oder Mahnung aussehen. Anbieter berichten, dass falsche Dringlichkeit Vertrauen schneller zerstört, als sie Abschlüsse bringt — `reports/Oberes Drittel im Werbebrief.md`; [Lob](https://www.lob.com/blog/how-to-create-urgency-in-direct-mail-offers-that-convert) **[Anbieter]**
- Löschung ist im System tatsächlich angelegt. Ein abgelaufener Entwurf wird mit Dateien und Texten gelöscht („Abgelaufene Demos: Dateien und Texte löschen“) — `packages/core/src/services/retention.ts` (Z. ca. 70–107)

### Inferences
- Schlussfolgerung, **warum dieser Betrieb**: Ein ehrlicher Satz wie „Ich habe Ihren Betrieb ausgewählt, weil ich im Netz keine eigene Website von Ihnen gefunden habe“ beantwortet die Frage „Warum ich?“. Er macht den Brief zugleich weniger beliebig. Die Formulierung „gefunden“ beschreibt die eigene Prüfung und behauptet nicht, dass es keine Website gibt. Das ist wichtig, weil OpenStreetMap-Daten unvollständig sein können. Eine Bewertung (Sterne) sollte nicht hinein: Die Quelle ist OSM, dort gibt es keine Bewertungen, und der Schalter `USE_RATING_IN_LETTER` gehört nur zu Google-Daten.
- Schlussfolgerung, **warum zuerst bauen**: Das ungewöhnliche Vorgehen ist selbst der stärkste Grund und braucht eine Begründung, sonst wirkt es wie ein Trick. Zum Beispiel: „Ich baue zuerst und frage dann, weil man eine Website besser beurteilen kann, wenn man sie schon sieht.“
- Schlussfolgerung, **warum jetzt**: Eine wahre und ruhige Begründung für die Frist ist die Datensparsamkeit: „Entwürfe ohne Auftrag lösche ich danach wieder.“ Das ist wahr (retention.ts), passt zum Art.-14-Hinweis und ersetzt die Schuld-Formulierung „gelöscht – mit allem, was ich für Sie gebaut habe“. Voraussetzung: Das genannte Datum stimmt mit dem System überein (siehe Frage 3).
- Schlussfolgerung, **warum aus Fürstenzell**: Ein halber Satz wie „Ich arbeite von Fürstenzell bei Passau aus, alles läuft schriftlich“ beantwortet die Ortsfrage. Er macht zugleich aus „keine Telefonnummer“ ein bewusstes Merkmal statt einer Lücke.

### Gaps
- Es gibt keinen Beleg, ob ein offen genannter Auswahlgrund („keine Website gefunden“) bei Handwerkern als Kompliment („Sie laufen auch ohne Website“) oder als Kritik („Ihnen fehlt etwas“) ankommt. Das wäre ein Kandidat für einen deutlichen A/B-Unterschied, nicht für Feinschliff.

---

## 3. Ist die Handlungsaufforderung eindeutig? Was ist verwirrend, widersprüchlich, zu lang, zu werblich oder klingt nach KI?

### Takeaway
Die **Haupt-Handlungsaufforderung ist eindeutig**: einscannen, „Jetzt ansehen“, großer Code, einfacher Hinweis. Problematisch sind die **Widersprüche** rund um Kosten, Begriffe, Frist und Namen. Die wichtigste Abweichung zwischen Brief und System: Der Brief sagt „bis Freitag, 4. Dezember online. Danach wird sie gelöscht“. Das System hält den Entwurf aber standardmäßig mindestens 30 Tage ab Versand und verlängert ihn mit Folgebrief 2 erneut. Wird gesendet wie konfiguriert, stimmt die Aussage nicht. Das ist eine Irreführungsgefahr bei der „Verfügbarkeit“ (§ 5 Abs. 2 Nr. 1 UWG). Dazu fällt der Brief beim Prüfen nur der Hervorhebungen durch: Fett gedruckt sind Telefonnummer, Frist, „Kein Anruf …“ und „Kein Interesse?“, also kein Nutzen und kein Angebot. Einige Muster klingen nach KI: drei Dreierreihen, „Stellen Sie sich vor:“, dramatische Kurzsätze und gehäufte Gedankenstriche.

### Cited Findings
- § 5 Abs. 2 Nr. 1 UWG: Irreführend sind unwahre oder täuschende Angaben über „die wesentlichen Merkmale der Ware oder Dienstleistung wie **Verfügbarkeit**, Art, Ausführung, Vorteile, Risiken …“ — [dejure.org, § 5 UWG](https://dejure.org/gesetze/UWG/5.html)
- § 5a Abs. 4 UWG: Unlauter handelt, „wer den kommerziellen Zweck einer geschäftlichen Handlung nicht kenntlich macht, sofern sich dieser nicht unmittelbar aus den Umständen ergibt“ — [dejure.org, § 5a UWG](https://dejure.org/gesetze/UWG/5a.html)
- **System gegen Brieftext (Code):**
  - Das „online bis“-Datum im Erstbrief ist `heute + demoExpiryDays` — `packages/core/src/render/letter.ts` `statedExpiry()` (Z. ca. 86–95). Standard sind `demoExpiryDays: 30` — `packages/core/src/config/settings.ts` (Z. 847).
  - Beim Versand wird der Entwurf auf „Versanddatum + demoExpiryDays“ verlängert, mindestens aber bis zum genannten Datum — `packages/core/src/services/sending.ts` (Z. ca. 292–294); `packages/core/src/services/demo-review.ts` `extendDemoExpiry()` (Z. 277–282).
  - Folgebrief 2 kommt 12 Tage nach der geschätzten Zustellung (`followupAfterDays: 12`) und verlängert den Entwurf bis „Zustellung + 7 Tage“ — `packages/core/src/services/followups.ts` (Z. 34); `settings.ts` (Z. 848).
  - Im Entwurf V4 steht dagegen: Datum 17.11., „14 Tage“, „bis Freitag, 4. Dezember“ (also 17 Tage nach Briefdatum), „Danach wird sie gelöscht“.
- Hervorhebungen: höchstens eine pro Absatz, höchstens eine halbe Zeile. Faustregel „Schnell-Lese-Botschaft“: „Nur anhand der Hervorhebungen sollte der Empfänger verstehen, worum es geht, und die wichtigsten Vorteile erfassen können.“ Hervorhebungen wirken als Verstärker, „wenn sie Vorteile darstellen“ — [Deutsche Post, Themenheft, S. 23](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf)
- Kursivschrift kann die „Zusatzbedeutung eines Zitats“ haben. Es soll eine einheitliche Art der Hervorhebung gewählt werden — [Deutsche Post, Themenheft, S. 23](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf)
- Absätze: der erste dreizeilig, im Schnitt 3–4 Zeilen, höchstens 5–6. Einzeilige Absätze wirken wie Zwischenüberschriften und stören den Blickverlauf — [Deutsche Post, Themenheft, S. 23](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf)
- Schrift: „normale Schriftgröße (10 bis 12 Punkt)“, klar lesbar, Flattersatz, höchstens eine Seite — [Deutsche Post, Themenheft, S. 24](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf). V4 setzt den Fließtext in 9,5 pt, den Einstieg in 10 pt und das Kleingedruckte in 6–7 pt (`brief4.html` CSS).
- Satzlänge: In der Verständlichkeitsforschung gilt der Anteil von Sätzen über 20 Wörtern als Standardkennzahl. Ratgeber empfehlen unter 20 Wörter. Die oft zitierte dpa-Grenze von 9 Wörtern für „optimale Verständlichkeit“ fand sich nur in einer Sekundärtabelle — [Uni Hohenheim, Verständlichkeitsstudien (Brettschneider)](https://komm.uni-hohenheim.de/uploads/media/Verstaendlichkeit_Berichterstattung_zur_BTW_2009_05.pdf); [Baker McKenzie/Harbst-Risse 2022](https://www.bakermckenzie.com/-/media/minisites/germany-careers/files/2022/harbst_risse_aufmerksamkeitsspanne_wif1_2022.pdf) (Sekundärangabe). V4 hält das fast überall ein; der längste Fließtextsatz („Stellen Sie sich vor: Heute Abend …“) hat etwa 19 Wörter (eigene Zählung).
- Verneinungen: Ein Bielefelder Psycholinguist sagt, Verneinungen verlangsamen die Verarbeitung (Presseberichte, Sekundärquelle) — [vienna.at](https://www.vienna.at/nein-im-satz-verwirrt-das-gehirn/2187718). Eine Basler Studie (Social Cognition 2022) fand dagegen, dass verneint formulierte Aussagen **eher für wahr gehalten** werden — [Universität Basel](https://www.unibas.ch/de/Aktuell/News/Uni-Research/Verneint-und-daher-wahr-Wir-glauben-negativ-formulierte-Aussagen-eher.html)
- Antwortmöglichkeit: „der heimliche Star jeder Mailingaktion“, „Jede Direktwerbeaktion ohne Dialogangebot ist eine verpasste Geschäftschance“. Auch ein „kein Interesse“ ist eine wertvolle Antwort — [Handwerksblatt, Die Renaissance des Werbebriefs](https://www.handwerksblatt.de/betriebsfuehrung/die-renaissance-des-werbebriefs)
- Das Projekt selbst verbietet „unbelegte Zahlen oder Wirkungsversprechen in Briefen“ (§ 5 UWG) — `CLAUDE.md` §0 Regel 8
- Das Projekt hat eine eigene Prüfung auf „KI-Floskeln“ für Demo-Texte (Task 67: „Floskel-Filter, Prompt-Stilregeln, KI-Muster-Prüfung“) — Taskliste #67

**Liste der Widersprüche und Unklarheiten in V4** (eigene Prüfung):

1. **Kosten:** oben „nichts bezahlen“, unten in 7 pt „Kostenpflichtig wird es nur, wenn …“ (siehe Frage 1).
2. **Drei Begriffe für eine Sache:** „Entwurf“ (Betreff), „Ihre Website ist fertig und schon online“ (Einstieg), „Ihre Vorschau“ (Fristkasten), dazu „Website“ (Hinweis unten). Wer überfliegt, weiß nicht: Gibt es die Website schon, oder ist das ein Entwurf?
3. **Frist:** „14 Tage“ passt nicht zu Briefdatum 17.11. bis 4.12. (17 Tage). Eine Tageszahl ist laut `CLAUDE.md` §5.5 nicht vorgesehen. „Danach wird sie gelöscht“ stimmt nicht mit `demoExpiryDays`/Folgebrief überein (siehe oben).
4. **„Den Link gibt es nur in diesem Brief“** steht neben dem Art.-14-Hinweis „höchstens 3 Briefe“. Folgebriefe tragen wieder einen Link. Das ist kein harter Widerspruch, aber eine zugespitzte Exklusivität.
5. **Firmenname dreifach verschieden:** Anschrift „Müller“, Betreff „Dachdeckerbetrieb Müller“, Anrede „Team von Müller“. Der Vorbericht empfiehlt den vollständigen Betriebsnamen schon in der Anschrift.
6. **Opt-out über den QR-Code:** „Kein Interesse? Code scannen und mit einem Klick abmelden“ macht denselben Code zum Kauf- und zum Abmeldeweg. Folge für die Messung (Schlussfolgerung): Abmelde-Scans zählen als `scan`-Ereignis und erhöhen die Scan-Quote. Im Funnel sollte das getrennt werden.
7. **Grammatik:** „Ich habe sie gebaut, bevor Sie mich kennen“ ist zeitlich schief; besser „ohne dass Sie mich kennen“ oder „bevor Sie von mir wussten“. „Ob Sie sie nutzen … sehen sollten Sie sie vorher“ stolpert über „sie sie“.
8. **Anrede als Überschrift:** „Guten Tag, liebes Team von Müller,“ steht als `h1` in 15 pt fett. Damit konkurrieren zwei Überschriften (Betreff rechts oben und Anrede). „Guten Tag“ (neutral) und „liebes“ (vertraut) passen im Ton nicht zusammen.
9. **Logik der Geschichte:** „… findet Ihren Namen – aber keine Website. Also ruft er den Nächsten an.“ Wer den Namen findet (etwa im Kartendienst mit Telefonnummer), könnte direkt anrufen. Die Geschichte behauptet eine Wirkung (Kunde geht verloren), die nicht belegt ist. Projektregel 8 untersagt unbelegte Wirkungsversprechen; als „Stellen Sie sich vor“ ist es zwar als Annahme markiert, bleibt aber eine Grauzone. Die Geschichte passt nur zu Dachdeckern und braucht für jede Branche eine eigene, ebenso unbelegte Version.
10. **Hervorhebungs-Test nicht bestanden:** Liest man nur das Fett im Textteil, ergibt sich „0551 793785 / Ihre Vorschau ist bis Freitag, 4. Dezember online. / Kein Anruf, kein Vertreter, keine Anmeldung. / Kein Interesse? / P. S.“. Kein Nutzen, kein Angebot; zwei der Hervorhebungen sind Verneinungen. Fettgedruckt ist die **eigene Telefonnummer des Empfängers**: als Beweis der Personalisierung stark, als Hervorhebung aber ohne Nutzen. Das kann außerdem wie „wir wissen alles über Sie“ wirken (Schlussfolgerung).
11. **Kursiver Absatz:** Die ganze Geschichte steht kursiv. Laut Deutscher Post hat Kursivschrift Zitat-Charakter, und es soll eine einheitliche Hervorhebungsart geben.

**Muster, die nach KI oder Werbetext klingen** (eigene Prüfung, kein Messwert):
- Drei Dreierreihen auf einer Seite: „nichts unterschreiben, nichts zurückschicken und nichts bezahlen“, „Ihrem Namen, Ihrer Adresse und Ihrer Telefonnummer“, „Kein Anruf, kein Vertreter, keine Anmeldung“.
- „Stellen Sie sich vor:“ als Einstieg und dramatische Zwei- bis Vier-Wort-Sätze („Sie erfahren nie davon.“).
- Vier Gedankenstriche im Fließtext.
- Etwa 13 Verneinungen auf einer Seite (nichts ×3, kein/keine ×6, nie, nicht, zu nichts …). Laut Basler Studie können Verneinungen glaubwürdig wirken. Gehäufte Entwarnungen können aber auch das Gegenteil auslösen: „Wer so oft betont, dass es keine Falle ist …“ (Schlussfolgerung, nicht gemessen).
- Die P.S.-Formel „Sonst fragen Sie sich später …“ arbeitet mit Bedauern (Bob Stones „Negative“-Schritt in der Kurzform) und klingt nach Verkaufsschablone.

### Inferences
- Schlussfolgerung: Die Handlungsaufforderung selbst muss nicht geändert werden. Der Text um sie herum muss widerspruchsfrei werden. Am wichtigsten sind dabei Kosten, Begriff („Entwurf“ durchgehend) und Frist.
- Schlussfolgerung zur Frist: Es gibt zwei saubere Wege. **(a)** Im Brief steht das wirkliche Ablaufdatum aus dem System (`statedExpiresAt`), ohne Tageszahl und ohne „gelöscht – mit allem …“. Wenn Folgebrief 2 später verlängert, sagt er das offen („Ich habe den Entwurf bis … verlängert“). **(b)** Die Formulierung lautet „bis mindestens Freitag, 4. Dezember online“. Der Vorschau-Entwurf V4 nutzt ein Platzhalterdatum. Vor dem Druck muss geprüft werden, dass Generator und Datenbank-Einstellung (`timing.demoExpiryDays`) zum gedruckten Datum passen.
- Schlussfolgerung zum Werbecharakter (§ 5a Abs. 4): Der kommerzielle Zweck ergibt sich aus „Websites für Handwerksbetriebe“, dem Kleingedruckten „Briefwerbung“ und dem Gegenstand selbst. Das Risiko ist daher gering. Ein Satz im Text wie „Wenn Sie die Website behalten möchten, kostet sie Geld“ macht den Angebotscharakter aber unmissverständlich und ist zugleich der Kostenhinweis.
- Schlussfolgerung zur Dialogmöglichkeit: Ohne Telefon ist die E-Mail-Adresse der einzige Dialogweg. Sie sollte **im Text bei der Unterschrift** stehen, nicht nur im Kopf. Eine persönliche Adresse (z. B. `doaa@seitenwerk.world`) passt besser zu „schreibt mir ein Mensch“ als `support@` (nicht gemessen).

### Gaps
- Es gibt keine Quelle, die KI-typische Stilmuster in deutschen Werbebriefen misst oder zeigt, dass Leser sie erkennen. Die Liste oben ist eine Stilbeobachtung.
- Ob Abmelde-Scans heute im Tracking als `scan` zählen, wurde im Code nicht geprüft. Das Ziel „Kein Interesse“ in der Vorschau ist ein eigener Pfad (`optOutUrl` in `offer-options.ts`), der vorgelagerte QR-Scan aber vermutlich nicht.
- Keine Primärquelle gefunden, dass das P.S. bei Herschell Gordon Lewis oder Drayton Bird „am meisten gelesen“ wird. Belegt ist nur die Deutsche-Post-Aussage, dass es „häufig der erste Textblock“ ist, der gelesen wird (siehe Frage 4).

---

## 4. Abschnittsweise Prüfung mit konkreten Umformulierungen (Deutsch) und Prioritäten

### Takeaway
V4 ist gestalterisch weit besser als V2/V3: Das obere Drittel folgt dem Vorbericht (Person im Kopf, Betreff über dem Falz, Entwarnung). Die Sätze sind kurz, der Code ist groß. Die nächste Stufe ist vor allem **Text**, nicht Layout: ein ehrlicher Kostensatz, ein Absatz „Was passiert, wenn es Ihnen gefällt“, ein Auswahlgrund, eine wahre Frist, eine Bildunterschrift „Entwurf“, ein P.S. mit echtem Zusatznutzen und eine eigene Kurz-URL. Alle Vorschläge nutzen nur Zusagen, die der Code hergibt (`offer-options.ts`), und keine Zahlen.

### Cited Findings
- Erster Absatz „bestenfalls nicht mehr als 3 Zeilen“, Betreff als „attraktive, nutzenorientierte Headline“ — [Deutsche Post, Themenheft, S. 22](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf)
- Das P.S. ist „häufig der erste Textblock, der gelesen wird (nicht der gesehen wird!)“. Es „muss einen echten, zusätzlichen Vorteil … kommunizieren oder zu einer Handlung auffordern“, höchstens 1,5 Zeilen, mit Weißraum. Die Deutsche Post stuft es als „eher im B2C- als im B2B-Bereich einzusetzen“ ein — [Deutsche Post, Themenheft, S. 24](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf). Das Handwerksblatt empfiehlt das P.S. dagegen ausdrücklich als „krönenden Abschluss“ — [Handwerksblatt](https://www.handwerksblatt.de/betriebsfuehrung/die-renaissance-des-werbebriefs). Die Quellen widersprechen sich also leicht.
- Unterschrift: lesbar, mit der Klarschrift übereinstimmend (sonst „stummes Nein“). Funktionsbezeichnung als Zusatzinformation; „Unterschriften in blau wirken sympathischer, am besten handschriftlich mit Vor- und Nachname“ — [Deutsche Post, Themenheft, S. 24](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf)
- „Eine Bildunterschrift verhindert“ Fehldeutungen alleinstehender Bilder — [Deutsche Post, Themenheft, S. 24](https://www.deutschepost.de/dam/jcr:7a909b24-3aa2-4659-bb4e-f83655a0f72b/dp-post-und-schule-themenheft-werbebriefsendung-112020.pdf). In `brief4.html` ist die CSS-Klasse `.cap` angelegt, wird aber **nicht verwendet**.
- Gedruckte Handschrift-Schriften gelten Praktikern als unecht. Belegt wirkt nur echte, sichtbare persönliche Mühe — [ExpertClick](https://www.expertclick.com/NewsRelease/120-Creating-Believability,2021253035.aspx); [MarketingProfs](https://www.marketingprofs.com/short-articles/226/impose-influence-via-sticky-notes) (zitiert im Vorbericht). V4 setzt die Unterschrift in einer Web-Schrift „Hand“ (`@font-face 'Hand'`), nicht als Scan.
- Eine fremde Kurz-URL wie `netlify.app` lässt sich nicht als Adresse des Absenders prüfen. Die Verbraucherzentrale rät bei QR-Briefen, den Absender über selbst recherchierte Daten zu prüfen — [Verbraucherzentrale, Quishing](https://www.verbraucherzentrale.de/wissen/digitale-welt/phishingradar/quishing-falsche-qrcodes-in-mails-briefen-oepnv-und-strassenverkehr-98612), via Vorbericht. Laut Projekt ist `{TRACK_DOMAIN}/{kurzcode}` vorgesehen — `CLAUDE.md` §5.4
- Widersprüchliche Ratgeber zum Wort „kostenlos“: Das Handwerksblatt empfahl 2023 Signalwörter wie „kostenlos“ und „Garantie“ — [Handwerksblatt 2023](https://www.handwerksblatt.de/betriebsfuehrung/die-renaissance-des-werbebriefs). 2025 nannte es „gratis“ und „kostenlos“ als Lockwörter typischer Abzock-Schreiben — [Handwerksblatt 03/2025](https://www.handwerksblatt.de/themen-specials/vorsicht-adressbuch-abzocke/vorsicht-falle-so-versuchen-abzocker-an-ihr-geld-zu-kommen), via Vorbericht

### Inferences

#### Abschnitt für Abschnitt

**A. Briefkopf (Logo links, Person rechts)**
- Befund: „Wer?“ ist beantwortet. Logo und Person stehen aber getrennt, ohne Ort, mit `support@`.
- Vorschlag: Rechts „**Doaa Attia**“ / „Websites für Handwerksbetriebe · SeitenWerk“ / „Fürstenzell bei Passau“ / „doaa@seitenwerk.world · seitenwerk.world“. Das Logo links bleibt klein oder wandert in die Zeile. Begründung: Ein Absender, eine Person, nachprüfbar. Der Ort beantwortet die Ortsfrage. Eine persönliche Adresse ersetzt die fehlende Telefonnummer am ehesten.

**B. Betreff-Block rechts oben (über dem Falz)**
- Befund: Die Überschrift ist gut („Ich habe für Dachdeckerbetrieb Müller schon eine Website gebaut.“). Die Entwarnung „nichts bezahlen“ ist ohne Einschränkung missverständlich.
- Vorschlag Überschrift: unverändert lassen. Alternativ: „Ich habe für Dachdeckerbetrieb Müller schon einen Website-Entwurf gebaut.“
- Vorschlag Entwarnung (3 Zeilen):
  > „Zum Ansehen, ohne Anmeldung und ohne Unterschrift. Das Ansehen kostet nichts. Kosten entstehen nur, wenn Sie die Website später behalten möchten.“
- Begründung: Die Büro-Person bekommt dieselbe Entwarnung, aber ohne Gratis-Eindruck. Der Satz ist Kostenhinweis und Werbekennzeichnung zugleich (§ 5a). Das Lockwort „kostenlos“ wird vermieden.

**C. Anschrift**
- Vorschlag: „An das Team von / **Dachdeckerbetrieb Müller** / …“ (Name wie im Betreff). Begründung: Vorbericht; der Name ist laut Deutscher Post das empfindlichste Element.

**D. Anrede**
- Befund: Die Anrede ist `h1` in 15 pt und konkurriert mit dem Betreff; der Ton ist gemischt.
- Vorschlag: In Textgröße, nicht als Überschrift: „Guten Tag, liebes Team von Dachdeckerbetrieb Müller,“ oder sachlicher „Guten Tag an das Team von Dachdeckerbetrieb Müller,“. Wo ein Inhabername belegt ist: „Guten Tag, Herr Müller,“.

**E. Einstiegsabsatz (≤ 3 Zeilen)**
- Befund: „Ihre Website ist fertig und schon online“ behauptet etwas Bestehendes (Korrekturabzug-Nähe). Die fette Telefonnummer ist eine Hervorhebung ohne Nutzen. „bevor Sie mich kennen“ ist schief. Ein Auswahlgrund fehlt.
- Vorschlag:
  > „ich habe ohne Auftrag einen Entwurf für Ihre Website gebaut, mit Ihrem Namen, Ihrer Adresse und Ihrer Telefonnummer. Ich habe Sie ausgewählt, weil ich im Netz keine eigene Website von Ihnen gefunden habe. **Ansehen geht in einer Minute mit dem Code rechts.**“
- Begründung: Das Wort „Entwurf“ steht durchgehend; „ohne Auftrag“ grenzt klar vom Korrekturabzug ab. Der Auswahlgrund beantwortet „Warum ich?“. Die einzige Hervorhebung ist die Handlung, nicht die Telefonnummer. Die Nummer bleibt als Beweis im Text, aber nicht fett.

**F. Bild und QR-Kasten**
- Befund: Stark und groß. Es fehlt eine Bildunterschrift (`.cap` ungenutzt), die URL ist fremd (`seitenwerkworld.netlify.app/k7m2xq`).
- Vorschlag Bildunterschrift: „Entwurf: So sieht die Startseite für Dachdeckerbetrieb Müller am Computer und auf dem Handy aus.“
- Vorschlag QR-Hinweis: „Handykamera auf den Code halten. Dauert eine Minute, ohne Anmeldung.“ Darunter die Adresse auf der eigenen Domain, z. B. `seitenwerk.world/k7m2xq`. Das setzt `TRACK_DOMAIN` mit Weiterleitung voraus, eine technische Aufgabe.

**G. Geschichte (kursiver Absatz)**
- Befund: Negativer Reiz (Angst vor Verlust), unbelegte Wirkung, Lücke in der Logik, kursiv, nur für Dachdecker passend, „Stellen Sie sich vor:“.
- Vorschlag (Nutzen ausbauen und genau sagen, was man bekommt; Stone-Schritte 2 und 3; nur nachprüfbare Merkmale; aufrecht gesetzt):
  > „Auf der Seite stehen Ihre Kontaktdaten, Beispiel-Leistungen und ein Knopf, mit dem man Sie direkt anruft oder Ihnen schreibt. Texte, Farben und Leistungen sind Vorschläge. Was nicht passt, ändere ich vor dem Kauf kostenlos.“
- Wer die Geschichte behalten will: kürzen, nicht kursiv setzen, ohne „Sie erfahren nie davon“, und als eigene A/B-Variante mit deutlich anderem Ansatz testen, nicht als Feinschliff. Die Kostenlos-Zusage ist durch `offer-options.ts` („Kostenlose Anpassung vor dem Kauf“) und `demos/revise.ts` gedeckt.

**H. Neuer Absatz: „Was passiert, wenn es Ihnen gefällt?“** (fehlt bisher; ersetzt den Satz „Auf Wunsch läuft die Website …“)
- Vorschlag:
  > „**Gefällt Ihnen der Entwurf, können Sie ihn direkt in der Vorschau übernehmen.** Ich richte dann Ihre eigene Adresse ein, zum Beispiel dachdecker-mueller-goettingen.de. Die Domain wird auf Ihren Betrieb registriert. Online geht die Seite erst nach Ihrer Freigabe. Was das kostet, steht vorher klar in der Vorschau.“
- Begründung: Deutsche Post S. 22 („was er tun muss, um das Angebot anzunehmen“), Mayer (Angebot 40 %), Stone Schritt 3. Jede Zusage stammt aus `offer-options.ts`. Der Domainvorschlag steht weiter unten und ohne „reserviert“ oder „noch frei“, wie im Vorbericht empfohlen. Ob die Domain verfügbar ist, prüft der Generator; der Vorschlag darf nur erscheinen, wenn die Prüfung frisch ist (`render/letter.ts`, `domainCheckedAt`).

**I. Fristkasten**
- Befund: Die Tageszahl „14“ widerspricht dem Datum. „gelöscht – mit allem, was ich für Sie gebaut habe“ arbeitet mit Schuld. „Danach wird sie gelöscht“ stimmt nicht mit dem System überein. Der blaue Kasten ist besser als der frühere rote.
- Vorschlag (ohne Tageszahl, ruhig, mit wahrem Grund):
  > „**Der Entwurf ist bis Freitag, 4. Dezember, online.** Danach nehme ich ihn vom Netz, weil ich Entwürfe ohne Auftrag nicht aufbewahre.“
- Bedingung: Das Datum kommt aus `statedExpiresAt`, und das System löscht dann tatsächlich, oder der Satz lautet „bis mindestens …“. Ein späterer Folgebrief sagt eine Verlängerung offen an.

**J. Entwarnungszeile („Kein Anruf, kein Vertreter …“)**
- Befund: Die Sorge ist berechtigt, aber es sind drei Verneinungen hintereinander. „keine Anmeldung“ steht doppelt. Der Opt-out per QR-Code vermischt Kauf- und Abmeldeweg.
- Vorschlag:
  > „Niemand ruft Sie an, niemand kommt vorbei. Fragen beantworte ich gern per E-Mail: doaa@seitenwerk.world. Kein Interesse? Ein Klick auf ‚Kein Interesse‘ in der Vorschau oder eine kurze E-Mail genügt, dann bekommen Sie keine Post mehr von mir.“
- Begründung: Der Dialogweg steht im Text (Handwerksblatt), es gibt weniger Verneinungen, und der Text deckt sich mit dem Art.-21-Hinweis.

**K. Unterschrift**
- Vorschlag: „Freundliche Grüße“ statt „Herzliche Grüße“, weil es der erste Kontakt mit einem Betrieb ist (Stilurteil). Eine **eingescannte echte Unterschrift** in Blau statt der Schrift „Hand“. Klarschrift mit Funktion, z. B. „Doaa Attia, Webdesignerin · SeitenWerk“; die Bezeichnung muss vom Betreiber bestätigt werden.

**L. P.S.**
- Befund: Bedauern-Appell ohne neuen Nutzen. Die Deutsche Post verlangt einen echten Zusatznutzen oder eine Handlung in höchstens 1,5 Zeilen.
- Vorschlag (Zusatznutzen, belegt):
  > „P. S. Passt etwas nicht? Schreiben Sie mir. Texte, Farben und Leistungen ändere ich vor dem Kauf kostenlos.“
- Alternative (Handlung mit wahrer Frist):
  > „P. S. Ansehen dauert eine Minute: Handykamera auf den Code halten. Online bis Freitag, 4. Dezember.“
- Wenn H und G die kostenlose Anpassung schon nennen, nimmt das P.S. die Alternative, damit sich nichts wiederholt.

**M. Kleingedrucktes**
- Befund: Der Kostensatz gehört in den Text (siehe B und H). Die Schrift ist 6 pt, empfohlen sind 10–12 pt für den Brief. Datenschutz-Pflichtangaben dürfen klein sein, aber nicht die Kosteninformation.
- Vorschlag: Die Zeile „Kostenpflichtig wird es nur, wenn …“ entfällt hier, wenn B und H umgesetzt sind. „Unverbindlicher, nicht beauftragter Entwurf von SeitenWerk“ bleibt. Art. 14 und Art. 21 bleiben unverändert.

**N. Gesamtlayout**
- Fließtext mindestens 10 pt, nicht 9,5 pt (Deutsche Post S. 24). Damit der Brief bei einer Seite bleibt, Geschichte G und Satz J kürzen.
- Schnell-Lese-Test nach dem Umbau: Die Hervorhebungen „Ansehen geht in einer Minute mit dem Code rechts“, „Gefällt Ihnen der Entwurf, können Sie ihn direkt in der Vorschau übernehmen“ und „Der Entwurf ist bis Freitag, 4. Dezember, online“ ergeben zusammen eine verständliche Botschaft.

#### Priorisierte Liste

| Prio | Änderung | Warum |
|---|---|---|
| **1** | Kostensatz in den Text (B/H), oben nicht nur „nichts bezahlen“ | Leserfrage „Was kostet es?“; Kammer-Warnmerkmal „Kosten im Kleingedruckten“; § 5a Abs. 2 UWG (unklar, zweideutig) |
| **1** | Frist an das System angleichen: keine „14 Tage“, „gelöscht“ nur, wenn wahr; Datum aus `statedExpiresAt` | § 5 Abs. 2 Nr. 1 UWG (Verfügbarkeit); `CLAUDE.md` §5.5; Code: 30 Tage plus Verlängerung durch Folgebrief |
| **1** | „Ihre Website ist fertig und schon online“ durch „Entwurf“ ersetzen, ein Begriff durchgehend | Nähe zum Korrekturabzug (Vorbericht, IHK); Widerspruch zum Betreff |
| **1** | Kurz-URL auf eigener Domain statt `netlify.app` | Prüfbarkeit gegen Quishing-Verdacht (Verbraucherzentrale); Projekt-Spezifikation §5.4 |
| **2** | Absatz „Was passiert, wenn es Ihnen gefällt“ (H) | Fehlende Leserfrage; Angebot nach Mayer und Stone Schritt 3 |
| **2** | Auswahlgrund und Grund für „zuerst bauen“ (E, Frage 2) | Reason why (Hopkins); Vertrauen |
| **2** | Geschichte G durch Nutzen-/Leistungsabsatz ersetzen (oder als eigene Testvariante) | Unbelegte Wirkung (Projektregel 8), Logiklücke, nur negativer Reiz |
| **2** | Hervorhebungen neu setzen (Schnell-Lese-Test), Telefonnummer nicht fett | Deutsche Post S. 23 |
| **2** | P.S. mit echtem Zusatznutzen (L) | Deutsche Post S. 24 |
| **2** | E-Mail als Dialogweg im Text, persönliche Adresse | Handwerksblatt („heimlicher Star“); kein Telefon |
| **3** | Firmenname überall gleich, vollständig in der Anschrift | Vorbericht; Deutsche Post S. 22 |
| **3** | Bildunterschrift „Entwurf: …“ (`.cap` nutzen) | Deutsche Post S. 24 |
| **3** | Anrede nicht als `h1`; Fließtext ≥ 10 pt; Geschichte nicht kursiv | Deutsche Post S. 23–24 |
| **3** | Echte eingescannte Unterschrift in Blau, Funktion in Klarschrift, „Freundliche Grüße“ | Deutsche Post S. 24; Vorbericht (Handschrift-Schriften) |
| **3** | Grammatik („bevor Sie mich kennen“, „sie sie“); weniger Dreierreihen, Gedankenstriche und Verneinungen | Lesbarkeit; KI-Klang (Stilurteil) |
| **3** | Abmelde-Scans in der Messung von Kauf-Scans trennen | Saubere Scan-Quote (Schlussfolgerung) |

#### Zusammengesetzter Textvorschlag (nur Text, Layout wie V4)

> **Betreff (rechts oben):** Ich habe für **Dachdeckerbetrieb Müller** schon eine Website gebaut.
> Zum Ansehen, ohne Anmeldung und ohne Unterschrift. Das Ansehen kostet nichts. Kosten entstehen nur, wenn Sie die Website später behalten möchten.
>
> Guten Tag, liebes Team von Dachdeckerbetrieb Müller,
>
> ich habe ohne Auftrag einen Entwurf für Ihre Website gebaut, mit Ihrem Namen, Ihrer Adresse und Ihrer Telefonnummer. Ich habe Sie ausgewählt, weil ich im Netz keine eigene Website von Ihnen gefunden habe. **Ansehen geht in einer Minute mit dem Code rechts.**
>
> *[Bild] Entwurf: So sieht die Startseite für Dachdeckerbetrieb Müller am Computer und auf dem Handy aus.* · *[QR] Jetzt ansehen. Handykamera auf den Code halten. seitenwerk.world/k7m2xq*
>
> Auf der Seite stehen Ihre Kontaktdaten, Beispiel-Leistungen und ein Knopf, mit dem man Sie direkt anruft oder Ihnen schreibt. Texte, Farben und Leistungen sind Vorschläge. Was nicht passt, ändere ich vor dem Kauf kostenlos.
>
> **Gefällt Ihnen der Entwurf, können Sie ihn direkt in der Vorschau übernehmen.** Ich richte dann Ihre eigene Adresse ein, zum Beispiel dachdecker-mueller-goettingen.de, registriert auf Ihren Betrieb. Online geht die Seite erst nach Ihrer Freigabe. Was das kostet, steht vorher klar in der Vorschau.
>
> **Der Entwurf ist bis Freitag, 4. Dezember, online.** Danach nehme ich ihn vom Netz, weil ich Entwürfe ohne Auftrag nicht aufbewahre. Niemand ruft Sie an, niemand kommt vorbei. Fragen beantworte ich gern per E-Mail: doaa@seitenwerk.world.
>
> Freundliche Grüße · *[eingescannte Unterschrift]* · Doaa Attia, SeitenWerk
>
> P. S. Ansehen dauert eine Minute: Handykamera auf den Code halten. Online bis Freitag, 4. Dezember.

(Eigene Rechnung: Der Fließtext ist etwa so lang wie in V4, weil die Geschichte und der Satz „Kein Anruf …“ entfallen. Ob er bei 10 pt auf eine Seite passt, muss die Layoutprüfung `fitLetterLayout` zeigen.)

### Gaps
- Keine dieser Änderungen ist an Handwerkern gemessen. Der Vorbericht rechnet vor, dass sich bei etwa 100 Briefen je Variante nur sehr große Unterschiede zeigen. Getestet werden sollten deshalb höchstens ein oder zwei grundlegend verschiedene Ansätze, zum Beispiel **„Geschichte/Verlust“ gegen „Nutzen/Angebot“** oder **„mit Auswahlgrund“ gegen „ohne“**, keine Einzelwörter.
- „Freundliche“ statt „Herzliche Grüße“ und „Webdesignerin“ als Funktion sind Stilurteile ohne Beleg. Die Funktionsbezeichnung muss der Betreiber bestätigen.
- Ob easyNova einen Scan der echten Unterschrift und die Farbe Blau zuverlässig druckt, wurde nicht geprüft.
- Der Satz „weil ich im Netz keine eigene Website von Ihnen gefunden habe“ ist nur zulässig, wenn die Website-Prüfung des Lead-Finders für **jeden** Lead gelaufen ist. Das muss im Generator als Bedingung verankert werden; im Code wurde das nicht geprüft.
