# Datenquellen für Leads (Ersatz/Ergänzung zu OpenStreetMap), Stand 17.11.2026

Kontext: Ein-Personen-Betrieb, 0-€-Budget, Werbebriefe an kleine Handwerks-/Dienstleistungsbetriebe und neue Beauty-Studios in Deutschland. Heute: OSM-Geofabrik-Extrakt auf VPS (Node/Postgres). Probleme: geringe Abdeckung kleiner Gewerke, veraltete/geschlossene Einträge, fehlender `website`-Tag beweist nichts.

Hinweis zur Methode: Webrecherche mit begrenzter Tool-Anzahl (ca. 20 Abrufe). Mehrere Primärseiten (Google-ToS-Volltext, handelsregister.de-Nutzungsordnung, jobsuche.api.bund.dev) ließen sich nicht vollständig abrufen; dort wurden Sekundärquellen bzw. die im Repo bereits dokumentierte Prüfung (`docs/compliance-google.md`, Stand 22.10.2026, mit wörtlichen Zitaten aus den EEA-Terms) verwendet. Keine Rechtsberatung.

## 1. Overture Maps „places“: Abdeckung, Felder, Lizenz, Zugriff

### Takeaway
Overture ist die stärkste kostenlose Ergänzung: ca. 88 Mio. Orte weltweit (Okt. 2026), monatliche Releases, Felder `websites`, `socials`, `phones`, `emails`, `addresses`, `confidence` (Existenzwahrscheinlichkeit), `operating_status` und `sources` mit `update_time`; Lizenz CDLA-Permissive-2.0 bzw. Apache-2.0, ohne OSM/ODbL-Anteil. Länderteilmengen lassen sich per DuckDB direkt aus S3/Azure-GeoParquet mit bbox-Filter ziehen. Deutschland-spezifische Qualitätszahlen fehlen.

### Cited Findings
- Felder im Places-Theme: `id` (GERS), `names`, `brand`, `websites`, `socials`, `phones`, `emails`, `addresses`, `geometry`, `taxonomy` (`primary`, `hierarchy`, `alternates`), `basic_category`, `confidence`, `sources`, `operating_status`. Das alte Feld `categories` wurde im September-2026-Release entfernt. — [Overture Places Guide](https://docs.overturemaps.org/guides/places/)
- `confidence` (0–1) bewertet nur, ob der Ort existiert; 0 = existiert sicher nicht und ist immer mit `operating_status = "permanently_closed"` gekoppelt; fehlt der Wert, gibt es zu wenig Information. — [Overture Schema: place](https://docs.overturemaps.org/schema/reference/places/place/)
- `sources[]` enthält je Quelle `record_id`, `update_time` (z. B. `2025-06-30T07:00:00+00:00`) und `confidence`. Damit ist eine Aktualitätsprüfung je Quelle möglich. — [Overture Schema: place](https://docs.overturemaps.org/schema/reference/places/place/)
- `operating_status` wurde am 24.09.2025 eingeführt mit den Werten `open`, `permanently_closed`, `temporarily_closed`; im ersten Release standen alle Werte auf `open`, echte Schließungsdaten sollten später folgen. — [Overture Release Notes 2025-09-24](https://docs.overturemaps.org/blog/2025/09/24/release-notes/); Werte bestätigt in [Google Earth Engine Katalog](https://developers.google.com/earth-engine/datasets/catalog/overture-maps_places_place?authuser=5)
- Release 2026-08-19: „1.64M more places are now flagged with an 'open' status“ – Zahlen zu geschlossenen Orten wurden nicht gefunden. — [Overture Release Notes 2026-08-19](https://docs.overturemaps.org/blog/2026/08/19/release-notes/)
- Lizenz: CDLA-Permissive-2.0 und Apache-2.0 je nach Quelle; das Theme enthält keine OSM-/ODbL-Daten. Warnung: Wer CDLA-Daten mit OSM verknüpft, kann eine abgeleitete Datenbank erzeugen, die ODbL tragen muss. — [Overture Places Guide](https://docs.overturemaps.org/guides/places/)
- Quellen: Meta ca. 60,3 Mio. von ca. 88 Mio. Datensätzen, BrightQuery ca. 15,8 Mio., außerdem Microsoft, Foursquare, PinMeTo, AllThePlaces (CC0), Uberall, DAC, Krick, Birdeye, RenderSEO, OpenTravel. — [Overture Places Guide](https://docs.overturemaps.org/guides/places/)
- Größte Oberkategorien: „Services and Business“ 23,7 Mio., „Shopping“ 15,3 Mio., „Food and Drink“ 11,0 Mio. — [Overture Places Guide](https://docs.overturemaps.org/guides/places/)
- Zugriff: monatliche Releases mit datierten Pfaden, z. B. `s3://overturemaps-us-west-2/release/2026-10-21.0/theme=places/type=place/*` bzw. Azure `https://overturemapswestus2.blob.core.windows.net/release/2026-10-21.0/theme=places/type=place/*`; Download per Python-CLI `overturemaps download --bbox … --type=place -f geojson` oder DuckDB mit bbox-Filter; aktuelles Release über den STAC-Katalog. — [Overture Places Guide](https://docs.overturemaps.org/guides/places/)
- Globaler Restaurant-Vergleich (nicht Deutschland): Overture 3,58 Mio. vs. OSM 2,08 Mio. Restaurants; in einer Stichprobe von je 100 wurden 72 OSM-, aber nur 60 Overture-Einträge in Google Maps bestätigt; mit Filter auf hohe Confidence (ca. > 0,71) kehrte sich das zugunsten von Overture um. — [Community-Analyse OSM vs. Overture](https://community.openstreetmap.org/t/a-global-comparison-of-restaurants-in-openstreetmap-and-overture-places/120475)

### Inferences
- Für den Anwendungsfall eignet sich ein Filter wie `confidence >= 0.7 AND operating_status = 'open' AND websites IS NULL AND addresses[1].country = 'DE'` plus jüngstes `sources[].update_time` als Frische-Signal. „Keine Website“ bleibt dabei unbewiesen; der Datensatz kann aber das Ausschlusskriterium verbessern, weil Meta-Seiten oft ein Website-Feld tragen.
- Ein Meta-Datensatz mit nur `socials` (Facebook-Seite) ist ein direktes Signal für das Segment `social_only`.
- Die Teilmenge Deutschland lässt sich auf einem kleinen VPS mit DuckDB (`httpfs`/`spatial`) per bbox ziehen; nur die betroffenen Parquet-Row-Groups werden geladen. Für Dortmund reicht eine kleine bbox.
- Wenn Overture- und OSM-Daten in derselben Tabelle verknüpft gespeichert werden, sollte die ODbL-Frage (Share-Alike bei abgeleiteter Datenbank) dokumentiert werden. Sicherer ist es, Overture-Daten nur zur Prüfung und Bewertung von OSM-Leads zu nutzen, oder Leads getrennt nach Quelle zu speichern.
- Lizenzrechtlich ist das Speichern und Verwenden für Briefe nach CDLA-Permissive/Apache unproblematisch (Attribution). Die DSGVO-Prüfung (Art. 6 Abs. 1 lit. f, Art. 14) für Einzelunternehmer bleibt davon unberührt.

### Gaps
- Keine belastbare Zahl zur Abdeckung Deutschlands oder zu kleinen Gewerken (Dachdecker, GaLaBau usw.) in Overture gefunden.
- Unklar, wie viele deutsche Orte tatsächlich `permanently_closed` oder `temporarily_closed` tragen und woher die Schließungsdaten kommen.
- Genaue Dateigröße der Places-Partition nicht ermittelt (nur „ein Volldownload ist sehr groß“).
- Die genauen Lizenzbedingungen je Quelle (Attributionsseite) wurden nicht einzeln geprüft.

## 2. Foursquare Open Source Places (FSQ OS Places)

### Takeaway
Apache-2.0-Datensatz mit ca. 109,5 Mio. POI (Okt. 2026), monatlich, mit den für Frische entscheidenden Feldern `date_refreshed`, `date_closed`, `unresolved_flags` (u. a. `closed`, `doesnt_exist`) sowie `website`, `tel`, `email`, `facebook_id`, `instagram`. Seit Okt. 2025 Zugriff über ein Iceberg-Katalog mit Token (Places Portal, kostenloses Konto) oder über Hugging Face (Gated, Zustimmung nötig, 263 GB gesamt).

### Cited Findings
- Kontaktfelder: `website` („URL to the POI's (or the chain's) publicly available website“), `tel`, `email`, `facebook_id`, `instagram`, `twitter`. — [FSQ OS Places Schema](https://docs.foursquare.com/data-products/docs/places-os-data-schema)
- Datumsfelder: `date_created` (Eintritt in die Datenbank, nicht Eröffnung), `date_refreshed` („last had any single reference refreshed from crawl, users or human validation“), `date_closed` (als geschlossen markiert, nicht zwingend Schließdatum). — [FSQ OS Places Schema](https://docs.foursquare.com/data-products/docs/places-os-data-schema)
- `unresolved_flags`: `closed`, `duplicate`, `delete`, `privatevenue`, `inappropriate`, `doesnt_exist` (seit Juni 2025). — [FSQ OS Places Schema](https://docs.foursquare.com/data-products/docs/places-os-data-schema); [Release Notes](https://docs.foursquare.com/data-products/docs/fsq-os-places-release-notes)
- Adressfelder: `address`, `locality`, `region`, `postcode`, `country` (ISO-2). — [FSQ OS Places Schema](https://docs.foursquare.com/data-products/docs/places-os-data-schema)
- Gesamtzahl POI: 104,6 Mio. (Jan. 2025) bis 109,5 Mio. (Okt. 2026); Releases etwa monatlich. — [Release Notes](https://docs.foursquare.com/data-products/docs/fsq-os-places-release-notes)
- Deutschland: Region-Normalisierung für 214.315 POI (Jun. 2025); Geocode-Fehler im Pilot von 14 m auf 9 m (Nov. 2025); Overture-Import auf Deutschland ausgeweitet (Apr. 2026: 17.809 neue POI in DE); neue POI in DE: 4.115 (Mai 2026), 73.360 (Jul. 2026), 17.253 (Aug. 2026). — [Release Notes](https://docs.foursquare.com/data-products/docs/fsq-os-places-release-notes)
- Schließungsmodell: Ausweitung auf mehrere europäische Länder im Aug. 2025; Metrik seither „Total Removed“; 59.064 Schließungen (Mär. 2026), 63.906 (Apr. 2026), weltweit. — [Release Notes](https://docs.foursquare.com/data-products/docs/fsq-os-places-release-notes)
- Seit Aug. 2025 gibt es je Release eine Delta-Datei (added/updated/removed/merged), anzuwenden in der Reihenfolge add, update, merge, remove. — [Release Notes](https://docs.foursquare.com/data-products/docs/fsq-os-places-release-notes)
- Okt. 2025: öffentlicher S3-Bucket abgelöst durch Iceberg-Katalog im Places Portal; monatliche Releases weiterhin auf Snowflake und Hugging Face. — [Release Notes](https://docs.foursquare.com/data-products/docs/fsq-os-places-release-notes)
- Places Portal: Konto anlegen, Access Token erzeugen; Verbindungsbeispiele für DuckDB, Spark, PyIceberg. — [FSQ Access-Doku](https://docs.foursquare.com/data-products/docs/access-fsq-os-places)
- Hugging Face: Gated („You need to agree to share your Hugging Face information“), Apache 2.0, Pfad `release/dt=2026-10-15/places/parquet`, Gesamtgröße 263 GB. — [Hugging Face Dataset](https://huggingface.co/datasets/foursquare/fsq-os-places)
- `veracity_rating` (1–5) gibt es nur im kostenpflichtigen Premium-Datensatz (seit Jul. 2025). — [Release Notes](https://docs.foursquare.com/data-products/docs/fsq-os-places-release-notes)

### Inferences
- FSQ liefert das beste kostenlose Frische-Signal: Leads mit `date_closed IS NULL`, leerem `unresolved_flags`, `date_refreshed` in den letzten 12–18 Monaten und `website IS NULL` sind brauchbare Kandidaten. Das passt direkt zum Problem „Firma nicht zu ermitteln“.
- Für einen kleinen VPS reicht es, nur die Spalten und die Zeilen mit `country='DE'` per DuckDB/Iceberg (Token) oder per `hf://`-Parquet zu lesen; die 263 GB sind die Gesamtgröße aller Dateien, nicht die zu ladende Menge.
- Foursquare ist auch eine Quelle in Overture; ein Abgleich beider kann Dubletten verursachen, aber auch Bestätigung liefern (gleicher Ort in zwei unabhängigen Quellen = höhere Existenzsicherheit).
- `website` kann laut Schema auch die Ketten-Website sein, daher den Kettenfilter weiter anwenden.

### Gaps
- Keine Zahl zur Gesamtabdeckung Deutschlands oder zur Abdeckung von Handwerksbetrieben gefunden.
- Nicht geprüft, ob die Zugriffsbedingungen (Portal-Konto, Hugging-Face-Gate) zusätzliche Nutzungsbeschränkungen über Apache 2.0 hinaus enthalten.
- Unklar, ob DuckDB den `hf://`-Pfad dieses Datensatzes direkt lesen kann (die Seite zeigt nur ein Spark-Beispiel).

## 3. Handelsregister / Unternehmensregister / OffeneRegister / North Data

### Takeaway
Das Handelsregister ist seit 01.08.2022 kostenlos, aber die Nutzungsordnung verbietet mehr als 60 Abrufe pro Stunde und systematische Abrufe zum Aufbau paralleler Register; eine offizielle API gibt es nicht. Ein automatisierter „Neueintragungen“-Feed ist daher nicht legal und kostenlos zu bauen. OffeneRegister.de ist ein Stand von Ende 2018/Anfang 2019 und für frische Leads unbrauchbar; North Data ist kostenpflichtig (Start-up-Paket 500 €/Monat).

### Cited Findings
- Seit 01.08.2022 sind alle Registerinhalte (Handels-, Genossenschafts-, Partnerschafts-, Vereinsregister) samt Dokumenten kostenlos und ohne Anmeldung über handelsregister.de abrufbar. — [WBS Legal](https://www.wbs.legal/handelsrecht-gesellschaftsrecht/seit-dem-1-8-2022-das-handelsregister-ist-in-deutschland-jetzt-gratis-61548/)
- Mit dem DiRUG gibt es keine gesonderten Registerbekanntmachungen mehr; eine Eintragung gilt als bekannt gemacht, sobald sie erstmals im Registerportal abrufbar ist. — [IHK Frankfurt](https://www.frankfurt-main.ihk.de/recht/recht-und-steuern-aktuell/aenderungen-bei-handelsregisterbekanntmachungen-5638514); [IHK Bonn](https://ihk-bonn.de/handelsregister)
- Nutzungsordnung (zitiert in Sekundärquellen): „Es ist unzulässig, mehr als 60 Suchen oder Aufrufe von Rechtsträgern pro Stunde im Registerportal vorzunehmen.“ und „Systematische Abrufe, um parallele Voll- oder Teilregister aufzubauen, auszubauen oder zu aktualisieren, sind unzulässig.“ — [bundesAPI/handelsregister (GitHub)](https://github.com/bundesAPI/handelsregister); [Implisense Blog](https://implisense.com/de/ueber-uns/blog/handelsregister-api)
- Die Nutzungsordnung beruht auf § 9 Abs. 1 Satz 2 HGB und erlaubt Beschränkungen wie Abrufbegrenzungen. — [Bundesrat-Drucksache 208/23](https://dserver.bundestag.de/brd/2023/0208-23.pdf)
- Weder handelsregister.de noch unternehmensregister.de bieten eine offizielle Programmierschnittstelle; laut Anbieter werden IP-Sperren verhängt (Anbieterangabe, nicht unabhängig belegt). — [companydata.com](https://companydata.com/handelsregister-api/)
- IHK-Hinweis: Über handelsregister.de sind auch personenbezogene Daten einsehbar. — [IHK Nürnberg](https://www.ihk-nuernberg.de/wim-wirtschaft-in-mittelfranken/ihk-magazin-wim-122022/details/sensible-daten-oeffentlich)
- OffeneRegister.de (OKF Deutschland + OpenCorporates, Feb. 2019): Datenstand bis Ende 2018. — [OpenSanctions](https://www.opensanctions.org/datasets/de_offeneregister); [netzpolitik.org](https://netzpolitik.org/2019/das-handelsregister-endlich-offene-daten/)
- Laut netzpolitik.org (2019) untersagt der Betreiber der Register-Website (Justizministerium NRW) die Weiterverwendung der Daten; eine CC-BY-Lizenz wurde nicht bestätigt. — [netzpolitik.org](https://netzpolitik.org/2019/das-handelsregister-endlich-offene-daten/)
- North Data: AGB für kostenpflichtige Produkte (Premium, Widget API, Data API, Quartalsexporte), nur gewerbliche Kunden, nicht exklusive Lizenz für die Vertragsdauer; Mindestlaufzeit 12 Monate (Quartalsexport) bzw. 6 Monate (APIs); Start-up-Paket „Data + Widget API komplett € 500,- pro Monat“, 1.000 Abrufe/Monat. — [North Data AGB](https://northdata.de/_agb); [North Data Datenprodukte](https://northdata.de/_data)

### Inferences
- Für die Zielgruppe ist das Handelsregister ohnehin schwach: viele Handwerker und Beauty-Studios sind nicht eingetragene Einzelunternehmer (Kleingewerbe); eingetragen sind nur Kaufleute (e.K.), GmbH/UG usw. Das Register hat außerdem keine Branchenkategorie, nur den Unternehmensgegenstand als Freitext.
- Erlaubt bleibt die manuelle, gezielte Einzelabfrage, z. B. um bei einem vorhandenen Lead zu prüfen, ob die Firma noch existiert oder gelöscht ist (deutlich unter 60 Abrufe/Stunde, kein Parallelregister). Das hilft gegen „Firma nicht zu ermitteln“ bei eingetragenen Firmen.
- Ein automatisierter täglicher Scan der Neueintragungen widerspricht dem Verbot systematischer Abrufe und scheidet aus. Das passt zur bestehenden Projektregel „Handelsregister nur nach Compliance-Prüfung“ (`docs/compliance-handelsregister.md`).
- North Data liegt mit 500 €/Monat weit über dem 0-€-Budget.

### Gaps
- Der Wortlaut der aktuellen Nutzungsordnung wurde nicht direkt auf handelsregister.de abgerufen (Seite gab 404); die Zitate stammen aus Sekundärquellen.
- Nicht geprüft, ob die Gewerbeanmeldungen der Kommunen (Gewerberegister, § 14 GewO) eine legale Quelle für Neugründungen sind (Auskunft an Dritte nur unter Bedingungen); nicht untersucht.
- North-Data-Bedingungen zur Weiterverwendung exportierter Daten für Werbebriefe nicht geklärt.

## 4. Handwerkskammer-Betriebssuche / Handwerksrolle

### Takeaway
Kammern veröffentlichen Teile der Handwerksrolle in Online-Betriebsdatenbanken, und das Eintragungsformular der HWK Dortmund weist auf Weitergabe von Listendaten an nicht-öffentliche Stellen hin. Konkrete Nutzungsbedingungen der Online-Suche wurden nicht gefunden. Die Online-Suche automatisiert auszulesen ist wegen § 87b UrhG (systematisches Entnehmen) riskant; eine offizielle Listenanfrage bei der Kammer wäre der saubere Weg.

### Cited Findings
- Antrag auf Eintragung der HWK Dortmund: Daten aus der Handwerksrolle bzw. dem Verzeichnis zulassungsfreier und handwerksähnlicher Betriebe können „teilweise in der Betriebsdatenbank der Handwerkskammer gespeichert und im Internet eingestellt werden“; der Antrag erwähnt auch die Weitergabe von Listendaten an nicht-öffentliche Stellen (Text im Suchergebnis unvollständig). — [HWK Dortmund, Antrag auf Eintragung (PDF)](https://hwk-do.de/wp-content/uploads/2023/06/Antrag-auf-Eintragung_01082021.pdf)
- Kontakt Handwerksrolle HWK Dortmund: Tel. 0231 5493-0, Handwerksrolle@hwk-do.de. — [HWK Dortmund (Suchergebnis)](https://hwk-do.de/wp-content/uploads/2023/06/Antrag-auf-Eintragung_01082021.pdf)
- § 87b Abs. 1 S. 2 UrhG verbietet auch das wiederholte und systematische Entnehmen unwesentlicher Teile einer Datenbank, wenn es einer normalen Auswertung zuwiderläuft; BGH I ZR 196/08 („Zweite Zahnarztmeinung II“). — [BGH, Urteil vom 01.12.2010, I ZR 196/08](https://rewis.io/urteile/urteil/vse-01-12-2010-i-zr-19608/); [§ 87b UrhG](https://lxgesetze.de/urhg/87b)

### Inferences
- § 6 HwO erlaubt nach allgemeiner Kenntnis die Übermittlung von Handwerksrolle-Daten an nicht-öffentliche Stellen bei berechtigtem Interesse (u. a. Widerspruchsrecht der Betriebe); das wurde hier nicht mit Quelle geprüft. Eine schriftliche Anfrage bei der HWK Dortmund nach einer Liste der zulassungspflichtigen/zulassungsfreien Betriebe einzelner Gewerke (Dachdecker, SHK, Tischler, Gebäudereiniger) wäre die rechtlich sauberste, wahrscheinlich gebührenpflichtige Quelle. Die Handwerksrolle enthält aber keine Angabe zur Website.
- Die Handwerksrolle wäre die vollständigste Quelle für die Gewerke Dachdecker, SHK, Tischler; GaLaBau ist meist kein Handwerk (Landwirtschaftskammer/IHK), Entrümpelung ebenfalls nicht.

### Gaps
- Nicht gefunden: Nutzungsbedingungen einer Online-Betriebssuche der HWK Dortmund oder anderer Kammern; Existenz einer öffentlichen Suche je Kammer nicht verifiziert.
- Wortlaut und Bedingungen von § 6 HwO (Datenübermittlung an Dritte, Widerspruch, Gebühren) nicht mit Quelle geprüft.

## 5. Bundesagentur für Arbeit – Jobbörse (jobsuche.api.bund.dev)

### Takeaway
Es gibt eine inoffiziell dokumentierte, öffentlich nutzbare REST-Schnittstelle der Jobbörse (Header `X-API-Key: jobboerse-jobsuche`) mit Suche nach Beruf, Ort, Umkreis und Veröffentlichungsdatum. Laut bundesAPI hat die BA „bis heute keine offizielle API“; Nutzungsbedingungen und Rate-Limits sind nicht dokumentiert. Für Werbebriefe ist sie rechtlich unklar und nur als Signal (Betrieb existiert und stellt ein) geeignet.

### Cited Findings
- Basis-URL `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service`; Suche `/pc/v4/jobs` (auch `/pc/v6/jobs`), Details `/pc/v4/jobdetails/{Base64(refnr)}`; Auth-Header `X-API-Key: jobboerse-jobsuche`. — [bundesAPI/jobsuche-api](https://github.com/bundesAPI/jobsuche-api)
- Parameter: `was`, `wo`, `umkreis`, `berufsfeld`, `arbeitgeber`, `veroeffentlichtseit` (0–100 Tage), `angebotsart`, `befristung`, `arbeitszeit`, `zeitarbeit`, `page`, `size`. — [bundesAPI/jobsuche-api](https://github.com/bundesAPI/jobsuche-api)
- Die BA hat „bis heute keine offizielle API“; Nutzungsbedingungen und Rate-Limits sind in der Doku nicht beschrieben. — [bundesAPI/jobsuche-api](https://github.com/bundesAPI/jobsuche-api)

### Inferences
- Eine Stellenanzeige eines kleinen Handwerksbetriebs belegt, dass er aktuell existiert (Frische-Signal, gut gegen geschlossene Betriebe), sagt aber nichts über eine Website (Stellenanzeigen verlinken oft eine Firmenseite – das wäre dann ein Ausschlusssignal).
- Die Kontaktdaten wurden für Bewerbungen veröffentlicht, nicht für Werbung. Sie als Adressquelle für Werbebriefe zu nutzen, ist eine Zweckänderung mit zusätzlichem DSGVO- und Datenbankrecht-Risiko. Empfehlung: nur zum Abgleich vorhandener Leads, nicht als Primärquelle.

### Gaps
- Welche Felder die Suchantwort zu Arbeitgeber und Arbeitsort (Straße, PLZ, Ort) genau liefert, war in der Doku nicht dokumentiert.
- Keine Nutzungsbedingungen der BA für maschinellen Zugriff gefunden.

## 6. Google Places API (New): Preise, Felder, Nutzungsbedingungen

### Takeaway
Seit 2025 gibt es statt 200-$-Guthaben Freikontingente je SKU (z. B. 10.000 Place Details Essentials, 5.000 Pro, 1.000 Enterprise pro Monat). Die Bedingungen verbieten jedoch ausdrücklich, Firmennamen und Adressen zu kopieren und zu speichern („copy and save business names, addresses, or user reviews“); dauerhaft speicherbar ist nur die `place_id`. Als Adressquelle für Briefe ist Google damit ausgeschlossen. Das Repo hat das bereits so umgesetzt.

### Cited Findings
- Freikontingente/Monat und Preis je 1.000 (0–100k): Place Details Essentials 10.000 / 5,00 $; Place Details Pro 5.000 / 17,00 $; Text Search Pro 5.000 / 32,00 $; Nearby Search Pro 5.000 / 32,00 $; Text Search Enterprise 1.000 / 35,00 $; Place Details Enterprise 1.000 / 20,00 $; Text Search Essentials (IDs Only) und Place Details Essentials (IDs Only) unbegrenzt kostenlos. — [Google Maps Platform Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- Für Rechnungskonten im EWR gelten seit 08.07.2025 die „Google Maps Platform EEA Terms of Service“. Abschnitt 3.3.2 (a) „No Scraping“: „Customer will not export, extract, or otherwise scrape Google Maps Content for use outside the Services. For example, Customer will not: (i) pre-fetch, index, store, reshare, or rehost Google Maps Content outside of the Services; (ii) bulk download Google Maps Content; or (iii) copy and save business names, addresses, or user reviews.“ Gleiches in den globalen Terms 3.2.3 (a)(iii). — [Google Maps Platform EEA Terms](https://cloud.google.com/terms/maps-platform/eea), zitiert und geprüft in `docs/compliance-google.md` (Stand 22.10.2026)
- EEA Service Specific Terms Abschnitt 3 „Google ID Caching“: „Customer may cache (a) place_id from Places API …“ – sonst keine Speichererlaubnis für Namen, Adressen, Bewertungen, Telefonnummern. — [Google Maps Platform EEA Terms](https://cloud.google.com/terms/maps-platform/eea), zitiert in `docs/compliance-google.md`
- Sekundärquelle: „No Scraping“ untersagt Export/Extraktion von Google-Maps-Inhalten zur Nutzung außerhalb der Dienste inkl. Bulk-Downloads. — [Conduct Atlas](https://conductatlas.com/platform/google-maps/google-maps-platform-terms-of-service/no-scraping-or-content-extraction/)

### Inferences
- Zulässig erscheint höchstens die Nutzung als flüchtiges Prüfsignal (z. B. `businessStatus`, `websiteUri` eines bereits aus anderer Quelle bekannten Leads) mit Speicherung nur der `place_id`; selbst das ist ein Graubereich (Abschnitt 3.3.2 (c) „No Creating Content From Google Maps Content“) und laut Repo-Dokumentation nur nach rechtlicher Prüfung freizuschalten.
- Kostenmäßig wären ca. 1.000–5.000 Prüfungen im Monat im Freikontingent möglich; welche SKU `businessStatus`, `websiteUri`, `userRatingCount` liefert, wurde hier nicht verifiziert (allgemeines Wissen: `businessStatus` Essentials/Pro, `websiteUri` und `userRatingCount` Enterprise – unbestätigt).

### Gaps
- Zuordnung der Felder zu SKUs nicht aus der Primärquelle bestätigt (Preisseite enthielt sie nicht).
- Die aktuelle Fassung der EEA-Terms wurde in dieser Recherche nicht neu abgerufen (Volltext ließ sich nicht laden); verwendet wurde die Repo-Prüfung vom 22.10.2026.

## 7. Weitere Quellen: Gelbe Seiten / Das Örtliche, Yelp, Wikidata, Apple/Bing

### Takeaway
Für Branchenverzeichnisse wurde kein spezielles Urteil gefunden, aber § 87b UrhG und BGH-Rechtsprechung verbieten auch systematisches Entnehmen kleiner Teile; automatisiertes Auslesen von Gelbe Seiten/Das Örtliche ist daher riskant. Yelp, Wikidata, Apple und Bing wurden aus Zeitgründen nicht geprüft.

### Cited Findings
- BGH I ZR 196/08: Auch wiederholtes, systematisches Entnehmen unwesentlicher Teile kann nach § 87b Abs. 1 S. 2 UrhG verboten sein. — [BGH, Urteil vom 01.12.2010](https://rewis.io/urteile/urteil/vse-01-12-2010-i-zr-19608/)
- Allgemeine Übersicht Datenbankschutz §§ 87a ff. UrhG. — [IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/schutz-von-Datenbanken.html)
- Branchenübersicht: Overture ca. 72 Mio.+ (Jan. 2026) und FSQ OS Places 106 Mio.+ (Dez. 2025); Volumen bedeutet nicht Vollständigkeit oder Aktualität. — [GSDSI POI-Anbietervergleich 2026](https://www.gsdsi.com/resources/poi-data-provider-comparison-what-to-look-for-in-2026) (Anbieter-Blog; Overture-Zahl weicht von der offiziellen Angabe ca. 88 Mio. im Okt. 2026 ab, wohl wegen anderem Stichtag)

### Inferences
- Gelbe Seiten/Das Örtliche taugen höchstens zur manuellen Einzelprüfung („gibt es den Betrieb noch?“), nicht als automatisierte Quelle.
- Empfohlene Reihenfolge für das Projekt: (1) OSM wie bisher, (2) Abgleich mit Overture und FSQ OS Places nach Name und Koordinate: Lead nur, wenn mindestens eine Quelle ihn in den letzten ca. 12 Monaten bestätigt und keine eine Website oder Schließung meldet, (3) Overture/FSQ als zusätzliche Leadquelle für Orte, die in OSM fehlen (Kategorien `roofing`, `plumbing`, `landscaping`, `carpenter`, `cleaning`, `beauty_salon` usw.), (4) vor dem Versand eine kurze automatische Website-Suche/Domain-Prüfung und bei eingetragenen Firmen eine manuelle Handelsregister-Einzelprüfung.

### Gaps
- Yelp Fusion (Deutschland-Abdeckung, ToS), Wikidata, Apple Maps Server API und Bing/Azure Maps wurden nicht untersucht.
- Aktuelle AGB von Gelbe Seiten und Das Örtliche zur Datennutzung nicht abgerufen.
- DSGVO-Einordnung (Art. 6 Abs. 1 lit. f, Art. 14 für Einzelunternehmer als natürliche Personen) wurde nicht je Quelle recherchiert; die Lizenz einer Quelle ersetzt nicht die DSGVO-Rechtsgrundlage und die Informationspflicht nach Art. 14 (inkl. Nennung der Quelle).
