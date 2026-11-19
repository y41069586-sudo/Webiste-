# Design- und Conversion-System für Handwerker-Demos (19.11.2026)

Umsetzung des Masterprompts „SeitenWerk: verbindliches Design- und Conversion-System“.
Status-Begriffe: **umgesetzt** = Code vorhanden, **getestet** = automatisch oder im Browser geprüft,
**offen** = noch nicht nachgewiesen.

## 1. Befund vor der Umsetzung (gelesener Code, gerenderte Demos)

Gelesene Dateien:
- **Generator:** `packages/core/src/demos/build.ts`, `studio-author.ts`, `studio.ts`, `content.ts`, `business-design.ts`, `mock-handlers.ts`
- **Templates:** `packages/templates/src/authored/*`, `kits/*`, `photos.ts`, `partials/shared.ts`, `index.ts`
- **QA:** `packages/core/src/render/demo-qa.ts`
- **Worker:** `apps/worker/src/jobs/demos.ts`
- **Auslieferung:** `apps/web/src/app/d/[slug]/route.ts`
- **Bilder:** `packages/templates/assets/images/manifest.json`

Gerendert und angesehen wurden echte Demos vom 19.11. (Kfz-Werkstätten, Test über den Produktionsworker).

Die fünf wichtigsten Ursachen:
1. **Das Modell schrieb das komplette HTML/CSS frei** (`authored-*`), unter vielen Einschränkungen: kein JavaScript, feste Abschnittsreihenfolge, kein Formular im Inhalt. Das Ergebnis war gleichförmig und minimalistisch, mit wenig Gestaltungsqualität. Prüfung und Korrektur liefen über dasselbe Modell-Paradigma.
2. **Es gab keine Gestaltungsrichtung nach Besuchsanlass.** Notfall-Reparatur und Großprojekt bekamen dieselbe Komposition (`services, gallery, inquiry, area, faq, placeholders`) und dieselbe Hauptaktion („Anfrage“).
3. **Bildauswahl:**
   - Fotos wurden nur über Stichwörter zum Branchennamen gefunden. Unbekannte Gewerke (z. B. Kfz) bekamen gar kein Bild, die Demo blieb ohne Bild und fiel durch die QA.
   - Es gab kein Hero-Hintergrundbild als feste Komposition.
4. **Die Richtlinie war nicht zentral an alle Aufrufe gebunden.** Regeln standen verteilt in Prompt-Texten (`DEMO_SYSTEM_PROMPT`, `STUDIO_SYSTEM`). Es gab keine Version pro Demo und keinen Test, ob ein Worker-Aufruf sie erhält.
5. **Die Bewertung war nicht getrennt messbar.** Die KI-Prüfung lieferte Befunde, aber keinen Punktekatalog mit Schwelle und Sperrgründen. Wenn die Ansicht fehlte, wurde nicht klar „ungeprüft“ gemeldet.

Lücke:
- Die acht Referenzseiten wurden **nicht abgerufen oder angesehen**. Sie stehen als kuratierte Beschreibung im Code, mit `seen: false`.
- Echte Modell-Läufe des neuen Pfads gibt es noch nicht (siehe 6.).

## 2. Was umgesetzt ist

| Baustein | Datei | Status |
|---|---|---|
| Zentrale Richtlinie mit Version `sw-design-2026-11-19.1`, Budget (2 Korrekturrunden, Schwelle 85), Referenzbibliothek, Faktenstatus, Designbriefing, Kontext-Builder | `packages/core/src/demos/design-policy.ts` | umgesetzt, getestet |
| `designCall`: einziger Weg für designrelevante Modellaufrufe, hängt Richtlinie und Kontext an | `design-policy.ts` | umgesetzt, getestet |
| Eingebunden in: Praxis-Texte und Korrekturen, getrennte Bewertung, Studio-Konzept und Studio-Entwurf (andere Branchengruppen), Briefing aus Betriebsbelegen | `praxis-author.ts`, `studio-author.ts`, `business-design.ts`, `render/demo-qa.ts` | umgesetzt, getestet (Integrationstest fängt die echten Provider-Anfragen ab) |
| Vier Gestaltungsrichtungen als feste, saubere Vorlage: Service und Reparatur, Sanierung und Projekt, Räume und Materialien, Garten und Außenraum | `packages/templates/src/praxis/*` | umgesetzt, getestet |
| Handwerk nutzt automatisch die Praxis-Vorlage; Richtung nach Gewerk. Rückweg: `DEMO_GENERATOR=authored` | `build.ts` (`chooseTemplate`) | umgesetzt, getestet |
| Modell liefert nur Texte, höchstens 1 + 2 Versuche mit gezieltem Feedback, danach Fehler statt Ersatzvorlage | `praxis-author.ts` | umgesetzt, getestet mit Testantworten |
| Getrennte Bewertung mit eigenem Kontext: Kriterien, Briefing, Ansichten und Testergebnisse; 100-Punkte-Schema, Sperrgründe, fehlende Bewertung = gesperrt | `praxis-author.ts`, `demo-qa.ts` | umgesetzt, Logik getestet; echter Modelllauf offen |
| Pro Demo gespeichert: Richtlinienversion, Vorlagenversion, Richtung, Modelle, Budget, Briefing | `contentJson._meta.design`, `_meta.praxisBrief` | umgesetzt |
| Freigabe für Briefe: unverändert nur nach bestandener QA und Freigabe. Eine nicht bestandene Bewertung führt zu `qa_failed` | bestehender Ablauf | unverändert |

**Seitenaufbau:**
- Der erste Bildschirm zeigt eine konkrete H1, den Ort, eine priorisierte Aktion passend zum Anlass und ein gewerkpassendes Symbolbild, das sichtbar als „Symbolbild, keine Aufnahme des Betriebs“ gekennzeichnet ist.
- Die Navigation funktioniert ohne JavaScript, auf dem Handy über `details`.
- Das Formular unterscheidet sich je Anlass: Rückruf (Name, Telefon, Zeitfenster als Wunsch), Besichtigung, Beratung oder Gartenprojekt (Leistung, PLZ, eine Kontaktangabe, Beschreibung).
- In der Demo ist das Formular eine erkennbare Vorschau: „Im Entwurf wird nichts versendet und kein Termin reserviert“. Auf Live-Seiten wird das echte Formular eingesetzt.
- Das SeitenWerk-Angebot steht nur in der getrennten Leiste und im Footer, nie im Betriebsinhalt. Ein Test prüft das.

**Bewegung:**
- Buttons 160 ms, Menü 220 ms.
- Einmalige Einblendung per CSS (`animation-timeline: view()`), nur ohne reduzierte Bewegung. Ohne Unterstützung ist der Inhalt sofort sichtbar.
- Bild-Hover vergrößert um 1,025.

**Ausgeschlossen:** Glas, Verläufe, große Rundungen und weiche Schatten. Die bestehende KI-Muster-Prüfung meldet für die Vorlage keine Treffer; ausgenommen sind Gedankenstriche aus Testtexten.

## 3. Prüfergebnisse (tatsächlich gemessen)

Sieben Testbetriebe (Vorschau-Skript `packages/core/scripts/praxis-preview.mts`, eindeutig „Testbetrieb“, ohne KI-Aufruf):

| Testbetrieb | Richtung |
|---|---|
| Dachdecker | Projekt |
| Elektriker | Service |
| Sanitär/Heizung | Service, mit **langem Namen** |
| Maler | Räume, **ohne Telefon und ohne Öffnungszeiten** |
| Fliesenleger | Räume |
| GaLa-Bau | Garten |
| Schornsteinfeger | Service, **ohne passende Bilder** → reduzierte typografische Seite |

Keiner der Testbetriebe hat Bewertungen.

- **Browser (Playwright, Chromium):** 360, 390, 768 und 1440 px sowie 200 % Zoom, jeweils für alle 7 Seiten (35 Messungen):
  - 0× horizontaler Überlauf, 0× abgeschnittene Überschriften oder Buttons, 0× kaputte Bilder, 0 Konsolenfehler.
  - Mobiles Menü öffnet in allen 28 Handy-, Tablet- und Zoom-Läufen.
  - Hauptbuttons und Menü-Schalter sind mindestens 44 px hoch.
- **Automatische Tests:**
  - `templates`: 206/206 grün, darunter 9 neue Praxis-Tests.
  - `core/test/design-policy.test.ts`: 9/9 grün.
  - Barrierefreiheits-Tests (axe): 210/210 grün.
  - Gesamte Core-Suite: 1135 von 1141 grün (nach dem zweiten Durchgang 1141 von 1147). Die 6 roten Tests (`backup-fingerprint`, `share-studio-preview`, `studio-preview-runtime`) sind auf dem Stand vor dieser Änderung ebenso rot; sie brauchen einen Chromium unter `/usr/bin/chromium` bzw. Root-Dateirechte und betreffen diese Arbeit nicht.
- **Lighthouse (Labor, Handy-Profil, gedrosselt, 7 Live-Varianten ohne Banner):** `npx tsx scripts/praxis-preview.mts <ordner> --lighthouse`

| Testbetrieb | Leistung | Barrierefreiheit | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Dachdecker | 100 | 96 | 100 | 100 | 1,15 s | 0,001 | 2 ms |
| Elektriker | 100 | 96 | 100 | 100 | 0,97 s | 0,017 | 0 ms |
| Sanitär/Heizung | 100 | 96 | 100 | 100 | 0,98 s | 0,000 | 0 ms |
| Maler | 100 | 96 | 100 | 100 | 0,98 s | 0,000 | 0 ms |
| Fliesenleger | 100 | 96 | 100 | 100 | 0,99 s | 0,026 | 0 ms |
| GaLa-Bau | 100 | 96 | 100 | 100 | 0,97 s | 0,000 | 0 ms |
| Schornsteinfeger | 100 | 96 | 100 | 100 | 0,97 s | 0,019 | 0 ms |

  Grenzen der Messung:
  - Live-Varianten enthalten keine Symbolbilder (die sind nur in der Demo). Die Werte gelten also für die Live-Seite ohne Fotos des Betriebs, nicht für die Demo mit eingebetteten Bildern (Demo-HTML 130–830 KB).
  - INP lässt sich im Labor nicht messen; TBT ist nur ein Ersatzwert.
  - Felddaten (LCP, INP, CLS im 75. Perzentil) gibt es noch **nicht**; sie entstehen erst mit echtem Verkehr.
  - Barrierefreiheit 96 statt 100: Der Einzelbefund ist noch nicht ausgewertet; axe meldet keine Verstöße.

## 3a. Nachtrag 19.11.2026 (zweiter Durchgang): geschlossene Lücken

| Lücke | Umsetzung | Status |
|---|---|---|
| Nur eine Korrektur nach der Bewertung | Praxis-Demos: bis zu `DESIGN_BUDGET.maxCorrections` (2) gezielte Neubauten mit den Befunden der Bewertung (`qaRound` im Auftrag, `_meta.qaRetry` pro Demo); danach `qa_failed` mit Meldung „REVIEW_REQUIRED“ statt stiller Freigabe. Andere Vorlagen unverändert eine Runde. | umgesetzt, Pipeline-Tests grün |
| Allgemeines Formular auf der Kunden-Website | Praxis-Vorlage baut das echte Formular selbst, je Anlass: Rückruf = Name + Telefon (Pflicht), Wunschzeit und Anliegen optional; geplante Arbeit = Leistung, PLZ, Name, E-Mail **oder** Telefon (eins genügt, serverseitig geprüft), Beschreibung. Sichtbare Labels, passende Eingabetypen und Autofill, Honeypot, Einwilligung, Hinweis „keine feste Buchung“. Server (`handleSiteForm`): E-Mail nicht mehr Pflicht, wenn Telefon da ist; Rückruf ohne Nachricht erlaubt; Leistung und PLZ in der Weiterleitung; ohne E-Mail geht „Antworten“ nie an SeitenWerk. Doppeltes Absenden: bestehende serverseitige Entprellung. Fehlerseite verweist auf die Zurück-Taste (Eingaben bleiben erhalten). | umgesetzt, getestet (Vorlage + Server) |
| Identität | Akzentfarbe je Betrieb stabil aus 3 geprüften Varianten je Richtung (alle ≥ 4,5:1); Logo im Kopf, wenn vorhanden – im Entwurf nur mit bestätigten Rechten. Eine Farbableitung aus dem Logo selbst gibt es nicht (keine Logos in den Lead-Daten). | umgesetzt, getestet |
| Ladezeit der Demo | Gespeicherte Demos behalten ihre Bilder eingebettet (Notfall-Kopie bleibt vollständig). Beim Ausliefern werden große, nachgelagerte Bilder (`loading="lazy"`) zu eigenen Adressen `/d/{slug}/bild/{hash}` (Netlify-Zwischenspeicher, gleicher Cache-Tag wie die Demo). Das Hauptbild bleibt eingebettet. | umgesetzt, getestet, gemessen |
| Prüfdatum je Angabe | `normalizedFacts` führt pro Angabe `checkedAt` (Recherche-Zeitpunkt, sonst letzter Datenabgleich); im Modellkontext als „geprüft JJJJ-MM-TT“. | umgesetzt, getestet |
| Messung auf der Betriebs-Website | Neues Ereignis `site_inquiry`, wenn eine Anfrage serverseitig angenommen und weitergeleitet wurde: nur Art und Kontaktweg, keine Namen, Nummern, PLZ oder Inhalte; Abnahmetests zählen nicht. | umgesetzt, getestet |
| Barrierefreiheit 96 | Ursache: Kontrast eines Hinweistextes im alten Live-Formular. Mit dem neuen Formular 100 auf allen Seiten. | behoben, gemessen |

**Messung nach dem zweiten Durchgang** (Labor, Handy-Profil, gedrosselt; `npx tsx scripts/praxis-preview.mts <ordner> --lighthouse`):

| Testbetrieb | Live: Leistung / Barrierefreiheit / LCP | Demo wie ausgeliefert: Leistung / LCP (vorher) |
|---|---|---|
| Dachdecker | 100 / 100 / 1,13 s | 98 / 1,99 s (2,54 s) |
| Elektriker | 100 / 100 / 0,99 s | 100 / 1,48 s (1,52 s) |
| Sanitär/Heizung | 100 / 100 / 0,99 s | 99 / 1,76 s (1,76 s) |
| Maler | 100 / 100 / 0,98 s | 97 / 2,07 s (3,73 s) |
| Fliesenleger | 100 / 100 / 0,97 s | 97 / 2,07 s (3,43 s) |
| GaLa-Bau | 100 / 100 / 0,97 s | 99 / 1,78 s (3,29 s) |
| Schornsteinfeger (ohne Bilder) | 100 / 100 / 0,97 s | 100 / 1,16 s (1,17 s) |

CLS überall ≤ 0,026, TBT ≤ 3 ms. Demos haben absichtlich SEO 66 (noindex). Browser-Prüfung: 14 Seiten (Demo und Live) × 5 Breiten = 70 Messungen, 0 Probleme.

## 4. Noch offen

- **Echter Modelllauf des neuen Pfads:** Er braucht den aktualisierten Worker auf dem VPS (dort liegt der API-Schlüssel). Danach sechs Test-Leads bauen lassen und Texte, Bewertungspunkte und Kosten prüfen.
- **Bewertungs-Schwelle kalibrieren:** Die Schwelle 85 ist eine Heuristik. Sie wird mit den ersten echten guten und schlechten Beispielen kalibriert.
- **Referenzen:** Abruf und Screenshots der Referenzseiten für ein bildfähiges Modell sind nicht eingebaut. Die Domain-Allowlist (`referenceUrlAllowed`) steht bereit.
- **Kfz-Werkstätten:** Es gibt keine Kfz-Fotos in der Bildbibliothek; die Seite wird dann typografisch. Für Werkstätten wäre eine lizenzierte Bildstrecke nötig.
- **Kontaktklick und „Formular begonnen“ auf Betriebs-Websites:** bewusst nicht gebaut. Das bräuchte ein Skript auf der Kundenseite und einen Hinweis in der Datenschutzerklärung des Kunden (§ 25 TDDDG ist für das Mess-Skript noch offen). Erfasst wird die serverseitig angenommene Anfrage (`site_inquiry`). Ein Telefonklick wäre ohnehin kein belegter Anruf.
- **Logo-Farben:** Es gibt keine automatische Farbableitung aus einem Logo; die Akzentfarbe kommt aus geprüften Varianten.
- **Direktbuchung:** bewusst nicht eingebaut. Ohne echte Verfügbarkeit wird keine Buchung vorgetäuscht.
