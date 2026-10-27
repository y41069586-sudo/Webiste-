# Qualitätsabschluss – alle neun Bereiche

Ausgangspunkt f8bdc43, 27.10.2026, codex/conversion-v4. Vier offene lokale Rechts-/Darstellungsänderungen
aus dem letzten Betreiberauftrag bleiben erhalten. Kein Push, Deploy, bezahlter Anbieterauftrag,
echter Versand, Kauf oder Produktionsmigration. DRY_RUN=true. Keine Unteragenten.

1. Demo-Websites: bestehende Vorlagen/Bilddarstellung prüfen und verbessern; echte Rendernachweise.
2. Personalisierung: bestätigte Tätigkeit/Schwerpunkte und tatsächliche Stilbelege im ersten Bildschirm.
3. Branchen: Maler, gewerbliche Reinigung und Fliesen mit nachvollziehbaren Anwendungsfällen.
4. Lead-Auswahl: passende Faktenbeschaffung im bestehenden Reviewpfad; unsichere Daten bleiben offen.
5. Briefe: individuelle begründete Einladung, unveränderte echte Gerätebilder/QR, neue Drucknachweise.
6. Kaufstrecke: Leistungsumfang/Monatskosten/Start/Anbieter klar, Fehler- und Idempotenztests.
7. Technische Automatik: reale Lücken in Kosten-/Fehlerbehandlung prüfen und beheben.
8. Betrieb: konkrete sichere Vorabnahme für Queue, Migrationen, Worker und Anbieter; ohne Zugänge
   keine behauptete laufende Infrastruktur oder pauschale Bewertung9/10.
9. Conversion-Erlebnis: gemeinsame nachvollziehbare Einzelfallprüfung, keine erfundenen Kundeneffekte.

Recherche: NN/g Trustworthiness in Web Design, Baymard Checkout Flow UX, Chrome LCP Discovery.
Anwendung: erkennbare Relevanz, frühe Offenlegung, deutliche Zuständigkeit, keine zusätzlichen Formhürden,
priorisiertes erstes Bild. Allgemeine E-Commerce-Studien sind keine Conversiondaten für SeitenWerk.
Links und Prüfbelege werden nach den Arbeitspaketen ergänzt.

Fortschritt: Bestand und Quellen geprüft. Geeignete drei nichtgenerierte Burst-Beispielmotive geladen
und visuell untersucht. Originalseiten und tatsächliche Burst-Lizenz geprüft, ausdrücklich nicht CC0.
Abgeschlossene spätere Arbeitspakete/Nachweise folgen; diese Datei ist keine Abnahme.

## Implementiert nach Bestandsaufnahme

1. **Demos:** vier lizenzierte nichtgenerierte Motive für Reinigung/Fliesen ergänzt; falschen
   Maler-Fokuspunkt korrigiert. Globale H1-Regel überschrieb Layoutproportionen: layoutspezifische
   Größe, vollständige lange Titel kleiner, nachvollziehbares Browsergate gegen bildschirmfüllende H1.
2. **Personalisierung:** geprüfte Leistungstitel aus bestehendem Research bis zum Renderer;
   Bilder anhand bestätigter Leistungen auswählbar. Vollständig bestätigte Leistungsübersicht nicht
   mehr pauschal Beispiel nennen. Unbekannte Öffnungszeiten nicht mehr als Terminvereinbarung erfinden.
   Fachbezogene Anfragehilfen im Fallback statt identischer Fülltexte; QA kennt bestätigte Detailfakten.
3. **Branchen:** bewährte Reihenfolge erhalten, neue Bild-/Anfragekomposition für drei Primärbranchen.
   Zwanzig vorhandene IDs/Plakat bleiben; keine behaupteten neuen Such- oder Kaufwahrscheinlichkeiten.
4. **Lead-Auswahl:** konkreten Gatefehler korrigiert: fehlender Firmenname verhindert jetzt Recherche-
   Eignung auch bei sonst vollständigen Daten. Quellen-/Aktivitäts-/Bedarfs-/Websiteprüfungen erhalten.
   Vollautomatische unabhängige Webrecherche wird dadurch nicht behauptet.
5. **Briefe:** deterministischer Abgleich hervorgehobener Quellenfakten mit tatsächlich gespeicherter
   Demo zusätzlich zum Modellreview. Nicht sichtbare versprochene Leistung → Reparatur/Prüfstatus.
   24 fiktive Testpaare, zusätzliche Reinigungs-/Fliesenfälle, unveränderte echte Gerätebilder/QR.
6. **Checkout:** bestehenden Gegenwertblock vor Tarifwahl in kurze klare Zuständigkeiten gegliedert.
   V4-Kosten, Consent, spätere Monatsaktivierung und Hosted Checkout erhalten; keine neue Kaufstrecke.
7. **Technische Automatik:** bisher verlorene berechnete LLM-Wiederholungen und Ablehnungen mit
   tatsächlichem Modell verbuchen; bekannte Kosten überleben späteren Transportfehler.
8. **Betrieb:** fehlende/unlesbare Queue nicht mehr als null Fehler darstellen. App/Queue dürfen
   nicht verschiedene DBs/Projekte verwenden. Rein lesendes operations:preflight für ENV,
   Anbieter-Konfiguration, DB-Migrationshashes, Queue und Backupnachweis, ohne Anbieteraktionen.
9. **Conversion-Erlebnis:** gemeinsame Vorher-/Nachher-, Druck-, Routing-/Preis-/Checkoutprüfung;
   technische Tests, eigene Sichtprüfung, echte Anbieterabnahme und reale Kundenwirkung getrennt.

## Zwischenprüfungen

- 102 relevante Core-Tests, 13 Dateien bestanden;111 Template-Tests bestanden.
- 5 Root-Prüfdateien bestanden (Anbieter, Rechtstextentwurf, V4, Stripe-Sperre, DB-TLS).
- Zehn Primärbranchen-Demos bei1440/360/390/430px gerendert, Nachbesserungen erneut gerendert.
- 24 lokale A4-PDFs mit lesbarem QR-Raster, korrekter Demo-Zuordnung, wahrheitsgeprüftem Text,
  ohne Preise; endgültiger Lauf und tatsächliche Sichtprüfung werden im Schlussbericht festgehalten.
- Vollständige Core-Regression und finale20-Template-Matrix laufen. Früher Lauf fand echte zu hohe
  Langtextüberschriften; nicht als bestanden buchen. Kein Produktionssystem verändert.

Nächster Schritt: laufende Prüfungen auswerten, aktuelle Druck-/Mobilebelege ansehen, endgültigen
Build und Browserkaufstrecke prüfen, Bericht/Artefakte konsolidieren und sichere lokale Commits erstellen.

## Weitere abgeschlossene Korrekturen

- Website-Erkennung: Jimdo-Unterdomains und Google Sites sind eigene Websites, keine Socialprofile.
  Override gilt auch für ältere gespeicherte Listen. Offizielle Quellen in research.md.
- Neuer Einladungsbrief: Pflichttexte9pt statt8pt. Inhalt geringfügig höher, unterer Druckrand12mm,
  Gerätebild und41mm-QR unverkleinert. Vorab an24 Fällen gemessen; finale PDFs erneut prüfen.
  Bestehende Legacy-/historische Preisbriefe nicht umgestaltet. QA verlangt für neue Einladung9pt.
- Web-Laufzeit: schon vorhandene Playwright-Version1.56.1 explizit auch im Web-Paket deklariert.
  Keine neuen Paketversionen. Der dokumentierte Webpack-Produktionsbuild besteht damit.
- Tatsächlicher aktueller Workerstart im kleinen Node22-Container auf separater lokaler Test-DB:
  Health200, DB/Queue true, alle Anbieter Mock, Migrationen aus. Dies ist keine VPS-Abnahme.
- Vollständiger Chromium-Image-Neubau/-Smoke hier **nicht bestanden**: vfs-Speicherlimit.
  Eigenen Build/Container entfernt, nur eigene Cache-Referenz und regenerierbare Next-Ausgabe
  bereinigt. Kein fremder Container, Quellstand oder Produktivbestand gelöscht.
- Erster Volltest:568 Tests, davon489 bestanden.57 Fehler entstanden während Speichermangel,
 einer durch eine veraltete Testannahme,21 durch die echte nun korrigierte Langtextdarstellung. Zweiter Lauf:203 bestanden,21 noch
  zu große Überschriften bei62Zeichen. Grenze korrigiert; finale120 Template-/Paletten-Browserfälle
  bestanden,7 Branchenfälle dort bewusst ausgefiltert (vorher bestanden).
- Veraltete Legacy-Testannahme um vier früher schon ergänzte inaktive Branchen korrigiert;
  produktive Suchlisten/Quoten nicht verändert.
- Turbopack darf in dieser Umgebung seinen PostCSS-Port nicht öffnen (EPERM). Alternative
  Next.js-Webpack-Build tatsächlich bestanden; Standard-Turbopack-Build hier nicht als grün buchen.

## Finaler Prüfstand

-14/14 Browserkauf-/Fehlerfälle auf dem finalen Webpack-Produktionsbuild grün,10 vollständige
  Mock-Kaufstrecken einschließlich Rechnung/Onboarding. Reinigungs-/Fliesenfälle ausdrücklich enthalten.
-24/24 endgültige9pt-Brief-PDFs einseitig, QR aus finalem Raster dekodiert, Ziel/Empfänger/Demo korrekt.
-20 Vorlagen:120 Geometriezustände und660 Browserchecks ohne Befund.120 Palette-/Minimal-/Vollfälle bestanden.
-111 Template-Tests,53 finale gezielte Core-Tests,40 betroffene Brief-/QR-Tests,5 Root-Prüfdateien bestanden.
-TypeScript, Lint, Worker-TypeScript-Build und finaler Webpack-Produktionsbuild bestanden.
- Mobile Produktionsbuild-Labormessung: Demo1,612s LCP, Startseite2,244s, Preise1,888s,
  Mock-Checkout1,800s. CLS0 bzw.0,000067; keine Bild-/Laufzeitfehler oder Überläufe.
- Vollständige externe Supabase-Metadatenprüfung erneut nur gelesen:11Migrationen, kein pgboss,
 0Leads/Demos/Briefe/Bestellungen, kein dokumentierter Backupstatus. Keine produktiven Änderungen.
- Eigene Sichtung: alle20 mobilen Heros, alle24 Druckansichten als Kontaktbögen, ausgewählte
  Briefe in voller Auflösung, Primärbranchen vorher/nachher. Keine Betreiberabnahme daraus ableiten.
- Browser-Recovery zusätzlich behoben: alter disconnect darf neuen Renderer nicht verlieren;
  Kontext bei newPage-Fehler schließen;45s Standardwartezeit. Synchrone E2E-Seeds begrenzt.
- Aktueller Bericht: [report.md](report.md). Sichtbare Galerie: [evidence/galerie.html](evidence/galerie.html).
  Vollständige24-Paare-Galerie und ZIP unter data/exports/quality-2026-10-27/.

Keine Tests mehr laufend außer eventueller Archivierung/Git-Prüfung. Keine9,5-Pauschalbewertung,
keine echte Modell-/Stripe-/Post-/Papierabnahme und keine Produktionsfreigabe. Nächster sachlicher
Schritt ist die konkrete Betreiber-/Infrastruktur-/Anbieterfreigabe in der Reihenfolge aus report.md.
