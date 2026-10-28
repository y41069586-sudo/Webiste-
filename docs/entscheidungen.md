# Entscheidungen und Abweichungen

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
