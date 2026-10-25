# Rechtliche Nachprüfung und Betreiberentscheidungen – 25.10.2026

Geprüft: apps/web/src/lib/legal-drafts.ts (V4-Zweig und öffentliche Entwürfe),
docs/recht/pruefprotokoll.md, zentrale Preis-/Checkout-Konfiguration und tatsächlicher Abnahmestand.
Eigene Quellenprüfung, keine anwaltliche Prüfung oder rechtsverbindliche Freigabe.

## Ergebnis: noch keine Freigabe für echten Verkauf oder Briefversand

- Impressum: Name/ladungsfähige Anschrift/Kontakt sind strukturell vorgesehen. Tatsächliche
  private Runtime-Angaben müssen vor Veröffentlichung stimmen. Bestehender Hinweis „W-IdNr.
  wird geklärt“ ersetzt keine zugeteilte Nummer. Nur vorhandene USt-ID/W-IdNr. angeben, niemals
  persönliche Steuernummer öffentlich. Keine generelle Pflicht zum Handelsregistereintrag erfinden.
- Gewerbe: Betreiber hat auf die gebündelten Fragen mit „Nein“ geantwortet; Gewerbeanmeldung
  daher als offen erfasst. §14GewO verlangt Anzeige gleichzeitig mit Beginn eines Gewerbes.
  Vorbereitung und Gewerbebeginn sind zu unterscheiden; tatsächlichen Beginn mit Behörde klären.
- Kleinunternehmer: frühere Frage nach einer ausdrücklichen Finanzamtsbestätigung war zu pauschal.
  §19 gilt bei erfüllten Voraussetzungen kraft Gesetzes, kein gesonderter Genehmigungsantrag nötig.
  Gründungsjahr-Grenze25000Euro; keine automatische Annahme100000Euro für Neugründer.
  Fragebogen/Verzicht/Umsatzprognose mit Finanzamt oder steuerlicher Beratung klären.
- V4-AGB: Preise597+19/99, kein doppeltes Care-Abo, Monatsbeginn erst Go-Live und monatliche
  Kündigung stimmen mit beauftragtem Modell überein. Freigabe fehlt insbesondere für konkreten
  Vertragsschluss/Annahme und Abnahme, Liefer-/Mitwirkungsfristen, Leistungsgrenzen, Domain-/Daten-
  Übergabe sowie Garantiebedingungen. Ein allgemeiner Verweis auf gesetzliche Haftung ist keine
  Bestätigung, dass sämtliche individuellen Klauseln rechtssicher sind (§307BGB).
- Garantie:14Tage Einrichtungsgarantie ab bestätigtem Go-Live ist Arbeitsstand; Monatsleistungen
  nicht automatisch erstattet. Betreiberfreigabe für diesen genauen Umfang noch nicht dokumentiert.
- Datenschutz: Arbeitsfassung beschreibt noch nicht produktiven Betrieb und darf nicht unverändert
  als Live-Erklärung gelten. AV-Verträge/Übermittlungsgrundlagen, Log-/Inboxfristen und tatsächliche
  Aktivierung dokumentieren. Supabase-RegionIrland bedeutet keine ausschließlich europäische
  Verarbeitung aller Anbieter. Für Kundenformulare eigene AV-Vereinbarung vor Aktivierung.
- Postwerbung: grundsätzlich nicht dieselbe Einwilligungspflicht wie unerbetene E-Mail, aber keine
  pauschale Erlaubnis. Interessenabwägung, belegte Datenquelle, Transparenz nachArt14, gesonderter
  Art21-Widerspruch und Sperrliste pro wirklichem Lead prüfen. Beispiel-Fußzeile „vor Versand prüfen“
  in Testbrief ist ausdrücklich kein fertiger Art14-Hinweis für eine echte Kampagne.
- Endgerätezugriff: keine pauschale Ausnahme nur weil keine Cookies gesetzt werden. Engagement
  bleibt aus; nicht erforderliche Zugriffe vor Aktivierung nach§25TDDDG prüfen.

## Primärquellen tatsächlich am25.10.2026 recherchiert

- https://www.gesetze-im-internet.de/gewo/__14.html
- https://www.gesetze-im-internet.de/ddg/__5.html
- https://www.gesetze-im-internet.de/ustg_1980/__19.html
- https://www.elster.de/eportal/helpGlobal?themaGlobal=help_ustva_2026
- https://verwaltung.bund.de/leistungsverzeichnis/DE/leistung/99102187261000/herausgeber/HH-S1000020010000009742/region/020000000000
- https://www.gesetze-im-internet.de/bgb/__307.html
- https://www.gesetze-im-internet.de/bgb/__145.html
- https://www.gesetze-im-internet.de/uwg_2004/__7.html
- https://www.gesetze-im-internet.de/ttdsg/__25.html
- https://vis.bayern.de/digitale_welt/datenschutz/werbung.htm
- https://www.lda.bayern.de/media/veroeffentlichungen/Info-Blatt_Verantwortliche_Datenverwendung_Werbung_DS-GVO_4-2019.pdf
- https://resend.com/security
- https://supabase.com/legal/customer-resources/data-processing-addendum
- https://www.netlify.com/privacy/

EUR-Lex Volltextabruf wurde durch Bot-Prüfung blockiert, nicht als neu vollständig gelesener
DSGVO-Volltext verbuchen. Anbieter-Webseiten beweisen nicht den Vertragsabschluss dieses Accounts.

## Lesende Anbieterprüfung dieser Runde

- SupabaseWebiste- ACTIVE_HEALTHY;32öffentliche Tabellen, keinpgboss-Schema,
  orders.offer_snapshot fehlt, ein privater Bucket. Nur aggregierte Metadaten gelesen.
- Netlify: beide bekannten Projekte existieren, aktuelle Deployments ready. Kein neuer Deploy.
  Secret-Werte und vollständige ENV unverändert ungelesen.
- Resend:Domainverified, Senden/Empfangenenabled, Open-/Clicktrackingfalse; Support-Inbox vorhanden,
  zuletzt empfangennever. Das beweist noch keinen echten Nachrichtenfluss. Keine Testmail gesendet.
- Cloudumgebung meldet keine gebundenen Runtime-Secrets. Das ist keine Aussage darüber,
  welche Werte in Netlify selbst hinterlegt sind. Kein API-Schlüssel ausgegeben.

Nächste sichere Schritte: Gewerbe-/Steuerklärung beim Betreiber; vorhandenen Recovery-Plan konkret
mit sicherer DB-Verbindung/verschlüsseltem Backupziel ausführen, sobald Zugang und Sicherungsfreigabe
vorliegen. Danach isolierter Restore und erst separat genehmigte Migrationen0011–0017/Queue.
