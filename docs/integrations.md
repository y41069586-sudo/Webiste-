# Externe Schnittstellen – geprüfte Dokumentation

Jede Anbindung steckt hinter einem Provider-Interface (`packages/core/src/providers/types.ts`) und hat
eine Mock-Implementierung für Entwicklung, Tests und `DRY_RUN`. Prüfdatum aller Angaben: **22.10.2026**
(sofern nicht anders vermerkt). Vor dem Livegang die Preise im jeweiligen Konto erneut prüfen.

---

## Google Places API (New) – Text Search

- **Endpoint:** `POST https://places.googleapis.com/v1/places:searchText`
- **Header:** `Content-Type: application/json`, `X-Goog-Api-Key`, `X-Goog-FieldMask` (Pflicht, keine
  Standardfelder, keine Leerzeichen, `*` in Produktion vermeiden)
- **Body:** `textQuery` (Pflicht), `languageCode` (`de`), `regionCode` (`DE`), `pageSize` (1–20),
  `pageToken`; `maxResultCount` ist veraltet
- **Paginierung:** `nextPageToken` → `pageToken`; max. 60 Ergebnisse je Suche (3 Seiten). Alle übrigen
  Parameter müssen beim Folgeaufruf identisch sein.
- **Feldmaske (Lead-Suche):** `places.id, displayName, formattedAddress, addressComponents,
  nationalPhoneNumber, websiteUri, rating, userRatingCount, businessStatus, primaryType,
  regularOpeningHours, nextPageToken`
- **SKU:** `websiteUri`, `nationalPhoneNumber`, `rating`, `userRatingCount`, `regularOpeningHours` sind
  **Enterprise**-Felder → jede Anfrage wird als *Text Search Enterprise* abgerechnet.
- **Preis (global, je 1 000 Events):** Text Search Enterprise **35,00 USD** (bis 100 000), 1 000 frei/Monat;
  Text Search Pro 32,00 USD (5 000 frei). Konfiguriert: `costs.placesTextSearchPer1000UsdCents = 3500`.
- **Nutzungsbedingungen:** siehe `docs/compliance-google.md` – Speichern von Namen/Adressen untersagt,
  nur `place_id` speicherbar. **Standard-Lead-Quelle ist daher OpenStreetMap.**
- Code: `packages/core/src/providers/lead-source/google-places.ts`

## OpenStreetMap – Overpass API

- **Endpoint:** `POST https://overpass-api.de/api/interpreter` (Formular-Feld `data`), weitere
  Instanzen kommasepariert in `OVERPASS_URL` (Fallback in Reihenfolge)
- **Abfrage:** Stadtgebiet über `area["name"=…]["boundary"="administrative"]["admin_level"~"^(6|8)$"]`,
  Branchen über Tags (`craft=painter`, `craft=electrician`, `shop=beauty` + `beauty=nails|cosmetics`),
  Ausgabe `out center tags`
- **Adress-Anreicherung:** zweite Abfrage per `foreach` + `is_in`: umschließendes Gebäude mit
  `addr:*` und PLZ-Gebiet `boundary=postal_code`
- **Limits:** ca. 10 000 Requests/Tag, < 1 GB/Tag, Timeout-Standard 180 s, HTTP 429 bei Rate-Limit,
  504 bei Überlast → Retry mit Backoff, dann nächste Instanz
- **Lizenz:** ODbL, Namensnennung „© OpenStreetMap-Mitwirkende“
- **Kosten:** keine
- Code: `packages/core/src/providers/lead-source/overpass.ts`
- **Testlauf 22.10.2026 (Dortmund):** über eine öffentliche Spiegel-Instanz, da die Hauptinstanz aus der
  Build-Umgebung nicht erreichbar war. Ergebnis siehe Abschnitt Phase 2 im README.

## Anthropic Claude API

- SDK `@anthropic-ai/sdk` (TypeScript), Endpoint `POST /v1/messages` (über `client.beta.messages` wegen
  serverseitiger Fallbacks)
- **Modelle:** `MODEL_CREATIVE=claude-opus-5-5` (4 USD / 20 USD je 1 Mio. Input/Output-Tokens,
  Cache-Read 0,20 USD), `MODEL_BULK=claude-sonnet-5-5` (2 USD / 10 USD, Cache-Read 0,20 USD)
- **Strukturierte Ausgabe:** Tool mit JSON-Schema und `strict: true`. Erzwungenes `tool_choice`
  (`any`/`tool`) liefert bei Opus 5.5 / Sonnet 5.5 HTTP 400 → `tool_choice: auto` + klare Anweisung +
  Prüfung auf `tool_use`-Block, sonst ein zweiter Versuch.
- **Denken/Effort:** Opus 5.5 denkt immer adaptiv; Steuerung über `output_config.effort`
  (Standard bei Opus 5.5: `medium`). Kein `temperature` (seit 21.10.2026 nicht mehr erlaubt).
- **Prompt-Caching:** `cache_control: {type: "ephemeral"}` auf dem statischen System-Prompt.
- **Ablehnungen:** `stop_reason: "refusal"` wird behandelt; serverseitige Fallbacks über
  `fallbacks: "default"` mit Beta-Header `server-side-fallback-2026-07-01` (abschaltbar mit
  `LLM_SERVER_FALLBACK=false`).
- **Kosten:** jede Anfrage wird mit Token-Zahlen im Budget-Ledger (Kategorie `llm`) gebucht.
- Code: `packages/core/src/providers/llm/anthropic.ts`, `packages/core/src/services/llm.ts`

## Pingen – Briefversand (Print & Mail)

Geprüft am 23.10.2026 anhand der offiziellen OpenAPI-Spezifikation (`https://api.pingen.com/documentation`,
Version 2.0.0) und des Hilfecenters (`https://help.pingen.com`).

- **Umgebungen:** Produktion `https://api.pingen.com` / `https://identity.pingen.com`; Staging (Sandbox)
  `https://api-staging.pingen.com` / `https://identity-staging.pingen.com` – eigenes Konto und eigene
  Zugangsdaten nötig. Auf Staging wird nichts gedruckt; Dateinamen steuern Simulationen
  (`*_simulate_undeliverable.pdf`, `*_simulate_unprintable.pdf`, `*_simulate_cancellable.pdf`).
- **Auth:** OAuth2 Client Credentials: `POST {identity}/auth/access-tokens` (form: `grant_type=client_credentials`,
  `client_id`, `client_secret`), Token gültig 43 200 s, Header `Authorization: Bearer …`.
- **Ablauf je Brief:** `GET /file-upload` → vorsignierte `url` + `url_signature`; PDF per `PUT` an `url`
  hochladen; `POST /organisations/{org}/deliveries/letters` (JSON:API, `application/vnd.api+json`) mit
  `file_original_name`, `file_url`, `file_url_signature`, `address_position` (`left`), `auto_send`,
  `delivery_product` (`fast|cheap|bulk|premium|registered`), `print_mode` (`simplex|duplex`),
  `print_spectrum` (`color|grayscale`), optional `meta_data.recipient/sender` (Name max. 45, Straße 40,
  Ort 25 Zeichen).
- **Idempotenz:** Header `Idempotency-Key` (1–64 Zeichen) für POST/PATCH, 24 h gültig → wir verwenden die
  Brief-ID.
- **Preis:** `POST /organisations/{org}/deliveries/letters/price-calculator` (`country`, `paper_types` je
  Seite, `print_mode`, `print_spectrum`, `delivery_product`) → `price` in EUR. Wird vor jedem Versand für
  den Budget-Guard abgefragt (außer im DRY_RUN).
- **Limits:** 300 Requests/Minute; HTTP 429 mit `Retry-After`; 503 bei Wartung → Backoff.
- **Webhooks:** je Kategorie (`issues`, `sent`, `undeliverable`, `delivered`) eine URL mit `signing_key`
  (20–32 Zeichen). Header `Signature` = HMAC-SHA256(Hex) über den unveränderten Body. Wiederholungen nach
  1 min, 5 min, 10 min, 1 h, 2 h, 4 h, solange keine 2xx-Antwort kommt.
- **Layout (Fenster links):** Anschriftenfeld x = 22 mm, y = 60 mm, 85,5 × 25,5 mm; Zone x 20–109,5 mm,
  y 40–87,5 mm sonst frei (Frankierung); 5 mm Rand; 15 mm Ecke unten links frei; Schrift 10–12 pt, min. 9 pt.
- **Anschrift Deutschland:** mind. 3 Zeilen, keine Leerzeilen, „Straße Hausnummer“, letzte Zeile nur
  „PLZ Ort“ (5-stellig, ohne Land), nur lateinische Zeichen.
- **Umsetzung:** `packages/templates/src/letter.ts` (Layout), `packages/core/src/render/pdf.ts`
  (PDF + Positionsprüfung mit pdf.js in mm), Test `packages/core/test/letters.test.ts`.
