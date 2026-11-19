# Fakten und Telefonnummer schlagen Effekte und Farbverläufe

**Kurzfassung.** Eine echte, gute Website für eine Kfz-Werkstatt oder einen Handwerker in Deutschland ist meistens **schlicht und konkret**: Name, Gewerk und Stadtteil stehen oben, die Telefonnummer ist sofort antippbar, Öffnungszeiten und Adresse sind ohne Suchen zu finden, und der Text enthält Dinge, die nur auf diesen einen Betrieb passen (Straße, Spezialgebiet, Einsatzgebiet, echte Leistungen). „Vibe-coded“ oder KI-gebaute Seiten erkennt man dagegen an einem festen Bündel von Standardentscheidungen: lila-blaue Farbverläufe, die Schrift Inter, ein zentrierter Kopfbereich mit kleinem Etikett und zwei Knöpfen, drei gleiche Kästchen mit Icons, Glas- und Leuchteffekte, und Texte wie „Ihr kompetenter Partner“. Eine Messung an 1.590 neuen Websites fand bei **22 % vier oder mehr dieser Muster** ([Adrian Krebs](https://www.adriankrebs.ch/blog/design-slop/)). Kein einzelnes Merkmal beweist KI; verräterisch ist die Kombination ohne Grund. Für unsere Demos ohne Fotos des Betriebs heißt das: Wir dürfen weder Fotos, Logo oder Street-View-Bilder des Betriebs kopieren noch ein falsches „Team“ aus Stockfotos zeigen. Echt wirkt die Demo stattdessen durch belegte Fakten, ein Design aus der Welt des Gewerks, neutrale Detailbilder ohne Gesichter und Marken, und **sichtbar vorgesehene Plätze** für die echten Fotos, die der Kunde später liefert. Wichtig vorab: Keine Studie misst bisher, ob normale Kunden den KI-Look bemerken oder ob er Anfragen kostet. Die Regeln unten beruhen auf Expertenkonsens, deutschen Handwerks-Studien und Rechtsquellen, nicht auf einem A/B-Test.

Stand der Recherche: 19.11.2026. Daten aus den USA sind mit **[US]** markiert. Nach unserer Projektregel dürfen US-Zahlen nie als deutsche Zahlen in Briefen oder Demos auftauchen.

## Fünf Standardentscheidungen verraten eine KI-Seite sofort

„Vibe Coding“ heißt: Man beschreibt einer KI grob, was man will, und übernimmt, was herauskommt. Das Problem ist nicht, dass die KI schlecht gestaltet, sondern dass sie **immer dieselben „sicheren“ Entscheidungen trifft**, wenn man ihr keine eigenen vorgibt. Anthropic nennt das selbst „distributional convergence“, also ein Zusammenlaufen auf den Durchschnitt, und zählt als typische Folgen auf: Schriften wie Inter, Roboto, Arial, Open Sans und Lato, „abgedroschene Farbschemata (besonders lila Verläufe auf weißem Grund)“ und vorhersehbare Layouts ohne Bezug zum Inhalt ([Anthropic/Claude Blog](https://www.claude.com/blog/improving-frontend-design-through-skills)). Eine Forschergruppe der University of Washington und von Microsoft beschreibt denselben Effekt als Drift „zum Mittelwert, zur dominanten Ästhetik“: Den Standard zu übernehmen ist immer der bequemste Weg ([Shin et al., arXiv](https://arxiv.org/html/2603.13036v1)).

Die einzige echte Messung dazu stammt von Adrian Krebs. Er hat im April 2026 **1.590 neue Websites** automatisch geladen und rein technisch (über Schriften, Farben und Layout im Code, ohne KI-Urteil) auf typische Muster geprüft. Ergebnis: **22 % hatten vier oder mehr Muster, 32 % zwei bis drei, 46 % höchstens eines**; die Fehlerquote schätzt er auf 5 bis 10 %. Sein Urteil ist nüchtern: Die Seiten seien „nicht wirklich schlecht, nur uninspiriert“ ([Adrian Krebs](https://www.adriankrebs.ch/blog/design-slop/)). Eine frühere Auswertung derselben Methode an 500 Seiten nennt Anteile für einzelne Muster, etwa Farbverläufe 28 %, unverändertes shadcn/ui (ein beliebter Baukasten für Knöpfe und Kästchen) 23,5 %, immer dunkler Hintergrund 20,3 %, gleiche Feature-Kästchen 20,1 % und Glas-Effekte 17,1 % ([GIGAZINE](https://www.gigazine.net/gsc_news/en/20260423-design-slop/)). Diese Einzelzahlen passen nicht ganz zur späteren Endfassung und sind nur als grobe Richtung zu lesen. Gemessen wurden außerdem Start-up-Seiten, keine Handwerkerseiten.

Die Merkmale, die unabhängige Designer immer wieder nennen, lassen sich in fünf Gruppen ordnen. Die Tabelle erklärt jedes Merkmal in einfachen Worten.

| Gruppe | Typisches KI-Merkmal | Warum es auffällt |
|---|---|---|
| Farbe | Lila/Indigo-zu-Blau-Verläufe, Leuchten (Glow) um Knöpfe, dunkler Hintergrund mit Neon, vier verschiedene Akzentfarben | Kommt aus den Voreinstellungen von Tailwind (`bg-indigo-500`) und ist überall gleich ([DEV Community](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p); [The Fountain Institute](https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui)) |
| Schrift | Inter für alles; als „Ersatz“ Space Grotesk, Geist, Instrument Serif, Fraunces; ein kursives Serifen-Wort mitten in der Überschrift | Zeigt, dass niemand eine Schrift ausgesucht hat. Die Ersatzschriften sind inzwischen selbst KI-Erkennungszeichen ([Spot the Slop](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c); [Adrian Krebs](https://www.adriankrebs.ch/blog/design-slop/)) |
| Aufbau | Zentrierter Kopfbereich („Hero“) mit Pillen-Etikett über der Überschrift und zwei gleich starken Knöpfen; drei gleiche Kästchen mit Icon oben; Zahlenleiste („500+ zufriedene Kunden“); Schritte 1-2-3 als Deko | Krebs nennt das „Meta-Fingerabdruck“: lila Verlauf, Inter, zentrierter Hero, drei Karten ([Laith0003 Bannliste](https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list); [21st.dev](https://21st.dev/blog/website-not-look-ai-generated)) |
| Details | Überall gleicher Eckenradius und Abstand, farbiger Streifen am linken Kartenrand, Glas-Effekt, Emoji als Icons, Großbuchstaben-Etiketten über jedem Abschnitt | Wenn alles gleich groß und gleich rund ist, sticht nichts hervor; die Seite hat keine Rangordnung ([Spot the Slop](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c)) |
| Bewegung | Jeder Abschnitt blendet beim Scrollen gleich ein, oder gar nichts bewegt sich | „Entweder bewegt sich nichts, oder alles blendet mit demselben Timing ein“ ([Spot the Slop](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c)) |

Der deutsche Design-Blog Dr. Web fasst es gut zusammen: KI-Slop sind „Gestaltungsmuster, die einzeln sinnvoll sind, aber ohne Anlass kombiniert auftreten“ ([Dr. Web](https://www.drweb.de/ki-slop-design-vibecoding/)). Dazu kommt ein handfestes Problem: Weißer Text auf dem typischen Indigo erreicht nur einen Kontrast von 4,47:1 und verfehlt damit knapp die Barrierefreiheitsgrenze WCAG AA von 4,5:1 (gleiche Quelle). Lila ist also nicht nur langweilig, sondern oft auch schlecht lesbar.

### Texte verraten KI genauso schnell wie Farben

Bei Texten ist das stärkste Erkennungszeichen die **austauschbare Überschrift**: Sätze wie „Transform your workflow with powerful, intuitive tools“ passen auf jedes Unternehmen. Der Gegenvorschlag lautet: „ein konkreter Satz, der nur auf Ihr Produkt passt“, denn „generierte Seiten haben keinen Autor, und das sieht man“ ([21st.dev](https://21st.dev/blog/website-not-look-ai-generated)). Weitere Muster sind eine Unterzeile, die die Überschrift nur weicher wiederholt ([MindStudio](https://www.mindstudio.ai/blog/avoid-vibecoded-landing-pages)), Dreierketten wie „schnell, effizient und zuverlässig“ ([DEV Community](https://dev.to/raxxostudios/why-your-ai-generated-content-looks-like-ai-and-how-to-fix-it-4ao6)), runde Zahlen ohne Beleg, Platzhalternamen und Füllwörter ([Laith0003 Bannliste](https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list)) sowie Texte, in denen alles nur positiv ist und nie eine echte Einschränkung vorkommt ([WordStream](https://www.wordstream.com/blog/content-sounds-like-ai)). Gedankenstriche gelten in Foren als „größtes Erkennungszeichen“ ([Hacker News](https://news.ycombinator.com/item?id=49290499)), das ist aber umstritten: Wer nur die Striche löscht und den Satzrhythmus nicht ändert, klingt trotzdem nach Maschine ([Salt Agency](https://salt.agency/blog/in-defence-of-the-em-dash-what-the-ai-writing-debate-gets-wrong/)).

Für Deutsch gibt es keine eigene Studie zu KI-Floskeln auf Websites. Die deutschen Gegenstücke sind eine eigene Ableitung, passen aber eins zu eins: „Herzlich willkommen bei …“, „Ihr kompetenter Partner rund ums Auto“, „Qualität, die überzeugt“, „mit Leidenschaft und Präzision“, „zuverlässig, kompetent, persönlich“, „über 500 zufriedene Kunden“ oder „100 % Zufriedenheit“. Unbelegte Zahlen und Superlative sind bei uns nicht nur Geschmackssache, sondern verstoßen gegen unsere Regel aus § 5 UWG (keine irreführenden Aussagen).

Eine wichtige Falle: **Wer der KI nur Muster verbietet, bekommt den nächsten Standard.** Selbst mit einer Liste verbotener Schriften lief Claude in Anthropics Tests wieder auf Space Grotesk zu ([Anthropic/Claude Blog](https://www.claude.com/blog/improving-frontend-design-through-skills)). Und der Satz „Mach es weniger KI-mäßig“ änderte in einem Versuch fast nichts; erst feste Entscheidungen (eine bestimmte Schrift, sechs Farbwerte, flache Farben, keine Emoji, keine Schatten) halfen. Markus Seyfferth von Dr. Web formuliert es so: „Ein Prompt ersetzt keine Gestaltungsentscheidung, er überlässt sie den Voreinstellungen anderer Leute“ ([Dr. Web](https://www.drweb.de/ki-slop-design-vibecoding/)).

## Gute Werkstattseiten gewinnen mit Telefon, Ort und Spezialgebiet

Wer nach preisgekrönten Werkstatt- oder Handwerkerseiten sucht, findet fast nichts. Bei Awwwards gewinnen Agenturen und Start-ups, nicht Dachdecker oder Mechaniker ([Awwwards](https://www.awwwards.com/inspiration_search/winner_category_business-services/)); beim German Design Award kommt dem Handwerk am nächsten der Relaunch des Ladenbauers trend interior ([German Design Award](https://www.german-design-award.com/en/gallery/detail/web/trend-interior-gmbh-website-relaunch)). Das ist selbst eine Erkenntnis: **Diese Branche wird an Vertrauen und Anrufen gemessen, nicht an Effekt-Design.** Eine Demo, die nach Design-Preis aussieht (Verläufe, Scroll-Effekte), passt vermutlich nicht zum Bild, das ein Werkstattinhaber von einer seriösen Seite hat.

### Was gelobte Beispiele gemeinsam haben

Die meisten gelobten Beispiele kommen aus US-Listen von Agenturen, die selbst Websites verkaufen. Sie sind also werblich gefärbt und wurden nicht einzeln auf den Live-Seiten geprüft. Trotzdem ist das Muster eindeutig **[US]**:

| Betrieb | Was auffällt | Quelle |
|---|---|---|
| Scott's Auto Repair (scottsautorepair.com) | Foto der echten Werkstattfassade, großer „Termin“-Knopf; Garantie, Shuttle und Ersatzwagen ohne Scrollen sichtbar | [Freshysites](https://freshysites.com/blog/top-auto-repair-websites/) |
| Galson Auto Body (galsonauto.com) | Werkstatt in Graustufen mit roten Akzenten, Zertifikate und Jahre im Betrieb sichtbar, Telefon und Termin sofort da | [Freshysites](https://freshysites.com/blog/top-auto-repair-websites/) |
| Total Car Care (totalcareautomotive.com) | Klares Spezialgebiet: großes Getriebe im Kopfbereich, „Transmission Repair“ | [Freshysites](https://freshysites.com/blog/top-auto-repair-websites/) |
| Cathedral Automotive | Oldtimer im Kopfbereich, Rot-Schwarz, Spezialisierung auf Restaurierung | [Freshysites](https://freshysites.com/blog/top-auto-repair-websites/) |
| Bone Dry Roofing (bonedry.com) | Bewusst schlicht, wenig Animation, konkrete Angebote | [Comrade Web](https://comradeweb.com/blog/best-roofing-websites/) |
| Greater Midwest Exteriors | Texte zu regionalen Schäden (Frost, Hagel), offene Preisspanne für ein neues Dach | [Comrade Web](https://comradeweb.com/blog/best-roofing-websites/) |
| Bear's Plumbing, True Air Conditioning | Das echte Team vor den eigenen Firmenwagen bzw. Anlagen; auf dem Handy feste Leiste mit Anruf-Knopf | [Hook Agency](https://hookagency.com/blog/home-service-website-examples/) |

Was diese Seiten echt macht, ist nie ein Effekt, sondern **Spezifität**: ein Spezialgebiet (Getriebe, Oldtimer, Diesel), regionale Probleme, Zahlen zum Betrieb, konkrete Zusatzleistungen wie Ersatzwagen, und echte Fotos von Menschen und Orten. Bei den Farben dominieren zwei bis drei kräftige Farben wie Rot-Schwarz oder Blau-Weiß, mit einer Akzentfarbe nur für Knöpfe ([Freshysites](https://freshysites.com/blog/top-auto-repair-websites/)). Schlichtheit wird ausdrücklich gelobt: „plain, low-animation design focused on clarity“ ([Comrade Web](https://comradeweb.com/blog/best-roofing-websites/)). Ein deutsches Beispiel ist Auto Brückl in Tirol, eine Werkstatt- und Karosserie-Seite, die den Familienbetrieb vorstellt ([ProcessWire Showcase](https://processwire.com/sites/list/auto-bruckl)); eine unabhängige Bestenliste deutscher Werkstattseiten existiert nicht.

### Deutsche Handwerkerseiten lassen fast alles Wichtige weg

Die beste deutsche Zahl stammt aus einem Test von 500 Handwerker-Websites (Dachdecker, Maler, SHK, Schreiner, Elektriker in fünf Großstädten), jeweils unter den ersten 20 Google-Treffern und am Handy geprüft. Der Schnitt lag bei **2,12 von 9 Punkten**, 69 Seiten bekamen null Punkte. **78 % zeigen kein Foto des Inhabers, 88 % nennen keine Preise, nur 16 % binden externe Bewertungen ein, nur 15 % beantworten typische Kundenfragen**, und Online-Termine bieten 1 % an ([Deutsche Handwerks Zeitung](https://www.deutsche-handwerks-zeitung.de/?p=366126)). Das ist eine gute Nachricht für uns: Die Messlatte ist niedrig. Eine Demo, die Telefon, Ort, Leistungen, Fragen und Antworten und ein gutes Formular sauber zeigt, liegt schon über dem Durchschnitt.

Deutsche Agenturen sind sich bei den Grundlagen einig. „Beim richtigen Webdesign steht deshalb die Telefonnummer sichtbar oben“, antippbar auf dem Handy, und für einen Notdienst gehört die Nummer „über allem“. Dazu kommen Meistertitel und Handwerkskammer, ein klar genanntes Einsatzgebiet, „ein klarer Preisrahmen statt ‚auf Anfrage‘“ und ein Formular, das nur drei Dinge fragt: „Was ist zu tun, wo, bis wann“ ([kopfundstift](https://kopfundstift.de/webdesign-fuer-handwerker/)). Die Studienautoren empfehlen, je Gewerk **8 bis 12 typische Kundenfragen** aufklappbar zu beantworten und statt eines leeren Textfelds ein geführtes Formular mit Auswahlfeldern anzubieten ([Deutsche Handwerks Zeitung](https://www.deutsche-handwerks-zeitung.de/?p=366126)). Ein Ratgeber fasst den Maßstab in einem Satz: Besucher müssen in drei Sekunden verstehen, wer der Betrieb ist, was er macht und wo er arbeitet ([alloq.digital](https://alloq.digital/de/blog/handwerker-website-erstellen/)).

### Was Besucher wirklich zuerst suchen

Die Entscheidung fällt oft schon vor der Website, bei den Bewertungen. Laut einer großen US-Umfrage von 2026 lesen **97 % Bewertungen lokaler Betriebe**, 68 % nutzen nur Betriebe mit mindestens 4 Sternen, und **nach positiven Bewertungen ist der Besuch der Website mit 54 % der häufigste nächste Schritt** **[US]**. Bemerkenswert für uns: 50 % würden einen Betrieb eher nicht wählen, der mit Standard- oder Floskel-Antworten auf Bewertungen reagiert ([BrightLocal 2026](https://www.brightlocal.com/research/local-consumer-review-survey/)). Das ist der direkteste Beleg, dass generischer Text Vertrauen kostet. Auf der Website selbst wollen Menschen vor allem eine echte Person erreichen: Eine sichtbare Telefonnummer „signalisiert, dass die Organisation erreichbar ist“. Adressen sollen mit einer Karten-App verlinkt sein, Öffnungszeiten neben der Nummer stehen, und ein Formular soll höchstens 3 bis 5 Felder haben und nie der einzige Kontaktweg sein ([NN/g](https://www.nngroup.com/articles/contact-us-pages/)) **[US]**.

Für die Frage „großes Formular oben oder nur Knöpfe?“ gibt es keine belastbare Antwort. Bei US-Dachdeckern ist ein kurzes Formular im Kopfbereich verbreitet, bei Werkstätten dominieren dagegen ein Anruf- und ein Termin-Knopf, auf dem Handy oft als feste Leiste am unteren Rand ([Hook Agency](https://hookagency.com/blog/home-service-website-examples/); [Freshysites](https://freshysites.com/blog/top-auto-repair-websites/)). Die Zahlen zu Formularen stammen alle von Agenturen mit kleinen Stichproben ([PaperStreet](https://www.paperstreet.com/blog/case-study-better-conversions-contact-form-home-page/)). Für eine deutsche Kfz-Werkstatt ist die vernünftigste Wahl: oben Telefon und ein Knopf „Termin anfragen“, das geführte Formular weiter unten.

## Ohne eigene Fotos gilt: lieber ehrliche Lücke als falsches Team

Hier liegt unser größtes Problem. Das stärkste Vertrauenselement echter Handwerkerseiten ist das Gesicht des Inhabers und des Teams. In einem Blickverlauf-Test von Nielsen Norman wurden dekorative Stock-Personen als „reiner Füller“ übersehen, während Fotos von Menschen, „die wirklich in der Firma arbeiten“, Aufmerksamkeit bekamen: Ein Nutzer betrachtete Mitarbeiterporträts **10 % länger als die Lebensläufe daneben, obwohl diese 316 % mehr Fläche hatten** ([NN/g](https://www.nngroup.com/articles/photos-as-web-content/)). Genau diese Fotos haben wir bei einer Demo nicht.

Interessant ist eine neuere Studie: Nielsen Norman testete 2026 mit 77 Personen KI-Bilder gegen echte Stockfotos auf einer erfundenen Beraterseite und fand **keinen Beleg, dass die KI-Bilder Vertrauen senkten**. Wer aber eine KI vermutete, bewertete die Seite schlechter, und offen gelegter KI-Einsatz senkt laut zitierter Forschung das Vertrauen ([NN/g 2026](https://nngroup.com/articles/ai-generated-images)) **[US]**. Die Lehre daraus: Nicht das Bild an sich schadet, sondern **ein Bild, das als falsch auffällt**, etwa durch seltsame Hände, verzerrte Schrift oder weil es offensichtlich nicht zum Betrieb gehört.

### Was rechtlich erlaubt ist und was nicht

Die folgende Übersicht fasst die deutschen Grenzen zusammen. Sie beruht auf Fachanwalts-Ratgebern und Googles eigenen Regeln, ist aber keine Rechtsberatung. Gerichtsurteile speziell zu Google-Profilfotos oder Street View auf fremden Seiten wurden nicht gefunden.

| Material | Erlaubt? | Begründung |
|---|---|---|
| Fotos aus dem Google-Profil des Betriebs | **Nein**, nur mit Erlaubnis | Selbst einfache Handyfotos sind als „Lichtbilder“ nach § 72 UrhG 50 Jahre geschützt; ungefragte Nutzung führt zu Abmahnungen ([e-recht24](https://www.e-recht24.de/urheberrecht/8289-abmahnung-urheberrecht-vertragsstrafe-bilderklau.html); [WBS Legal](https://www.wbs.legal/urheberrecht/bildrecht/fotografen/unberechtigte-bildnutzung/)). Viele Profilfotos stammen von Kunden, nicht vom Inhaber. Googles Regeln verbieten zudem Speichern und Weiterverbreiten ([Google Places Policies](https://developers.google.com/maps/documentation/places/web-service/policies)) |
| Logo des Betriebs | **Nein**, nur mit Erlaubnis | Kann als Marke und urheberrechtlich geschützt sein; Abmahnrisiko auch bei Versehen ([gruender.de](https://www.gruender.de/recht/logos-webseite-einbinden/); [e-recht24](https://www.e-recht24.de/artikel/blog-foren-web20/7095-youtube-twitter-facebook-logonutzung.html)) |
| Screenshot von Street View oder Google Maps | **Nein** | Google: Street View darf „für keinen Zweck“ per Screenshot genutzt werden ([Google Geo Guidelines](https://about.google/brand-resource-center/products-and-services/geo-guidelines/)) |
| Street View im gedruckten Brief | **Nie** | Street-View-Bilder dürfen „für keine Druckzwecke“ verwendet werden (gleiche Quelle) |
| Offizielles Einbetten einer Karte oder von Street View auf der Webseite | Ja | Einbetten ist erlaubt, mit sichtbarer Quellenangabe, die nicht abgeschnitten werden darf (gleiche Quelle). Eine OSM-Karte passt besser zu unserer Datenquelle |
| Google-Bewertungstexte kopieren | **Nein** | Google verbietet das Kopieren und Speichern von Bewertungen ([Google Places Policies](https://developers.google.com/maps/documentation/places/web-service/policies)); wer Bewertungen zeigt, muss nach § 5b Abs. 3 UWG sagen, ob und wie er die Echtheit prüft ([IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/faq-informationspflicht-echtheit-kundenbewertungen.html)) |
| Erfundene Kundenstimmen | **Nie** | Irreführung nach § 5 UWG; gefälschte Bewertungen sind nach UWG-Anhang Nr. 23c immer verboten ([buzer.de](https://www.buzer.de/Anhang_UWG.htm)) |
| Lizenzierte Stockfotos (z. B. Unsplash) | Ja, mit Vorsicht | Kommerzielle Nutzung ohne Namensnennung erlaubt; zu erkennbaren Personen und Marken sagt die Lizenz nichts ([Unsplash License](https://unsplash.com/license)), Pexels schließt sie ausdrücklich aus ([Pexels Terms](https://pexels.com/terms-of-service)) |

Ein Punkt ist für unser Projekt besonders heikel: Googles Regeln enthalten den Satz „Don't create content based on Google Maps Content“ ([Google Places Policies](https://developers.google.com/maps/documentation/places/web-service/policies)). Wenn wir Demo-Texte aus Themen von Google-Bewertungen ableiten („Termine auch samstags“), muss das gegen `docs/compliance-google.md` geprüft werden. Sicherere Quellen sind OSM-Daten und das, was der Betrieb selbst öffentlich über sich sagt.

### Wie die Demo trotzdem echt wirkt

Die Lösung besteht aus vier Teilen. Erstens: **Fakten statt Fotos.** Was belegt ist, also Name, Straße, Stadtteil, Öffnungszeiten, Telefonnummer, Leistungen aus OSM-Daten und die Gesamtnote mit Anzahl der Bewertungen (nur wenn belegt und freigegeben), steht so konkret wie möglich auf der Seite. Zweitens: **neutrale Detailbilder als Atmosphäre**, etwa Werkzeug, Hände an einem Motor, Reifenprofil, Hebebühne von unten, Material, alles ohne Gesichter, ohne lesbare Automarken und ohne erkennbare Gebäude, damit kein Persönlichkeits- oder Markenrecht berührt wird und niemand glaubt, das sei der Betrieb. Bilder aus verschiedenen Quellen wirken mit einer einheitlichen Bildbearbeitung (gleiche Farbstimmung, leichte Körnung) wie ein einziges Fotoshooting, und eine Kennzeichnung „Symbolbild“ am Bild verhindert den Eindruck, es seien eigene Arbeiten ([Händlerbund](https://ohn.haendlerbund.de/haendlerbund-news/ki-bilder-amazon-kennzeichnen)). Drittens: **gestaltete Platzhalter** an den Stellen, wo echte Seiten ihre stärksten Fotos haben, zum Beispiel ein schön gerahmtes Feld „Hier kommt Ihr Werkstattfoto hin“ oder „Ihr Team, damit Kunden wissen, wer an ihrem Auto arbeitet“. Das ist ehrlicher als ein lächelnder Stock-Mechaniker und wird im Onboarding zur Aufgabe für den Kunden. Ob ein solcher Platzhalter besser wirkt als ein Stimmungsbild, hat niemand getestet; das müssen wir selbst messen. Viertens: **Typografie als Hauptgestaltung.** Wo ein Foto nichts beiträgt, wirkt eine große, gut gewählte Schrift mit der Telefonnummer als Blickfang professioneller als jedes Füllbild.

Fotorealistische KI-Bilder von „unseren Arbeiten“ (reparierte Autos, fertige Bäder) sind tabu. Sie behaupten eine Tatsache, die nicht stimmt, und genau solche Bilder fallen durch kleine Fehler als falsch auf.

## Der Prompt muss Entscheidungen vorgeben, nicht Adjektive

Die wichtigste Regel für den Generator lautet: **Vage Wünsche erzeugen Standardseiten.** Vercel, der Hersteller des KI-Baukastens v0, empfiehlt drei Bausteine für jeden Prompt: was genau auf die Seite soll (die echten Inhalte und Daten, nicht „eine Website“), wer sie in welcher Situation benutzt („wenn Sie den Nutzungskontext nicht festlegen, rät das Modell“) und klare Vorgaben zu Gerät, Stil und Farbbedeutung, etwa „mobile-first“ statt „funktioniert auch mobil“. In Vercels eigenen Tests war das Ergebnis mit Nutzungskontext vollständig funktionsfähig, ohne ihn nicht ([Vercel](https://vercel.com/blog/how-to-prompt-v0)). Anthropic empfiehlt, erst den Zusammenhang und dann die Details zu nennen, Vorgaben auf der „richtigen Höhe“ zu formulieren (eine klare Richtung, nicht nur Farbcodes und nicht nur Adjektive), verbotene Muster ausdrücklich aufzulisten und am Ende zu verlangen, Entscheidungen zu treffen, die „wirklich für diesen Kontext gestaltet“ wirken ([Anthropic/Claude Blog](https://www.claude.com/blog/improving-frontend-design-through-skills)). Auch daisyUI rät, statt Adjektiven eine benannte Stilrichtung, feste Design-Werte (Farben mit Aufgaben, Abstände, Schriftrollen) und echte Beschriftungen statt Platzhaltern vorzugeben ([daisyUI](https://trends.daisyui.com/how-to-make-ai-ui-less-generic/)).

Für unseren Generator heißt das konkret: Das Design entscheidet nicht die KI pro Lead, sondern ein von Hand geprüftes **Gestaltungs-Kit pro Gewerk** (Schriftpaar, Farben mit Rollen, Eckenform, Abstände, Bildstil). Die KI wählt nur aus erlaubten Varianten aus und schreibt Text in feste Felder. Danach prüft ein Programm, ob verbotene Muster auftauchen. Die Methode von Krebs (die gerenderte Seite automatisch auf Schrift, Verläufe, Glas-Effekte, gleiche Kästchen und so weiter prüfen und Treffer zählen) lässt sich direkt als Prüfschritt nachbauen ([Adrian Krebs](https://www.adriankrebs.ch/blog/design-slop/)). Dieselbe Arbeitsteilung hat schon der frühere Bericht „Demo Websites ohne KI Look“ empfohlen; die neuen Quellen bestätigen sie.

### Beispiel: So sieht eine Kfz-Demo nach diesen Regeln aus

Diese Beschreibung ist eine eigene Ableitung aus den Quellen, keine getestete Vorlage. Die Farbwahl (Graphit mit Signalorange) ist Design-Konvention aus der Werkstattwelt, keine Forschung. Oben steht links ausgerichtet „Kfz-Werkstatt in Dortmund-Hörde“ mit Straße, darunter „Heute geöffnet bis 18 Uhr“ und ein großer, antippbarer Knopf „0231 … anrufen“ in Signalorange, daneben ein ruhiger zweiter Knopf „Termin anfragen“. Rechts oder darunter sitzt ein Detailbild (Reifenprofil, Werkzeug) mit dem Vermerk „Symbolbild“ oder ein gerahmter Platz „Ihr Werkstattfoto“. Es folgen die Leistungen als schlichte Liste wie eine Preistafel, jede Zeile mit einem Satz Nutzen und dem Vermerk „Beispiel“, solange sie nicht belegt sind. Dann ein kurzer Ablauf „So läuft ein Termin ab“ (Anruf, Fahrzeugannahme, Rückruf vor Mehrkosten, Abholung), weil das ein echter Ablauf ist und keine Deko. Darunter 8 bis 12 aufklappbare Fragen, etwa „Was kostet eine Inspektion?“ mit Platz für einen Preisrahmen, dann Karte, Öffnungszeiten und Anfahrt, ein gestalteter Platz für Inhaber und Team, und am Ende ein geführtes Formular (Was ist los, welches Auto, wann passt es). Auf dem Handy bleibt unten eine feste Leiste „Anrufen“. Keine Kundenstimmen, kein Sterne-Widget, keine Zahlenleiste, keine Verläufe.

## Checkliste für den neuen Generierungs-Prompt

Die folgenden Tabellen sind so geschrieben, dass sie fast wörtlich in einen Prompt oder in Prüfregeln übernommen werden können. Jede Zeile ist eine Synthese aus den oben zitierten Quellen.

### Design

| Mach das | Lass das |
|---|---|
| Ein Kit pro Gewerk mit fest geprüftem Schriftpaar (eine Überschriftenschrift mit Charakter, eine gut lesbare Textschrift) und deutlichem Größenunterschied | Inter, Roboto, Open Sans, Lato, Arial als Hauptschrift; die „Ersatz-Standards“ Space Grotesk, Geist, Instrument Serif, Syne, Fraunces; kursives Akzentwort in der Überschrift |
| Eine dominante Grundfarbe aus der Welt des Gewerks plus genau eine Akzentfarbe, nur für Anruf- und Termin-Knopf | Lila, Indigo, Blau-Cyan-Verläufe, Verlaufstext, Leuchteffekte, Neon auf Schwarz, mehrere konkurrierende Akzentfarben |
| Text immer dunkel auf hell (oder umgekehrt) mit Kontrast nach WCAG AA | Weißer Text auf mittlerem Lila oder Türkis |
| Kopfbereich links ausgerichtet: Gewerk + Stadtteil + Straße, ein starker Knopf (Anrufen), ein ruhiger zweiter Knopf | Zentrierter Kopfbereich mit Pillen-Etikett über der Überschrift und zwei gleich starken Knöpfen; Kopfbereich, der den ganzen Handybildschirm füllt |
| Leistungen als Liste, Tabelle oder Preistafel; Abschnitte mit unterschiedlichem Aufbau; Rangordnung durch Größe und Gewicht | Drei oder sechs gleiche Kästchen mit Icon oben; Kästchen in Kästchen; überall gleicher Radius und Abstand; farbiger Streifen am Kartenrand |
| Höchstens ein bewusster Bewegungsmoment pro Seite; sonst nur Reaktion auf Tippen | Einblenden bei jedem Abschnitt, hochzählende Zahlen, Parallax, Glas-Effekt (`backdrop-filter`) |
| Ein einheitlicher Icon-Satz mit gleicher Strichstärke, sparsam eingesetzt | Emoji als Icons, Großbuchstaben-Etiketten über jedem Abschnitt, Nummern 01/02/03 als Deko |
| Schlicht, schnell, mobil zuerst (QR-Besucher sind am Handy) | Hintergrundvideo, große Effekt-Bibliotheken, Design-Preis-Ästhetik |

### Text

| Mach das | Lass das |
|---|---|
| Überschrift, die nur auf diesen Betrieb passt: Gewerk, Stadtteil, Straße, Spezialgebiet aus belegten Daten | „Herzlich willkommen bei …“, „Ihr kompetenter Partner“, „Qualität, die überzeugt“, „mit Leidenschaft“, „rundum sorglos“, „Tradition trifft Moderne“ |
| Kurze, klare Sätze im Ton eines Inhabers („Rufen Sie einfach an, wir sagen Ihnen vorher, was es kostet“) | Dreierketten wie „zuverlässig, kompetent, persönlich“; Unterzeile, die die Überschrift nur wiederholt |
| Fachwörter des Gewerks (Inspektion, HU/AU-Vorbereitung, Reifenwechsel, Klimaservice), aber nur Leistungen, die belegt oder als „Beispiel“ markiert sind | Erfundene Zahlen („20 Jahre Erfahrung“, „über 500 zufriedene Kunden“, „100 %“), Superlative („die beste Werkstatt“), Meister- oder Innungsangaben ohne Beleg |
| Echte Abläufe beschreiben, ehrlich auch Grenzen nennen | Alles nur positiv, Werbesprache, englische Modewörter |
| Häufige Kundenfragen (8 bis 12) beantworten, Preisfragen mit Platz für einen echten Preisrahmen | Lorem ipsum, „Jane Doe“, „Ihr Text hier“ ohne Gestaltung |
| Höchstens wenige Gedankenstriche, natürlicher Satzrhythmus | Text voller Gedankenstriche und Doppelpunkt-Slogans |

### Bilder und Inhalte ohne eigene Fotos

| Mach das | Lass das |
|---|---|
| Gestaltete Platzhalter für Werkstattfoto, Inhaber und Team, die wie Teil des Designs aussehen | Stockfotos von Personen, die wie Inhaber oder Team des Betriebs wirken |
| Lizenzierte Detailbilder ohne Gesichter, ohne lesbare Automarken oder Logos, ohne erkennbare Gebäude; Lizenz je Bild dokumentiert | Fotos, Logo oder Bewertungstexte aus dem Google-Profil des Betriebs |
| Einheitliche Bildbearbeitung pro Demo (gleiche Farbstimmung, leichte Körnung) und Kennzeichnung „Symbolbild“ am Bild | Fotorealistische KI-Bilder von „unseren Arbeiten“; Bilder mit Fehlern bei Händen, Schrift, Spiegelungen |
| Offiziell eingebettete Karte (besser OSM) mit sichtbarer Quellenangabe | Screenshots von Street View oder Google Maps; Street View im gedruckten Brief |
| Gesamtnote mit Anzahl, Quelle und Datum, nur wenn belegt und als Claim freigegeben, mit Link zum Profil | Abschnitt „Kundenstimmen“, Sterne-Widget, erfundene oder kopierte Zitate |
| Telefon antippbar oben und in fester Handy-Leiste, Öffnungszeiten neben der Nummer, Adresse mit Karten-Link | Formular als einziger Kontaktweg; Telefonnummer nur im Fußbereich |

### Prompt-Bausteine zum Einfügen

Der folgende Block zeigt die Reihenfolge, die Vercel und Anthropic empfehlen: erst Fakten, dann Nutzungssituation, dann feste Gestaltungsentscheidungen, dann Verbote, dann der Auftrag zur Abweichung. Die Werte in geschweiften Klammern kommen aus unseren Daten.

```text
1. FAKTEN (nur diese verwenden, nichts ergänzen):
   Name {name}, Gewerk {gewerk}, Straße {strasse}, Stadtteil {stadtteil},
   Telefon {telefon}, Öffnungszeiten {zeiten}, Leistungen laut Daten {leistungen},
   Bewertung {note} aus {anzahl} ({quelle}, Stand {datum}) – nur falls freigegeben.
   UNBEKANNT: {liste_fehlender_angaben}. Unbekanntes NICHT erfinden,
   sondern als gestalteten Platzhalter ausgeben.

2. NUTZUNGSSITUATION:
   a) Inhaber scannt den QR-Code aus einem Brief am Handy, hat ca. 30 Sekunden,
      muss seinen Betrieb sofort wiedererkennen und sehen, dass die Seite seriös ist.
   b) Endkunde hat ein Problem mit dem Auto, ist mobil, will anrufen oder die
      Adresse finden.

3. GESTALTUNG (fest, nicht ändern): Kit {kit_id} mit Schriftpaar, Farbrollen,
   Radius, Abständen und Bildstil aus der Kit-Datei. Wähle nur aus diesen
   Abschnittsvarianten: {erlaubte_varianten}. Keine zwei benachbarten Abschnitte
   mit gleichem Aufbau. Ein einziger Bewegungsmoment.

4. VERBOTEN: siehe Bannliste (Schriften, Verläufe, zentrierter Hero mit Etikett,
   drei gleiche Icon-Kästchen, Glas, Glow, Emoji, Zahlenleisten, Kundenstimmen,
   Floskeln, unbelegte Zahlen, Personenfotos als Team).

5. ZIEL: Triff Entscheidungen, die nur zu diesem Betrieb an diesem Ort passen.
   Jede Überschrift enthält ein konkretes Wort aus Gewerk oder Ort.
```

Nach der Erzeugung prüft ein Programm die Seite, bevor ein Mensch sie freigibt: verbotene Schriften und Farben, Glas- und Leuchteffekte, gleiche Kästchen, Floskeln aus der Sperrliste, Zahlen ohne Beleg, Kontrast, Lizenz und „Symbolbild“-Hinweis je Bild. Ab vier Treffern geht die Demo zurück.

## Fazit

Die neue Erkenntnis dieser Recherche ist, dass „echt“ bei Werkstätten und Handwerkern weniger eine Stilfrage ist als eine Frage der **Ehrlichkeit und Konkretheit**. Die gelobten Seiten sind oft fast langweilig gestaltet; sie überzeugen durch Telefonnummer, Ort, Spezialgebiet und echte Menschen. Weil wir die echten Menschen in der Demo nicht zeigen dürfen, ist der klügste Zug, die Lücke offen zu gestalten statt sie zu fälschen. Das passt zusammen: Der beschriftete Platz für das Teamfoto ist zugleich rechtlich sauber, wirkt nicht nach KI und zeigt dem Inhaber genau, was seine fertige Seite noch stärker macht. Die Demo verkauft damit nicht nur ein Design, sondern einen Plan.

Zwei Dinge bleiben offen und lassen sich nur mit eigenen Daten klären: ob ein Werkstattinhaber den KI-Look überhaupt bemerkt, und ob gestaltete Platzhalter besser verkaufen als Stimmungsbilder. Beides können wir über die vorhandene Messkette (Scan, Demo-Aufruf, Klick auf „Seite übernehmen“, Kauf) als Varianten testen, sobald genug Briefe draußen sind. Bis dahin ist die sicherste Wette die am besten belegte: schnelle, schlichte Handyseiten, die in einem Satz sagen, wer was wo anbietet, und die Telefonnummer nie versteckt.
