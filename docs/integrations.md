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
  **Enterprise**-Felder → jede Anfrage wird als _Text Search Enterprise_ abgerechnet.
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

## LetterXpress – Briefversand (aktiv ab L3, nur Testmodus freigegeben)

Geprüft am 24.10.2026: offizielle PDF-Dokumentation `https://www.letterxpress.de/storage/files/lxp-api_dokumentation.pdf`
(„Stand Juli 2026“, 35 Seiten, vollständig gelesen) und Formblatt `https://www.letterxpress.de/storage/files/formblatt-letterxpress-pdf.pdf`
(Stand 20.11.2025). Erreichbarkeit geprüft: `GET https://api.letterxpress.de/v3/balance` ohne gültige Daten → `401 {"message":"Unauthorized."}`.

- **Allgemein:** JSON (`Content-Type: application/json`), Basis `https://api.letterxpress.de/v3`, 50 MB je PDF/Request,
  **120 Requests/Minute** (wir: höchstens 100/Minute, Sliding Window). Das Objekt `auth: { username, apikey, mode }`
  gehört in **jeden** Request – auch in GET-Requests als JSON-Body (daher `node:https`, `fetch` erlaubt keinen GET-Body).
  API-Key im Kundenbereich unter _Mein Konto → Zugangsdaten → LXP API_.
- **Modi:** `test` legt Aufträge in die Postbox (Status `draft`), dort prüfen, löschen oder von Hand versenden; nach
  7 Tagen automatisch gelöscht. `live` überträgt direkt.
- **Endpunkte (genutzt):** `GET /balance` (Guthaben), `GET /price` (Preis; `letter.specification` mit `pages`, `color`,
  `mode`, `shipping` national/international), `GET /printjobs?filter=queue|hold|done|canceled|draft` (neu → alt,
  15 je Seite), `POST /printjobs` (Auftrag), `GET /printjobs/{id}` (Einzelauftrag), `DELETE /printjobs/{id}` (nur
  innerhalb von 15 Minuten, nicht bei `done`).
- **Endpunkte (nicht genutzt):** `PUT /printjobs/{id}` (nur Optionen, nicht das PDF, 15 Minuten), `/emailjobs*`
  (SMART@MAIL), `/journal`, `/transactions`, `/invoices`.
- **Letter-Objekt (genutzt):** `base64_file`, `base64_file_checksum` (MD5 des Base64-Strings), `specification`
  `{ color: "1"|"4", mode: "simplex"|"duplex", shipping: "national"|"international"|"auto" }`,
  `filename_original`, `notice` (max. 255 Zeichen – unsere Referenz `wbm-{letterId}` für die Idempotenz).
  Optional `dispatch_date` (yyyy-mm-dd, Zukunft; für das Timing in L7).
- **Bewusst nicht genutzt:** `bank_form` (Überweisungsträger), `terms_and_conditions` (AGB-Seiten) – Rechnungs-Look;
  `registered` (Einschreiben), `serial_letter`, `email_letter`, `backgrounds`, `base64_attachments`.
- **Antwort:** `data` mit `id`, `status` (`queue`, `hold`, `done`, `canceled`, `draft`), `notice`, `items[]` mit
  `amount` und `vat` (Euro) sowie `status` (`queue`/`sent`); `tracking_code`/`tracking_status` nur bei Einschreiben.
- **Statusabbildung:** `draft`/`queue`/`hold` → `queued`, `done` oder Position `sent` → `sent`, `canceled` → `cancelled`.
  Kosten = Summe `amount + vat` (als Kleinunternehmer ohne Vorsteuerabzug zählt brutto).
- **Nicht dokumentiert:** Webhooks, Zustellbestätigung, Postkarten. Ob `GET /price` brutto oder netto liefert, steht nicht
  in der Dokumentation – beim ersten Testauftrag mit `items.amount + vat` vergleichen; bis dahin dient der Preis nur
  als Schätzung, gebucht werden die Positionskosten.
- **Statuscodes:** 200, 400, 401, 403, 404, 405, 500. Wiederholung (Backoff) nur bei 429/5xx und nur für Abfragen –
  `POST` wird nie automatisch wiederholt; vor jedem `POST` sucht der Provider einen Auftrag mit gleicher `notice`
  (Testmodus: `draft`, live: `queue`/`hold`/`done`, jeweils erste Seite).
- **Anschrift (Formblatt):** Empfängeranschrift in der Box 20 mm von links, 45 mm von oben, 85 × 45 mm; linksbündig,
  ohne Leerzeilen, Versalhöhe 2,3–4,7 mm, 10–12 pt, Durchschuss 0,5–2,5 mm, heller Hintergrund; 3 mm nicht druckbarer
  Rand; Bereich des Datamatrix-Codes links unter dem 1. Falz (102 mm) frei lassen. Unser Layout: Anschrift
  x 25–104,5 mm, y 61–85,5 mm, 10 pt, links bis 25 mm frei → innerhalb der Vorgaben.
- **Laufzeit:** Postgesetz seit 01.01.2025 – 95 % der Inlandsbriefe am 3. Werktag nach Einlieferung, 99 % am 4.
  Werktag (Bundesnetzagentur, Qualitätsmonitoring). Daher `DELIVERY_BUSINESS_DAYS=3`; ein QR-Scan vor diesem Datum
  korrigiert die Schätzung (`letters.delivery_corrected_at`), die beobachtete Laufzeit erscheint unter _Briefe_.
- **Ablauf vor dem ersten echten Versand (B5.2):** 3 Testaufträge (Brief-Detail → „Testauftrag an LetterXpress“,
  geht auch bei `DRY_RUN=true`, nur mit bestandenem Wahrheits-Check) → in der LetterXpress-Postbox prüfen →
  `LXP_MODE=live` (erst nach deinem OK) → 1 echter Testbrief an dich → Schalter „Echte Briefe freigegeben“.
  Das System sperrt `live` ohne 3 Testaufträge, auch für den Testbrief.
- Code: `packages/core/src/providers/mail/letterxpress.ts`, `packages/core/src/services/sending.ts`

## Pingen – Briefversand (inaktive Alternative)

> Laut Update 2 ist LetterXpress der vorgesehene Briefdienst (Baustein L3). Der Pingen-Code bleibt als
> inaktive zweite `MailProvider`-Implementierung erhalten und wird nicht weiterentwickelt.

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

## Stripe – Checkout und Zahlungseingang

Geprüft am 23.10.2026: SDK `stripe` 23.0.1 (API-Version `2026-09-30.endive`, Typen im Paket),
Doku „Fulfill orders“ (docs.stripe.com/checkout/fulfillment).

- **Session:** `stripe.checkout.sessions.create` mit `mode: 'payment'`, `line_items[].price_data`
  (EUR, Betrag aus der Bestellung), `client_reference_id` = Bestell-ID, `customer_email`, `metadata`,
  `locale: 'de'`, `expires_at` (30 min – 24 h, Config `checkout.sessionMinutes`),
  `success_url` mit Platzhalter `{CHECKOUT_SESSION_ID}`, `cancel_url`. Request-Option
  `idempotencyKey: checkout-{orderId}`. Keine Stripe-Rechnung (`invoice_creation` aus) – die Rechnung
  mit fortlaufender Nummer erstellen wir selbst. Zahlungsarten: dynamisch aus dem Stripe-Dashboard.
- **Fulfillment** laut Doku „nur einmal pro Zahlung, auch bei mehrfachen/parallelen Aufrufen“:
  `fulfillOrder` sperrt die Bestellzeile (`SELECT … FOR UPDATE`), prüft Betrag und Währung, vergibt
  die Rechnungsnummer in derselben Transaktion. Auslöser: Webhook **und** Erfolgsseite
  (`sessions.retrieve`, `payment_status` ≠ `unpaid`).
- **Webhooks** (Endpunkt `/api/webhooks/stripe`): `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
  `checkout.session.expired`, `charge.refunded`. Signaturprüfung mit
  `stripe.webhooks.constructEvent(rawBody, Stripe-Signature, STRIPE_WEBHOOK_SECRET)` auf dem
  unveränderten Body (Toleranz 300 s), Replay-Schutz über `webhook_events`.
  Ungültige Signatur → 400, Verarbeitungsfehler → 500 (Stripe wiederholt automatisch).
- **Erstattung:** `stripe.refunds.create({ payment_intent, amount })` mit Idempotency-Key; die
  Stornorechnung entsteht beim `charge.refunded`-Event bzw. direkt bei der Admin-Aktion.
- **Option B „Monatlich“ (Update 2), geprüft am 23.10.2026** (docs.stripe.com/billing/subscriptions/subscription-schedules,
  docs.stripe.com/payments/paypal, Typen von stripe-node 23.0.1):
  - Checkout `mode: 'subscription'` mit `price_data.recurring.interval = 'month'` (49 €), erste Rate
    sofort; `subscription_data.metadata` trägt die Bestell-ID. Kein `payment_intent_data`/`submit_type`
    (nur im Modus „payment“).
  - Nach Zahlung: `subscription_schedules.create({ from_subscription })`, danach `update` mit zwei
    Phasen: Phase 1 = bisheriger Preis bis `start_date + 12 Kalendermonate` (`end_date`), Phase 2 =
    `price_data` 19 €/Monat (gleiches Produkt) mit `duration: { interval: 'month', interval_count: 1 }`,
    `end_behavior: 'release'` → das Abo läuft danach mit 19 € weiter und ist monatlich kündbar.
    `phases[].iterations` gibt es in den aktuellen SDK-Typen nicht mehr; Stripe empfiehlt `duration`.
    Alle Aufrufe mit Idempotency-Key, idempotent bei Wiederholung (vorhandener Zeitplan mit 2 Phasen
    wird erkannt). Stripe erzwingt die Mindestlaufzeit nicht – sie steht in AGB/Checkout; eine Kündigung
    vor Ablauf wird gemeldet.
  - Webhooks zusätzlich: `invoice.paid` (Rate ab Monat 2 → eigene Rechnung mit fortlaufender Nummer;
    `billing_reason = subscription_create` ist die erste Rate), `invoice.payment_failed`
    (`next_payment_attempt = null` → letzter Versuch → Wartungsmodus), `customer.subscription.updated`
    (`unpaid` → Wartungsmodus, `active` → wieder online), `customer.subscription.deleted`
    (Vertragsende). Abo-ID der Rechnung: `invoice.parent.subscription_details.subscription`;
    Leistungszeitraum aus `invoice.lines.data[0].period` (`invoice.period_*` beschreibt bei Abos den
    Vorzeitraum).
  - Erstattung der ersten Rate (Garantie): `invoices.retrieve(id, { expand: ['payments'] })` →
    `payments.data[].payment.payment_intent` → `refunds.create`. Vertrag beenden:
    `subscription_schedules.cancel` (beendet auch das Abo) bzw. `subscriptions.cancel`, jeweils ohne
    anteilige Gutschrift.
  - **Zahlungsarten:** `allowed_payment_method_types: ['card', 'sepa_debit']` (Config `checkout.paymentMethods`; `payment_method_types` gibt es seit API 2026-09-30 nicht mehr, der neue Parameter filtert die im Dashboard aktiven Arten) (Entscheidung des Betreibers
    vom 23.10.2026: Kunden sind Betriebe, PayPal vorerst nicht). Beide Arten im Stripe-Dashboard
    aktivieren. SEPA-Lastschrift: Zahlung kommt asynchron (`processing`, danach `invoice.paid`).
  - Fehlgeschlagene Raten: Smart Retries im Dashboard aktivieren; Endzustand nach den Versuchen
    (Abo `unpaid` oder gekündigt) wird beides behandelt.
- **Gehosteter Checkout ohne eigene Bestellseite (24.10.2026, Wunsch des Betreibers)**, geprüft gegen die
  API-Referenz `POST /v1/checkout/sessions` (OpenAPI 2026-09-30) und die Typen von stripe-node 23.0.1:
  - „Seite übernehmen“ → Preiskarte → `/d/{slug}/uebernehmen?plan=…` → Session → 303 zur Stripe-Bezahlseite.
  - Stripe erfasst: `name_collection.business` und `.individual` (beide Pflicht), `billing_address_collection:
'required'`, `phone_number_collection.enabled`, E-Mail (Standard). Eigene Felder `custom_fields` (max. 3):
    `wunschdomain` (Text, 4–63 Zeichen, vorbelegt mit dem Domainvorschlag), `unternehmer` und `agb` (Dropdown mit
    genau einer Option „Ja“, Pflichtfeld). `custom_text.submit` nennt Preis, Mindestlaufzeit, Garantie und den
    AGB-Link. Bewusst **nicht** `consent_collection.terms_of_service`: das verlangt eine AGB-URL in den
    Dashboard-Einstellungen und die Session-Erstellung schlägt sonst fehl.
  - Webhook/Erfolgsseite: `collected_information.business_name`/`individual_name`, `customer_details`
    (E-Mail, Telefon, Adresse) und `custom_fields[].text|dropdown.value` → Bestellung (vor der Verbuchung).
    Die Wunschdomain wird erneut geprüft; ist sie vergeben, bleibt sie leer und wird im Onboarding gewählt
    (dort mit Live-Prüfung). Fehlt eine Bestätigung, geht eine Meldung an den Betreiber.
  - `cancel_url` führt zurück zu den Preiskarten des Entwurfs (`/d/{slug}#uebernehmen`).
- **Test:** `PAYMENT_PROVIDER=mock` simuliert die Bezahlseite (`/checkout/mock/…`) inkl. signierter
  Events; in Produktion gesperrt (außer `ALLOW_MOCK_PAYMENT=true`). Stripe-Testmodus: `sk_test_…` und
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

## Resend / Postmark – Transaktions-Mails

Geprüft am 23.10.2026.

- **Resend:** `POST https://api.resend.com/emails`, `Authorization: Bearer …`, Felder `from`, `to`,
  `subject`, `text`, `html`, `reply_to`, `headers`, `tags[{name,value}]`, `attachments[{filename,
content(Base64)}]` (Typ aus dem Dateinamen), max. 40 MB. Header `Idempotency-Key` (≤ 256 Zeichen,
  24 h gültig).
- **Postmark:** `POST https://api.postmarkapp.com/email`, Header `X-Postmark-Server-Token`, Felder
  `From`, `To`, `Subject`, `TextBody`, `HtmlBody`, `ReplyTo`, `Tag`, `Headers[{Name,Value}]`,
  `Attachments[{Name,Content,ContentType}]`, `MessageStream: outbound`, `TrackOpens: false`,
  `TrackLinks: None`. Antwort `ErrorCode` 0 = OK. Kein Idempotenz-Header.
- **Doppelversand-Schutz** anbieterunabhängig über die Tabelle `outbound_emails`
  (eindeutiger `idempotency_key`, z. B. `invoice:{orderId}`).
- Absenderdomain beim Anbieter verifizieren (SPF, DKIM, DMARC) – siehe Go-Live-Checkliste.

## INWX – Domainregistrierung

Geprüft am 23.10.2026 (account.inwx.de/en/help/apidoc, Kapitel 1.2, 2.1, 2.6, 2.9, 2.15, 3, 4).

- **Endpunkte:** Produktion `https://api.domrobot.com/jsonrpc/`, Test (OT&E) `https://api.ote.domrobot.com/jsonrpc/`
  (`REGISTRAR_ENV=sandbox|production`). Anfrage `{method, params}`, Antwort `{code, msg, resData}`.
- **Codes:** 1000 OK, 1001 OK/ausstehend, 1500 OK/Sitzungsende, 2302 Objekt existiert, 2303 existiert nicht,
  2400 Befehl fehlgeschlagen. Alles ≥ 2000 wird als Fehler behandelt.
- **Anmeldung:** `account.login {user, pass}`; Sitzung über das zurückgegebene Cookie. Ist im Konto 2FA aktiv
  (`resData.tfa`), folgt `account.unlock {tan}` mit TOTP aus `REGISTRAR_TOTP_SECRET`.
- **Ablauf beim Go-Live:** `domain.check {domain[]}` (avail, price, premium) → `domain.info` (Idempotenz: liegt die
  Domain schon in unserem Konto?) → `contact.create {type ORG|PERSON, name, org, street, city, pc, cc, voice
(+49.2311234), email}` mit den **Impressumsdaten des Kunden** (Domain-Inhaber = Kunde) → `domain.create {domain,
period '1Y', registrant, ns, renewalMode 'AUTOEXPIRE', transferLock}`.
- **DNS (nur bei Netlify):** `nameserver.create {domain, type 'MASTER', ns, ignoreExisting}`, `nameserver.info`,
  `nameserver.deleteRecord`, `nameserver.createRecord {domain, type, name, content, ttl}`.
- **Kosten:** Preis aus `domain.create` (sonst Schätzung `costs.domainPerYearCents`) → Budget-Ledger „domain“.
- **Freigabe:** Ohne `switches.autoRegisterDomains` wartet jede Registrierung auf die Freigabe im Dashboard
  („Kunden & Seiten“); bei `DRY_RUN` wird nie echt registriert.

## Cloudflare – Hosting der Kundenseiten (Workers Static Assets)

Geprüft am 23.10.2026 (developers.cloudflare.com: „Direct Uploads“ für Workers Static Assets, API „Attach Worker
Domain“, „Create Zone“). Cloudflare **Pages** Direct Upload dokumentiert das Hochladen der Dateien selbst nicht (nur
das Manifest), daher nutzen wir die dokumentierte Workers-Variante – technisch dieselbe Infrastruktur.

1. `POST /accounts/{id}/workers/scripts/{name}/assets-upload-session {manifest: {"/pfad": {hash, size}}}` →
   `{jwt, buckets}`; Hash = SHA-256 über Base64-Inhalt + Dateiendung, erste 32 Hex-Zeichen (wie im offiziellen Beispiel).
2. Je Bucket `POST /accounts/{id}/workers/assets/upload?base64=true` (Bearer = Upload-JWT, multipart, Feld = Hash)
   → Completion-JWT.
3. `PUT /accounts/{id}/workers/scripts/{name}` (multipart: `metadata` mit `main_module`, `assets.jwt`,
   `assets.config`, Binding `ASSETS`; Modul `worker.js` setzt Sicherheits-Header inkl. CSP und leitet www → Apex).
4. Domain: Zone im eigenen Konto (`POST /zones {name, account.id, type 'full'}`) → `name_servers` gehen an INWX →
   nach Aktivierung `PUT /accounts/{id}/workers/domains {hostname, service, zone_id}` für Apex und www
   (Zertifikat automatisch). Der Live-Check wiederholt die Bindung, bis die Zone aktiv ist.

Token-Rechte: Workers Scripts Write, Zone Edit/DNS Edit (für die Kundenzonen), Account-ID in `CLOUDFLARE_ACCOUNT_ID`.

## Netlify – Alternative für das Hosting

Geprüft am 23.10.2026 (docs.netlify.com „Get started with the Netlify API“, „Configure external DNS“).

- `POST /api/v1/sites {name}`; Deploy per Digest: `POST /api/v1/sites/{id}/deploys {files: {"/pfad": sha1}}` →
  `required` → `PUT /api/v1/deploys/{deploy}/files/{pfad}` (octet-stream) → Status abfragen bis `ready`.
  Sicherheits-Header über die Datei `_headers`. Limit: 3 Deploys/Minute, 100/Tag.
- Eigene Domain: `PATCH /api/v1/sites/{id} {custom_domain, domain_aliases}`; DNS bei INWX: Apex `A 75.2.60.5`,
  `www CNAME {site}.netlify.app`; SSL: `POST /api/v1/sites/{id}/ssl`.
- Umschalten mit `HOSTING_PROVIDER=netlify` und `NETLIFY_API_TOKEN`.

## Eingehende E-Mails (Support)

Geprüft am 23.10.2026.

- **IMAP (empfohlen, anbieterunabhängig):** `imapflow` 2.9 + `mailparser` 3.12. Job `imap-poll` alle 5 Minuten,
  liest ungelesene Nachrichten der INBOX, Duplikatschutz über die Message-ID, markiert als gelesen.
  Variablen `IMAP_HOST`, `IMAP_PORT` (993 = TLS), `IMAP_USER`, `IMAP_PASSWORD`.
- **Postmark Inbound (alternativ):** Postmark sendet die Mail als JSON (`FromFull.Email`, `Subject`, `MessageID`,
  `TextBody`, `StrippedTextReply`, `Headers[{Name,Value}]`, `OriginalRecipient`, …) an
  `/api/webhooks/email-inbound`. Die Postmark-Doku nennt keine Signatur – wir verlangen daher das Geheimnis
  `EMAIL_INBOUND_SECRET` als `?token=` oder als Basic-Auth-Passwort in der Webhook-URL. Antwort 403 stoppt
  Postmark-Wiederholungen.
- Automatische Antworten (Auto-Submitted, Abwesenheit, Mailer-Daemon) werden erkannt und nie beantwortet.

## Openverse (Beispielfotos, einmalig)

Geprüft am 24.10.2026: API-Schema `https://api.openverse.org/v1/schema/`. Genutzt nur einmalig zum Auswählen
der Beispielfotos (kein Laufzeit-Zugriff): `GET /v1/images/?q=…&license=cc0&source=stocksnap,rawpixel`,
Details `GET /v1/images/{id}/` (Felder `license`, `license_version`, `license_url`, `foreign_landing_url`,
`creator`, `url`). Ergebnis und Lizenz je Bild in `packages/templates/assets/images/manifest.json` und in den
EXIF-Daten (Copyright, Artist, ImageDescription). Neue Bilder: nur CC0, ohne erkennbare Personen und Marken.

## Ergänzung 24.10.2026: Resend-Inbox und Supabase-Dateispeicher

- Resend-SDK 6.34.1 genau gepinnt; Webhookverify verwendet `webhookSecret` und normalisierte
  Header `id/timestamp/signature` des SDK, nicht die veralteten Feldnamen aus älteren Beispielen.
- `inbox.email.received`: `data.inbox_id/thread_id/email_id`; Text über
  `resend.inboxes.threads.emails.get`. Standard `email.received` über receiving.get.
  API-geladene Mail und korrekten Empfänger prüfen, keine Anhänge/HTML/Auto-Antworten.
- Webhooksignatur und Zeitfenster geprüft; Message-ID für Duplikate; Support wird mit
  `queueProcessing=false` manuell eskaliert. Kein Workerstart.
- Supabase S3: Endpoint `<ref>.storage.supabase.co/storage/v1/s3`, Region eu-west-1,
  Bucket seitenwerk-private privat. Vorhandenen S3Storage wiederverwenden. S3-Schlüssel
  müssen im Supabase-Storage-Dashboard erzeugt und serverseitig geschützt hinterlegt werden.
- Stripe: vorhandene Sandbox beibehalten, neuer Webhook auf dynamische Netlify-App.
  Pluginzugriff ersetzt keinen STRIPE_SECRET_KEY in der App; kein Live-Key zugänglich/verwendet.
- Details, Quellen und noch fehlende Secrets: `integrationen-abschluss.md`.

## 25.10.2026 – Stripe V4, Sandbox und Branding

Über das vorhandene Stripe-Plugin drei Produkte mit Defaultpreisen in der Website-Sandbox angelegt und
per GET zurückgelesen: 59700 Cent Einrichtung, 1900 Cent Basis monatlich, 9900 Cent Care+ monatlich.
IDs stehen ausschließlich als nicht geheime Referenzen in `packages/core/src/config/stripe-v4-sandbox.json`.
Keine V4-Duplikatprodukte bei Checkout-Erstellung; der Provider verwendet diese Preise und blockiert Live-Keys.
Branding per UpdateBrandSettings gespeichert und zurückgelesen: Blau #1F4FD8, Weiß, Inter. API-Update
erwartet RGB-Strings; Readback liefert Hexwerte. Kein fremdes oder erfundenes Logo hochgeladen.

PostCheckoutSessions-Dokumentation bestätigt: höchstens drei custom_fields; Business-/Individual-Name-
Collection, dynamisch gefilterte erlaubte Zahlungsmethoden und integration_identifier verfügbar.
V4 verwendet exakt drei Pflichtfelder und eine wiederholungsstabile Integrationskennung. Monatsabo
wird in einem separaten Checkout erst nach bestätigtem Go-Live und Vertragszustimmung abgeschlossen.
Keine automatische Monatsbelastung und kein geschätztes trial_end. Signature-/Webhook-/SEPA-Pfade und
Legacy-Zeitplan bleiben erhalten. Stripe Tax blieb aus; Steuerstatus ist ungeklärt. Keine Zahlung,
Subscription oder Erstattung über das Plugin ausgelöst. Stand und offene echte Sandbox-Abnahme:
`conversion-optimization-v4.md`.

## V5: Refund-Zuordnung und Korrekturbelege (25.10.2026)

Bestehender Stripe-Adapter, SDK23.0.1; kein neuer Zahlungsanbieter. Bestätigte Refunds paginiert
über GET `/v1/refunds?charge=…` summieren. Für erfolgreiche refund.updated-Events zusätzlich
GET `/v1/charges/{id}` lesen. Invoice-Zuordnung über GET `/v1/invoice_payments` mit
`payment[type]=payment_intent`, `payment[payment_intent]=…`, `status=paid`.
Nicht das frühere invoice.payment_intent-Feld voraussetzen. Offizielle Änderungsdokumentation:
https://docs.stripe.com/changelog/basil/2025-03-31/add-support-for-multiple-partial-payments-on-invoices

Aktuelle SDK-Typen und paginierte Fake-HTTP-Vertragstests zusätzlich geprüft. Restricted Key braucht
entsprechende Invoice-Payment-/Charge-/Refund-Leserechte; diese Laufzeitrechte nicht ungeprüft als
vorhanden behaupten. Mehrrechnungs-/Teilzahlungszuordnung wird zur manuellen Klärung abgewiesen.
Pending ist kein Refund-Geldabgang, invoice.paid allein ein Zahlungsbeleg. Ursprüngliche Rechnung
und vorbereitete Differenzbelege unveränderlich halten. Bereitstellung, Rechts-/Steuerfreigabe und
vollständige echte Webhookkette weiterhin gesondert; V4-Live-Key blockiert.
