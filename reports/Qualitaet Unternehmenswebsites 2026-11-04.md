# Qualität der automatisch erstellten Unternehmenswebsites (04.11.2026)

Zwei getrennte Ziele: (1) Der Inhaber versteht die Seite und die Übernahme. (2) Besucher verstehen Leistungen,
fassen Vertrauen und können die passende Anfrage stellen. Über Conversion sagt dieser Bericht nichts aus. Dafür braucht
es Messung mit echten Briefen.

## A. Diagnose der Kette (Recherche → Kundenseite)

| Stelle | Befund vorher | Ursache |
| --- | --- | --- |
| Schema | „Über uns“ war Pflicht (80–700 Zeichen), dazu 3–4 FAQ | Das Schema erzwang Text ohne Information |
| Ersatztexte | „Über uns“ = „X ist als Y in Z zu finden …“, FAQ „Welche Angaben sind bestätigt?“ | Füllstoff ohne Aussage für Besucher |
| Leistungen (Ersatz) | Schein-Leistungen „Projekt anfragen“, „Terminwünsche“, „Individuelle Anfrage“ | Handlungen standen als Leistungen in der Liste |
| Handlungen | Kit-Button „Anfrage mit Fotos“, Formularfeld Foto-Upload | Live gibt es keinen Upload. Das war ein falsches Versprechen. |
| Entwurfsformular | Andere Felder als das echte Formular (Umfang, Zeitraum, Chips) | Die Vorschau zeigte nicht, was der Kunde bekommt |
| Farbwelt | Reihum nach Nutzung | Keine Passungsregel |
| Bilder | 1000–1200 px, randlos über 1440 px gezogen | Unscharf, wirkten klein bzw. weich |
| Ohne Foto | Leere zweite Spalte im Hero | Layout setzte immer ein Bild voraus |
| Überschriften | „Kosmeti-k“, „Fußbodentechni-k“ | Schriftgröße unabhängig vom längsten Wort |
| QA | Prüft gerenderte Seiten (axe, Layout, Lighthouse) und KI-Muster | Gut; aber die KI-Muster-Prüfung las bei Elektro die ganze Seite (Regex auf `<main>` ohne Attribute) |
| Öffentliche Beispiele | `/beispiele/` noch mit alten Templates | Skript zeigte auf alte IDs |
| Gestaltungsentscheidung | nicht dokumentiert | Kein Briefing vor dem Bau |

## B. Umgesetzt (im bestehenden Generator, kein Parallelsystem)

1. **Gestaltungsbriefing** vor jeder Demo, getrennt nach belegt, Vorschlag und fehlt. Es enthält auch die
   Besucherfrage, die Haupt-Handlung und den Seitenumfang. Es wird mit der Demo gespeichert und steht in
   „Demo prüfen“. Bei dünner Datenlage wird die Seite kompakt (ohne Projekt-Platzhalter). Im Entwurf steht
   ein Kasten „Was für Ihre Seite noch fehlt“.
2. **Farbwelt nach Passung vor Abwechslung.** Die Reihenfolge der Kriterien:
   1. belegte Bildwelt
   2. Öffnungszeiten (spät → Abend-Farbwelt, Tagesbetrieb → hell)
   3. unterscheidende Gewerksbegriffe (Lackierer, Sanitär, Glasreinigung …)
   4. Abwechslung
3. **Ehrliche Inhalte:**
   - „Über uns“ und FAQ sind optional.
   - Live erscheinen keine leeren Abschnitte und keine erfundenen Öffnungszeiten.
   - Schein-Leistungen wurden ersetzt.
4. **Handlungen nach Funktion:** Projekt / Reinigungsangebot / Behandlung / Termin / Tisch anfragen.
   - Es gibt kein Upload-Versprechen mehr.
   - Das Entwurfsformular hat dieselben Felder wie das echte und ist sichtbar „nicht absendbar“.
   - Das Live-Formular (Validierung, Weiterleitung, Bestätigung) bleibt unverändert.
5. **Bilder:**
   - 28 lizenzierte Fotos in 1600 px; die Lizenzangaben bleiben in den Bilddaten.
   - Randlos nur, wenn die Auflösung es hergibt.
   - Ohne Foto gibt es eine eigene Hero-Variante.
   - Beim Maler läuft das Bild bis an den Rand.
6. **Typografie:** Die Größe der Hauptüberschrift richtet sich nach dem längsten Wort. Auf 320 bis 1440 px gibt
   es keine Worttrennungen mehr.
7. **SeitenWerk-Leiste** auf dem Handy ruhiger (kleiner, „Fragen“ ausgeblendet). Entwurfshinweis, Übernahme und
   Preise bleiben.

## C. Referenz-Demos

`/muster-kits/` zeigt 11 fiktive Betriebe mit festen Testdaten, ohne KI-Kosten:

- **Zwei Maler**, die durch die Daten verschieden aussehen. Hennig hat viele Angaben und die helle Farbwelt.
  Özdemir-Kowalczyk hat wenige Angaben, einen langen Namen, kein Telefon, die dunkle Farbwelt und eine kompakte Seite.
- **Fliesen Arslan**
- **Bodenleger** ohne passende Fotos und mit langen Wörtern
- **Elektro Brandt** und **Haustechnik Yilmaz** (Sanitär, andere Farbwelt)
- **Gebäudereinigung**
- **Kosmetik** und **Friseur**
- **Restaurant** (Abend) und **Café** (Tag, kein Telefon)

## D. Vorher/Nachher

Gleiche Daten, altes Template gegen Kit, für Maler, Reinigung, Kosmetik und Restaurant. Die Dateien liegen unter
`/muster-kits/*-vorher.html`.

## E. Sichtprüfung

- **Breiten:** Je Demo 320, 390, 768 und 1440 px.
  - Kein waagerechter Überlauf. Ein Überlauf im Live-Formular bei 320 px wurde behoben.
  - Keine getrennten Überschriftswörter.
- **Tastatur:** Alle erreichbaren Elemente haben einen sichtbaren Fokus.
- **Live-Formular:** Leer abgeschickt meldet es die Pflichtfelder als ungültig (Name, E-Mail, Nachricht, Zustimmung).
- **KI-Muster-Prüfung:** Keine Treffer in allen Referenz-Demos.

## F. Öffentliche Beispiele und Brief

- `/beispiele/` (Handwerk, Beauty, Gastro) zeigt jetzt Kits; Vorschaubild und verlinkte Seite stammen aus demselben
  Rendering.
- Der Briefscreenshot entsteht bei der Demo-QA aus der gespeicherten Demo. Neue Demos bekommen also automatisch neue
  Bilder.
- In der Produktion gab es 0 Demos und 0 Briefe, verändert wurde nichts.

## G. Was künftige Demos automatisch bekommen

- Briefing
- Passung der Farbwelt
- kompakte Seiten bei dünner Datenlage
- ehrliche Formulare und Buttons
- größere Bilder
- Wortlängen-Regel
- Fehlt-Kasten
- KI-Muster-Prüfung auf allen Kit-Layouts

## H. Was echte Daten, Rechte, Prüfung oder Messung braucht

- **Eigene Fotos der Betriebe** (mit Rechten). Symbolbilder bleiben Symbolbilder.
- **Gastro-Fotos** sind nur 1000 px (CC0). Bessere lizenzierte Motive fehlen, deshalb werden sie in Satzbreite gezeigt.
- **Einzelhandel und Kurse** haben noch keine eigenen Kits.
- **Wirkung** (Scans, Anfragen, Käufe) ist nur mit echten Briefen messbar. Die Messkette steht.
- **Silbentrennung** hängt vom Browser ab. iOS trennt, der Testbrowser nicht; deshalb setzt die Schriftgrößenregel an.
- **Die ersten 30 Demos** prüft der Betreiber weiter von Hand.
