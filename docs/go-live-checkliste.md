# Checkliste vor dem ersten echten Versand

Diese Liste muss vollständig abgehakt sein, **bevor** `DRY_RUN=false` gesetzt wird. Den Wechsel auf
`DRY_RUN=false` gibt ausschließlich der Betreiber frei.

## Pflichtpunkte (Auftrag, Abschnitt 9)

- [ ] **Gewerbe angemeldet, Absenderdaten und Impressum hinterlegt**
      Dashboard → Einstellungen → Absender (Name, Anschrift, Telefon, E-Mail, Steuernummer, WhatsApp, Foto, Kurzvorstellung)
- [ ] **Compliance-Check Google (bzw. OSM) dokumentiert, `USE_RATING_IN_LETTER` bewusst gesetzt**
      [compliance-google.md](compliance-google.md) gelesen; Standard: Lead-Quelle OSM, Bewertungszeile aus
- [ ] **Datenschutzerklärung, AGB und Impressum (von dir geliefert) online**
      Einstellungen → Rechtstexte; prüfen unter `/impressum`, `/datenschutz`, `/agb` (AGB inkl. B2B, Mindestlaufzeit, Garantie, AV-Vereinbarung für das Kontaktformular)
- [ ] **Opt-out per QR und per E-Mail getestet, Sperrliste greift**
      Test-Demo → „Kein Interesse“ → 410; Mail mit „bitte keine Post mehr“ an die Support-Adresse → Lead gesperrt; erneute Lead-Suche findet den Betrieb nicht wieder
- [ ] **Demo-Seiten nicht indexierbar (Header, Meta, robots.txt geprüft)**
      `curl -I https://DEMO_DOMAIN/d/<slug>` → `X-Robots-Tag: noindex`; Quelltext → `<meta name="robots" content="noindex…">`; `/robots.txt` → `Disallow: /d/`
- [ ] **Brief sieht nicht wie eine Rechnung aus, enthält Art.-14- und Art.-21-Hinweis**
      Brief-PDF ansehen; Wahrheits-Check bestanden (ab Phase L2)
- [ ] **Testbrief an dich korrekt angekommen (Anschrift im Fenster)**
      Briefe → „Testbrief an mich erzeugen“ → im Test-Warenkorb des Briefdienstes prüfen → ein echter Brief an dich
- [ ] **Stripe im Live-Modus, Testkauf storniert**
      `sk_live_…`, Webhook-Endpunkt live, ein Kauf (Einmalzahlung und Monatsplan) durchgespielt und erstattet, Stornorechnung erhalten
- [ ] **Budget-Guard und Not-Aus getestet**
      Wochenbudget klein setzen → Versand stoppt; Not-Aus → Jobs mit Kostenfolge stoppen
- [ ] **`DRY_RUN=false` erst nach deinem ausdrücklichen OK**

## Technik vor dem Start

- [ ] DNS für `APP_HOST`, `DEMO_DOMAIN`, `TRACK_DOMAIN` gesetzt, TLS aktiv
- [ ] `/api/health?strict=1` liefert 200; externer Uptime-Monitor eingerichtet
- [ ] Erstes Backup + Wiederherstellungstest „ok“ (Dashboard), Backups außer Haus kopiert
- [ ] Absenderdomain der E-Mails mit SPF, DKIM, DMARC verifiziert; Test-Mail kommt nicht im Spam an
- [ ] E-Mail-Eingang (IMAP oder Inbound-Webhook) getestet
- [ ] Registrar-Sandbox (INWX OT&E) und Hosting-Test: Testkunde bis „live“ durchgespielt
- [ ] AV-Verträge mit allen Dienstleistern abgeschlossen ([auftragsverarbeiter.md](auftragsverarbeiter.md))
- [ ] Erste 30 Demos manuell geprüft und freigegeben

## Erste Charge (laut Update 2, B10)

- 40 Briefe, Gastronomie / Handwerk / Beauty (je ca. 13), Dortmund, Wochenbudget 60 €
- je Branche Startvariante mit Statistik gegen neutrale Kontrolle 50/50
- Ziel der ersten 4 Wochen: Messkette prüfen, erste Scan-Raten mit Spannen
