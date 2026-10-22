# Compliance-Prüfung: Google Places API und OpenStreetMap

Stand der Prüfung: **22.10.2026**. Geprüft wurden die zu diesem Datum online abrufbaren Fassungen.
Dies ist eine technische Einordnung, **keine Rechtsberatung**. Vor dem ersten echten Versand bitte von
einer Anwältin/einem Anwalt (IT-/Wettbewerbsrecht) bestätigen lassen.

## 1. Welche Bedingungen gelten?

Die Google Maps Platform Terms of Service legen fest: Liegt die Rechnungsadresse des Google-Cloud-
Rechnungskontos im Europäischen Wirtschaftsraum, gelten seit dem **8. Juli 2025** die
**Google Maps Platform EEA Terms of Service** und die **EEA Service Specific Terms**
(<https://cloud.google.com/terms/maps-platform/eea>). Für ein deutsches Einzelunternehmen sind das die
maßgeblichen Bedingungen. Die globalen Bedingungen enthalten an den relevanten Stellen dieselben Regeln.

## 2. Was die Bedingungen zu unserem Anwendungsfall sagen

### 2.1 Speichern von Firmennamen und Adressen – **unzulässig**

EEA Terms of Service, Abschnitt **3.3.2 (a) „No Scraping“** (wörtlich):

> „Customer will not export, extract, or otherwise scrape Google Maps Content for use outside the
> Services. For example, Customer will not: (i) pre-fetch, index, store, reshare, or rehost Google Maps
> Content outside of the Services; (ii) bulk download Google Maps Content; or **(iii) copy and save
> business names, addresses, or user reviews.**“

Abschnitt **3.3.2 (b) „No Caching“**: Caching nur, soweit die Service Specific Terms es ausdrücklich
erlauben.

Die globalen Bedingungen enthalten dieselbe Regel in Abschnitt 3.2.3 (a) (iii).

**Folge für die Brief-Pipeline:** Firmenname und Postanschrift aus der Places API zu speichern und
damit Werbebriefe zu drucken, ist nach diesen Bedingungen nicht erlaubt. Das betrifft auch das
Weitergeben der Anschrift an den Druckdienstleister (Export „outside the Services“).

### 2.2 Was gespeichert werden darf

EEA Service Specific Terms, Abschnitt **3 „Google ID Caching“**:

> „Customer may cache the Google ID values from the Services that return such field and allow caching,
> in accordance with its Documentation. For example, Customer may cache (a) place_id from Places API …“

→ Dauerhaft speicherbar ist **nur die `place_id`**. Für die Places API sehen die EEA-Bedingungen keine
weitere befristete Speichererlaubnis für Namen, Adressen, Bewertungen oder Telefonnummern vor.

### 2.3 Bewertungen im gedruckten Brief – **unzulässig**

Bewertungen sind Google-Maps-Inhalte. Sie in einen gedruckten Brief zu übernehmen, ist ein Export
außerhalb der Dienste (3.3.2 (a)), ohne die bei Anzeige vorgeschriebene Google-Attribution, und setzt
voraus, dass die Zahl gespeichert wird (unzulässig, siehe 2.1).
→ **`USE_RATING_IN_LETTER` bleibt `false`.** Das System speichert Google-Bewertungen grundsätzlich
nicht, sodass die Zeile auch bei versehentlichem Einschalten nicht gedruckt werden kann.

### 2.4 Bewertungen als reines Entscheidungssignal – **Graubereich**

Eine Bewertung flüchtig abzufragen, nur um zu entscheiden, ob ein Betrieb angeschrieben wird, und dann
lediglich die `place_id` zu speichern, wird von den Bedingungen nicht ausdrücklich erlaubt oder
verboten. Dagegen sprechen könnten 3.3.2 (a) („use outside the Services“) und 3.3.2 (c) („No Creating
Content From Google Maps Content“). **Empfehlung: nur nach rechtlicher Prüfung nutzen.**

## 3. Umsetzung im System

| Modus (`Einstellungen → Lead-Quelle`) | Quelle für Name/Anschrift | Google-Nutzung | Standard |
|---|---|---|---|
| `osm` | OpenStreetMap (Overpass API) | keine | **ja** |
| `osm_google_signal` | OpenStreetMap | Bewertung/Website flüchtig als Signal, gespeichert wird nur `place_id` | aus – nur mit dokumentierter rechtlicher Prüfung (`googleSignalAcknowledgement`) |
| `google_text_search` | Google Places Text Search | Primärquelle | gesperrt – nur mit Nachweis einer Genehmigung durch Google (`googleTextSearchApproval`) |

Technisch abgesichert:

- Der Lead-Finder verweigert die Google-Modi ohne die jeweilige Freigabe (`LeadSourceConfigError`).
- Selbst in den Google-Modi werden **Bewertung, Bewertungsanzahl und Website-URL aus Google nicht in
  der Datenbank gespeichert** (`leads.rating`, `leads.rating_count`, `leads.website_uri` bleiben leer).
  Gespeichert werden nur `google_place_id` und der Prüfzeitpunkt.
- Die Feldmaske ist minimal (Kosten), siehe `docs/integrations.md`.
- Kosten jeder Places-Anfrage werden im Budget-Ledger gebucht; ein eigenes Wochenbudget
  (`weeklyPlacesBudgetCents`) stoppt Anfragen.

### Folge für die Qualifizierung

Im Standardmodus `osm` gibt es **keine Bewertungsdaten**. Die Filter „≥ 4,5 Sterne“ und „≥ 30
Bewertungen“ werden deshalb nur angewendet, wenn eine zulässige Bewertungsquelle aktiv ist. Ersatzweise
fließt die Vollständigkeit des Eintrags (Telefon, Öffnungszeiten, Social-Media-Präsenz) in den Score ein.
Wer nur Betriebe mit Bewertungsdaten anschreiben will, setzt `filters.requireRatingSignal = true`.

Alternativen mit sauberer Lizenz für Werbezwecke: Adressmiete bei lizenzierten B2B-Adressanbietern
(z. B. Firmenadressen „für Direktmarketing lizenziert“). Diese können als weitere `LeadSource`
angebunden werden.

## 4. OpenStreetMap (Quelle B, Standard)

- **Lizenz:** Open Database License (ODbL) 1.0 – Nutzung (auch kommerziell) erlaubt, mit
  Namensnennung „© OpenStreetMap-Mitwirkende“ und Hinweis auf die ODbL
  (<https://www.openstreetmap.org/copyright>).
- **Attribution im System:** Der Brief nennt im Datenschutzhinweis (Art. 14 DSGVO) die Quelle
  „öffentlich zugängliche Firmeneinträge (u. a. OpenStreetMap, © OpenStreetMap-Mitwirkende, ODbL)“.
  Die Demo-Seiten zeigen keine Kartenkacheln; der Anfahrtslink führt auf openstreetmap.org.
- **Share-Alike:** Gilt nur bei *öffentlicher* Nutzung einer abgeleiteten Datenbank. Die interne
  Lead-Datenbank wird nicht veröffentlicht.
- **Fair Use der öffentlichen Overpass-Instanz:** ca. 10 000 Anfragen/Tag und < 1 GB/Tag
  (<https://dev.overpass-api.de/overpass-doc/en/preface/commons.html>). Ein Lauf für Dortmund braucht
  ca. 8 Anfragen (4 Branchen + Adress-Anreicherung). Weitere Instanzen können in `OVERPASS_URL`
  kommasepariert als Fallback eingetragen werden.
- **Datenqualität:** Viele Einträge haben die Anschrift am Gebäude statt am Geschäft. Das System
  ergänzt fehlende Teile ausschließlich aus dem **umschließenden Gebäude mit Adresse** und dem
  **amtlichen PLZ-Gebiet** (`boundary=postal_code`) – es wird nichts geschätzt. Unvollständige
  Anschriften führen zur Ablehnung (`incomplete_address`).

## 5. Datenschutz (DSGVO) bei der Lead-Suche

- Firmendaten von Einzelunternehmen können personenbezogen sein. Rechtsgrundlage für die einmalige
  Kontaktaufnahme per Brief: berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO). Adressierte
  Briefwerbung an Gewerbetreibende ist ohne vorherige Einwilligung grundsätzlich zulässig, solange
  nicht erkennbar ist, dass sie nicht gewünscht wird (§ 7 Abs. 1 Satz 2 UWG) – daher Sperrliste und
  sofortiger Widerspruch per QR-Code oder E-Mail.
- Pflichtinformation nach Art. 14 DSGVO und Widerspruchshinweis nach Art. 21 DSGVO stehen in jedem Brief.
- Sperrliste speichert nur SHA-256-Hashes (Name+Anschrift, Anschrift, Quell-ID).

## 6. Entscheidung

- `USE_RATING_IN_LETTER = false` (bewusst gesetzt, siehe 2.3).
- Lead-Quelle: `osm` (Standard). Google-Modi bleiben aus, bis eine schriftliche Prüfung/Genehmigung
  vorliegt und in den Einstellungen dokumentiert ist.

## Quellen

- Google Maps Platform Terms of Service: <https://cloud.google.com/maps-platform/terms>
- Google Maps Platform EEA Terms of Service: <https://cloud.google.com/terms/maps-platform/eea>
- EEA Service Specific Terms: <https://cloud.google.com/terms/maps-platform/eea/maps-service-terms>
- Places API Text Search (New): <https://developers.google.com/maps/documentation/places/web-service/text-search>
- Preise: <https://developers.google.com/maps/billing-and-pricing/pricing>
- OSM-Copyright und Lizenz: <https://www.openstreetmap.org/copyright>
- Overpass-Nutzungshinweise: <https://dev.overpass-api.de/overpass-doc/en/preface/commons.html>
