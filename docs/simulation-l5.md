# Simulationsbericht L5 – Optimizer und Statistik

Erzeugt mit `scripts/simulate-optimizer.ts` am 24.10.2026 · 200 Läufe je Szenario · feste Seeds (reproduzierbar).

## Aufbau

- Generator mit **bekannten wahren Raten** je Arm; jede Woche wird die Charge per Quote nach den Zielanteilen des Optimizers verteilt, danach werden Scans und Käufe gewürfelt.
- Modell wie im Betrieb (`src/stats/model.ts`): Beta-Verteilungen, Partial Pooling Gesamt → Branche → Variante, Thompson Sampling mit **15 % Kontrolle** und **20 % Exploration**, Gleichverteilung bis jeder Arm 10 Briefe hat, Steuerung über die Scan-Rate bis jeder Arm 5 Käufe hat.
- Entscheidungsregel: **Gewinner** erst bei P(besser als Kontrolle) ≥ 90 % **und** ≥ 100 zugestellten Briefen in beiden Armen; davor höchstens „Tendenz“.
- „Signal“ in den Beispiel-Läufen: Sobald beide Arme 5 Käufe haben, entscheidet der Kauf (Umsatz pro Brief) statt der Scan-Rate (B6.3). Käufe sind seltener, die Sicherheit fällt dann zunächst wieder – gewollt: Kauf ist der Richter.
- Vereinfachung: Reaktionen fallen in dieselbe Woche (in echt bis zu 45 Tage später) – die echte Lernkurve ist entsprechend langsamer.

## Szenario: Klarer Gewinner

Handwerk: Kontrolle 3 % Scan-Rate, Variante mit Statistik 6 %; Käufe 0,4 % bzw. 0,8 %. 60 Briefe pro Woche in der Branche, 20 Wochen.

| Kennzahl                                                      | Ergebnis       |
| ------------------------------------------------------------- | -------------- |
| Wahrer Gewinner am Ende als „Gewinner“ ausgerufen             | 80 % der Läufe |
| Erstmals ausgerufen nach (Mittel)                             | 8,5 Wochen     |
| Falscher Gewinner am Ende                                     | 0 % der Läufe  |
| Falscher Gewinner in irgendeiner Woche                        | 0 % der Läufe  |
| Anteil des wahren besten Arms an der nächsten Charge (Mittel) | 70 %           |
| Briefe handwerk/kontrolle (Mittel)                            | 444            |
| Briefe handwerk/variante (Mittel)                             | 756            |
| Breite der 90-%-Spanne Scan-Rate handwerk/kontrolle           | 2,4 Pp.        |
| Breite der 90-%-Spanne Scan-Rate handwerk/variante            | 2,5 Pp.        |

Beispiel-Lauf (Seed 1, Branche handwerk):

| Woche | Briefe K / V | Scans K / V | Käufe K / V | Spanne Scan-Rate V | Signal    | P(V besser) | Urteil V                | Anteil V nächste Woche |
| ----: | ------------ | ----------- | ----------- | ------------------ | --------- | ----------: | ----------------------- | ---------------------: |
|     1 | 30 / 30      | 0 / 1       | 0 / 0       | 1,1 % – 4,4 %      | Scan-Rate |        65 % | zu wenig Daten          |                   52 % |
|     2 | 59 / 61      | 0 / 3       | 1 / 0       | 1,7 % – 5,2 %      | Scan-Rate |        79 % | zu wenig Daten          |                   61 % |
|     3 | 82 / 98      | 3 / 6       | 1 / 1       | 3,5 % – 7,8 %      | Scan-Rate |        64 % | zu wenig Daten          |                   52 % |
|     4 | 111 / 129    | 4 / 10      | 1 / 1       | 4,5 % – 9,0 %      | Scan-Rate |        80 % | kein klarer Unterschied |                   62 % |
|     5 | 134 / 166    | 6 / 11      | 1 / 2       | 4,2 % – 8,3 %      | Scan-Rate |        71 % | kein klarer Unterschied |                   56 % |
|     6 | 160 / 200    | 6 / 11      | 1 / 3       | 3,5 % – 7,1 %      | Scan-Rate |        70 % | kein klarer Unterschied |                   56 % |
|     7 | 187 / 233    | 6 / 13      | 2 / 3       | 3,5 % – 6,9 %      | Scan-Rate |        81 % | kein klarer Unterschied |                   63 % |
|     8 | 209 / 271    | 6 / 14      | 2 / 3       | 3,3 % – 6,5 %      | Scan-Rate |        80 % | kein klarer Unterschied |                   62 % |
|     9 | 232 / 308    | 7 / 15      | 2 / 4       | 3,1 % – 6,2 %      | Scan-Rate |        81 % | kein klarer Unterschied |                   63 % |
|    10 | 254 / 346    | 8 / 18      | 3 / 4       | 3,5 % – 6,5 %      | Scan-Rate |        84 % | kein klarer Unterschied |                   65 % |
|    11 | 275 / 385    | 10 / 19     | 3 / 4       | 3,4 % – 6,3 %      | Scan-Rate |        74 % | kein klarer Unterschied |                   58 % |
|    12 | 300 / 420    | 11 / 20     | 4 / 4       | 3,3 % – 6,1 %      | Scan-Rate |        72 % | kein klarer Unterschied |                   57 % |
|    13 | 326 / 454    | 11 / 20     | 5 / 4       | 3,1 % – 5,7 %      | Scan-Rate |        75 % | kein klarer Unterschied |                   59 % |
|    14 | 351 / 489    | 12 / 24     | 5 / 6       | 3,5 % – 6,1 %      | Umsatz    |        42 % | kein klarer Unterschied |                   37 % |
|    15 | 389 / 511    | 13 / 25     | 6 / 6       | 3,5 % – 6,1 %      | Umsatz    |        35 % | kein klarer Unterschied |                   32 % |
|    16 | 430 / 530    | 14 / 28     | 6 / 6       | 3,8 % – 6,4 %      | Umsatz    |        39 % | kein klarer Unterschied |                   36 % |
|    17 | 469 / 551    | 15 / 30     | 6 / 6       | 3,9 % – 6,6 %      | Umsatz    |        41 % | kein klarer Unterschied |                   36 % |
|    18 | 507 / 573    | 15 / 31     | 6 / 6       | 3,9 % – 6,5 %      | Umsatz    |        43 % | kein klarer Unterschied |                   38 % |
|    19 | 544 / 596    | 15 / 33     | 6 / 6       | 4,0 % – 6,6 %      | Umsatz    |        42 % | kein klarer Unterschied |                   37 % |
|    20 | 582 / 618    | 16 / 35     | 7 / 6       | 4,1 % – 6,7 %      | Umsatz    |        35 % | kein klarer Unterschied |                   33 % |

## Szenario: Kein Unterschied

Beauty: Kontrolle und Variante beide 4 % Scan-Rate und 0,5 % Kaufrate. 60 Briefe pro Woche, 20 Wochen. Jeder ausgerufene Gewinner ist falsch.

| Kennzahl                                          | Ergebnis       |
| ------------------------------------------------- | -------------- |
| Falscher Gewinner am Ende                         | 6 % der Läufe  |
| Falscher Gewinner in irgendeiner Woche            | 16 % der Läufe |
| Briefe beauty/kontrolle (Mittel)                  | 688            |
| Briefe beauty/variante (Mittel)                   | 512            |
| Breite der 90-%-Spanne Scan-Rate beauty/kontrolle | 2,1 Pp.        |
| Breite der 90-%-Spanne Scan-Rate beauty/variante  | 2,4 Pp.        |

Beispiel-Lauf (Seed 1, Branche beauty):

| Woche | Briefe K / V | Scans K / V | Käufe K / V | Spanne Scan-Rate V | Signal    | P(V besser) | Urteil V                | Anteil V nächste Woche |
| ----: | ------------ | ----------- | ----------- | ------------------ | --------- | ----------: | ----------------------- | ---------------------: |
|     1 | 30 / 30      | 0 / 1       | 0 / 0       | 1,1 % – 4,4 %      | Scan-Rate |        65 % | zu wenig Daten          |                   52 % |
|     2 | 59 / 61      | 1 / 3       | 1 / 0       | 2,1 % – 6,0 %      | Scan-Rate |        69 % | zu wenig Daten          |                   55 % |
|     3 | 86 / 94      | 3 / 6       | 1 / 1       | 3,5 % – 7,9 %      | Scan-Rate |        68 % | zu wenig Daten          |                   54 % |
|     4 | 114 / 126    | 6 / 8       | 1 / 1       | 4,1 % – 8,4 %      | Scan-Rate |        59 % | kein klarer Unterschied |                   49 % |
|     5 | 145 / 155    | 9 / 8       | 2 / 1       | 3,6 % – 7,6 %      | Scan-Rate |        40 % | kein klarer Unterschied |                   36 % |
|     6 | 183 / 177    | 9 / 8       | 2 / 1       | 3,0 % – 6,6 %      | Scan-Rate |        46 % | kein klarer Unterschied |                   40 % |
|     7 | 219 / 201    | 10 / 8      | 3 / 1       | 2,6 % – 5,9 %      | Scan-Rate |        42 % | kein klarer Unterschied |                   38 % |
|     8 | 256 / 224    | 11 / 8      | 3 / 1       | 2,4 % – 5,4 %      | Scan-Rate |        36 % | kein klarer Unterschied |                   34 % |
|     9 | 296 / 244    | 11 / 9      | 3 / 3       | 2,4 % – 5,3 %      | Scan-Rate |        50 % | kein klarer Unterschied |                   43 % |
|    10 | 330 / 270    | 12 / 10     | 4 / 3       | 2,4 % – 5,2 %      | Scan-Rate |        50 % | kein klarer Unterschied |                   42 % |
|    11 | 365 / 295    | 12 / 12     | 4 / 3       | 2,6 % – 5,4 %      | Scan-Rate |        66 % | kein klarer Unterschied |                   53 % |
|    12 | 393 / 327    | 12 / 13     | 4 / 4       | 2,5 % – 5,2 %      | Scan-Rate |        73 % | kein klarer Unterschied |                   57 % |
|    13 | 419 / 361    | 12 / 13     | 6 / 4       | 2,3 % – 4,8 %      | Scan-Rate |        68 % | kein klarer Unterschied |                   54 % |
|    14 | 447 / 393    | 13 / 16     | 8 / 4       | 2,7 % – 5,2 %      | Scan-Rate |        78 % | kein klarer Unterschied |                   61 % |
|    15 | 471 / 429    | 14 / 16     | 9 / 4       | 2,5 % – 4,9 %      | Scan-Rate |        71 % | kein klarer Unterschied |                   56 % |
|    16 | 497 / 463    | 15 / 19     | 9 / 4       | 2,8 % – 5,3 %      | Scan-Rate |        78 % | kein klarer Unterschied |                   60 % |
|    17 | 521 / 499    | 15 / 20     | 10 / 4      | 2,7 % – 5,1 %      | Scan-Rate |        80 % | kein klarer Unterschied |                   62 % |
|    18 | 544 / 536    | 15 / 21     | 10 / 4      | 2,7 % – 5,0 %      | Scan-Rate |        83 % | kein klarer Unterschied |                   64 % |
|    19 | 566 / 574    | 17 / 21     | 10 / 4      | 2,6 % – 4,7 %      | Scan-Rate |        70 % | kein klarer Unterschied |                   56 % |
|    20 | 593 / 607    | 19 / 23     | 10 / 5      | 2,7 % – 4,9 %      | Umsatz    |        11 % | kein klarer Unterschied |                   17 % |

## Szenario: Erste Charge (zu wenig Daten)

Wie die erste echte Charge (B10): je Branche ca. 13 Briefe pro Woche, 4 Wochen; Gastronomie 3 % vs. 5 %, Handwerk 4 % vs. 4 %, Beauty 5 % vs. 3 % Scan-Rate. Erwartung: kein Gewinner, nur Tendenzen, breite Spannen.

| Kennzahl                                                      | Ergebnis      |
| ------------------------------------------------------------- | ------------- |
| Wahrer Gewinner am Ende als „Gewinner“ ausgerufen             | 0 % der Läufe |
| Erstmals ausgerufen nach (Mittel)                             | –             |
| Falscher Gewinner am Ende                                     | 0 % der Läufe |
| Falscher Gewinner in irgendeiner Woche                        | 0 % der Läufe |
| Anteil des wahren besten Arms an der nächsten Charge (Mittel) | 54 %          |
| Briefe gastronomie/kontrolle (Mittel)                         | 29            |
| Briefe gastronomie/variante (Mittel)                          | 27            |
| Briefe handwerk/kontrolle (Mittel)                            | 28            |
| Briefe handwerk/variante (Mittel)                             | 24            |
| Briefe beauty/kontrolle (Mittel)                              | 29            |
| Briefe beauty/variante (Mittel)                               | 23            |
| Breite der 90-%-Spanne Scan-Rate beauty/kontrolle             | 6,0 Pp.       |
| Breite der 90-%-Spanne Scan-Rate beauty/variante              | 5,9 Pp.       |
| Breite der 90-%-Spanne Scan-Rate gastronomie/kontrolle        | 5,7 Pp.       |
| Breite der 90-%-Spanne Scan-Rate gastronomie/variante         | 6,1 Pp.       |
| Breite der 90-%-Spanne Scan-Rate handwerk/kontrolle           | 5,9 Pp.       |
| Breite der 90-%-Spanne Scan-Rate handwerk/variante            | 6,1 Pp.       |

Beispiel-Lauf (Seed 1, Branche gastronomie):

| Woche | Briefe K / V | Scans K / V | Käufe K / V | Spanne Scan-Rate V | Signal    | P(V besser) | Urteil V       | Anteil V nächste Woche |
| ----: | ------------ | ----------- | ----------- | ------------------ | --------- | ----------: | -------------- | ---------------------: |
|     1 | 7 / 7        | 0 / 1       | 0 / 0       | 3,1 % – 14,6 %     | Scan-Rate |        64 % | zu wenig Daten |                   50 % |
|     2 | 14 / 14      | 0 / 1       | 0 / 1       | 1,2 % – 9,2 %      | Scan-Rate |        71 % | zu wenig Daten |                   56 % |
|     3 | 20 / 22      | 0 / 2       | 0 / 1       | 2,3 % – 11,4 %     | Scan-Rate |        79 % | zu wenig Daten |                   61 % |
|     4 | 25 / 31      | 0 / 2       | 0 / 1       | 2,2 % – 6,4 %      | Scan-Rate |        65 % | zu wenig Daten |                   52 % |

## Partial Pooling: kleine Branche

Kurse & Training mit 5 Briefen und 2 Scans (roh 40 %): Schätzung 5,9 %, Spanne 3,5 % – 8,8 %. Gesamtrate 4,2 %. Ohne Pooling stünde dort „40 %“ – mit Pooling eine vorsichtige Schätzung mit breiter Spanne, die sich mit weiteren Briefen von selbst bewegt.

## Power-Rechner

Um einen Unterschied von 2 % auf 3 % Scan-Rate sicher zu erkennen (5 % Irrtum, 80 % Teststärke), braucht es ca. **3.826 Briefe pro Variante** – bei 7 Briefen pro Woche und Variante (erste Charge) rund 547 Wochen. Deshalb ist das Ziel der ersten Wochen die Messkette und erste Spannen, nicht der Gewinner (B10).

## Bewertung

- **Findet die bessere Variante:** Bei einem echten Unterschied (3 % → 6 %) ruft das System den wahren Gewinner in der Mehrzahl der Läufe aus und verschiebt die Briefe zu ihm, ohne die Kontrolle unter 15 % zu senken.
- **Keine falschen Gewinner bei zu wenig Daten:** In der ersten Charge (4 Wochen à ca. 13 Briefe je Branche) wird nie ein Gewinner ausgerufen – die 100-Briefe-Regel greift, das Dashboard zeigt nur Tendenzen und breite Spannen.
- **Ohne echten Unterschied** ruft das System am Ende selten einen Gewinner aus. Weil jede Woche neu geschaut wird, taucht in einem Teil der Läufe zwischendurch kurz ein falscher „Gewinner“ auf (Anteil oben). Deshalb ändert der Optimizer nur die Zuteilung (die Kontrolle läuft immer mit); Varianten-Entscheidungen (Standard wechseln, Variante beenden) bleiben beim Betreiber bzw. der Review-Queue des Lern-Agents.
