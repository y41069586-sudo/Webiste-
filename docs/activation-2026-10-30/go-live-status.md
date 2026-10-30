# Kundenstart: noch nicht abgenommen

Stand 30.10.2026, nach tatsächlichem VPS-Hosting-Test. Dieser Status ersetzt die älteren
Momentaufnahmen in diesem Verzeichnis; bestandene Teilprüfungen sind keine Gesamtfreigabe.

| Bereich | Tatsächlicher Nachweis | Noch offen |
|---|---|---|
| Einrichtungskauf Basis/Care+ | Zwei echte Hosted-Checkout-Sandbox-Käufe, je597€, signierte Webhooks verarbeitet, gespeichertes Zahlungsmittel und Zustimmung. Veröffentlichung-/Monatsstart-Ursachen korrigiert,38gezielte Core-Tests und2Produktions-Browser-E2E bestanden | Beide extern weiterhin ohne Subscription/billingStartedAt; begrenzten [Kunden-Abnahmelauf](customer-acceptance.md) auf VPS ausführen |
| Onboarding | Basis-Eingabe und gespeicherte private Kundenvorschau erstellt | Vollständige Kundenfreigabe-/Veröffentlichungsstrecke und Care+-Onboarding |
| Hosting | [Test auf eigener Subdomain](hosting-publication.json): tatsächliches HTTPS200, identischer Inhalt, Root unverändert, Desktop/Mobil geprüft | Allgemeiner Hosting-/Registrar-Provider weiterhin mock; Test hat bewusst keinen App-Kunden-Go-Live gesetzt |
| Bestätigung/Rechnungsmail | [Echter Resend-App-Test](email-delivery.json) zugestellt, Original-PDF hashgleich, richtiger privater Onboarding-Link mobil geprüft. Zusätzlich ausdrücklich autorisierte einzelne Gmail-Testmail per Connector: Provider delivered | Erster eigener Empfang im Spam; Gmail-Ordner noch nicht vom Nutzer bestätigt. Allgemeiner Provider weiterhin mock; keine gesamte E-Mail-Betriebsfreigabe |
| Briefdienst | Drei easyNova-Testaufträge gezählt; Rückgabe-PDF125251 gerendert, QR/Geometrie geprüft | Eigener physischer Probebrief und Prüfung nach Posteingang; kein Empfängerversand freigegeben |
| Backup/Restore | Code und lokaler isolierter Restore geprüft; verdeckte Terminaleingabe und kontrollierte Worker-Pause/-Wiederanlauf ergänzt | [Tatsächlichen Supabase-/Storage-Lauf](backup-next.md) mit berechtigter privater Verbindung auf VPS ausführen; Aufbewahrung/externe Kopie |
| Recherche | Vorhandener Lead-Finder und Quellen-/Bedarfs-/Website-/Widerspruchsregeln | research-lead/revise-demo fehlen tatsächlich in pg-boss; erst nach Backup/Restore ergänzen. Ein tatsächlich geeigneter Kontrollbetrieb mit Recherche-/Demo-/Briefnachweis fehlt |
| Steuer/Live-Vertrag | tax.operatorConfirmed=false bleibt korrekt offen | Verbindliche Steuer-/Rechnungsregelung und dokumentierte Live-Vertragsfreigabe; keine §19-Regelung erfinden |
| Firmenwebsite | Öffentliche Start-/Preis-/Kontakt-/Rechtsseiten HTTP200;597/19/99 aktuell, keine590/49in sichtbaren Verkaufsangaben und keine drei konkret gesuchten Platzhalter. AGB sichern keine§19-Befreiung zu | Keine juristische Freigabe daraus ableiten; Steuerstatus bleibt offen |
| Kundendomains | Vorhandene eigene Domain und reales Testhosting bestätigt; INWX-Konto durch Betreiber bestätigt. Fehlende geschützte Worker-Übernahme der Registrar-Felder korrigiert | [Private Secret-Einrichtung und lesender Sandbox-Test](inwx-setup.md) noch nötig; bisher keine tatsächliche INWX-Anmeldung oder Domainregistrierung nachgewiesen |

Nächste praktische Aktionen: Spam-Einstufung untersuchen und Zustellung an ein ausdrücklich
autorisiertes eigenes externes Postfach prüfen; die bereits zugestellte Mail nicht erneut verlangen.
Normalen bestätigten Test-Go-Live mit tatsächlichem Sandbox-Monatsstart für beide Tarife abschließen;
keinen Go-Live-Zeitstempel fingieren, um Billing zu erzwingen. Backup/Restore/Queue und geeigneter
Kontrollbetrieb bleiben getrennte Abnahmen. Ein öffentlicher Webseiten-Deploy ist kein Verkaufsstart.

Keine echte Kundenbestellung, Briefe an Betriebe oder Domainkäufe aus dieser Statusprüfung.
DRY_RUN=true und bestehende Empfängerversand-/Live-Checkout-Sperren unverändert.
