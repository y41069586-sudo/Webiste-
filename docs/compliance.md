# Compliance-Regeln

Verbindliche Regeln für Lead-Suche, Briefe, Demos und Daten. Technische Einordnung, **keine
Rechtsberatung** – vor dem ersten echten Versand von einer Anwältin/einem Anwalt (IT-/Wettbewerbsrecht)
bestätigen lassen. Details zur Google-Prüfung: [compliance-google.md](compliance-google.md).

Stand der Prüfung: **23.10.2026**.

## 1. Google Places API

### 1.1 Was die aktuellen Bedingungen sagen (EEA, weil Rechnungsadresse in Deutschland)

Geprüft: Google Maps Platform **EEA Service Specific Terms** (letzte Änderung 10.06.2026,
<https://cloud.google.com/terms/maps-platform/eea/maps-service-terms>) und **Places API EEA Permitted
Uses** (letzte Änderung 04.06.2025,
<https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses>).

- **Abschnitt 3 (Google ID Caching):** Die `place_id` darf gespeichert werden – dauerhaft.
- **Abschnitt 15.4 (Caching):** Befristet (bis 30 Tage) speichern dürfen wir **nur Breiten- und
  Längengrad**. Für Bewertungen, Bewertungsanzahl, Namen oder Adressen gibt es **keine**
  Speichererlaubnis, auch nicht für 30 Tage.
- **Abschnitt 15.2 (Permitted Use):** Außer Koordinaten und `place_id` dürfen Places-Inhalte **nur** für
  die neun „Permitted Uses“ genutzt werden, z. B. Adress-Autovervollständigung, eigene Filialen
  anzeigen, Kunden/Verkaufschancen eines Vertriebsteams visualisieren, Orte in Notizen/Spielen/Social
  Posts. **Das Filtern von Leads für Werbebriefe ist nicht aufgeführt.**
- **EEA Terms of Service 3.3.2 (a) (iii):** Firmennamen, Adressen und Nutzerbewertungen dürfen nicht
  kopiert und gespeichert werden.

### 1.2 Folge für den „Google-Signal-Modus“

Dein Wunsch („nur zum Filtern nach Bewertung und Anzahl, nichts länger als 30 Tage, nur `place_id`
dauerhaft“) ist technisch vollständig umgesetzt. Nach dem Wortlaut der aktuellen EEA-Bedingungen ist
aber schon die **Nutzung** der Bewertung zum Filtern von Werbe-Leads nicht von den Permitted Uses
gedeckt – unabhängig davon, wie kurz wir speichern. Risiko: Sperrung des Google-Cloud-Kontos, ggf.
Unterlassungsansprüche.

**Deshalb:** Der Modus ist fertig, aber **standardmäßig aus**. Er lässt sich nur einschalten, wenn in
den Einstellungen eine Bestätigung der rechtlichen Prüfung eingetragen ist
(`leadSource.googleSignalAcknowledgement`, mit Name und Datum). Ohne diese Bestätigung verweigert der
Lead-Finder den Modus.

### 1.3 Regeln, die das System erzwingt (wenn der Modus eingeschaltet wird)

| Regel                                           | Umsetzung                                                                                                                                                                                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google nur zum Filtern (Bewertung, Anzahl)      | Name und Anschrift kommen immer aus OpenStreetMap; Google wird nur für bereits OSM-qualifizierte Kandidaten abgefragt                                                                                                                   |
| Dauerhaft nur `place_id`                        | `leads.rating`, `leads.rating_count`, `leads.website_uri` bleiben bei Google-Daten leer; gespeichert werden `google_place_id` und `google_checked_at`                                                                                   |
| Nichts länger als 30 Tage                       | Rohwerte werden gar nicht gespeichert. Abgeleitete Werte (Segment, Score) werden spätestens nach 30 Tagen beim wöchentlichen Lauf neu berechnet; der Lösch-Job setzt `google_checked_at` nach `timing.placesCacheDays` (max. 30) zurück |
| Keine Google-Bewertungstexte in Demo oder Brief | Bewertungstexte werden nie abgefragt (Feldmaske ohne `reviews`)                                                                                                                                                                         |
| Bewertungszeile im Brief                        | `USE_RATING_IN_LETTER` bleibt aus; Google-Bewertungen können technisch nicht gedruckt werden                                                                                                                                            |
| Höchstens Link „Bewertungen auf Google“         | Nur auf der Demo, nur aus der `place_id` gebaut (`https://www.google.com/maps/place/?q=place_id:…`), kein Inhalt von Google                                                                                                             |
| Kosten                                          | Jede Anfrage wird im Budget-Ledger gebucht; eigenes Wochenbudget `budget.weeklyPlacesBudgetCents`; Not-Aus stoppt Anfragen                                                                                                              |

### 1.4 Folge für die Segmente

Ohne Bewertungsquelle gibt es nur „social_only“ und „etabliert“. Das Segment „neu“ (3–20 Bewertungen)
und die Filter „Rating ≥ 4,5 / ≥ 30 Bewertungen“ greifen erst mit einer zulässigen Bewertungsquelle.
Saubere Alternativen: lizenzierte B2B-Adressdaten „für Direktmarketing“ oder eine schriftliche
Genehmigung von Google.

## 2. Werbung und Inhalte

- **§ 7 UWG:** nur adressierte Briefe; keine Kalt-E-Mails, Anrufe, SMS oder WhatsApp-Nachrichten.
  E-Mails nur an Adressen, die uns der Betrieb selbst gegeben hat (Demo-Formular, Checkout, eigene
  Mail). Höchstens eine Erinnerungs-Mail mit Abmeldelink.
- **§ 5 UWG:** keine unbelegten Zahlen oder Wirkungsversprechen. Zahlen nur aus freigegebenen Claims
  der Bibliothek (Baustein L1), mit Fußnote und Quellenseite; US-Daten nie als deutsche Daten. Der
  Wahrheits-Check (Baustein L2) blockiert Briefe sonst.
- Keine erfundenen Referenzen, Bewertungen, Testimonials oder Fakten über den Betrieb.
- Brief darf nicht wie eine Rechnung aussehen; Art.-14- und Art.-21-Hinweis in jedem Brief.

## 3. Bilder

- Nur lizenzfreie Bilder (z. B. CC0 / Unsplash-/Pexels-Lizenz). Lizenz, Quelle und Urheber stehen in den
  Metadaten jedes Bildes (`packages/templates/assets/images/manifest.json`) und werden beim Bau geprüft.

## 4. Datenschutz

- Siehe [verarbeitungsverzeichnis.md](verarbeitungsverzeichnis.md) und
  [auftragsverarbeiter.md](auftragsverarbeiter.md). Keine vollständigen IP-Adressen, keine
  Tracking-Cookies; Ereignisse nur am Token des Briefs.
