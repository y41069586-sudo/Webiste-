# Signale, Scoring und Zustellbarkeit: Welche OSM-Betriebe den nächsten Brief bekommen sollten

Stand der Recherche: 17.11.2026. Bezug: OSM-Leads (Geofabrik + osmium), Website-Probe, ein Rückläufer „Empfänger/Firma unter der angegebenen Anschrift nicht zu ermitteln“, 0 € Budget, ca. 0,81 € je Brief.
Hinweis zum Code: Die bestehende Vorauswahl `packages/core/src/leads/prescreen.ts` vergibt bereits Punkte für Telefon (+15), Öffnungszeiten (+10), Aktivität ≤ 24 Monate (+20) bzw. ≤ 60 Monate (+8) bzw. älter (−15), Social/online aktiv (+15), Freemail (+10), eigene Mail-Domain (−10), start_date 6–36 Monate (+15) bzw. < 6 Monate (+8), mögliche Website (−40). Die Empfehlungen unten sind als Anpassung dieser Logik formuliert.

## 1. Wie verlässlich ist OSM für die Existenz eines Betriebs in Deutschland, und wie nutzt man Bearbeitungsdatum, check_date und opening_hours?

### Takeaway
OSM bildet sichtbare Läden in deutschen Städten gut ab (ca. 73–88 % Vollständigkeit), weniger sichtbare Dienstleister und Handwerksbetriebe nur zu ca. 22 %. Geschlossene Läden bleiben teils stehen. Für die Aktualität gibt es keine veröffentlichte Quote, aber die OSM-Praxis (StreetComplete, Vorschläge zu Prüfintervallen) behandelt Geschäfte als nach 1–2 Jahren prüfbedürftig. Ein `check_date` bzw. eine Bearbeitung innerhalb von 24 Monaten ist deshalb das stärkste kostenlose Signal dafür, dass der Betrieb noch existiert.

### Cited Findings
- Brückner et al. (2021) schätzten die Vollständigkeit von OSM-Einzelhandelsgeschäften im Mittel auf ca. 88 % in Baden-Württemberg und ca. 82 % in Sachsen. Je Kreis reichte der Wert von 42 % bis fast 100 %, und 38 Kreise lagen bei mindestens 80 %. Kreisfreie Städte waren signifikant vollständiger. Mit höherer Arbeitslosenquote sank die Vollständigkeit. — [Brückner et al., AGILE GIScience Series 2, 20, 2021](https://agile-giss.copernicus.org/articles/2/20/2021/agile-giss-2-20-2021.pdf)
- Dieselbe Studie: Die Mittelwerte sind eher überschätzt, weil Kreise mit geringer Sättigung herausfielen. Sättigung kann auch durch nachlassende Kartieraktivität entstehen. — [Brückner et al. 2021](https://agile-giss.copernicus.org/articles/2/20/2021/agile-giss-2-20-2021.pdf)
- Klinkhardt et al. (2023) verglichen OSM mit Vor-Ort-Zählungen in 49 überwiegend städtischen und vorstädtischen Gebieten in Deutschland. Bei „private business“ (z. B. Ärzte, kleine Agenturen, kleine Handwerksbetriebe) standen 1.305 gezählte POI 292 in OSM gegenüber, also nur ca. 22 % kartiert. Bei „shopping“ waren es 379 zu 277, also 73 %. — [Klinkhardt et al., Transportation Research Record 2023](https://publikationen.bibliothek.kit.edu/1000158824/150739297)
- Ebenda: In neun Gebieten führte OSM mehr Läden, als tatsächlich existierten, „in many cases because of store closures“. Die Autoren vermuten, dass COVID-19 den Effekt verstärkt hat. Der Überschuss betrug höchstens drei Läden je Gebiet. — [Klinkhardt et al. 2023](https://publikationen.bibliothek.kit.edu/1000158824/150739297)
- Ebenda: Läden sind wegen Schildern und Schaufenstern sichtbarer, Dienstleister und Handwerk oft nicht. Dichtere Stadtgebiete sind vollständiger. — [Klinkhardt et al. 2023](https://publikationen.bibliothek.kit.edu/1000158824/150739297)
- Eine frühere Studie derselben Gruppe fand OSM meist aktueller als amtliche Register: Geschlossene Läden fehlten in OSM eher, in den amtlichen Daten waren sie noch enthalten (Angabe aus der Suchzusammenfassung, Volltext nicht geprüft). — [Klinkhardt et al., TRR 2021](https://journals.sagepub.com/doi/full/10.1177/0361198121997415)
- Anekdote aus einem Viertel, kein Peer-Review: Ca. 80 % der kartierten POI waren aktuell, aber nur 53 % korrekt, wenn auch fehlende Betriebe mitgezählt wurden. Die meisten Entfernungen betrafen leerstehende Lokale. — [OSM-Tagebuch alan_gr](https://www.openstreetmap.org/user/alan_gr/diary/405455)
- `check_date=YYYY-MM-DD` ist das Datum der letzten Überprüfung des Objekts. `check_date:opening_hours` hält fest, wann ein einzelnes Tag zuletzt geprüft wurde. `survey:date` steht für eine Prüfung vor Ort. — [OSM Wiki Key:check_date](https://wiki.openstreetmap.org/wiki/Key:check_date); [OSM Wiki Key:check_date:*](https://wiki.openstreetmap.org/Key:check_date:*); [OSM Wiki Key:survey:date](https://wiki.openstreetmap.org/Key:survey:date)
- StreetComplete setzt `check_date`, wenn Nutzer „Ist das noch da?“ mit Ja beantworten. Laut einem Forumsbeitrag fragt die App bei Geschäften nach ca. 2 Jahren ohne Änderung erneut nach. Das ist nicht offiziell bestätigt. — [OSM Community Forum](https://community.openstreetmap.org/t/should-streetcomplete-expand-its-use-of-check-date/143591/)
- Der Vorschlag des StreetComplete-Entwicklers sieht für Geschäfte ein Prüfintervall von 1 Jahr vor (allgemein 1–2 Jahre) und für Öffnungszeiten 1 Jahr. Bei 24/7-Läden oder gleichen Zeiten an allen Werktagen gilt das halbe Tempo, weil das auf größere Betriebe hindeutet. — [OSM Wiki User:Westnordost/Proposed Resurvey Intervals](https://wiki.openstreetmap.org/wiki/User:Westnordost/Proposed_Resurvey_Intervals)
- Erfahrungsberichte auf derselben Seite: Manche Läden an schlechten Lagen wechseln mindestens jährlich den Inhaber. Neuere Läden verschwinden eher. Je länger ein Laden besteht, desto seltener ändert er sich. Ketten sind stabil (etwa ein Wechsel in 5–10 Jahren), viele Einzelinhaber-Läden schließen dagegen nach 1–2 Jahren. Öffnungszeiten sind „far more unstable“ als der Inhaber, und wer sie prüft, bestätigt indirekt auch, dass der Laden existiert. — [OSM Wiki Westnordost](https://wiki.openstreetmap.org/wiki/User:Westnordost/Proposed_Resurvey_Intervals)
- Geschlossene Läden werden als `disused:shop=*` oder `shop=vacant` erfasst. Beide Varianten sind etwa gleich verbreitet und sollten beide ausgewertet werden. Für kaum noch nutzbare Objekte gibt es `abandoned:*`. — [OSM Wiki Tag:shop=vacant](https://wiki.openstreetmap.org/wiki/Tag:shop=vacant); [OSM Wiki Key:disused:shop](https://wiki.openstreetmap.org/Key:disused:shop)
- Grundrauschen: Von Januar bis September 2024 gab es in Deutschland ca. 443.000 Gewerbeabmeldungen, davon ca. 356.800 vollständige Aufgaben, bei ca. 547.500 Anmeldungen (Destatis, über Sekundärquellen). — [Deutsche Wirtschafts Nachrichten](https://deutsche-wirtschafts-nachrichten.de/712554/weniger-gewerbeaufgaben-bei-groesseren-betrieben-was-unternehmer-wissen-sollten); [Presseportal Destatis](https://www.presseportal.de/pm/32102/5909172)
- Gastronomie (Destatis, Bezugsjahr 2023): 80,2 % der 2022 gegründeten Betriebe waren nach einem Jahr noch aktiv, von den 2018 gegründeten nach fünf Jahren nur 36,0 %. Im Bereich Kreativ/Unterhaltung lag die Fünf-Jahres-Quote bei 27,3 %, bei Tierärzten bei 60,2 %. — [tageskarte.io, nach Destatis Zahl der Woche PD25_46_p002](https://www.tageskarte.io/zahlen/detail/nur-ein-drittel-der-neu-gegruendeten-gastro-unternehmen-nach-fuenf-jahren-noch-aktiv.html)

### Inferences
- Ein OSM-Objekt ohne `check_date` und ohne Bearbeitung seit über 3–5 Jahren ist das wahrscheinlichste Muster für „nicht zu ermitteln“-Rückläufer. Besonders gefährdet sind Gastronomie und Einzelinhaber-Läden, die in den ersten 1–5 Jahren oft schließen. Die bestehende Stufe −15 bei über 60 Monaten ist eher zu mild. Für Gastronomie und Beauty sollte ein Alter über 36 Monaten ohne Prüfung zum Ausschluss oder zur Pflicht-Handprüfung führen.
- Wurde `check_date` oder `check_date:opening_hours` innerhalb von 12 Monaten gesetzt, hat ein Mensch den Betrieb mit hoher Wahrscheinlichkeit vor Ort gesehen (StreetComplete-Mechanik). Das ist stärker als ein bloßer Bearbeitungszeitstempel, der auch von Bots, Massenänderungen oder Tag-Bereinigungen stammen kann. Empfehlung: Bearbeitungen getrennt von `check_date` werten. Ein Zeitstempel zählt nur, wenn sich ein betriebsbezogenes Tag geändert hat (name, opening_hours, phone, addr:*), was über die `version`-Historie prüfbar ist. Im reinen Extrakt ohne Historie bekommt der Zeitstempel deshalb weniger Gewicht als `check_date`.
- Gepflegte `opening_hours` sind ein Lebenszeichen, weil sie zu den instabilsten Angaben gehören. Fehlen sie bei einem Laden mit Kundenverkehr, ist das ein schwaches Warnsignal.
- Handwerk (`craft=*`) ist in OSM stark unterrepräsentiert (ca. 22 %). Die vorhandenen Einträge stammen oft von Firmenschildern an Wohnhäusern und sind schwerer zu prüfen. Ein Handwerkseintrag ohne `check_date` braucht deshalb eher eine Handprüfung als ein Laden an einer Einkaufsstraße.
- Leads in kreisfreien Städten mit dichter Kartierung, etwa Dortmund, sind verlässlicher als in Randlagen.

### Gaps
- Es gibt keine veröffentlichte Quote, wie viele OSM-POI in Deutschland zu einem Stichtag bereits geschlossen sind. Die Daten von Klinkhardt zeigen nur, dass das vorkommt (bis zu 3 Läden je Gebiet).
- Das offizielle StreetComplete-Prüfintervall für „Ist das noch da?“ ließ sich nicht aus der Primärquelle bestätigen. Die 2 Jahre stammen aus einem Forum, 1 Jahr aus einem Vorschlag.
- Eine deutschlandweite Gesamtquote für das Überleben aller Branchen nach 1, 3 und 5 Jahren fand ich nicht in Primärquellen von Destatis. Die 37,8 % nach 5 Jahren stammen nur aus Sekundärquellen und sind unbestätigt.

## 2. Woran erkennt man „keine Website, aber online aktiv“ (Instagram/Facebook, Google-Profil), und warum sind das bessere Kandidaten?

### Takeaway
Belastbare deutsche Zahlen zu „nur Social Media, keine Website“ gibt es kaum. In Österreich betrifft das nur ca. 2 % der Unternehmen, fast nur kleine. Ein Social-Link in OSM (`contact:instagram`/`facebook`) belegt aber zweierlei: Der Betrieb existiert aktuell, und der Inhaber betreibt aktiv Sichtbarkeit. Deshalb ist er ein guter Kandidat, sofern die Website-Probe sicher negativ ist.

### Cited Findings
- 69 % der Unternehmen in Deutschland hatten 2023 eine Website, 2015 waren es 58 % (Destatis über Statista). — [Statista](https://de.statista.com/statistik/daten/studie/151766/umfrage/anteil-der-unternehmen-mit-eigener-website-in-deutschland)
- Eine Studie zu Kleinunternehmern in Deutschland fand, dass ca. zwei Drittel (65 %) eine eigene Website haben und 42 % Social Media für den Vertrieb nutzen. Datum und Stichprobengröße waren in der Quelle nicht ersichtlich. — [selbststaendigkeit.de](https://selbststaendigkeit.de/news/marketing/mittelstand-laesst-noch-grosses-potenzial-im-online-marketing-liegen/)
- Statistik Austria 2025: „Die ausschließliche Verwendung von Social Media, ohne eigene Website, ist mit 2 % der Unternehmen sehr gering und stark von kleinen Unternehmen geprägt.“ Das sind österreichische Daten. — [Statistik Austria IKT-Einsatz 2025](https://www.statistik.at/fileadmin/announcement/2025/10/20251016IKTU2025.pdf)

### Inferences
- Das eigentliche Risiko bei Social-only-Leads ist eine Website, die nur nicht in OSM steht. Sie würde den Brief peinlich machen. Die Probe sollte für diese Gruppe am strengsten sein: Domain-Raten, Link in der Instagram-Bio (bei Linktree-Links die Ziele prüfen), Impressum-Verweis auf Facebook. Der Malus −40 bei „possible“ ist richtig und sollte Social-only-Leads trotz Bonus aus den Top 50 drücken.
- Ein Social-Link ist zugleich ein Existenzsignal: Wer ihn in OSM einträgt (oft der Inhaber selbst oder ein aktiver Kartierer), hat den Betrieb in jüngerer Zeit gesehen. Mit Datum ist er aber nur verwertbar, wenn die Bearbeitung jung ist.
- `email` mit Freemail-Domain (gmail, web.de, gmx, t-online) neben einer Telefonnummer ist ein starkes Zeichen für „keine eigene Domain“. Die bestehenden +10 sind plausibel.
- Gibt es ein Google-Unternehmensprofil, ist das nur ein manueller Prüfschritt. Automatisch auslesen ist nach den Google-Bedingungen nicht zulässig (siehe `docs/compliance-google.md` im Repo). Bei der Handprüfung sind „Dauerhaft geschlossen“ oder „Vorübergehend geschlossen“ ein harter Ausschluss. Ein Profil mit jüngeren Fotos oder Rezensionen der letzten 6 Monate ist ein starkes Existenzsignal.

### Gaps
- Es fehlt eine deutsche Primärquelle für den Anteil kleiner Betriebe mit Social Media ohne Website.
- Ich fand keine Studie, die die Kaufbereitschaft von Social-only-Betrieben mit der von Betrieben ganz ohne Online-Präsenz vergleicht. Der Vorteil ist plausibel, aber nicht belegt.

## 3. Inhabergeführt oder Kette/Franchise, und wie groß ist der Betrieb?

### Takeaway
Ketten verraten sich in OSM über `brand`, `brand:wikidata` (Name Suggestion Index), `operator` und wiederholte Namen. Diese Leads sind auszuschließen: Eine Filiale kauft keine eigene Website, und die Zentrale hat eine.

### Cited Findings
- Der Name Suggestion Index (NSI) ist eine Sammlung von Tagging-Vorlagen für Marken mit Ladengeschäften, überwiegend Ketten. Die meisten NSI-Einträge tragen `brand:wikidata=*`. Editoren nutzen den NSI, um Filialen einheitlich zu taggen. — [OSM Wiki Name Suggestion Index](https://wiki.openstreetmap.org/wiki/Name_Suggestion_Index); [OSM Wiki Key:brand:wikidata](https://wiki.openstreetmap.org/wiki/Key:brand%3Awikidata)
- Faustregel im Wiki: Ist eine Kette laut Wikidata relevant genug, gehört sie wohl auch in den NSI. Daneben gibt es `not:brand:wikidata` für Betriebe, die bewusst keine Filiale einer gleichnamigen Marke sind. — [OSM Wiki Key:brand:wikidata](https://wiki.openstreetmap.org/wiki/Key:brand%3Awikidata); [OSM Wiki Key:not:brand:wikidata](https://wiki.openstreetmap.org/Key:not:brand:wikidata)
- Ketten sind laut Kartierer-Erfahrung sehr stabil, inhabergeführte Läden schließen öfter. Durchgehende Öffnungszeiten oder gleiche Zeiten an allen Werktagen ohne Mittagspause deuten auf größere Betriebe hin. — [OSM Wiki Westnordost](https://wiki.openstreetmap.org/wiki/User:Westnordost/Proposed_Resurvey_Intervals)

### Inferences
- Harter Ausschluss: `brand`, `brand:wikidata` oder `brand:wikipedia` gesetzt (ohne `not:brand:wikidata`). Ebenso, wenn `name` im Extrakt bundesweit mindestens 3-mal gleichlautend in derselben Kategorie vorkommt (Häufigkeitszählung im osmium-Export). Ausnahmen müssen mit `not:brand:wikidata` belegt sein.
- `operator` gleich einer Gesellschaft, die an mehreren Standorten vorkommt, etwa eine GmbH mit Filialen, bedeutet Ausschluss. `operator` gleich Inhabername oder fehlend ist neutral bis positiv.
- Namensmuster für Inhaberführung: Vor- und/oder Nachname im Namen („Salon Petra“, „Malermeister Yilmaz“, „Bäckerei Schulte“), „Inh.“, „Meisterbetrieb“, „& Sohn“. Ein leichter Bonus von +5 ist sinnvoll, nicht mehr, denn das ist nicht belegt.
- Größe: Sehr kleine Betriebe (Nebenerwerb, Hinterhof-Werkstatt ohne Schild) haben weniger Budget. Sehr große haben meist schon eine Website. Telefon + Öffnungszeiten + Ladenlokal (`shop`/`amenity` statt nur `craft` an einer Wohnadresse) sprechen für einen etablierten Kleinbetrieb im passenden Bereich.

### Gaps
- Ich fand keine Studie zur Treffsicherheit von OSM-Markentags oder Namensmustern bei der Erkennung von Ketten in Deutschland.

## 4. Welche Signale sagen Kaufbereitschaft voraus (junge Betriebe, hochpreisiges Handwerk, Telefon, Öffnungszeiten)?

### Takeaway
Es gibt keine öffentliche Studie, die OSM-Merkmale direkt mit dem Kauf einer Website nach einem Werbebrief verbindet. Belegbar ist nur der Zielkonflikt bei jungen Betrieben: Sie brauchen Sichtbarkeit am dringendsten, schließen aber auch am häufigsten. Kaltakquise-Briefe erreichen international typischerweise 2–5 % Reaktion. Bei 30–50 Briefen sind deshalb nur 1–2 Reaktionen zu erwarten. Gewichte müssen daher vor allem Fehlwürfe vermeiden. Eine Kaufquote lässt sich so nicht optimieren.

### Cited Findings
- Junge Gastronomiebetriebe: Nach einem Jahr sind 80,2 % noch aktiv, nach fünf Jahren 36,0 % (Destatis). — [tageskarte.io](https://www.tageskarte.io/zahlen/detail/nur-ein-drittel-der-neu-gegruendeten-gastro-unternehmen-nach-fuenf-jahren-noch-aktiv.html)
- Laut Kartierer-Erfahrung verschwinden neuere Läden eher. Je länger ein Laden besteht, desto stabiler ist er. — [OSM Wiki Westnordost](https://wiki.openstreetmap.org/wiki/User:Westnordost/Proposed_Resurvey_Intervals)
- Reaktionsquoten für Direktwerbung an Fremdadressen liegen laut ANA-Berichten, zitiert über Sekundärquellen mit uneinheitlichen Zahlen, bei ca. 2–5 %. Nach ANA-Einordnung sind über 2 % akzeptabel, über 4 % stark und über 6 % sehr gut. Eigene Kundenlisten erreichen 5–9 %. — [ANA Response Rate Report 2023](https://ana.net/miccontent/show/id/rr-2024-02-ana-response-rate-report); [piworld](https://www.piworld.com/post/revisiting-response-rates-why-direct-mails-roi-keeps-rising); [directmail.io](https://directmail.io/direct-mail-response-rate)
- Eine CMC-Dialogpost-Studie nennt 3,9 % Conversion, B2C-orientiert, Methode unklar. — [Horizont](https://www.horizont.net/marketing/nachrichten/dialogmarketing-warum-unternehmen-ihren-kunden-mehr-briefe-schreiben-168164)

### Inferences
- `start_date` ist zweischneidig. Am attraktivsten sind 6–24 Monate: Der Betrieb hat die kritische Anfangszeit überlebt und baut noch Sichtbarkeit auf. Unter 6 Monaten ist das Kaufmotiv hoch, aber das Schließrisiko auch, und Adresse oder Briefkasten sind oft noch nicht beschriftet. Über 36 Monate ist das Motiv geringer. Die bestehende Staffel (+15 für 6–36, +8 für < 6) passt im Kern. Bei Gastronomie empfiehlt sich eine Verengung auf 6–24 Monate.
- Telefon ist doppelt wertvoll: Es belegt einen erreichbaren, echten Betrieb und erlaubt eine Plausibilitätsprüfung von Hand (nicht anrufen, § 7 UWG). Ein Abgleich mit Telefonbuch oder Gelben Seiten ist manuell möglich. Die +15 sind angemessen.
- Handwerk mit hohem Auftragswert (Dachdecker, Maler, Elektro, SHK, Tischler, Fliesen) hat ein klares Kaufmotiv: Ein Auftrag bringt mehrere tausend Euro, die Website ist eine kleine Investition. Ein Bonus von +10 gegenüber Beauty und Gastronomie ist plausibel, aber nicht belegt. Das Zustellrisiko ist höher (siehe Abschnitt 1, 22 % Abdeckung, oft Wohnadressen), also nur mit gutem Existenzsignal.
- Bei 30–50 Briefen und ca. 2–5 % Reaktion entscheidet jeder Rückläufer spürbar über die Quote. Die Gewichte sollten Existenz und Zustellbarkeit vor Kaufmotiv stellen.

### Gaps
- Es gibt keine deutschen Studien zur Reaktionsquote von Werbebriefen an kleine Betriebe (B2B-Kleinstunternehmen). Die ANA-Daten sind US-amerikanisch und nur über Sekundärquellen zugänglich. Nicht als deutsche Zahlen in Briefen oder Demos verwenden (§ 5 UWG, CLAUDE.md Regel 8).
- Es gibt keine Studie, die `start_date`, Branche oder Social-Präsenz mit dem Kauf einer Website verknüpft. Die Gewichte unten sind begründete Annahmen und mit L5 (Bayes/Thompson) laufend zu kalibrieren.

## 5. Kostenlose Adressprüfung vor dem Versand: Was ist erlaubt?

### Takeaway
Manuelle Einzelabfragen (Google Maps, Das Örtliche, Gelbe Seiten, Handelsregister, Instagram-Profil, Streetview) sind für 30–50 Leads machbar und rechtlich unproblematisch. Automatisierte Massenabfragen sind beim Handelsregister ausdrücklich begrenzt (max. 60 Abrufe pro Stunde, kein systematischer Aufbau von Kopien). Bei Verzeichnissen greifen Nutzungsbedingungen und das Datenbankherstellerrecht (§ 87b UrhG). Deshalb kein Scraping.

### Cited Findings
- Die Nutzungsordnung von handelsregister.de verbietet laut mehreren Sekundärquellen mehr als 60 Suchen oder Abrufe pro Stunde und systematische Abrufe zum Aufbau paralleler Kopien. Bei Verdacht werden IP-Adressen gesperrt. In den FAQ wird auf §§ 303a/303b StGB verwiesen. Die offiziellen Bedingungen habe ich nicht direkt geprüft. — [IHK Köln](https://www.ihk.de/koeln/hauptnavigation/recht-steuern/recht/gefahr-missbrauch-registerdaten-5644100); [bundesAPI/handelsregister (GitHub)](https://github.com/bundesAPI/handelsregister); [implisense](https://implisense.com/de/ueber-uns/blog/handelsregister-api)
- § 87b UrhG schützt Datenbankhersteller gegen Vervielfältigung oder Verbreitung wesentlicher Teile einer Datenbank, bei wiederholter systematischer Entnahme auch unwesentlicher Teile. — [gesetze-im-internet.de § 87b UrhG](https://www.gesetze-im-internet.de/urhg/__87b.html)
- BGH I ZR 159/10 (Automobil-Onlinebörse): Die AGB verboten automatisierte Abfragen. Der Ausgang zu § 87b ist in den Sekundärquellen widersprüchlich wiedergegeben. — [rewis.io](https://rewis.io/urteile/urteil/rlw-21-06-2011-i-zr-15910/); [Ferner Alsdorf](https://www.ferner-alsdorf.de/bgh-urheberrecht-datenbank-scrapin/)
- Deutsche Post meldet „Empfänger/Firma unter der angegebenen Anschrift nicht zu ermitteln“ als Adressmerkmal 10 (Code 14: per Datenbank bestätigt). Verstorbene werden ebenfalls als „nicht zu ermitteln“ gemeldet. PREMIUMADRESS liefert Rückmeldungen und Adresskorrekturen, ist aber ausdrücklich „kein Anschriftenrecherche-Produkt“. — [Deutsche Post PREMIUMADRESS Online-Service FAQ](https://www.deutschepost.de/de/p/premiumadress/online-services-faq.html); [PREMIUMADRESS Handbuch 01/2025](https://deutschepost.de/dam/jcr:32e02af9-c82c-4873-bb90-01a66fa282a0/dp-premiumadress-handbuch-012025.pdf)
- Unzustellbare Sendungen gehen mit Rücksendegrund an den Absender zurück. — [Deutsche Post PREMIUMADRESS FAQ](https://www.deutschepost.de/de/p/premiumadress/faq.html)

### Inferences
- Handprüfung in ca. 2–3 Minuten je Lead für die Top 50 (insgesamt ca. 2 Stunden):
  1. Google Maps im Browser: Status nicht „Dauerhaft geschlossen“, jüngste Rezension oder jüngstes Foto unter 12 Monaten, Adresse stimmt mit OSM überein, kein Website-Link. Ein Website-Link führt zum Ausschluss.
  2. Instagram/Facebook, falls verlinkt: Letzter Beitrag unter 6 Monaten, Adresse oder Umzug erwähnt, Bio-Link prüfen.
  3. Das Örtliche / Gelbe Seiten: Firmenname unter dieser Anschrift. Fehlt der Eintrag, ist das nur ein schwaches Signal.
  4. Bei Läden in der Einkaufsstraße: Streetview-Datum und Schild, sofern Aufnahmen aus den letzten Jahren vorliegen. Ältere Aufnahmen zählen nur schwach.
  5. Handelsregister nur bei GmbH/UG/e.K. im Namen, als Einzelabfrage. Einzelunternehmer und Kleingewerbetreibende stehen in der Regel nicht im Handelsregister. Fehlt ein Eintrag, ist das also kein Ausschlussgrund (Inferenz aus der HGB-Systematik, nicht separat belegt).
- Die Ergebnisse der Handprüfung als Felder am Lead speichern (z. B. `manual_check_at`, `manual_check_result`) und mit L5 gegen Rückläufer auswerten.
- Den bisherigen Rückläufer als „Code 10“ in die Sperr- bzw. Auswertungslogik aufnehmen: Betrieb unterdrücken und prüfen, welche Merkmale der Lead hatte (Alter der Bearbeitung, `check_date`, Branche). Diese Merkmale als Negativbeispiel verwenden.
- Absenderangabe und Rücksendeadresse beim Briefdienst prüfen, damit Rückläufer überhaupt zurückkommen und gemessen werden können.

### Gaps
- Die aktuellen Nutzungsbedingungen von Das Örtliche und Gelbe Seiten zu automatisierten Abfragen habe ich nicht direkt gelesen. Annahme: Automatisierung ist dort untersagt, Handabfragen sind erlaubt.
- Den Wortlaut der Nutzungsordnung von handelsregister.de habe ich nicht primär geprüft. Die 60 Abrufe pro Stunde stammen aus Sekundärquellen.

## 6. Typische Unzustellbarkeitsquoten und wie man sie senkt

### Takeaway
In Kundenbeständen deutscher Unternehmen sind ca. 13 % der Adressen fehlerhaft oder unzustellbar (Deutsche Post Direkt 2025). Für ungeprüfte Firmenadressen aus Crowdsourcing-Daten ist mit einer ähnlichen oder höheren Quote zu rechnen, bei jungen Gastro- und Beauty-Betrieben eher höher. Mit Aktualitätsfilter und Handprüfung ist ein Ziel unter 5 % realistisch, aber nicht belegt.

### Cited Findings
- Adress-Studie 2025 von Deutsche Post Direkt: 13,1 % unzustellbare Adressen (2023: 12,6 %, 2021: 14,7 % fehlerhaft). Ca. 6,0 % entfallen auf Umzug ohne bekannte neue Anschrift und Todesfälle. Grundlage sind ca. 120 Mio. Kundenadressen von 200 Unternehmen aus 10 Branchen. — [Deutsche Post Adress-Studie 2025](https://www.deutschepost.de/de/p/print-mailing/insights/studien/adress-studie-2025.html); [retail-news.de](https://retail-news.de/deutsche-post-adress-studie-2025-adressqualitaet/); [DHL Pressemitteilung 2023](https://group.dhl.com/de/presse/pressemitteilungen/2023/deutsche-post-direkt-adress-studie-2023.html)
- Branchenspanne: Online-Handel 91,3 % korrekte Adressen, Banken 90,4 %. Gemeinnützige Organisationen hatten 2023 mit 17,3 % die meisten unzustellbaren Adressen. — [retail-news.de](https://retail-news.de/deutsche-post-adress-studie-2025-adressqualitaet/); [Horizont 2023](https://www.horizont.net/marketing/nachrichten/deutsche-post-direkt-adress-studie-2023-warum-kundenbriefe-oft-nicht-ankommen-211240)
- Das sind Privat- bzw. Kundenadressen, keine Geschäftsadressen. Eine eigene B2B-Quote wird nicht ausgewiesen. — [Deutsche Post Adress-Studie 2025](https://www.deutschepost.de/de/p/print-mailing/insights/studien/adress-studie-2025.html)

### Inferences
- Bei 50 Briefen à 0,81 € kosten 13 % Rückläufer nur ca. 5 €. Teurer ist der Verlust von Messkette und Lernsignal, dazu der Aufwand für Demo und Domain-Prüfung je Lead. Deshalb lohnt sich die Handprüfung auch bei 0 € Budget.
- Hebel in absteigender Wirkung (Inferenz): (1) Ausschluss alter, ungeprüfter Objekte; (2) manuelle Existenzprüfung über Google Maps und Social; (3) vollständige Anschrift (`addr:street`, `addr:housenumber`, `addr:postcode`, `addr:city`), fehlende Teile nicht aus Geokodierung raten; (4) korrekter Firmenname in der Anschrift, z. B. „An das Team von {name}“, wie die Post ihn am Schild findet; (5) bei Objekten an Wohnadressen (nur `craft`, kein `shop`) das Klingel- bzw. Briefkastenschild per Streetview nur schwach gewichten; (6) Rückläufer-Codes systematisch erfassen und als Sperre und Lernsignal nutzen.
- Optional später und kostenpflichtig: Postadressprüfung (z. B. Deutsche Post Direkt, Post Adress). Für Adressen, deren Firma nicht mehr existiert, hilft das nur begrenzt, weil die Post keine Firmenexistenz recherchiert.

### Gaps
- Für Werbebriefe an kleine Geschäftsadressen in Deutschland fand ich keine veröffentlichte Unzustellbarkeitsquote.
- Daten des DDV bzw. Siegfried Vögele Instituts zu B2B-Rückläufern fand ich nicht frei zugänglich.

---

### Anhang: Konkretes Scoring-Rezept (Vorschlag, Gewichte begründet, aber nicht empirisch kalibriert)

**Harte Ausschlüsse (vor dem Scoring):**
1. `website`, `contact:website` oder `url` gesetzt bzw. Probe = gefunden; Probe = „possible“ führt zur Handprüfung oder zum Ausschluss.
2. `brand`, `brand:wikidata` oder `brand:wikipedia` gesetzt, oder `name` mindestens 3-mal gleich in derselben Kategorie im Extrakt.
3. `disused:*`, `abandoned:*`, `was:*`, `shop=vacant` oder `opening_hours="closed"` bzw. `"off"`.
4. Anschrift unvollständig: Es fehlt eines der Felder `addr:street`/`addr:place`, `addr:housenumber`, `addr:postcode`, `addr:city`.
5. Keine Bearbeitung und kein `check_date` seit über 60 Monaten; bei Gastronomie und Beauty seit über 36 Monaten.
6. Sperrliste, Rückläufer Code 10/14/20, bereits kontaktiert (12 Monate), Gesundheit/Recht.
7. Handprüfung: „Dauerhaft geschlossen“, abweichende Adresse ohne neue Bestätigung, Website gefunden.

**Punkte (0–100, an `prescreen.ts` angelehnt):**
| Signal | Punkte | Begründung |
|---|---|---|
| `check_date` oder `check_date:opening_hours` ≤ 12 Monate | +25 | Menschliche Vor-Ort-Bestätigung (StreetComplete-Mechanik) |
| `check_date` 13–24 Monate | +15 | Innerhalb des üblichen Prüfintervalls |
| Nur Bearbeitung ≤ 24 Monate (ohne `check_date`) | +12 | Schwächer, weil Bots oder Massenänderungen möglich sind |
| Bearbeitung 25–60 Monate | +3 | |
| `opening_hours` vorhanden | +10 | Instabilstes Tag, gepflegt heißt lebendig |
| `phone` vorhanden | +15 | Echter, erreichbarer Betrieb |
| Social-Link (instagram/facebook/tiktok) und Probe = keine Website | +15 | Aktiv, aber ohne Website |
| Freemail-Adresse | +10 | Keine eigene Domain |
| `start_date` 6–24 Monate | +15 | Kritische Anfangsphase überstanden, Bedarf hoch |
| `start_date` 25–36 Monate | +8 | |
| `start_date` < 6 Monate | +5 | Hoher Bedarf, hohes Schließrisiko |
| Hochpreisiges Handwerk (Dach, SHK, Elektro, Maler, Tischler, Fliesen) | +10 | Ein Auftrag finanziert die Website (Annahme) |
| Ladenlokal (`shop`/`amenity`) statt nur `craft` an einer Wohnadresse | +5 | Sichtbar, besser zustellbar |
| Inhabername im Namen | +5 | Inhabergeführt (Annahme) |
| Kampagnenbranche (bestehend) | +6 bis +15 | wie bisher |
| Eigene Mail-Domain | −10 | Website wahrscheinlich |
| Probe „possible“ | −40 | wie bisher |

**Auswahl für 30–50 Briefe:** Nach Score sortieren, je Branche aufteilen (gemäß CLAUDE.md §10: Gastronomie, Handwerk, Beauty je ca. ein Drittel). Die Top 60–70 von Hand prüfen (5 Schritte aus Abschnitt 5), die besten 30–50 bestätigten versenden. Ergebnisse der Handprüfung und Rückläufer-Codes speichern, damit L5 die Gewichte nach den ersten Chargen nachkalibrieren kann.
