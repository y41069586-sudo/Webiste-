import { formatEuroShort, v4FirstYearCents, type AppConfig } from '@wbm/core';
import { sitePricing } from './site';

/** Own working texts based on confirmed facts. Never silently approve these for live checkout. */
export function legalDrafts(cfg: AppConfig) {
  const s = cfg.sender;
  const p = sitePricing(cfg);
  const required = (value: string, label: string) => value.trim() || `TODO: ${label} ergänzen`;
  const contact = `${required(s.name, 'vollständiger Vor- und Nachname')}, handelnd unter „${required(s.company, 'Geschäftsbezeichnung')}“, ${required(s.street, 'Straße und Hausnummer')}, ${required(s.postalCode, 'Postleitzahl')} ${required(s.city, 'Ort')}, Deutschland`;
  const email = required(s.email, 'Kontakt-E-Mail');
  const draft =
    '**Entwurf, Stand 25.10.2026. Der Verkauf ist noch nicht freigeschaltet. Steuerstatus, Vertragsabwicklung und Dienstleisterkonfiguration werden vor dem Verkaufsstart abschließend geprüft.**';
  return {
    impressumMarkdown: `# Impressum

## Anbieterin gemäß § 5 DDG

${required(s.company, 'Geschäftsbezeichnung')}

Inhaberin: ${required(s.name, 'vollständiger Vor- und Nachname')} (Einzelunternehmen)

${required(s.street, 'ladungsfähige Straße und Hausnummer')}

${required(s.postalCode, 'Postleitzahl')} ${required(s.city, 'Ort')}

Deutschland

## Kontakt

Telefon: ${required(s.phone, 'Telefonnummer')}

E-Mail: ${email}

Kein Handelsregistereintrag. ${s.vatId ? `Umsatzsteuer-Identifikationsnummer: ${s.vatId}.` : 'TODO: Prüfen, ob eine Umsatzsteuer-Identifikationsnummer zugeteilt wurde; nur eine tatsächlich vorhandene Nummer ergänzen.'} TODO: Wirtschafts-Identifikationsnummer prüfen und bei erfolgter Zuteilung ergänzen. Die persönliche Steuernummer wird hier nicht veröffentlicht.

## Angebot

Erstellung und Betreuung von Websites für Unternehmer. Die Website enthält keine journalistisch-redaktionellen Angebote.
`,
    privacyMarkdown: `# Datenschutzerklärung

Stand: 25. Oktober 2026

## 1. Verantwortliche und Kontakt

${contact}. E-Mail: ${email}; Telefon: ${required(s.phone, 'Telefonnummer')}. An diese Kontaktdaten können Sie auch Datenschutzanfragen richten.

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

## 10. Unternehmensrecherche, Entwürfe und Postwerbung

Für den noch nicht freigegebenen Akquiseprozess sind Firmenname, Branche, öffentlich bekannte Leistungen, Geschäftsanschrift, geschäftliche Kontaktdaten und der überprüfte Website-Status vorgesehen. Quellen sind insbesondere OpenStreetMap und manuell geprüfte öffentliche Unternehmensangaben; die konkrete Quelle wird pro Datensatz dokumentiert. Nicht jede Unternehmensangabe ist personenbezogen. Bei Einzelunternehmen und Ansprechpersonen kann Personenbezug bestehen. Keine privaten oder sensiblen Informationen für Akquise verwenden.

Soweit nach dokumentierter Interessenabwägung zulässig, ist Grundlage Art. 6 Abs. 1 lit. f DSGVO mit dem Interesse, passenden Betrieben einen unverbindlichen Website-Entwurf postalisch anzubieten. Vor dem ersten Kontakt müssen die Informationen nach Art. 14 DSGVO einschließlich konkreter Datenquelle, Kategorien, Empfängern und Speicherdauer bereitgestellt werden, grundsätzlich spätestens binnen eines Monats nach Erhebung. Diese allgemeine Erklärung ersetzt den konkreten Hinweis beim Brief nicht. Der Prozess und die Versandfreigabe sind noch offen.

**Sie können der Verarbeitung Ihrer personenbezogenen Daten zu Direktwerbezwecken jederzeit ohne Begründung widersprechen. Kontakt: ${email}. Nach einem Werbewiderspruch werden die Daten nicht mehr für Direktwerbung verarbeitet.** Zur Verhinderung weiterer Kontaktaufnahme kann ein minimaler gesperrter Abgleichwert aufbewahrt werden. Es werden keine unaufgeforderten Werbe-E-Mails, Anrufe oder WhatsApp-Nachrichten versendet.

## 11. LetterXpress und postalische Dienstleister

LetterXpress ist als Druck- und Versanddienst vorbereitet, wird jedoch durch diesen Testbetrieb nicht mit echten Briefen beauftragt. Anbieter ist A&O Fischer GmbH & Co. KG, Maybachstraße 9, 21423 Winsen (Luhe), Deutschland. Erst nach gesonderter Freigabe würden Empfängername und Postanschrift, Absenderangaben, Brief-PDF einschließlich Website-Screenshot und personalisierter Zieladresse sowie Auftrags-/Versanddaten für Druck, Kuvertierung und Postzustellung übermittelt. Zustelldienste erhalten die zur Beförderung erforderlichen Daten. Grundlage ist je nach Briefzweck Art. 6 Abs. 1 lit. b, c oder f DSGVO; die Interessen bei Werbung entsprechen Ziffer 10. Informationen: https://www.letterxpress.de/datenschutzerklaerung . TODO vor Beauftragung: konkrete AV-Vereinbarung, Unterauftragnehmer, Lösch-/Archivfristen und Rollenverteilung mit den Postdiensten dokumentieren. Ein bloßes Dienstleisterkonto ist keine Versandfreigabe.

## 12. KI-Unterstützung und Bildmaterial

Die Demo-Erstellung verfügt über eine vorbereitete Anthropic-API-Anbindung; die lokale Abnahme nutzt Mock- und Fallback-Inhalte. Bei gesonderter Aktivierung würden erforderliche verifizierte Geschäftsinformationen und Textanweisungen an den jeweiligen Anthropic-Vertragspartner übermittelt, um einen Entwurf zu erstellen. Keine Zahlungsdaten, Zugangsdaten oder ungeprüften privaten Informationen gehören in diese Anfragen. Rechtsgrundlage ist je nach Auftrag Art. 6 Abs. 1 lit. b oder nach dokumentierter Abwägung lit. f DSGVO. Inhalte werden vor Freigabe geprüft; es gibt keine ausschließlich automatisierten Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung.

TODO vor Aktivierung: Vertragspartner, AV-Vertrag, internationale Übermittlungsgrundlage und modell-/accountabhängige Aufbewahrung festlegen; keine pauschale Zero-Retention-Zusage. Informationen: https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data . Beispielbilder werden lokal ausgeliefert und gekennzeichnet; der Besuch muss nicht automatisch einen externen Bildanbieter kontaktieren. Fremde Betriebsbilder werden nicht als Kundenprojekte ausgegeben.

## 13. Personalisierte Links, Messung und Kundenprojekte

Personalisierte Demo- und Kurzlinks können einem konkreten Entwurf zugeordnet werden. Aufrufe solcher Links können technisch Zeitpunkt, Ziel und Sicherheits-/Gerätedaten zur Auslieferung und Missbrauchsabwehr erzeugen. Ein Linkaufruf belegt weder einen QR-Scan noch eine Kaufabsicht oder eine bestimmte natürliche Person. Das optionale Engagement-Tracking ist standardmäßig deaktiviert und benötigt eine gesonderte technische und rechtliche Freigabe. Kein Fingerprinting und keine Marketing-Cookies werden durch diese Erklärung erlaubt.

Kundenseiten erhalten eigene Pflichtinformationen des jeweiligen Kunden. Eine spätere Registrierung über INWX oder zusätzliches Kundenhosting über Cloudflare ist vorbereitet, aber nicht durch diesen Testbetrieb aktiviert. TODO vor Aktivierung: tatsächliche Empfänger, erforderliche Domaininhaberdaten, Vertragsrollen und Übermittlungen ergänzen. Diese Erklärung behauptet keine Nutzung sämtlicher im Quellcode vorhandener Provider.

## 14. Übermittlungen, Pflichtangaben und Rückfragen

Einige Anbieter verarbeiten Daten außerhalb des EWR. Eine solche Übermittlung setzt eine tatsächlich anwendbare Grundlage nach Art. 44 ff. DSGVO voraus, beispielsweise einen einschlägigen Angemessenheitsbeschluss oder vereinbarte Standardvertragsklauseln mit erforderlichen ergänzenden Maßnahmen. TODO: die auf unseren konkreten Account anwendbare Grundlage je Anbieter dokumentieren. Informationen über die maßgeblichen Garantien oder verfügbare Kopien können über ${email} angefragt werden. Wir behaupten keine pauschale Zertifizierung oder ausschließlich europäische Verarbeitung.

Kontaktdaten für allgemeine Fragen werden freiwillig angegeben; ohne notwendige Angaben kann eine Anfrage nicht beantwortet werden. Bei verbindlicher Beauftragung sind die zur Vertragserfüllung und Rechnung erforderlichen Daten bereitzustellen; sonst ist eine Durchführung nicht möglich. Weitere freiwillige Angaben sind als solche zu behandeln. Für eine Zweckänderung werden erforderliche Informationen vorab bereitgestellt.

## 15. Prüfstand

Dies ist eine Arbeitsfassung für den beschriebenen Aufbau. Noch offen sind insbesondere die Bestätigung der Dienstleisterverträge, der accountabhängigen Log-/Postfachfristen und der Steuer-/Verkaufsaktivierung. Die endgültige Fassung muss der dann tatsächlich verwendeten Konfiguration entsprechen.
`,
    termsMarkdown:
      cfg.offers.activeVersion === 'v4'
        ? `# Vertragsbedingungen – SeitenWerk V4

${draft}

Anbieterin: ${contact}. Das Angebot richtet sich ausschließlich an Unternehmer (§ 14 BGB).

## 1. Geltungsbereich und Testbetrieb

Diese Bedingungen gelten für die Erstellung und den anschließenden technischen Betrieb der vereinbarten Website. Bestellungen sind ausschließlich für Unternehmer im Sinne von § 14 BGB für deren berufliche oder gewerbliche Tätigkeit vorgesehen. Individuelle Vereinbarungen haben Vorrang. Testentwürfe und Sandbox-Zahlungen begründen keine kostenpflichtige Bestellung. Derzeit sind echte Bestellungen gesperrt.

## 2. Entwurf, Bestellung und Vertragsschluss

Die Demo dient der unverbindlichen Ansicht; ihr Aufruf erzeugt keine Zahlungspflicht. Vor Bestellung werden Tarif, Einmalpreis, Folgekosten, Leistungsumfang und diese Bedingungen angezeigt. Der Kunde kann Angaben vor Abgabe der Bestellung prüfen und korrigieren. Die Bestellung erfolgt über den gehosteten Stripe-Checkout unter ausdrücklicher Bestätigung der Unternehmereigenschaft und AGB. Maßgeblich bleibt der bei Bestellung gespeicherte Angebots- und Bedingungsstand.

TODO vor Verkaufsfreigabe: Den rechtlichen Annahmezeitpunkt mit der tatsächlich automatisch versandten Bestellbestätigung verbindlich festlegen und den Checkout entsprechend abgleichen. Die technische Verbuchung nach bestätigter Zahlung allein ersetzt diese Festlegung nicht. Die Vertragssprache ist Deutsch. Eine Bestellbestätigung und die maßgeblichen Vertragsinformationen werden in Textform bereitgestellt; eine dauerhaft unbegrenzte Abrufbarkeit wird nicht zugesagt. Ein Telefonat oder persönlicher Termin ist keine Bestellvoraussetzung.

## 3. Leistungsumfang und Mitwirkung

Geliefert wird eine Website auf Grundlage des ausgewählten Entwurfs mit den vereinbarten Seiten und Funktionen. Enthalten sind Einrichtung, Anpassung anhand der Kundendaten und ${cfg.onboarding.includedChangeRounds} abgestimmte Änderungsrunden vor Veröffentlichung. Neue Funktionen, zusätzliche Seiten, größere Umbauten und Leistungen außerhalb des vereinbarten Umfangs bedürfen eines gesondert bestätigten Angebots.

Der Kunde liefert zutreffende Unternehmens-, Kontakt- und Rechtsangaben sowie rechtmäßig nutzbare Inhalte und Fotos. Er prüft Texte, Leistungsbeschreibungen und Bilder vor Veröffentlichung. Gekennzeichnete Beispielinhalte und Beispielfotos sind keine Behauptung über den Betrieb. KI-Unterstützung ersetzt weder die Faktenprüfung noch eine erforderliche rechtliche Prüfung. Personenbilder, Zertifizierungen, Bewertungen und Referenzen werden nicht erfunden.

## 4. Preise und steuerliche Angaben

Basis: ${p.oneTime} einmalige Einrichtung zuzüglich ${p.basis} monatlich für Hosting, SSL und technischen Basis-Support bei Betriebsstörungen.

Care+: ${p.oneTime} einmalige Einrichtung dazu insgesamt ${p.carePlus}/Monat. Die Basisleistung ist vollständig enthalten; es werden keine weiteren ${p.basis} zusätzlich berechnet.

Rechnerische Übersicht bei zwölf vollständig berechneten Monaten: Basis ${formatEuroShort(v4FirstYearCents('basis'))}, Care+ ${formatEuroShort(v4FirstYearCents('care_plus'))}. Dies begründet keine Mindestlaufzeit oder Vorauszahlungspflicht.

**TODO: Der Steuerstatus ist ungeklärt. Vor verbindlichen Bestellungen sind Steuerbehandlung, Umsatzsteuerausweis und tatsächlich geschuldeter Gesamtpreis festzulegen. Es wird keine Steuerbefreiung nach § 19 UStG zugesichert.** Änderungen des Steuerstatus ändern bestehende vereinbarte Gesamtpreise nicht automatisch.

## 5. Zahlung und Beginn der Monatsabrechnung

Die Einrichtungsgebühr ist nach dem verbindlich festgelegten Vertragsschluss über Stripe per angebotener Kartenzahlung zu zahlen. Banküberweisung wird derzeit nicht angeboten. Für bestätigte Zahlungen werden Rechnungen bereitgestellt. Fehlgeschlagene oder noch ausstehende Zahlungen gelten nicht als Zahlungseingang.

Die Monatsabrechnung beginnt erst nach dem tatsächlich bestätigten Go-Live, nach bestätigter Einrichtungszahlung und ausdrücklicher Tarifzustimmung, ohne Rückdatierung. Der Kunde stimmt der Speicherung und wiederkehrenden Belastung des Zahlungsmittels im dafür vorgesehenen Checkout ausdrücklich zu. Ältere Bestellungen mit gesondertem Abo-Abschluss behalten das vereinbarte Verfahren. Eine offene Zahlungsbestätigung löst kein zusätzliches Abonnement aus.

## 6. Domain und Hosting

Enthalten ist eine verfügbare Standard-.de-Domain im vereinbarten Kostenrahmen von ${formatEuroShort(cfg.checkout.maxDomainPriceCents)} pro Jahr. Premiumdomains, zusätzliche Domains und kostenpflichtige Sonderleistungen werden nur nach gesonderter Zustimmung bestellt. Die Domain wird auf den Kunden als Inhaber registriert. Verfügbarkeit und Rechte Dritter müssen vor Registrierung geprüft werden; ein bloßer Domainwunsch ist keine Registrierungszusage.

Hosting umfasst die Bereitstellung der vereinbarten Website mit TLS-Verschlüsselung. Eine hundertprozentige oder unterbrechungsfreie Verfügbarkeit wird nicht zugesichert. Erforderliche Wartung und externe Störungen sind möglich; gesetzliche Rechte bei Leistungsmängeln bleiben bestehen. TODO vor Livebetrieb: tatsächlich eingesetzte Hostinganbieter, Wartungs-/Sicherungsumfang und Reaktionswege verbindlich dokumentieren.

## 7. Betreuung und Care+

Basis-Support betrifft technische Störungen im vereinbarten Leistungsbereich. Laufende Text- und Bildänderungen sind im Basistarif nicht pauschal enthalten. Care+ umfasst zusätzlich Monitoring, monatlichen Technik-Check, persönlichen schriftlichen Support und bis zu 60 Minuten kleinere, abgestimmte Inhaltsänderungen pro Monat. Nicht verbrauchte Zeit wird nicht übertragen oder ausgezahlt. Größere Umgestaltungen und neue Funktionen sind ausgenommen. Zusatzkosten entstehen erst nach gesonderter Zustimmung. TODO: konkrete Supportzeiten und Reaktionsziele vor Vertragsstart festlegen; keine sofortige oder durchgehende Erreichbarkeit zugesichert.

## 8. Fertigstellung, Prüfung und Veröffentlichung

Termine werden nach Vorliegen der benötigten Inhalte und Freigaben vereinbart. Fehlende Mitwirkung kann den Zeitplan entsprechend verschieben, ohne eine fingierte Abnahme oder vorzeitige monatliche Abrechnung zu bewirken. Gesetzliche Regeln zu Verzug und Mitwirkung bleiben unberührt.

Der Kunde erhält eine Vorschau zur Prüfung und meldet Abweichungen nachvollziehbar. Veröffentlicht wird erst nach seiner ausdrücklichen Freigabe und Erfüllung der technischen, rechtlichen und betrieblichen Voraussetzungen. Bloßes Schweigen gilt nicht pauschal als Freigabe. Gesetzliche Abnahmeregelungen und Rechte bei Mängeln bleiben unberührt.

## 9. Laufzeit, Kündigung und Tarifwechsel

Basis und Care+ sind ohne zwölfmonatige Mindestbindung monatlich zum Ende des laufenden Abrechnungszeitraums kündbar, über den privaten Kundenlink oder in Textform an ${email}. Die bestätigte Kündigung beendet künftige Monatsabrechnungen zum vereinbarten Ende. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt bestehen.

Tarifwechsel werden ausdrücklich vereinbart und grundsätzlich zum nächsten Periodenende ohne automatische anteilige Nachbelastung umgesetzt. Es entsteht kein zweites Abonnement. Eine Änderung von Preisen oder Leistungen laufender Verträge erfolgt nicht allein durch Änderung dieser Website.

## 10. Übergabe bei Vertragsende und Nutzungsrechte

Nach vollständiger Zahlung erhält der Kunde die zur vereinbarten Nutzung erforderlichen Rechte an den individuell erstellten Arbeitsergebnissen. Allgemeine Vorlagen, Werkzeuge, Generatorsoftware und Rechte Dritter werden nicht exklusiv übertragen. Lizenzen von Schriftarten, Software und Bildern sind einzuhalten.

Vor Abschaltung wird Gelegenheit zur Sicherung der kundeneigenen Inhalte und zur Domainübertragung gegeben. Ein verfügbarer Auth-Code wird ohne zusätzliche eigene Bearbeitungsgebühr bereitgestellt; externe Gebühren bleiben gesondert. Ein neuer Anbieter benötigt eine technisch kompatible Hostingumgebung; deren Einrichtung ist nicht automatisch enthalten. TODO: Umfang und Format des Website-Exports vor Vertragsabschluss ausdrücklich festlegen. Ohne Verlängerungsauftrag erfolgt keine weitere Domainverlängerung durch uns. Eine Kündigung löscht nicht gesetzlich aufzubewahrende Vertragsdaten.

## 11. Freiwillige Einrichtungsgarantie

Vorgesehen sind ${cfg.guarantee.days} Tage Einrichtungsgarantie ab tatsächlichem bestätigtem Go-Live. Vorher läuft keine Garantiefrist ab. Eine formlose Nachricht an ${email} innerhalb dieser Frist genügt. Die Einrichtungsgebühr wird erstattet, das Monatsabo beendet und die Website offline genommen. Bereits erbrachte Monatsleistungen sind nicht Teil dieser freiwilligen Einrichtungsgarantie. Gesetzliche Mängel- und Erstattungsansprüche bleiben uneingeschränkt bestehen. TODO: diesen genauen Garantieumfang vor Livebetrieb ausdrücklich freigeben. Alte Verträge behalten ihre gespeicherten Bedingungen.

## 12. Zahlungsverzug, Mängel und Haftung

Zahlungsverzug und Verzugsfolgen richten sich nach den gesetzlichen Voraussetzungen. Eine notwendige Sperrung setzt eine berechtigte Forderung, vorherige Ankündigung und angemessene Möglichkeit zur Abhilfe voraus. Es gibt keine pauschale sofortige Fälligstellung nicht vereinbarter künftiger Raten und kein automatisches Inkasso durch diese Bedingungen.

Für Mängel gelten die gesetzlichen Vorschriften. Die Haftung richtet sich nach den gesetzlichen Regelungen; insbesondere wird sie für Vorsatz, grobe Fahrlässigkeit sowie Schäden an Leben, Körper oder Gesundheit nicht ausgeschlossen. Eine bestimmte Anzahl von Anfragen, Umsätze, Suchmaschinenpositionen oder geschäftlicher Erfolg werden nicht garantiert.

## 13. Datenschutz und Schlussbestimmungen

Unsere Verarbeitung von Kontakt- und Vertragsdaten wird in der Datenschutzerklärung beschrieben. Verarbeiten wir Daten im Auftrag des Kunden, etwa über ein Kontaktformular seiner Website, ist vor Aktivierung eine Vereinbarung nach Art. 28 DSGVO erforderlich. Ein Verweis in diesen AGB ersetzt sie nicht.

Es gilt deutsches Recht unter Beachtung zwingender Vorschriften; die gesetzlichen Gerichtsstände bleiben bestehen. Unwirksame Klauseln werden durch die gesetzlichen Regelungen ersetzt. Diese Fassung wird nicht automatisch als freigegebener Checkout-Vertrag gespeichert. TODOs, gegebenenfalls erforderliche gesetzliche Vertretung oder Ermächtigung der Anbieterin sowie die tatsächliche Vertragsabwicklung sind vor produktiven Bestellungen zu klären. Diese Fassung bedarf noch der Betreiber- und rechtlichen Freigabe. Dies ist ein fachlich noch zu prüfender Entwurf.

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
