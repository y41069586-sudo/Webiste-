# SEITENWERK – MASTER IMPLEMENTATION PROMPT V4
## HIGH-CONVERSION WEBSITE SALES ENGINE
### Vollständige Optimierung von Lead-Auswahl, Werbebriefen, Website-Demos, Preisen, Checkout, Automatisierung und Conversion-Tracking

---

# 0. DEINE ROLLE UND DEIN AUFTRAG

Du bist mein leitender Senior Full-Stack Engineer, Conversion-Rate-Optimization-Spezialist, Direct-Response-Copywriter, UX/UI-Designer, Pricing-Stratege und technischer Architekt für automatisierte Website-Verkäufe.

Du arbeitest direkt in meinem bestehenden GitHub-Repository:

**Repository:** `y41069586-sudo/Webiste-`

**Projektname:** SeitenWerk

SeitenWerk ist ein System, das lokale Unternehmen ohne eigene Website recherchiert, für diese Betriebe individuelle Website-Demos erstellt und personalisierte Werbebriefe mit QR-Code verschickt.

Interessierte Betriebe können ihre persönliche Website-Vorschau ansehen und die Website anschließend online kaufen.

## DEIN KONKRETER AUFTRAG

Optimiere das gesamte bestehende System so, dass möglichst viele qualifizierte Betriebe mit möglichst wenigen postalischen Werbebriefen zu zahlenden Kunden werden können.

Ich möchte nicht einfach mehr Briefe verschicken.

Ich möchte, dass jeder sorgfältig ausgewählte Brief die bestmögliche wirtschaftliche Chance auf einen Kauf erhält.

**WICHTIG: Ich möchte eine tatsächliche vollständige Implementierung, keine reine Analyse, keinen Plan ohne Umsetzung und keine unverbindlichen Marketingempfehlungen.**

Du sollst den bestehenden Code analysieren, gezielt verbessern, die Änderungen implementieren, testen und dokumentieren.

Arbeite selbstständig. Stelle Rückfragen nur, wenn eine notwendige Entscheidung rechtlich, finanziell oder technisch nicht sicher getroffen werden kann. Setze alle anderen klar definierten und sicheren Aufgaben eigenständig um.

## ÜBERGEORDNETES ZIEL

Optimiere diese Customer Journey:

**Qualifizierter Lead → überzeugende persönliche Demo → hochrelevanter Brief → QR-Scan → Demo-Erlebnis → Vertrauen → Tarifauswahl → Stripe-Checkout → Kauf → Onboarding → Go-Live → laufende Betreuung.**

Optimiere nicht bloß Klicks oder Scan-Raten.

Die wichtigste Kennzahl ist:

**Tatsächlicher Deckungsbeitrag pro zugestelltem Werbebrief und pro gewonnenem Kunden.**

Sekundäre Kennzahlen sind QR-Scan-Rate, Demo-Engagement, Checkout-Conversion und tatsächliche Kaufquote.

Keine Conversion-Garantien oder unbelegten Versprechen.

---

# 1. BESTEHENDES REPOSITORY UND BISHERIGEN FORTSCHRITT VERSTEHEN

Bevor du Änderungen vornimmst, analysiere das tatsächliche Repository gründlich.

Lies insbesondere:

- `CLAUDE.md`
- `README.md`
- Vorhandene `AGENTS.md`-Dateien
- `docs/spec-update-2.md`
- `docs/entscheidungen.md`
- `docs/go-live-checkliste.md`
- `docs/experiments.md`
- `docs/simulation-l5.md`
- `docs/claims-verifikation.md`

Analysiere die letzten Commits und alle relevanten bestehenden Funktionen.

Prüfe insbesondere:

- Lead-Finder und Datenquellen
- Lead-Scoring
- Lead-Datenvalidierung
- Branchen-Playbooks
- Website-Generator
- Website-Templates
- Demo-Qualitätsprüfung
- Briefvarianten
- Claims-Bibliothek
- PDF-Generator
- QR-Code-Generator
- LetterXpress-Integration
- Demo-Link-Verwaltung
- Tracking
- Stripe-Checkout
- Abo-Logik
- Rechnungserstellung
- Resend-Integration
- Admin-Dashboard
- Funnel-Auswertung
- Optimizer und Lern-Agent
- Follow-up-Prozesse
- Automatische Domain- und Hostingverwaltung

Relevante bestehende Dateien umfassen unter anderem:

- `packages/core/src/config/settings.ts`
- `packages/core/src/letters/variants.ts`
- `packages/core/src/letters/slots.ts`
- `packages/core/src/letters/compose.ts`
- `packages/core/src/letters/truth-check.ts`
- `packages/core/src/render/letter.ts`
- `packages/templates/src/letter.ts`
- `packages/core/src/demos/build.ts`
- `packages/core/src/demos/content.ts`
- `packages/core/src/services/funnel.ts`
- `apps/web/src/app/d/[slug]/route.ts`
- `apps/web/src/app/d/[slug]/uebernehmen/route.ts`
- `apps/web/src/app/(site)/preise/page.tsx`
- `apps/web/src/app/admin/funnel/page.tsx`

Suche auch nach weiteren tatsächlich relevanten Dateien und Abhängigkeiten.

Behandle die Liste nicht als vollständige Dateiliste.

## WICHTIGE REGEL

Das Projekt wurde bereits umfangreich von Claude Code und anschließend Codex entwickelt.

**Baue keine bestehenden Funktionen unnötig neu.**

Bewahre die vorhandene Architektur, soweit sie für diese Anforderungen geeignet ist.

Keine unnötigen Refactorings.

Keine destruktiven Migrationen.

Keine Löschung bestehender Produktions- oder Vertragsdaten.

Bestehende Commits und Änderungen anderer Entwickler respektieren.

---

# 2. NEUES VERBINDLICHES PREISMODELL

## ACHTUNG: DIESE PREISVORGABEN ERSETZEN ALLE FRÜHEREN PREISANWEISUNGEN FÜR NEUKUNDEN

Die bisherigen Preise von 590 € einmalig, 49 €/Monat und zwölf Monaten kostenlos eingeschlossenem Hosting sind nicht mehr das gewünschte Standardangebot für neue Käufer.

Implementiere stattdessen genau zwei Haupttarife.

# TARIF A – SEITENWERK BASIS

**597 € einmalig + 19 € pro Monat**

## Einmalige Leistung: 597 €

Enthalten:

- Erstellung und individuelle Anpassung einer professionellen Firmenwebsite
- Nutzung der vorbereiteten Website-Demo als Ausgangspunkt
- Anpassung an die bestätigten Informationen des Unternehmens
- Mobiloptimiertes Responsive Design
- Eigene Standard-Domain im vereinbarten Kostenrahmen
- Technische Einrichtung
- Veröffentlichung der Website
- SSL-Konfiguration
- Bis zu zwei vereinbarte Änderungsrunden vor Go-Live
- Funktionsfähige Kontaktmöglichkeiten innerhalb des tatsächlichen Leistungsumfangs

Die 597 € werden beim Kauf bezahlt.

## Monatliche Basisgebühr: 19 €

Ab dem tatsächlichen, vereinbarten Go-Live:

- Hosting der Website
- SSL-Betrieb
- Grundlegende Erreichbarkeitsüberwachung
- Technische Bereitstellung
- Klar definierte Basis-Supportmöglichkeiten bei Betriebsstörungen

**WICHTIG: Das Hosting ist nicht mehr für zwölf Monate kostenlos enthalten.**

Die 19 € werden regulär monatlich berechnet, sobald die Website tatsächlich live ist.

Der Kunde muss diesem monatlichen Vertrag vor dem Kauf ausdrücklich und transparent zustimmen.

Die Standardvorgabe für neue Verträge soll monatliche Kündbarkeit sein, ohne zwölfmonatige Mindestlaufzeit.

Vertraglich notwendige Details zu Kündigungsfrist, Abrechnungsperiode und Wirksamwerden der Kündigung müssen konsistent und vor dem Livebetrieb rechtlich geprüft werden.

# TARIF B – SEITENWERK CARE+

**597 € einmalig + 99 € pro Monat**

Die einmalige Website-Erstellung kostet genauso viel wie beim Basis-Tarif.

## Care+-Leistungen

Enthalten:

- Alles aus SeitenWerk Basis
- Hosting und SSL
- Technisches Monitoring
- Regelmäßige Funktions- und Sicherheitsprüfungen
- Bis zu 60 Minuten kleinere vereinbarte Inhaltsänderungen im Monat
- Unterstützung bei Text- und Bildaktualisierungen
- Grundlegender monatlicher Technik-Check
- Persönlicher Support
- Klar definierter Leistungsumfang und faire Grenzen

Die technischen Prüfungen müssen der tatsächlichen Architektur entsprechen.

Versprich keine Leistungen, die nicht zuverlässig erbracht werden können.

Für monatliche Änderungen gilt:

- Maximal 60 Minuten inklusive
- Größere Umbauten sind keine kleinen Inhaltsänderungen
- Keine unbegrenzte Design- oder Programmierarbeit
- Nicht genutzte Minuten werden nicht automatisch übertragen, sofern vertraglich nicht anders vereinbart
- Klare Regeln für zusätzliche Arbeiten
- Supportprozesse müssen realistisch erfüllbar sein

## SEHR WICHTIG: KEINE DOPPELTE MONATSGEBÜHR

Wenn ein Kunde Care+ auswählt:

**597 € einmalig + 99 €/Monat insgesamt.**

NICHT:

597 € + 19 € + 99 €.

Die 99 € beinhalten das Basis-Hosting vollständig.

## CARE+ MUSS DIREKT BEIM WEBSITE-KAUF AUSWÄHLBAR SEIN

Der Kunde darf nicht erst zwölf Monate später zwischen Basis und Care+ wählen können.

Die beiden Tarife stehen bereits auf der persönlichen Demo und während der Bestellung zur Auswahl.

## BEGINN DER MONATSGEBÜHR

Die monatliche Zahlung beginnt regulär ab dem vereinbarten tatsächlichen Go-Live der Website.

Nicht automatisch beim erstmaligen Betrachten der Demo.

Nicht während des unverbindlichen Entwurfs.

Falls der Go-Live verzögert wird, darf das System nicht ohne klare vertragliche Grundlage vorzeitig abrechnen.

Implementiere eine technisch belastbare Lösung für die einmalige Zahlung beim Kauf und den späteren Beginn der wiederkehrenden Zahlung.

Prüfe dazu die aktuelle offizielle Stripe-Dokumentation.

Keine erfundenen Stripe-Funktionen oder unsicheren Workarounds.

Falls für den späteren Abo-Beginn die Zahlungsmethode oder ein Mandat benötigt wird, muss die erforderliche Zustimmung korrekt eingeholt werden.

Wenn eine sichere technische Umsetzung nicht möglich ist, darf keine vorzeitige Live-Abbuchung stattfinden. Dokumentiere die offene Voraussetzung und implementiere einen sicheren Sandbox-Prozess.

## PREISTRANSPARENZ

Die beiden Tarife müssen so dargestellt werden:

**SeitenWerk Basis**
597 € einmalig
+ 19 €/Monat ab Go-Live

**SeitenWerk Care+**
597 € einmalig
+ 99 €/Monat ab Go-Live

Zeige außerdem den rechnerischen Preis über das erste vollständige Betriebsjahr:

- Basis: 825 €
- Care+: 1.785 €

Die Jahresbeträge dienen ausschließlich als transparente Gesamtübersicht bei zwölf vollständig berechneten Monaten.

Steuerangaben müssen entsprechend dem tatsächlich bestätigten Steuerstatus korrekt sein.

Keine widersprüchlichen Brutto-/Nettoangaben.

Keine versteckten Gebühren.

---

# 3. TARIFAUSWAHL AUF MAXIMALE KLARHEIT OPTIMIEREN

Erstelle beziehungsweise optimiere zwei hochwertige Tarifkarten.

Die Gestaltung soll professionell und überzeugend sein, ohne übertriebene Verkaufstricks.

## BASIS-TARIF

Positionierung:

**„Ihre professionelle Website – einfach und zuverlässig online.“**

Dieser Tarif ist für Unternehmen, die eine hochwertige Website brauchen, aber selten Änderungen wünschen.

## CARE+-TARIF

Positionierung:

**„Ihre Website – wir kümmern uns auch danach darum.“**

Dieser Tarif ist für Unternehmen, die regelmäßig Unterstützung, Aktualisierungen und technische Betreuung wünschen.

## UX-ANFORDERUNGEN

- Genau zwei klar unterscheidbare Optionen
- Einmaligen und monatlichen Preis deutlich anzeigen
- Keine irreführend vorausgewählten Zusatzleistungen
- Keine versteckte dritte Gebühr
- Leistungen einfach miteinander vergleichen
- Care+ als sinnvolle Erweiterung erklären
- Keine künstliche Dringlichkeit
- Keine falschen Verknappungen
- Keine manipulativen Countdown-Timer
- Vertrauenswürdige Gestaltung

Der Basis-Tarif soll für preissensible Betriebe leicht verständlich sein.

Der Care+-Tarif soll seinen höheren Preis mit echtem Nutzen rechtfertigen.

## BESTEHENDE VERTRÄGE SCHÜTZEN

Die bisherige 49-€-Monatsoption und alle früheren Angebote müssen für bereits abgeschlossene Verträge korrekt weiterlaufen.

Ändere niemals bestehende Kundenpreise rückwirkend.

Alte Stripe-Abonnements, Rechnungen und Webhooks müssen weiterhin funktionieren.

Implementiere bei Bedarf eine Versionierung von Tarifen.

Für neue Kunden sollen die alten Standardtarife nicht mehr sichtbar sein, außer wenn sie ausdrücklich durch Konfiguration reaktiviert werden.

---

# 4. BRIEFE MASSIV VERBESSERN

Die postalischen Werbebriefe sind unser wichtigster Vertriebskanal.

Sie sollen ein klares, seriöses und überzeugendes Angebot vermitteln.

## ZENTRALE VERKAUFSIDEE

Wir verkaufen nicht einfach Webdesign.

Wir zeigen einem Betrieb, wie seine neue Website aussehen könnte, bevor er sie kaufen muss.

Die Hauptbotschaft lautet sinngemäß:

**„Ich habe einen unverbindlichen Website-Entwurf für Ihren Betrieb vorbereitet. Sie können ihn kostenlos ansehen und erst danach entscheiden.“**

Nutze diesen Vorteil konsequent.

## DER BRIEF MUSS VIER FRAGEN SOFORT BEANTWORTEN

1. Warum erhält mein Betrieb diesen Brief?
2. Was wurde konkret für mich vorbereitet?
3. Wie kann ich mir das Ergebnis anschauen?
4. Was kostet die Übernahme?

## NEUE BRIEFSTRUKTUR

### 1. Professioneller Briefkopf

SeitenWerk-Logo beziehungsweise Wortmarke.

Seriöser, moderner Auftritt.

Keine unseriösen Werbebanner.

### 2. Personalisierter Betreff

Teste beispielsweise:

„Ein Website-Entwurf für [FIRMENNAME]“

gegen:

„So könnte die Website von [FIRMENNAME] aussehen“

und eine branchenspezifische Nutzenvariante.

Nur echte, unverbindliche Entwürfe als solche bezeichnen.

### 3. Persönlicher Einstieg

Der Text soll zeigen, dass sich das Angebot auf diesen konkreten Betrieb bezieht.

Verwende:

- Bestätigten Firmennamen
- Ort
- Branche
- Tatsächlich bekannte Unternehmensinformationen
- Relevanten geschäftlichen Nutzen

Erfinde keine Details.

### 4. Geschäftsrelevanter Nutzen

Kein generischer Text wie:

„Eine Website verbessert Ihre Onlinepräsenz.“

Stattdessen branchenspezifisch erklären, wofür ein Betrieb seine Website einsetzen kann.

### 5. Persönliche Website-Vorschau

Das wichtigste Element.

Klar kommunizieren, dass der Entwurf unverbindlich ist.

### 6. Website-Screenshot

Der Betrieb soll bereits auf Papier sehen, dass eine brauchbare Vorschau existiert.

### 7. QR-Code

Groß und sofort sichtbar.

Haupt-CTA:

**„Ihre Website-Vorschau kostenlos ansehen“**

Ergänzend eine kurze URL.

### 8. Transparente Preise

Wichtig: Beide Tarife korrekt nennen.

Beispiel:

„Gefällt Ihnen der Entwurf, können Sie Ihre Website für 597 € einmalig übernehmen. Für den Betrieb wählen Sie zwischen Basis-Hosting für 19 €/Monat und Care+ mit erweiterter Betreuung für 99 €/Monat. Die Monatsgebühr beginnt ab Go-Live.“

Diese Formulierung darf redaktionell optimiert werden, ohne den finanziellen Inhalt zu verschleiern.

### 9. Vertrauen

- Tatsächlicher Absender
- Erreichbarer Kontakt
- Offizielle Website
- Seriöse Erläuterung des Angebots
- Kein Kaufzwang
- Keine Zahlung durch bloßen QR-Scan

### 10. Rechtliche Informationen

Notwendige Datenschutzinformationen beziehungsweise Hinweise gemäß Art. 14 DSGVO und Werbewiderspruch nach Art. 21 DSGVO berücksichtigen.

Das konkrete finale Briefmuster muss vor echtem Versand geprüft werden.

## SPRACHSTIL

Natürliches Deutsch.

Kurz.

Persönlich.

Professionell.

Keine KI-Floskeln.

Keine erfundenen Erfolgsgeschichten.

Keine unbelegten Umsatzversprechen.

Keine Aussagen wie:

- „Garantiert mehr Kunden“
- „Verdoppeln Sie Ihren Umsatz“
- „Letzte Chance“
- „Sie wurden ausgewählt“
- „Nur heute verfügbar“

sofern sie keine tatsächliche und rechtlich zulässige Grundlage haben.

## KAUFPSYCHOLOGIE

Nutze seriöse Prinzipien:

- Relevanz
- Konkretheit
- Glaubwürdigkeit
- Verständlichkeit
- Geringe Einstiegshürde
- Sichtbares Ergebnis
- Preis- und Leistungstransparenz
- Klare Handlungsaufforderung
- Reduzierung nachvollziehbarer Unsicherheit

Kein Täuschen oder künstliches Unter-Druck-Setzen.

---

# 5. BRANCHENSPEZIFISCHE CONVERSION-VARIANTEN

Optimiere die existierenden Branchen-Briefe.

## HANDWERK

Relevante Nutzen:

- Leistungen präsentieren
- Vertrauen bei Empfehlungen stärken
- Anfrageformular
- Kontaktmöglichkeiten
- Optional Mitarbeitergewinnung, soweit vorgesehen

## BEAUTY UND FRISEUR

Relevante Nutzen:

- Leistungen und Behandlungen zeigen
- Professionelle mobile Website
- Kontakt und Terminanfragen
- Ästhetische Darstellung

## GASTRONOMIE

Relevante Nutzen:

- Speisekartenbereich
- Öffnungszeiten
- Anfahrt
- Kontakt
- Reservierungsanfrage, sofern technisch verfügbar

## EINZELHANDEL

Relevante Nutzen:

- Sortiment
- Standort
- Öffnungszeiten
- Produktanfragen

## DIENSTLEISTUNGEN UND KURSE

Relevante Nutzen:

- Angebot verständlich präsentieren
- Kontaktformular
- Anfragen und Probestunden ermöglichen, sofern unterstützt

## A/B-TESTS

Implementiere drei Hauptansätze:

**Variante A – Kontrolle**

Bisheriger Stil, aber mit korrekten neuen Preisen.

**Variante B – Vorschau zuerst**

Kurzer Text, persönliche Website-Vorschau und auffälliger QR-Code.

**Variante C – Nutzen zuerst**

Branchenspezifisches Problem, passender Nutzen und persönliche Vorschau.

In allen Varianten müssen dieselben korrekten Preisbedingungen gelten.

Keine Preisunterschiede zwischen Briefvarianten ohne ausdrücklich geplantes und genehmigtes Preisexperiment.

Keine erfundenen Studien.

Bereits vorhandene Claims nur einsetzen, wenn diese aktuell, überprüft und freigegeben sind.

Wenn ein Claim nicht verwendbar ist, automatisch eine sachliche Variante ohne Statistik wählen.

---

# 6. PROFESSIONELLES PREMIUM-BRIEFDESIGN

Überarbeite das bestehende A4-PDF-Layout.

## DESIGN

- Weißer Hintergrund
- SeitenWerk-Blau als Akzent
- Moderne hochwertige Typografie
- Klarer Briefkopf
- Gut lesbarer Text
- Hohe Informationshierarchie
- Professionelle Abstände
- Kein Spam-Flyer-Design
- Keine künstlichen Werbesiegel
- Keine überladenen Grafiken

## VISUELLE PRIORITÄT

1. Firmenname
2. Persönlicher Website-Entwurf
3. Screenshot
4. QR-Code
5. Verständlicher Nutzen
6. Transparenter Preis
7. Kontakt und Rechtshinweise

## SCREENSHOT

Zeige eine echte, aus dem System generierte Vorschau.

Wenn möglich:

- Desktop-Ansicht
- Smartphone-Ansicht
- Erkennbarer Firmenname
- Branchentypisches Design

Kein vorgetäuschtes Kundenprojekt.

## QR-CODE

- Mindestens ungefähr 4 × 4 cm
- Hoher Kontrast
- Gute Ruhezone
- Druckfähig
- Korrekte Zieladresse
- Kurzlink unter dem QR-Code
- Automatischer Scan- beziehungsweise Decode-Test

## PDF-QUALITÄT

DIN-5008-Kompatibilität und Fensterumschlag-Anforderungen erhalten.

Teste:

- Anschriftenfeld
- Textüberlauf
- Zeilenumbrüche
- Seitenränder
- Bildqualität
- QR-Code
- Fußnoten
- Preisangaben
- Mobile Vorschau
- Leere optionale Felder
- Längere Firmennamen

Generiere realistische Beispiel-PDFs mit ausschließlich fiktiven Unternehmensdaten.

---

# 7. LEAD-AUSWAHL: QUALITÄT VOR MENGE

Ich möchte möglichst viele Verkäufe aus möglichst wenigen Briefen.

Deshalb soll SeitenWerk nicht einfach alle gefundenen Betriebe anschreiben.

Untersuche und optimiere das bestehende Lead-Scoring.

## RELEVANTE KRITERIEN

Berücksichtige nur rechtmäßig nutzbare und nachprüfbare Informationen:

- Keine eigene Website vorhanden
- Tatsächlich aktiver Betrieb
- Vollständige postalische Geschäftsadresse
- Relevante Branche
- Kein offensichtlicher Franchisebetrieb
- Erkennbar passende Website-Funktionalität
- Plausibel wirtschaftlicher Nutzen einer Website
- Vorhandene Social-Media-Präsenz ohne eigene Website
- Geeignete, überprüfbare Unternehmensdaten

Keine erfundenen Umsätze.

Keine erfundene Zahlungsbereitschaft.

Keine unbelegten Aussagen über die finanzielle Situation des Betriebs.

Keine unzulässige Datenbeschaffung.

## PRIORISIERUNG

Baue auf dem vorhandenen Scoring auf.

Füge nachvollziehbare Gründe hinzu, warum ein Betrieb höher oder niedriger priorisiert wird.

Zeige im Admin-Dashboard:

- Lead-Score
- Gründe für die Bewertung
- Verifizierte Angaben
- Unsichere Angaben
- Website-Status
- Demo-Status
- Briefstatus
- Geschätzte Akquisekosten
- Freigabestatus

## HUMAN REVIEW

Die ersten 30 Demos weiterhin manuell prüfen.

Vor dem ersten echten Versand muss eine Freigabe erfolgen.

Kein automatisierter kostenpflichtiger Versand in diesem Entwicklungsauftrag.

---

# 8. WEBSITE-DEMO IN EINEN VERKAUFSSTARKEN FUNNEL VERWANDELN

Die persönliche Demo ist das wichtigste Verkaufselement nach dem QR-Scan.

Der Empfänger darf nicht erst lange suchen müssen, um das Angebot zu verstehen.

## ABOVE THE FOLD

Die Demo soll sofort:

- Den Firmennamen zeigen
- Professionell wirken
- Auf Smartphones hervorragend aussehen
- Klar als persönlicher Entwurf erkennbar sein
- Ohne unnötiges Laden funktionieren

## HOCHWERTIGE INHALTE

Vermeide generische Inhalte und wiederholte Textmuster.

Keine erfundenen Unternehmensangaben.

Keine erfundenen Mitarbeiter.

Keine erfundenen Referenzen.

Keine erfundenen Öffnungszeiten.

Keine erfundenen Leistungen als bestätigte Tatsachen.

Fehlende Daten mit sauber gekennzeichneten Entwurfsinhalten behandeln.

## ÜBERNAHMEBEREICH

Erstelle einen hochwertigen Abschnitt:

**„Gefällt Ihnen Ihre neue Website?“**

Untertitel:

„Übernehmen Sie diesen Entwurf und lassen Sie ihn für Ihren Betrieb fertigstellen und veröffentlichen.“

Darunter zwei klar erkennbare Tarifkarten.

### BASIS

597 € einmalig + 19 €/Monat

### CARE+

597 € einmalig + 99 €/Monat

Die 99 € enthalten das Hosting.

Monatliche Berechnung jeweils ab Go-Live.

CTA-Texte:

- „Mit Basis übernehmen“
- „Mit Care+ übernehmen“

Zusätzlich:

„Ich habe noch eine Frage“

Der Haupt-CTA darf nicht in einer unübersichtlichen Seite untergehen.

## VERTRAUENSBEREICH

Zeige:

- SeitenWerk als Anbieter
- Tatsächliche Kontaktdaten
- Geschäftliche E-Mail
- Freiwillige WhatsApp-Kontaktaufnahme
- Impressum
- Datenschutz
- Erklärung des Ablaufs
- Änderungsmöglichkeiten
- Transparente Informationen zum Kauf

Keine Fake-Bewertungen.

Keine erfundenen Kundenlogos.

Keine erfundene Unternehmensgeschichte.

## FAQ

Beantworte verständlich:

1. Was passiert nach dem Kauf?
2. Wann geht die Website online?
3. Was ist im Einmalpreis enthalten?
4. Warum gibt es eine monatliche Gebühr?
5. Was ist der Unterschied zwischen Basis und Care+?
6. Kann ich den monatlichen Tarif wechseln?
7. Kann ich meine Website kündigen oder zu einem anderen Anbieter wechseln?
8. Was passiert mit meiner Domain?
9. Kann ich Bilder und Texte ändern?
10. Welche Änderungen sind inklusive?
11. Was passiert, wenn ich nicht zufrieden bin?

Alle Antworten müssen mit dem tatsächlich angebotenen Vertrag und der technischen Funktionalität übereinstimmen.

## MOBILE UX

- Mobile-first
- Schnelle Ladezeiten
- Gut sichtbare CTA-Buttons
- Gut lesbare Tarifkarten
- Keine überladene Navigation
- Keine störenden Pop-ups
- Keine irreführenden Buttons
- Keine automatisch vorausgewählten teuren Zusatzpakete

---

# 9. STRIPE-CHECKOUT VOLLSTÄNDIG ANPASSEN

Die vorhandene Stripe-Integration muss die neuen Tarife sicher und korrekt unterstützen.

## BEIM KAUF

Der Kunde wählt genau einen Tarif:

- Basis
- Care+

Die einmalige Einrichtungszahlung beträgt 597 €.

Die monatlichen Gebühren sollen erst mit dem vereinbarten Go-Live beginnen.

Prüfe, wie Stripe Checkout, SetupIntents, Subscription Schedules beziehungsweise geeignete aktuelle Stripe-Funktionen dafür korrekt verwendet werden können.

Wähle die technisch sichere, offiziell dokumentierte Lösung.

Keine improvisierten Zahlungsabläufe.

## REGELN

- Keine doppelte Abrechnung
- Keine vorzeitige Monatsabbuchung
- Keine Aboaktivierung ohne wirksame Zustimmung
- Kein automatisch ausgewähltes Care+
- Keine versteckten Kosten
- Transparente Kündigungsinformationen
- Korrekte Zahlungsbestätigung
- Korrekte Rechnungen
- Sichere Webhooks
- Idempotente Verarbeitung
- Schutz vor doppelten Bestellungen
- Saubere Fehlerbehandlung
- Korrekte Behandlung von Rückerstattungen

## TARIFWECHSEL

Bereite die technischen Grundlagen vor für:

- Basis → Care+
- Care+ → Basis

Vermeide doppelte Abos.

Für Tarifwechsel sind der effektive Wechselzeitpunkt, eventuelle anteilige Berechnungen und Kundenbestätigung klar zu definieren.

Bis zur Freigabe keine unkontrollierten Live-Tarifwechsel.

## BESTANDSKUNDEN

Bisherige Verträge behalten ihre Preise und Bedingungen.

Alte Stripe-Abonnements nicht verändern.

Historische Bestellungen und Rechnungen müssen weiterhin korrekt lesbar sein.

---

# 10. VERKAUFSHEMMNISSE SYSTEMATISCH ENTFERNEN

Analysiere die gesamte Customer Journey auf unnötige Reibung.

Untersuche insbesondere:

## VERTRAUEN

Wirkt SeitenWerk wie ein seriöser realer Anbieter?

Sind Informationen überprüfbar?

Gibt es sichtbare Kontaktmöglichkeiten?

Wirkt die Demo glaubwürdig?

## KLARHEIT

Versteht der Empfänger den Preis?

Versteht er den monatlichen Vertrag?

Versteht er den Leistungsumfang?

Versteht er den Ablauf nach dem Kauf?

## RISIKO

Welche nachvollziehbaren Fragen könnte ein Betrieb vor der Zahlung haben?

Beantworte sie offen und sachlich.

Vorhandene Zufriedenheitsgarantien nur anbieten, wenn sie tatsächlich umgesetzt werden können und die Bedingungen klar sind.

Keine erfundenen Garantien.

## KAUFHÜRDEN

Vermeide unnötige Formulare, Registrierungen und doppelte Dateneingaben.

Erhalte rechtlich und technisch notwendige Bestätigungen.

## DEMO-ABLAUF

Wenn eine Demo abläuft:

- Keine ungültigen QR-Codes zu früh erzeugen
- Tatsächliche Ablaufdaten richtig darstellen
- Keine falsche künstliche Knappheit
- Bei abgelaufenen Demos eine seriöse Möglichkeit zur freiwilligen erneuten Anfrage anbieten
- Datenschutzfristen respektieren

---

# 11. FOLLOW-UP-SYSTEM VERBESSERN

Das bestehende Projekt hat bereits Follow-up-Briefe.

Überprüfe, welche Follow-ups tatsächlich sinnvoll sind.

Ein zweiter Brief kostet erneut Geld.

Deshalb soll nicht jeder Lead automatisch wiederholt angeschrieben werden.

Prüfe eine wirtschaftlich nachvollziehbare Priorisierung anhand rechtmäßig verfügbarer Signale.

## MÖGLICHE FOLLOW-UPS

- Kurze sachliche Erinnerung an einen weiterhin verfügbaren unverbindlichen Entwurf
- Tatsächlich verbesserte persönliche Demo
- Antwort auf eine freiwillig gestellte Kundenfrage

## VERBOTENE VERHALTENSWEISEN

- Falsche Knappheit
- Erfundene Überarbeitungen
- Irreführende Fristen
- Weitere Werbung nach erklärtem Widerspruch
- Unaufgeforderte Werbe-E-Mails
- Unaufgeforderte WhatsApp-Nachrichten
- Automatisierte Kalt-SMS
- Sonstige rechtswidrige elektronische Direktwerbung

Der bestehende Opt-out-Prozess muss immer Vorrang haben.

Keine Follow-up-Aktivierung ohne rechtliche und betriebliche Freigabe.

---

# 12. FUNNEL-TRACKING UND CONVERSION-DASHBOARD

Baue auf dem vorhandenen Dashboard auf.

Ich möchte exakt sehen können, wo Käufer verloren gehen.

## STUFEN

1. Lead identifiziert
2. Lead qualifiziert
3. Demo erstellt
4. Demo freigegeben
5. Brief erstellt
6. Brief freigegeben
7. Brief versendet
8. Brief zugestellt
9. QR-Code gescannt
10. Demo geöffnet
11. Tarifbereich angesehen, soweit zulässig messbar
12. Basis oder Care+ ausgewählt
13. Checkout gestartet
14. Kauf abgeschlossen
15. Website live
16. Monatliche Zahlung erfolgreich
17. Tarifwechsel / Kündigung / Erstattung

## KENNZAHLEN

Zeige:

- Zustellrate
- QR-Scan-Rate
- Demo-Aufrufrate
- CTA-Klickrate
- Checkout-Startquote
- Kaufquote pro Brief
- Kaufquote pro Demo
- Kosten pro Brief
- Kosten pro Käufer
- Durchschnittlicher Einmalumsatz
- Tatsächlich vereinnahmte Monatsumsätze
- Aktiver MRR
- Care+-Anteil
- Erstattungsquote
- Deckungsbeitrag pro Käufer
- Deckungsbeitrag pro Brief

## UMSATZ KORREKT AUSWERTEN

Unterscheide strikt:

**A. Sofort tatsächlich bezahlter Umsatz**

Beispielsweise die einmaligen 597 €.

**B. Monatlich tatsächlich vereinnahmter Umsatz**

Beispielsweise 19 € beziehungsweise 99 € nach Go-Live.

**C. Vertraglich vereinbarte zukünftige Zahlungen**

Nicht als bereits vereinnahmtes Geld ausgeben.

**D. Erwarteter Kundenwert**

Als Schätzung deutlich kennzeichnen.

**E. Gewinn beziehungsweise Deckungsbeitrag**

Kosten wie Briefversand, Hosting, Domain, Zahlungsgebühren und erfüllte Care+-Arbeitszeit berücksichtigen.

## DATENSCHUTZ

Prüfe die vorhandene Demo-Messung auf rechtliche Zulässigkeit, insbesondere § 25 TDDDG und DSGVO.

Nicht notwendige Tracking-Skripte bis zur Freigabe standardmäßig deaktivieren.

Keine versteckten Fingerprints.

Keine unnötige personenbezogene Überwachung.

---

# 13. A/B-TESTING BEI KLEINEN BRIEFMENGEN

Wir starten mit kleinen Mengen.

Ein einzelner Kauf ist kein statistisch sicherer Beweis, dass ein Brieftext besser ist.

Deshalb soll das bestehende Optimizer-System konservativ arbeiten.

## TESTSTRATEGIE

Vergleiche:

- Kurzen personalisierten Brief
- Nutzenorientierten Branchenbrief
- Bisherige Kontrollvariante

Halte die Preise innerhalb eines Copy-Tests gleich.

Miss zunächst:

- Zustellung
- QR-Scans
- Fragen
- Kauf-CTA-Klicks
- Käufe

## STATISTIK

- Keine voreiligen Gewinner
- Unsicherheit sichtbar machen
- Geeignete Bayes- beziehungsweise Konfidenzmethoden verwenden
- Bestehendes Partial Pooling berücksichtigen
- Keine irreführenden Prozentangaben bei wenigen Ereignissen
- Kaufquote und Deckungsbeitrag priorisieren, sobald ausreichend Daten vorhanden sind

## ERSTE TESTCHARGE

Bereite eine kleine Startcharge mit etwa 40 Briefen vor.

Keine tatsächliche Versendung.

Die ersten Ergebnisse dienen primär dazu, das System und die Reaktionen zu überprüfen.

Erstelle ein nachvollziehbares Testprotokoll, wie die nächsten Maßnahmen von tatsächlichen Ergebnissen abhängen.

---

# 14. ADMIN-DASHBOARD VERBESSERN

Das Admin-Dashboard soll die Verwaltung des gesamten Vertriebssystems einfach machen.

Baue keine zweite Admin-Anwendung, wenn die vorhandene geeignet ist.

Erweitere vorhandene Ansichten sinnvoll.

## WÜNSCHENSWERTE BEREICHE

### Leads

Priorisierte Leads mit Begründung.

### Demos

Generierte Websites und Qualitätsprüfung.

### Briefe

PDF-Vorschau, Varianten, Freigaben und Kosten.

### Funnel

Scans, Kaufklicks, Checkouts und Verkäufe.

### Tarife

Basis, Care+, Preise und Leistungen.

### Abos

Aktive Kunden, laufende Einnahmen und Tarifwechsel.

### Optimizer

Tests und Ergebnisse.

### Sicherheit

DRY_RUN, Not-Aus, Budgetlimits und Live-Freigaben.

Wichtige Änderungen müssen nachvollziehbar protokolliert werden, ohne sensible Daten offenzulegen.

---

# 15. VERTRAUEN, RECHT UND TRANSPARENZ

SeitenWerk soll ein seriöser deutscher B2B-Dienstleister sein.

## WICHTIGE REGELN

- Keine erfundenen Testimonials
- Keine gefälschten Bewertungen
- Keine erfundenen Referenzkunden
- Keine irreführenden Preisangaben
- Keine verheimlichten Abonnements
- Keine fiktiven Unternehmensdaten
- Keine vorgetäuschte bestehende Geschäftsbeziehung
- Keine künstliche Zahlungsdringlichkeit

## RECHTLICHE DOKUMENTE

Bestehende Entwürfe für:

- Impressum
- Datenschutzerklärung
- AGB
- Garantiebedingungen
- Vertragsbedingungen
- Domainregelungen
- Kündigung
- Website-Übergabe

müssen mit dem neuen Preismodell konsistent sein.

Erstelle oder aktualisiere sachliche Entwürfe, aber gib sie niemals als anwaltlich geprüfte Rechtstexte aus.

Kennzeichne alle vor dem Livebetrieb notwendigen rechtlichen Freigaben.

## ÖFFENTLICHES REPOSITORY

Das Repository ist öffentlich.

Keine persönlichen Adressen, Telefonnummern, Kundendaten, Bankdaten oder API-Schlüssel hardcodieren.

Verwende private, geeignete Konfiguration beziehungsweise Secret-Verwaltung.

Tests ausschließlich mit fiktiven Daten.

---

# 16. SICHERHEIT – NICHT VERHANDELBAR

**DRY_RUN=true MUSS AKTIV BLEIBEN.**

In diesem Auftrag sind ausschließlich sichere Entwicklungs- und Testaktionen autorisiert.

Ohne separate ausdrückliche Freigabe:

- Keine echten Briefe versenden
- Keine Live-Zahlungen auslösen
- Keine kostenpflichtigen API-Aktionen starten
- Keine Domains kaufen
- Keine echten Stripe-Abos erstellen
- Keine Produktionsdatenbanken destruktiv verändern
- Keine bestehenden Kundenverträge verändern
- Keine Live-Deployments ausführen
- Keine Kundendaten löschen
- Keine echten Marketingnachrichten versenden
- Keine echten Rückerstattungen auslösen

Erhalte alle vorhandenen Provider-Mocks, Testumgebungen, Kostenkontrollen und Freigabemechanismen.

Aktuelle Produktionskonfiguration nicht versehentlich überschreiben.

Wenn eine externe Integration noch nicht bereit ist, implementiere den entsprechenden sicheren Testpfad und dokumentiere die fehlende Freigabe.

---

# 17. TECHNISCHE QUALITÄT UND TESTS

Nach der Implementierung:

- TypeScript-Typecheck
- ESLint
- Unit-Tests
- Integrationstests
- Produktions-Build
- Relevante Playwright-Tests
- PDF-Rendering
- QR-Code-Decoding
- Checkout-Sandbox-Tests
- Abo-Start-Tests
- Demo-Mobile-Tests
- Legacy-Vertrags-Tests

## ZUSÄTZLICHE TESTFÄLLE

### Preise

- 597 € Einmalzahlung
- 19 € Basis pro Monat
- 99 € Care+ pro Monat
- Kein Aufaddieren von 19 € und 99 €
- Keine versteckten Zusatzkosten
- Korrekter Monatsbeginn ab Go-Live
- Keine standardmäßige zwölfmonatige Mindestbindung für neue Tarife
- Korrekte Preisangaben in Brief, Demo und Checkout

### Stripe

- Einmalzahlung korrekt
- Späterer Abo-Beginn korrekt
- Keine vorzeitige Abbuchung
- Keine doppelte Zahlung
- Idempotente Webhooks
- Fehlgeschlagene Zahlungen korrekt behandeln
- Rückerstattungslogik intakt
- Tarifwechsel ohne Doppelabo

### Bestandskunden

- Alte 590-€-Bestellungen intakt
- Alte 49-€-Abonnements intakt
- Alte 19-€-Fortführungen intakt
- Rechnungen historisch korrekt
- Keine destruktiven Datenmigrationen

### Briefe

- Alle Branchen rendern
- Platzhalter korrekt ersetzt
- Kein PDF-Überlauf
- Preisangaben konsistent
- QR-Code lesbar
- Link zeigt richtige Demo
- Keine erfundenen Statistiken
- Datenschutzinformationen vorhanden

### Sicherheit

- DRY_RUN bleibt aktiv
- Live-Versand gesperrt
- Live-Payment gesperrt
- Not-Aus funktionsfähig
- Opt-out funktioniert

Behebe auftretende Regressionen.

Wenn ein Test nicht ausführbar ist, dokumentiere präzise warum.

---

# 18. DOKUMENTATION UND ERGEBNISSE

Lege folgende Datei an:

`docs/conversion-optimization-v4.md`

Sie soll enthalten:

1. Zusammenfassung der umgesetzten Änderungen
2. Neues Preismodell
3. Leistungsumfang Basis
4. Leistungsumfang Care+
5. Monatsabrechnung ab Go-Live
6. Briefvarianten
7. PDF-Design
8. Änderungen an Demos
9. Änderungen am Stripe-Checkout
10. Abo- und Tarifwechsel-Logik
11. Lead-Scoring
12. Tracking
13. Sicherheitsvorkehrungen
14. Auswirkungen auf bestehende Kunden
15. Testergebnisse
16. Noch offene Fragen
17. Erforderliche rechtliche Prüfungen
18. Go-Live-Checkliste

Aktualisiere außerdem die relevanten Projektanweisungen und Entscheidungsdokumente.

Dokumentiere neue Entscheidungen, ohne alte Vertrags- oder Projekthistorie zu verfälschen.

---

# 19. IMPLEMENTIERUNGSREIHENFOLGE

Setze die Aufgabe in dieser Reihenfolge um:

## PHASE 1 – Codeanalyse

Vollständige Bestandsaufnahme und Abhängigkeiten.

## PHASE 2 – Preisarchitektur

597 € plus 19 €/Monat beziehungsweise 597 € plus 99 €/Monat.

Legacy-Preise absichern.

## PHASE 3 – Briefe

Texte, Varianten, Personalisierung und professionelles PDF.

## PHASE 4 – Demos

Conversion-orientiertes Design, Tarifkarten, Vertrauen und FAQs.

## PHASE 5 – Checkout

Einmalzahlung und sicherer verzögerter Start der Monatsabrechnung.

## PHASE 6 – Lead-Scoring

Relevantere Empfänger und bessere Review-Queue.

## PHASE 7 – Tracking

Conversion-Dashboard und wirtschaftliche Kennzahlen.

## PHASE 8 – Tests

Technische Qualität, Sicherheit, PDFs, Checkout und Regressionen.

## PHASE 9 – Dokumentation

Alle Änderungen und offenen Freigaben nachvollziehbar dokumentieren.

Arbeite nach Möglichkeit mit kleineren logisch zusammenhängenden Commits auf einem geeigneten Entwicklungsbranch.

Keine eigenmächtige Veröffentlichung in Produktion.

---

# 20. WAS ICH AM ENDE VON DIR ERWARTE

Ich möchte eine klare Abschlussmeldung auf Deutsch mit:

**1. Implementierte Funktionen**

Nicht geplante, sondern tatsächlich umgesetzte Funktionen.

**2. Geänderte Dateien**

Überblick über die relevanten Änderungen.

**3. Neue Preise**

Bestätigung:

- Basis: 597 € + 19 €/Monat
- Care+: 597 € + 99 €/Monat
- Keine doppelte Monatsgebühr
- Monatsgebühren ab Go-Live
- Keine zwölfmonatige Standard-Mindestbindung

**4. Neue Briefe**

Welche Varianten existieren und wie ich ihre PDFs ansehen kann.

**5. Neue Website-Demos**

Welche Conversion-Elemente geändert wurden.

**6. Checkout**

Wie Einmalzahlung und Monatsabo technisch abgebildet sind.

**7. Tests**

Welche Tests erfolgreich waren und welche nicht.

**8. Sicherheit**

Bestätigung, dass keine Live-Aktionen ausgelöst wurden.

**9. Offene Freigaben**

Welche Rechts-, Geschäfts- oder Integrationsentscheidungen noch nötig sind.

**10. Nächste Schritte**

Was wir vor den ersten echten 40 Briefen prüfen müssen.

---

# 21. ABSCHLIESSENDE HAUPTANWEISUNG

Das Hauptziel ist nicht die höchste theoretische Conversion-Rate.

Das Ziel ist ein tatsächlich verkaufsfähiges, seriöses, zuverlässiges und möglichst effizientes SeitenWerk-System.

Ein Unternehmer soll den Brief erhalten und verstehen:

**„Hier wurde bereits eine konkrete Website-Vorschau für meinen Betrieb vorbereitet. Ich kann sie kostenlos ansehen. Wenn sie mir gefällt, bekomme ich meine Website für 597 € und wähle die passende laufende Betreuung für 19 € oder 99 € monatlich.“**

Das System soll diesen Ablauf professionell, nachvollziehbar und einfach machen.

**Optimiere jeden unnötigen Reibungspunkt, ohne Transparenz, Datenschutz oder technisches Vertrauen zu opfern.**

**SETZE DIESE ANFORDERUNGEN JETZT VOLLSTÄNDIG IM BESTEHENDEN CODE UM.**

Keine reine Planungsantwort.

Keine unnötigen Rückfragen.

Keine eigenmächtigen Live-Aktionen.

Wenn einzelne externe Schritte blockiert sind, erledige die übrigen Aufgaben trotzdem und dokumentiere die Blocker.

**Beginne jetzt mit der Implementierung.**