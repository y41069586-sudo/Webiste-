# Rechtstexte und Integrationen – Prüfprotokoll

24.10.2026. Betreiber hat die zuvor pausierte Rechtsarbeit wieder beauftragt.
Eigene Texte, kein eRecht24-Export und keine anwaltliche Freigabe.

## Bestätigte Fakten

[Name aus privater Konfiguration], Seitenwerk, Einzelunternehmen ohne Handelsregistereintrag und ohne angegebene USt-ID,
[Anschrift aus privater Konfiguration], [PLZ] [Ort], Deutschland; support@example.test;
[Telefon aus privater Konfiguration] auch WhatsApp. Kein Foto. Nur B2B-Angebot.

## Offene Punkte mit Wirkung

- Betreiber kennt Kleinunternehmerstatus und etwaige W-IdNr. nicht. Keine §19-Steuerbefreiung als
  Tatsache behaupten. Eine zugeteilte W-IdNr. gehört gemäß §5 DDG ins Impressum; persönliche
  Steuernummer nicht. Steuerstatus anhand Finanzamtsunterlagen klären, keine Nummer erfinden.
- Datenschutz muss die tatsächlich vereinbarten DPA-/Drittlandgrundlagen, accountabhängigen
  Logfristen und Inbox-Aufbewahrung abdecken. Nicht pauschal „EU-only“ schreiben: Resend speichert
  in USA, Netlify arbeitet weltweit; Supabase-Projektregion Irland ersetzt keine Vertragsprüfung.
- AGB-Vertragsschluss ist in der Arbeitsfassung als ausdrückliche Auftragsbestätigung geregelt.
  Bestehende automatisierte Verarbeitung nach Zahlung muss vor Livegang damit abgestimmt werden.
- Kündigung: ein Monat zum Vertragsmonatsende; vor Livegang tatsächliche Abrechnungs-/Kündigungs-
  funktion abgleichen. Keine pauschale Fälligstellung künftiger Raten und keine erfundene 100%-SLA.
- Garantiecode deckelt Fristbeginn unabhängig vom Grund auf Tag14 nach Zahlung. Kundenseitige
  Verzögerung darf nicht stillschweigend mit Anbieter-Verzögerung gleichgesetzt werden. Abgleich offen.
- Kontaktformulare auf Kundenseiten benötigen gesonderte AV-Vereinbarung nach Art28 DSGVO.
- Keine allgemeine Gerichtsstandsvereinbarung nur aufgrund Unternehmerstatus: gesetzliche
  Gerichtsstände bleiben. Keine pauschalen Haftungsausschlüsse für Vorsatz, Gesundheit usw.
- Worker ist vertagt: keine automatische Löschung/Backups als bereits laufend darstellen.

## Auslieferung und Freigabe

Texte in apps/web/src/lib/legal-drafts.ts. Impressum enthält echte Angaben samt Hinweis auf die
noch zu klärende W-IdNr.; Datenschutz und AGB sind transparent als Arbeitsstand erkennbar.
Freigegebene legal.*-DB-Felder bleiben leer. Kein Live-Verkauf wird durch diese Texte entsperrt.
Bestehende Preis-/Steuerdarstellung im übrigen Auftritt ist bis zur Steuerklärung noch nicht final.
Kein Dokument behauptet eine Generator-/Anwaltsprüfung oder allgemeine Rechtssicherheit.

## Am 24.10.2026 konsultierte Primärquellen

- https://www.gesetze-im-internet.de/ddg/__5.html
- https://www.gesetze-im-internet.de/bgb/__307.html
- https://www.gesetze-im-internet.de/ustg_1980/__19.html
- https://www.gesetze-im-internet.de/ustdv_1980/__34a.html
- https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=de (Abruf teilweise Bot-Sperre)
- https://www.netlify.com/trust-center/
- https://www.netlify.com/privacy/
- https://docs.netlify.com/build/functions/logs/
- https://resend.com/legal/dpa
- https://resend.com/security
- https://supabase.com/legal/dpa

Kein pauschales „alles rechtlich korrekt“: Ungeklärte Tatsachen und die konkrete Vertragsausführung
lassen sich durch allgemeine Webrecherche nicht rechtsverbindlich bestätigen.
