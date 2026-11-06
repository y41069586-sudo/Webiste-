# Entscheidungen und Abweichungen

## 05.11.2026 – Neuaufbau der kreativen Demo-Erzeugung als Gestaltungsstudio

Betreiber verlangt individuell gestaltete Websites auf dem Niveau der Osteria-Sera-Studie,
keine feste Vorlagenfamilie. Separates Art-Direction-Briefing mit zwei Richtungen und begründeter
Wahl, tatsächliche Bildanhänge für Konzept/Umsetzung, freie HTML/CSS-Ausgabe und unabhängige
Desktop-/Mobil-Sichtprüfung mit Übersicht und drei Detailausschnitten. Sechs konkrete
Gestaltungsbefunde sind Pflicht; technische Fehlerfreiheit allein ist keine Designabnahme.
Kein Fallback-Kit, keine zufällige Branchenstimme, kein Mock-Qualitätssiegel. Zusätzlicher
Konzeptaufruf über vorhandenes Kosten-Ledger; Modelle/Budgets und operative Schalter unverändert.
Strict-Schema-Fix c5bf351 erhalten. Einzelheiten, Tests und offene echte Modellabnahme:
`docs/design-studio.md`. Kein Nachweis einer Produktionsaktivierung durch diesen Codeauftrag.

Kurz begründete Umsetzungsentscheidungen. Offene Punkte, die eine Entscheidung des Betreibers brauchen,
stehen am Ende.

## Update 2, Teil A (umgesetzt)

| Thema                                 | Entscheidung                                                                                                                                                                                                                                             | Grund                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Preise                                | Option A 590 € (`mode=payment`), Option B 49 €/Monat (`mode=subscription`), danach 19 €/Monat; alles in `pricing.*` einstellbar                                                                                                                          | A1                                                                                                     |
| Mindestlaufzeit Option B              | Stripe Subscription Schedule (Phase 1 bis Start + 12 Kalendermonate mit `end_date`, Phase 2 19 € mit `duration`, `end_behavior: release`)                                                                                                                | `phases[].iterations` ist in den aktuellen SDK-Typen nicht mehr vorhanden; Stripe empfiehlt `duration` |
| Rechnungen Option B                   | Jede Rate bekommt eine eigene Rechnung mit fortlaufender Nummer (`order_payments`); Rate 1 steckt in der Bestellrechnung                                                                                                                                 | § 14 UStG, gleiche Rechnungslogik wie Option A                                                         |
| „Hosting & Pflege“ nach Option A      | Rechnungen für diese Raten entstehen ebenfalls automatisch (`invoice.paid`)                                                                                                                                                                              | bisher fehlte eine Rechnung je Abo-Zahlung                                                             |
| Zahlungsausfall                       | Smart Retries (Stripe), Hinweis-Mail mit Bezahllink; nach dem letzten Versuch bzw. Abo `unpaid` → Wartungsmodus (neutrale Ersatzseite ohne Grund) + Meldung; Zahlung → automatisch wieder online                                                         | A1; Dritte sollen den Grund nicht sehen                                                                |
| Garantie                              | Nur per Admin-Button mit getippter Bestätigung (löst echte Erstattung aus); Domain-Übertragung/Kündigung wird als Aufgabe gemeldet, nicht automatisch ausgeführt                                                                                         | keine echten Zahlungen/Domainaktionen ohne Freigabe                                                    |
| Checkout-Opt-in „Abo nach 12 Monaten“ | Aus der Oberfläche entfernt; Option A bekommt den Abo-Link nur in der Erinnerungs-Mail                                                                                                                                                                   | A1 („in v1 nur Erinnerungs-Mail“)                                                                      |
| Preiskarten                           | Auf der Demo (Abschnitt „Diese Seite übernehmen“) und im Checkout; keine Vorauswahl. Wählt der Betrieb auf der Demo-Karte eine Option, ist sie im Checkout vorausgewählt (seine eigene Wahl)                                                             | A4                                                                                                     |
| WhatsApp                              | Nur `wa.me`-Link auf die Betreibernummer; ohne hinterlegte Nummer erscheint stattdessen „Frage stellen“ (Formular)                                                                                                                                       | A4, § 7 UWG                                                                                            |
| Foto im Vertrauensblock               | Wird beim Bau der Demo eingebettet (Demo-CSP erlaubt nur eingebettete Bilder)                                                                                                                                                                            | Sicherheit/Datenschutz der Demo-Seite                                                                  |
| Brief                                 | QR 41 × 41 mm (automatische Prüfung ≥ 40 mm), Nutzen-Satz „Scannen und Ihre fertige Website ansehen – online bis {Datum}“, Kurz-URL `{TRACK_DOMAIN}/{kurzcode}` (6 Zeichen ohne verwechselbare Zeichen), beide Preise mit Mindestlaufzeit, Garantie-Satz | A3                                                                                                     |
| „online bis …“                        | Das genannte Datum wird am Brief gespeichert; die Demo läuft mindestens bis dahin. Ein Brief, dessen Datum nach der geschätzten Zustellung weniger als 7 Tage Luft hat, wird nicht versendet                                                             | Aussage im Brief muss stimmen                                                                          |
| Sendung 2                             | Text „nur noch bis {Datum} online“ statt „nur noch 7 Tage“ (Datum = geschätzte Zustellung + 7 Tage); die Demo wird nie verkürzt                                                                                                                          | bleibt wahr, auch wenn die Demo ohnehin länger läuft                                                   |
| Sendung 3                             | Heißer Lead → zuerst neue Demo-Version (anderes Template, neue Inhalte) mit **Pflicht-Prüfung**; erst nach deren Veröffentlichung wird Brief 3 erzeugt. Der Brief erwähnt nicht, dass der Betrieb die Seite angesehen hat                                | „wirklich verbessern“; Datenschutz-Takt                                                                |
| Erinnerungs-Mail                      | Höchstens eine, 7 Tage vor Demo-Ablauf, nur wenn der Lead uns selbst mit E-Mail geschrieben hat; Abmeldelink (Bestätigungsseite + One-Click nach RFC 8058)                                                                                               | A5, § 7 UWG                                                                                            |
| Segmente                              | „neu“ = Segment wurde schon früher durchsucht, Betrieb erst ≥ 6 Tage später aufgetaucht, 3–20 Bewertungen, max. 90 Tage ab erstem Auftauchen; Score-Bonus neu 6 / social_only 3                                                                          | A2                                                                                                     |
| LetterXpress                          | ENV-Variablen vorhanden; `MAIL_PROVIDER=letterxpress` meldet bis Baustein L3 einen klaren Fehler (kein stiller Mock)                                                                                                                                     | L3 wartet auf Freigabe                                                                                 |

## Baustein L1: Claims und Playbooks (umgesetzt)

| Thema                       | Entscheidung                                                                                                                                                                    | Grund                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Quelle der Wahrheit         | `packages/core/claims/claims.yaml` (Text, Quelle, Prüfergebnis mit Zitat); Status in der Tabelle `claims` setzt nur der Betreiber (Dashboard) bzw. der Ablauf-Job               | Text versioniert im Repo, Freigabe nachvollziehbar                            |
| Freigabe-Sperren            | Keine Freigabe bei Quelle älter als 24 Monate, Nicht-DE-Daten, eigenen Daten (B1.6), fehlender Primärquelle oder nicht bestandener Prüfung                                      | B1/B2                                                                         |
| Inhaltsänderung             | Hash über Text, Fußnote, URL, Datum, Scope, Stichprobe; ändert er sich, fällt ein freigegebener Claim auf „wartet auf Freigabe“ zurück                                          | Freigabe gilt nur für den geprüften Wortlaut                                  |
| Ablauf                      | Täglicher Job `claims` und Abgleich beim Worker-Start; gesperrt mit Meldung „Quelle veraltet, neuere Studie suchen“                                                             | B2                                                                            |
| Gastro-Quelle               | Bitkom 06/2024 ist abgelaufen → gesperrt; METRO/YouGov 01/2025 nur als „Primärquelle fehlt“ aufgenommen                                                                         | 24-Monats-Regel; keine Sekundärquellen (B2)                                   |
| Kurzformen aus B4           | Als eigene Claims angelegt, Wortlaut am Original ausgerichtet (nicht „mit Fotos“, nicht „lange Telefonate“)                                                                     | B4.1/B4.3 verlangen eigene, geprüfte Claims                                   |
| Branchen-Zuordnung          | Je Treffer nach OSM-Tags/Google-Typen (Playbook-Priorität), sonst Branche der Suche, sonst „dienstleistung“; gespeichert in `leads.industry`                                    | B3                                                                            |
| Ausschluss                  | `_ausschluss.yaml`: Google-Typen, OSM-Tags (`healthcare=*` u. a.) und Namensmuster (Physio, Heilpraktiker, Apotheke, Optik, Anwalt, Steuerberater …); Grund `excluded_industry` | B3; Optiker/Hörakustik als Gesundheitshandwerk vorsichtshalber ausgeschlossen |
| Neue Suchbranchen           | Suchbranchen für Gastronomie, Einzelhandel, Kurse kommen mit ihren Templates in L2; bis dahin ordnet L1 nur zu und schließt aus                                                 | Demo muss den Aufhänger zeigen (B3)                                           |
| `claim_usages`, `playbooks` | Tabellen angelegt (B7); `claim_usages` wird ab L2 beim Erzeugen eines Briefs gefüllt                                                                                            | B7                                                                            |

## Baustein L2a: Slot-Briefe und Wahrheits-Check (umgesetzt)

| Thema               | Entscheidung                                                                                                                                                                                                                                                                                                                                               | Grund                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Slots               | `subject, opening, claim_slot_1/2, benefit, offer, risk_reversal, qr_label`; `{CLAIM:ID}` nur in den Claim-Slots, sonst blockiert der Check („unaufgelöster Platzhalter“)                                                                                                                                                                                  | B5.3                                         |
| Variantenwahl       | Je Lead: Varianten der eigenen Branche + neutrale Variante „A – Standard“; Slot-Varianten nur, wenn alle Claims freigegeben, gültig und im Playbook erlaubt sind – sonst Rückfall auf Varianten ohne Statistik                                                                                                                                             | B10: Startvariante gegen neutrale Kontrolle  |
| „B – Ruf & Entwurf“ | Startet pausiert                                                                                                                                                                                                                                                                                                                                           | B10: 50/50 Start gegen Kontrolle             |
| Fußnoten            | Gleiche Fußnote = gleiche Ziffer; letzte Zeile „Quellen: {TRACK_DOMAIN}/quellen“; alle Arzttermin-Claims mit einer Fußnote „Bitkom Research 2025 zu Arztterminen …“                                                                                                                                                                                        | B1.3, B4.3 (Fußnote muss Arzttermine nennen) |
| Texte gegenüber B4  | Gastro: Kurzform ohne „mit Fotos“. Handwerk A: „viele Aufträge“ statt „die meisten Aufträge“ (unbelegt). Beauty: „kennen viele schon vom Arzt“ statt „Kundinnen möchten das nicht mehr“ (keine Übertragung auf Studio-Kunden). Kurse: „auch spät am Abend“ statt „um 23 Uhr“ (freie Zahl) und „anfragen“ statt „buchen“ (die Demo hat ein Anfrageformular) | B1/B5.4                                      |
| Wahrheits-Check     | Regeln (Zahlen, Sperrliste, Claims, Fußnoten, Platzhalter, max. 2 Statistiken) → Quellenseite (HTTP nur bei echtem Versand) → LLM-Prüfung (`MODEL_BULK`, Kosten im Ledger). Ergebnis in `letters.truth_check_json`                                                                                                                                         | B5.4                                         |
| Doppelte Sperre     | `approveLetter` und `sendLetter` verlangen `passed`; der Versand prüft zusätzlich, dass die verwendeten Claims noch freigegeben und gültig sind                                                                                                                                                                                                            | „Kein Versand ohne passed“                   |
| Quellenseite        | `/quellen`, automatisch aus `claims` + `claim_usages`: verwendete und gerade nutzbare Claims; nicht mehr genutzte bleiben mit Hinweis sichtbar                                                                                                                                                                                                             | B5.5                                         |

## Baustein L2b/L2c: Branchen-Demos und neue Templates (umgesetzt)

| Thema                                       | Entscheidung                                                                                                                                      | Grund                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Speisekarte, Sortiment                      | Kategorien als Struktur mit Platzhalterzeilen („Ihr Gericht … –,– €“), Hinweis „Beispiel-Speisekarte“; keine erfundenen Gerichte oder Preise      | Demo zeigt den Aufhänger (B3) ohne erfundene Fakten (5.2)                       |
| Einzugsgebiet, „Wir stellen ein“, Kursplan  | Deutlich als Beispiel/Platzhalter markiert, nur im Entwurf                                                                                        | Brief verspricht diese Abschnitte                                               |
| Termin-/Reservierungs-/Probestunden-Anfrage | Im Entwurf als nicht aktive Vorschau (Fragen gehen dort an uns); live wird das Kontaktformular zum Branchenformular mit Zusatzfeld                | keine Anfragen an Betriebe, die nichts beauftragt haben                         |
| Template-Gruppen                            | Neu: `gastronomie`, `einzelhandel`, `kurse` mit je 3 Templates (Layouts „Foto“, „Split“, „Magazin“) × 3 Paletten (WCAG AA)                        | 5.2: ≥ 3 Templates je Gruppe × 3 Paletten                                       |
| Fotos                                       | 12 CC0-Fotos über Openverse (StockSnap, Rawpixel), ohne Personen und Marken; Lizenz, Urheber, Quelle in EXIF und `assets/images/manifest.json`    | Antwort 7: nur lizenzfreie Bilder, Metadaten am Bild                            |
| Fotos live                                  | Nur im Entwurf (als „Beispielfoto“ gekennzeichnet); Vorschau und Live zeigen nur Fotos des Kunden                                                 | Fremde Essensfotos auf einer echten Restaurantseite wären irreführend (§ 5 UWG) |
| Lizenzprüfung                               | Über den Openverse-Katalog; die Quellseiten blockieren automatische Abrufe – Stichprobe im Browser empfohlen                                      | „Nichts raten“: Prüfweg offen dokumentiert                                      |
| Suchbranchen                                | Restaurant und Café aktiv (erste Charge B10: Gastronomie, Handwerk, Beauty); Blumenladen, Modegeschäft, Yogastudio, Tanzschule angelegt, aber aus | B10                                                                             |
| Dienstleistung                              | Kein eigenes Template; nutzt die Gruppe der Suchbranche                                                                                           | Fallback-Branche ohne eigene Suche                                              |

## Baustein L3: LetterXpress (umgesetzt, nur Testmodus)

| Thema             | Entscheidung                                                                                                                                                                | Grund                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Transport         | `node:https` statt `fetch`                                                                                                                                                  | Die API verlangt `auth` als JSON-Body auch bei GET                                             |
| Idempotenz        | Referenz `wbm-{letterId}` in `notice`; vor jedem POST Suche nach gleicher Referenz in der ersten Seite der passenden Liste; POST wird nie automatisch wiederholt            | Keine Doppelbriefe bei Absturz oder Zeitüberschreitung                                         |
| Rate-Limit        | Sliding Window 100/Minute im Prozess                                                                                                                                        | Puffer zum Limit von 120/Minute                                                                |
| Testaufträge      | Eigene Aktion, auch bei `DRY_RUN=true`, nur mit `LXP_MODE=test` und bestandenem Wahrheits-Check; Zähler `lxp_test_jobs`                                                     | Testmodus druckt nichts und kostet nichts; Postbox-Aufträge ließen sich aber von Hand absenden |
| Live-Sperre       | `LXP_MODE=live` verlangt 3 Testaufträge (auch für den Testbrief) und für echte Leads die Freischaltung                                                                      | B5.2: 3 Testaufträge → 1 echter Brief an dich → echte Leads                                    |
| Guthaben-Wächter  | Vor jeder Charge: Guthaben ≥ Summe der geschätzten Kosten, sonst Stopp + Meldung                                                                                            | B5.2                                                                                           |
| Zustellung        | Polling alle 30 Minuten; `done` → versendet, geschätzte Zustellung = Versand + 3 Werktage; danach gilt der Brief als zugestellt; ein früherer Scan korrigiert die Schätzung | B5.2, PostG-Laufzeiten                                                                         |
| `lxp_job_id` (B7) | Nicht als eigene Spalte – `letters.provider_letter_id` mit `provider = 'letterxpress'`                                                                                      | Gleiche Information, kein Doppelfeld                                                           |
| Postkarten        | Nicht gebaut                                                                                                                                                                | In der Dokumentation (Juli 2026) nicht vorhanden                                               |

## Baustein L4: Messung (umgesetzt)

| Thema                 | Entscheidung                                                                                                                              | Grund                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Zuordnung             | Alle Ereignisse am Lead; Brief und Variante über den Erstbrief (Sequenz 1) des Leads                                                      | Der QR-Token gehört zum Lead; Folgebriefe verwässern den Arm sonst      |
| Auswertungsfenster    | 45 Tage nach (geschätzter oder per Scan korrigierter) Zustellung, fest in der Sicht; `EVALUATION_WINDOW_DAYS` ≠ 45 erzeugt eine Warnung   | B6.2; materialisierte Sichten lassen sich nicht parametrisieren         |
| „ausgewertet“         | Brief zählt erst als ausgewertet, wenn sein Fenster abgelaufen ist (`evaluated`, `purchases_evaluated`); Kaufrate im Dashboard nur darauf | Sonst sehen junge Arme schlechter aus, als sie sind                     |
| Abbruch               | `checkout_abandoned` beim Ablauf der Stripe-Session; zählt, wenn er im Fenster liegt und im Fenster kein Kauf folgt                       | Ein späterer Kauf außerhalb des Fensters soll den Abbruch nicht löschen |
| Umsatz pro Brief      | Einmalig = 590 €; Monatlich = 12 × 49 € + erwartete Pflegemonate × 19 € × (1 − Kündigungsquote), Annahmen in den Einstellungen            | B6.2                                                                    |
| Verweildauer/Scroll   | Eingebettetes Skript (CSP-Hash), `sendBeacon` einmal beim Verlassen, Werte grob gestuft; abschaltbar (`metrics.engagementBeacon`)         | Keine Cookies, keine Kennung; Rechtsprüfung § 25 TDDDG offen            |
| WhatsApp-Klick        | Link auf `/d/{slug}/whatsapp` → Ereignis → 302 auf `wa.me`                                                                                | Ohne Skript messbar                                                     |
| Unzustellbar          | Rücksendung von Hand im Lead-Detail erfassen (LetterXpress meldet keine Rückläufer)                                                       | Grundlage der Unzustellbar-Bremse (L5)                                  |
| Auffrischen der Sicht | Job alle 30 Minuten (`REFRESH … CONCURRENTLY`) und Button im Dashboard                                                                    | Dashboard bleibt beim Auffrischen lesbar                                |

## Baustein L5: Optimizer und Statistik (umgesetzt)

| Thema                | Entscheidung                                                                                                                                                                                   | Grund                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Modell               | Beta-Binomial, empirischer Bayes in drei Ebenen (Gesamt → Branche → Variante); κ per Momentenmethode aus der Streuung, begrenzt 10–200, ohne genug Daten (2 Gruppen à ≥ 30 Briefe) 50          | Partial Pooling nach B6.3, ohne MCMC-Abhängigkeit, schnell genug für Dashboard und Simulation |
| Spannen              | 90-%-Glaubwürdigkeitsintervall aus dem gepoolten Posterior; daneben die Rohrate                                                                                                                | „Spanne statt Einzelwert“ (B6.3)                                                              |
| Signal               | Scan-Rate (zugestellte Briefe), bis jeder nutzbare Arm 5 Käufe aus ausgewerteten Briefen hat; danach Kaufrate × Umsatzwert je Kauf (geglättet)                                                 | B6.3 „Scan-Rate als Lern-Signal, Kauf als Richter“                                            |
| Entscheidungsregel   | Gewinner: P(besser als Kontrolle) ≥ 90 % und beide Arme ≥ `MIN_LETTERS_PER_ARM` zugestellt; „schlechter“ symmetrisch erst bei P ≥ 95 % und genug Briefen; sonst Tendenz / kein Unterschied     | B6.3; „schlechter“ ist die Grundlage fürs Aufräumen in L6                                     |
| Zuteilung            | Anteil = (1 − c − e)·P(bester) + e/k + c für die Kontrolle; c ≥ 15 %, e ≥ 20 %; Gleichverteilung, solange ein Arm < `minLettersForSignal` (10) Briefe hat                                      | B6.4; Gleichverteilung = 50/50 der ersten Charge (B10)                                        |
| Kontrolle            | Je Branche aus `optimizer.controlVariants`, sonst die älteste aktive neutrale Variante (ohne Statistik)                                                                                        | B4.6: die neutrale Variante ist die Kontrollgruppe                                            |
| Quote statt Zufall   | Der Brief geht an den Arm mit dem größten Rückstand zu seinem Zielanteil in der laufenden ISO-Woche (Tabelle `arm_allocations`)                                                                | Bei 13 Briefen pro Branche würde Zufall die 15 % Kontrolle oft verfehlen                      |
| Übernahme            | Wochenlauf schreibt Vorschlag in den Bericht, übernimmt nur mit AUTO_OPTIMIZE; Button „Zuteilung übernehmen“ im Dashboard                                                                      | Wie bisher: Steuerung bleibt beim Betreiber                                                   |
| Alter Optimizer      | Globale Variantengewichte ersetzt; Segment-Budgetanteile bleiben (Thompson Sampling wie bisher)                                                                                                | B6.4 Ebene 1 je Branche; Zielgruppen-Modell erst mit L7                                       |
| Template für Brief 3 | `bestTemplateForBranch` mit Pooling über die Branchen der Gruppe; null (Rotation), solange < 30 Briefe oder kein Kauf in der Gruppe                                                            | Ersetzt die starre Mindestzahl von 30 Briefen je Template                                     |
| Opt-out-Bremse       | Variante pausiert bei Opt-outs > 5 % der Scans, **ab 2 Opt-outs** (ohne Scans zählt jeder zweite Opt-out)                                                                                      | Ein einzelner Opt-out bei 3 Scans wären 33 % – Rauschen                                       |
| Beschwerde-Bremse    | Support-Agent markiert Beschwerden mit „Abzocke/Täuschung/Betrug/unseriös …“ (Regex, nur Ergebnis gespeichert); Variante des Erstbriefs sofort pausiert                                        | B6.7; keine Texte im Ereignis                                                                 |
| Unzustellbar-Bremse  | > 3 % unzustellbar in einer Versandwoche → Schalter „Versand pausiert“ (nur echte Briefe an Leads; Testbriefe bleiben möglich)                                                                 | B6.7                                                                                          |
| Kostenbremse         | Kosten pro Kauf je ausgewerteter Versandwoche, gleitend über 12 Wochen; ohne Kauf „über der Grenze“, sobald die Kosten allein `MAX_CAC_CENTS` übersteigen; 4 Wochen in Folge → Budget halbiert | Wochenwerte mit 0–1 Kauf wären reines Rauschen; nach einer Halbierung zählen 4 neue Wochen    |
| Einmaligkeit         | Jeder Auslöser einmal (`safety_actions.key`), Benachrichtigung per Mail und Alert; pausierte Varianten im Optimizer-Dashboard wieder aktivierbar                                               | Keine Endlosschleife nach manueller Reaktivierung                                             |
| Simulation           | `scripts/simulate-optimizer.ts` → `docs/simulation-l5.md` (3 Szenarien, 200 Läufe, feste Seeds)                                                                                                | Abnahme B9                                                                                    |

## Baustein L6: Lern-Agent (umgesetzt)

| Thema               | Entscheidung                                                                                                                                                                                                                                                                                          | Grund                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Ablauf              | Sonntags 18:30 (nach dem Optimizer um 18:00); ein Bericht je ISO-Woche, „Jetzt ausführen“ erzeugt ihn neu                                                                                                                                                                                             | B6.5                                                                        |
| Datenexport         | Nur Aggregate je Branche × Variante (Zahlen, Spannen, Urteil), Einwand-Kategorien mit Anzahl, Varianten-Texte, freigegebene Claim-IDs, Logbuch – keine Betriebsnamen, keine Kontaktdaten, keine Texte                                                                                                 | B6.5 „keine personenbezogenen Daten“                                        |
| Bericht             | Zahlen, Spannen, Wochenvergleich (Zufall = Spannen überlappen) und Absprünge deterministisch; das Sprachmodell liefert nur Einordnung, Hypothesen und Vorschläge                                                                                                                                      | Keine erfundenen Zahlen im Bericht                                          |
| Ein-Slot-Regel      | Erlaubt: Betreff, Claim 1/2, Nutzen-Satz, QR-Text, Preisdarstellung. Nie: Anrede, Einstieg, Garantie-Satz, Pflichtangaben. Neue Variante = Ausgangsvariante mit genau diesem einen Slot geändert                                                                                                      | B6.5                                                                        |
| Prüfung Vorschlag   | Claim-Slot nur genau `{CLAIM:ID}` aus freigegebenen, im Playbook erlaubten Claims; alle Platzhalter der Ausgangsfassung bleiben; Länge ≤ 130 % (Layout 1 Seite); Sperrliste für Funktionen, die es nicht gibt; keine Wiederholung aus Logbuch/Varianten; danach voller Wahrheits-Check am Musterbrief | B5.4/B6.5; „nur wenn technisch umgesetzt“                                   |
| Demo-Abschnitt      | Noch nicht als Vorschlags-Slot (Demo-Varianten B6.6 brauchen eigene Auslieferung)                                                                                                                                                                                                                     | Erst mit Demo-Varianten sinnvoll messbar                                    |
| Freigabe            | Review-Queue im Varianten-Labor; ohne Freigabe nur mit `AUTO_ACTIVATE_VARIANTS=true` und nur Betreff, Nutzen-Satz, QR-Text; nie mehr als 4 aktive Varianten je Branche                                                                                                                                | B6.5                                                                        |
| Aufräumen           | „schlechter“ (P ≥ 95 % und genug Briefe je Arm) → pausiert, Logbuch „paused_worse“; „Gewinner“ wird nur gemeldet, die Kontrolle wechselt der Betreiber                                                                                                                                                | Simulation L5: wiederholtes Hinschauen erzeugt gelegentlich Schein-Gewinner |
| Logbuch             | Tabelle `experiments` ist maßgeblich; Markdown-Export im Dashboard und als `reports/experiments.md` im Speicher. `docs/experiments.md` beschreibt Format und Startexperimente                                                                                                                         | Zur Laufzeit wird nicht ins Repository geschrieben                          |
| Wochenbericht-Datei | `weekly_reports` plus `reports/woche-{KW}.md` im Object Storage, Mail an den Betreiber                                                                                                                                                                                                                | B6.5                                                                        |
| Einwände            | Support-Agent liefert zusätzlich `objection` (10 Kategorien); WhatsApp-Fragen werden von Hand erfasst und klassifiziert; Text 90 Tage, Kategorie dauerhaft; bei Widerspruch nur Kategorie ohne Text und ohne Lead                                                                                     | B7; WhatsApp ohne Anbindung (nur Link)                                      |
| Ohne API-Key        | Deterministischer Mock (Probelauf `docs/lern-agent-probelauf.md`); fällt das Sprachmodell aus, entsteht der Bericht ohne Text und ohne Vorschläge                                                                                                                                                     | Abnahme L6 ohne Kosten reproduzierbar                                       |

## Firmen-Website und Kauf-Strecke (umgesetzt)

| Thema                      | Entscheidung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Grund                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Design                     | Typografie, Formen und Layout nach DESIGN.md (Inter/Inter Tight, Display -0,04em, Radien 8px/4px, asymmetrischer Hero mit Collage); Farben Weiß mit blauem Akzent #1F4FD8, Text #0F172A; Kopfbereich hell mit Punkteraster und leichtem blauem Schimmer                                                                                                                                                                                                                                                                                                                                                                                                     | Vorgaben des Betreibers vom 24.10.2026 (DESIGN.md, danach „weiß, blau Akzent“)                                            |
| Schriften                  | Inter und Inter Tight lokal über `@fontsource-variable` (keine Anfrage an Google)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | DSGVO, Performance                                                                                                        |
| Farbe                      | Weiß als Grund, Blau #1F4FD8 für Buttons, Links, Häkchen und aktive Zustände; Grün nur für Erfolg; die Kauf-Strecke nutzt dieselbe Palette über `.theme-site`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Wunsch des Betreibers „weiß, blau Akzent“                                                                                 |
| Animationen                | Nur `transform`/`opacity`, Easing cubic-bezier(0.22, 1, 0.36, 1); Inhalte oberhalb der Falz per CSS (ohne JS, gut für LCP), darunter Scroll-Einblendung; `prefers-reduced-motion`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Vorgabe „ultra smooth“, Lighthouse ≥ 90                                                                                   |
| Beispiele                  | Einzige Galerie ist die diagonale Treppe im Kopfbereich der Startseite (ersetzt Collage und Abschnitt „Beispiele je Branche“); Titel oben links, Text und Buttons unten rechts in den freien Ecken. Reihen um genau eine Feldbreite versetzt (45°), Farbfelder stoßen Ecke an Ecke, ihre Streifen bilden eine durchgehende Linie; Reihen laufen langsam nach rechts oben (nur transform), anhalten per Hover oder Schalter, bei reduzierter Bewegung still. Seite „Beispiele“ zeigt die fünf Vorschauen statisch. Vorschaubilder nur Kopfbereich bei 1024 px in doppelter Auflösung; Handwerk dunkel (Anthrazit) statt Blau, passend zu den Foto-Beispielen | Wünsche des Betreibers vom 24.10.2026 (Vorlage Studio.Design, nur die Treppe übernommen)                                  |
| Vorlage „Plakat“           | Neue vierte Vorlage je Branchengruppe (5.2 verlangt ≥ 3): knallige Vollfläche in der Akzentfarbe mit dunkler Schrift, große Versalien, Band mit den Leistungen, Buttons in tiefer Kontrastfarbe; 15 neue Paletten (je Gruppe 3), alle WCAG-AA-geprüft; Aufkleber verdeckt nie die Kennzeichnung „Beispielfoto“. Die Hero-Treppe zeigt fünf echte Entwürfe dieser Vorlage in fünf verschiedenen Farben (Orange, Gelb, Pink, Limette, Türkis) – die Beispiele zeigen also, was der Generator wirklich baut                                                                                                                                                    | Wunsch des Betreibers vom 24.10.2026 („knallig, unterschiedliche Farben wie Studio.Design“); ehrliche Beispiele (§ 5 UWG) |
| Hero-Beispiele natürlich   | Treppe zeigt ruhige Vorlagen in natürlichen Paletten mit fünf verschiedenen Layouts (Split/Tomate, Klar/Waldgrün, Modern/Rosé, Foto/Flieder, Magazin/Lagune), Farbfelder in gedeckten Tönen; Kacheln größer (Desktop 14cqw, Handy 34cqw). Plakat-Vorlage bleibt im System                                                                                                                                                                                                                                                                                                                                                                                   | Wunsch des Betreibers vom 24.10.2026 („größer, natürlicher, nicht so bunt“)                                               |
| Firmen-Website auf Netlify | Statischer Export nur der öffentlichen Seiten (`SITE_STATIC`, `scripts/export-site.mjs`), neues Projekt `seitenwerk-website`; Kontakt dort nur per E-Mail/Telefon/WhatsApp statt Formular (kein Server, kein weiterer Auftragsverarbeiter); noindex bis `SITE_INDEXABLE=true`                                                                                                                                                                                                                                                                                                                                                                               | Wunsch des Betreibers vom 24.10.2026; Worker und Datenbank bleiben auf dem VPS                                            |
| Preise                     | Umschalter zeigt Details, Vergleichstabelle zeigt beide Wege gleichwertig; Kauf ohne Vorauswahl bleibt im Checkout                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | „zwei gleichwertige Optionen, keine Vorauswahl“                                                                           |
| Markenname                 | Firmenname aus den Einstellungen; solange dort der Platzhalter steht „Seitenwerk“. Persönlicher Name, Foto und Kurzvorstellung kommen aus den Einstellungen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Name des Betreibers liegt noch nicht vor                                                                                  |
| Indexierung                | Firmen-Website erst mit `SITE_INDEXABLE=true` indexierbar (nach echten Rechtstexten); Demos, Checkout, Onboarding immer noindex                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Keine Platzhalter-Rechtstexte in Suchmaschinen                                                                            |
| Checkout                   | Keine eigene Bestellseite: Preiskarte → direkt Stripe Checkout; Firmenname, Name, E-Mail, Adresse, Telefon, Wunschdomain, „Unternehmer“ und AGB erfasst Stripe (eigene Felder); Übernahme per Webhook vor der Verbuchung; die Test-Bezahlseite bildet das nach                                                                                                                                                                                                                                                                                                                                                                                              | Wunsch des Betreibers vom 24.10.2026                                                                                      |
| Beispiele                  | Diagonale Treppe statt Karussell (Vorschau + Farbfeld mit Namen, läuft langsam nach rechts oben, reines CSS mit transform); Überschrift oben links und Text unten rechts in den freien Ecken; anhalten per Hover oder Schalter, bei reduzierter Bewegung still; Vorschaubilder nur Kopfbereich bei 1024 px in doppelter Auflösung, Handwerk/Beauty in der farbstärksten Vorlage                                                                                                                                                                                                                                                                             | Wunsch des Betreibers vom 24.10.2026 (Vorlage Studio.Design, nur die Treppe übernommen)                                   |
| Kontaktformular            | Geht wie Demo-Fragen in die Support-Queue (Honeypot, Zeitfalle, 5 je Stunde); Spam bekommt dieselbe Antwort                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Einheitlicher Support-Ablauf                                                                                              |

## Offene Entscheidungen des Betreibers

Siehe die gesammelten Fragen in der Rückmeldung zu Update 2 (Preisdarstellung brutto/netto, Daten für
WhatsApp/Foto/Kurzvorstellung, AGB-Klauseln zu Mindestlaufzeit und Garantie, Bewertungsquelle für das
Segment „neu“ u. a.).

## Codex-Fortsetzung: Supabase und Firmenangaben (24.10.2026)

- Projekt `Webiste-` in Supabase verwenden, EU Irland. Bestehende 11 Drizzle-Migrationen und deren Historie übernehmen, alle 32 Tabellen hinter RLS und ohne Browserrechte. Öffentliche Website-Inhalte über die schmale Edge Function `seitenwerk-site-config`.
- Neue Website-Logins nach ausdrücklicher Korrektur des Betreibers nicht einbauen; vorhandener interner Admin bleibt. Keine neue Supabase-Auth-Oberfläche.
- [Name aus privater Konfiguration], Seitenwerk, [Anschrift aus privater Konfiguration], [PLZ] [Ort], Telefon/WhatsApp [Telefon aus privater Konfiguration]. Kein persönliches Foto; Foto-Pflicht im Readiness-Check entfernt.
- Gewünschte Geschäftsadresse: `support@example.test`. Resend-Connector meldet weiterhin DKIM pending und lehnt Inbox-Erstellung ab; DNS bleibt beim Betreiber. Keine E-Mail versendet.
- Impressum-, Datenschutz- und AGB-Entwürfe aus tatsächlichen Projektfunktionen, ausdrücklich nicht von eRecht24 erzeugt oder juristisch freigegeben. Leere freigegebene `legal.*`-Felder bleiben leer; Entwürfe entsperren keinen Verkauf.
- Statische Firmenwebsite liest Supabase beim Export. Einstellungen werden erst nach erneutem Export/Deployment öffentlich aktualisiert. VPS/Worker später, Stripe und DNS beim Betreiber, DRY_RUN=true.

### Resend-Nachprüfung 24.10.2026, 17:53 UTC

Domain nun vollständig verifiziert (DKIM/SPF/MX). Gewünschte Inbox `support@example.test` erfolgreich angelegt und über `get_inbox` bestätigt. Keine Test-Mail und keine DNS-Änderung. Frühere Meldung „pending/422“ ist überholt.

### Rechtsform bestätigt

Betreiber bestätigt am 24.10.2026: Einzelunternehmen ohne Registereintrag und ohne USt-ID. eRecht24-Impressumformular mit diesen Angaben bis zum letzten Downloadschritt ausgefüllt; dort sind kostenlose Kontoanlage und Einwilligung in regelmäßige Angebots-/Update-E-Mails gekoppelt. Diese Einwilligung wird nicht ungefragt erteilt; Betreiber wurde konkret danach gefragt. Kein Generatorergebnis als fertig behaupten, solange es nicht ausgeliefert wurde.

### Richtungswechsel: Admin-Zugang statt Rechtstexte

Betreiber stoppt Rechtstextarbeit ausdrücklich. Bestehende Netlify-Admin-App verwenden. Dedizierter DB-Login und Admin mit TOTP eingerichtet; sichere Laufzeitkonfiguration hinterlegt. Kein neuer Deploy über verfügbare Tools möglich; Verbindung/Login noch nicht end-to-end bestätigt. Siehe `admin-zugang.md`.

### Aktueller Gesamtstand nach Admin-Deploy

Siehe `projektstand-aktuell.md` (24.10.2026). Admin-Modernisierung veröffentlicht; Transaction-Pooler
aktiv, DB-Health positiv. Statische öffentliche Domain enthält nach direkter Prüfung weiterhin
alte Kontakt-/Impressumsplatzhalter. Vorrang haben Daten-/Deploymentabgleich, privater Dateispeicher
und kontrollierter Demo-Test. Rechtsarbeit pausiert, VPS später, DRY_RUN bleibt true.

### Rechtstexte und Integrationen erneut beauftragt

Betreiber beauftragt Impressum/Datenschutz/AGB aus seinen Angaben, Supabase-Dateispeicher,
Resend-Anbindung und Stripe-Sandbox. Demo-Probelauf/Worker ausdrücklich später. Betreiber kennt
W-IdNr. und §19-Steuerstatus nicht; entsprechende Angaben bleiben ungeklärt, keine Nummer oder
Steuerbefreiung erfinden. Eigene Arbeitsfassungen, keine Generator-/Anwaltsfreigabe. Privater
Supabase-Bucket angelegt; S3-Zugangsdaten fehlen. Stripe-Connector nur Sandbox; richtiger App-
Webhook angelegt, Anwendungsschlüssel fehlt. Beide neuen Webhooks bis sicherer Konfiguration
pausiert. Netlify-Secretspeicherung von automatischer Sicherheitsprüfung abgelehnt; nicht umgehen.
Siehe integrations-abschluss.md und recht/pruefprotokoll.md.

## 25.10.2026 – Conversion V4 und beauftragte Stripe-Sandbox

Quelle: neuer Master-Prompt V4 und anschließende Betreiberanweisung zur Stripe-Plugin-Anbindung und blauem Branding.
Neukundenpreise: 597 € + 19 €/Monat Basis oder 597 € + insgesamt 99 €/Monat Care+, ohne zwölfmonatige Mindestbindung.
Bestehende Verträge bleiben unverändert. Separate Einrichtung und anschließend ausdrücklicher Monatsabo-Abschluss
nach bestätigtem Go-Live verhindern vorzeitige Abbuchung. Kein automatischer geschätzter Go-Live-Termin.

Stripe-Sandbox enthält genau drei neue V4-Produkte mit Preisen; Checkout-Blau #1F4FD8, Weiß, Inter. Keine
Subscription, Kundenzahlung oder Erstattung über den Connector angelegt. Keine Produktionsumgebung geändert.
Implementierung auf `codex/conversion-v4`, keine eigenmächtige Veröffentlichung. Briefkandidaten bleiben pausiert,
Engagement-Messung aus. Vollständiger Prüf- und Restaufgabenstand: `conversion-optimization-v4.md`.

## V4/V5-Fortsetzung – 25.10.2026

Diese Ergänzung ersetzt für Neukunden die historischen Einmal-/Monatsangebote oben.
Basis597+19 und Care+597+insgesamt99 bleiben zentral; alte Vertragssnapshots unverändert.
Neue Mandatsbestellungen starten genau ein Monatsabo nach echtem bestätigtem Go-Live; vorhandene
manuelle V4-Snapshots bleiben kompatibel. Sandbox-Test hat `allow_incomplete`+`off_session`
bestätigt. Status active ist kein Zahlungseingang.

Care+-Zeit/Technikchecks, Tarifwechsel und Istkosten in vorhandene Kunden-/Budgetseiten integriert.
Neue Demos verwenden geprüfte Fakten und deutlich markierte Beispiele; drei Designs verbessert,
Plakat bleibt. Erste30-Demos service-seitig manuell freizugeben. V4-Brief A wegen Fertig-Versprechen
korrigiert; alte gespeicherte Fassung blockieren statt Quoten oder Datenbanktexte zu überschreiben.

Worker-only Compose für spätere VPS-Freigabe; kein zweiter Produktionspostgres. Produktion migriert
weder App noch Queue beim Start. Backup/Restore nur lokal nachgewiesen, echte Produktionssicherung
weiter erforderlich. Aktueller Nachweis und Grenzen: docs/v5-quality-pruefung.md und
v5-go-live-checkliste.md. Kein Deployment/DNS/echte Zahlungen/Briefversand durch diese Entscheidungen.

## 25.10.2026 – Betreiberantworten zur Betriebsabnahme

- Gewerbe laut Antwort auf Frage1 noch nicht angemeldet; mehrere Steuerfragen waren gebündelt,
  daher aus „Nein“ weder bestätigte Regelbesteuerung noch abschließend fehlende W-IdNr. ableiten.
  Steuerstatus bleibt unbestätigt. Kein Live-Verkauf und keine Briefkampagne freigegeben.
- V4 Basis597+19 und Care+597+insgesamt99 ausdrücklich bestätigt. Kein49-Euro-Neukundenangebot.
  Historische Vertragssnapshots unverändert erhalten. Default bleibt V4.
- Domain-/Supportumfang nach bestehender Konfiguration: verfügbare Standard-.de-Domain bis
  15Euro/Jahr, Hosting/SSL/Basis-Störungssupport; Zusatzleistungen separat bestätigen.
- Auswahlbudget VPS maximal15Euro/Monat; keine konkrete Bestellung oder Bereitstellung freigegeben.
  Einmaliges Testbudget10Euro, noch nicht verbraucht; keine automatische Ausweitung.
- Nur Stripe/Kartenzahlung gewünscht, keine zusätzliche Banküberweisung. Neue Default-Konfiguration
  checkout.paymentMethods=['card']; gespeicherte Produktionswerte und Altverträge unverändert.
- Eigene Support-Testmail grundsätzlich genehmigt; noch nicht gesendet. Resend-Inbox-Sendetool
  verlangt zusätzlich eine konkrete Bestätigung von Empfänger, Betreff und Wortlaut unmittelbar vorher.
- Lesende Anbieterprüfung und konkrete Backup-/Migrationsvorbereitung erlaubt; keine Migration,
  Produktionskonfiguration, Veröffentlichung, Domainkäufe oder echte Zahlungen/Briefe freigegeben.
- Firmenwebsite erneut ansehen/weitergestalten und tatsächliche Brief-/Demo-Beispiele zeigen.
  Bisherige V4-Gestaltung nur lokal, nicht als bereits auf seitenwerk.world veröffentlicht darstellen.

## 25.10.2026 – Testphase, Rechtstexte, Push und Ultimate-Qualitätsauftrag

Betreiber berichtet telefonische Rathausbestätigung einer Testphase vor Gewerbeanmeldung.
Als Betreiberangabe dokumentieren, keine eigene rechtliche Freigabe daraus behaupten. Rechtstexte
vollständig auf tatsächliche/verplante Dienste abstimmen, fehlende AngabenTODO, Live-Sperren erhalten.
Commit und Push auf aktuellen Arbeitsbranch ausdrücklich beauftragt, kein Live-Deploy. Neuester
Ultimate-Auftrag erweitert die Qualitätsanforderungen; frühere lokale Abnahmen sind keine Abnahme
neuer branchenspezifischer Designs oder9–10/10-Gesamtqualität. Kennzeichnung KI-Beispielbilder,
kein Fake-Portfolio und kein Betreiberfoto. Fortschritt: ultimate-quality-handoff.md.

## 25.10.2026 – Ultimate-Qualität, zweite Fortsetzung

Bestehende Demo-/Brief-/Providerarchitektur erhalten. Gewichtete manuelle Qualitätsfreigaben,
0–100-Eignungsscore ohne erfundene OSM-Nachweise, große tatsächliche Screenshot-Vorschau und
QR-Decodierung aus dem finalen PDF ergänzt. Neue Qualitätsbriefe bleiben einschließlich Folgebrief3
in Einzelprüfung; unbekannte visuelle Qualität wird nicht automatisch benotet. Öffentliche
Firmenwebsite kompakter, Starteridentität nicht als echte Betreiberangaben veröffentlichen.
Fünf ausdrücklich fiktive KI-Branchenbilder, keine realen Referenzen oder CC0-Behauptung.
Vollständige Nachweise/Grenzen im Ultimate-Handoff. Betreiberauftrag erlaubt Commit und Push,
weiterhin keine Produktion; DRY_RUN=true und bisherige Go-Live-Sperren bleiben erhalten.

## 26.10.2026 – Einzelauftrag 2: Briefe und QR-Strecke

Bestehende V4/V5-Architektur und Gerätekomposition behalten; normale V4-Briefe wieder mit tatsächlichem
Laptop-/Handy-Komposit. Preisquelle unverändert597+19 bzw.597+insgesamt99. Größere Pflichttexte und
Überlaufprüfung, kein Abschneiden von Anschriften. Quellengebundene Detailangaben aus dem manuellen
Demo-Faktenreview; keine Website-Abwesenheit aus fehlendem OSM-Tag behaupten. Neue V4-Folgebrieftexte
nur pausiert vorbereiten; vorhandene aktive Varianten/Quoten nicht still verändern. Vor Generierung,
Freigabe und Versand Sperrlisten, Dubletten, Quellenzulässigkeit und unveränderte Brief-/Demo-/Bildzuordnung
lokal erneut prüfen. DRY_RUN=true, nur fiktive Testpaare, kein Push/Deployment oder echter Versand.
Nachweise/Wiederaufnahme: `docs/task2-letters/`.

### 26.10.2026 – Betriebscharakter und Bildstrategie

Neuester Betreiberauftrag: bestehende Demos und automatische Auswahl stärker auf den tatsächlichen
Betrieb abstimmen, keine V6. Stil ist eine eigenständige Gestaltungsvorgabe, kein Nachweis für
Leistungen/Qualität/Preislage. Quellengebundene Profile beeinflussen Schriftcharakter, Farben,
Komposition und passende bestehende Template-ID. Ohne Belege Branchenvorschlag statt Recherchebehauptung.
KI-Motive aus normaler Auswahl entfernt; historische Reviewassets erhalten und ehrlich gekennzeichnet.
Analyseberechtigung und Darstellungsrecht für Fotos getrennt. Kein Google-Fotoscraping; bestehende
Google-/Datenschutzfreigaben bleiben. Ein dezenter lesbarer Hinweis auf lizenzierte Beispielbildwelt
ersetzt wiederholte Bildbadges für nichtgenerierte Fotos. Tatsächliche Betriebsaufnahmen nur mit
explizitem Darstellungsrecht. Keine Firmenfakten aus Bildinhalt ableiten.
Vorhandener Admin/Settings/Storage/Anthropic-Provider erweitert, keine neue DB oder Bildanbieter-API.
Lokale Mock-/SDK-/Browserprüfungen sind keine echte Anbieter-Bildanalyse oder Betreiberabnahme.

### 26.10.2026 – Persönliche Vorschau-Einladung ohne Tarifblock

Ausdrücklicher neuer Betreiberauftrag: Neue V4-Verkaufsbriefe verkaufen das kostenlose Ansehen der
persönlichen Demo. Preise und Tarifdetails entfallen im Brief; Einrichtung und monatliche V4-Preise,
Leistungen und Vertragsangaben bleiben unverändert und vor Bestellung in Demo/Checkout sichtbar.
Dies ersetzt frühere Briefpreis-Vorgaben, nicht die tatsächlichen Preise oder historische Rechnungen.
Spätere Umsetzung bleibt ausdrücklich kostenpflichtig; unabhängigen, nicht beauftragten Entwurf benennen.
Vorhandene Pflichtinformationen erhalten, keine juristische Freigabe behaupten.

Personalisierung bedeutet zusammenhängende Argumentation aus belegten Leistungen/Besonderheiten,
nicht nur Name/Ort in feste Branchenabsätze einsetzen. Bestehenden budgetierten LLM-Service verwenden,
Fakten und tatsächliche Demo getrennt übergeben, Demo-Beispiele nie als Betriebsnachweis übernehmen.
Separate Fakten-/Sprachprüfung, einmal reparieren, danach kontrollierbare Ersatzfassung. Kein automatischer
9,5/10-Score. Ohne Fakten manuell prüfen. Bilder und QR bleiben exakt an dieselbe Demo gebunden.
Testbeispiele ausdrücklich fiktiv; offline vorgegebene Modellantworten als Fixtures kennzeichnen. Keine
kostenpflichtigen Modellaufrufe, echten Briefe, Produktionsänderungen oder Veröffentlichungen in der Abnahme.

### 26.10.2026 – Recherchebasierte Zielkampagne

Maler mit Privatkunden-/Renovierungsfokus priorisieren, danach Gewerbereinigung und Fliesenleger mit
Privatkunden-/Badrenovierungsfokus. Garten/Boden/Parkett/Entrümpelung zweite Wahl. Keine Website allein
ist kein Versandgrund. Aktivität, unabhängiger Betrieb, verifizierte Zustelladresse, Fokus und aktuelle
Leistungswerbung/freie Termine/neue Angebote/Expansion/Übernahme/aktive Profile gesondert belegen.
Rückmeldungen und Arbeitsbilder sind zusätzliche Qualitätssignale, keine freie Kapazität.
Website-Suche mit Namen/Ort, Telefon und verlinkten Verzeichnis-/Profilen dokumentieren.
6–36Monate nur aus belegtem tatsächlichem Geschäftsbeginn plus Vollerwerb bevorzugen; neue
Verzeichniseinträge nicht als Neugründung werten. Unbekannt bleibt offen. Geschlossen/reine
Subunternehmer/ausgelastet ohne Wachstumsbeleg ausschließen. Neue Quellen-/Faktenprüfung im vorhandenen
privaten Settings-/Adminpfad, keine neue Datenbank. Verifizierte Leistungen für Demo und Briefe
wiederverwenden; keine erfundene Qualität, Referenzen, Kapazität oder zusätzliche Anfragen.
Bestehende V4-Preise, direkter schriftlicher Kauf und preisfreie Briefe bleiben. Alles lokal/Mock,
keine externe Recherche oder Produktionsänderung. Übergabe: docs/acquisition-priorities/.

### 27.10.2026 – Erster realer Recherche- und Gestaltungsprobelauf

Betreiber beauftragt ausdrücklich passende reale Betriebe gründlich zu recherchieren, Mindestkriterien
nicht für schnelle Ergebnisse abzusenken und daraus lokale Demo-/Briefprüfmuster zu erstellen.
Die zwischenzeitliche Aufforderung, unklare Website-Suchen abzukürzen, wurde ausdrücklich korrigiert.
Unbekannt bleibt unbekannt; technische Akquise-Eignung ist keine Versand-/Rechtsfreigabe.
Die abstrakte Farbflächen-Grafik im Maler-Hero wurde ausdrücklich beanstandet. Passendes rechtmäßig
nutzbares Arbeitsfoto verwenden; ohne Bild sachlichen Fallback, keine erfundenen Betriebsaufnahmen.
Vorhandene V4/V5-Architektur und Anbieter behalten. Kein Push/Deploy, Kontakt oder kostenpflichtiger
Geschäftsvorgang. Erster Kontrolltext redaktionelle Offline-Fixture, keine echte LLM-Abnahme.
Nachweise: docs/real-painter-check/; Empfängerdaten und Renderexporte nur privat unter data/.

### 27.10.2026 – Ausreichende Stilbelege statt erzwungener Vibe

Betreiber verlangt die Pflicht zur betriebsspezifischen visuellen Prüfung in der bestehenden
Automatisierung; reicht der Informationsstand nicht aus, keine Stilangleichung erzwingen.
Getrennte Beobachtungen und hinreichende Belege im vorhandenen Modell-/Cachepfad festhalten.
Unbekannte Originalfarben, Schriften oder Bildrechte nicht erfinden. Branche und Beispielfoto
sind keine tatsächliche visuelle Identität. Bestehende manuelle Freigaben bleiben.
Aktualisierung und VPS-/API-/ChatGPT-Abrechnung: docs/vibe-upgrade/automation-and-billing.md.

## Claude-Übernahme 27.10.2026 (technische Entscheidungen, keine Betreiberfreigaben)

- Statischer Firmenexport bricht bei Platzhalter-Anbieterdaten, Legacy-Preisen 590/49, `TODO`-Vermerken oder
  fehlender 597-€-Einrichtung ab (`apps/web/scripts/export-guard.mjs`). Keine Umgehungsoption.
- Website-Vorprüfung (`leads/website-probe.ts`) standardmäßig aus, weil sie Drittseiten abruft. Fund nur bei
  Telefon oder PLZ+Straße; Fund schließt aus, Nicht-Fund beweist nichts.
- Funnel-Sichten: Backend-Rolle erhält SELECT und eine `SECURITY DEFINER`-Auffrischfunktion im nicht
  veröffentlichten Schema `seitenwerk_ops` (Migration 0019) statt Eigentümerwechsel (auf Supabase ohne
  passende Rollenmitgliedschaft nicht zuverlässig möglich).
- VPS-Vorschlag netcup VPS 500 G12.5 (4 GB) wegen gemessener Rendering-Spitze 623 MiB; nicht bestellt.
- Rechtstexte (Betreiberanweisung 27.10.2026: „ohne TODOs, richtig hinschreiben“): interne Arbeitsvermerke durch
  wahrheitsgemäße öffentliche Formulierungen ersetzt. Keine Steuer-/Gewerbe-/Registerangabe erfunden: USt-IdNr.
  nur, wenn tatsächlich vorhanden; ungeklärter Steuerstatus als „wird vor Annahme der ersten Bestellung
  festgelegt“, ausdrücklich ohne § 19-Zusage. Vertragsschluss gemäß tatsächlichem Ablauf (Bestellbestätigung
  per E-Mail nach bestätigtem Zahlungseingang). Künftige Dienste (LetterXpress, KI-Anbieter, Registrar/Hosting)
  als „vor Aktivierung zu ergänzen“. Keine anwaltliche Prüfung erfolgt. Fehlende Betreiberdaten bleiben als
  Markierung erhalten und sperren den Export.

### 27.10.2026 – Briefdienst easyNova statt LetterXpress (Betreiberentscheidung)

Betreiber: „Easynova benutzen wir, nicht LetterXpress.“ Neuer `MailProvider` `easynova` nach offizieller
OpenAPI V1 (docs/integrations.md), gleiches Freigabe-Muster wie bisher: `EASYNOVA_MODE=test` als Standard,
3 Testaufträge (testFlag, kein Druck) → 1 echter Brief an den Betreiber → erst nach Freischaltung echte Leads.
LetterXpress bleibt als inaktive Alternative im Code (bestehende Tests grün). Weil easyNova Briefe ohne
Absenderzeile über dem Adressfenster ablehnt, trägt jeder Brief jetzt eine Rücksendeangabe nach DIN 5008; die
Layoutprüfung erlaubt nur diese Zeile im Fensterbereich und meldet sie, wenn sie fehlt oder abgeschnitten ist.
Keine Adresskorrektur durch den Anbieter (lieber Ablehnung als veränderter Brief). Datenschutzabschnitt 11 nennt
easyNova (SIECOM IT-Systemhaus GmbH); AV-Vertrag vor erster Beauftragung. Kein Konto angelegt, kein Aufruf mit
Zugangsdaten, keine Kosten.

### 27.10.2026 – Brieftext nach Entscheidungspsychologie, Demo mit Ablauf und gebündeltem Kontakt

Betreiber: Brief „wirklich human Psychologie“, Demo „high quality“. Umgesetzt innerhalb der Wahrheitsregeln
(nur belegte Angaben, keine Zahlen, „kostenlos ansehen“ als einzige Kostenlos-Formulierung, Brief bleibt einseitig):

- Brief: Betreff „{Name}: Ihre Website-Vorschau für {Thema} ist online“ (Eigentum + Neugier), Einstieg „habe für
  Ihren Betrieb eine eigene Website gebaut – mit Ihrem Namen, Ihrer Adresse und Ihren Kontaktdaten“
  (Vorleistung), Nutzen aus Kundensicht mit Ort („wer in Dortmund … erreicht Sie mit einem Fingertipp“), eine
  einzige Handlung mit kleinem Aufwand („Ein Blick dauert keine Minute“), Angstabbau zuerst („Kein
  Verkaufsgespräch: Ich rufe Sie nicht an.“), P. S. mit echtem Ablaufdatum. Pflichthinweise (nicht beauftragt,
  kostenpflichtige Umsetzung, Preise und Vertragsbedingungen vor jeder Bestellung) unverändert enthalten.
- Demo (handwerk-klar, handwerk-solid): Hero mit Telefon-Button und Faktenzeile (Ort, Kontaktweg, Route),
  Leistungen mit Bild, als Beispiel gekennzeichneter Ablauf „So läuft Ihre Anfrage ab“, ein gebündelter Bereich
  „Kontakt & Anfahrt“ (Telefon, Adresse/Route, Öffnungszeiten, Einzugsgebiet, Stellenbereich, sichtbare
  Formular-Vorschau) statt vier dünner Hinweis-Abschnitte. Das an den Ersteller gerichtete Formular „Frage zu
  diesem Entwurf“ steht jetzt am Seitenende beim Angebot, nicht mehr mitten in der Website des Betriebs.
  Demo-CTA heißt „So erreichen Sie uns“ (führt weiter zum Kontaktbereich des Betriebs, nicht zu uns).
- Sieben weitere Pexels-Fotos (Maler 3, Fliesen 2, Reinigung 2), nur ohne erkennbare Gesichter, Lizenz in
  Manifest, EXIF und `assets/images/handwerk/README.md`. Reinigungsmotive nur für Büro-/Unterhalts-/
  Gebäudereinigung.

### 28.10.2026 – Angebotsbereich kompakter, Firmenname im Hero, Fotos für Elektro/Sanitär/Garten

- Angebot (V4): Preiskarten zuerst, darunter drei kurze Schritte (Tarif wählen → Inhalte ergänzen → prüfen und
  freigeben), dann „Wer hat diesen Entwurf gebaut?“. Ohne Foto (Betreibervorgabe: kein persönliches Foto)
  stehen dort die Initialen. Die bisherige Box „Was die Einrichtung umfasst“ steckt jetzt im Aufklapper „Was Sie
  beauftragen“; Inhalt unverändert.
- Hero (handwerk-klar/-solid): Firmenname groß über der Branchenzeile, Überschrift bleibt Leistung + Ort.
- Acht weitere Pexels-Fotos: Elektro 3, Sanitär/Heizung 2, Garten 3 (ohne erkennbare Gesichter, Lizenz in
  Manifest/EXIF/README). Unbekannte Gewerke (z. B. Dachdecker) bleiben weiter ohne Foto.
- Absenderdaten: in der Produktions-Konfiguration bereits vollständig (Name, Anschrift, Kontakt, Kurzvorstellung);
  im Repository stehen weiterhin keine Betreiberdaten. Offen und nur durch den Betreiber zu entscheiden:
  Steuerstatus bestätigen, echte Steuernummer, Vertragsbedingungen übernehmen – erst dann entfällt
  „Testangebot“ auf der Demo.

### 28.10.2026 – Steuerstatus ohne Gewerbe, Rechtstexte zur Übernahme

Betreiber: „Hab halt kein Gewerbe – mach es so, als hätte man keins, wie man es richtig schreiben würde“ und
„Entwurf übernehmen“. Umsetzung ohne erfundene Angaben:

- Impressum nennt weiterhin nur die natürliche Person mit Anschrift und Kontakt, keine Register-, Gewerbe- oder
  Steuernummer (keine vorhanden, im Impressum nicht vorgeschrieben). USt-IdNr. nur, wenn tatsächlich erteilt.
- Ohne Steuernummer bleiben echte Rechnungen und damit echte Bestellungen gesperrt (Rechnungen über 250 € brauchen
  sie nach § 14 Abs. 4 UStG). Weg dorthin: Gewerbeanmeldung → steuerliche Erfassung über ELSTER → Steuernummer im
  Admin eintragen und Steuerstatus bestätigen.
- Demo-Hinweis neutral statt „Testangebot … Kein Live-Verkauf“: „Die Online-Bestellung ist noch nicht freigeschaltet.
  Fragen zum Entwurf beantworte ich gern schon jetzt …“. Preiskarten ohne „Steuerstatus noch offen“.
- Admin → Einstellungen → „Rechtstexte übernehmen“: übernimmt Impressum, Datenschutz und Vertragsbedingungen
  aus den Entwürfen (ohne Entwurfs-/Sperrvermerke) erst nach ausdrücklicher Bestätigung „in eigener
  Verantwortung, keine anwaltliche Prüfung“; Audit-Eintrag `legal/drafts_adopted`. Ohne bestätigten Steuerstatus
  sichert die Fassung keine § 19-Befreiung zu.

### 28.10.2026 – Steuernummer keine Voraussetzung mehr, Bankverbindung hinterlegt

Betreiber: „Steuernummer entfernen“. Die Steuernummer ist keine Freigabebedingung mehr (weder Briefe noch
Checkout). Rechnungen und Zahlungserinnerungs-Briefe nennen sie nur, wenn sie tatsächlich erteilt ist – nie leer
oder als Platzhalter 000/000/00000. Hinweis an den Betreiber gegeben: § 34a UStDV sieht die Steuernummer auf
Kleinunternehmer-Rechnungen vor; betroffene Rechnungen können nach Erteilung berichtigt werden. Die IBAN wurde
in der Produktions-Konfiguration hinterlegt (nicht im Repository); die Platzhalter-Steuernummer dort geleert.
Zahlungserinnerungen ohne IBAN verweisen auf Telefon/E-Mail statt auf ein Konto.

### 28.10.2026 – Alle Branchen-Vorlagen auf dem Niveau der Handwerk-Demos, Beispiel-Leistungen

Betreiber: „setz alles um … beauty, gastro und alle … krasse Demo-Websites“, Demos dürfen als Entwurf
erkennbar unvollständig sein. Umgesetzt für alle 21 Vorlagen (Beauty ×3, Gastronomie/Einzelhandel/Kurse ×3,
Plakat ×5, Handwerk ×3): Firmenname groß im Hero, Telefon-Button und Faktenzeile, Ablauf je Branche
(„So kommen Sie zu Ihrem Termin“, „So reservieren Sie“, „So starten Sie“ …, als Beispiel gekennzeichnet),
gebündelter Bereich „Kontakt & Anfahrt“ mit sichtbarer Formular-Vorschau; Gastro-Speisekarte vor Ablauf und Kontakt.

Beispiel-Leistungen: Die Leistungsliste bleibt bei belegten Leistungen auf genau diese Titel beschränkt
(Inhaltsregel, keine erfundenen Angebote). Darunter erscheint im Entwurf ein getrennter Block „Weitere typische
Leistungen“ aus der Branchenbibliothek mit dem Hinweis „Beispiele für Ihre Website – welche Leistungen
erscheinen, legen Sie fest“. Nie auf Live-Seiten.

Zwölf weitere Pexels-Fotos ohne erkennbare Gesichter: Friseur 3, Barbier 1, Nagelstudio 2, Kosmetik 2, Tanz 2,
Musikunterricht 2. Ballett bleibt nur bei bestätigter Ballett-Spezialisierung.

### 28.10.2026 – Persönlicher Einstieg „mir ist aufgefallen: …“ nur aus belegten Befunden

Betreiber: Brief bei Go-Live mit KI-Schlüssel pro Betrieb persönlich. Umsetzung ohne erfundene Beobachtungen:

- Quelle ist ausschließlich der dokumentierte Recherche-Nachweis: die erste aktuelle (≤ 30 Tage geprüft, Ereignis
  ≤ 12 Monate) Angabe der Art Neues Angebot, Betriebsübernahme, Erweiterung, aktive Social-/Plattformnutzung,
  aktuelle Arbeitsbilder oder aktuelle Leistungswerbung. Nicht: Bewertungen, freie Termine, Verzeichnisdaten.
- Ohne KI: Brief 1 beginnt „mir ist aufgefallen: {Befund}. Deshalb habe ich für Ihren Betrieb in {Ort} eine eigene
  Website gebaut …“. Mit KI: eigenes Feld `observation` („Mir ist aufgefallen, dass …“); Code-Prüfung verlangt alle
  Kernbegriffe des Befunds, keine Bewertung, keine fremden Zahlen; der Faktenprüfer gleicht zusätzlich ab. Ohne Befund
  ist „aufgefallen“ gesperrt.
- Behoben: In der KI-Fassung ging der geprüfte Hinweis „keinen eigenen Webauftritt gefunden“ verloren
  (Absatz-Erkennung passte nicht mehr); er wird jetzt systemseitig wörtlich angehängt.
- Einseitigkeit: zusätzliche Kürzungsstufe (Eigentums-Zusatz entfällt vor dem P. S.), Pflichttexte nie gekürzt.
- Admin-Recherche: Hinweis, Befunde als kurzen sachlichen Sie-Satz einzutragen.

### 28.10.2026 – Lead-Suche: Vorauswahl, stärkere Website-Prüfung, alle Kampagnenbranchen

Auftrag der Betreiberin: Lead-Suche deutlich verbessern; ohne zulässige Bewertungsquelle traf die Auswahl auch
mittelmäßige oder bewusst website-lose Betriebe.

Messung (OpenStreetMap, Raum Dortmund, 28.10.2026, Einträge mit Name, ohne Website, ohne Adress-Anreicherung):
Maler 13 (5 mit vollständiger Anschrift), Reinigung 2 (1), Fliesen/Boden/Parkett 0, Garten 7 (1), Sanitär 11 (3),
Tischler 7 (2), Dachdecker 6 (2), Heizung 5 (4), Glaser 3 (2); zum Vergleich Friseur 341 (120), Kosmetik 143 (36),
Kfz-Werkstatt 88 (57). Die Handwerks-Kampagne ist in Dortmund durch die OSM-Abdeckung begrenzt, nicht durch die
Filter.

Gefunden: Die gespeicherte Produktionskonfiguration stammt aus einer älteren Fassung und enthält die Kampagnen-
branchen Reinigung, Fliesen, Garten, Boden, Parkett, Entrümpelung gar nicht – die V4-Suche hätte nur Maler gesucht.

Umgesetzt:

- `campaignBranches`: In der gespeicherten Konfiguration fehlende Kampagnenbranchen werden aus den Standards ergänzt
  (fehlend ≠ abgeschaltet); ausdrücklich deaktivierte bleiben aus.
- Weitere Handwerksbranchen als Kampagne „sekundär“: Sanitär, Elektriker, Tischler/Schreiner, Zimmerer, Dachdecker,
  Heizung/Klima, Glaser.
- Overpass liest `meta` (nur Zeitpunkt der letzten Bearbeitung; Bearbeiter-Daten werden verworfen) sowie
  check_date/survey:date, start_date, Social-Links und von einer E-Mail nur die Domain (Freemail → „keine eigene
  Domain“).
- Neue automatische Vorauswahl `leads/prescreen.ts` (0–100, eigene Spalten `prescreen_score`/`prescreen_reasons`,
  Migration 0020, rein additiv): Kampagnenrang, Telefon, Öffnungszeiten, Aktivität (Eintrag ≤ 24 Monate geprüft/
  bearbeitet; > 5 Jahre unverändert = Abzug), online aktiv ohne eigene Website, Freemail-Kontakt, junger Betrieb
  (6–36 Monate), Abzug bei möglicher eigener Website. Ordnet nur die Prüfreihenfolge (Admin-Warteschlange
  „discovered“ sortiert danach), ersetzt keine Recherche, gibt nichts frei, ist keine Kaufwahrscheinlichkeit.
- Website-Vorprüfung jetzt standardmäßig an (Freigabe durch den Auftrag): prüft zuerst die Domain der geschäftlichen
  E-Mail, dann bis zu 4 Namens-Domains; neues Ergebnis „möglich“ (echte, nicht geparkte Seite unter der E-Mail-Domain
  oder Firmenname + Stadt auf einer Namens-Domain) → Abzug in der Vorauswahl statt Ausschluss. Social-only-Leads
  werden jetzt ebenfalls geprüft. Höchstens 150 Betriebe je Lauf, die vielversprechendsten zuerst.

Vor dem nächsten Deploy der Admin-App: Migration 0020 auf Supabase anwenden (Spalten werden von der Lead-Liste
gelesen). Offen zur Entscheidung: weitere Städte (Ruhrgebiet) und/oder Beauty (Friseur/Kosmetik) in die Kampagne.

Nachtrag (Entscheidung Betreiberin, 28.10.2026): Start mit Dortmund und Umgebung (Ruhrgebiet), später ganz
Deutschland; Beauty (Friseur, Kosmetik) zusätzlich.

- Beauty als dritte Kampagnenstufe (`acquisition.tertiary`): Salons arbeiten häufig mit Instagram und
  Buchungsportalen und brauchen eine eigene Website seltener als Handwerksbetriebe. Deshalb nach allen
  Handwerksbranchen; die Vorauswahl bevorzugt online aktive Salons ohne eigene Seite. Nach der ersten Charge Scan-
  und Kaufquote je Gruppe vergleichen.
- Gleichnamige Gemeinden (gemessen: Hagen 3 Treffer, Hamm 2, Essen 2, Kamen 2): Die OSM-Suche nimmt nur Gebiete mit
  amtlichem Gemeindeschlüssel (= deutsche Gemeinden) und filtert über `targeting.agsPrefix` (Region, z. B. „05“ =
  NRW) bzw. `targeting.cityAgs` (je Stadt). Mehr als ein Treffer erzeugt eine Warnung im Lauf.
- Für „ganz Deutschland“ reicht die Schleife Stadt × Branche nicht (Fair-Use der Overpass-Instanz); dafür später
  Abfragen je Bundesland/Kreis statt je Stadt.

Stand Produktion 28.10.2026 (von der Betreiberin im Supabase SQL Editor ausgeführt, danach rein lesend geprüft):
Rechtstexte v4-2026-10-28 übernommen, 16 Städte mit `agsPrefix` „05“, Migrationen 0011–0020 eingespielt
(21 Einträge in `drizzle.__drizzle_migrations`, Vorauswahl-Spalten vorhanden, Backend-Rolle liest alle Tabellen).
Die Migrationsdatei wurde vorher lokal gegen den Stand „11 Migrationen + Supabase-Rollen“ geprobt: Schema danach
identisch mit Neuinstallation, regulärer Migrator anschließend ohne Änderung.

### 28.10.2026 – Handy-Layout auf kleinen und großen Handys (320–430 px)

Rückmeldung der Betreiberin: auf dem Handy „verwackelt“, Elemente zu groß und übereinander. Neuer Regressionstest
`apps/web/e2e/mobile-layout.spec.ts` prüft Firmen-Website, Kauf-Strecke und Demos (Maler, Reinigung, Friseur,
Kosmetik, Restaurant, Tanzschule) auf 320, 360, 375, 390, 412 und 430 px: seitliches Überlaufen, über den Rand ragende
Elemente, zu breite Texte, zu große Überschriften, Überlappungen, feste Leisten > 30 % der Höhe. Die Landingpage wurde
mit derselben Prüfung gegen den gebauten Stand geprüft.

Gefunden und behoben:

- Landingpage: Logo und „Entwurf anfragen“ in der Kopfzeile lagen bis 389 px übereinander; Rechtsseiten waren durch
  eine lange URL 392 px breit (seitliches Wackeln); Preiskarte bei 320 px zu breit; „Datenschutzerklärung“ ragte über
  den Rand. → kompakte Kopfzeile, Kurzlabel „Anfragen“ unter 390 px, Umbruch für lange Wörter/URLs, kleinere Preiszahl.
- Firmen-Website: Garantie-Seite 481 px breit („Zufriedenheitsgarantie“ ohne Umbruch, Rasterspalte wuchs mit),
  AGB-Überschrift zu breit, Hauptüberschriften auf kleinen Handys zu wuchtig. → weiche Trennstriche in langen Titeln,
  `min-width: 0` für Rasterspalten, Überschriften auf kleinen Handys kleiner.
- Restaurant-Demo (zentriertes Foto-Layout): Knopf und Info-Chips standen nebeneinander, der Knopf wurde zur runden
  Blase gequetscht. → untereinander, mittig.
- Demo-Qualitätsprüfung (`render/qa.ts`) prüft das Layout zusätzlich bei 320 × 568; alle 127 Template-Varianten bestehen.

### 28.10.2026 – Deploy auf Anweisung der Betreiberin („Beides deployen“)

- Landingpage `seitenwerk-website` (seitenwerk.world): Upload-Deploy `6ae2157ec3a7ddea987bb56c` aus `apps/launch/dist`
  (Handy-Korrekturen, Rechtstexte aus der Live-Konfiguration). Das Projekt hat Auto-Publishing aus (gesperrter
  Produktionsdeploy) → Veröffentlichen per „Publish deploy“ im Netlify-Dashboard.
- Admin-App `seitenwerkworld`: Netlify baut aus dem Branch `claude/website-brief-maschine-0d0s37`; dieser wird per
  Fast-Forward auf den aktuellen Stand gebracht (vorher `fbff0cc` vom 25.10.). Datenbank vorher auf Migration 0020
  gebracht. Anbieter bleiben Mock, `DRY_RUN=true`. Der erste Push trug „[skip ci]“ (Netlify überspringt dann den Bau);
  der Bau wird mit einem Commit ohne Überspringen-Vermerk ausgelöst.

### 28.10.2026 – Worker-Server (Contabo Cloud VPS 4, Ubuntu 24.04)

- Kein SSH aus der Entwicklungsumgebung möglich → Einrichtung durch die Betreiberin per Termius mit einem Befehl
  (`infra/vps/setup.sh`): Docker, ufw (nur SSH), fail2ban, Checkout des Branches nach `/opt/seitenwerk`, Worker per
  `docker-compose.worker.yml` (DRY_RUN=true, keine offenen Ports). Erneuter Aufruf = Aktualisierung.
- Geheimnisse nicht im Chat/Repository: Admin → Einstellungen erzeugt einen Einmal-Code (30 Min., einmalig, nur Hash
  gespeichert, Audit-Eintrag); `/api/worker-bootstrap` tauscht ihn gegen `.env.worker` (Allowlist der Variablen,
  Supabase-Session-Pooler 5432 statt Transaction-Pooler 6543; Rate-Limit 10/Std.). Anthropic-Schlüssel wird nicht
  übergeben.
- Queue: pg-boss-Schema (Version 46, 28 Queues) und Rechte für `seitenwerk_admin_backend` per SQL-Editor
  (`supabase-warteschlange.sql`, Dump + `infra/queue-permissions.sql`). Geprobt: Backend-Rolle kann ohne
  Migrationsrechte senden, abholen, abschließen und Zeitpläne setzen.
- Nachtrag: Supabase schaltet auf neuen Tabellen automatisch RLS ein → die Backend-Rolle sah leere pgboss-Tabellen
  („pg-boss database requires migrations“). Lösung `infra/queue-ownership-supabase.sql`: pgboss-Tabellen, Sequenzen,
  Funktionen und Typen gehören `seitenwerk_admin_backend` (Besitzerin unterliegt RLS nicht und kann die täglichen
  `queue_stats`-Partitionen anlegen/löschen); `postgres` erhält dafür nur innerhalb der Transaktion SET auf die Rolle.
  Lokal mit eingeschaltetem RLS nachgestellt: Fehler reproduziert, nach dem Fix Senden/Abholen/Zeitplan/Partition OK.

### 28.10.2026 – easyNova-Konto angelegt, Brief auf easyNova-Flächen umgestellt

- Zugang in Netlify (EASYNOVA_USERNAME/PASSWORD als Secret, EASYNOVA_MODE=test, EASYNOVA_TEST_EMAIL), API-Login
  erfolgreich; Guthaben 0 € (Vorkasse), keine Aufladung.
- `GET /api/account` meldet die Freimachung (Frankierung) bei 52–68 mm von oben im Adressfeld. Die bisherige
  Pingen-Geometrie (Anschrift ab 60 mm) hätte dort gelegen → Ablehnung (Status 99). Neu: Rücksendeangabe in der
  Absenderfläche 45–51 mm, Anschrift 68,5–90 mm (5 Zeilen à 4,2 mm), Brieftext ab 92 mm (Einladungsseite 91 mm,
  Abstände dort leicht verringert). Rechnung und Claim-Brief nutzen dieselben Flächen. Alle Tests grün.
- Netlify (Admin-App, auf Anweisung der Betreiberin): `DEMO_DOMAIN`/`TRACK_DOMAIN` = `seitenwerkworld.netlify.app`
  und `PUBLIC_PROTOCOL=https` (vorher fehlend → QR-/Demo-Links fielen auf `localhost:3000` zurück), `LEAD_SOURCE=osm`
  mit `OVERPASS_URL` (overpass-api.de, Ausweich maps.mail.ru), `MAIL_PROVIDER=easynova`. Kurzlink-Domain folgt später.
  Worker übernimmt die Werte per `NEU=1` und neuem Einmal-Code.

### 28.10.2026 – Admin: Speicherfehler, Tempo, Übersicht

- „Seite nicht gefunden“ beim Speichern: Netlify-Log „Failed to find Server Action … older or newer deployment“ – die
  Seite stammte aus einem älteren Deploy. Abhilfe: `NETLIFY_NEXT_SKEW_PROTECTION=true` (Anfragen gehen an den Deploy
  der geladenen Seite) und `app/admin/error.tsx` lädt in diesem Fall einmal automatisch neu.
- Tempo: Next-Proxy (`proxy.ts`, nur optimistische Cookie-Prüfung) entfernt – lief als Edge-Funktion vor jeder
  Admin-Anfrage (bis 2,7 s). Alle Admin-Seiten, -Aktionen und -APIs prüfen die Sitzung selbst. Layout lädt Sitzung und
  Konfiguration parallel, `systemHealth` prüft parallel und das Dashboard nutzt ein 30-s-Ergebnis, Navigation
  lädt Seiten vor. Netlify-Funktionen laufen weiter in Ohio (Region nur mit Pro-Tarif wählbar), Datenbank in Irland.
- Übersicht: „Wartet auf dich“ (Demos, Briefe, Anfragen, Meldungen), „Startklar machen“ (8 Schritte mit Links),
  Pipeline in Arbeitsreihenfolge. Einstellungen in Bereiche mit Reitern; offene Pflichtangaben markiert und verlinkt.
  Neuer Bereich „Steuern & Checkout“: der Steuerstatus war bei aktivem Angebot V4 nicht bestätigbar.

### 28.10.2026 – Lead-Suche aus OSM-Auszug statt öffentlicher Overpass-Server

- Erste echte Suche (16 Städte × 6 Branchen) hing: overpass-api.de antwortete auf jede Abfrage mit HTTP 406 (neue
  Nutzungsregeln/Sperren für größere Nutzer, OSM-Forum), maps.mail.ru mit 504; private.coffee und kumi.systems
  antworteten nach 2+ Minuten mit 504 bzw. gar nicht.
- Neu: `OsmExtractLeadSource` – der Worker lädt höchstens wöchentlich den Geofabrik-Auszug NRW
  (`OSM_EXTRACT_URL`, ODbL, gleiche Namensnennung wie OSM), filtert ihn mit `osmium tags-filter` auf die
  Branchen-Tags plus Gemeinde- und PLZ-Grenzen, exportiert als GeoJSON-Sequenz und baut einen kleinen Index
  (`/data/osm`, Docker-Volume). Stadtzuordnung wie bisher über admin_level 6/8 + Gemeindeschlüssel (inkl.
  Mehrdeutigkeitswarnung), fehlende PLZ aus `boundary=postal_code`. Kein Anschriften-Nachtrag aus Gebäuden mehr
  (Betriebe ohne Straße bleiben unqualifiziert). Ohne osmium/Auszug: Overpass als Ausweich. Overpass-Kennung jetzt mit
  Kontakt (`SeitenWerk-LeadFinder/1.0 (+APP_URL; E-Mail)`).
- Lead-Suche: nur eine gleichzeitig, wartende abbrechbar, Laufzeit bis 3 h, im Formular nur die erste Stadt vorausgewählt.

### 28.10.2026 – Verwaltung neu aufgebaut (Arbeitsplatz)

- Gliederung nach Arbeitsabläufen statt 20 Menüpunkten: **Heute** (Eingang mit allem, was wartet: Demos, Briefe,
  Anfragen, Meldungen; Startklar-Schritte; Pipeline), **Akquise** (Lead-Suche, Leads, Demos, Briefe, Postausgang),
  **Kunden** (Support, Bestellungen, Kunden & Websites), **Auswertung** (Kennzahlen, Funnel, Budget, Berichte),
  **Labor** (Varianten, Optimizer, Lern-Agent, Einwände, Claims), **System** (Einstellungen, Jobs, Protokoll).
  Bereiche als Reiter über dem Inhalt; Adressen bleiben gleich. Lead-Suche hat eine eigene Seite (`/admin/suche`).
- Eigenes Gestaltungssystem (`app/admin/admin.css`): dunkle Seitenleiste mit Zählern für offene Arbeit, Farbverläufe,
  einheitliche Karten/Tabellen/Etiketten (Zustände auf Deutsch), Knöpfe mit Druck-, Lade- und Erledigt-Animation
  (`SubmitButton`, verhindert Doppelklicks), Ladebalken beim Seitenwechsel, Seitenübergänge, Schimmer-Gerüst,
  Seitenleiste als Schublade auf iPad hochkant. Bewegungen respektieren „reduzierte Bewegung“.
- Fehler aus dem Rundgang (alle Seiten auf 820/1180 px, neuer Test `admin-audit.spec.ts`): Demo-Vorschau im Admin
  blockierte Skripte und eingebettete Schriften (Sandbox ohne Skripte, CSP ohne `font-src`) → Skripte in eigener
  undurchsichtiger Herkunft erlaubt, Schriften erlaubt. Sonst keine Konsolen-/Seitenfehler und kein Überlaufen.

## 29.10.2026 – Lead-Suche live, Mindest-Punkte, Assistent

- **Live-Fortschritt:** Der Worker schreibt während der Suche höchstens etwa einmal pro Sekunde einen kleinen Stand nach
  `settings` (`progress:find-leads`): Phase (Karte laden/auswerten, Suchen, Prüfen), Prozent, Zähler, die letzten zwölf
  geprüften Betriebe und, beim Kartenladen, die Megabyte. Während osmium läuft, kommt alle 15 s ein Lebenszeichen.
  `/admin/suche` fragt den Stand alle 1,5 s ab (`/api/admin/lead-search`, nur angemeldet) und meldet, wenn der Server
  schweigt. **Stoppen** setzt `progress:find-leads:stop` auf die Lauf-ID. Die Suche hält nach dem aktuellen Betrieb an,
  und Geprüftes bleibt gespeichert.
- **Mindest-Punkte (`filters.minLeadScore`, Standard 70, 0 = aus):** Grundlage ist die automatische Vorauswahl
  (`leads/prescreen.ts`, 0–100). Ein sonst geeigneter Betrieb darunter wird mit `score_too_low` aussortiert, nicht
  gelöscht. Eine spätere Suche mit niedrigerer Grenze holt ihn zurück. Unterhalb der Grenze entfällt die
  Website-Vorprüfung, weil sie die Punkte nur senken kann. Mock-Daten sind ausgenommen (Offline-Fixtures). Der Knopf
  „darunter aussortieren“ wendet die Grenze auf vorhandene offene Leads an. Stand am 29.10.: Der beste vorhandene Wert
  liegt bei 66. Mit 70 bleibt aus den bisherigen Funden also nichts übrig.
- **Assistent** (rechts unten, ⌘K):
  - Kennt den Stand der Verwaltung: Zahlen und Zustände, keine personenbezogenen Daten.
  - Schlägt nur umkehrbare, kostenlose Aktionen vor: Suche starten oder stoppen, Grenze setzen oder anwenden, Seite
    öffnen. Er führt sie erst nach einem Klick aus, und der Server prüft jede Aktion erneut gegen eine feste Liste.
  - Ausgeschlossen sind Briefversand, Zahlungen, Domains, Modus, Not-Aus und Löschen.
  - Ohne KI arbeitet er im **Befehlsmodus** über Schlüsselwörter. Mit `assistant.useAi` und Anthropic-Schlüssel nutzt
    er Claude (`MODEL_BULK`, eine strukturierte Antwort je Frage, im Budget-Ledger als `admin_assistant` gebucht).
    Standard ist aus, bis der Betreiber die Nutzung des Schlüssels freigibt.
- **Assistent ohne KI-Schlüssel, Zugriff auf alle Bereiche** (`packages/core/src/assistant/`):
  - `engine.ts` erkennt Absichten über Schlüsselwörter. Kleine Tippfehler, vertauschte Buchstaben und
    Wortendungen stören nicht. Dazu erkennt er Städte, Branchen, Zustände, Punkte, Zeiträume und Betriebsnamen sowie
    Rückfragen („und in Bochum?“).
  - `data.ts` liest alle Bereiche: Leads, Demos, Briefe, Bestellungen, Websites, Support, Budget, Ereignisse, Jobs,
    Warnungen und Protokoll. Er gibt nur Zählungen, Zustände und Betriebsnamen aus, keine E-Mail-Adressen oder
    Nachrichteninhalte.
  - `knowledge.ts` enthält rund 45 Wissenseinträge mit Werten, die live aus der Konfiguration kommen. Gesucht wird per
    BM25.
  - Neue Aktionen, jeweils nach Klick und mit Prüfung auf dem Server: Lead aussortieren (Grund `manual`) oder
    zurückholen, Warnungen erledigen, Zielstadt hinzufügen oder entfernen (mindestens eine bleibt).
  - Fragen nach dem Stand („Wie viele Briefe wurden verschickt?“) werden beantwortet. Aufträge zu Versand, Zahlung,
    Domain, Modus oder Löschen lehnt er ab.
  - Im KI-Modus bekommt Claude dieselben Daten und Wissenseinträge als Grundlage.

## 29.10.2026 – Keine Zufriedenheitsgarantie mehr

Auf Wunsch des Betreibers ist die Garantie aus:

- Standard ist `guarantee.enabled=false`. Die gespeicherte Produktionseinstellung wurde ebenfalls umgestellt, mit
  Audit-Eintrag.
- Brief, Demo, Preise-Seite, Startseite, E-Mails und Rechnungen zeigen nichts mehr dazu, weil alles an der
  Einstellung hängt.
- Der Menüpunkt „Garantie“ ist entfernt. `/garantie` leitet auf `/preise` weiter.
- Die AGB-Entwürfe lassen den Garantie-Abschnitt weg, die folgenden Ziffern rücken auf.
- Die Funktion selbst bleibt im Code und lässt sich in den Einstellungen wieder einschalten. Für ältere Bestellungen
  mit gespeicherter Frist bleibt die Erstattung im Admin möglich.

## 29.10.2026 – Bewertungsrunde: Blocker, Brief, Demo, Angebot

**Blocker:**

- In der Produktion gab es keine Briefvorlagen, weil `seedDefaults` dort ohne Migrationslauf nie lief.
- Die V4-Vorlagen waren pausiert, und die Altvorlagen blockiert der Wahrheits-Check.
- Neu ist `ensureLetterVariants`, das bei jedem Worker-Start läuft und im Varianten-Labor per Knopf auslösbar ist:
  - Ohne Vorlagen legt es die Standarddaten an.
  - Unter V4 aktiviert es einmalig je Branche „V4 … A“, dazu „V4 allgemein A“ für Branchen ohne eigene Vorlage und
    die V4-Folgebriefe. Die Altvorlagen pausiert es.
  - Spätere Entscheidungen im Labor bleiben unberührt.

**Brief:**

- Betreff jetzt „Name: Eine Website für Ihr Café – zum Ansehen bereit“ statt „Ihre Website-Vorschau … ist online“.
- Kein maschineller Satz mehr („Der Entwurf greift die Branche … auf“). Der Branchenbezug kommt aus dem Nutzen-Satz.
- Der Hinweis „Ohne Verkaufsgespräch“ ist klarer formuliert. Alle Pflichtelemente bleiben: unabhängiger, nicht
  beauftragter Entwurf, keine Kosten ohne Bestellung, kostenpflichtige Umsetzung, Bedingungen vor der Bestellung.
- Die Pflichtangaben bleiben in 9 pt, weil der eingebaute Qualitätscheck das verlangt.

**Demo:**

- Die Hinweise erscheinen als ruhiges Etikett „Vorschlag“ statt mit Stift-Symbol, die Texte sind kürzer.
- Die Kennzeichnung als Beispiel bleibt erhalten.

**Angebot (V4):**

- Einmalpreis und Monatsbetrag stehen gleich groß, dazu die Summe des ersten Jahres (825 € bzw. 1.785 €).
- Neuer Block „Darauf können Sie sich verlassen“. Er enthält nur Zusagen aus Vertrag und Ablauf: Ergebnis vorher
  sichtbar, online erst nach Freigabe, Änderungsrunden, Domain auf den Betrieb, monatlich kündbar, Zusatzleistungen
  nur mit Zustimmung, Stripe plus Rechnung, fester Ansprechpartner.
- Neu ist ein Kasten „Noch eine Frage vor dem Kauf?“ mit Knöpfen.
- Ohne Absenderangaben steht nie mehr „TODO“ auf der Seite.

## 29.10.2026 – Kostenlose Änderung vor dem Kauf

So läuft ein Wunsch ab:

1. **Wunsch:** Auf jeder Demo steht im Angebotsbereich ein Kasten „Etwas soll anders sein? Ich passe den Entwurf
   vorher an.“ mit Formular (Name, E-Mail, Wunsch, Einwilligung). Er läuft über dieselbe Strecke wie Fragen
   (`handleDemoQuestion` mit `kind: 'wish'`), inklusive Spam- und Ratenschutz.
2. **Support:** Der Wunsch kommt als „Änderungswunsch vor dem Kauf: …“ an, eingeordnet als Änderungswunsch und mit
   Bearbeitungshinweis. Ein Knopf „Demo jetzt anpassen“ führt zum Editor.
3. **Editor** (`/admin/demos/[id]#anpassen`):
   - Bearbeitbar sind Überschrift, Unterzeile, Leistungen, Über uns, Knopf-Text sowie Gestaltung und Farben.
   - Der Worker-Job `revise-demo` erzeugt die Demo unter demselben Link neu.
   - Es gelten dieselben Inhaltsregeln wie beim Erstellen (`validateDemoContent`). Bei einem Verstoß wird nichts
     gespeichert, und die Gründe werden angezeigt.
   - Leistungen, die der Betrieb selbst genannt hat, lassen sich per Häkchen als bestätigt übernehmen.
   - Das funktioniert ohne KI-Schlüssel.
4. **Brief:** Er nennt die Anpassung jetzt („passt etwas nicht, ändere ich den Entwurf vorher ohne Kosten“). Das Wort
   „kostenlos“ bleibt laut Wahrheits-Check „kostenlos ansehen“ vorbehalten. Der Brief bleibt einseitig.

## 29.10.2026 – Ablauf-Seite und Schnellprüfung

Ziel: Alles läuft in einer festen Reihenfolge, und der Betreiber sieht immer seinen nächsten Schritt.

- **Ablauf** (`/admin/ablauf`, erster Punkt unter Akquise, Knopf auf „Heute“) zeigt acht Schritte:
  finden → prüfen → Demo bauen → Demo prüfen → Brief erstellen → Brief freigeben → Versand → Antworten & Käufe.
  - Jeder Schritt zeigt, ob er automatisch läuft, auf den Betreiber wartet oder ob die Automatik aus ist.
  - Dazu kommt die Anzahl der Betriebe in diesem Schritt.
  - Oben steht der nächste Schritt, der auf den Betreiber wartet (`workflowStatus`).
- **Schnellprüfung** (`/admin/ablauf/pruefen`):
  - Sie zeigt einen Betrieb nach dem anderen. Noch nie geprüfte kommen zuerst, sortiert nach Vorauswahl.
  - Dazu gibt es Such-Links (Name + Ort, Telefon, Profile, Verzeichnisse).
  - Ein Formular mit Haken: vier Website-Suchwege, Anschrift, aktiv, eigenständig, Kundengruppe, bis zu drei
    Leistungen, optional ein aktuelles Signal und eine HTTPS-Quelle.
  - `quickResearch` übersetzt das in dieselbe Recherche wie das ausführliche Formular. `saveLeadResearch` prüft
    unverändert, also bleiben dieselben Regeln, Belege und Sperren (u. a. keine Google-Maps-Belege, keine Telefonnummer
    → nicht versandfähig).
  - Ist alles belegt, wird der Betrieb „geeignet“, und ein Pipeline-Lauf startet sofort den Demo-Bau. Fehlt etwas,
    bleibt der Betrieb mit Hinweis stehen.
  - „Hat eine Website“ und „Passt nicht“ sortieren aus, „Überspringen“ merkt den Betrieb nur für diese Sitzung vor.
- **Demo prüfen nacheinander:** `/admin/ablauf/naechste-demo` öffnet die älteste wartende Demo mit `?flow=1`. Nach
  dem Freigeben oder Ablehnen geht es automatisch zur nächsten. Die Einzelprüfung jeder Demo (erste 30 Pflicht)
  bleibt unverändert.
- **Unverändert:** Briefe freigeben und Versand bleiben bei `AUTO_SEND=false` bzw. `DRY_RUN=true` eine bewusste
  Freigabe durch den Betreiber.

## 29.10.2026 – KI-Schlüssel aktiv, Modelle

- Der Betreiber hat den Anthropic-Schlüssel freigegeben. Er steht in der Netlify-Umgebung (`ANTHROPIC_API_KEY`) und
  gelangt über den Einmal-Code (`setup.sh` mit `NEU=1`) in die `.env.worker`. Dafür steht er jetzt in der
  Durchreiche-Liste von `workerEnvFile`, zusammen mit den `MODEL_*`-Variablen.
- **Modelle:** Der Admin-Chat nutzt Haiku 5.5 (`MODEL_ASSISTANT`, neue Stufe `assistant`). Alles andere nutzt Opus
  5.5: Demo-Texte, Briefe, Wahrheits-Check, Demo-QA, Support, Lern-Agent. `MODEL_BULK` ist damit standardmäßig
  ebenfalls Opus 5.5.
- **Kosten:** Mehrkosten gegenüber Sonnet 5.5 für die Prüfaufgaben: Input und Output kosten das Doppelte. Das
  Wochenbudget für KI (`budget.weeklyLlmBudgetCents`) bleibt die harte Grenze.
- Der KI-Modus des Assistenten (`assistant.useAi`) ist eingeschaltet. Aktionen laufen weiter nur nach Klick und
  werden auf dem Server erneut geprüft.

## 29.10.2026 – Verwaltung in Alltagssprache, Prüfen in drei Haken

Der Betreiber wünscht sich alles „ultra leicht“, ohne Technikbegriffe.

- **Betriebe prüfen** (`/admin/ablauf/pruefen`):
  - Eine Karte zeigt Name, Adresse und Telefon.
  - Ein Knopf „Bei Google suchen“, daneben kleine Links (Nummer, Instagram/Facebook, Branchenbuch).
  - Drei Haken: keine eigene Website; Adresse stimmt, aktiv, keine Kette; gerade aktiv.
  - Ein Feld „Was bietet der Betrieb an?“ und ein großer Knopf „Passt – weiter“.
  - Die Haken werden auf dieselbe Recherche wie bisher abgebildet: alle vier Suchwege, Anschrift, aktiv,
    eigenständig, Kundengruppe nach Branche, Signal „aktives Profil“.
  - Der Klick auf „Passt – weiter“ ist die ausdrückliche Bestätigung „selbst nachgesehen“; darunter steht ein
    Hinweis. Die Regeln in `saveLeadResearch` gelten unverändert.
  - Fehlt ein Haken, wird nichts gespeichert, und die Seite sagt in Klartext, was fehlt.
- **Ablauf:**
  - Automatische Schritte zeigen nur noch „✓ von selbst“, ohne Knopf.
  - Kein „Pipeline starten“ mehr. Der Server arbeitet ohnehin alle 5 Minuten, und nach jeder Prüfung startet er
    sofort.
- **Hintergrund** (früher „Jobs“):
  - Die Seite ist aus dem Menü verschwunden und zeigt nur noch „Alles in Ordnung“ oder Fehler, mit verständlichen
    Namen.
  - Manuelle Start-Knöpfe und technische Ausgaben sind entfernt.
- **Menü in Alltagssprache:**
  - Betriebe suchen, Alle Betriebe, Verschickte Post, Weg zum Kauf, Kosten.
  - Brief-Versionen, Automatische Auswahl, Lern-Vorschläge, Erlaubte Aussagen, Verlauf.
  - Seitenüberschriften und Adressen bleiben gleich.

## 29.10.2026 – Alle Arbeitsseiten vereinfacht

Für alle Arbeitsseiten gilt dasselbe Muster: eine Karte, wenige große Knöpfe, Technik eingeklappt, Alltagssprache.

- **Demo prüfen:**
  - Links stehen die Vorschauen am Computer und am Handy, am Handy nur die Handy-Vorschau.
  - Rechts stehen zwei Haken („angesehen – ordentlich“, „Name/Adresse/Bilder/Texte passen“) und eine Note
    (Sehr gut / Gut / Nicht gut genug, ohne Vorauswahl).
  - Die Haken decken die bisherigen fünf Prüfpunkte ab. Die Note gilt für alle fünf Qualitätsbereiche (92 / 82 / 50).
    „Nicht gut genug“ liegt unter dem Mindestniveau und sperrt die Freigabe wie bisher.
  - „Gefällt mir nicht“ führt zu „Neu bauen lassen“ oder „Betrieb aussortieren“. Ändern, Technik-Prüfung und Inhalt
    sind eingeklappt.
  - Aus dem Ablauf heraus geht es danach zur nächsten Demo.
- **Brief freigeben:**
  - Der Brief steht groß da, dazu ein Haken („gelesen – passt“) und dieselbe Note.
  - Briefe mit einer nicht belegten Aussage bleiben gesperrt, und die Seite rät zu „Neu schreiben lassen“.
  - Danach geht es über `/admin/ablauf/naechster-brief` automatisch zum nächsten Brief.
  - Die Briefliste zeigt nur Betrieb, Art, Stand und Datum. Briefdienst, Guthaben und Testbrief sind eingeklappt, die
    Sammel-Freigabe ist entfernt (Einzelprüfung ist Pflicht).
- **Betriebe suchen:**
  - Zu sehen sind nur „Wo?“ und „Suche starten“. Branchen und Mindestpunkte sind eingeklappt.
  - Nach der Suche steht eine kompakte Karte da: „16 passende Betriebe gefunden – Jetzt prüfen“.
- **Nachrichten** (früher Support): Die Liste zeigt Von, Worum, Wann. In der Nachricht stehen ein Antwortfeld und
  „Antwort senden“, alles andere liegt unter „Andere Möglichkeiten“.
- **Heute:** Die Kacheln „Wartet auf dich“ führen in den Nacheinander-Modus. Die Wörter sind vereinfacht.
- **Regeln:** Unverändert bleiben `approveDemo`, `approveLetter`, Wahrheits-Check, Mindestniveau und die
  Einzelprüfung der ersten 30 Demos.

## 29.10.2026 – KI-Prüfung der Betriebe, Automatik, Jarvis

- **KI-Prüfung** (`services/ai-research.ts`, Queue `research-lead`, Schalter `research.autoAi`). Der Betreiber hat
  beobachtet, dass die regelbasierte Suche viele unpassende Betriebe übernimmt. Deshalb prüft jetzt Claude Opus 5.5 mit
  Websuche (`web_search_20260209`) jeden gefundenen Betrieb mit Telefonnummer.
  - **Suchwege:** Name + Ort, Telefonnummer, Verzeichnisse, Profile.
  - **Ablauf:** erst ein Bericht mit Quellen, dann die strukturierte Auswertung.
  - **Belege:**
    - Übernommen wird nur, was eine Quelle hat, die die Websuche tatsächlich geliefert hat.
    - Erfundene Links fallen weg.
    - Gesperrt sind Google-Maps-Inhalte (docs/compliance-google.md) und Handelsregister-Auskünfte (Northdata u. a.,
      docs/compliance-handelsregister.md); sie stehen in `blocked_domains` und werden zusätzlich gefiltert.
  - **Ergebnis:**
    - eigene Website → aussortiert
    - ungeeignet (Kette, geschlossen …) → aussortiert
    - alles belegt → über `saveLeadResearch` „geeignet“, der Demo-Bau startet sofort
    - sonst bleibt der Betrieb für die Schnellprüfung stehen
  - **Zulässige Nutzung:** Das Einschalten von `research.autoAi` gilt als Bestätigung des Betreibers für die Nutzung
    öffentlich auffindbarer Geschäftsangaben.
  - **Kosten:** Ein Echttest am 29.10.2026 brauchte 8 Suchen und fand 31 Quellen. Das kostet ca. 0,25–0,30 € je
    Betrieb: Suchen 10 USD je 1.000 laut docs (`costs.webSearchPer1000UsdCents`), dazu die Tokens; alles im KI-Ledger.
  - **Takt:** Höchstens `research.perTick` Betriebe je Pipeline-Takt. Ohne echten Schlüssel (Mock) passiert nichts.
- **Automatik in Produktion** (auf Wunsch des Betreibers): Diese Schalter sind an:
  - Demo-Freigabe
  - Briefversand
  - Folgebriefe
  - Optimizer
  - Auto-Antworten
  - KI-Prüfung

  Unverändert durch Code erzwungen:
  - die ersten 30 Demos manuell
  - `DRY_RUN=true` (Freigabe des echten Versands nur gesondert)
  - `realLettersUnlocked` erst nach Testbrief
  - Wahrheits-Check und Mindestniveau

- **Jarvis** (`components/admin/jarvis.tsx`):
  - Sprachsteuerung über die Web Speech API des Browsers, ohne neue Pakete.
  - Weckwort „Jarvis“ / „Sers Jarvis“ bei „Immer zuhören“. Begrüßung „Sers {assistant.operatorName}“.
  - Bevorzugt eine männliche deutsche Stimme; ohne solche Stimme etwas tiefer gesprochen. Die Stimme ist wählbar.
  - Fragen gehen über `askAssistant(…, { voice: true })` an Haiku 5.5 (Stufe `assistant`) und kommen als kurze,
    gesprochene Antworten zurück.
  - Aktionen laufen nur nach gesprochenem oder getipptem „Ja“, über dieselben geprüften Server-Aktionen.

- **Jarvis-Stimme (Nachtrag):**
  - Eine Claude-Stimme gibt es nicht als API.
  - Auf Wunsch des Betreibers spricht Jarvis mit OpenAI `gpt-4o-mini-tts` (`TtsProvider`, Route `/api/admin/tts`, nur
    für den angemeldeten Betreiber).
  - Bei Fehlern fällt er auf die Browser-Stimme zurück.
  - Das Denken bleibt bei Haiku 5.5.

## 29.10.2026 – Testlauf im Admin

- `/admin/ablauf/testlauf` (Knopf „Testlauf ausprobieren“ im Ablauf) legt einen erfundenen Betrieb an, z. B.
  „Malerbetrieb Beispiel Dortmund“, Quelle `mock`.
- Er geht den echten Weg: Demo bauen (Worker) → Demo freigeben → online → QR-Code → „Übernehmen“ → Bezahlseite.
- Die Seite zeigt den QR-Code zum Scannen mit dem Handy und denselben Link zum direkten Öffnen.
- Sicherheit:
  - Betriebe mit Quelle `mock` bekommen nie einen echten Brief (vorhandene Versandsperre).
  - Testfreigaben zählen nicht zu den ersten 30 Pflichtprüfungen (`approveDemo` zählt nur echte Quellen).
  - In der aktuellen Umgebung laufen Zahlung, E-Mail, Domain und Hosting über die Test-Anbieter
    (`PAYMENT_PROVIDER=mock` usw.); es fließt kein Geld.
- E2E `testlauf.spec.ts` deckt den ganzen Weg bis zur Danke-Seite ab.

## 29.10.2026 – Gesamtprüfung mit echter KI („nie wieder Fehler“)

Anlass: Die Demo des Testlaufs blieb mit „KI-Prüfung fehlgeschlagen“ stehen. Neues Prüfskript
`packages/core/scripts/real-ai-check.ts`: Es läuft nur lokal (eigene Datenbank `wbm_realcheck_test`, alle Anbieter
außer der KI auf `mock`). Je Branche baut es Demo, komplette QA, Freigabe, Veröffentlichung und Erstbrief;
`--fakten` ergänzt belegte Rechercheangaben. Gefundene und behobene Fehler:

- **KI-Prüfung der Demo**: Gekennzeichnete Beispiel-Leistungen galten als „erfunden“ (hoch). Der QA-Prompt kennt
  jetzt die Kennzeichnung; „hoch“ gilt nur noch für harte erfundene Fakten. Ohne bestätigte Leistungen nennen
  Überschrift, Unterzeile und Suchtexte keine Einzelleistungen mehr.
- **Selbstheilung Demo**: Scheitert die QA nur an Textbefunden (Inhaltsregeln/KI-Prüfung), baut der Worker die Demo
  einmal automatisch neu und gibt der KI die Befunde mit (`qaFeedback`, `_meta.qaRetry`). Erst beim zweiten
  Scheitern kommt die Meldung.
- **Nutzen-Sätze im Brief** (§ 5 UWG): Sätze wie „neue Kundinnen und Kunden … fragen an“ wertete die
  Wahrheitsprüfung als Wirkungsversprechen. Alle Branchensätze beschreiben jetzt nur, was auf der Seite steht
  („findet dort Ihr Angebot und den direkten Weg zur Terminanfrage“).
- **Brief zu lang**: Bei vielen Branchen stieß der Text ans Kleingedruckte, besonders mit Rechercheangaben.
  `fitLetterLayout` setzt erst enger (Zeilenabstand, Bild kleiner, QR-Text neben dem QR-Code; QR bleibt 4,1 cm,
  Pflichttexte unverändert), danach entfallen schrittweise nur Zusatzsätze. Das Längenbudget des KI-Schreibers
  (`LETTER_TEXT_LIMITS`) ist so bemessen, dass jede gültige Fassung passt. Neuer Test: alle Branchen ×
  Varianten × Folgebriefe, mit und ohne Fakten, KI-Fassung an der Längengrenze.
- **Abgeschnittene KI-Antworten**: Endet eine Antwort mit `max_tokens`, war die Tool-Eingabe unvollständig und wurde
  trotzdem benutzt (Wahrheitsprüfung: „Cannot read properties of undefined“ → Brief gesperrt). Der Anbieter verwirft
  solche Antworten jetzt und wiederholt mit doppeltem Platz. Zu knappe Budgets (Wahrheitsprüfung, Briefschreiber,
  Support, Einwände) sind erhöht. Die Wahrheitsprüfung liest Antworten defensiv; ohne eindeutiges Ergebnis bleibt
  der Brief gesperrt.
- **Selbstheilung Brief**: Scheitert ein automatisch erzeugter Brief, erzeugt der Worker ihn nach einer Minute
  einmal neu. Scheitert er wieder, bleibt er zur Prüfung stehen.
- Kein Fehler: Gastronomie, Yoga, Blumenladen u. a. lehnt die Recherche-Bewertung ab („Branche außerhalb dieser
  Zielkampagne“). Das ist gewollt (Kampagne seit 28.10.: Handwerk, danach Friseur/Kosmetik).

## 29.10.2026 – Stripe-Live-Konto „Seitenwerk“ vorbereitet

- Live-Produkte mit Preisen angelegt (kein Geldfluss): Website-Einrichtung 597 € einmalig, Basis 19 €/Monat,
  Care+ 99 €/Monat. IDs in `packages/core/src/config/stripe-v4-live.json` (nur Referenz, noch nicht verwendet).
- Live-Webhook `seitenwerkworld.netlify.app/api/webhooks/stripe` war bereits aktiv (alle benötigten Ereignisse).
- Live-Checkout bleibt im Code gesperrt (`stripeV4Price` nur Sandbox; Tests sichern das), bis der Betreiber
  ausdrücklich „live schalten“ freigibt. Dann: Katalog einbinden, Sperrtests anpassen, `PAYMENT_PROVIDER=stripe`.
- Logo und Farbe (Branding) lassen sich für das eigene Konto nicht per API setzen → im Dashboard.

## 29.10.2026 – easyNova im Testmodus angebunden

- Netlify (Produktion): `MAIL_PROVIDER=easynova`, `EASYNOVA_MODE=test`, `EASYNOVA_USERNAME`, `EASYNOVA_PASSWORD`
  (geheim), `EASYNOVA_TEST_EMAIL`. Anmeldung bei der digiBrief-API geprüft (HTTP 200).
- Testmodus: kein Druck, kein Versand, keine Kosten. `realLettersUnlocked` bleibt aus; live erst nach 3
  Testaufträgen, geprüfter Rückmail und ausdrücklichem OK.
- Der Worker übernimmt die Werte beim nächsten Neuabruf der Umgebung (`setup.sh` mit `NEU=1`).

## 03.11.2026 – Steuerhaken auf Betreiberwunsch gesetzt

- Betreiber: noch keine Gewerbeanmeldung, Steuerangaben leer lassen und `tax.operatorConfirmed` trotzdem
  setzen, ausdrücklich auch für echte Zahlungen. Umgesetzt in der Produktionskonfiguration mit Audit-Eintrag.
- Rechnungen zeigen damit den §-19-Hinweis ohne Steuernummer. Hinweis gegeben, dass die Steuernummer eine
  Pflichtangabe auf Rechnungen ist und nach der Gewerbeanmeldung nachgetragen werden sollte.

## 03.11.2026 – Veröffentlichung von f097744 (Einrichtung vor Zahlung)

- Betreiber-OK im Chat. Netlify hatte den Codex-Commit nicht gebaut; Veröffentlichung über regulären Git-Push.
- Lokal nachgeprüft: Typecheck, 29 Einrichtungs-/Bestelltests, 12/12 Browser-E2E gegen Produktionsbuild.

## 03.11.2026 – Go-Live der App (Betreiberauftrag, Schritt für Schritt)

1. Codex-Stand (Einrichtung vor Zahlung) veröffentlicht: Netlify `6ae9cfb68fe2f63fbf90c83a`, danach mit Live-Werten
   `6ae9d4afb5c9cc37eb017c88`. Seiten HTTP200, Secretscan ohne Treffer.
2. Kompletter Datenreset auf Betreiberwunsch (vom Betreiber im Supabase-SQL-Editor ausgeführt): Betriebe,
   Demos, Briefe, Bestellungen, Kunden, Seiten, Nachrichten, E-Mails, Ereignisse, Meldungen, Recherche-/Test-
   Einstellungen gelöscht; Kopie in Schema `archive_20261103` (RLS an). Erhalten: Konfiguration, Admin,
   Vorlagen/Claims/Playbooks/Experimente, Sperrliste, Zähler (easyNova 3/3, Rechnungsnummern), Protokoll,
   Kostenbuchungen. Offene Jobs (Rechnung/Onboarding/Demo des Kontrollbetriebs) abgebrochen.
   Zähler `demos_reviewed` auf 0 → erneut 30 manuelle Demo-Prüfungen.
3. easyNova: Login ok, Guthaben 12,61 €, 3/3 Testaufträge. Eigener physischer Probedruck auf Wunsch des
   Betreibers ausgelassen. QR-Routen antworten (unbekannte Codes 404); voller Scanweg am ersten echten Brief prüfen.
4. Backup: nächtliche Sicherungen 01.–03.11. im privaten Speicher; `backup_status` wurde nie geschrieben →
   `record-backup-status.ts` + Aufruf in `managed-scheduled.sh`; heutiger Lauf als Nachweis eingetragen.
5. Live: Netlify Production `STRIPE_MODE=live`, `EASYNOVA_MODE=live`, `DRY_RUN=false` (andere Kontexte
   bleiben Test); Admin `dryRun=false`, `realLettersUnlocked=true`. Server: `NEU=1 LIVE=1` durch den Betreiber.
   Weiter wirksam: 30 manuelle Demo-Prüfungen, Briefe nur nach Freigabe, Budgets, Not-Aus, Sperrliste,
   `autoRegisterDomains=false` (Domains von Hand).

## 03.11.2026 – KI-Prüfung der Betriebe gelockert (Stufe „Mittel“)

- Befund nach Go-Live: alle KI-geprüften Betriebe landeten in der Prüfung von Hand, weil (1) die Kosten-
  Reservierung (~6,28 €) das 4-€-Wochenbudget überstieg und (2) danach Aktivität der letzten 3 Monate und ein
  aktuelles Werbesignal Pflicht waren. Behoben: Budget 30 €, Wiederholung nach 6 h, Werbesignal optional,
  Aktivität bis 12 Monate. Tests angepasst/ergänzt.

## 03.11.2026 – Modellwechsel zur Kostensenkung (Haiku 5.5 / Sonnet 5.5)

- Anlass: Betreiber: „Opus 5.5 ist zu teuer, auch bei kleinen Aufgaben.“ Echte Kosten der letzten 14 Tage (Opus):
  Recherche mit Websuche ~27 Ct je Betrieb (+4 Ct Auswertung), Demo-Text ~5,5 Ct, Demo-QA ~2 Ct je Lauf,
  Brieftext ~5 Ct + Gegenlesen ~4,4 Ct, Wahrheits-Check ~1 Ct. Die Websuche selbst kostet modellunabhängig
  1 Ct je Suche (max. 8).
- Entscheidung: regelgebundene Aufgaben und die Recherche (Tier `bulk`, Recherche von `creative` nach `bulk`
  verschoben) auf Haiku 5.5 (0,10 $/0,50 $ je MTok, >100K Prompt 0,50 $/2,50 $), Kundentexte (Tier `creative`)
  auf Sonnet 5.5 (2 $/10 $). Haiku 5.5 unterstützt laut offizieller Doku Websuche, strukturierte Ausgabe
  und Tool-Use. Websuche-Reservierung sinkt von ~6,28 € auf ~0,87 € je Recherche.
- Erwartung (Schätzung, nicht gemessen): Recherche ~10–12 Ct statt ~31 Ct, Demo+Brief zusammen ~7 Ct statt ~15 Ct.
- Prüfen: erste echte Haiku-Recherchen und Sonnet-Demos/Briefe bei der Freigabe ansehen; bei schwächerer
  Qualität einzeln per ENV zurück auf Opus (`MODEL_CREATIVE`/`MODEL_BULK`).

## 03.11.2026 – Zweiter Reset und Ablauf „Suche von Hand, Freigaben von Hand“

- Betreiberwunsch: alle Daten erneut zurückgesetzt (85 Betriebe ins Archiv `archive_20261103b`, gleiche Liste
  wie beim ersten Reset; Konfiguration, Admin, Vorlagen, Sperrliste, Zähler, Protokoll, Kostenbuchungen bleiben).
- Ablauf ab jetzt: Suche startet nur der Betreiber (`segments.weeklyLeadFinder=false`), KI-Prüfung der Betriebe
  und Demo-Erstellung automatisch (`research.autoAi=true`), **jede Demo** von Hand freigeben
  (`switches.autoApproveDemos=false`), jeder Brief von Hand freigeben; freigegebene Briefe gehen automatisch
  in die Post (`autoSend=true` versendet nur freigegebene Briefe).

## 04.11.2026 – WhatsApp-Nummer entfernt

- Betreiberwunsch: Wer per WhatsApp schreibt, sähe das private Profilbild. `sender.whatsappNumber` geleert;
  Demos zeigen dann keinen WhatsApp-Knopf (nur E-Mail und Formular), der Brief nennt die Telefonnummer ohne
  „WhatsApp“. WhatsApp ist keine Pflichtangabe mehr für den Versand (`readiness.ts`). Wieder einschalten:
  Nummer im Admin unter Einstellungen eintragen (am besten WhatsApp Business mit Logo).

## 04.11.2026 – Nächtliche Sicherung im Live-Betrieb repariert

- Befund: Sicherung vom 04.11. (03:18) abgebrochen mit „DRY_RUN erlaubt ausschließlich Stripe-Testschlüssel“.
  Die Hilfscontainer der Sicherung liefen nur mit `docker-compose.worker.yml` (DRY_RUN=true), der Worker aber
  live; seit STRIPE_MODE=live lehnt der Provider-Start diese Kombination ab.
- Lösung: `infra/backup/compose-files.sh` nimmt die Live-Datei dazu, wenn der laufende Worker DRY_RUN=false hat
  (managed-acceptance.sh, managed-scheduled.sh). Hilfscontainer lesen nur, sie verschicken nichts.

## 04.11.2026 – Gestaltungs-Kits und KI-Regeln im Demo-Generator

- Anlass: Betreiber fand die Demos „langweilig und vibe coded“. Recherche-Bericht `reports/Demo Websites ohne KI Look.md`,
  Prototyp `/muster-maler/`, dann Umsetzung im Generator.
- 6 Kits mit eigenem Aufbau je Gewerk (siehe AGENTS.md), Schriften Archivo, Atkinson Hyperlegible, Bodoni Moda,
  Karla, Gloock (OFL, `assets/fonts/kits/LIZENZEN.txt`), nur lizenzierte Fotos ohne KI-Bilder, „Symbolbild“ sichtbar.
- Entwurfs-Platzhalter (Inhaberfoto, Projekte, Beispielablauf, Beispielplan, „Preis folgt“) nur im Entwurf; Test prüft,
  dass die Live-Seite keine davon enthält.
- KI-Regeln: Prompt-Regel 12, Floskel- und Satzmuster-Filter mit Neuversuch, Gedankenstrich-Grenze, KI-Muster-Prüfung in
  der Demo-QA (Kits: harte Sperre, ältere Vorlagen: Hinweis).
- Offen: Einzelhandel/Kurse-Kits; Bildgrößen (Demos 360–590 KB, vor allem Fotos) später verkleinern.

## 04.11.2026 – Qualitätsauftrag Unternehmenswebsites (Briefing, Passung, ehrliche Inhalte, Bilder)

- Betreiberauftrag: Qualität der automatisch erstellten Seiten grundlegend verbessern, im bestehenden System, ohne
  Briefe, Zahlungen, Kundenmails oder Domainkäufe. Vom Betreiber gezeigte Fremd-Demos („Kalk & Kante“, „Osteria Sera“)
  nur als Messlatte, ausdrücklich nichts übernommen.
- Gestaltungsbriefing vor jeder Demo (`templates/src/kits/brief.ts`): belegt / Vorschlag / fehlt, Besucherfrage,
  Haupt-Handlung, Seitenumfang (dünne Datenlage → „kompakt“). Gespeichert in `demos.content_json._meta.designBrief`,
  sichtbar in „Demo prüfen“. Im Entwurf ein Kasten „Was für Ihre Seite noch fehlt“ statt verstreuter Platzhalter.
- Farbwelt nach Passung vor Abwechslung (`kitVariantFor`): belegte Bildwelt > Öffnungszeiten (Gastro spät → dunkel,
  Tagesbetrieb → hell) > unterscheidende Gewerksbegriffe > seltener genutzt > stabiler Zufall.
- Ehrliche Inhalte: „Über uns“ und FAQ optional (0–4 Fragen); Ersatztexte ohne nichtssagendes „Über uns“ und ohne
  Meta-Frage; Schein-Leistungen („Projekt anfragen“, „Terminwünsche“) durch typische Beispielleistungen ersetzt;
  ohne bestätigte Öffnungszeiten live keine Zeiten.
- Handlungen nach Funktion: „Projekt anfragen“, „Reinigungsangebot anfragen“, „Behandlung/Termin anfragen“,
  „Tisch anfragen“. Kein Foto-Upload-Versprechen (live gibt es keinen Upload). Entwurfsformular = dieselben Felder wie
  das echte Formular, `fieldset disabled`, sichtbar „im Entwurf nicht absendbar“. Live-Formular unverändert.
- Bilder: 28 Pexels-Fotos derselben Lizenz in 1600 px neu bezogen (EXIF-Lizenz übernommen, ≤ 200 KB); randlos nur ab
  1400 px Bildbreite, sonst Satzbreite; ohne Foto eigene Hero-Variante ohne leere Fläche.
- Überschriften: Größe nach dem längsten Wort (keine Trennungen wie „Kosmeti-k“).
- Referenz-Demos ohne KI-Kosten: `scripts/render-reference-demos.ts`, veröffentlicht unter `/muster-kits/`.
  Öffentliche Beispiele (`/beispiele/`) für Handwerk, Beauty, Gastro auf Kits umgestellt.
- Produktion: 0 Demos und 0 Briefe zum Zeitpunkt der Änderung, nichts Bestehendes verändert; Schalter unverändert.

## 04.11.2026 (abends) – Erster echter Lauf: drei Fehler behoben

Befund aus dem ersten echten Lauf (64 Betriebe Maler/Elektro in Bochum, Dortmund, Essen; 2 Demos):
- **„Alles schwarz“:** Elektriker bekamen fest die dunkle Farbwelt („graphit“ als Gewerkspassung), beim Maler wählte der
  Zufall die dunkle. Neu: dunkle Farbwelten nur bei belegter dunkler Bildwelt des Betriebs, nie wegen Gewerk oder
  Öffnungszeiten. Je Kit mindestens zwei helle Farbwelten (neu: Maler „leinen“, Elektro „signal“, Gastro „terrakotta“).
- **Maler-Demo durch die QA gefallen (Lighthouse 81 < 90 auf dem Server):** Archivo je Kit zugeschnitten (90 → 24–42 KB),
  ungenutztes Tailwind-CSS auf Kit-Seiten entfernt (49 → 14 KB). Live-Seite Maler 236 → 137 KB, Lighthouse lokal 90 → 100.
  Pixelvergleich: Gastro/Beauty identisch, Archivo-Kits nur Kantenglättung.
- **23 Betriebe „Vorauswahl zu niedrig“ ohne KI-Prüfung aussortiert:** Die Vorauswahl beruht nur auf Rohdaten; die Punkte
  für Anschrift, Aktivität und Website-Suche gibt erst die KI. Neu: Die Mindestgrenze sortiert nur noch Betriebe ohne
  Telefonnummer aus; alle anderen prüft die KI (Ablauf des Betreibers „er soll alle prüfen“). KI-Kosten bleiben durch das
  Wochenbudget begrenzt. Eine erneute Suche bewertet die bereits aussortierten Betriebe neu.

## 04.11.2026 – Codex: Gestaltungsprinzipien in der echten Demo-Pipeline

- Betreiberauftrag: neue Demos sollen nach den Prinzipien der eigenständigen Kalk-&-Kante-/Sera-Studien
  entstehen. Bestehende Kits und günstige Modelle beibehalten, kein paralleles System.
- Gemeinsamer versionierter Redaktions-/Gestaltungsplan für Prompt, Briefing und Renderer. Entfernt den
  widersprüchlichen Prompt-Abschluss mit Pflicht-FAQs und zwei Über-uns-Absätzen. Generierter Über-uns-Text
  zählt im Briefing nicht mehr als eigenständiger Beleg; Umfang nach belegten Leistungen/eigenen Bildern.
- Neue inhaltlich begründete Maler-Panoramakomposition, gastronomischer Masthead/Bild-/Einladungsbereich,
  spezifische Leistungen im Hero, strukturierte Leistungslisten und Betriebsnavigation. Fehlendes gebündelt
  als aufklappbare Einrichtungsliste, keine leeren Porträt-/Referenzkästen.
- Zusätzliches dokumentiertes, gekennzeichnetes Pexels-Raummotiv für belegte Innenraumleistungen.
- Vorhandene Kit-KI-QA prüft beide tatsächlichen Startansichten im selben budgetierten Aufruf. Keine
  zweite KI-Schleife oder pauschale Designnote. Visuelle Blocker bleiben zur manuellen Prüfung liegen.
- Geschützte Kauf-/Angebots-/Formular-Markups gegen 8b10675 verglichen. Keine DB-/Serveraktionen,
  keine Freigabe oder Überarbeitung von Elektro Reiche/Pintura Bau und keine echten KI-Aufrufe im Test.
- Entwicklung auf separatem Branch; ein Push dieses Branches aktiviert den VPS-Worker nicht.

## 04.11.2026 – Einzelentwurf Bochum: Korrekturen aus tatsächlicher Sichtprüfung

- Betreiber beauftragt die Recherche eines Bochumer Elektrikers ohne auffindbare eigene Website und eine
  separate Demo nach dem neuen Standard. Keine Änderung der produktiven Leads/Demos oder Kontaktaufnahme.
- Beim gerenderten Elektro-Entwurf sichtbar: langer Firmenname in Seitenleiste durch 70%-Breitengrenze
  ungünstig getrennt. Markenblock nutzt jetzt die volle Seitenleistenbreite. Doppelte Telefonzeile in den
  Seitenleisten-Fakten entfällt, die direkte Rufnummer und Handlungslinks bleiben erhalten.
- Kompakte Handwerk-Entwürfe zeigen keinen künstlich verlängernden vierteiligen Beispielablauf mehr.
- Neuer Regressionstest für kompakte Elektro-Datenlage. Geschützte Kauf-/Formular-/Freigabelogik unberührt.


## 04.11.2026 – individuelle Generierung statt erzwungener Branchenvorlage

Ausdrücklicher neuer Auftrag: die KI soll selbst gestalten und nur Kriterien befolgen. Die
frühere Kit-Pflicht wird für neue Demos ersetzt. Neuer Inhalt enthält einen individuellen
HTML/CSS-Entwurf und eine kurze Konzeptbegründung. Typografie, Komposition, Abschnittsauswahl,
Farben und Rhythmus sind Entscheidungen des Modells; kein automatischer Elektro-Seitenleisten-
oder sonstiger Kit-Fallback. Alte gespeicherte Seiten behalten ihren Renderer.

Parserprüfungen, CSS-Beschränkung auf den eigenen Bereich, lokale Ressourcen und der bestehende
Kontakt-/Kaufbereich sichern die technische Integration. Fehler blockieren den Bau. Faktenprüfung
bezieht sichtbaren Modelltext ein; Beispiele und Stockfotos bleiben kenntlich. Der bestehende
budgetierte Aufruf trägt auch den Entwurf (Ausgabelimit 10.000 statt 6.000 Tokens); keine weiteren
Design-Agenten oder unbeschränkten Iterationen. Modelle, Budgets und Produktionsschalter unverändert.
Bei nicht eindeutig zuordenbaren Textänderungen erfolgt eine überprüfbare Blockierung statt eines
angeblich geänderten HTML mit altem Text. Kundenseitige KI-Überarbeitung liefert das aktualisierte
Design mit. Keine Änderung an Kaufpreisen, Kontakt-Endpunkten, Zahlung oder Versandfreigaben.

Privater Beispielentwurf für Jörg Stoffeln separat unter dem bestehenden Sites-Projekt. Keine
Betriebsbeauftragung, kein echter Lead, keine Produktionsdaten oder vorhandenen Demos geändert.
Die Telefonnummer ist zwischen Verzeichnissen widersprüchlich, aktuelle Aktivität nicht bestätigt.
Prüfnachweise und Grenzen: `docs/free-design-standard.md`.


## 05.11.2026 – Mindestinhalte auch bei frei gestalteten Seiten

Betreiber wünscht ausführlichere Demos statt Hero/Leistungen/Adresse: fachliche Erklärung als
allgemeines Branchenwissen, markierter Beispielablauf, Anfrage-Checkliste, Einsatzgebietsvorschlag,
Öffnungszeiten/Kontakt, Symbolbildstrecke, drei bis vier Ablauf-Fragen sowie im Entwurf klar
markierte Foto-/Team-/Referenz-Platzhalter. Weiterhin freie Komposition; keine neuen Branchenlayouts.
`full-page-1` prüft Inhaltsabdeckung neuer Generierungen; ältere Datensätze bleiben kompatibel.
Gebiet ohne Quellenbestätigung als Vorschlag; live nur die bekannte Stadt. Platzhalter werden vor
Vorschau/Live entfernt. Keine Testimonials, Personen, Projekte oder Kapazitäten erfinden.
`authored/render.ts` bereinigt gemeinsames CSS und nutzt für neue Archivo-Entwürfe die bestehenden
zugeschnittenen Profile. Der geschützte Kontaktbereich erhält ausschließlich zusätzliche CSS-Regeln
für Fonts und Farbrollen; Markup und Formularlogik bleiben unverändert. Keine Leistungs-/Lighthouse-
Schwelle herabgesetzt. Prüfbericht: `docs/authored-full-pages.md`.


## 05.11.2026 – Nachbesserung der freien Gestaltung (Claude)

Betreiber: „die Websites sind so kurz, da ist nur Leistungen, wo und fertig“ und „mach du das selbst direkt“.
Pflicht-Inhalte mit automatischer Vollständigkeitsprüfung, kleinere Seiten (Schrift-Instanz, CSS-Kürzung), angepasster
Kontaktbereich, reparierte kostenlose Änderung vor dem Kauf, vollständige Testsuite. Details:
`docs/free-design-standard.md` (Abschnitt Nachbesserung). Vorhandene Demos unverändert, keine Produktionsschalter.

## 05.11.2026 – Hotfix: alle Demo-Bauten scheiterten an der KI-Schnittstelle

Nach dem Worker-Update auf 168e672 schlug jeder Demo-Bau sofort mit HTTP 400 fehl („For 'array' type, 'minItems'
values other than 0 or 1 are not supported“). Ursache: `minItems: 3` am FAQ-Feld des Demo-Schemas; strikte Tool-Schemas
erlauben nur 0 oder 1. Keine KI-Kosten (Ablehnung vor der Generierung). Behebung: `minItems` aus dem Schema entfernt
(Anzahl 3–4 prüft `validateDemoContent`), zusätzlich entfernt `strictToolSchema` im Anthropic-Provider jede `minItems > 1`
vor dem Senden. Neuer Test `strict-tool-schema.test.ts`. Die Mock-KI der Tests prüft Schemas nicht; deshalb fiel es nicht auf.

## 05.11.2026 – Preview-Rechtefehler und Wiederaufnahme repariert

VPS-EACCES entstand im direkten root-Checkout-Mount unter `umask 077`, nicht durch nachgewiesen
fehlenden Studio-Code. Quellcode ohne Image-Neubuild nur noch als lesbarer, versionierter
Core-Snapshot; keine pauschale Änderung privater Dateirechte. Vor Modellkosten echte lokale
Runtime-Voraussetzungen und optionalen Hostingzugang prüfen. Gespeicherter fiktiver Entwurf
bleibt nach QA-Fehlern ohne neue Generierung ansehbar, Startmarker ohne HTML weiter gesperrt.
Draft-URL vor Ausgabe abrufen, keine Kunden-/Produktionsfreigaben daraus ableiten. Umfang,
tatsächliche lokale Browser-/Rechteprüfungen und offene Modellabnahme: `docs/design-studio.md`.

## 05.11.2026 – Gespeicherte Studio-Antwort vor weiterem KI-Verbrauch ansehen

Betreiber zeigt bestandene Vorprüfungen und drei abgerechnete Modellantworten; Umsetzung scheitert
an einem Preiswort im freien HTML. Fehlerkontext künftig am tatsächlichen Treffer statt am
Textanfang ausgeben, bestehende Preisregel erhalten. Den bezahlten fiktiven Kandidaten mit
ausdrücklichem Nichtfreigabe-Hinweis zur Ansicht wiederherstellen, ohne neue KI-Aufrufe, Datenbank,
Kundenpublikation oder Gates zu ändern. Originalartefakte bleiben erhalten. Details/Prüfgrenzen
in `docs/design-studio.md`.

## 05.11.2026 – Netlify-Antwortkompatibilität und belegter Preiswort-Fehlalarm

Fiktives HTML wiederhergestellt; Share stoppte wegen optionalem fehlendem `draft`-Antwortfeld.
Echter authentifizierter Deploy-Beleg zeigt deploy-preview, published_at null, manual_deploy
true. Diese positive Antwortform akzeptieren, Produktions-/Widerspruchsprüfung erhalten und
denselben unvollständigen Deploy über dokumentiertes Manifest-Update fortsetzen. Kein neuer
Modellaufruf und kein zweiter Deploy als Fehlerumgehung. Tatsächlichen Negationskontext des
Preisworts eng ausnehmen; erfundene Preise/Rabatte/Gratisversprechen bleiben gesperrt.
Technische und gestalterische Abnahme werden dadurch nicht nachträglich behauptet.

## 05.11.2026 – Gestaltung bestätigt, reguläre Übernahme und Workerstart beauftragt

Betreiber hat die veröffentlichte fiktive Studio-Vorschau angesehen und akzeptiert; danach
ausdrücklich Wiederaufnahme und Übernahme beauftragt. Die vorherige Worker-Pause ist für
diesen Rollout aufgehoben. Bestehende Einzel-Demo-/Briefprüfungen, Budget und Not-Aus bleiben
wirksam. Live gelesen: Not-Aus bereits aus, manuelle Demo-Freigabe und vollständige QA an;
keine Änderungen an Schaltern nötig. Gespeichertes KI-Budget 30 €/Woche unverändert.
Normaler Generator nutzt bereits denselben Studio-Autor. Updater erhält explizites Resume
nach Image-/Konfigurationsprüfung und protokolliert den tatsächlich gesunden Start erst per
Exec im laufenden Container. Keine vorhandenen Demos neu bauen oder freigeben. Codefreigabe
und gemessenen VPS-Start getrennt halten; Umsetzung und Grenzen in `docs/design-studio.md`.

## 06.11.2026 – Ablauf ohne Handprüfung, Ablehnen mit Wunsch, ruhiger Admin

Betreiberauftrag: „KI soll suchen und gleichzeitig prüfen … automatisch Demos … ich gebe frei, bei ‚passt nicht‘
schreibe ich, was anders werden soll, und es wird wirklich neu generiert … danach Briefe … Admin komplett
übersichtlicher.“

- **Suche und Prüfung gleichzeitig:** `findLeads` reiht jeden neu gespeicherten Treffer mit Telefonnummer sofort
  in `research-lead` ein (statt erst nach der Suche); `research-lead` läuft mit 3 parallel. Bereits geeignete Treffer
  stoßen sofort einen Pipeline-Takt an. Not-Aus, Mock-Quellen und Mock-KI lösen nichts aus.
- **Handprüfung der Betriebe entfernt:** `/admin/ablauf` und `/admin/ablauf/pruefen` leiten um; nichts blockiert
  mehr den Demo-Bau. Die Demo-Freigabe bleibt Pflicht (Nachweis „angesehen“ per Pflicht-Haken).
- **Ablehnen mit Wunsch:** Der Wunsch wird am Betrieb gespeichert (`settings`-Schlüssel `demo-redo-wish:{leadId}`),
  in Konzept- und Umsetzungsaufruf eingefügt (Vorrang vor Geschmack, nie vor Fakten-, Rechts- und
  Sicherheitsregeln; Text als untrusted gekennzeichnet, Steuerzeichen entfernt), mit der neuen Demo als
  `_meta.operatorWish` gespeichert und danach gelöscht. „Betrieb ganz aussortieren“ speichert keinen Wunsch.
- **Brief sofort nach Freigabe:** `publishDemo` stößt den Pipeline-Takt direkt an; der Takt legt den Brief an
  (Not-Aus und Budget prüft er selbst). Versand weiterhin nur nach Freigabe.
- **Admin:** 5 Bereiche (Start, Betriebe finden, Freigeben, Nachrichten, Mehr). Startseite = Status-Satz,
  Ablauf in 5 Schritten, „Für dich“-Liste; Hinweise und Einrichtung eingeklappt. Ruhige Gestaltungsebene
  `admin-calm.css` (helle Seitenleiste, eine Akzentfarbe, keine Verläufe). Kopfleiste: „Live“/„Testmodus“,
  „Automatik an/aus“, Einzelheiten im Tooltip.

## 06.11.2026 – Erstbrief „Kunden, die Sie gerade verlieren könnten“

Betreiberauftrag: „Bau die Briefe alle so neu: Kunden, die Sie gerade verlieren.“

- Gilt für jeden Erstbrief (V4-Einladung), wenn **beides** vorliegt: dokumentierte Website-Suche („kein eigener
  Webauftritt gefunden“) und eine **vom Betreiber freigegebene** Studienaussage der Branche
  (`LOSS_CLAIMS` in `packages/core/src/letters/loss-claims.ts`). Sonst automatisch der bisherige neutrale Brief.
- Aufbau: fester Betreff „{Firma}: Kunden, die Sie gerade verlieren könnten“ → Aufhänger aus Sicht einer
  suchenden Person („… fragt womöglich beim nächsten an“) → Recherchesatz → Beleg wörtlich mit Fußnote und
  Quellenseite → „Deshalb habe ich … gebaut“ → QR-Zeile mit „online bis …“.
- Bewusst „könnten“ und „womöglich“: Ein tatsächlicher Verlust dieses Betriebs ist nicht belegbar (§ 5 UWG);
  die Zahl stammt ausschließlich aus der freigegebenen Aussage. Keine Umsatzbeträge.
- Der KI-Schreiber hat im Verlustmodus eigene Regeln (Möglichkeitsform, kein „verlieren“ im Einstieg, keine Zahl,
  kleineres Längenbudget 260 Zeichen); der Recherchesatz wird beim Einpassen nie gestrichen.
- Belege: Handwerk Bitkom 40 % Ausschlusskriterium; Gastronomie Website erwartet / Online-Suche; Handel Infos
  vorab; Beauty, Kurse: flexible Online-Termine. Dienstleistung ohne Beleg → neutraler Brief. Stand Produktion
  06.11.: keine Aussage freigegeben – Freigabe im Admin unter „Mehr → Erlaubte Aussagen“.

## 06.11.2026 – Willkommenshinweis nach dem Scan

Betreiberauftrag: Nach dem Scan sollen Betriebe sofort wissen, dass der Entwurf Fehler enthalten kann und alles
änderbar ist. Umsetzung: `/q/{token}` und Kurz-URL leiten auf `/d/{slug}?start=1`; dort liegt über der Demo ein
Fenster (Name, Kontakt, Öffnungszeiten, Leistungen, Texte, Fotos, Farben/Gestaltung als Wunsch änderbar; vor der
Bestellung selbst eintragen, kostenlos und unverbindlich; online erst nach Freigabe) mit „Entwurf ansehen“ und
„Kein Interesse“. Reines HTML (`<dialog open>` + `<form method="dialog">`), kein Skript, nichts im Browser
gespeichert; Screenshots und Brief-Bild bleiben unverändert. Inhalt deckt sich mit `/einrichten/[slug]`
(Angaben, Texte, Leistungen, Öffnungszeiten, Fotos, Domain, Freitext „Wünsche“).

## 06.11.2026 – Tarif „Komplett“: 0 € Einrichtung + 179 €/Monat

Betreiberentscheidung (nach Marktrecherche, bewusst über dem Markt-Mittel von ca. 60–150 €/Monat):
- Neukunden wählen zwischen **Basis** (597 € einmalig + 19 €/Monat, monatlich kündbar, als „Empfohlen“ markiert,
  keine Vorauswahl) und **Komplett** (0 € Einrichtung, 179 €/Monat). Care+ wird für Neukunden nicht mehr angeboten,
  Bestandsverträge bleiben unverändert.
- Komplett: bei der Bestellung wird nichts abgebucht (Stripe-Checkout `mode=setup`, Karte oder SEPA-Mandat
  gespeichert). Erste Abbuchung **7 Tage nach bestätigtem Go-Live**, **12 Monate Mindestlaufzeit ab der ersten
  Abbuchung**, danach 179 € monatlich kündbar. Damit ist die Regel „keine zwölfmonatige Standardbindung“ für diesen
  einen Tarif ausdrücklich aufgehoben (Betreiber, 06.11.2026); Basis bleibt monatlich kündbar.
- Kündigung in der Mindestlaufzeit wirkt zu deren Ende (Stripe `cancel_at`); Wechsel aus Komplett erst danach,
  Wechsel in Komplett nur als Neubestellung.
- Leistungen Komplett: alles aus Basis, bis zu 60 Minuten Änderungen/Monat, Pflege lokaler Suchgrundlagen
  (Seitentitel, Beschreibungen, strukturierte Firmendaten; keine Ranking-Zusage), bevorzugter Support werktags.
- Keine 0-€-Rechnung; Bestätigungsmail mit Onboarding-Link ohne Anhang; Rechnungen je Abbuchung.
- Live-Stripe-Preis angelegt (Betreiber-OK): `prod_VZw1NFNeBoh82i` / `price_1UYm9IKIPZjo7zRA6i880q7z` (179 €/Monat).
  Kein Sandbox-Preis vorhanden (Connector nur live) – Sandbox-Checkout für Komplett bricht mit klarer Meldung ab.
- Schalter `offers.komplettEnabled` (Admin → Einstellungen → Neukundentarife), Einschalten nur mit Bestätigung,
  dass die AGB mit den Komplett-Regeln übernommen sind. Preissektion bestehender Demos wird beim Ausliefern aktualisiert.
- Offen: Funnel-View `funnel_by_arm` zählt Komplett-Käufe noch nicht unter „monatlich“ (Materialized View, eigener Schritt).

## 06.11.2026 – Kontakt nur per E-Mail, keine Betreiber-Telefonnummer

Betreiber: „Sie sollen mich nur über E-Mail kontaktieren – entferne überall meine Nummer.“ Umgesetzt zentral in
`publicOperatorSettings` (Telefon und WhatsApp-Nummer immer leer) sowie im Brief (Absenderblock ohne Tel.-Zeile,
Kontaktzeile „per E-Mail an …“), in Demo-Absender/Vertrauensblock, E-Mail-Fußzeilen und Rechtstext-Entwürfen
(Impressum: E-Mail und Kontaktformular). WhatsApp-Knöpfe entfallen, auch in bereits gebauten Demos (beim Ausliefern
entfernt). Die Telefonnummer ist kein Pflichtfeld mehr und bleibt in den Einstellungen nur intern. Die Nummer des
jeweiligen Betriebs auf seiner eigenen Demo („Anrufen“) bleibt unberührt. Hinweis: Das Impressum braucht neben der
E-Mail einen zweiten schnellen Kontaktweg; das ist das Kontaktformular (keine Telefonpflicht, EuGH C-298/07).
Bereits übernommene Rechtstexte enthalten die Nummer noch, bis sie im Admin neu übernommen werden.

## 06.11.2026 – Sparmodus: KI nur für die besten Betriebe

Betreiber (Guthaben: 6 € KI, 15 € easyNova, 5 € INWX): „nur die besten Betriebe“. Verbrauch zuletzt ca. 0,55 € KI je
fertiger Demo inkl. Prüfung. `research.bestOnly` (ohne Eintrag an) begrenzt die KI-Prüfung (Takt und Sofortprüfung
bei der Suche) und den Demo-Bau auf Betriebe mit Segment `social_only`/`neu` oder ab `research.bestMinScore`
(Standard 40) Vorauswahl- bzw. Eignungspunkten. Da OSM kaum Bewertungen liefert, sind fast alle echten Treffer
„etabliert“; 40 Punkte entsprechen etwa der oberen Hälfte (Stand Produktion 06.11.). Nichts wird gelöscht; übrige
Betriebe warten. Schalter und Mindestpunkte im Admin unter Einstellungen (KI-Prüfung).
