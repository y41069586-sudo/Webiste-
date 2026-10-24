# Wochenbericht Lern-Agent 2026-KW43

Probelauf ohne Sprachmodell (Mock). Die Kennzahlen stammen aus dem Export; bei so wenigen Briefen sind Unterschiede zwischen den Varianten überwiegend Zufall.

## Versand, Reaktionen und Spannen je Branche

### Handwerk

Briefe 60, zugestellt 60, Scans 8, Demo-Aufrufe 8 (davon ≥ 30 s: 0), „Seite übernehmen“ 0, WhatsApp 0, Fragen 0, Checkout 0, Käufe 0, Opt-outs 0, Beschwerden 0.

| Variante                 | zugestellt | Scans | Scan-Rate (90 %) | Käufe | Kaufrate (90 %)        | P(besser als Kontrolle) | Urteil         |
| ------------------------ | ---------: | ----: | ---------------- | ----: | ---------------------- | ----------------------: | -------------- |
| A – Standard (Kontrolle) |         30 |     3 | 9,9 % – 17,2 %   |     0 | noch nicht ausgewertet |                       – | Kontrolle      |
| HANDWERK_B               |         30 |     5 | 10,6 % – 18,2 %  |     0 | noch nicht ausgewertet |                    61 % | zu wenig Daten |

Diese Woche: keine zugestellten Briefe; Vorwoche: 8 Scans bei 60 zugestellten Briefen (7,9 % – 22,4 %).

## Veränderungen gegenüber der Vorwoche

- Handwerk: 60 zugestellte Briefe, 8 Scans. _(vermutlich Zufall)_

Ohne Briefe bisher: Beauty, Dienstleistung, Einzelhandel, Gastronomie, Kurse & Training.

## Wo die meisten abspringen

| Branche  | Zugestellt → Scan | Scan → Demo | Demo → Übernehmen | Übernehmen → Checkout | Checkout → Kauf |
| -------- | ----------------: | ----------: | ----------------: | --------------------: | --------------: |
| Handwerk |              13 % |       100 % |               0 % |                     – |               – |

Siehe Funnel-Tabelle: die größte Lücke liegt zwischen Zustellung und Scan.

## Häufigste Einwände (letzte 4 Wochen)

- Handwerk: „zu teuer“ – 2×

Die Einwände sind nach Kategorie gezählt; Texte werden nicht weitergegeben.

## Hypothesen (höchstens 3)

1. **Einwand „zu_teuer“ früh beantworten** (Handwerk) – Der Einwand kam 2-mal; der Brief geht bisher nicht darauf ein.
2. **Demo wird angesehen, aber „Seite übernehmen“ nicht geklickt** (Handwerk) – 8 Scans, 8 Demo-Aufrufe, 0 Klicks auf „Seite übernehmen“.

## Neue Varianten-Vorschläge (Ein-Slot-Regel)

- Handwerk, Nutzen-Satz von „HANDWERK_B“ → **Review-Queue** (Varianten-Labor)
  - vorher: Bei Ihnen findet man bisher keine eigene Website. Deshalb habe ich Ihnen eine gebaut: mit Ihren Leistungen, Ihrem Einzugsgebiet, einem Anfrageformular und einer fertigen Seite „Wir stellen ein“ für neue Mitarbeiter und Azubis.
  - neu: Deshalb habe ich Ihnen eine gebaut: mit Ihren Leistungen, Ihrem Einzugsgebiet, einem Anfrageformular und einer fertigen Seite „Wir stellen ein“ für neue Mitarbeiter und Azubis. Sie wählen selbst: einmal zahlen oder monatlich – ohne Einrichtungsgebühr und ohne versteckte Kosten.
  - Hypothese: Der häufigste Einwand (zu_teuer) wird im Nutzen-Satz direkt beantwortet. · Einwand: „zu teuer“
- Handwerk, Betreff von „HANDWERK_B“ → **Review-Queue** (Varianten-Labor)
  - vorher: Neue Mitarbeiter finden Sie auch über Ihre Website
  - neu: Ihre Website ist schon fertig – sehen Sie selbst
  - Hypothese: Ein Betreff, der den fertigen Entwurf nennt, wird häufiger gescannt als ein Branchen-Betreff.

## Aufräumen

Keine Variante mit P ≥ 95 % schlechter als die Kontrolle.

---

_Spannen = 90 % Wahrscheinlichkeit (Bayes mit Partial Pooling). „Gewinner“ erst bei P ≥ 90 % und genug Briefen je Arm. Bei wenigen Briefen sind Unterschiede überwiegend Zufall._
