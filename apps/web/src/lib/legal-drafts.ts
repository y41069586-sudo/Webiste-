import { formatEuroShort, v4FirstYearCents, type AppConfig } from '@wbm/core';
import { sitePricing } from './site';

/** Own working texts based on confirmed facts. Never silently approve these for live checkout. */
export function legalDrafts(cfg: AppConfig) {
  const s = cfg.sender;
  const p = sitePricing(cfg);
  const contact = `${s.name}, handelnd unter „${s.company}“, ${s.street}, ${s.postalCode} ${s.city}, Deutschland`;
  const email = s.email;
  const draft =
    '**Arbeitsfassung vom 24.10.2026. Der Verkauf ist noch nicht freigeschaltet. Steuerstatus, Vertragsabwicklung und Dienstleisterkonfiguration werden vor dem Verkaufsstart abschließend geprüft.**';
  return {
    impressumMarkdown: `# Impressum

## Anbieterin gemäß § 5 DDG

${s.company}

Inhaberin: ${s.name} (Einzelunternehmen)

${s.street}

${s.postalCode} ${s.city}

Deutschland

## Kontakt

Telefon: ${s.phone}

E-Mail: ${email}

Kein Handelsregistereintrag. Eine Umsatzsteuer-Identifikationsnummer wurde nicht angegeben. Ob eine Wirtschafts-Identifikationsnummer zugeteilt wurde, wird derzeit geklärt. Eine bereits zugeteilte Nummer ist hier nachzutragen. Die persönliche Steuernummer wird hier nicht veröffentlicht.

## Angebot

Erstellung und Betreuung von Websites für Unternehmer. Die Website enthält keine journalistisch-redaktionellen Angebote.
`,
    privacyMarkdown: `# Datenschutzerklärung

Stand: 24. Oktober 2026

## 1. Verantwortliche und Kontakt

${contact}. E-Mail: ${email}; Telefon: ${s.phone}. An diese Kontaktdaten können Sie auch Datenschutzanfragen richten.

## 2. Website und Hosting

Die öffentliche Firmenwebsite und die Verwaltungsanwendung werden über Netlify, Inc., USA, bereitgestellt. Bei Abrufen werden technisch notwendige Daten wie IP-Adresse, Zeitpunkt, angeforderte Adresse, Browserinformationen und Fehlerdaten verarbeitet. Dies dient der Auslieferung, Betriebssicherheit und Missbrauchsabwehr. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser Interesse ist ein zuverlässiger und geschützter Internetauftritt.

Netlify verarbeitet Daten in einem international verteilten Netzwerk; eine ausschließliche Verarbeitung in der EU wird nicht zugesichert. Einzelheiten zu Auftragsverarbeitung, Übermittlungsmechanismen und Unterauftragnehmern finden Sie unter https://www.netlify.com/trust-center/ . Die konkreten accountabhängigen Logfristen und vertraglichen Übermittlungsgrundlagen müssen vor der endgültigen Freigabe dieser Arbeitsfassung dokumentiert werden. Anwendungseigene Logs sollen keine Nachrichteninhalte oder vollständigen IP-Adressen enthalten; dies ersetzt nicht die Verarbeitung beim Hostinganbieter.

## 3. Datenbank und Dateispeicher

Für Firmenkonfiguration, interne Verwaltung sowie später erforderliche Vertragsdaten nutzen wir Supabase. Das Projekt ist in Irland eingerichtet. Die statische Firmenwebsite übernimmt öffentliche Firmeninformationen beim Erstellen der Dateien; ein reiner Websitebesuch legt kein Kundenkonto in Supabase an. Die nichtöffentliche Verwaltungsanwendung verarbeitet Zugangsdaten und Sitzungsinformationen. Dokumente werden nur in einem privaten Speicherbereich abgelegt; es gibt keinen öffentlichen Zugriff auf Rechnungen oder Supportdaten.

Rechtsgrundlagen sind je nach Zweck Art. 6 Abs. 1 lit. b DSGVO (Anbahnung/Erfüllung von Verträgen) und lit. f DSGVO (sichere Verwaltung). EU-Projektregion bedeutet nicht, dass sämtliche Support-, Verwaltungs- und Unterauftragnehmerzugriffe ausschließlich in der EU erfolgen. Informationen: https://supabase.com/legal/dpa und https://supabase.com/privacy . Vertrags- und Zugriffsgrundlagen bleiben im internen Prüfprotokoll zu bestätigen.

## 4. Kontakt und E-Mail

Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir Ihre Kontaktdaten und den mitgeteilten Inhalt zur Bearbeitung. Bei Vertragsanfragen gilt Art. 6 Abs. 1 lit. b DSGVO, sonst lit. f DSGVO mit dem Interesse, Anfragen sachgerecht zu beantworten. Erforderliche Nachweise werden zur Geltendmachung oder Abwehr von Ansprüchen aufbewahrt. Es gibt keine unaufgeforderte Werbung per E-Mail oder WhatsApp.

Für den Empfang an ${email} und die technische E-Mail-Anbindung wird Resend (Plus Five Five, Inc., USA) eingesetzt. Dabei fallen insbesondere Adressen, Nachrichteninhalte und Zustelldaten an. Resend speichert Daten in den USA; eine europäische Versandregion ändert diesen Speicherort nicht. Resend nennt für E-Mail-/Logdaten regulär 30 Tage; die Aufbewahrung in einem gesonderten Inbox-Postfach und in unserer Anwendung richtet sich zusätzlich nach deren Zweck und Einstellungen. Übermittlungsregelungen einschließlich Standardvertragsklauseln: https://resend.com/legal/dpa ; weitere Informationen: https://resend.com/security . Der automatische Versand und KI-Antworten unserer Anwendung sind derzeit deaktiviert. Eingehende Nachrichten werden zur manuellen Prüfung angezeigt.

## 5. WhatsApp und externe Links

WhatsApp ist ausschließlich als externer Link eingebunden. Beim bloßen Laden unserer Seite wird kein WhatsApp-Chat eingebettet. Erst durch Öffnen des Links bzw. die Nutzung des Messengers erfolgt eine Verbindung mit dem jeweiligen Anbieter. Für dessen weitere Verarbeitung gilt dessen Datenschutzerklärung. Sie können uns stattdessen per E-Mail oder Telefon kontaktieren.

## 6. Zahlungen

Die Zahlungsanbindung an Stripe befindet sich im Testbetrieb; echte Online-Zahlungen sind nicht freigeschaltet. Bei späterer Nutzung der gehosteten Bezahlseite verarbeitet Stripe die dort eingegebenen Kontakt-, Vertrags- und Zahlungsdaten zur Zahlungsabwicklung, Sicherheit und Erfüllung eigener gesetzlicher Pflichten. Rechtsgrundlagen für unsere Verarbeitung sind Art. 6 Abs. 1 lit. b und c DSGVO. Vor Aktivierung werden der zuständige Stripe-Vertragspartner, die konkreten Übermittlungsregelungen und der tatsächliche Ablauf geprüft und diese Erklärung entsprechend aktualisiert. Informationen von Stripe: https://stripe.com/de/privacy . Geben Sie im Testbetrieb keine echten Zahlungsdaten ein.

## 7. Cookies, Messung und Konten

Auf der öffentlichen Firmenwebsite setzen wir keine Marketing-Cookies und keine externen Analyse- oder Werbedienste ein. Schriftarten werden lokal ausgeliefert. Der interne Admin verwendet ein notwendiges Sitzungscookie für die Anmeldung und Zugriffssicherung; Grundlage sind Art. 6 Abs. 1 lit. f DSGVO und § 25 Abs. 2 TDDDG. Es wird kein allgemeines Kundenkonto auf der Firmenwebsite angeboten.

Briefakquise, personalisierte Demo-Messung und automatische KI-Verarbeitung sind noch nicht gestartet. Vor einer Aktivierung sind insbesondere Informationen nach Art. 14 DSGVO, Widerspruchswege, Löschfristen und eine etwaige Einwilligung für nicht notwendige Endgerätezugriffe gesondert zu prüfen. Diese Erklärung behauptet keine bereits durchgeführte rechtliche Freigabe dieser Funktionen.

## 8. Aufbewahrung und Löschung

Personenbezogene Daten werden nur so lange aufbewahrt, wie der jeweilige Zweck oder gesetzliche Pflichten dies erfordern. Unverbindliche Anfragen werden nach Abschluss auf fortbestehenden Bedarf geprüft und gelöscht, sofern keine Vertrags- oder Nachweisgründe entgegenstehen. Für Geschäftsbriefe gelten grundsätzlich sechs Jahre, für Buchungsbelege grundsätzlich acht Jahre und für bestimmte steuerliche Aufzeichnungen zehn Jahre; abweichende gesetzliche Fristen und offene Verfahren bleiben vorbehalten. Die konkrete Einordnung erfolgt nach Dokumentart. Ein automatischer Lösch-Worker läuft derzeit nicht; notwendige Löschungen sind bis zu dessen Einrichtung manuell vorzunehmen. Auch Kopien in Dienstleisterpostfächern sind dabei zu berücksichtigen.

## 9. Ihre Rechte

Bei Vorliegen der gesetzlichen Voraussetzungen haben Sie Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung und Datenübertragbarkeit. Eine Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Bei einer Verarbeitung aufgrund berechtigter Interessen können Sie aus Gründen Ihrer besonderen Situation widersprechen; gegen Direktwerbung jederzeit. Eine Anfrage ist über die unter Ziffer 1 genannten Kontaktwege möglich.

Sie können sich bei einer Datenschutzaufsichtsbehörde beschweren. Für private Unternehmen in Bayern ist insbesondere das Bayerische Landesamt für Datenschutzaufsicht zuständig: https://www.lda.bayern.de . Die Bereitstellung von Kontaktdaten erfolgt grundsätzlich freiwillig; ohne erforderliche Angaben können wir eine Anfrage oder einen Vertrag gegebenenfalls nicht bearbeiten. Wir treffen keine ausschließlich automatisierten Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung nach Art. 22 DSGVO.

## 10. Prüfstand

Dies ist eine Arbeitsfassung für den beschriebenen Aufbau. Noch offen sind insbesondere die Bestätigung der Dienstleisterverträge, der accountabhängigen Log-/Postfachfristen und der Steuer-/Verkaufsaktivierung. Die endgültige Fassung muss der dann tatsächlich verwendeten Konfiguration entsprechen.
`,
    termsMarkdown:
      cfg.offers.activeVersion === 'v4'
        ? `# Vertragsbedingungen – SeitenWerk V4

${draft}

Anbieterin: ${contact}. Das Angebot richtet sich ausschließlich an Unternehmer (§ 14 BGB).

## Leistungen und Preise

SeitenWerk Basis: ${p.oneTime} einmalig für Erstellung, Anpassung, Standard-Domain im vereinbarten Kostenrahmen, Einrichtung und ${cfg.onboarding.includedChangeRounds} Änderungsrunden; dazu ${p.basis}/Monat für Hosting, SSL und Basis-Support bei Betriebsstörungen.

SeitenWerk Care+: ebenfalls ${p.oneTime} einmalig, dazu insgesamt ${p.carePlus}/Monat einschließlich sämtlicher Basisleistungen, Monitoring, monatlichem Technik-Check, persönlichem Support und bis zu 60 Minuten kleinen, vereinbarten Text-/Bildänderungen pro Monat. Keine zusätzliche Basisgebühr. Größere Umbauten, neue Funktionen und Programmierarbeiten erfordern ein gesondert bestätigtes Angebot. Ungenutzte Minuten werden nicht übertragen.

Rechnerische Übersicht bei zwölf vollständig berechneten Monaten: Basis ${formatEuroShort(v4FirstYearCents('basis'))}, Care+ ${formatEuroShort(v4FirstYearCents('care_plus'))}. Dies ist keine Vorauszahlungs- oder Mindestlaufzeitverpflichtung. Der Steuerstatus ist ungeklärt und muss vor verbindlichen Bestellungen geklärt werden; keine Umsatzsteuerbefreiung wird zugesichert.

## Beginn und Zustimmung

Die Einmalzahlung wird beim Kauf fällig. Monatsgebühren dürfen erst nach tatsächlichem, vereinbartem Go-Live beginnen. Die Monatsabrechnung beginnt erst nach dem tatsächlich bestätigten Go-Live, ohne Rückdatierung. Der Kunde stimmt dem gewählten monatlichen Tarif beim Kauf ausdrücklich zu. Mit gesonderter Mandatszustimmung wird das bei Stripe gespeicherte Zahlungsmittel wiederkehrend belastet. Ältere Bestellungen mit separatem Abo-Checkout behalten ihr vereinbartes Verfahren. Bei SEPA müssen ein wirksames Mandat und eine passende Vorabankündigung vorliegen. Es gibt keine zwölfmonatige kostenlose Hostingphase und keine automatische vorzeitige Monatsabbuchung.

## Kündigung, Wechsel und Domain

Basis und Care+ sind monatlich zum Ende des laufenden Abrechnungszeitraums kündbar, über den privaten Kundenlink oder in Textform an ${email}. Es gibt keine zwölfmonatige Mindestlaufzeit. Kündigungsbedingungen sind vor Livebetrieb rechtlich freizugeben. Tarifwechsel benötigen eine ausdrückliche Bestätigung, werden grundsätzlich zum nächsten Periodenende vorbereitet und lösen kein zweites Abo aus. Keine automatische anteilige Nachbelastung. Die Domain wird auf den Kunden registriert und kann nach Vertragsende mittels verfügbarem Auth-Code ohne zusätzliche Bearbeitungsgebühr übertragen werden; externe Anbietergebühren bleiben gesondert. Hosting endet nach Vertragsende, nach rechtzeitiger Übergabemöglichkeit für Kundendaten.

## Inhalte, Mängel und Haftung

Kunden liefern rechtmäßige Inhalte, Bildrechte und erforderliche Rechtsangaben und geben die Vorschau frei. Veröffentlichung ohne nachgewiesene Freigabe findet nicht statt. Für Mängel und Haftung gelten die gesetzlichen Vorschriften; kein pauschaler Ausschluss für Vorsatz, grobe Fahrlässigkeit oder Gesundheitsschäden. Nutzungsrechte an den vereinbarten Arbeitsergebnissen werden im erforderlichen Umfang eingeräumt; allgemeine Werkzeuge und Vorlagen werden nicht exklusiv übertragen. Es gibt keine Erfolgs-, Umsatz- oder Rankinggarantie.

## Datenschutz, Garantie und Freigabe

Kunden-Kontaktformulare erfordern vor Aktivierung eine gesonderte Vereinbarung nach Art. 28 DSGVO. Vorgesehen sind ${cfg.guarantee.days} Tage freiwillige Einrichtungsgarantie ab bestätigtem Go-Live. Vorher läuft keine Garantiefrist ab. Innerhalb der Frist genügt eine formlose Nachricht an ${email}: Die Einrichtungsgebühr wird erstattet, das Abo beendet und die Website offline genommen. Bereits erbrachte Monatsleistungen sind nicht Teil dieser freiwilligen Einrichtungsgarantie; gesetzliche Ansprüche bleiben unberührt. Dieser Umfang bedarf noch der ausdrücklichen Betreiber- und rechtlichen Freigabe. Bestehende Legacy-Verträge bleiben unverändert. Diese Arbeitsfassung ist keine anwaltlich geprüfte oder für echten Verkauf freigegebene Vertragsfassung.
`
        : `# Allgemeine Geschäftsbedingungen

${draft}

## 1. Anbieterin und Geltungsbereich

Anbieterin ist ${contact}, E-Mail: ${email}. Das Angebot richtet sich ausschließlich an Unternehmer im Sinne des § 14 BGB, die für ihre gewerbliche oder selbständige berufliche Tätigkeit bestellen. Verbraucherbestellungen werden nicht angeboten. Individuelle Vereinbarungen gehen diesen Bedingungen vor.

## 2. Kostenlose Entwürfe und Vertragsschluss

Eine kostenlos bereitgestellte Demo begründet für sich weder einen Vertrag noch eine Zahlungspflicht. Vor einer Bestellung werden Leistungsumfang, Preisoption und diese Bedingungen zugänglich gemacht. Ein Vertrag kommt erst durch unsere ausdrückliche Auftragsbestätigung in Textform zustande; eine bloße technische Eingangs- oder Zahlungsbestätigung ist keine zusätzliche Leistungszusage. Vor Aktivierung des Checkouts muss dessen tatsächlicher Ablauf dieser Regelung entsprechen. Derzeit ist ausschließlich Testbetrieb vorgesehen.

## 3. Leistungsumfang

Wir erstellen eine Website auf Grundlage des vereinbarten Entwurfs und der Kundendaten. Enthalten sind die vereinbarte Domain, Hosting mit TLS-Verschlüsselung und bis zu ${cfg.onboarding.includedChangeRounds} Änderungsrunden vor der Veröffentlichung. Maßgeblich ist die konkrete Leistungsbeschreibung. Zusätzliche Seiten, Funktionen und fortlaufende inhaltliche Änderungen bedürfen einer gesonderten Vereinbarung. Bestimmte Suchmaschinenpositionen, Besucherzahlen oder Umsätze werden nicht geschuldet.

Der Kunde liefert erforderliche Inhalte, rechtliche Angaben und Freigaben rechtzeitig. Er sichert zu, die nötigen Nutzungsrechte an bereitgestellten Materialien zu besitzen. KI-unterstützt erstellte Inhalte und kenntlich gemachte Beispielbilder sind vor der Veröffentlichung gemeinsam zu prüfen; kundenspezifische Tatsachen und Rechte dürfen nicht erfunden werden. Veröffentlichung erfolgt nach Freigabe der Vorschau. Gesetzliche Abnahmeregelungen bleiben unberührt; bloßes Schweigen gilt nicht pauschal als Freigabe.

## 4. Preisoptionen

Einmalpaket: ${p.oneTime} einmalig, einschließlich Domain und ${p.hostingMonths} Monaten Hosting ab Veröffentlichung. Danach kann Hosting und Pflege für ${p.follow} monatlich gesondert vereinbart werden. Dieses Folgeangebot wird nicht ohne Zustimmung gebucht.

Monatspaket: ${p.monthly} monatlich, erste Rate bei Vertragsschluss; Mindestlaufzeit ${p.minTerm} Monate ab Vertragsschluss. Die Mindestvergütung der ersten ${p.minTerm} Monate entspricht ${p.monthly} multipliziert mit ${p.minTerm}. Anschließend reduziert sich der Preis auf ${p.follow} monatlich und der Vertrag läuft bis zur Kündigung weiter.

Der Umsatzsteuerstatus der Anbieterin ist noch zu klären. Deshalb sind diese Preisangaben noch nicht als endgültige steuerliche Vertragsangaben freigegeben. Ob Umsatzsteuer erhoben wird und welcher Gesamtbetrag gilt, muss vor einer verbindlichen Bestellung eindeutig angegeben werden. Eine Änderung des Steuerstatus ändert bestehende vereinbarte Gesamtpreise nicht automatisch.

## 5. Zahlung und Rechnungen

Es gelten die bei Bestellung ausdrücklich angebotenen Zahlungsarten. Für jede Zahlung wird eine Rechnung bereitgestellt. Zahlungen werden über Stripe verarbeitet. Bei SEPA muss vor dem ersten Einzug ein wirksames Mandat und eine Vorabankündigung mit dem Kunden vereinbart sein. Bis dies eingerichtet ist, wird SEPA nicht als verfügbar zugesagt. Zahlungsverzug und Verzugsfolgen richten sich nach den gesetzlichen Vorschriften; es gibt keine pauschale automatische Fälligstellung sämtlicher zukünftiger Raten durch diese AGB.

## 6. Laufzeit und Kündigung

Das Monatspaket kann mit einer Frist von einem Monat zum Ende der Mindestlaufzeit, danach mit einer Frist von einem Monat zum Ende eines Vertragsmonats gekündigt werden. Kündigung ist in Textform an ${email} möglich. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Für ein nach dem Einmalpaket gesondert vereinbartes Hosting-Abonnement gelten ebenfalls monatliche Laufzeit und Kündigung mit einem Monat Frist, soweit nichts anderes individuell vereinbart ist.

Nach Vertragsende endet die Hostingpflicht. Rechtzeitig vor Abschaltung wird Gelegenheit zur Sicherung der kundeneigenen Inhalte und zur Domainübertragung gegeben. Die Domain wird auf den Kunden registriert; auf Wunsch stellen wir einen verfügbaren Auth-Code ohne zusätzliche Bearbeitungsgebühr bereit. Gebühren des neuen Anbieters sind nicht eingeschlossen. Ohne Verlängerungsauftrag wird die Domain nicht weiter verlängert.

## 7. Zufriedenheitsgarantie

Zusätzlich zu gesetzlichen Rechten ist eine freiwillige Garantie von ${cfg.guarantee.days} Tagen vorgesehen. Ihr Beginn ist die Veröffentlichung, spätestens der ${cfg.guarantee.latestStartDays}. Tag nach Zahlung. Die Garantie kann innerhalb der Frist formlos per E-Mail an ${email} geltend gemacht werden. Beim Einmalpaket wird der Einmalbetrag, beim Monatspaket die erste Monatsrate erstattet; der Vertrag endet und die Website wird offline genommen. Die Domain kann auf Wunsch wie in Ziffer 6 übertragen werden. Gesetzliche Mängel- und Erstattungsansprüche werden nicht eingeschränkt. Die technische Fristberechnung und Behandlung einer von uns verursachten Verzögerung sind vor Verkaufsfreigabe abschließend abzugleichen.

## 8. Nutzungsrechte und Betrieb

Nach vollständiger Zahlung der geschuldeten Vergütung erhält der Kunde die für die vertragsgemäße Nutzung seiner Website erforderlichen Nutzungsrechte an unseren hierfür erstellten Arbeitsergebnissen. Rechte Dritter, etwa an Schriftarten, Softwarebibliotheken oder Bildern, richten sich nach deren jeweiligen Lizenzen. Rechte an vorbestehenden allgemeinen Werkzeugen und Vorlagen werden nicht exklusiv übertragen. Eine Übertragung des gesamten Generators oder seiner Quelltexte ist nicht Teil des Websitepakets.

Hosting wird mit angemessenen technischen und organisatorischen Maßnahmen betrieben. Eine unterbrechungsfreie Verfügbarkeit oder ein bestimmtes Verfügbarkeitsprozent wird nicht zugesichert. Wartungsarbeiten und Störungen sind nach Möglichkeit zu begrenzen. Bei erheblichen Pflichtverletzungen bleiben gesetzliche Ansprüche unberührt. Eine Sperrung wegen Zahlungsrückständen setzt die gesetzlichen Voraussetzungen, eine vorherige Ankündigung und eine angemessene Möglichkeit zur Abhilfe voraus; unberechtigte Forderungen rechtfertigen keine Sperrung.

## 9. Datenschutz und Auftragsverarbeitung

Unsere Verarbeitung eigener Kontakt- und Vertragsdaten beschreibt die Datenschutzerklärung. Soweit wir personenbezogene Daten im Auftrag des Kunden verarbeiten, insbesondere über ein Kontaktformular auf seiner Website, muss vor dessen Aktivierung eine Vereinbarung nach Art. 28 DSGVO abgeschlossen werden. Ein bloßer Hinweis in diesen AGB ersetzt diese Vereinbarung nicht. Ohne passende Vereinbarung werden solche Funktionen nicht freigeschaltet.

## 10. Mängel und Haftung

Für Mängel gelten die gesetzlichen Vorschriften. Bitte teilen Sie festgestellte Fehler nachvollziehbar mit, damit wir sie prüfen und beheben können. Wir haften unbeschränkt bei Vorsatz, grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit und soweit zwingendes Recht dies verlangt. Bei einfach fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt. Wesentlich sind Pflichten, deren Erfüllung die ordnungsgemäße Vertragsdurchführung erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertrauen darf. Im Übrigen ist die Haftung für einfache Fahrlässigkeit ausgeschlossen. Die Haftung nach dem Produkthaftungsgesetz und für ausdrücklich übernommene Garantien bleibt unberührt.

## 11. Änderungen und Schlussregelungen

Vertragsänderungen bedürfen einer Vereinbarung; wir ändern Preise oder Leistungen laufender Verträge nicht allein durch Änderung dieser Website. Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts; zwingende gesetzliche Vorschriften bleiben unberührt. Es gelten die gesetzlichen Gerichtsstände. Eine unwirksame Bestimmung wird nicht durch eine frei erfundene wirtschaftlich ähnliche Klausel ersetzt; die gesetzlichen Regelungen treten an ihre Stelle.

## 12. Noch keine Verkaufsfreigabe

Diese Arbeitsfassung wird nicht automatisch zur freigegebenen Checkout-Fassung. Vor echtem Verkauf sind Steuerangaben, tatsächliche Vertragsannahme, Kündigungs-/Garantieablauf, Auftragsverarbeitung und die technische Zahlungsabwicklung abzugleichen. Die allgemeinen Live-Sperren bleiben aktiv.
`,
  };
}
