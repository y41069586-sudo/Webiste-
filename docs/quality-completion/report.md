# SeitenWerk – Abschluss der lokalen Qualitätsrunde

27.10.2026 · codex/conversion-v4 · Ausgangspunkt f8bdc43.
Kein Push, Deployment, Produktionsmigration, echter Brief, Zahlung, Erstattung oder Domainkauf.
DRY_RUN=true; externe Adapter bei Ausführung ausdrücklich Mock. Bestehende lokale Arbeiten erhalten.

## Ergebnis und ehrliche Bewertung aller neun Bereiche

Die neun Bereiche wurden untersucht und bearbeitet. **Neunmal9,5/10 ist nicht nachgewiesen.**
Insbesondere ein tatsächlich laufender Betrieb lässt sich nicht durch lokale Codeänderungen ersetzen.
Die folgenden Zahlen sind eine eigene qualitative Einschätzung des geprüften Materials, keine Messwerte,
Betreiberabnahme, Kundenstudie oder Kaufwahrscheinlichkeit.

| Bereich | Lokale Einschätzung | Tatsächliche Verbesserung / Nachweis | Verbleibende Grenze |
|---|---|---|---|
|1 Demo-Websites |8/10 für die Primärbranchen; andere Fallbacks teils schwächer | Passende lizenzierte Reinigungs-/Fliesenmotive, bewusste Haupt-/Detailkomposition, korrekter Malercrop, layoutspezifische H1-Proportionen, Langtextkorrektur.10 Vorher-/Nachher-Fälle,20 Vorlagen,4 Hauptbreiten und Stressfälle. | Nicht jede bildarme Ersatzfassung wirkt individuell genug. Keine pauschale9 für alle20. Individuelle Bild-/Stilbelege fehlen oft. |
|2 Personalisierung |8/10 für Faktenbindung | Geprüfte Leistungstitel bis zur Bildauswahl/Leistungskennzeichnung; fachbezogene Anfragehilfen statt identischer Fülltexte. Fakten auch im Modell-QA-Paket. Keine erfundenen Öffnungszeiten. | Branchenvorschlag ist keine ermittelte Firmenidentität. Echte Bildanalyse und tatsächliche LLM-Textqualität noch nicht abgenommen. |
|3 Gesuchte Branchen |9/10 für die Auswahlregeln | Maler → Gewerbereinigung → Fliesen, passende Kundengruppe/Leistungen und belegter Bedarf. Bestehende Prioritäten geprüft und erhalten; neue Fliesen-/Reinigungsprüffälle ergänzt. | Echte Trefferqualität und wirtschaftliche Eignung müssen je Betrieb überprüft werden. Keine pauschale Nachfrage-/Budgetannahme. |
|4 Lead-Auswahl |8/10 | Fehlender Firmenname verhindert jetzt Eignung. Jimdo/Google-Sites-Websites auch bei alter Social-Domainliste korrekt als eigene Websites behandeln. Aktivität, Anschrift, Bedarf, Eigenständigkeit, Sperren und vollständige Websiteprüfung erhalten. | Vollständige autonome Webrecherche ist weiterhin nicht eingerichtet; kein leerer OSM-Eintrag als Nachweis. |
|5 Briefe |9/10 Layout, insgesamt8/10 ohne echte Modell-/Papierabnahme |24 unterschiedliche redaktionelle Testtexte mit passenden tatsächlichen Demo-Screenshots; echte Laptop-/Handykomposition,41mm-QR, preisfreie Einladung, Pflichttexte jetzt9pt. Behauptete Leistung muss in gespeicherter Demo vorkommen. | Texte sind ausdrücklich Offline-Fixtures, keine echte API-Abnahme. Physischer Druck/Smartphonekameras und Betreiberidentität im realen Versand noch offen. |
|6 Kaufstrecke |9/10 im lokalen Test | Gegenwert vor Tarifwahl scanbarer, Zuständigkeit/Go-Live verständlich. V4, Fehlerfälle, Consent, Doppelbestellschutz, Rechnungen/Onboarding erhalten und erneut geprüft. | Tatsächlicher Hosted-Stripe-Sandbox-Kauf mit Signaturkette und späterem Monatsabo bleibt separat offen. |
|7 Technische Automatisierung |9/10 im geprüften Codeumfang | Bekannte LLM-Retry-/Refusalkosten je tatsächlichem Modell buchen; Browser-Neustart-Race und Kontextleck behoben,45s Standardwartezeit. Queue-/Abrechnungs-/Suppressiongates erhalten. | Mocks sind kein Nachweis tatsächlicher Providerqualität, API-Verfügbarkeit oder absoluter Kostenobergrenzen. |
|8 Tatsächlich laufender Gesamtbetrieb |3/10, unverändert nicht freigegeben | Lokaler aktueller Node22-Worker meldet DB/Queue ok. Rein lesender Preflight prüft ENV, DB-Ziel, Migrationshashes, Queue/Backup. Fehlende Queuewerte bleiben unbekannt. | Kein VPS-/Supabase-/Storage-/Provider-Gesamtbetrieb. Chromium-Image-Neubau hier am Speicherlimit gescheitert; nicht als bestanden markieren. |
|9 Conversion-Erlebnis |8/10 lokal; keine gemessene Conversion | Brief, echte Demo, transparente597+19/99-Kosten, schriftlicher Kontakt, Kauf/Onboarding zusammen geprüft. Kein Fake-Social-Proof und keine behauptete Erfolgsquote. | Öffentliche Bereitstellungen bleiben alt, bis gesondert veröffentlicht. Keine unabhängigen Unternehmer- oder Kampagnendaten. |

## Sichtbare Nachweise

- [Kompakte Galerie](evidence/galerie.html), [Desktopvergleich](evidence/vergleich-1440.jpg),
  [Smartphonevergleich](evidence/vergleich-390.jpg).
- Vollständige Beispiel-PDFs: [Maler](evidence/04-brief.pdf), [Reinigung](evidence/09-brief.pdf),
  [Barber](evidence/11-brief.pdf), [Fliesen](evidence/21-brief.pdf), [Objektpflege](evidence/23-brief.pdf).
- Vier Mobilkontaktbögen aller20 Vorlagen und vier Druckkontaktbögen aller24 Briefe liegen in evidence/.
- Gesamte lokale24-Paare-Galerie: data/exports/quality-2026-10-27/galerie.html.
  Dort vollständige Desktop-/Mobilansichten, HTML,24PDFs,300dpi-Raster, Text-/Faktennachweise und Prüf-JSON.

Alle Absender/Empfänger in diesen Exporten ausdrücklich fiktiv. QR-Ziele sind lokale Testadressen,
**keine öffentlich erreichbaren Versandziele**. Kein Bild wurde als tatsächliches Betriebsprojekt ausgegeben.
Die neuen Fotos wurden selbst angesehen; Quelle, Urheber und korrekte Lizenz im Manifest/EXIF.
[Recherche und Bildrechte](research.md).

## Tatsächliche Sichtprüfung

Alle20 mobilen Heros und alle24 PDF-Druckansichten in Kontaktbögen angesehen; mehrere Briefe zusätzlich
in voller Auflösung, Primärbranchen an identischen Vorher-/Nachher-Profilen geprüft. Technische
Vollseiten-/Stressprüfungen ergänzen diese Sichtung. Das ist keine persönliche Betreiberfreigabe.

Gefunden und korrigiert: riesige H1 mit ungünstigen Wortumbrüchen; falscher Maler-Fokuspunkt;
fehlende Reinigungs-/Fliesenbildwelt; bestätigte Leistungen pauschal als Beispiel behandelt; erfundene
Terminvereinbarung bei unbekannten Öffnungszeiten; schlecht lesbarer Pflichttext. Geräte nicht gestreckt.

Weiter sichtbar: Elektriker/Sanitär/Beauty/Kurse benötigen bei fehlenden freigegebenen Fotos weiter
einen sachlichen Ersatz. Diese Varianten sind technisch sauber, aber nicht automatisch Premium-Arbeiten.
Plakat bleibt bewusst eigenständig. Stockfotos begründen keinen tatsächlich recherchierten Betriebsstil.
Kein schlechter Entwurf wird allein wegen eines bestandenen Tests individuell freigegeben.

## Testnachweise

Alle Rohprotokolle: data/exports/quality-2026-10-27/.

| Prüfung | Ergebnis |
|---|---|
|10 Primärbranchen-Demos bei1440/360/390/430px | VERIFIED: gerendert, keine gemeldeten Überläufe/Bildfehler, keine Browser-QA-Befunde |
|20 Template-IDs, normale/Long-/No-image-Zustände | VERIFIED:120 Geometriezustände,660 Browserchecks ohne Befund |
|Alle Template-/Palettenfälle, volle und minimale Daten | VERIFIED:120 echte Browserfälle nach Korrektur bestanden;7 Branchenfälle bereits im vorherigen Lauf bestanden |
|24 Brief-Demo-Paare | VERIFIED:24 einseitige PDFs,24 QR-Raster dekodiert,24 lokale Zielzuordnungen korrekt,24 preisfreie Texte, Pflichttext mindestens9pt |
|Template-Unit-Suite | VERIFIED:111 Tests bestanden |
|Gezielte finale Core-Regression | VERIFIED:53 Tests für Browserlebensdauer, Preflight, Kosten, Fakten, Leads, Queue/Monitoring bestanden |
|Betroffene Brief-/QR-/Freigabesuiten | VERIFIED:40 Tests nach9pt-Änderung bestanden |
|Anbieter-/Rechtstextentwurf-/V4-/Stripe-Sperr-/DB-TLS-Rootprüfungen | VERIFIED:5 Prüfdateien bestanden; keine rechtliche Freigabe daraus abgeleitet |
|Worker TypeScript-Build / TypeScript / Lint | VERIFIED im jeweiligen Rohprotokoll; finaler Stand im Handoff |
|Next.js Produktionsbuild mit Webpack | VERIFIED: tatsächlicher Build bestanden, bestehende Playwright1.56.1 nun korrekt in Web-Laufzeit deklariert |
|Standard-Turbopack-Build | BLOCKED hier: interner PostCSS-Port EPERM. Nicht als bestanden darstellen |
|Aktueller Worker im Node22-Container | VERIFIED lokal: Health200, DB/Queue true, Mocks, keine automatischen Migrationen |
|Vollständiger Chromium-Image-Neubau/-Smoke | Nicht bestanden: lokales vfs-Speicherlimit; eigener Build/Container entfernt |
|Browser-Kaufstrecke | VERIFIED:14/14 im sauberen finalen Produktionsbuild-Lauf bestanden;10 Branchenstrecken mit Rechnung/Onboarding, Tarifwahl, Abbruch, pending und failure |

Mobile Labormessung des finalen lokalen Produktionsbuilds:390px,150ms RTT,200kB/s Download,
vierfache CPU-Drossel, frischer Browsercache. Demo LCP1612ms/CLS0, Startseite2244ms/0,
Preisseite1888ms/0, Mock-Checkout1800ms/0,000067. Keine Laufzeit-/Bildfehler oder Überläufe.
Jeweils ein synthetischer Lauf mit lokalem Server, keine Feld-CWV, keine Lighthouse-Punktzahl und
keine Messung der externen Stripe-Seite. Rohdaten: checkout-final/mobile-performance.json.

Erster Browserlauf13/14: Café-Seed hing nach der gleichzeitigen Rendererbelastung. Nur eigenen
blockierten Prozess beendet; synchrone Test-Helper begrenzt. Renderer-Kontextcleanup und Race beim
Neustart korrigiert,45s Standardwartezeit ergänzt. Danach vollständigen14er-Lauf sauber wiederholt.

Erster Volltest:568 Tests ausgeführt;489 bestanden,21 H1-Befunde,1 veraltete Testannahme,
57 speicherbedingte Ausfälle. Nach freiem Speicher bestanden die betroffenen fachlichen Suiten;
nach korrigierter H1-Grenze bestanden alle120 Template-/Palettenfälle. Alte fehlgeschlagene Protokolle
bleiben erhalten. **Keinen durchgehend grünen einzelnen568-Testlauf behaupten.**
Zwei zusätzliche Browser-Lebensdauertests sind im finalen53er-Lauf enthalten.

## Externen Zustand erneut gelesen

Supabase am27.10.2026 ausschließlich per SELECT erneut geprüft:11 App-Migrationen, kein pgboss-Schema,
0Leads/0Demos/0Briefe/0Bestellungen, kein gespeicherter Backup-Abnahmenachweis. Lokal sind19 Migrationen
einschließlich Hash-/Reihenfolgeabgleich geprüft; daraus keine Produktionsmigration ableiten.
Es gibt weiterhin keine tatsächlich gemessene Kaufquote.

## Kleine verbleibende Betreiberliste und sichere Reihenfolge

1. **Entscheidung/Freigabe:** gezeigte Gestaltung beurteilen, tatsächlichen Steuer-/Vertragsstatus und
   konkrete Texte verbindlich freigeben. Keine unbekannte §19-Regelung behaupten. Rechtstexte bleiben
   Entwürfe. Keine öffentliche Pflicht, eine erfundene Rechtsform oder Registereintragung zu behaupten.
2. **VPS/Betriebsfreigabe:** konkreten Tarif innerhalb des bereits genannten Limits von15€/Monat
   benennen und die Inbetriebnahme separat freigeben. Kein Server wurde bestellt. Größere Buildumgebung
   für vollständiges Chromium-Image bereitstellen.
3. **Supabase zuerst sichern:** Backup und isolierten Restore abnehmen, dann fehlende acht Migrationen
   und pg-boss-Rollen/Schema kontrolliert freigeben. Gleiche Datenbank für App und Worker, Session5432/Direct.
4. **Anbieterzugänge sicher übernehmen:** vorhandene Stripe-/Resend-/S3-Secrets aus sicherer Verwaltung
   in die genehmigte Laufzeit übernehmen, fehlenden Anthropic-/LetterXpress-Zugang sicher bereitstellen.
   Keine Schlüssel im Chat. Vorhandene Konten nicht neu anlegen. Mock-Schalter nicht pauschal umlegen.
5. **Öffentliche Teststrecke getrennt freigeben:** aktuelle App/Marketingversion, V4-Konfiguration,
   DEMO_DOMAIN/TRACK_DOMAIN/TLS und richtige Webhookroute verbinden. Keine DNS-/Deploymentfreigabe durch
   diesen Qualitätsauftrag. Alte veröffentlichte590/49-Preise sind durch lokale Änderungen allein nicht entfernt.
6. **Stripe-Sandbox abnehmen:** für Basis und Care+597Einrichtung, bestätigte Mandats-/Tarifzustimmung,
   signierte Webhooks, async pending/failure/replay, Rechnung/Onboarding und erst nach bestätigtem
   Test-Go-Live19 bzw. insgesamt99monatlich. Keine Livezahlung. S3 und eigene Supportnachrichten separat prüfen.
7. **Reale Text-/Bild-/Druckabnahme:** budgetierten Anthropic-Test freigeben, zugelassene Quellen/
   Bildrechte prüfen und ersten echten Modelloutput kritisch ansehen. LetterXpress zunächst Testzugang,
   eventuellen kostenpflichtigen Testauftrag separat freigeben. Papier1:1 und echte Kameras prüfen.
8. **Gesamte Anbieter-E2E:** Lead → Fakten/Stil → Demo → Screenshot → PDF/QR → Sandboxzahlung →
   Onboarding → Testfreigabe/Hostingausgabe, einschließlich Tracking und Fehlerfällen abnehmen.
   Erst danach Veröffentlichung, echte Zahlungen und tatsächlichen Versand jeweils ausdrücklich freigeben.

Codex kann danach die konkreten Konfigurations-/Testschritte ausführen. Aktuell fehlen dafür Zugänge,
Infrastruktur oder ausdrückliche externe Freigaben. Mehr lokale Tests ersetzen diese Nachweise nicht.
Interne Tests: ja. Produktionsbereit: nein. Erste echte Zahlungen: nein. Erste echte Briefe: nein.
