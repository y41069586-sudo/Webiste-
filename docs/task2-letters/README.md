# Aufgabe 2 – personalisierte Briefe und QR-Demofunnel

26.10.2026. Ausgangscommit `adb1019`, Branch `codex/conversion-v4`.
Nur der zweite Einzelauftrag. V4/V5, zentrale Preise, bestehende Varianten/Slots/Claims, QR-Routen,
Datenbank und Provider bleiben erhalten. DRY_RUN=true. Keine Anbieteraufträge, echten Kontakte,
Produktionsänderungen, Deployments oder Pushes. Testabsender und sämtliche20 Betriebe sind fiktiv.

## Priorisierte Umsetzungsbefunde

| Priorität | Beobachtete Schwäche im vorhandenen Bestand | Gezielte Korrektur |
| --- | --- | --- |
| P0 | Keine unveränderliche Verbindung von Empfänger, Demo, Desktop-/Mobilbild, Gerätebild, PDF und aktuellem Anbieterangebot. | Hash-Zuordnung im vorhandenen Brief-JSON; erneute Prüfung bei Generierung, Freigabe und Versand. QA bezeugt die tatsächlich gerenderten Quelldateien. |
| P0 | Neu-Erzeugung löschte den alten Brief vor Render-/Wahrheitsprüfung; Sperrlisten-Hashes und Quellenfreigabe wurden nicht auf jeder Stufe erneut geprüft. | Alten Brief bis zum bestandenen Ersatz behalten, neue Datei vorab separat speichern und erst danach in einer DB-Transaktion ersetzen; gemeinsame lokale Eignungsprüfung. |
| P1 | V4-Premiumansicht konnte das Gerätebild durch einen flachen, beschnittenen Desktop-Ausschnitt ersetzen; QR und Bild waren dadurch weniger unmittelbar gekoppelt. | Normale V4-Briefe zeigen das tatsächlich zugehörige Laptop-/Smartphone-Komposit neben41mm-QR und abtippbarer Kurz-URL. Gerätegeometrie unverändert. |
| P1 | Ein langer Absatz vermischte597€ Einrichtung,19/99€ Monatsrate, Domain, Garantie und Bedingungen. Pflichtfuß nur7pt. | Ruhiger Preisbereich: Einrichtung separat, Basis oder Care+ als Alternative; Bedingungen/Steuerstatus darunter. Pflichtfuß8pt und blockierende Überlaufkontrolle. |
| P1 | Bestehender Personalisierungshelfer war nur Review-Werkzeug; normale Copy blieb schematisch, alte Folgebriefe verwendeten Fertig-/Dringlichkeitsformulierungen. | Geprüfte, mit Quellen referenzierte Details aus dem bestehenden manuellen Demo-Review an Composer anschließen; kurze A/B-Einstiege und sachliche V4-Folgebriefkandidaten. |

Die Original-PDFs wurden vor Änderungen an Composer und Brieflayout gesichert. Ein erster Nachherlauf
fand tatsächlich Überlappungen durch den größeren Datenschutzfuß. Einleitungen und Wiederholungen
wurden gekürzt; Pflichtinformationen und Anschriften werden weder abgeschnitten noch verkleinert.

## Fünf unmittelbare Hürden für einen Scan

1. Der Betrieb erkannte sein konkretes Layout nicht schnell genug: flacher Bildausschnitt statt Geräteansicht.
2. Sachlicher Standardbetreff ohne einen Anlass zum Ansehen. Jetzt zwei klare Einstiege, z.B. „So könnte Elektro Nordlicht online aussehen“.
3. Zu lange Erklärung und zu wenig nachvollziehbarer Bezug. Jetzt ein bis zwei belegte Testdetails und konkreter Branchennutzen.
4. Preis und Gegenwert waren im Absatz schwer zu erfassen. Jetzt Einrichtung und Monatstarif getrennt mit enthaltenen Leistungen.
5. Vertrauen litt unter schwer lesbaren Pflichtinformationen und unklarem Anbieterbezug. Vollständiger Absender/Kontakt, freier Entwurf und Inhaltsfreigabe vor Veröffentlichung; Pflichtfuß8pt.

Diese Änderungen sind plausible Verständlichkeitsverbesserungen, keine gemessene Steigerung der Scanquote.

## Varianteninventar und Aktivierung

- Vier bestehende neutrale Altvarianten: A/B als Erstbrief, F1 als Sequenz2, F2 als Sequenz3.
- Sechs bestehende Branchen-Slotvarianten: GASTRO_A, HANDWERK_A/B, BEAUTY_A, HANDEL_A, KURSE_A.
  Claim-Zulässigkeit, Quellenalter, Fußnoten, Statistikgrenzen und Variantenquoten bleiben wirksam.
- Fünf bestehende V4-Branchen mit je A/B/C-Erstbriefkandidat bleiben erhalten. Für diese Prüfung nur
  zwei Einstiegshypothesen verwendet: Entwurf zuerst und Branchennutzen zuerst. C nicht als neue
  Hypothese ausgebaut, keine Gewinnerbehauptung.
- Zwei sachliche V4-Folgebriefe werden über den vorhandenen Seed **pausiert** vorbereitet; keine
  aktive Altvariante und keine gespeicherte Quote wird damit überschrieben oder eingeschaltet.
- Alte gespeicherte Fertig-Versprechen werden unter V4 weiterhin vom Wahrheitsgate blockiert.
  Das Update aktiviert keine Kampagne. Nach Betreiber-/Rechtsprüfung sind geeignete Kandidaten und
  Sequenzen ausdrücklich zu wählen. Kein Testfall aktiviert echte Anbieter oder reale Sendejobs.

## Regeln für faktenbasierte Personalisierung

1. Name/Branche/Ort bleiben aus den vorhandenen Betriebsdaten. Keine Leistungsdetails aus dem
   Firmennamen oder einer typischen Branchenliste als Wahrheit ableiten.
2. Optional ein bis zwei kurze sachliche Details aus dem **manuellen** Faktenreview der Demo:
   `review.letterFacts`, jeweils `text`, `source`, `verified`. Bereits vorhandenes QA-JSON, keine
   neue Datenbank. Automatisch generierte Leistungsbeispiele sind keine Quelle für solche Fakten.
3. Nur verifizierte Details mit Quellenreferenz einsetzen. Unbestätigte Angaben weglassen;
   lange/unpassende oder werbliche Behauptungen zur Prüfung zurückstellen. Quellenreferenz ist
   ein Audit-Anknüpfungspunkt, kein automatischer Nachweis rechtmäßiger Erhebung oder Wahrheit.
4. Ohne solche Details neutraler Branchennutzen im Konjunktiv. Keine erfundene Spezialisierung,
   fehlende Website, schlechte Reichweite, Kundenverluste, Bewertungen oder Erfolgszahlen behaupten.
5. Das ist deterministisch erzeugte Copy, keine behauptete handschriftliche oder menschlich
   individuell verfasste Nachricht. Echte Quellen-/Faktenprüfung bleibt menschliche Verantwortung.
6. Die bestehende Admin-Maske wurde hier nicht um ein Recherche- oder Eingabesystem erweitert.
   Geprüfte Detailangaben können über den vorhandenen Review-Service mitgegeben werden. Fehlen sie,
   bleibt der Brief bewusst allgemeiner; das wird nicht als tiefe Individualisierung ausgegeben.

Sequenz2 verlangt einen tatsächlich zuvor als versendet gespeicherten Brief. Sequenz3 zusätzlich eine
andere, individuell geprüfte Demo. Ohne diese Belege keine behauptete Überarbeitung oder frühere Sendung.
Ein Ablaufdatum wird aus der bestehenden Laufzeitlogik gebildet; die Demo wird mindestens bis zum genannten
Datum verlängert und vor Freigabe/Versand erneut dagegen geprüft. Kein Countdown und keine „letzte Chance“.

## Druck und Angebot

- Bestehendes A4-/Adressfenster-Raster bleibt erhalten. Absender vollständig, keine Rechnungsoptik,
  keine fingierte Unterschrift. Überlange Anschrift blockieren statt Zeichen auszulassen.
- QR41×41mm, vier Module Ruhezone,600px Quelldatei; das entspricht rund372dpi bei41mm. Gerätebild
  aus echten2×-Desktop-/Mobilaufnahmen, unverzerrt über`object-fit:contain`. Die kleine Geräteansicht
  ist eine Vorschau: Navigation und Fließtext darin sind im Druck nicht als Vollwebsite lesbar.
-597€ Einrichtung + Basis19€/Monat **oder** Care+ insgesamt99€/Monat. Care+ enthält Basis; kein
  zusätzliches19€-Abo. Beginn erst nach bestätigtem Go-Live, monatlich kündbar. Zentrale V4-Quelle
  wiederverwendet; historische Verträge und Legacy-Preise unverändert.
- Domainlimit/Leistungen aus Konfiguration und bestehendem V4-Angebot. Keine neue Preislogik.
  Unbestätigter Steuerstatus ist im Entwurf sichtbar; keine erfundene Kleinunternehmer-Bestätigung.
  Garantie bleibt die bestehende konfigurierte Einrichtungsgarantie mit Bedingungen-Link.
- Art.14-/Art.21-Texte bleiben vollständig. Die Quellenbezeichnung unterscheidet jetzt explizit
  OSM, genehmigte Google-Primärquelle und fiktive Testdaten. Dies sind weiterhin rechtlich zu prüfende
  Texte; keine anwaltliche Freigabe. Live-Readiness-/Versandsperren wurden nicht freigeschaltet.

## Konsistenz und sichere Speicherung

Neue PDFs werden unter neuer Brief-ID gespeichert. Erst nach Render-, Layout-, QR- und Wahrheitsprüfung
werden alter Datensatz und neue Zuordnung in einer DB-Transaktion getauscht. Der Lead wird gesperrt gelesen,
aktuelle Daten/Quelle/aktuelles Anbieterangebot und aktuell veröffentlichte Demo erneut verglichen.
Bei Fehler bleibt der bisherige Brief erhalten; eine neue verwaiste Datei wird soweit möglich entfernt.
Dateispeicher und PostgreSQL bilden keine gemeinsame verteilte Transaktion. Eine unterbrochene Bereinigung
kann eine unreferenzierte Datei hinterlassen, aber keinen versandfertigen Datensatz mit halbem PDF.

Neue V4-Briefe benötigen den QA-Nachweis der vier Quelldateien und den gespeicherten PDF-Hash.
Änderungen an Adresse, Route, Screenshot, Demo, Absender oder Angebotskonfiguration blockieren Freigabe
und Versand. Alte V4-Briefe ohne Nachweis müssen neu geprüft/erzeugt werden. Historische Legacy-Datensätze
werden nicht rückwirkend umgeschrieben; vorhandene Demo-/Claim-/Live-Sicherheitsgrenzen bleiben bestehen.

## Prüfnachweise

- [Prüfmatrix aller20 Paare](pruefmatrix.md), [alle20 Druckansichten](evidence/after-alle20.webp),
  [fünf Branchen nebeneinander](evidence/fuenf-branchen.webp).
- [Vollständige Vergleichsgalerie](../../data/exports/task2-letters/galerie/index.html) mit40 Vorher-/Nachher-PDFs,
  Druckansichten, echten Geräte-/Desktop-/Mobilaufnahmen und zugehörigen HTML-Demos.
- [ZIP-Export](../../data/exports/task2-letters/seitenwerk-aufgabe2-briefe.zip): vollständig entpacken, `index.html` öffnen.
-20/20 Erstbrief-Paare: eine A4-Seite, keine Druck-/DOM-Überlappung, Anschrift vollständig im vorhandenen Fenster,
  QR41mm, PDF-Bild dekodierbar, QR im Graustufen-Druckraster dekodierbar; beide lokalen Routen identisch.
-20/20: Name/Bild/HTML durch gespeicherte Byte-Hashes zugeordnet, Datum/Preise/Art.14/21 kontrolliert,
  Smartphoneansicht390px ohne horizontalen Überlauf. Nicht als echter Anbieter-/Smartphone-Kameratest ausgeben.
-114 Core-Tests in14 Dateien bestanden. Danach8 abschließende Sicherheitsfälle, darunter ein zusätzlicher
  positiver Folgebrief3 mit tatsächlich anderer geprüfter Test-Demo: insgesamt115 unterschiedliche Fälle.
  Simulierte Sendestatus existieren dabei ausschließlich in der lokalen Wegwerf-Testdatenbank.
-102 Template-Tests, TypeScript, Lint und regulärer Projektbuild bestanden. Sieben bekannte Warnungen
  zum dynamischen Dateisystem-/Turbopack-Tracing bleiben; kein Deployment-Nachweis.
- Tatsächlich gefundene Fehler: V4-Fuß/Text-Überlappung korrigiert; QR-Raster-Testhilfe korrigiert und ursprüngliche
  Vorher-PDFs ohne Neugenerierung erneut geprüft. Alle20 Original-QRs waren ebenfalls dekodierbar; keine
  erfundene Behauptung, dieses Update habe vorher defekte QR-Codes repariert.
- Geänderte Tests bewahren ihre Schutzwirkung: Budget-/Provider-Fakes verwenden unterschiedliche Unternehmen,
  da echte Dubletten nun blockieren. Legacy-Preis-/Langtexttest wählt ausdrücklich Legacy. Falsche Regenerierung
  muss den alten Brief erhalten, statt ihn durch einen fehlgeschlagenen Datensatz zu ersetzen.

Die interne Sichtprüfung umfasst20 Druckübersichten und ausgewählte komplette, vergrößerte Seiten;
Prüfumfang siehe Matrix. Die20 PDFs selbst sind in `evidence/` versioniert. Ein Papierdruck/Kameratest
und eine unabhängige Unternehmerbewertung wurden nicht durchgeführt.

Reproduktion: erhaltene `fixtures/` und `before/` beibehalten. Nachherlauf mit vorhandenem TSX-Runner:
`scripts/task2-letter-review.mts --after`, `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`, `DRY_RUN=true`.
Danach `node scripts/export-task2-letters.mjs`; dieser Export verweigert fehlgeschlagene Paare.
`--before` nicht mit neuem Code erneut ausführen; `--before --recheck` prüft die erhaltenen Original-PDFs.
Core-Tests ausschließlich gegen ausdrücklich lokale test/e2e-Wegwerf-DB; globales Setup löscht diese DB.

## Tatsächlich geänderte Dateien

- `packages/templates/src/letter.ts`: normale V4-Druckansicht mit tatsächlichem Gerätebild, getrenntem Preisbereich,
  sichtbarem Steuerstatus und8pt-Fuß; bestehende Review-/Legacy-Layouts und Gerätegeometrie erhalten.
- `packages/core/src/letters/{compose,conversion-v4,personalization,notices}.ts`: zentrale Preislabels, kurze A/B-Copy,
  geprüfte Detailangaben, neutrale Fallbacks, ehrliche Quellenbezeichnung; alte Abwesenheits-/Löschversprechen unter V4 gesperrt.
- `letters/{binding,eligibility}.ts`: gemeinsame lokale Quellen-/Sperrlisten-/Dublettenprüfung und Byte-Zuordnung.
- `render/{letter,pdf,demo-qa}.ts`: sichere Ersatz-Erstellung, Zustands-/Snapshotprüfung, Anschrift-/8pt-Kontrolle,
  QA-Nachweis inklusive der damaligen Betriebsdaten. Keine Änderung an `render/screenshots.ts` oder Geräteform.
- `services/{letters,sending,seed,demo-review}.ts`: erneute Prüfung bei Freigabe, Versand und Test-Postbox;
  pausierte V4-Folgebriefe; optionale manuell geprüfte Briefdetails. Keine Anbieteraufrufe durch den Auftrag.
- `db/schema.ts`: nur Typisierung vorhandener JSON-Metadaten, keine SQL-Migration oder neue Tabelle.
- Relevante Brief-/Truth-/Sending-/LetterXpress-Tests und neuer `task2-letter.test.ts`; zwei lokale Review-/Exportscripts.
- AGENTS, Entscheidungen und Handoff/Abschlussdokumente aktualisiert.

## Ehrliche qualitative Bewertung

Gerätebild und QR sind nun eine gemeinsame sichtbare Einheit; die Preise stehen außerhalb des Fließtexts.
Die Briefe verwenden konkrete Testdetails und nennen die Freigabe vor Veröffentlichung als Vertrauensgrund.
Das ist noch keine garantierte „Wow“-Reaktion. Bildfreie Demo-Helden wirken im Gerätebild schwächer;
Navigations-/Fließtexte im kleinen Display bleiben nicht vollständig lesbar. Faktenarme Datensätze bleiben
allgemeiner, bis belegte Details vorliegen.8pt ist lesbarer als7pt, aber kein Großdruck. Besonders lange
Pflichttexte/Absender/Anschriften können weiterhin zur manuellen Layoutprüfung blockieren; keine stille Verkleinerung.


## Vor echtem Versand weiterhin offen

- Tatsächliche Anbieter-, Steuer-, Vertrags-/Garantie- und Datenschutzfreigabe, Art.14/21-Fassung,
  Interessenabwägung, Datenquellenrecht und Auftragsverarbeiter prüfen. Keine Rechtsfreigabe durch KI.
- Echte aktuelle Betriebsdaten und Detailquellen manuell belegen; Standard-Fallback ist keine Recherche.
- Gewünschte, geprüfte V4-Varianten/Sequenzen ausdrücklich aktivieren, Quoten kontrollieren.
- Individuelle Demo-/Brief-Freigabe, insbesondere erste30Demos, samt Bildrechten und Screenshot-Lesbarkeit.
- Physisches Druckmuster/Fensterumschlag und Scans auf echten Smartphones, anschließend getrennt
  genehmigte LetterXpress-Test-/Betreiberbrief-Abnahme. Ein lokaler Graustufen-Rasterscan ersetzt das nicht.
- Öffentliche Domains/TLS/QR-/Kurz-URL-Routen, echte Datei-/Worker-Infrastruktur und Ablaufverfügbarkeit
  über die Anbieter prüfen. Lokale Loopback-Ziele in dieser Galerie sind keine versandfähigen URLs.
- Reale Scan-/Kaufwirkung ist unbekannt. Kein statistischer Gewinner aus20 fiktiven Briefen.

## Nachbesserung: echter Recherche-Aufhänger statt bloßer Leistungsnamen

Nach Betreiberfeedback ergänzt: explizit als öffentlich recherchiert geprüfte Beobachtungen und ein
qualifizierter Website-Suchbefund. `review.letterFacts` nutzt dafür optional `kind: public_observation`
oder `website_search` mit `checkedAt`; Website-Suche zusätzlich dokumentierte Prüfung von Firmenname/Ort,
Verzeichnislinks und Social-Profil-Links. Das fehlende OSM-Tag wird niemals automatisch so umgedeutet.
Prüftermin maximal30Tage alt, kein Zukunftsdatum, Quelle und tatsächliche manuelle Bestätigung erforderlich.
`website_search` mit einem gefundenen/unklaren Ergebnis oder unvollständigen Prüfwegen blockiert die Aussage.

Bei gedecktem Befund lautet der Einstieg „Bei unserer Recherche haben wir keinen eigenen Webauftritt
gefunden.“ Das ist eine Aussage über die dokumentierte Suche, keine Behauptung der sicheren Nichtexistenz.
Ein öffentlicher Betriebsbefund wird mit konkretem Inhalt genannt; der folgende Satz erklärt dessen Bezug
zum Entwurf bzw. den Kontaktweg. Ohne Beleg bleibt die neutrale Fassung erhalten. Keine Umsatz-/Kunden-
oder Leadgarantie; tatsächliche Ergebnisse wurden nicht gemessen.

Die2 zusätzlichen Muster unter `data/exports/task2-letters/research/` sind ausdrücklich fiktive
Rechercheszenarien, keine tatsächlich im Internet recherchierten Unternehmen. Die vorhandenen20 Original-
Prüfpaare werden damit nicht nachträglich als recherchiert umetikettiert. Keine Anbieter-/Kampagnenaktivierung.

[Recherche-Muster1: Website-Suchbefund](evidence/recherche-01.pdf), [Muster2: konkreter öffentlicher Betriebsbefund](evidence/recherche-02.pdf).
35 relevante Tests einschließlich7 neuer Recherchefälle, TypeScript/Lint/Build und beide PDF-/Druck-/QR-Prüfungen bestanden. Sieben bekannte Build-Tracingwarnungen bleiben.
