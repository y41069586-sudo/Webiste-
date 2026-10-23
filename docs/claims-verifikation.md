# Claims-Verifikation

Prüfprotokoll zur Claims-Bibliothek (`packages/core/claims/claims.yaml`, Update 2 B1/B2). Jede `source_url`
wurde am **23.10.2026** abgerufen und Zahl, Wortlaut, Jahr und Stichprobe mit dem Original verglichen.
Der Wortlaut der Quelle steht je Claim unter `check.quote` und im Dashboard („Claims & Playbooks“).

**Status:** Kein Claim ist freigegeben. Die Freigabe erfolgt nur durch dich im Dashboard
(Häkchen „selbst geprüft“ + „Freigeben“). Das System lässt eine Freigabe nur zu, wenn die Prüfung
bestanden ist (`ok`/`corrected`), die Quelle deutsch und nicht älter als 24 Monate ist.

## Ergebnis auf einen Blick

| Claim                             | Prüfung                  | Status nach Abgleich      | Was geändert wurde                                                                |
| --------------------------------- | ------------------------ | ------------------------- | --------------------------------------------------------------------------------- |
| GASTRO_WEBSITE_ERWARTET           | korrigiert               | **gesperrt (abgelaufen)** | „mit Fotos“ → „zum Beispiel Fotos … ansehen lassen“ (Original: nur Beispiel)      |
| GASTRO_WEBSITE_ERWARTET_KURZ      | korrigiert (neu, B4.1)   | **gesperrt (abgelaufen)** | Kurzform ohne „mit Fotos“, weil das Original Fotos nur als Beispiel nennt         |
| GASTRO_SPEISEKARTE_ONLINE         | korrigiert               | **gesperrt (abgelaufen)** | Ergänzt: „bevor sie ein **neues** Restaurant oder Café besuchen“                  |
| GASTRO_RESERVIERUNG_ONLINE        | stimmt                   | **gesperrt (abgelaufen)** | „direkt online“ wie im Original                                                   |
| GASTRO_ONLINE_SUCHE               | Primärquelle fehlt (neu) | wartet, Freigabe gesperrt | –                                                                                 |
| GASTRO_TISCH_ONLINE_RESERVIERT    | Primärquelle fehlt (neu) | wartet, Freigabe gesperrt | –                                                                                 |
| HANDWERK_OHNE_WEBSITE_AUSSORTIERT | korrigiert               | wartet auf Freigabe       | „kommt nicht infrage“ → „Ausschlusskriterium“ (Wortlaut des Originals)            |
| HANDWERK_DIGITAL_ATTRAKTIVER      | stimmt                   | wartet auf Freigabe       | –                                                                                 |
| HANDWERK_EMPFEHLUNG_PLUS_WEBSITE  | korrigiert               | wartet auf Freigabe       | „zusätzlich“ gestrichen (Mehrfachnennung, keine Teilmenge)                        |
| HANDEL_INFO_VORHER                | korrigiert               | wartet auf Freigabe       | „Sortiment ansehen“ → „Informationen über das aktuelle Produktangebot abrufen“    |
| HANDEL_RESERVIEREN                | korrigiert               | wartet auf Freigabe       | „nicht warten müssen“ → „Wartezeiten im Laden zu minimieren“                      |
| TERMIN_ONLINE_GEWOHNT             | korrigiert               | wartet auf Freigabe       | Primärquelle Bitkom (22.12.2025) statt Ärzteblatt; „gebucht“ → „vereinbart“       |
| TERMIN_KEIN_TELEFONAT             | korrigiert               | wartet auf Freigabe       | „keine langen Telefonate“ → „nicht von der telefonischen Erreichbarkeit abhängig“ |
| TERMIN_KEIN_TELEFONAT_KURZ        | korrigiert (neu, B4.3)   | wartet auf Freigabe       | Kurzform wie oben, nicht „lange Telefonate vermeiden“                             |
| TERMIN_FLEXIBEL                   | korrigiert               | wartet auf Freigabe       | **„außerhalb der Sprechzeiten“ war falsch** → „etwa zu Randzeiten“                |
| TERMIN_BEHOERDE_ONLINE            | stimmt (neu)             | wartet auf Freigabe       | –                                                                                 |
| BEWERTUNG_45_STERNE_US            | stimmt                   | gesperrt (US-Daten)       | Datum 01.02. → 11.02.2026                                                         |

## Wichtig: Gastro-Quelle ist abgelaufen

Die Bitkom-Gastro-Studie ist vom **27.06.2024**. Nach deiner Regel (Veröffentlichung + 24 Monate) ist sie seit
dem **27.06.2026** veraltet. Alle vier Bitkom-Gastro-Claims werden deshalb automatisch gesperrt, mit Meldung
„Quelle veraltet, neuere Studie suchen“. Eine neuere Bitkom-Studie zu Restaurants habe ich nicht gefunden.

Ersatzkandidat: die YouGov-Umfrage im Auftrag von METRO und DISH (Januar 2025, 2.000 Befragte, gültig bis
Februar 2027). Gefunden habe ich sie aber nur in Sekundärberichten (food-monitor.de, tageskarte.io,
meininger.de). Die METRO-Seiten blockieren den automatischen Abruf (HTTP 403). Deshalb stehen
`GASTRO_ONLINE_SUCHE` und `GASTRO_TISCH_ONLINE_RESERVIERT` auf „Primärquelle fehlt“. Das Dashboard
lässt sie nicht freigeben, bis die Primärquelle (METRO-Pressemitteilung oder Studienbericht) eingetragen ist.

**Bis dahin bekommt Gastronomie Briefe ohne Statistik** (wie die Fallback-Variante).

## Einzelprüfung

### Bitkom: Restaurants und Cafés (27.06.2024)

- URL: <https://www.bitkom.org/Presse/Presseinformation/Restaurants-und-Cafes-Online-Bewertungen-entscheidend>
- Methodik laut Seite: 1.005 Personen in Deutschland ab 16 Jahren, telefonisch, KW 18–21 2024, „Die Umfrage ist repräsentativ“.
- „Dementsprechend erwartet generell die große Mehrheit von 69 Prozent, dass ein Café oder Restaurant einen
  Internetauftritt hat, wo sich zum Beispiel Fotos der Speisen und Räumlichkeiten anschauen lassen.“
- „Über die Hälfte (53 Prozent) schaut sich dabei in der Regel online die Speisekarte an, bevor sie ein neues
  Restaurant oder Café besucht. Unter den 16- bis 29-Jährigen haben sogar knapp zwei Drittel (65 Prozent) diese Angewohnheit.“
- „47 Prozent aller Befragten reservieren auch einen Tisch am liebsten direkt online.“

### Bitkom: Handwerkersuche (12.06.2025)

- URL: <https://www.bitkom.org/Presse/Presseinformation/Handwerkersuche-Gespraech-schlaegt-Netz>
- Methodik: 1.004 Personen in Deutschland ab 16 Jahren, KW 7–10 2025, repräsentativ.
- „… ist über die Hälfte der Deutschen der Meinung, dass digitale Angebote Handwerksbetriebe durchaus attraktiver
  machen (55 Prozent) – für 4 von 10 (40 Prozent) ist das Fehlen einer Webseite sogar ein Ausschlusskriterium bei
  der Wahl eines entsprechenden Betriebs.“
- „8 von 10 Deutschen holen sich bei der Entscheidung für einen Handwerksbetrieb Rat im persönlichen Gespräch mit dem
  Freundeskreis, der Familie oder Kolleginnen und Kollegen (83 Prozent).“ / „… etwa ein Viertel klickt sich durch die
  Webseiten möglicher Betriebe (26 Prozent).“

### Bitkom: Stationärer Handel (27.02.2025)

- URL: <https://www.bitkom.org/Presse/Presseinformation/Attraktivitaet-stationaerer-Handel-Bargeldloses-Bezahlen-wichtiger>
- Methodik: 1.180 Internetnutzerinnen und -nutzer in Deutschland ab 16 Jahren, online, KW 40–43 2024, „Die Gesamtumfrage ist repräsentativ“.
- „Knapp drei Viertel (74 Prozent) der Internetnutzerinnen und -nutzer wollen Produkte vorab online reservieren,
  um Wartezeiten im Laden zu minimieren, 73 Prozent wollen vorab Online-Informationen über das aktuelle Produktangebot
  vor Ort abrufen können.“

### Bitkom: Arzttermine online (22.12.2025)

- Primärquelle: <https://www.bitkom.org/Presse/Presseinformation/Zwei-Drittel-vereinbaren-Arzttermine-online>
  (die Startliste verwies auf den Ärzteblatt-Bericht vom 23.12.2025, einen Sekundärbericht).
- Methodik: 1.145 Personen in Deutschland ab 16 Jahren, telefonisch, KW 38–43 2025, repräsentativ.
- „Bereits 64 Prozent der Deutschen haben inzwischen mindestens einmal einen Arzttermin online vereinbart. Damit ist
  der Anteil innerhalb von zwei Jahren stark gestiegen: 2024 lag er noch bei 50 Prozent, 2023 sogar erst bei 36 Prozent.“
- „Als größter Vorteil der digitalen Terminbuchung gilt die Unabhängigkeit von den telefonischen Erreichbarkeiten der
  Praxen: 84 Prozent der Befragten, die die Online-Terminvereinbarung nutzen oder sich dies vorstellen können, nennen diesen Punkt.“
- „58 Prozent schätzen die flexible Auswahl an Terminen, etwa zu Randzeiten.“ Die Bezugsgruppe der 58 % steht nicht
  ausdrücklich dabei, deshalb kein „derselben Gruppe“ im Claim.
- Hinweis zu B4.3: Der Beauty-Brief überträgt das Verhalten bei Arztterminen auf „Kundinnen und Kunden“. Der Claim
  darf nur als Beleg für die Gewohnheit stehen, und die Fußnote muss „zu Arztterminen“ nennen. Der Wahrheits-Check (L2)
  prüft die Fußnote.

### Bitkom: Online aufs Amt (13.10.2026), neu

- URL: <https://www.bitkom.org/Presse/Presseinformation/Online-Amt-bleibt-Ausnahme>
- Methodik: 1.004 Personen in Deutschland ab 18 Jahren, telefonisch, KW 33–37 2026, repräsentativ.
- „So haben 72 Prozent der Bürgerinnen und Bürger schon einmal online einen Termin bei einer Behörde vereinbart …“
- Nutzen: aktueller Beleg (gültig bis 10/2028) für die Gewohnheit, Termine online zu vereinbaren.

### BrightLocal: Local Consumer Review Survey 2026 (11.02.2026)

- URL: <https://www.brightlocal.com/research/local-consumer-review-survey/>
- Methodik: „representative panel of 1,002 US adult consumers via SurveyMonkey“.
- „31% of consumers will only use a business that has 4.5+ stars“. Bleibt für Briefe gesperrt (US-Daten).

## Geprüft und verworfen

| Quelle                                                           | Grund                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| Bitkom „Mehr als jeder Dritte reserviert Restauranttisch online“ | Januar 2019 – älter als 3 Jahre                                  |
| Bitkom „Jeder Zweite liest Online-Bewertungen vor dem Kauf“      | Januar 2020 – älter als 3 Jahre, Online-Shopping                 |
| Bitkom „Interesse an Online-Handwerksportalen“                   | Februar 2024 – läuft 02/2026 ab, Thema Portale                   |
| HDE Online-Monitor 2025/2026                                     | keine Zahl zur Online-Recherche vor dem Ladenkauf gefunden       |
| Destatis IKT in Unternehmen                                      | keine aktuelle Pressemitteilung zu Unternehmenswebsites gefunden |

## Ablauf und Pflege

- Täglicher Job `claims` (06:25): Claims-Datei abgleichen, abgelaufene Quellen sperren, Meldung im Dashboard.
- Ändern sich Text, Fußnote, Quelle, Datum oder Stichprobe eines Claims in der Datei, fällt er auf „wartet auf
  Freigabe“ zurück.
- Neue Claims: Primärquelle, Stichprobe und Jahr bekannt, nicht älter als 3 Jahre, Wortlaut exakt, `check` mit
  Zitat ausfüllen, dieses Protokoll ergänzen.
