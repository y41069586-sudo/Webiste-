# Experiment-Logbuch

Maßgeblich ist die Tabelle `experiments` (B6.5). Der Lern-Agent liest sie jede Woche, damit er keine schon
getesteten oder verworfenen Ideen erneut vorschlägt. Die aktuelle Fassung gibt es

- im Dashboard unter **Varianten-Labor → Experiment-Logbuch (Markdown)** (`/admin/variants/logbuch`) und
- als Datei `reports/experiments.md` im Object Storage (nach jedem Lauf des Lern-Agents).

## Felder

| Feld                  | Bedeutung                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `industry`            | Branche (Playbook)                                                                                        |
| `hypothesis`          | Was die Variante zeigen soll                                                                              |
| `variant_ids`         | Getestete Variante(n)                                                                                     |
| `control_variant_id`  | Kontrolle (neutrale Variante ohne Statistik, sofern nicht in den Einstellungen anders gesetzt)            |
| `changed_slot`        | Der eine geänderte Slot (Betreff, Claim, Nutzen-Satz, QR-Text, Preisdarstellung)                          |
| `started_at/ended_at` | Laufzeit                                                                                                  |
| `result_json`         | Letztes Urteil, P(besser als Kontrolle), Briefe, Scans, Käufe, Spanne; bei Vorschlägen Wahrheits-Check    |
| `decision`            | `proposed`, `rejected`, `running`, `auto_activated`, `winner`, `paused_worse`, `stopped`, `no_difference` |
| `notes`               | Begründung (z. B. Ablehnungsgrund aus dem Varianten-Labor)                                                |

## Startexperimente (B4/B10)

Beim ersten Lauf übernimmt der Lern-Agent jede laufende Startvariante automatisch ins Logbuch:

| Branche      | Variante   | Hypothese                                                                                 | Kontrolle    |
| ------------ | ---------- | ----------------------------------------------------------------------------------------- | ------------ |
| Gastronomie  | GASTRO_A   | Startvariante aus B4.1 (Claims derzeit abgelaufen → läuft erst nach neuer Quelle)         | A – Standard |
| Handwerk     | HANDWERK_A | Startvariante mit Statistik (B4.2), sobald die Claims freigegeben sind                    | A – Standard |
| Handwerk     | HANDWERK_B | Recruiting-Aufhänger ohne Statistik spricht Betriebe mit Personalbedarf stärker an        | A – Standard |
| Beauty       | BEAUTY_A   | Startvariante mit Statistik zu Online-Terminen (B4.3), sobald die Claims freigegeben sind | A – Standard |
| Einzelhandel | HANDEL_A   | Startvariante (B4.4)                                                                      | A – Standard |
| Kurse        | KURSE_A    | Startvariante (B4.5)                                                                      | A – Standard |
