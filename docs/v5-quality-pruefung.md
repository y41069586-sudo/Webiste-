# V4/V5 – Qualitätsprüfung und Abnahmegrenzen

25.10.2026. Entwicklungsstand auf `codex/conversion-v4`, **nicht veröffentlicht**.
Gesamturteil: **Bereit für interne Tests**, noch nicht für eine kostenpflichtige Briefkampagne.
Alle Personen/Betriebe dieser Prüfungen sind fiktiv; alle lokalen Provider stehen auf Mock.
`DRY_RUN=true`. Keine Änderung am produktiven Supabase-/Netlify-Bestand.

## A. Geretteter V4-Stand und tatsächliche Ergänzungen

Vorher vorhanden: versionierte 597-/19-/99-Euro-Angebote, historische Vertragssnapshots,
separater V4-Abo-Checkout, 20 Websitevorlagen inklusive Plakat, V4-Briefkandidaten,
Leadpriorisierung, Admin, Onboarding, Finance-/Tracking-Grundlagen sowie Sandbox-Katalog/Branding.
Die unterbrochenen Operationsservices waren uncommitted und noch nicht abgenommen.

Fortgeführt und überprüft: Mandat beim Kauf mit ausdrücklicher Zustimmung, Monatsstart erst nach
bestätigtem Go-Live, Wiederfinden vorhandener Abos nach Abbruch, ein Abo bei Wiederholung,
persistierte Tarifwechsel zum Periodenende ohne Proration, Kündigung, Care+-Zeitkontingent und
Prüfprotokolle, tatsächliche Kosten und Kosten-Vollständigkeit je Briefarm. Bestehende Kunden- und
Budgetseiten erweitert, kein neues Dashboard. Ältere manuelle V4-/Legacy-Verträge bleiben erhalten.

Der echte Stripe-Sandbox-Test fand einen Fehler: `default_incomplete` zog den ersten Monat nicht
wie vorgesehen ein. `allow_incomplete` + `off_session` wurde tatsächlich für Basis und Care+ geprüft.
Pending-Erstattungen werden nicht als erfolgreich verbucht; Reconciliation liest Belege nach.
Details und externe Test-IDs: [Stripe-Protokoll](stripe-v5-sandbox-abnahme.md).

Additive Migrationen 0013–0016 nur in lokalen Wegwerf-Datenbanken geprüft. Neue Tabellen haben
Backend-RLS; Rollen-/Queue-Test ohne Superuser, CREATEDB oder BYPASSRLS bestanden. Steuerbestätigung
ist ein zusätzlicher ausdrücklicher Go-Live-Blocker, standardmäßig false.

## B. Zehn tatsächlich erzeugte Demos

`test/v5-demo-quality.test.ts` verwendet **buildDemo → qaDemo**, nicht handgeschriebene Screenshots.
Der LLM-Provider ist Mock. Fall 1 liefert zweimal ungültige strukturierte Antworten und muss in die
vorhandene Textbibliothek zurückfallen. Kein echter Anthropic-Erfolg wird daraus abgeleitet.

Artefakte: `data/exports/v5-quality/matrix.json`, je Fall `*-desktop.png` und `*-mobile.png`.
Desktop 1440 Pixel, Handy 390 Pixel; kurze/lange Firmen- und Ortsnamen, fehlende Telefonnummern,
fehlende Zeiten, Bild-/Nichtbildfälle. Alle 20 Bilder tatsächlich gerendert und anhand von
Kontaktbögen und Einzelansichten betrachtet. Finale Matrix nach CSS-/Foto-Korrektur erneut grün.

| Fall / Vorlage                   | Sichtbefund / verbleibende Einschränkung                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Maler / handwerk-solid         | Fotoarme Gestaltung mit Namenszeichen und Anschrift statt abstraktem Werkstattbild; Fallback sachlich, sichtbare Beispiele für Leistungen. Ohne echte Referenzen weniger individuell als ein Kundenfoto. |
| 2 Elektriker / handwerk-klar     | Langer Name und Ort. Mobile Kontaktpille brach zunächst um; korrigiert. Desktop-Navigation war zu eng; Links bleiben jetzt zusammen, Markenname darf umbrechen.                                          |
| 3 Kosmetik / beauty-elegant      | Ruhige Serifentypografie, gewölbtes Informationspanel, gute Hierarchie. Keine erfundene Studioumgebung oder Betreiberperson. Eigenes Bild würde den atmosphärischen Eindruck stärken.                    |
| 4 Nagelstudio / beauty-modern    | Unterschiedliches, zurückhaltendes Layout. Extrem langer Ort erzeugt viele Headlinezeilen; lesbar, kein Überlauf, vor echter Verwendung redaktionell kürzen.                                             |
| 5 Restaurant / gastronomie-split | Gute Bild-/Texthierarchie; vorhandenes gekennzeichnetes CC0-Beispielfoto. Kein Nachweis tatsächlicher Gerichte, Speisekarte bleibt zu bestätigen.                                                        |
| 6 Café / gastronomie-foto        | Ursprünglich unpassende Pastabilder in der Auswahl; branchenspezifische Treffer werden nun ausschließlich verwendet, wenn vorhanden. Lange Headline braucht weiterhin Einzelfallprüfung.                 |
| 7 Blumen / einzelhandel-magazin  | Großes passendes Blumenbild, klare lokale Geschäftsstruktur, kein erfundener Shop. Sortiment ist ausdrücklich Vorschlag.                                                                                 |
| 8 Mode / einzelhandel-foto       | Fotolayout und gut lesbarer Kontrast; langer Name korrekt umgebrochen. Kleiderfoto ist Beispiel, keine echte Ladenaufnahme.                                                                              |
| 9 Yoga / kurse-split             | Passende Matte und Kursstruktur, Zeiten nicht erfunden. Bildfreisteller wirkt sachlich und weniger persönlich als ein freigegebenes Kundenbild.                                                          |
| 10 Tanzschule / kurse-plakat     | Plakat bewusst erhalten: kräftige Farben, typografische Hierarchie, langes Namens-/Ortsszenario auf Handy geprüft. Stil muss zum konkreten Betrieb passen.                                               |

Geprüfte Kriterien: Ersteindruck, Bildqualität, Glaubwürdigkeit, Typografie, mobile Bedienbarkeit,
Branchenpassung, Textqualität, Hierarchie, Lesbarkeit und individuelle Wirkung. Technisch haben alle
zehn bestanden (HTML, Axe, Konsole, Layout, Bilder). Inhaltlich nur fiktive Fixture-Fakten geprüft;
kein tatsächlicher Betrieb wurde recherchiert oder freigegeben. Lange Headlines sowie fehlende
echte Bilder bleiben redaktionelle Prüfpunkte. **Keine pauschale Bewertung „alle Premium“.**

Drei Vorlagen sichtbar umgestaltet: handwerk-solid, handwerk-klar, beauty-elegant. Die anderen bleiben
mit gemeinsamen Verbesserungen erhalten. Namens-/Orts-/Adressdaten werden stärker in der Gestaltung
verwendet; fehlende Tatsachen weiterhin nicht erfunden. Prompt und Fallbacktexte sind kürzer und
sachlicher. Ungültige LLM-Strukturen führen kontrolliert zum Fallback.

Demo-Funnel: dezente eindeutige Entwurfskennzeichnung; kompakte blaue Übernahmeleiste, auf Handy mit
Abstand zum Seitenende/Safe-Area. WhatsApp/Mail bleiben freiwillig und einer Demo zuordenbar.
Der normale Betriebskontakt des Entwurfs und Fragen an SeitenWerk sind getrennt beschriftet.

Freigabe ist mehrstufig: technisch bestanden ≠ Fakten-/Bildprüfung ≠ visuell betrachtet ≠ manuell
freigegeben ≠ versandbereit. Für die ersten 30 Demos sind fünf konkrete Prüfbestätigungen im
bestehenden Admin erforderlich. Direkter Serviceaufruf/CLI darf das nicht umgehen. Die zehn
Testdemos bleiben **manualApproved=false, sendReady=false**; Bulk-Freigabe entfernt.

## C. Brief-PDFs und Druck

15 V4-Varianten: A/B/C je Handwerk, Beauty, Gastronomie, Einzelhandel und Kurse. Alle erneut mit
branchengerechtem Inhalt und tatsächlichem Desktop-/Handy-Komposit gerendert. Beim ursprünglichen
Prüfskript waren vorher alle Gruppen versehentlich mit Handwerktext befüllt; behoben.

Die echte Sichtprüfung entdeckte noch das alte A-Versprechen „Website ist schon fertig“. V4-A ist
jetzt ein ehrlicher Entwurf. A ist damit **kein unveränderter historischer Kontrollarm** mehr;
Versuchsversionen entsprechend getrennt behandeln. Bestehende DB-Varianten/Quoten werden nicht
überschrieben oder aktiviert. Alte gespeicherte Fertig-Versprechen werden unter V4 vom Wahrheitsgate
gesperrt. Kein fingierter Ruf, keine Wirkungszahlen, keine künstliche Dringlichkeit.

Alle 15 Kandidaten bestehen den tatsächlichen deterministischen Wahrheitscheck. Basis 597+19,
Care+ 597+insgesamt99, Monatsstart ab Go-Live und Kündbarkeit konsistent. Garantie auf die tatsächlich
implementierte Einrichtungsgarantie mit Go-Live-Beginn eingegrenzt; rechtliche Freigabe bleibt offen.
Schriftliche Fragen sind möglich. Kontaktdaten stehen im Absender, QR-Aufruf ist kostenlos.

Nachweise: `data/exports/conversion-v4/pdf-layout-checks.json`: **15/15 einseitig**, keine erkannten
Adress-/Rand-/Überlaufprobleme, **15/15 QR aus tatsächlicher PDF-Rasterung decodiert**, Ziel stimmt.
QR mindestens 40×40 mm; bestehende DOM-Geometrieprüfung zusätzlich bestanden. Drei repräsentative
A/B/C-PDFs rasterisiert und tatsächlich betrachtet; korrigiertes A danach erneut angesehen.

Einseitiges A4 bleibt Standard; keine zusätzliche Seite erzwungen. Optionale zweite Bildseite
bleibt erhalten und als Entwurf beschriftet. Kein LetterXpress-Auftrag erstellt. Automatische Tests
ersetzen weder einen realen Druck-/Fensterumschlagtest noch den Nachweis der tatsächlichen
Briefzustellung. Test-Pflichthinweise sind ausdrücklich fiktiv; reale Art.-14-/21-Texte/Quellen fehlen
für jede konkrete Kampagne bis zur Freigabe.

## D. Öffentliche Website und statische Bereitstellung

Neue ruhige Produktpräsentation mit „Erst sehen. Dann entscheiden.“, großer tatsächlich gerenderter
Vorschau und fünf deutlich als fiktiv gekennzeichneten Musterwebsites vor der kurzen Ablauferklärung.
Blau als SeitenWerk-Aktionsfarbe; keine persönliche Fotopflicht, keine Fakebewertungen.
Alte animierte Treppe bleibt als Komponente erhalten, ist nicht mehr der zentrale Hero.

Fünf statische Muster entstehen über den vorhandenen Template-Renderer, enthalten keine echten
Betriebe und haben deaktivierte Beispielanfragen. Kein neues öffentliches Akquisesystem.
Fehlende dekorative Pfeilglyphe bei der Sichtprüfung durch SVG ersetzt.

V4-Garantie-Unterseite/AGB-Arbeitsfassung an wirklichen Go-Live-/Mandats-/Kündigungsablauf angeglichen;
Preiswerte aus zentraler Konfiguration. Steuer-/Rechtsfreigabe nicht erteilt. Die öffentliche
Supabase-Konfigurations-Whitelist transportiert jetzt ausdrücklich die Angebotsversion, ohne
interne Billing-Felder/Bankdaten/Steuernummern offenzulegen. Diese Edge-Änderung ist ebenfalls
**nur im Code**, nicht produktiv veröffentlicht.

Tatsächlich geprüft: Produktionsbuild, elf Seiten über vorhandenen statischen Export mit lokaler
Edge-Fixture (keine Supabase-Verbindung); Desktop-/Handy-Screenshots, Preise/Beispiele auf Handy:
HTTP200, kein Horizontalüberlauf, keine kaputten Bilder oder Seitenfehler. E2E prüft Navigation,
alle Unterseiten und Formular; exportierter Kontakt verwendet direkte schriftliche Wege.
Artefakte `site-*.png` und `site-checks.json`. `apps/web/out` ist ein lokaler fiktiver Testexport,
**kein fertiger öffentlicher Betreiberexport und kein Deployment**.

`seitenwerk.world` und dynamische Netlify-App sind weiterhin zwei getrennte Bereitstellungen.
Keine DNS-Änderung, kein Push/Deploy; die online sichtbare Firmenwebsite wurde nicht aktualisiert.

## E. Kaufstrecke und Testumfang

- Lokal: Care+-Kauf auf Handy, Zustimmung, Mock-Zahlung, Rechnung/Onboarding, Kundenangaben,
  Vorschau/Freigabe, Mock-Go-Live, automatisches Monatsabo, Tarifwunsch/Zurückziehen/Kündigung.
- Basis/Care+ sowie alte Verträge in Core-/SDK-Vertragstests: genaue Beträge, idempotente Events,
  keine Doppelabos, falsche Beträge abgewiesen, asynchrone Zahlung nicht vorzeitig paid.
- Echt bei Stripe **ausschließlich Sandbox**: 19 und insgesamt99 per Testkarte bezahlt, vollständig
  erstattet und Abos beendet. Alle Endzustände ausdrücklich gelesen. Keine echten Geldbewegungen.
- Extern NICHT belegt: 597-Euro-Hosted-Checkout im Browser bis realer Webhookzustellung, SEPA/SCA,
  Folgemonat/Testclock-Advance und tatsächlicher Schedulewechsel. Der Connector bietet nicht alle
  benötigten Schreiboperationen; fehlende Operationen wurden nicht erfunden oder umgangen.

| Prüfung                                                | Nachweis                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Core-Gesamtlauf ohne separat ausgeführte Browsermatrix | 304/304 bestanden                                                                                       |
| Abschließende Template-Browsermatrix + zehn Demo-Fälle | 128/128 Tests bestanden (Matrix allein 127; Demo-Test enthält zehn Fälle)                               |
| Neue Brief-/V4-Vertragsregression                      | 7/7 bestanden; Legacy-Brief-/Wahrheitsregression 19/19                                                  |
| Template-Paket                                         | 97/97 bestanden                                                                                         |
| Root-Tests                                             | 6/6 Testdateien bestanden                                                                               |
| Alle vier Pakete TypeScript, ESLint                    | bestanden                                                                                               |
| Next.js-Produktionsbuild                               | bestanden                                                                                               |
| Früherer vollständiger dev-E2E                         | 20 bestanden, 1 veraltete Login-Erwartung fehlgeschlagen, 1 Screenshot-Test ohne SHOTS_DIR übersprungen |
| Gezielter E2E-Nachlauf V4/öffentliche Seiten/Login     | 11 bestanden, eine weitere alte Linkauswahl korrigiert; abschließender Login-Nachlauf 4/4 bestanden     |
| PDF/QR                                                 | 15/15 einseitig, korrekte QR-Ziele aus PDF-Rastern                                                      |
| Worker-Container, echte lokale Queue, Storage-Backup   | bestanden, alle Provider Mock                                                                           |
| Datenbank-Restore                                      | neue lokale DB: 49 Tabellen mit identischen Datenhashes; Produktionsbackup unbewiesen                   |

Fehler wurden nicht verschwiegen: Legacy-Webhook ohne items abgesichert, Testformulierungen und
Login-Selektoren korrigiert, verspätete Queue-Stats durch tatsächlichen Dead-Letter-Fetch geprüft.
Ein Zwischenlauf scheiterte an vollem lokalem Docker-Speicher; nach gezielter Bereinigung des eigenen
Buildcaches sauber wiederholt. Keine Testdatenbank/Volumes anderer Projekte gelöscht.

## F. Sicherheit und verbleibende Arbeit

[Priorisierte Go-Live-Checkliste](v5-go-live-checkliste.md) und
[Betriebs-/Provider-Audit](v5-betrieb-und-provider-audit.md) sind verbindlich für die nächsten Schritte.
Insbesondere fehlen: echte Secrets in den passenden Laufzeiten, genehmigter VPS/Worker, freigegebene
Migrationen/pgboss, privater S3-E2E-Test, tatsächlich wiederherstellbares Produktionsbackup,
Resend-Nachrichtenfluss, vollständige externe Stripe-Sandbox-Abnahme, Kundenhosting/Domain/TLS,
freigegebene Leistungs-/Garantie-/Datenschutz-/Steuer-/Bankangaben.

Monats-Erstattungen wurden in dieser Fortsetzung ebenfalls abgeschlossen: paginierte bestätigte
Stripe-Refunds werden über Invoice Payments zugeordnet; die Monatszahlung wird getrennt von der
Einrichtung monoton korrigiert. Unbekannte Rechnungen bleiben retriable und sperren die vollständige
Finanzbestätigung. Ein später erfolgreicher Retry hebt die Sperre auf. Teil-/Folgeerstattungen bekommen
unveränderliche Differenzbelege mit kumulativ korrekter Steuer-Rundung, eigenem PDF und deduplizierter
Zustellung; verlorene Jobs werden nachgeholt. Originalrechnungen bleiben unverändert. Dafür nur
additive Migration 0017 auf bestehenden Tabellen, keine neue Zahlungsarchitektur.

26 gezielte Tests bestanden; danach abschließende 8/8 inklusive ursprünglicher Rechnungsregression
und Legacy-Storno-Retry. Der Core-Gesamtlauf hatte zuvor 304/304 bestanden (der letzte zusätzliche
Legacy-Test ist im gezielten Nachlauf enthalten). Mehrere Rechnungen pro PaymentIntent und
abweichende Teilzahlungsmodelle werden nicht still verteilt: manuelle Zuordnung erforderlich.
Historische Korrekturen ohne Belegliste bleiben unverändert; weitere Korrekturen daran bedürfen
Einzelfallprüfung. Echte Webhookzustellung/Refund-Readback durch die gesamte App und steuerliche
Korrekturbelegfreigabe bleiben externe Abnahme, kein behaupteter Live-Nachweis.

## G. Versandbereitschaft

**Bereit für interne Tests.** Die lokale Kette funktioniert und hat echte Browser-/PDF-/Queue-/
Restore-Nachweise. Sie ist noch keine vollständig echte Providerkette. Produktive Queue fehlt,
Worker ist nicht deployed und externe Abnahmen/Rechts-/Steuerfreigaben sind offen. Deshalb weder
Versandbereitschaft noch eine belegte Conversion-Rate behaupten. Zwei Prozent bleiben Ziel, keine
Prognose; keine Varianten als statistische Gewinner ausgeben.

## Wiederholung der Betriebsprüfung

Nach Migration 0017 erneuter lokaler Restore:49 Tabellen identisch, keine Änderung am Quellsystem-Backupstatus.
Aktualisiertes Worker-Testimage erneut nicht-root/read-only im internen Netz geprüft: DB/Queue ok,
Chromium PNG/PDF, SIGTERM Exit0. Ausschließlich eigene Testcontainer/Netze verwendet und bereinigt.

## Letzter Browser-Abnahmelauf

Die wiederholte dev-Suite zeigte eine HMR-Reload-Schleife; der betroffene Lauf wurde beendet und
nicht als Abnahme gewertet. Die E2E-Konfiguration unterstützt nun `E2E_PRODUCTION=true` gegen einen
vorher erzeugten lokalen Produktionsbuild. Sämtliche Provider bleiben Mock. Testbilder liegen mit
SHOTS_DIR außerhalb des Quellverzeichnisses.

Erster Produktionslauf: 20/22 bestanden, einschließlich 30 tatsächlicher Desktop-/Handy-Bilder aus
elf Firmenunterseiten und vier Kauf-/Onboardingansichten. Zwei Go-Live-Prüfungen wurden von der
bestehenden Produktionssperre für Mock-Hosting blockiert. Ausschließlich die lokale E2E-Konfiguration
erhält daher ALLOW_MOCK_HOSTING=true (zusätzlich zum vorhandenen Mock-Payment-Testschalter).
Die Anwendungssperre bleibt unverändert. Abschließender vollständiger Nachlauf ist im Handoff zu
protokollieren; der vorherige fehlgeschlagene Lauf wird nicht als erfolgreich ausgegeben.

## Abschließender bestätigter Stand

**22/22 Browser-E2E am lokalen Produktionsbuild bestanden**, keine übersprungenen Fälle,
einschließlich aller30 tatsächlich erzeugten Desktop-/Handy-Screenshots. Beide zuvor blockierten
Mock-Go-Live-Fälle bestehen mit der ausschließlich lokalen Testfreigabe.
Log: `/tmp/seitenwerk-v5-e2e-production-final.log` (4,1 Minuten).

304/304 Core-Gesamtlauf plus 8/8 letzte Rechnungs-/Legacy-Korrekturtests;127 Template-Browserchecks
und zehn Generator-Demos;97 Template-Tests;6 Root-Testdateien; Types aller vier Pakete und ESLint
bestanden. Keine Addition überlappender Nachläufe als vermeintlich neue Einzeltests.

Fünf zusammenhängende Implementierungscommits: 312aba8,81098d0,3bea72e,910f612,48b6a99.
GitHub-Hauptarbeitsbranch weiterhinfbff0cc; Änderungen lokal, nicht gepusht oder veröffentlicht.

Zusätzlich echt und ausschließlich lesend bei Stripe bestätigt: Invoice-Payment-Abfrage mit dem
Care+-Test-PaymentIntent ergibt genau die bekannte 9900-Cent-Rechnung, livemode=false. Neuer
Zuordnungsweg damit auch als API-Readback belegt; kein neuer Zahlungsvorgang und keine Live-Abnahme.
