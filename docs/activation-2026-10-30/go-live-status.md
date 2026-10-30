# Kundenstart: noch nicht abgenommen

Stand 30.10.2026, nach tatsächlichem VPS-Hosting-Test. Dieser Status ersetzt die älteren
Momentaufnahmen in diesem Verzeichnis; bestandene Teilprüfungen sind keine Gesamtfreigabe.

| Bereich | Tatsächlicher Nachweis | Noch offen |
|---|---|---|
| Einrichtungskauf Basis/Care+ | Zwei echte Hosted-Checkout-Sandbox-Käufe, je597€, signierte Webhooks verarbeitet, gespeichertes Zahlungsmittel und Zustimmung | Beide weiterhin ohne Subscription/billingStartedAt; tatsächlicher Monatsstart nach normal bestätigter Veröffentlichung |
| Onboarding | Basis-Eingabe und gespeicherte private Kundenvorschau erstellt | Vollständige Kundenfreigabe-/Veröffentlichungsstrecke und Care+-Onboarding |
| Hosting | [Test auf eigener Subdomain](hosting-publication.json): tatsächliches HTTPS200, identischer Inhalt, Root unverändert, Desktop/Mobil geprüft | Allgemeiner Hosting-/Registrar-Provider weiterhin mock; Test hat bewusst keinen App-Kunden-Go-Live gesetzt |
| Bestätigung/Rechnungsmail | [Echter Resend-App-Test](email-delivery.json) zugestellt, Original-PDF hashgleich, richtiger privater Onboarding-Link mobil geprüft | Nachricht liegt im Spam-Ordner; Ursache/externe Posteingangsplatzierung offen. Allgemeiner Provider weiterhin mock; keine gesamte E-Mail-Betriebsfreigabe |
| Briefdienst | Drei easyNova-Testaufträge gezählt; Rückgabe-PDF125251 gerendert, QR/Geometrie geprüft | Eigener physischer Probebrief und Prüfung nach Posteingang; kein Empfängerversand freigegeben |
| Backup/Restore | Code und lokaler isolierter Restore geprüft | Tatsächlicher Supabase-/Storage-Backup-/Restore-Lauf auf dem VPS; berechtigte private Backup-Verbindung, Aufbewahrung/externe Kopie |
| Recherche | Vorhandener Lead-Finder und Quellen-/Bedarfs-/Website-/Widerspruchsregeln | research-lead/revise-demo fehlen tatsächlich in pg-boss; erst nach Backup/Restore ergänzen. Ein tatsächlich geeigneter Kontrollbetrieb mit Recherche-/Demo-/Briefnachweis fehlt |
| Steuer/Live-Vertrag | tax.operatorConfirmed=false bleibt korrekt offen | Verbindliche Steuer-/Rechnungsregelung und dokumentierte Live-Vertragsfreigabe; keine §19-Regelung erfinden |

Nächste praktische Aktionen: Spam-Einstufung untersuchen und Zustellung an ein ausdrücklich
autorisiertes eigenes externes Postfach prüfen; die bereits zugestellte Mail nicht erneut verlangen.
Normalen bestätigten Test-Go-Live mit tatsächlichem Sandbox-Monatsstart für beide Tarife abschließen;
keinen Go-Live-Zeitstempel fingieren, um Billing zu erzwingen. Backup/Restore/Queue und geeigneter
Kontrollbetrieb bleiben getrennte Abnahmen. Ein öffentlicher Webseiten-Deploy ist kein Verkaufsstart.

Keine echte Kundenbestellung, Briefe an Betriebe oder Domainkäufe aus dieser Statusprüfung.
DRY_RUN=true und bestehende Empfängerversand-/Live-Checkout-Sperren unverändert.
