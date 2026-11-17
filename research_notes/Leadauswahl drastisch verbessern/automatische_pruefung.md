# Automatische Prüfung von Leads: existiert der Betrieb noch, fehlt eine eigene Website, ist die Anschrift zustellbar?

Stand der Recherche: 17.11.2026. Ziel ist ein automatisierbarer, legaler und nahezu kostenloser Werkzeugkasten.
Der Ausgangspunkt im Projekt: OSM-Daten plus `packages/core/src/leads/website-probe.ts`. Dieses Modul ruft die
E-Mail-Domain und höchstens `maxCandidates` .de-Domains ab, die aus dem Firmennamen abgeleitet werden. Ein Treffer
gilt als `found`, wenn Telefonnummer oder PLZ plus Straße auf der Seite stehen. Ein `none` „beweist NICHTS“, so der
Code-Kommentar selbst. Außerdem enthält `docs/compliance-google.md` bereits eine Prüfung der Google-Bedingungen
vom 22.10.2026.

## Frage 1: Hat der Betrieb wirklich keine eigene Website? (Domain-Heuristik, DNS/HTTP, Common Crawl, Such-APIs, Social-Links)

### Takeaway
Eine kostenlose, vollständig legale Websuche-API für den Massenbetrieb gibt es 2026 nicht mehr. Google CSE ist für
Neukunden geschlossen und endet am 01.01.2027. Brave verlangt 5 $ pro 1.000 Abfragen, rechnet aber 5 $ Guthaben pro
Monat gegen (rund 1.000 Abfragen) und erlaubt das Speichern der Ergebnisse nur im Custom-Plan. Am günstigsten ist
deshalb eine Kette aus eigenen Prüfungen: Overture-`websites`/`socials` als Offline-Abgleich, ein erweiterter
Domain-Generator mit DNS-Vorfilter, HTTP-Abruf mit Telefon- bzw. Adressabgleich, optional eine CDX-Abfrage bei
Common Crawl. Danach folgt eine einzige Brave-Abfrage pro Lead „Name + Ort“. Das LLM mit Websuche bleibt den
Top-Kandidaten kurz vor dem Druck vorbehalten.

### Cited Findings
**Such-APIs**
- Brave Search API, offizielle Seite: Plan „Search“ kostet 5 $ pro 1.000 Requests, 5 $ Freiguthaben jeden Monat werden automatisch verrechnet, Limit 50 Abfragen pro Sekunde. Plan „Answers“ kostet 4 $ pro 1.000 plus Tokens. Die Startseite spricht zusätzlich von „Up to $20 in free calls every month“, was der Planangabe widerspricht. — [Brave Search API](https://brave.com/search/api/)
- Brave-FAQ: Ergebnisse dürfen nur mit einem Custom-Plan gespeichert oder zum Training genutzt werden („search with storage rights“). Die Standardpläne bieten das nicht. — [Brave Search API](https://brave.com/search/api/)
- Das frühere Gratiskontingent von 2.000 Abfragen pro Monat wurde laut Sekundärquellen im Februar 2026 abgeschafft (Datum dort: 12.02.2026). Seitdem ist eine Kreditkarte nötig, und ein Kostendeckel fehlt. Einige ältere Seiten nennen noch die 2.000 Abfragen. — [agentdeals.dev](https://agentdeals.dev/vendor/brave-search-api); [scrapegraphai](https://scrapegraphai.com/blog/brave-search-api); veraltet: [apicostcalc](https://apicostcalc.com/brave-search.html)
- Google Custom Search JSON API: für Neukunden geschlossen, Abschaltung für Bestandskunden am 01.01.2027. Neue Projekte bekommen 403. Bestandskunden zahlen bis dahin 5 $ pro 1.000 nach 100 freien Abfragen am Tag (Maximum 10.000 am Tag). Google verweist auf Vertex AI Search (höchstens 50 Domains), was für eine Websuche ungeeignet ist. — [Apify-Blog](https://blog.apify.com/google-custom-search-api-alternative/); [Firecrawl](https://www.firecrawl.dev/blog/google-search-json-api-alternative); [Brave: Google API shutdown](https://brave.com/learn/google-api-shutdown/)
- Claude-Websuche (Anthropic API): 10 $ pro 1.000 Suchen zuzüglich Tokens. Die Suchergebnisse zählen als Input-Tokens. `max_uses`, `allowed_domains`/`blocked_domains` und `user_location` (country `DE`, city) sind einstellbar. Fehlgeschlagene Suchen werden nicht berechnet. Über die Batches API kostet die Suche gleich viel. Ab `web_search_20260209` filtert „dynamic filtering“ die Ergebnisse per Code und spart so Tokens. — [Claude Docs: Web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)

**Common Crawl**
- Laut Common Crawl ist der CDX-Index-Endpunkt „heavily rate limited“. Wer zu viele Anfragen schickt, riskiert eine vorübergehende IP-Sperre. Eine Zahl wird nicht veröffentlicht. Fehler kommen als CloudFront 403/4xx (Rate-Limit) oder 503. `cdx_toolkit` arbeitet bewusst seriell. Für Massenabfragen wird der Columnar-/Parquet-Index empfohlen, lokal mit DuckDB abfragbar. — [Common Crawl Status](https://status.commoncrawl.org/); [cdx_toolkit](https://github.com/commoncrawl/cdx_toolkit); [Common Crawl FAQ](https://commoncrawl.org/faq); [skeptric: Searching 100B pages](https://www.skeptric.com/searching-100b-pages-cdx)

**Offene Datensätze mit Website- und Social-Feldern**
- Das Place-Schema von Overture (v2.0.0) enthält `websites[]`, `socials[]`, `emails[]`, `phones[]`, `addresses[]`, `confidence` (0–1), `operating_status` und `sources[].update_time`. — [Overture Place schema](https://docs.overturemaps.org/schema/reference/places/place)

**Google Places**
- Places API (New): `websiteUri` und `nationalPhoneNumber` gehören zu „Place Details Enterprise“ bzw. „Text Search Enterprise“. — [Google Places data fields](https://developers.google.com/maps/documentation/places/web-service/data-fields)
- Freie Kontingente pro SKU und Monat: Essentials 10.000, Pro 5.000, Enterprise 1.000. — [Google pricing categories](https://developers.google.com/maps/billing-and-pricing/pricing-categories)
- Die EEA-Bedingungen von Google verbieten „copy and save business names, addresses“ außerhalb der Dienste (3.3.2 (a)). Speicherbar ist nur die `place_id`. Ein Websiteflag nur flüchtig als Entscheidungssignal zu nutzen, ist laut Projektprüfung ein Graubereich. — Projektdatei `docs/compliance-google.md` (zitiert [Google Maps Platform EEA Terms](https://cloud.google.com/terms/maps-platform/eea))

**Rechtsrahmen für Scraping**
- BGH, Urteil vom 30.04.2014, I ZR 224/12 („Flugvermittlung im Internet“): Screen Scraping öffentlich abrufbarer Daten ist nach UWG nicht schon deshalb unlauter, weil AGB es verbieten. Unlauter kann es erst werden, wenn technische Schutzmaßnahmen umgangen werden. Kommentatoren betonen, dass das Urteil „kein Freibrief“ ist und weder Datenschutz noch Datenbankrecht klärt. — [LTO](https://www.lto.de/recht/hintergruende/h/bgh-urteil-izr22412-screen-scraping-flugdaten-automatisiert-auslesen-ryanair-reiseportal); [Otto Schmidt](https://www.otto-schmidt.de/news/wirtschaftsrecht/zur-frage-der-zulassigkeit-des-sogenannten-screen-scraping-2014-04-30.html); [ra-plutte](https://www.ra-plutte.de/bgh-zum-automatisierten-auslesen-fremder-websites-via-screen-scraping/)
- § 87b UrhG: Es kommt darauf an, ob ein wesentlicher Teil einer Datenbank mit wesentlicher Investition entnommen wird. Auch wiederholte systematische Entnahme unwesentlicher Teile kann verletzen (§ 87b Abs. 1 S. 2). Laut LG Köln kann schon das systematische Durchsuchen fremder Verzeichnisse zum eigenen wirtschaftlichen Vorteil genügen. BGH „Automobil-Onlinebörse“ I ZR 159/10. — [Otto Schmidt IT-Blog](https://www.otto-schmidt.de/blog/it-recht-blog/sind-datenbanken-gegen-screen-scraping-geschutzt-ITBLOG0001400.html); [anwalt24 I ZR 159/10](https://www.anwalt24.de/urteile/bgh/2011-06-22/i-zr-159_10)

### Inferences
**Domain-Heuristik (Erweiterung von `website-probe.ts`, kostenlos)**
- Aus dem Namen sollte ein deutlich breiterer Kandidatensatz entstehen als bisher. Das Prüfen kostet fast nichts, weil ein DNS-Vorfilter vorgeschaltet ist.
  - Rechtsformen entfernen: GmbH, UG (haftungsbeschränkt), e.K., GbR, OHG, KG, & Co., Inh.
  - Füllwörter und Branchenwörter in zwei Varianten erzeugen: einmal behalten, einmal entfernen (Friseur, Salon, Bäckerei, Restaurant, Pizzeria, Kosmetik, Studio).
  - Umlaute dreifach umsetzen: ä→ae, ä→a, und als IDN-Punycode (xn--).
  - ß→ss.
  - Wortgrenzen als „zusammen“ und „mit Bindestrich“.
  - Mit und ohne Inhabernachnamen.
  - Stadtsuffixe: `-dortmund`, `dortmund` sowie Stadtteil.
  - TLDs: .de, .com, .eu, .info, .net, `.dortmund` (falls registriert) und `.ruhr`.
- Vorfilter per DNS: NS- oder A-Abfrage. NXDOMAIN bedeutet für .de nahezu sicher „nicht registriert“, weitere Prüfung entfällt. Erst bei registrierten Domains folgt ein HTTP-GET (ein Abruf, Timeout, Größenlimit).
- Parking- und Baukasten-Erkennung: Sedo, ParkingCrew, „Diese Domain kann gekauft werden“, IONOS/Strato-Platzhalter, „Coming soon“. Sonst entstehen Fehlalarme.
- Der Beweis bleibt der Telefon- oder Adressabgleich (bereits in `matchBusiness`). Ergänzend lohnt der Abgleich gegen das Impressum (`/impressum`), denn dort stehen nach § 5 DDG Anschrift und Telefon.
- Zusätzlich JSON-LD `LocalBusiness`/`telephone` parsen.
- Heuristisch ableitbar: Ein Betrieb mit eigener Website führt sie meist auf einem dieser Wege: E-Mail-Domain, Name.de, Name-Stadt.de. Die Trefferquote ist aber nicht belegt (siehe Gaps).

**Overture `websites`/`socials` als kostenloser Offline-Abgleich**
- Overture führt Websites aus Meta- und Microsoft-Quellen, die OSM oft fehlen. Ein Abgleich nach Koordinate (unter 50 m) und Namensähnlichkeit kann also bisher unentdeckte Websites aufdecken, ganz ohne API-Kosten.
- Ein Link in `socials`, aber keiner in `websites`, stützt das Segment `social_only`.
- Ein Instagram- oder Facebook-Link ist kein Ausschlussgrund. Gleichzeitig darf ein Linktree mit eigener Domain nicht als „keine Website“ zählen.
- Link-in-bio-Seiten (linktr.ee, beacons) sind öffentliche Webseiten. Sie lassen sich per einfachem HTTP-GET prüfen, ohne Login und ohne Instagram-Scraping.
- Instagram- und Facebook-Profile selbst sollten nicht automatisiert abgerufen werden. Login-Wall und Meta-AGB sprechen dagegen, und es droht eine technische Schutzumgehung im Sinne von BGH I ZR 224/12.

**Common Crawl**
- Ein CDX-Lookup `url=*.kandidat.de&output=json` zeigt, ob eine Kandidaten-Domain je gecrawlt wurde. Das bestätigt, dass dort eine echte Website existierte, und liefert ein Datum.
- Für einige hundert Leads pro Woche reicht seriell eine Anfrage alle paar Sekunden mit Backoff.
- Eine Suche nach Firmennamen erlaubt der Index nicht, nur URL- bzw. Domain-Lookups. Für die Frage „welche Domain gehört zum Namen?“ hilft Common Crawl daher nur zusammen mit dem Domain-Generator.

**Such-API mit Budget**
- Die 5 $ Brave-Guthaben pro Monat reichen für rund 1.000 Leads mit je einer Abfrage `"Firmenname" Dortmund` (bzw. Straße oder Telefonnummer).
- Ausgewertet werden nur die URLs der Top-10. Kommt eine Domain vor, die nicht auf der Liste bekannter Verzeichnisse steht, folgt ein eigener HTTP-Abgleich auf Telefon oder Adresse.
- Gespeichert wird nur das Ergebnis-Flag (`website_found` + eigene URL), nicht das Suchergebnis. Das entspricht den Speicherbeschränkungen von Brave.
- Kreditkarte und fehlender Kostendeckel sprechen für einen eigenen Zähler im `budget_ledger`.

**SearXNG und Mojeek**
- Ein selbst gehostetes SearXNG fragt Google, Bing usw. im Hintergrund ab. Damit verstößt es gegen deren AGB und automatisiert an fremden Schutzmaßnahmen vorbei (CAPTCHAs, Rate-Limits). Laut BGH I ZR 224/12 kann gerade die Umgehung technischer Schutzmaßnahmen das Unlautere ausmachen.
- Für einen Betrieb, der rechtssicher arbeiten will, ist SearXNG deshalb nicht empfehlenswert. Das ist eine Inferenz, kein Urteil zu SearXNG.

**Verzeichnisse (Gelbe Seiten, Das Örtliche, 11880)**
- Massenhaft automatisiert abgerufen, berührt das § 87b UrhG (systematische Entnahme) und die AGB.
- Einzelne manuelle Prüfungen sind unkritisch, automatisierte Massenabfragen sollte man meiden.

### Gaps
- Keine Quelle mit Trefferquoten für Domain-Raten bei deutschen Kleinbetrieben, also welcher Anteil der Websites über Name.de, Name-Stadt.de usw. auffindbar ist. Empfehlung: an den eigenen bereits manuell geprüften Leads messen.
- DENIC-Whois: Keine aktuelle Primärquelle zu Abfragelimits eingesehen. DENIC zeigt seit der DSGVO keine Inhaberdaten mehr. Der DNS-Vorfilter macht Whois für „registriert ja/nein“ ohnehin überflüssig. Nicht verifiziert.
- Mojeek-API: Preise und Bedingungen wurden nicht abgerufen.
- Overture-Lizenz für Places nicht auf der Schemaseite angegeben. Bitte auf docs.overturemaps.org (Attribution/License) prüfen. Häufig genannt wird CDLA-Permissive-2.0, das ist aber nicht verifiziert.
- Common Crawl „host index“: Ob ein separater Host-Index für Lookups existiert, wurde nicht bestätigt.
- Ob der „Graubereich“ der flüchtigen Google-Places-Nutzung (nur Flag, nur `place_id` speichern) tragfähig ist, bleibt eine Rechtsfrage. Die Projektdatei empfiehlt eine Anwaltsprüfung.

## Frage 2: Existiert der Betrieb noch und arbeitet er unter dieser Anschrift?

### Takeaway
Kostenlose offene Datensätze wie Overture `operating_status`/`confidence`, Foursquare OS Places `date_closed`/
`date_refreshed` und OSM-Historie liefern Plausibilitätssignale, sind aber lückenhaft und teils veraltet. Das
stärkste kostenlose Signal ist die Mehrquellen-Bestätigung: Derselbe Name an derselben Anschrift taucht in mehreren
unabhängigen, kürzlich aktualisierten Quellen auf. Google `businessStatus` ist präzise, gehört aber zu einer
Pro-SKU (5.000 frei pro Monat) und ist nach den EEA-Bedingungen rechtlich heikel.

### Cited Findings
- Overture `operating_status`: `open`, `temporarily_closed`, `permanently_closed`. Bei `permanently_closed` ist `confidence` = 0. `confidence` 0 bedeutet laut Schema „existiert nicht mehr“. — [Overture Place schema](https://docs.overturemaps.org/schema/reference/places/place)
- Overture-Release vom September 2025: Das Feld wurde anfangs überall auf `open` gesetzt, echte Statusdaten sollten später folgen. Eine Präsentation vom Overture-Gipfel im April 2026 nennt Open/Closed-Signale über einen Datenpartner für H2/2026. — [Overture Release Notes 09/2025](https://docs.overturemaps.org/blog/2025/09/24/release-notes/); [Overture Summit 2026 Places PDF](https://hosted-files.sched.co/overturesummit2026/39/Places%20Surge%20Headliner.pdf)
- Foursquare OS Places (Apache 2.0):
  - `date_refreshed` = letzte Aktualisierung irgendeiner einzelnen Referenz.
  - `date_closed` = Datum der Markierung als geschlossen in der Datenbank, nicht das tatsächliche Schließdatum.
  - Der Standardfilter von Foursquare lautet `date_closed IS NULL AND date_refreshed` innerhalb der letzten 365 Tage. — [Foursquare OS Places Schema](https://docs.foursquare.com/data-products/docs/places-os-data-schema)
- Nutzerberichte im OSM-Forum: Seit Jahren geschlossene POIs tragen ein `date_refreshed` aus 2024, und geschlossene POIs ohne Schließflag sind häufig (anekdotisch, Niederlande). — [OSM Community](https://community.openstreetmap.org/t/foursquare-releases-100m-poi-dataset-under-apache-2-0/121883)
- Foursquare OS Places wird inzwischen über das Places Portal (Iceberg) bzw. Hugging Face (gated) verteilt, nicht mehr über einen öffentlichen S3-Bucket. — [Access FSQ OS Places](https://docs.foursquare.com/data-products/docs/access-fsq-os-places); [Hugging Face](https://huggingface.co/datasets/foursquare/fsq-os-places)
- Google Places API (New): `businessStatus` gehört zu „Place Details Pro“ bzw. „Text Search Pro“. Pro-SKUs haben 5.000 freie Requests pro Monat und SKU. Abgerechnet wird nach dem teuersten Feld in der FieldMask. — [Google data fields](https://developers.google.com/maps/documentation/places/web-service/data-fields); [Google pricing categories](https://developers.google.com/maps/billing-and-pricing/pricing-categories); [Google Places billing](https://developers.google.com/maps/documentation/places/web-service/preview-billing)
- Laut Sekundärquelle gibt es bei Google Cloud keinen harten Kostendeckel, Budget-Alerts warnen nur. — [openplacesapi.com](https://openplacesapi.com/blog/google-places-api-pricing)
- Nach den EEA-Bedingungen von Google ist das Speichern von Namen und Adressen außerhalb der Dienste untersagt, nur die `place_id` ist cachebar. — Projektdatei `docs/compliance-google.md` ([EEA Terms](https://cloud.google.com/terms/maps-platform/eea))

### Inferences
**Mehrquellen-Score (kostenlos)**
- +1 für jede unabhängige Quelle, die Name und Anschrift bestätigt:
  - OSM mit `check_date` bzw. letzter Änderung unter 24 Monaten
  - Overture `confidence` ≥ 0,7, `operating_status` ≠ closed und `sources.update_time` unter 12 Monaten
  - FSQ `date_closed` NULL und `date_refreshed` unter 12 Monaten
- −∞ (hart aussortieren) bei `permanently_closed` oder `date_closed`.
- Einzelquellen-Leads (nur OSM, alter Stand) gehen nicht in den Versand, sondern zur LLM- oder manuellen Prüfung.
- Overture und FSQ lassen sich als Parquet einmal pro Monat mit DuckDB für Dortmund (Bounding Box) herunterladen, ohne API-Kosten.

**OSM-Historie**
- Das OSM-Tag `check_date`, die Versionsnummer und der Zeitstempel der letzten Änderung (über die Overpass-Metadaten `out meta`) zeigen, wie frisch ein Eintrag ist.
- Tags `disused:shop`/`was:shop` oder OSM-Notes in der Nähe sind Warnsignale.
- OSM-Notes lassen sich über die OSM-API pro Bounding Box abrufen. Rate-Limits beachten (nicht recherchiert).

**Telefonnummer als Lebenszeichen**
- Erscheint dieselbe Telefonnummer auf der Kandidaten-Website oder in Overture/FSQ mit aktueller Quelle, bestätigt das die Existenz.
- Anrufe sind laut Vorgabe ausgeschlossen. Ein automatisiertes Absuchen von Telefonverzeichnissen berührt § 87b UrhG und sollte daher unterbleiben.

**Google `businessStatus`**
- Technisch das beste Einzelsignal und bei bis zu 5.000 Leads pro Monat kostenlos. Ob die flüchtige Nutzung als Entscheidungssignal mit „No Creating Content From Google Maps Content“ vereinbar ist, ist ungeklärt.
- Rechtssicherer Weg nach der Projektlogik: nur nach anwaltlicher Prüfung, nur `place_id` speichern, Statusflag nicht persistieren oder nur als Ja/Nein-Ergebnis der eigenen Entscheidung.

**LLM-Websuche als letzte Stufe**
- Gezielte Fragen: „Gibt es Hinweise auf Schließung, Umzug oder Inhaberwechsel seit 2025?“ und „Gibt es eine eigene Website?“, mit `max_uses` 3–4 und `user_location` DE/Dortmund.

### Gaps
- Keine deutschlandbezogenen Zahlen zur Abdeckung oder Aktualität von Overture- und FSQ-Places für kleine Betriebe gefunden. Empfehlung: eigene Messung, nämlich Abgleich mit den bisherigen Rückläufern (Rücksendecode 10).
- Ob die Overture-Statusdaten für Deutschland bereits befüllt sind (H2/2026 angekündigt), war nicht verifizierbar. Im aktuellen Release mit `count(*) group by operating_status where country='DE'` prüfen.
- Ob das Handelsregister bzw. Unternehmensregister bei Löschungen als kostenloses Signal taugt, wurde hier nicht recherchiert. Das Projekt verlangt dafür vorab eine Compliance-Prüfung (`docs/compliance-handelsregister.md`).
- Bewertungsdaten außerhalb von Google (z. B. aktuelle Reviews) als Lebenszeichen: Keine legale Gratis-API gefunden bzw. nicht recherchiert.

## Frage 3: Ist die Postanschrift zustellbar? (OpenPLZ, Nominatim, Deutsche Post, Rücksendecodes, easyNova)

### Takeaway
Kostenlos prüfbar ist nur die formale Konsistenz von Straße, PLZ und Ort (OpenPLZ) sowie die Existenz der
Hausnummer über OSM-Adresspunkte (eigene Overpass-Abfrage oder selbst gehostetes Nominatim). Ob die Firma unter der
Anschrift tatsächlich zu ermitteln ist (Grund für den Code 10), kann keine Adressprüfung beantworten. Das leistet
nur der Existenz-Check aus Frage 2. Premiumadress ist über easyNova kontofähig. Damit kommen Unzustellbarkeitsgründe
elektronisch zurück, in der Variante Basis/Report kostenfrei. Das schließt die Lernschleife automatisch.

### Cited Findings
**OpenPLZ**
- Endpunkt: `openplzapi.org/de/Streets?name=&postalCode=&locality=` (kombinierbar, Regex-fähig, paginiert) sowie `FullTextSearch?searchTerm=`. Antwortfelder: name, postalcode, locality, borough, suburb, municipality, district, federalState. Keine Hausnummern. — [OpenPLZ API Deutschland](https://www.openplzapi.org/de/germany/)
- Laut Sekundärquellen kostenlos und ohne API-Key. Enthalten sind nur postalisch relevante Straßen. Eine Drittquelle nennt ein Soft-Limit von etwa 10 Anfragen pro Sekunde und empfiehlt für Massenverarbeitung Self-Hosting (Open Source). — [public-api.org](https://public-api.org/de/api/1637/openplz-api); [anythingmcp](https://anythingmcp.com/de/guides/connect-openplz-to-claude)

**Nominatim**
- Öffentlicher Server: höchstens 1 Anfrage pro Sekunde pro Anwendung. Bulk-Jobs werden nicht gern gesehen. Wiederkehrende oder länger als einen Tag laufende Skripte sind auf 4 Anfragen pro Minute begrenzt.
- Pflicht sind ein eigener User-Agent oder Referer und Caching. Für größere Mengen wird eine eigene Instanz empfohlen. — [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)

**Deutsche Post: Rücksendecodes (Adressmerkmale bei Premiumadress)**

| Code | Bedeutung |
|---|---|
| 10 | Empfänger/Firma unter der Anschrift nicht zu ermitteln |
| 11 | Annahme verweigert |
| 12 | verstorben |
| 13 | nicht abgeholt |
| 14 | nicht zu ermitteln, durch Datenbank bestätigt |
| 18 | sonstige Unzustellbarkeit, z. B. Briefkasten nicht zugänglich |
| 19 | zugestellt, Rückgabe über Briefkasten |
| 20 | verzogen |
| 21/22/25 | verzogen ohne Einwilligung zur Weitergabe bzw. neue Anschrift nicht bestellt |
| 50/53 | Anschriftenrecherche beauftragt |
| 51 | neue Adresse aus Recherche |
| 55 | keine neue Adresse |

  — [Premiumadress Online-Service FAQ](https://www.deutschepost.de/de/p/premiumadress/online-services-faq.html)
- Bei Brief mit Premiumadress Basis oder Report sind Unzustellbarkeitsinformationen, Verstorbeneninformationen und Anschriftenkorrekturen kostenfrei. Datenbankbestätigung (14/53) und Anschriftenrecherche (50/53) kosten extra und erfordern eine Zusatzvereinbarung. — [Premiumadress Online-Service FAQ](https://www.deutschepost.de/de/p/premiumadress/online-services-faq.html)
- Die Anschriftenrecherche kostet laut Infoblatt 5,50 € zzgl. USt je neu ermittelter Anschrift. — [Premiumadress Anschriftenrecherche (PDF)](https://www.deutschepost.de/dam/jcr:5b93ea8a-2377-404c-8073-a190f4a28d95/dp-premiumadress-anschriftenrecherche-05-2023.pdf)
- Premiumadress-Preisliste 10/2024: Unzustellbarkeitsinformation 0,33 €. In der Variante „Report“ ist sie laut FAQ kostenfrei, die unzustellbaren Sendungen werden dann aber vernichtet. — [Preise 10/2024](https://deutschepost.de/dam/jcr:cffc5342-35a7-4534-94ac-a68168d439b0/dp-premiumadress-preise-de-102024.pdf), zitiert in der Projektrecherche `research_notes/easyNova Seriosität prüfen/delivery_verification.md`
- Ohne Premiumadress kommen Rückläufer physisch mit Aufkleber oder handschriftlichem Rücksendegrund zurück. — [bezahlen.net](https://www.bezahlen.net/ratgeber/deutsche-post-status-sendung-nicht-zugestellt-werden/); [Deutsche Post Zustellung](https://www.deutschepost.de/de/hilfe-kundenservice/themenseiten/empfangen/zustellung.html)

**easyNova**
- Die OpenAPI V1 (digiBrief) kennt das Feld `premiumAdress` im `LetterStatus`. Laut API-Beschreibung ist Premiumadress „ein Produkt der Deutschen Post: zu unzustellbaren Sendungen erhalten Sie eine elektronische Rückmeldung“. Es muss für das Konto freigeschaltet sein (`GET /api/account` → `premiumAdress.variants`, z. B. „Report“). — [easyNova OpenAPI swagger.json](https://digibrief-api.easynova.de/swagger/v1/swagger.json), zitiert in `research_notes/easyNova Seriosität prüfen/delivery_verification.md`
- Die Websuche fand keine eigene easyNova-Adressprüfung oder Adresskorrektur vor dem Versand. — eigene Suche ohne Treffer (siehe Gaps)

### Inferences
**Kostenlose Zustellbarkeitsprüfung vor dem Druck**
1. OpenPLZ: Gibt es Straße X mit PLZ Y in Ort Z? Treffer nein → Schreibweise normalisieren (Str./Straße, ß/ss, Bindestriche) → erneut. Weiterhin nein → aussortieren. Am besten OpenPLZ selbst hosten oder pro Straße cachen.
2. Hausnummer: Overpass-Abfrage `addr:street`+`addr:housenumber`+`addr:postcode` im Umkreis von 30 m um die POI-Koordinate. Fehlt sie oder liegt die Koordinate weit weg (mehr als 150 m), gilt das als Warnsignal. Nominatim öffentlich nur mit 1 Anfrage pro Sekunde bzw. 4 pro Minute bei Daueraufträgen, daher besser die Overpass-Abfrage, die die Pipeline ohnehin nutzt, oder ein eigenes Nominatim.
3. Hinterhaus und Gewerbehof: Fehlen Namens- oder Firmenschild-Hinweise, hilft keine API. Die Zeile „An das Team von {Firma}“ bleibt Pflicht.

**Code 10 ist ein Existenz-, kein Adressproblem**
- Code 10 entsteht typischerweise, wenn der Betrieb weg ist oder kein Firmenschild bzw. Briefkastenschild hat. Die Gegenmaßnahme sind die Signale aus Frage 2, keine PLZ-Prüfung.

**Premiumadress Report über easyNova aktivieren**
- Jeder Code fließt automatisch zurück: Code 10/14 → Lead `failed` plus Sperre, Code 20 → verzogen. Daraus lässt sich der Existenz-Score kalibrieren, also welche Quellenkombination Rückläufer vorhersagt.
- Kosten: 0 € für Unzustellbarkeitsinfos in Basis/Report. Nachteil bei Report: Sendungen werden vernichtet. Für Werbebriefe ist das unkritisch und erspart sogar die manuelle Erfassung.
- Vor Aktivierung prüfen, ob easyNova einen Aufpreis verlangt (siehe Gaps).

**Deutsche Post DATAFACTORY/ADDRESSFACTORY**
- Kostenpflichtig, Preise in dieser Recherche nicht abgerufen. Bei rund 40–200 Briefen pro Monat übersteigen die Kosten vermutlich den Nutzen gegenüber Premiumadress plus Existenz-Score.

### Gaps
- Keine Primärquelle gefunden, ob easyNova Premiumadress für Teilleistungs- bzw. Konsolidierungsbriefe ohne Aufpreis freischaltet und welche Variante (Basis/Report/Retoure). Beim easyNova-Support anfragen.
- Preise von ADDRESSFACTORY/DATAFACTORY und dem Post-Dienst „Adress-Check“ (Postadress) nicht abgerufen.
- Datenquelle und Aktualität von OpenPLZ (Herkunft der Straßenverzeichnisse) nicht verifiziert. Die Seite verweist auf eine separate Datenquellen-Seite.
- Offizielle Nutzungsbedingungen bzw. Rate-Limits von OpenPLZ nicht auf der Primärseite gefunden (Soft-Limit von etwa 10 pro Sekunde nur aus Drittquelle).

## Frage 4: Kosten pro Lead (LLM-Websuche vs. Heuristik) und empfohlene Reihenfolge

### Takeaway
Ein Brief kostet rund 1 €. Ein Rückläufer oder ein Brief an einen Betrieb mit Website ist also ein voller Verlust.
Die Gebühr für die Claude-Websuche liegt bei 1 US-Cent pro Suche (3–4 Suchen ≈ 3–4 ct pro Lead plus Tokens), Brave
bei 0,5 ct pro Abfrage (praktisch 0 € bis etwa 1.000 im Monat). DNS, HTTP, OpenPLZ, Overture und FSQ kosten nur
Rechenzeit. Wirtschaftlich ist daher: alle Gratischecks zuerst, Brave als Zwischenstufe, LLM nur für die Leads, die
tatsächlich gedruckt werden sollen.

### Cited Findings
- Claude-Websuche: 10 $ pro 1.000 Suchen zuzüglich Token-Kosten. Die Suchergebnisse werden als Input-Tokens berechnet, auch in Folgeturns. Fehlgeschlagene Suchen sind gratis. Dynamic Filtering senkt den Tokenverbrauch. — [Claude Docs: Web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- Brave: 5 $ pro 1.000 bei 5 $ Monatsguthaben. — [Brave Search API](https://brave.com/search/api/)
- Google Pro-SKU (`businessStatus`): 5.000 frei pro Monat, Enterprise (`websiteUri`, Telefon) 1.000 frei pro Monat. — [Google pricing categories](https://developers.google.com/maps/billing-and-pricing/pricing-categories)
- Premiumadress-Unzustellbarkeitsinfo: 0 € bei Basis/Report, sonst 0,33 €. — [Premiumadress FAQ](https://www.deutschepost.de/de/p/premiumadress/online-services-faq.html); Preisliste über `delivery_verification.md`

### Inferences
**Empfohlene Pipeline, sortiert nach Kosten, harte Ausschlüsse so früh wie möglich:**

0. **Sperrliste, Ketten, 12-Monate-Regel** (bestehend, 0 €).
1. **OpenPLZ-Konsistenz plus OSM-Hausnummer** (0 €, Millisekunden). Inkonsistent → aussortieren.
2. **Offline-Abgleich Overture und FSQ OS Places** (monatlicher DuckDB-Export Dortmund, 0 €).
   - `permanently_closed`/`date_closed` → aussortieren.
   - `websites` vorhanden → per HTTP prüfen; bestätigt → aussortieren.
   - `socials` → Segment `social_only`.
   - Existenz-Score aus der Zahl frischer Quellen.
3. **Erweiterte Domain-Heuristik mit DNS-Vorfilter**, danach HTTP-GET plus Impressum- und Telefon-/Adress-Abgleich (0 €, etwa 30–80 DNS-Abfragen, wenige HTTP-Abrufe pro Lead). `found` → aussortieren. `possible` → Stufe 5.
4. **Optional Common Crawl CDX** nur für registrierte, aber nicht erreichbare oder geparkte Kandidaten-Domains (0 €, seriell, mit Backoff).
5. **Brave Search, eine Abfrage pro verbleibendem Lead** (`"Name" Ort` bzw. `"Telefonnummer"`). Nicht-Verzeichnis-URLs per eigenem HTTP-Abgleich prüfen. Etwa 0,5 ct, durch das Guthaben bis rund 1.000 pro Monat 0 €. Nur das Flag speichern.
6. **LLM-Websuche (Claude, `max_uses` 3, `user_location` DE)** nur für Leads, die nach Score und Segment wirklich in die nächste Charge sollen, sowie für Einzelquellen-Leads. Grob 3 ct Suchgebühr plus Tokens pro Lead. Bei 40 Briefen pro Woche sind das rund 1,20 $ Suchgebühr pro Woche plus Tokens.
7. **Versand mit Premiumadress Report** (sofern bei easyNova ohne Aufpreis). Rücklaufcodes automatisch in Lead-Status und Score-Kalibrierung übernehmen. Code 10/14 → Sperre. Code 20 → keine Recherche (5,50 € lohnen sich nicht).

**Break-even**
- Die LLM-Stufe lohnt sich, sobald sie bei mehr als etwa 5 % der geprüften Leads einen Fehlversand verhindert. Dann sind die ersparten 1 € Briefkosten mal 5 % größer als rund 5 ct Kosten pro Lead.
- Das ist eine Überschlagsrechnung mit angenommenen Tokenkosten, keine gemessene Zahl.

**Messung einbauen**
- Für jeden Lead protokollieren, welche Stufe ihn ausgeschlossen hat, und Rückläufer-Codes zurückspielen. Nach 1–2 Chargen zeigt sich, welche Stufen Wirkung haben und ob Stufe 6 eingespart werden kann.

### Gaps
- Token-Preise für das im Projekt genutzte `MODEL_BULK=claude-haiku-5-5` wurden nicht abgerufen. Die tatsächlichen Kosten pro LLM-Prüfung (Suchgebühr plus Input-Tokens der Suchergebnisse) daher aus dem eigenen `budget_ledger` messen.
- Keine belastbaren Zahlen zur Rückläuferquote bei Werbebriefen an lokale Kleinbetriebe aus OSM-Daten gefunden. Eigene Messung über Premiumadress-Codes nötig.
