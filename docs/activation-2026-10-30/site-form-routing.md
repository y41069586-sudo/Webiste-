# Termin-, Reservierungs- und Projektanfragen an den richtigen Betrieb

Stand: 30.10.2026. Bestehende V4/V5-Strecke gezielt erweitert; keine neue Datenbank, kein
Buchungssystem, keine Preisänderung. Echte Abnahme ausschließlich am eigenen gekennzeichneten
Sandbox-Testbetrieb. Allgemeine Versand-/Zahlungs-/Domainfreigaben bleiben unverändert.

## Ablauf

1. Der Betrieb legt im bestehenden Onboarding unter „Nachrichten aus dem Kontaktformular gehen an“
   seine Empfängeradresse fest. Die vorhandene Kundenseite speichert diese Zuordnung.
2. Besucher geben Name, E-Mail, optional Telefon, Wunschtermin/Leistung und Nachricht an.
3. Der Server bestimmt die Empfängeradresse ausschließlich aus der Kundenseite. Ein Besucher kann
   weder Empfänger noch Transport oder interne Testfreigaben über das Formular ändern.
4. Der Betrieb erhält die Anfrage per E-Mail. Reply-To ist die Besucheradresse; „Antworten“ geht
   direkt dorthin. Termin und Leistung stehen im Text, die Anfrageart im Betreff.
5. Ein Termin oder eine Reservierung gilt erst nach ausdrücklicher Bestätigung durch den Betrieb.
   Formulartexte, Weiterleitung und Dankeseite versprechen keine automatische Kalenderbuchung.

## Gefundene und korrigierte Lücken

| Vorher | Jetzt | Nachweis |
| --- | --- | --- |
| Mock-Mailer konnte als erfolgreicher Formularversand erscheinen | Reguläre gültige Anfragen mit Mock-Transport erhalten HTTP503 ohne Erfolgsweiterleitung | Core-Test und tatsächlicher Produktionsbuild-Browserlauf |
| Nur „nicht suspended“ wurde geprüft | Regulär nur bezahlte Live-Kundenseiten; öffentliche Stripe-Sandbox-/Vorschauformulare gesperrt | Status-, Zahlungs- und HTTP-Prüfungen |
| Anfrageart/Wunsch wurden vor der Nachrichtenvalidierung zusammengefügt | Gemeinsame Feldzuordnung, Rohtext separat validiert; Terminangaben bleiben vollständig | Leere Nachricht plus Wunsch wird abgewiesen |
| Identische E-Mail+Nachricht wurde dauerhaft dedupliziert | Empfänger, Name, Kontakt, Anfrageart, Wunsch und Nachricht im Hash; Zehn-Minuten-Fenster | Wiederholung, spätere identische Anfrage, Parallelaufruf und getrennte Betriebe |
| Generischer Betreff, missverständliche Bestätigungsformulierungen | Anfrageart im Betreff, klarer Hinweis zur ausstehenden Terminbestätigung | Mail- und Renderprüfungen |
| Anbieterfehler konnten personenbezogene Rohmeldungen in Formularlogs bringen | Formularlogs speichern nur Fehlerklasse; Postausgang erhält eine generische Fehlermeldung | Quellprüfung und Fehlerfall |

Der Duplikatschutz ist kein allgemeines Exactly-once-Versprechen: An der Grenze zweier Zeitfenster
kann ein erneuter HTTP-Aufruf einen neuen Schlüssel erhalten. Innerhalb eines logischen
Anbieterversands bleibt der Schlüssel bei Retries stabil. Inhalte werden nicht für eine neue
Nachrichtenwarteschlange gespeichert; nach einem endgültigen Fehler muss der Besucher erneut
absenden. Der vorhandene Postausgang speichert Versandmetadaten, nicht den Nachrichtentext.

## Sicherer eigener Zustelltest

Die bereits vorhandene geschützte Integrationsroute unterstützt einen ausdrücklich bestätigten
POST mit check=site_form und confirm=own-inbox. Voraussetzungen: gültige normale Admin-Sitzung,
gleicher Origin, DRY_RUN=true, vorhandener privater Resend-Zugang und eigene Absenderadresse.

Der Test akzeptiert keine frei wählbare Bestellung, Adresse oder Nachricht. Verwendet wird nur die
vorhandene fiktive, bezahlte Stripe-Testbestellung4991f35d-0c23-465f-b4b1-0f320d5a5f91. Bestell-,
Kunden-, Formular- und Testbesucheradresse müssen sämtlich dem eigenen konfigurierten Postfach
entsprechen; source=mock und Testkennzeichnung zwingend. Öffentliche Formularschalter bleiben aus.

Gemeinsamer Formularparser, derselbe Weiterleitungsdienst, vorhandener Resend-Adapter und
vorhandener idempotenter Postausgang. Anbieter nur für diesen einzelnen Aufruf übergeben, kein
Prozess-/ENV-/DB-Providerwechsel. Art acceptance_site_form und Kennzeichnung [TEST] verhindern eine
Verwechslung mit echten Kundenanfragen. Wiederholte Testaufrufe senden denselben Test nicht erneut.
Ein Audit hält Anbieter-ID und Grenzen fest, keine Nachricht und keine Zugangsdaten.

Die Testantwort deliveryVerified=false bedeutet zunächst nur Anbieterannahme. Zustellung und
tatsächlicher Empfang müssen separat über Anbieter und eigenes Postfach bestätigt werden.
Ein Dienstaufruf der Abnahme beweist keinen aktiven öffentlichen Sandbox-Endpunkt; dieser bleibt
absichtlich gesperrt. Der reguläre HTTP-Endpunkt ist mit isolierten Browser-/Core-Fixtures geprüft.

## Tatsächlich durchgeführte lokale Prüfungen

- 27 gezielte Formularprüfungen bestanden: zwei getrennte Betriebe, Reply-To/Wunsch/Betreff,
  Manipulationsversuche, Mock-Sperre, acht nicht aktive Seitenzustände, Test-/Erstattungs-Sperre,
  Eingaben, Spam, Rate-Limit, Wiederholungen/Parallelaufrufe, Fehler/Retry und geschützte eigene Abnahme.
- Neun bestehende Onboarding-/Veröffentlichungs-/V4-Prüfungen und sechs Zahlungs-/Mail-Adaptertests
  bestanden. Ausschließlich eigene lokale test-Datenbank, externe Dienste simuliert.
- Alle112Template-Tests bestanden.
- Fünf Browser-E2E gegen Produktionsbuild bestanden: V4-Preise und Zustimmung/gesperrter Monatsstart,
  kompletter Onboarding-Ablauf, ehrliche Mock-Fehleransicht, öffentliche Formularsperren sowie
  Admin-/Origin-/Befehlsprüfung des eigenen Tests. Nur eigene lokale e2e-Datenbank.
- Workspace-TypeScript und Lint bestanden; Produktionsbuild einschließlich Worker bestanden.
  Vorhandene sieben Warnungen zum Dateitracing bleiben unverändert, kein neuer Buildfehler.
- Tatsächlich gerenderte Formularansichten bei360/390/430/1440px geprüft: kein horizontaler
  Überlauf, Beschriftungen mindestens14px, vollständige Felder und sichtbarer Bestätigungshinweis.
  Desktop1440/Mobil390 zusätzlich visuell angesehen. Ausschließlich fiktive Testdaten.

Lokale Ansichten: data/exports/site-form-routing/terminanfrage-{360,390,430,1440}.png.
Automatische Layoutmessung: data/exports/site-form-routing/layout-check.json.
Produktionsdeploy und eigene Mailannahme/-zustellung werden nach dem tatsächlichen Lauf gesondert
unter site-form-delivery.json dokumentiert; hier keine noch ausstehende Zustellung behaupten.

## Tatsächliche Veröffentlichung und eigene Zustellung

Code5ac57ef auf beide vorhandenen Zweige gepusht. App-Deploy6ae4e726d98c7677c65ed3ca tatsächlich
ready/production,30.10.18:52:37UTC. Danach normal authentifizierter eigener Abnahme-POST erfolgreich.
Zweiter Aufruf duplicate mit derselben Anbieter-ID; im tatsächlichen Postausgang genau eine Zeile.

Resend delivered; tatsächlicher Empfang18:53:27UTC im eigenen Postfach. SMTP-Message-ID von gesendeter
und empfangener Kopie identisch. Terminwunsch, klare Test-/Nichtbuchungskennzeichnung und Reply-To
in der empfangenen Nachricht geprüft. **Empfangene Nachricht liegt im Spamordner.** Keine Umklassifizierung,
kein weiterer Versand und keine Ursache ohne Nachweis behauptet. Tatsächliche Antwort nicht versendet.

Lesende Anbieter-/DNS-Prüfung: Domain/DKIM/SPF beim Anbieter verified. Öffentlicher DKIM-Schlüssel und
DMARC p=none vorhanden; SPF wird über die vom Anbieter bestätigten CNAMEs delegiert. Keine DNS-Änderung
vorgenommen. Empfangene Rohmail enthält DKIM-Signaturen, aber kein Authentication-Results; das allein
belegt keinen unabhängigen Authentifizierungs-Pass und keine Ursache der Spam-Einstufung. Rückmeldung
zur früheren externen Gmail-Testbestätigung weiterhin offen; keine weitere Gmail-Mail geschickt.

Laufzeit nach dem Test erneut gelesen: DRY_RUNtrue, allgemeiner Mail-ProviderMock, Stripe/test.
Kundenseite unverändert preview, liveAt/billingStartedAt weiterhin leer. Root-Homepage vor/nach
hashgleich. [Sanitisierter tatsächlicher Nachweis](site-form-delivery.json).

## Worker für später erzeugte Seitentexte

Die Weiterleitung läuft bereits in der aktualisierten App. Der Betreiber bedient den VPS selbst;
die neuen Formular-/Dankeseitentexte benötigen beim nächsten Seitengenerieren auch dort den aktuellen
Code. Ein normaler LIVE=0-Code-Neuaufbau genügt; keine neuen Secrets, kein NEU=1, kein Einmal-Code:

```bash
curl -fsSL https://raw.githubusercontent.com/y41069586-sudo/Webiste-/5ac57ef8238fa76ec00bb0a3c4534598956c1a93/infra/vps/setup.sh -o /tmp/seitenwerk-setup.sh
NEU=0 LIVE=0 bash /tmp/seitenwerk-setup.sh
```

Dieses neue VPS-Update ist hier noch nicht nachgewiesen. Es aktiviert keinen allgemeinen Mailversand.

## Verbleibende Grenzen

- Allgemeiner E-Mail-Provider bleibt bis zur passenden Betriebsfreigabe Mock. Die einzelne eigene
  Testmail aktiviert keine Kundenmails, Erinnerungen oder automatischen Antworten.
- Vor jedem echten Kunden-Go-Live muss dessen bestätigtes Empfängerpostfach tatsächlich erreichbar
  sein. SMTP-Annahme garantiert weder Hauptposteingang noch Antwort des Betriebs.
- Keine echte Terminbuchung, Verfügbarkeitsverwaltung, Kalenderabstimmung oder automatische
  Terminbestätigung implementiert. Ein vorhandener Buchungsanbieter müsste gesondert angebunden werden.
- Keine externe Kundenmail, kein Briefversand, keine echte Zahlung oder Domainregistrierung durch
  diese Änderung. Steuer-/Rechts-/Backup- und übrige Go-Live-Abnahmen bleiben gesondert offen.
