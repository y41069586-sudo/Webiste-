# Gesamt-Update für Claude Code: „Website-Brief-Maschine“
## Preise 590 €, Segmente, Demo, Follow-up, Branchen-Briefe, LetterXpress und Lernsystem

> **So nutzt du diesen Prompt:** Füge ihn in Claude Code in das bestehende Projekt ein. Es ist **ein einziges, in sich widerspruchsfreies Update**. Es ersetzt alle früheren Update-Texte. Speichere ihn zusätzlich als `docs/spec-update-2.md`.

---

## 0. Wie du mit diesem Update umgehst (zuerst lesen)

1. **Rangfolge bei Widersprüchen:** Dieses Dokument geht `CLAUDE.md` vor. Was hier nicht geregelt ist, gilt weiter aus `CLAUDE.md`. Findest du trotzdem einen Widerspruch, **frag mich**, statt selbst zu entscheiden.
2. **Unterbrich die aktuelle Phase nicht.** Schließe die Phase ab, in der du gerade bist. Übernimm danach Teil A in Plan, Schema und bereits gebauten Code, **ohne fertige Teile kaputt zu machen** (bestehende Tests müssen grün bleiben, Migrationen nur additiv).
3. **Einordnung der neuen Bausteine aus Teil B in die bestehenden Phasen:**
   - **L1 + L2** (Claims, Playbooks, Branchen-Briefe, Wahrheits-Check) gehören **in Phase 4** (Brief-Generator) bzw. direkt davor.
   - **L3** (LetterXpress) **ersetzt Phase 5**. Pingen wird nicht weitergebaut. Schon vorhandener Pingen-Code bleibt nur als inaktive zweite `MailProvider`-Implementierung, sofern er keine Tests stört, sonst entfernen.
   - **L4** (Messung) baut auf dem Tracking aus Phase 3 auf und wird nach Phase 6 (Checkout) fertiggestellt, weil die Kauf-Events von Stripe kommen.
   - **L5 + L6** (Optimizer, Lern-Agent) **ersetzen den Optimizer aus Phase 9** (`CLAUDE.md` 5.12).
   - **L7** bleibt zurückgestellt, bis genug Daten da sind.
4. **Aktualisiere `CLAUDE.md`** so, dass Preise, Briefdienst, Follow-up und Phasenliste dort dem neuen Stand entsprechen. Es darf danach nirgends mehr 390 €, 29 €/Monat, Pingen als aktiver Dienst oder „Postkarte“ als fester Bestandteil stehen.
5. **Danach:** Sag mir kurz, was du angepasst hast, zeig mir die neue Phasenliste und stelle alle offenen Fragen gesammelt in einer Nachricht. Erst nach meinem OK geht es weiter.

**Querverweise:** „A…“ und „B…“ meinen Abschnitte in diesem Dokument. „`CLAUDE.md` X“ meint den Abschnitt X im ursprünglichen Auftrag.

---

# TEIL A: Änderungen am bestehenden System

## A1. Preise (beide sofort beim Checkout bezahlt, keine 0-€-Anzahlung)
- **Option A „Einmalzahlung“: 590 €** (Stripe `mode=payment`), inkl. eigener Domain und 12 Monaten Hosting. Danach optional „Hosting & Pflege“ 19 €/Monat ab Monat 13 (in v1 nur Erinnerungs-Mail 30 Tage vor Ablauf mit Abo-Link).
- **Option B „Monatlich“: 49 €/Monat** (Stripe `mode=subscription`), erste Rate sofort, **Mindestlaufzeit 12 Monate** (12 × 49 € = 588 €, also gleichwertig zur Einmalzahlung). **Ab Monat 13 sinkt der Preis automatisch auf 19 €/Monat** („Hosting & Pflege“, genau wie bei Option A) und ist dann monatlich kündbar. Umsetzung über Stripe Subscription Schedules (Phase 1: 12 Iterationen à 49 €, Phase 2: 19 € laufend). Stripe erzwingt die Mindestlaufzeit nicht selbst: über unsere Logik und die AGB umsetzen (Subscription Schedules oder `cancel_at` prüfen). Fehlgeschlagene Zahlungen: Smart Retries, danach Seite im Wartungsmodus, Benachrichtigung an mich.
- Die Mindestlaufzeit steht **überall sichtbar** neben den 49 € (Brief, Demo-Karte, Checkout), ebenso der Hinweis „ab Monat 13 nur noch 19 €/Monat“ auf Demo-Karte und im Checkout.
- **Zahlungsarten:** Karte, SEPA-Lastschrift, PayPal (falls im Stripe-Konto für Deutschland verfügbar, prüfen). Für Option B mindestens Karte und SEPA.
- **14-Tage-Zufriedenheitsgarantie** (Config, Standard an): Refund per Admin-Button, Seite offline, Domain freigeben oder an den Kunden übertragen. Bei Option B Vertrag beenden und erste Rate erstatten.
- **Webhooks zusätzlich:** `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- **`orders`-Tabelle zusätzlich:** `plan` (`one_time`|`monthly`), `stripe_subscription_id`, `min_term_ends_at`, `guarantee_ends_at`, `refunded_at`.
- Überall, wo bisher 390 € oder 29 €/Monat steht (Config, Brieftexte, Demo-Karten, Checkout, Rechnung, Tests, Doku), auf **590 €** bzw. **49 €/Monat** ändern.

## A2. Lead-Segmente (Priorität: neu > social_only > etabliert)
- Lead-Finder läuft wöchentlich und speichert `first_seen_at`.
- **„neu“:** neu in den Suchergebnissen aufgetauchte Betriebe mit 3–20 Bewertungen. Für dieses Segment entfällt die Mindest-Bewertungszahl, Rating ≥ 4,5 bleibt.
- **„social_only“:** Website-Link führt nur auf Instagram, Facebook, TikTok oder Linktree → Score-Bonus.
- **„etabliert“:** alle übrigen qualifizierten Leads (Filter aus `CLAUDE.md` 5.1, ≥ 30 Bewertungen).
- Handelsregister nur optional und nur nach Compliance-Prüfung (`docs/compliance-handelsregister.md`), sonst weglassen.
- **`leads`-Tabelle zusätzlich:** `lead_segment`, `first_seen_at`. Die Branchen-Zuordnung und die Ausschluss-Branchen kommen aus B3.

## A3. Brief (gilt für alle Branchen-Varianten aus B4)
- QR-Code **mind. 4 × 4 cm**, daneben ein Nutzen-Satz statt „Scannen Sie hier“ (Standard: „Scannen und Ihre fertige Website ansehen – online bis {Ablaufdatum}“, branchenspezifische Varianten siehe B4).
- Kurz-URL als Alternative (`{TRACK_DOMAIN}/{kurzcode}`).
- Beide Preisoptionen nennen: **590 € einmalig oder 49 €/Monat (12 Monate Mindestlaufzeit)**, Garantie-Satz falls aktiv.
- Statt „nach 30 Tagen gelöscht“: „bis {Ablaufdatum} online“.
- Alle Pflichtregeln aus `CLAUDE.md` 5.5 bleiben (kein Rechnungs-Look, Art.-14- und Art.-21-Hinweis, Absender, DIN 5008).
- Der Brieftext selbst kommt ab jetzt aus den Branchen-Playbooks (B3, B4) und muss den Wahrheits-Check (B5.4) bestehen.

## A4. Demo-Seite
- Banner-Buttons: **[Seite übernehmen] [Frage per WhatsApp] [Kein Interesse]**.
- „Seite übernehmen“ zeigt zwei gleichwertige Karten (**590 € einmalig** / **49 €/Monat mit 12 Monaten Mindestlaufzeit, danach 19 €/Monat**), keine Vorauswahl, keine versteckten Kosten.
- WhatsApp = `wa.me`-Link auf meine Nummer mit vorausgefülltem Text („Frage zu meinem Website-Entwurf {slug}“), kein Bot.
- Vertrauensblock: mein Foto, Name, 2 Sätze über mich, Kontakt, Link zum Impressum. Später „Bereits live“ mit echten Kunden (nur mit deren Einwilligung). **Niemals erfundene Referenzen oder Bewertungen.**
- Die Demo zeigt den Aufhänger des jeweiligen Branchen-Briefs tatsächlich (Speisekarte, Terminanfrage, „Wir stellen ein“ usw., siehe B3).
- Optional (Phase 9): persönliches Video (mein 10-s-Intro + automatische Scroll-Aufnahme der Demo per Playwright/ffmpeg). Keine synthetische Stimme ohne meine Freigabe.

## A5. Follow-up (max. 3 Sendungen pro Lead, alle über LetterXpress)
- **Kein Scan 12 Tage nach geschätzter Zustellung** (B5.2): zweite Sendung als **kurzer einseitiger Brief** mit großem Bild der Demo und „Ihre Website ist nur noch 7 Tage online“. Demo-Ablauf um 7 Tage verlängern, damit die Aussage stimmt. (LetterXpress dokumentiert keine Postkarten. Nur wenn die PDF-Doku eine Postkarten-Option zeigt, wird sie als zusätzliche Option eingebaut.)
- **Heißer Lead** (≥ 2 Demo-Aufrufe oder CTA-Klick, kein Kauf nach 7 Tagen): dritte Sendung „Wir haben Ihre Seite verbessert“. Die Demo vorher **wirklich** verbessern.
- Eine einzige Erinnerungs-Mail nur, wenn der Lead uns selbst kontaktiert und dabei eine E-Mail angegeben hat (mit Abmeldelink).
- **`letters`-Tabelle:** `sequence` (1–3), `format` (`letter`|`postcard`, Standard `letter`). Weitere Felder siehe B7.
- Auch Folgebriefe laufen durch den Wahrheits-Check und sind Varianten im Lernsystem.

## A6. Config
- Absender um WhatsApp-Nummer, Foto und Kurzvorstellung (2 Sätze) erweitern.
- Alle Preise (590 €, 49 €, 19 €), Laufzeiten (12 Monate), Garantie (an/aus, 14 Tage) einstellbar.
- Neue Schalter aus Teil B: `MAIL_PROVIDER=letterxpress`, `LXP_USERNAME`, `LXP_APIKEY`, `LXP_MODE=test`, `DELIVERY_BUSINESS_DAYS=3`, `MIN_LETTERS_PER_ARM=100`, `AUTO_ACTIVATE_VARIANTS=false`, `MAX_CAC_CENTS=20000`, Auswertungsfenster 45 Tage.
- KPIs zusätzlich: Anteil Einmalzahlung vs. Monatlich (weitere KPIs siehe B8).

---

# TEIL B: Branchen-Briefe, LetterXpress und Lernsystem

Ziel: (1) branchenspezifische, nachweislich wahre Werbebriefe, (2) Versand über die **LetterXpress-API v3**, (3) ein **Lernsystem**, das nach jeder Charge misst, was passiert ist (Zustellung, QR-Scans, Demo-Aufrufe, Kaufklicks, Käufe, Opt-outs), daraus lernt und die nächsten Briefe besser macht, **ohne jemals Zahlen, Fakten oder Wirkungen zu erfinden**. Alles Kostenpflichtige bleibt hinter `DRY_RUN` und meiner Freigabe.

## B1. Die wichtigste Regel: Nur belegte Aussagen

Werbung mit falschen oder nicht belegbaren Zahlen ist in Deutschland **irreführende Werbung (§ 5 UWG)** und abmahnbar. Außerdem zerstört sie Vertrauen. Deshalb gilt technisch erzwungen:

1. **Keine Wirkungsversprechen ohne eigenen Beleg.** Verboten sind Aussagen wie „5-mal mehr Umsatz“, „garantiert mehr Kunden“, „nachweislich mehr Anfragen“, „x % mehr Buchungen“, solange wir dafür keine eigenen, geprüften Daten haben. Es gibt **keine seriöse Studie**, die belegt, dass eine Website den Umsatz eines Kleinbetriebs um Faktor X steigert. Wir arbeiten stattdessen mit belegten Fakten über das **Verhalten von Kunden** (z. B. „53 % schauen die Speisekarte vorher online an“).
2. **Jede Zahl im Brief stammt aus der Claims-Bibliothek** (Abschnitt B2). Claude darf Zahlen nicht selbst formulieren, umrechnen, runden, verallgemeinern oder auf andere Gruppen übertragen. Briefe referenzieren Claims nur per ID, der Text wird aus der Bibliothek eingesetzt.
3. **Quellenangabe im Brief:** Jede Statistik bekommt eine Fußnote mit Herausgeber, Jahr und Stichprobe (z. B. „Bitkom Research 2025, 1.004 Befragte ab 16 Jahren“). Die vollständige URL steht auf einer Quellen-Seite unter `{TRACK_DOMAIN}/quellen`.
4. **Automatischer Wahrheits-Check** vor jeder Freigabe (Abschnitt B5.4): Jede Ziffer, jedes Prozentzeichen und jedes Wort aus einer Sperrliste wird geprüft. Ein Brief mit einer Zahl, die keinem freigegebenen Claim entspricht, wird blockiert.
5. **US-Daten nie als deutsche Daten ausgeben.** Claims haben ein Feld `scope`. Ein Claim mit `scope: US` darf nur mit dem Zusatz „in den USA“ verwendet werden (Standard: für Briefe gesperrt).
6. **Eigene Daten erst später und nur geprüft:** Aussagen über unsere eigenen Kunden (z. B. „Unsere Kundenseiten erhielten im Schnitt X Anfragen pro Monat“) dürfen erst entstehen, wenn das System sie aus echten Messwerten berechnet hat (mind. 10 Kunden, mind. 60 Tage, Methode dokumentiert), und nur nach meiner manuellen Freigabe. Diese Claims bekommen `source_type: own_data` und werden monatlich neu berechnet. Weicht der neue Wert ab, wird der Claim automatisch gesperrt, bis ich ihn neu freigebe.
7. **Keine erfundenen Referenzen, Kundenstimmen, Logos von Kunden oder Bewertungen.**

---

## B2. Claims-Bibliothek

Lege `packages/core/claims/claims.yaml` an und eine Tabelle `claims` (id, text_de, footnote_de, source_publisher, source_title, source_url, published_at, sample, population, scope, industries[], status `approved`|`needs_verification`|`blocked`, verified_by, verified_at, expires_at, source_type `external`|`own_data`).

**Pflicht:** Rufe vor der ersten Nutzung jede `source_url` auf und prüfe, ob Zahl, Wortlaut, Jahr und Stichprobe exakt stimmen. Ergebnis mit Datum in `docs/claims-verifikation.md`. Erst dann `status: approved`, und auch dann nur nach meinem OK im Dashboard. `expires_at` = Veröffentlichung + 24 Monate; danach wird der Claim automatisch gesperrt und ich bekomme eine Meldung („Quelle veraltet, neuere Studie suchen“).

Startbestand (von mir recherchiert, von dir zu verifizieren):

```yaml
- id: GASTRO_WEBSITE_ERWARTET
  text_de: "69 % der Menschen in Deutschland erwarten, dass ein Restaurant oder Café eine Website mit Fotos von Speisen und Räumen hat."
  footnote_de: "Bitkom Research 2024, 1.005 Befragte ab 16 Jahren, repräsentativ"
  source_url: https://www.bitkom.org/Presse/Presseinformation/Restaurants-und-Cafes-Online-Bewertungen-entscheidend
  published_at: 2024-06-27
  scope: DE
  industries: [gastronomie]
  status: needs_verification

- id: GASTRO_SPEISEKARTE_ONLINE
  text_de: "53 % schauen sich die Speisekarte normalerweise vor dem Besuch online an, bei den 16- bis 29-Jährigen sind es 65 %."
  footnote_de: "Bitkom Research 2024, 1.005 Befragte ab 16 Jahren"
  source_url: https://www.bitkom.org/Presse/Presseinformation/Restaurants-und-Cafes-Online-Bewertungen-entscheidend
  published_at: 2024-06-27
  scope: DE
  industries: [gastronomie]
  status: needs_verification

- id: GASTRO_RESERVIERUNG_ONLINE
  text_de: "47 % reservieren einen Tisch am liebsten online."
  footnote_de: "Bitkom Research 2024, 1.005 Befragte ab 16 Jahren"
  source_url: https://www.bitkom.org/Presse/Presseinformation/Restaurants-und-Cafes-Online-Bewertungen-entscheidend
  published_at: 2024-06-27
  scope: DE
  industries: [gastronomie]
  status: needs_verification

- id: HANDWERK_OHNE_WEBSITE_AUSSORTIERT
  text_de: "40 % der Menschen in Deutschland sagen: Hat ein Handwerksbetrieb keine Website, kommt er für sie nicht infrage."
  footnote_de: "Bitkom Research 2025, 1.004 Befragte ab 16 Jahren, repräsentativ"
  source_url: https://www.bitkom.org/Presse/Presseinformation/Handwerkersuche-Gespraech-schlaegt-Netz
  published_at: 2025-06-12
  scope: DE
  industries: [handwerk]
  status: needs_verification

- id: HANDWERK_DIGITAL_ATTRAKTIVER
  text_de: "55 % finden, dass digitale Angebote Handwerksbetriebe attraktiver machen."
  footnote_de: "Bitkom Research 2025, 1.004 Befragte ab 16 Jahren"
  source_url: https://www.bitkom.org/Presse/Presseinformation/Handwerkersuche-Gespraech-schlaegt-Netz
  published_at: 2025-06-12
  scope: DE
  industries: [handwerk]
  status: needs_verification

- id: HANDWERK_EMPFEHLUNG_PLUS_WEBSITE
  text_de: "83 % suchen Handwerker über persönliche Empfehlungen, 26 % schauen sich zusätzlich die Websites infrage kommender Betriebe an."
  footnote_de: "Bitkom Research 2025, 1.004 Befragte ab 16 Jahren"
  source_url: https://www.bitkom.org/Presse/Presseinformation/Handwerkersuche-Gespraech-schlaegt-Netz
  published_at: 2025-06-12
  scope: DE
  industries: [handwerk]
  status: needs_verification
  note: "Ehrlich verwenden: Empfehlung ist der Hauptweg, die Website ist der Check danach."

- id: HANDEL_INFO_VORHER
  text_de: "73 % der Internetnutzer wünschen sich, das aktuelle Sortiment eines Geschäfts vor dem Besuch online ansehen zu können."
  footnote_de: "Bitkom Research 2025, 1.180 Internetnutzer ab 16 Jahren"
  source_url: https://www.bitkom.org/Presse/Presseinformation/Attraktivitaet-stationaerer-Handel-Bargeldloses-Bezahlen-wichtiger
  published_at: 2025-02-27
  scope: DE
  industries: [einzelhandel]
  status: needs_verification

- id: HANDEL_RESERVIEREN
  text_de: "74 % der Internetnutzer möchten Produkte vorab online reservieren, um im Laden nicht warten zu müssen."
  footnote_de: "Bitkom Research 2025, 1.180 Internetnutzer ab 16 Jahren"
  source_url: https://www.bitkom.org/Presse/Presseinformation/Attraktivitaet-stationaerer-Handel-Bargeldloses-Bezahlen-wichtiger
  published_at: 2025-02-27
  scope: DE
  industries: [einzelhandel]
  status: needs_verification

- id: TERMIN_ONLINE_GEWOHNT
  text_de: "64 % der Menschen in Deutschland haben schon einmal einen Arzttermin online gebucht – 2023 waren es noch 36 %."
  footnote_de: "Bitkom-Umfrage 2025, 1.145 Befragte ab 16 Jahren, berichtet im Deutschen Ärzteblatt"
  source_url: https://www.aerzteblatt.de/news/digitale-terminvergabe-mittlerweile-standard-e19c819d-2bc4-4c8b-a695-b4f19aa784b9
  published_at: 2025-12-23
  scope: DE
  industries: [beauty, kurse_training, dienstleistung]
  status: needs_verification
  note: "Nur als Beleg für Gewohnheit verwenden ('kennen Online-Buchung schon vom Arzt'). NIE behaupten, dass Kundinnen von Kosmetikstudios zu 64 % online buchen."

- id: TERMIN_KEIN_TELEFONAT
  text_de: "84 % derer, die Termine online buchen oder es sich vorstellen können, nennen als Grund: keine langen Telefonate."
  footnote_de: "Bitkom-Umfrage 2025 zu Arztterminen, 1.145 Befragte ab 16 Jahren"
  source_url: https://www.aerzteblatt.de/news/digitale-terminvergabe-mittlerweile-standard-e19c819d-2bc4-4c8b-a695-b4f19aa784b9
  published_at: 2025-12-23
  scope: DE
  industries: [beauty, kurse_training, dienstleistung]
  status: needs_verification

- id: TERMIN_FLEXIBEL
  text_de: "58 % derselben Gruppe schätzen, Termine flexibel auch außerhalb der Sprechzeiten wählen zu können."
  footnote_de: "Bitkom-Umfrage 2025 zu Arztterminen, 1.145 Befragte ab 16 Jahren"
  source_url: https://www.aerzteblatt.de/news/digitale-terminvergabe-mittlerweile-standard-e19c819d-2bc4-4c8b-a695-b4f19aa784b9
  published_at: 2025-12-23
  scope: DE
  industries: [beauty, kurse_training, dienstleistung]
  status: needs_verification

- id: BEWERTUNG_45_STERNE_US
  text_de: "31 % der Verbraucher in den USA nutzen nur noch Betriebe mit mindestens 4,5 Sternen."
  footnote_de: "BrightLocal Local Consumer Review Survey 2026, 1.002 Erwachsene in den USA"
  source_url: https://www.brightlocal.com/research/local-consumer-review-survey/
  published_at: 2026-02-01
  scope: US
  industries: []
  status: blocked
  note: "US-Daten. Für Briefe gesperrt, nur intern als Kontext."
```

**Erweitere die Bibliothek** (Phase L1) um weitere belastbare, deutsche Quellen, z. B. Bitkom, Statistisches Bundesamt, ZDH, IHK/DIHK, HDE, DEHOGA, Branchenverbände. Regeln für neue Claims: Primärquelle (keine Blog-Zusammenfassungen), Stichprobe und Jahr bekannt, nicht älter als 3 Jahre, Wortlaut exakt. Jeder neue Claim startet als `needs_verification` und braucht meine Freigabe.

---

## B3. Branchen-Playbooks

Lege pro Branche ein Playbook unter `packages/core/playbooks/{branche}.yaml` an: Zuordnung zu Google-Places-Typen, Haupt-Aufhänger, erlaubte Claims, Demo-Schwerpunkte, Brief-Varianten. Die Demo-Website muss den Aufhänger des Briefs **tatsächlich zeigen** (Brief verspricht Speisekarte online → Demo hat Speisekarten-Abschnitt).

| Branche (Playbook-ID) | Google-Typen (Beispiele) | Haupt-Aufhänger | Demo-Schwerpunkt |
|---|---|---|---|
| `gastronomie` | restaurant, cafe, bakery, meal_takeaway, bar | Gäste wollen vorher Speisekarte und Fotos sehen | Speisekarte, Fotos (lizenzfrei, als Beispiel markiert), Öffnungszeiten, Reservierungsanfrage |
| `handwerk` | painter, electrician, plumber, roofing_contractor, carpenter, general_contractor | Kunden prüfen nach der Empfehlung online, ob es den Betrieb „wirklich gibt“ | Leistungen, Einzugsgebiet, Anfrageformular, Abschnitt „Wir stellen ein“ |
| `beauty` | beauty_salon, hair_care, nail_salon, beautician, barber_shop, spa | Kundinnen wollen ohne Telefonat einen Termin anfragen | Leistungen mit „Preise auf Anfrage“, Terminanfrage-Formular (oder Link zum vorhandenen Buchungstool), Öffnungszeiten |
| `einzelhandel` | florist, clothing_store, gift_shop, book_store, pet_store | Kunden wollen vorher sehen, was es gibt | Sortimentsbereiche, Öffnungszeiten, Anfahrt, „Vorab reservieren“-Anfrage |
| `kurse_training` | gym, yoga_studio, dance_school, driving_school, personal_trainer | Interessenten wollen Kursinfos und eine Probestunde ohne Anruf | Angebot, Kursplan (Platzhalter klar markiert), Probetermin-Anfrage |
| `dienstleistung` | photographer, laundry, pet_groomer, tailor, cleaning | Allgemein: online gefunden werden, Anfrage ohne Telefonat | Leistungen, Anfrageformular |

**Ausgeschlossen bis auf Weiteres:** Heilberufe und Gesundheit (Physiotherapie, Heilpraktiker, Ärzte, Apotheken), weil für sie das Heilmittelwerbegesetz und Berufsrecht gelten. Ebenso Anwälte, Steuerberater (Berufsrecht). Der Lead-Finder sortiert diese Typen aus.

---

## B4. Brieftexte pro Branche (Startvarianten „A“)

Allgemeine Regeln für alle Varianten (zusätzlich zu den bestehenden Regeln aus `CLAUDE.md` 5.5: kein Rechnungs-Look, Art.-14- und Art.-21-Hinweis, Absender, Ablaufdatum, QR ≥ 4 × 4 cm, Kurz-URL):
- **Eine Seite**, maximal ca. 200 Wörter Fließtext, maximal **2 Statistiken** pro Brief.
- Struktur immer: Betreff → persönlicher Einstieg → eine belegte Tatsache → was die fertige Seite dafür tut → Angebot mit beiden Preisen → Risiko raus (Garantie, „wenn nicht, nichts tun“) → QR-Code mit Nutzen-Satz.
- Platzhalter `{…}` werden aus Lead-Daten gefüllt. `{CLAIM:ID}` wird wörtlich aus der Claims-Bibliothek eingesetzt, mit Fußnotenziffer.
- Sie-Form. Keine Superlative, keine Ausrufezeichen-Ketten, keine Druckwörter („sofort handeln“, „letzte Chance“).

### B4.1 Gastronomie

> **Betreff: Ihre Speisekarte – jetzt auch für alle, die vorher online schauen**
>
> Guten Tag, liebes Team von {Firmenname},
>
> bevor Gäste zum ersten Mal kommen, schauen viele zuerst im Internet nach. {CLAIM:GASTRO_SPEISEKARTE_ONLINE}¹ Und {CLAIM:GASTRO_WEBSITE_ERWARTET_KURZ}¹
>
> Bisher finden diese Gäste bei Ihnen keine eigene Website. Deshalb habe ich Ihnen eine gebaut: mit Platz für Ihre Speisekarte, Fotos, Öffnungszeiten, Anfahrt und einer Reservierungsanfrage. Sie ist fertig und wartet nur noch auf Ihre echten Gerichte.
>
> [Screenshot]
>
> Gefällt sie Ihnen, gehört sie Ihnen: einmalig **590 €** oder **49 € im Monat** (12 Monate Mindestlaufzeit), inklusive eigener Domain wie **{domain_vorschlag}** und Hosting. Ihre Speisekarte trage ich für Sie ein. {GARANTIE_SATZ}
>
> Wenn nicht, müssen Sie nichts tun. Der Entwurf ist bis **{Ablaufdatum}** online.
>
> Viele Grüße, {ABSENDER_NAME}
>
> [QR] **„Scannen und Ihre Restaurant-Website ansehen“** · {kurz_url}
>
> ¹ Bitkom Research 2024, 1.005 Befragte ab 16 Jahren. Quellen: {TRACK_DOMAIN}/quellen

(`GASTRO_WEBSITE_ERWARTET_KURZ` = Kurzform als eigener Claim anlegen: „69 % erwarten von einem Restaurant oder Café eine Website mit Fotos.“)

### B4.2 Handwerk

> **Betreff: Wenn man Sie empfiehlt, schaut man danach im Internet nach**
>
> Guten Tag, liebes Team von {Firmenname},
>
> die meisten Aufträge im Handwerk kommen über Empfehlungen. Aber viele prüfen danach im Internet, wen man ihnen empfohlen hat. {CLAIM:HANDWERK_OHNE_WEBSITE_AUSSORTIERT}¹
>
> Bei Ihnen finden sie bisher keine eigene Website. Deshalb habe ich Ihnen eine gebaut: Ihre Leistungen, Ihr Einzugsgebiet, ein Anfrageformular und – wenn Sie möchten – ein Bereich „Wir stellen ein“ für neue Mitarbeiter und Azubis.
>
> [Screenshot]
>
> Gefällt sie Ihnen, gehört sie Ihnen: einmalig **590 €** oder **49 € im Monat** (12 Monate Mindestlaufzeit), inklusive eigener Domain wie **{domain_vorschlag}** und Hosting. {GARANTIE_SATZ}
>
> Wenn nicht, müssen Sie nichts tun. Der Entwurf ist bis **{Ablaufdatum}** online.
>
> Viele Grüße, {ABSENDER_NAME}
>
> [QR] **„Scannen und Ihre Betriebs-Website ansehen“** · {kurz_url}
>
> ¹ Bitkom Research 2025, 1.004 Befragte ab 16 Jahren. Quellen: {TRACK_DOMAIN}/quellen

**Variante B Handwerk (Recruiting-Aufhänger, ohne Statistik):** Betreff „Neue Mitarbeiter finden Sie auch über Ihre Website“. Inhalt: Bewerber schauen sich an, wo sie arbeiten würden; die Demo hat eine fertige Karriere-Seite. **Keine Zahl**, solange kein verifizierter Claim zum Bewerberverhalten in der Bibliothek ist.

### B4.3 Beauty (Kosmetik, Nagelstudio, Friseur, Barber)

> **Betreff: Termine anfragen – auch wenn Sie gerade keine Hand frei haben**
>
> Guten Tag, liebes Team von {Firmenname},
>
> während einer Behandlung kann niemand ans Telefon gehen. Viele Kundinnen und Kunden möchten das auch gar nicht mehr: {CLAIM:TERMIN_ONLINE_GEWOHNT}¹ Als wichtigsten Grund nennen sie, lange Telefonate zu vermeiden.¹
>
> Deshalb habe ich Ihnen eine Website gebaut, über die man Ihre Leistungen sieht und rund um die Uhr einen Termin anfragen kann. Sie ist fertig.
>
> [Screenshot]
>
> Gefällt sie Ihnen, gehört sie Ihnen: einmalig **590 €** oder **49 € im Monat** (12 Monate Mindestlaufzeit), inklusive eigener Domain wie **{domain_vorschlag}** und Hosting. Nutzen Sie schon ein Buchungstool, verlinke ich es direkt. {GARANTIE_SATZ}
>
> Wenn nicht, müssen Sie nichts tun. Der Entwurf ist bis **{Ablaufdatum}** online.
>
> Viele Grüße, {ABSENDER_NAME}
>
> [QR] **„Scannen und Ihre Studio-Website ansehen“** · {kurz_url}
>
> ¹ Bitkom-Umfrage 2025 zur Online-Buchung von Arztterminen, 1.145 Befragte ab 16 Jahren. Quellen: {TRACK_DOMAIN}/quellen

(Der Satz „Als wichtigsten Grund …“ ist die Kurzform von `TERMIN_KEIN_TELEFONAT` und muss als eigener Claim angelegt und verifiziert werden. Die Fußnote muss klar sagen, dass es um Arzttermine ging.)

### B4.4 Einzelhandel

> **Betreff: Zeigen Sie online, was es bei Ihnen gibt**
>
> Guten Tag, liebes Team von {Firmenname},
>
> {CLAIM:HANDEL_INFO_VORHER}¹ Wer nicht weiß, was es bei Ihnen gibt, kommt oft gar nicht erst vorbei.
>
> Deshalb habe ich Ihnen eine Website gebaut: mit Ihrem Sortiment, Öffnungszeiten, Anfahrt und einer Möglichkeit, Artikel vorab anzufragen. Sie ist fertig.
>
> [Screenshot]
>
> Gefällt sie Ihnen, gehört sie Ihnen: einmalig **590 €** oder **49 € im Monat** (12 Monate Mindestlaufzeit), inklusive eigener Domain wie **{domain_vorschlag}** und Hosting. {GARANTIE_SATZ}
>
> Wenn nicht, müssen Sie nichts tun. Der Entwurf ist bis **{Ablaufdatum}** online.
>
> Viele Grüße, {ABSENDER_NAME}
>
> [QR] **„Scannen und Ihre Laden-Website ansehen“** · {kurz_url}
>
> ¹ Bitkom Research 2025, 1.180 Internetnutzer ab 16 Jahren. Quellen: {TRACK_DOMAIN}/quellen

### B4.5 Kurse & Training (Fitness, Yoga, Tanz, Fahrschule)

Wie Beauty, mit Fokus „Probestunde / Anmeldung ohne Anruf“, Claims `TERMIN_ONLINE_GEWOHNT` und `TERMIN_FLEXIBEL`. Betreff: „Probestunde buchen – auch abends um 23 Uhr“.

### B4.6 Dienstleistung (Fallback)

Ohne Statistik. Betreff „Ihre neue Website ist schon fertig“ (die bisherige Brief-Variante A aus `CLAUDE.md` 5.5, mit den Änderungen aus Teil A3). Dient zugleich als **Kontrollgruppe**: So messen wir, ob Statistiken überhaupt mehr bringen als ein Brief ohne Zahlen.

---

## B5. LetterXpress-Integration (ersetzt Pingen komplett)

### B5.1 Fakten (geprüft am 23.10.2026 auf der API-Seite, vor dem Bau erneut prüfen)
- API **v3**, Basis-URL `https://api.letterxpress.de/v3`, JSON, Header `Content-Type: application/json`.
- Auth in jedem Request als Objekt `auth: { username, apikey, mode }`. `mode: "test"` legt Aufträge nur in den Warenkorb (nach 7 Tagen gelöscht), `mode: "live"` verarbeitet sofort. API-Key im Kundenbereich unter Funktionen > Zugangsdaten > LXP API.
- Brief: `base64_file` (PDF) und `base64_file_checksum` (MD5 des Base64-Strings). `specification`: `color` (`1` s/w, `4` Farbe), `mode` (`simplex`|`duplex`), `shipping` (`national`|`international`|`auto`), optional `dispatch_date` (yyyy-mm-dd, Zukunft), `registered` (nur national, nicht verwenden).
- Status: `GET /v3/printjobs?filter=queue|hold|done|canceled|draft` (plus `start_date`, `end_date`, `searchstr`). Guthaben: `/v3/balance`. Transaktionen: `/v3/transactions?filter=printjobs`.
- Limits: 50 MB pro Request, **120 Requests/Minute**. Aufträge sind nur **15 Minuten** änderbar oder löschbar.
- **Keine Webhooks** dokumentiert, **keine Zustellbestätigung**, **keine Postkarten** dokumentiert.
- **Nicht nutzen:** die Optionen Überweisungsträger und AGB-Seiten (Rechnungs-Look-Gefahr).
- Lade die PDF-Doku `https://www.letterxpress.de/storage/files/lxp-api_dokumentation.pdf`, lies sie vollständig und ergänze fehlende Endpunkt-Pfade (Upload, Preisabfrage, Einzelauftrag) in `docs/integrations.md`. Nichts raten.

### B5.2 Umsetzung
- `LetterXpressProvider implements MailProvider` mit `send()`, `getStatus()`, `estimatePrice()`, `getBalance()`, `cancel()` (nur innerhalb 15 Min).
- **Rate-Limiter** (max. 100 Requests/Min, Puffer zum Limit), Retries mit Backoff, Idempotenz über unsere `letters.id` im Feld `notice`.
- **Status-Polling-Job** alle 30 Minuten: `queue` → `letters.status=queued`, `done` → `sent` mit `sent_at`.
- **Geschätzte Zustellung:** `estimated_delivered_at = sent_at + DELIVERY_BUSINESS_DAYS` (Config, Standard 3 Werktage; prüfe die aktuellen gesetzlichen Laufzeitvorgaben der Deutschen Post und dokumentiere sie). Das Lernsystem rechnet alle Zeitfenster ab diesem Datum. Ein QR-Scan vor dem geschätzten Datum korrigiert die Schätzung (Scan = Brief ist angekommen) und fließt in eine bessere Laufzeitschätzung ein.
- **Guthaben-Wächter:** Vor jeder Charge `/v3/balance` prüfen. Reicht es nicht, stoppt der Versand und ich bekomme eine Meldung.
- **Folgebriefe:** Da Postkarten nicht dokumentiert sind, ist der Follow-up ein kurzer einseitiger Brief. Wenn die PDF-Doku Postkarten nennt, als Option ergänzen.
- `.env`: `MAIL_PROVIDER=letterxpress`, `LXP_USERNAME=`, `LXP_APIKEY=`, `LXP_MODE=test`. Pingen-Variablen entfernen oder als inaktive Alternative stehen lassen.
- **Ablauf vor dem ersten echten Versand:** 3 Testaufträge mit `mode=test` im Warenkorb prüfen → 1 echter Brief an meine eigene Adresse → erst dann echte Leads.

### B5.3 Brief-Rendering mit Slots
Briefe sind keine freien Texte, sondern **Templates mit Slots**: `subject`, `opening`, `claim_slot_1`, `claim_slot_2`, `benefit`, `offer`, `risk_reversal`, `qr_label`. Jede Variante ist ein Satz von Slot-Werten. So kann das Lernsystem gezielt **einen** Slot verändern und dessen Wirkung messen.

### B5.4 Wahrheits-Check (blockierend, vor jeder Freigabe)
1. Alle Zahlen, Prozentangaben und Faktoren im gerenderten Text extrahieren.
2. Jede Zahl muss aus einem Claim mit `status: approved` stammen, der für diese Branche erlaubt ist, oder ein erlaubter Platzhalterwert sein (Preise, Datum, Domain, Adresse).
3. Sperrliste (Regex, erweiterbar): `\d+\s*(x|-mal|fach)`, „garantiert mehr“, „nachweislich“, „bewiesen“, „mehr Umsatz“, „mehr Kunden garantiert“, „Rechnung“, „Zahlungsfrist“, „letzte Chance“, „sofort handeln“, „kostenlos“ (nur erlaubt in „kostenlos ansehen“).
4. Fußnote vorhanden für jeden verwendeten Claim, Quellenseite erreichbar.
5. Zusätzlich LLM-Prüfung (`MODEL_BULK`): „Enthält der Brief eine Aussage über Wirkung, Umsatz oder Erfolg, die nicht wörtlich aus einem Claim stammt?“ Antwort strukturiert, bei „ja“ blockieren.
6. Ergebnis im Brief-Datensatz speichern (`truth_check_json`). Kein Versand ohne `passed`.

### B5.5 Quellenseite
`{TRACK_DOMAIN}/quellen` listet alle aktuell in Briefen genutzten Claims mit vollem Wortlaut, Quelle, Link, Datum und Stichprobe. Wird automatisch aus der Claims-Tabelle erzeugt.

---

## B6. Das Lernsystem

### B6.1 Was gemessen wird (pro Brief, über den QR-Token zugeordnet)
| Signal | Quelle |
|---|---|
| Versendet, geschätzt zugestellt | LetterXpress-Status + Laufzeitschätzung |
| QR-Scan oder Kurz-URL-Aufruf, Zeitpunkt, Gerätetyp (grob) | `/q/{token}`, `/{kurzcode}` |
| Demo-Verweildauer, Scrolltiefe, angeklickte Abschnitte | Server-seitige Events ohne Cookies (Beacon mit Token) |
| Klick „Seite übernehmen“, gewählte Option (590 € / 49 €) | Demo |
| Checkout gestartet, abgebrochen, bezahlt | Stripe-Webhooks |
| WhatsApp-Klick, Formularfrage (Inhalt klassifiziert) | Demo, Support-Agent |
| Opt-out („Kein Interesse“), Beschwerde | Demo, E-Mail |
| Rücksendung „unzustellbar“ | manuell im Dashboard erfassen (Button am Lead) |

**Datenschutz bleibt wie in `CLAUDE.md`:** keine vollen IPs, keine Tracking-Cookies, nur Ereignisse am Token.

### B6.2 Metriken
- **Hauptmetrik:** Käufe pro zugestelltem Brief (`purchase_rate`). Beide Preisoptionen zählen als Kauf; zusätzlich **Umsatz pro Brief** (Monatsplan bewertet mit 12 × 49 € plus erwartete Folgemonate à 19 € abzüglich erwarteter Kündigungen, Config).
- **Frühindikatoren:** Scan-Rate, Klickrate „Seite übernehmen“ pro Scan, Checkout-Start pro Klick, Opt-out-Rate.
- **Kosten:** Kosten pro Brief (aus LetterXpress-Transaktionen), Kosten pro Kauf (CAC), ROI.
- **Zeitfenster:** Ein Brief gilt als „ausgewertet“, wenn 45 Tage seit geschätzter Zustellung vergangen sind (Config). Vorher fließt er nur in die Frühindikatoren ein.

### B6.3 Statistik ehrlich machen
Mit 40 Briefen pro Woche sind Unterschiede beim Kauf statistisch kaum messbar. Deshalb:
- **Bayes statt Bauchgefühl:** Für jede Variante Beta-Verteilungen für Scan-Rate und Kauf-Rate. Im Dashboard immer **Spanne** statt Einzelwert anzeigen („Scan-Rate 2,1 % – 6,8 %, 90 % Wahrscheinlichkeit“).
- **Hierarchisches Modell (Partial Pooling):** Varianten lernen voneinander über die Branche, Branchen voneinander über das Gesamtmittel. So erzeugen 5 Briefe in einer kleinen Branche keine Fantasiewerte.
- **Entscheidungsregel:** Eine Variante gilt erst als „Gewinner“, wenn P(besser als Kontrolle) ≥ 90 % **und** jede Variante mindestens `MIN_LETTERS_PER_ARM=100` zugestellte Briefe hat. Davor nur „Tendenz“.
- **Scan-Rate als Lern-Signal, Kauf als Richter:** Solange zu wenige Käufe da sind (< 5 pro Arm), steuert der Optimizer über die Scan-Rate. Sobald genug Käufe da sind, über Umsatz pro Brief.
- **Power-Rechner** im Dashboard: „Um einen Unterschied von 2 % auf 3 % Scan-Rate sicher zu erkennen, brauchst du ca. N Briefe pro Variante.“ So sehe ich, wie lange ein Test dauert.
- **Kontrollgruppe:** Mindestens 15 % jeder Charge gehen an die aktuelle Standard-Variante, damit Veränderungen über die Zeit (Saison, Ferien) nicht mit Varianten-Effekten verwechselt werden.

### B6.4 Was das System lernt und automatisch anpasst
Auf drei Ebenen, jeweils mit Grenzen:

1. **Varianten (welcher Brief):** Thompson Sampling verteilt die nächste Charge auf Varianten pro Branche. Mindestanteil 20 % Exploration, 15 % Kontrolle.
2. **Zielgruppe (wem):** Ab 300 ausgewerteten Briefen ein einfaches Modell (logistische Regression mit Regularisierung), das vorhersagt, welche Leads scannen bzw. kaufen. Merkmale: Branche, Segment (neu / social_only / etabliert), Bewertungsanzahl, Rating, Stadtteil, Social-Media-Link vorhanden, Öffnungszeiten vorhanden. Der Lead-Score wird damit gewichtet. Merkmale nach Art. 9 DSGVO oder Personenmerkmale werden **nie** verwendet, nur Betriebsdaten.
3. **Timing (wann):** `dispatch_date` so wählen, dass Briefe bevorzugt an den Wochentagen ankommen, die die höchste Scan-Rate zeigen (erst ab ausreichend Daten, vorher Standard Di–Do).

**Was das System nie automatisch ändert:** Preise außerhalb der Config-Grenzen, Garantie, rechtliche Pflichtangaben, Claims, Ausschluss-Branchen, Budget über `WEEKLY_BUDGET_CENTS`.

### B6.5 Der Lern-Agent (wöchentlich, sonntags)
Ein Claude-Agent (`MODEL_CREATIVE`) bekommt einen strukturierten Datenexport (keine personenbezogenen Daten, nur Betriebsname-freie Aggregatwerte) und erzeugt:

1. **Wochenbericht** (`reports/woche-{KW}.md`, im Dashboard und per Mail an mich):
   - Was wurde verschickt, was ist angekommen, Scan-, Klick-, Kauf- und Opt-out-Raten pro Branche und Variante mit Spannen
   - Was hat sich gegenüber der Vorwoche verändert, was ist nur Zufall (klar kennzeichnen)
   - Häufigste Einwände aus WhatsApp- und Formularfragen (vom Support-Agent klassifiziert, z. B. „zu teuer“, „habe schon Instagram“, „wer sind Sie?“, „Domain schon vorhanden“)
   - Wo im Ablauf die meisten abspringen (Scan → Demo → Übernehmen → Checkout → Kauf)
2. **Hypothesen** (max. 3), jede mit Begründung aus den Daten, z. B. „Handwerk-Briefe werden gescannt, aber die Demo wird kurz angesehen → Hypothese: Leistungen auf der Demo zu allgemein.“
3. **Neue Varianten-Vorschläge** (max. 2 pro Branche und Woche):
   - Es wird **immer nur ein Slot** geändert (Betreff **oder** Claim **oder** Nutzen-Satz **oder** QR-Text **oder** Preisdarstellung **oder** Demo-Abschnitt).
   - Claims nur per ID aus der freigegebenen Bibliothek. Der Agent darf vorschlagen, nach einem neuen Claim zu recherchieren, aber nicht selbst einen erfinden.
   - Einwände aus Fragen werden direkt adressiert (z. B. Einwand „Domain habe ich schon“ → Nutzen-Satz „Ihre vorhandene Domain können Sie mitnehmen“, nur wenn das technisch umgesetzt ist).
   - Jede Variante läuft durch den Wahrheits-Check (B5.4).
4. **Aufräumen:** Varianten, die mit P ≥ 95 % schlechter als die Kontrolle sind, werden pausiert. Maximal 4 aktive Varianten pro Branche.

**Freigabe:** Neue Varianten gehen in eine Review-Queue. Nur wenn `AUTO_ACTIVATE_VARIANTS=true` gesetzt ist **und** die Variante nur Betreff, Nutzen-Satz oder QR-Text ändert, darf sie ohne mich starten. Alles andere braucht mein OK.

**Experiment-Logbuch:** Jede Variante, Hypothese, Laufzeit, Ergebnis und Entscheidung landet in `docs/experiments.md` und in der Tabelle `experiments`. Der Lern-Agent liest dieses Logbuch jede Woche, damit er keine schon widerlegten Ideen erneut testet.

### B6.6 Lernen über die Demo-Seite
Die gleiche Logik gilt für Demo-Varianten: Position und Text des „Seite übernehmen“-Buttons, Reihenfolge der Preiskarten, Vertrauensblock offen/zu, Video an/aus. Gemessen wird Klickrate pro Demo-Aufruf und Kauf pro Klick. Varianten über die bestehende Tabelle `variants` (`kind: demo_banner|price`).

### B6.7 Sicherheitsnetze
- **Opt-out-Bremse:** Steigt die Opt-out-Rate einer Variante über 5 % der Scans oder kommt eine Beschwerde wegen „Abzocke“/„Täuschung“, wird die Variante sofort pausiert und ich werde benachrichtigt.
- **Unzustellbar-Bremse:** Mehr als 3 % unzustellbare Briefe in einer Charge → Lead-Qualität prüfen, Versand pausiert.
- **Kostenbremse:** Kosten pro Kauf über `MAX_CAC_CENTS` (Standard 20000) für 4 Wochen in Folge → Budget automatisch halbieren, Bericht an mich.

---

## B7. Datenmodell-Ergänzungen

- `claims` (siehe Abschnitt B2), `claim_usages` (letter_id, claim_id)
- `playbooks` (id, branche, google_types[], hook, allowed_claim_ids[], demo_sections[])
- `variants`: zusätzlich `industry`, `slots_json`, `parent_variant_id`, `changed_slot`, `hypothesis`, `status` (`proposed`|`active`|`paused`|`retired`), `created_by` (`human`|`learning_agent`)
- `letters`: zusätzlich `industry`, `truth_check_json`, `lxp_job_id`, `estimated_delivered_at`, `delivery_corrected_at`, `undeliverable` (bool)
- `experiments` (id, industry, hypothesis, variant_ids[], control_variant_id, started_at, ended_at, result_json, decision, notes)
- `objections` (id, lead_id, source `whatsapp`|`form`|`email`, category, text_hash, created_at); Texte selbst nach 90 Tagen löschen, Kategorien behalten
- `weekly_reports` (id, week, markdown, metrics_json, created_at)
- Materialisierte Sicht `funnel_by_arm` (Branche × Variante × Segment × Woche) für Dashboard und Lern-Agent

---

## B8. Dashboard-Ergänzungen

- **Branchen-Übersicht:** Funnel pro Branche mit Spannen, Kosten pro Kauf, bester Variante
- **Varianten-Labor:** aktive, vorgeschlagene, pausierte Varianten; Diff-Ansicht (welcher Slot wurde geändert); Freigeben/Ablehnen; Power-Rechner
- **Claims-Verwaltung:** Liste mit Status, Quelle, Ablaufdatum, Verifikationsnotiz; Freigabe-Button
- **Wochenbericht** des Lern-Agents mit Hypothesen
- **Einwände:** Top-Kategorien pro Branche, Verlauf über die Zeit
- **LetterXpress:** Guthaben, offene Aufträge, Kosten pro Brief

---

## B9. Neue Bausteine (werden laut Abschnitt 0 in den bestehenden Phasenplan eingeordnet)

**Phase L1: Claims und Playbooks**
Claims-Bibliothek anlegen, jede Quelle aufrufen und verifizieren, Ergebnis in `docs/claims-verifikation.md`, Bibliothek um weitere deutsche Primärquellen erweitern (als `needs_verification`). Playbooks für 6 Branchen, Lead-Finder auf Branchen-Zuordnung und Ausschluss-Branchen umstellen.
✅ Abnahme: Ich gebe die Claims im Dashboard frei.

**Phase L2: Branchen-Briefe und Wahrheits-Check**
Slot-Templates, Startvarianten aus Abschnitt B4, Wahrheits-Check, Quellenseite, branchenspezifische Demo-Abschnitte.
✅ Abnahme: Je 2 Brief-PDFs pro Branche zur Ansicht. Ein absichtlich falscher Testbrief („5-mal mehr Umsatz“) wird vom Check blockiert.

**Phase L3: LetterXpress**
Provider, Rate-Limiter, Status-Polling, Laufzeitschätzung, Guthaben-Wächter, Testmodus.
✅ Abnahme: 3 Aufträge im Test-Warenkorb, danach 1 echter Brief an mich (nur nach meinem OK).

**Phase L4: Messung**
Alle Events aus B6.1, Funnel-Sicht, Zeitfenster, Dashboard-Funnel.
✅ Abnahme: Ein simulierter Lead-Durchlauf (Scan → Demo → Kauf im Stripe-Testmodus) erscheint vollständig im Funnel.

**Phase L5: Optimizer und Statistik**
Bayes-Modelle mit Partial Pooling, Thompson Sampling, Kontrollgruppe, Power-Rechner, Sicherheitsnetze. Teste mit **simulierten Daten** (Generator mit bekannten wahren Raten), dass das System nach genügend Briefen die bessere Variante findet und bei zu wenig Daten keine falschen Gewinner ausruft.
✅ Abnahme: Simulationsbericht mit 3 Szenarien.

**Phase L6: Lern-Agent**
Wöchentlicher Bericht, Hypothesen, Varianten-Vorschläge mit Ein-Slot-Regel, Experiment-Logbuch, Review-Queue, Einwand-Klassifizierung.
✅ Abnahme: Ein Probelauf auf den simulierten Daten erzeugt einen verständlichen Bericht und regelkonforme Vorschläge.

**Phase L7: Zielgruppen-Modell und Timing**
Erst aktivieren, wenn ≥ 300 ausgewertete Briefe vorhanden sind. Bis dahin nur vorbereiten und mit Simulation testen.

---

## B10. Erste echte Charge (ersetzt die Startparameter aus `CLAUDE.md` Abschnitt 10)

- 40 Briefe, verteilt auf **Gastronomie, Handwerk, Beauty** (je ca. 13), Dortmund, Wochenbudget wie in `CLAUDE.md` (60 €, Config)
- Lead-Filter: Rating ≥ 4,5; Segment „neu“ (3–20 Bewertungen) und „social_only“ zuerst, danach „etabliert“ (≥ 30 Bewertungen)
- Pro Branche: Startvariante aus B4 (mit Statistik) gegen die neutrale Variante ohne Statistik (Text aus B4.6) als Kontrolle, **50/50**. Die Regeln aus B6.3/B6.4 (15 % Kontrolle, 20 % Exploration, Thompson Sampling) gelten erst ab der zweiten Charge.
- Ziel der ersten 4 Wochen: **nicht** Gewinner finden, sondern Messkette prüfen und erste Scan-Raten mit Spannen sehen

---

**Start:** Schließe zuerst die aktuelle Phase ab. Übernimm dann Teil A, aktualisiere `CLAUDE.md` (Abschnitt 0, Punkt 4), sag mir kurz, was du angepasst hast, zeig mir die neue Phasenliste mit den eingeordneten Bausteinen L1–L7 und stelle mir alle offenen Fragen gesammelt in einer Nachricht. Erst nach meinem OK geht es weiter.
