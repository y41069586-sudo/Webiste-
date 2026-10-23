# Was in die AGB muss

Checkliste für deine AGB (du lieferst den Text, wir erstellen keine Rechtstexte). Ohne hinterlegte AGB
sperrt das System den Livegang (echte Briefe an Leads, Live-Checkout). Bitte von einer Anwältin/einem
Anwalt prüfen lassen. Die Stichpunkte beschreiben, **was das System tatsächlich tut** – die AGB müssen dazu
passen.

## 1. Geltungsbereich und Vertragsschluss

- [ ] Angebot nur an Unternehmer (§ 14 BGB), keine Verbraucher. Im Checkout wird das per Pflicht-Checkbox
      bestätigt.
- [ ] Vertragsschluss mit Abschluss der Online-Zahlung (Stripe Checkout). Bestellbestätigung und Rechnung
      per E-Mail.
- [ ] Unverbindlicher Entwurf: Der zugeschickte Website-Entwurf ist ein kostenloses, unverbindliches
      Angebot; er ist bis zum genannten Datum online und wird danach gelöscht.

## 2. Leistungen

- [ ] Website auf Basis des Entwurfs, Anpassung mit den Angaben des Kunden (Onboarding-Formular).
- [ ] Bis zu 2 Änderungsrunden vor dem Start (Config `onboarding.includedChangeRounds`).
- [ ] Eigene Domain, **registriert auf den Namen des Kunden** (der Kunde ist Domaininhaber).
- [ ] Hosting mit SSL, Kontaktformular an die E-Mail des Kunden.
- [ ] Mitwirkungspflichten: Kunde liefert Impressumsangaben und seine Datenschutzerklärung; er ist für
      Inhalte, Bilder und Rechte daran verantwortlich.
- [ ] Verfügbarkeit des Hostings (realistische Angabe, keine 100 %).

## 3. Preise und Steuern

- [ ] Option A: 590 € einmalig, inkl. Domain und 12 Monaten Hosting ab Veröffentlichung; danach optional
      „Hosting & Pflege“ 19 €/Monat, monatlich kündbar.
- [ ] Option B: 49 €/Monat, erste Rate sofort fällig, **Mindestlaufzeit 12 Monate**; ab Monat 13
      automatisch 19 €/Monat („Hosting & Pflege“), dann monatlich kündbar.
- [ ] Klausel **„zzgl. gesetzlicher USt., soweit anfallend“**.
- [ ] Kleinunternehmer nach § 19 UStG: keine Umsatzsteuer ausgewiesen. **Bei Wegfall der
      Kleinunternehmerregelung gelten die Preise für neue Verträge als Nettopreise** (im System umschaltbar:
      `tax.kleinunternehmer`, `tax.pricesAreGross`).
- [ ] Zahlungsarten: Karte oder SEPA-Lastschrift (über Stripe). Bei SEPA: Hinweis auf das Mandat und die
      Vorabankündigung (Pre-Notification-Frist).
- [ ] Rechnungen: eigene PDF-Rechnung je Zahlung (auch jede Monatsrate) per E-Mail, fortlaufend nummeriert.

## 4. Laufzeit und Kündigung (Option B und „Hosting & Pflege“)

- [ ] Mindestlaufzeit 12 Monate ab Vertragsschluss; ordentliche Kündigung frühestens zum Ende der
      Mindestlaufzeit, danach monatlich.
- [ ] Form und Weg der Kündigung (z. B. E-Mail).
- [ ] Was nach Vertragsende passiert: Website wird offline genommen; die Domain bleibt Eigentum des
      Kunden, Übertragung per Auth-Code auf Wunsch (kostenlos); ohne Wunsch wird sie nicht verlängert.

## 5. Zahlungsverzug

- [ ] Automatische Wiederholung fehlgeschlagener Einzüge (Stripe Smart Retries).
- [ ] Danach zwei Zahlungserinnerungen per E-Mail (Abstand je 7 Tage, Config `dunning.*`).
- [ ] Danach **Pausierung der Website** (neutrale Ersatzseite), bis die Zahlung eingegangen ist; Freischaltung
      automatisch nach Zahlung.
- [ ] Bei Option B: Die Raten bis zum Ende der Mindestlaufzeit bleiben geschuldet; Regelung, ob und wann sie
      sofort fällig werden (das System bereitet einen Forderungsbrief vor, den du einzeln freigibst – kein
      automatisches Inkasso).
- [ ] Ggf. Verzugszinsen/Pauschale nach § 288 BGB (B2B) – nur wenn gewollt.

## 6. Zufriedenheitsgarantie (14 Tage)

- [ ] Frist: **14 Tage ab Go-Live der Website, spätestens ab dem 14. Tag nach der Zahlung**, falls sich der
      Go-Live aus Gründen beim Kunden verzögert.
- [ ] Folge: volle Erstattung (Option A: Einmalbetrag; Option B: erste Rate), Vertrag endet sofort,
      Website wird offline genommen.
- [ ] Domain: kostenlose Übertragung per Auth-Code auf Wunsch; ohne Wunsch keine Verlängerung.
- [ ] Wie der Kunde die Garantie geltend macht (formlos per E-Mail/Antwort auf die Bestellbestätigung).
- [ ] Ggf. Ausschluss bei Missbrauch (nur wenn gewollt).

## 7. Nutzungsrechte und Inhalte

- [ ] Rechte an Texten/Gestaltung der Website für den Kunden (Umfang, auch nach Vertragsende?).
- [ ] Bilder: verwendete Stockfotos sind lizenzfrei; eigene Fotos des Kunden – er sichert die Rechte zu.
- [ ] KI-gestützte Texterstellung (Hinweis, dass der Kunde die Inhalte prüft und freigibt).

## 8. Datenschutz und Auftragsverarbeitung

- [ ] Verweis auf die Datenschutzerklärung.
- [ ] **AV-Vertrag** für das Kontaktformular der Kundenseite (wir verarbeiten Anfragen an den Kunden).
- [ ] Unterauftragsverarbeiter (Hosting, E-Mail, Zahlung) – siehe `docs/auftragsverarbeiter.md`.

## 9. Haftung, Gewährleistung, Sonstiges

- [ ] Haftungsbeschränkung (B2B üblich), Ausnahmen für Vorsatz/grobe Fahrlässigkeit und Kardinalpflichten.
- [ ] Gewährleistung für die Erstellung.
- [ ] Änderungen der AGB / Preise für laufende Verträge (Ankündigungsfrist).
- [ ] Gerichtsstand (Sitz des Anbieters, B2B), anwendbares Recht.
- [ ] Salvatorische Klausel.

## 10. Hinweise im Checkout (müssen zu den AGB passen)

Das System zeigt bereits: Plan-Wahl ohne Vorauswahl, Mindestlaufzeit und Folgepreis neben den 49 €,
Garantie-Hinweis, B2B-Bestätigung und AGB-Zustimmung mit Versionsstand (`legal.termsVersion` wird je
Bestellung gespeichert).
