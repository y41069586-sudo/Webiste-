# Kundenstart: noch nicht abgenommen

Stand 31.10.2026, nach Sandbox-Kundenablauf und erfolgreichem VPS-Backup-/Restorelauf. Dieser Status ersetzt die älteren
Momentaufnahmen in diesem Verzeichnis; bestandene Teilprüfungen sind keine Gesamtfreigabe.

| Bereich | Tatsächlicher Nachweis | Noch offen |
|---|---|---|
| Einrichtungskauf Basis/Care+ | Zwei Hosted-Checkout-Sandbox-Käufe, je597€, signierte Webhooks, gespeichertes Zahlungsmittel und Zustimmung. Nun beide tatsächlichen Monatsstarts nach Test-Go-Live bestätigt:19/99€, Stripe-Rechnungen paid, IDs/Beträge im App-Ledger identisch. Verlängerung beider Testabos zum Periodenende gekündigt. [Abnahme](customer-acceptance-result-2026-10-31.md) | Allgemeine Live-Verkaufs-/Provider-/Vertragsfreigabe bleibt getrennt |
| Onboarding | Beide fiktiven Kunden durch vorhandenen Onboarding-/Vorschau-/Freigabe-/Veröffentlichungsablauf; beide Testseiten tatsächlich live | Reale Kundeninhalte und Rechtsangaben sind dadurch nicht abgenommen; Versand der Übergabe-Mails weiterhin mock |
| Hosting | Basis- und Care+-Testhost HTTPS200, ausgeliefertes HTML bytegleich zum Speicher/Audit, vier VPS-Screenshots gelesen; Root unverändert. Regulärer Live-Check setzte beide Test-Go-Live-Zeitstempel | Allgemeiner Hosting-/Registrar-Provider weiterhin mock; neue Kundendomains und allgemeiner Providerbetrieb nicht abgenommen |
| Bestätigung/Rechnungsmail | [Echter Resend-App-Test](email-delivery.json) zugestellt, Original-PDF hashgleich, richtiger privater Onboarding-Link mobil geprüft. Zusätzlich ausdrücklich autorisierte einzelne Gmail-Testmail per Connector: Provider delivered; Betreiber bestätigt Empfang im Spamordner | Spam-Einstufung sowohl im eigenen Postfach als auch bei Gmail bestätigt; Ursache noch offen. Allgemeiner Provider weiterhin mock; keine gesamte E-Mail-Betriebsfreigabe |
| Briefdienst | Drei easyNova-Testaufträge gezählt; Rückgabe-PDF125251 gerendert, QR/Geometrie geprüft | Eigener physischer Probebrief und Prüfung nach Posteingang; kein Empfängerversand freigegeben |
| Backup/Restore | [Einmaliger VPS-Lauf bestanden](backup-acceptance-result-2026-10-31.md): Datenbank-Restore und Fingerprints,66Storageobjekte lokal wiederhergestellt, Quelldatenbank nicht zurückgesichert. Worker wieder gestartet. Queue-Ergänzung nach Erfolg | Regelmäßiger Backupplan, Aufbewahrung und geschützte externe Kopie weiter nicht nachgewiesen; private Archive hier nicht unabhängig erneut gelesen |
| Recherche | Vorhandener Lead-Finder und Quellen-/Bedarfs-/Website-/Widerspruchsregeln; research-lead/revise-demo nach erfolgreichem Restore ergänzt und jetzt unabhängig in pg-boss gelesen | Ein tatsächlich geeigneter Kontrollbetrieb mit Recherche-/Demo-/Briefnachweis fehlt; vorhandene Queues allein beweisen keinen vollständigen Recherchebetrieb |
| Steuer/Live-Vertrag | tax.operatorConfirmed=false bleibt korrekt offen | Verbindliche Steuer-/Rechnungsregelung und dokumentierte Live-Vertragsfreigabe; keine §19-Regelung erfinden |
| Firmenwebsite | Öffentliche Start-/Preis-/Kontakt-/Rechtsseiten HTTP200;597/19/99 aktuell, keine590/49in sichtbaren Verkaufsangaben und keine drei konkret gesuchten Platzhalter. AGB sichern keine§19-Befreiung zu | Keine juristische Freigabe daraus ableiten; Steuerstatus bleibt offen |
| Kundendomains | Eigene Domain und Testhosting bestätigt. INWX-Anmeldung plus begrenzte Verfügbarkeitsabfrage nun tatsächlich erfolgreich nach Benutzernamekorrektur; kein Kauf/DNS-/Providerwechsel. Korrigierter Benutzername als Netlify-Secret gespeichert | [Dauerhafte Worker-Zeile korrigieren](inwx-setup.md), App-Deploy zur Secret-Aktivierung. OT&E-/Registrierungsablauf und allgemeine Registrarfreigabe weiter offen |

Aktualisierung31.10.2026: Der VPS-Neuaufbau mit der Hosting-Korrektur wurde tatsächlich ausgeführt.
Beide Kunden-Abnahmeläufe bestanden und unabhängig gegen Datenbank, Stripe und HTTPS geprüft.
[Ergebnis und Nachweise](customer-acceptance-result-2026-10-31.md). Die zuvor nachgewiesenen
Pretty-URLs-/Zertifikatsprobleme blockieren diese beiden Testseiten nicht mehr.

Aktualisierung nach Betreiberlauf10:29: Datenbank-/Storage-Wiederherstellung und Queue-Ergänzung
bestanden. Keine erneute einmalige Backupabnahme nötig. [Konkrete Nachweise und Grenzen](backup-acceptance-result-2026-10-31.md).

Aktualisierung10:57: INWX-Kontotest mit korrigiertem Benutzernamen bestanden; Anmeldung nicht
erneut prüfen. Netlify-Secret korrigiert, private Worker-Zeile noch dauerhaft zu speichern.
Worker bis geklärtem Kostenrahmen pausiert lassen; nächster größerer Punkt bleibt Kosten-/Mailbetrieb.
Geeigneter Kontrollbetrieb bleibt
eine getrennte Abnahme. Spam bei Gmail und eigenem Postfach bleibt offen;
Betreiber hat weitere Diagnosefragen vorerst beendet. Keine erneute Testmail ungefragt senden.
Ein öffentlicher Webseiten-Deploy ist kein Verkaufsstart.

Keine echte Kundenbestellung, Briefe an Betriebe oder Domainkäufe aus dieser Statusprüfung.
DRY_RUN=true und bestehende Empfängerversand-/Live-Checkout-Sperren unverändert.
