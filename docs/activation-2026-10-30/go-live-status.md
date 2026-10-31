# Kundenstart: noch nicht abgenommen

Stand 31.10.2026, nach Sandbox-Kundenablauf, einmaligem VPS-Restore und Veröffentlichung der regulären Mail-/Hosting-Provider. Dieser Status ersetzt die älteren
Momentaufnahmen in diesem Verzeichnis; bestandene Teilprüfungen sind keine Gesamtfreigabe.

| Bereich | Tatsächlicher Nachweis | Noch offen |
|---|---|---|
| Einrichtungskauf Basis/Care+ | Zwei Hosted-Checkout-Sandbox-Käufe, je597€, signierte Webhooks, gespeichertes Zahlungsmittel und Zustimmung. Nun beide tatsächlichen Monatsstarts nach Test-Go-Live bestätigt:19/99€, Stripe-Rechnungen paid, IDs/Beträge im App-Ledger identisch. Verlängerung beider Testabos zum Periodenende gekündigt. [Abnahme](customer-acceptance-result-2026-10-31.md) | Allgemeine Live-Verkaufs-/Provider-/Vertragsfreigabe bleibt getrennt |
| Onboarding | Beide fiktiven Kunden durch vorhandenen Onboarding-/Vorschau-/Freigabe-/Veröffentlichungsablauf; beide Testseiten tatsächlich live. Regulärer Mailprovider der App jetzt Resend | Reale Kundeninhalte und Rechtsangaben dadurch nicht abgenommen; VPS-Providerdatei noch auf aktuelle Auswahl bringen |
| Hosting | Basis- und Care+-Testhost HTTPS200, ausgeliefertes HTML bytegleich zum Speicher/Audit, vier VPS-Screenshots gelesen; Root unverändert. Regulärer Live-Check setzte beide Test-Go-Live-Zeitstempel. App jetzt tatsächlich Netlify, authentifizierte API-Leseprüfung HTTP200 | Neue Kundendomains/Registrarfreigabe offen; Worker bleibt pausiert |
| Bestätigung/Rechnungsmail | [Echter Resend-App-Test](email-delivery.json) zugestellt, Original-PDF hashgleich, richtiger privater Onboarding-Link mobil geprüft. Einzelne autorisierte Gmail-Testmail: Provider delivered, Empfang im Spam. App-Provider jetzt Resend, authentifizierte Leseprüfung bestanden | Spam-Einstufung bei beiden eigenen Postfächern ungelöst; Betreiber will Diagnose vorerst nicht fortsetzen. Keine erneute Mail aus Providerumschaltung |
| Briefdienst | Drei easyNova-Testaufträge gezählt; Rückgabe-PDF125251 gerendert, QR/Geometrie geprüft | Eigener physischer Probebrief und Prüfung nach Posteingang; kein Empfängerversand freigegeben |
| Backup/Restore | [Einmaliger VPS-Lauf bestanden](backup-acceptance-result-2026-10-31.md): Datenbank-Restore und Fingerprints,66Storageobjekte lokal wiederhergestellt, Quelle unverändert. Täglicher Timer, gemeinsamer DB-Snapshot, verschlüsselte zurückgelesene externe Kopie und Aufbewahrung implementiert und lokal geprüft | Installation und erster tatsächlicher Timerlauf auf VPS noch durch Betreiber nachzuweisen; keine fingierte grüne Gesamtfreigabe |
| Recherche | Vorhandene Quellen-/Bedarfs-/Website-/Widerspruchsregeln, fehlende Queues ergänzt. Ein realer Malerbetrieb anhand aktueller Eigenwerbung, Anschrift und mehrerer Website-Prüfwege recherchiert; privater Kontrollinput hinterlegt, ohne Kontaktaufnahme. Tatsächliche Ereignisdaten statt erneuerter Altanzeigen | Kontrollinput muss durch normale Servicevalidierung und echte KI-Demo/QA laufen. Danach Desktop-/Mobil-/Text-/Bildprüfung und Brief-PDF; keine manuelle Freigabe vorwegnehmen |
| Steuer/Live-Vertrag | tax.operatorConfirmed=false bleibt korrekt offen | Verbindliche Steuer-/Rechnungsregelung und dokumentierte Live-Vertragsfreigabe; keine §19-Regelung erfinden |
| Firmenwebsite | Öffentliche Start-/Preis-/Kontakt-/Rechtsseiten HTTP200;597/19/99 aktuell, keine590/49in sichtbaren Verkaufsangaben und keine drei konkret gesuchten Platzhalter. AGB sichern keine§19-Befreiung zu | Keine juristische Freigabe daraus ableiten; Steuerstatus bleibt offen |
| Kundendomains | Eigene Domain und Testhosting bestätigt. INWX-Anmeldung plus begrenzte Verfügbarkeitsabfrage erfolgreich; kein Kauf/DNS-/Providerwechsel. Benutzername als Netlify-Secret veröffentlicht und laut Screenshot11:11 dauerhaft in Worker-Datei gespeichert | OT&E-/Registrierungsablauf und allgemeine Registrarfreigabe weiter offen; keine erneute Login- oder Dateikorrektur nötig |

Aktualisierung31.10.2026: Der VPS-Neuaufbau mit der Hosting-Korrektur wurde tatsächlich ausgeführt.
Beide Kunden-Abnahmeläufe bestanden und unabhängig gegen Datenbank, Stripe und HTTPS geprüft.
[Ergebnis und Nachweise](customer-acceptance-result-2026-10-31.md). Die zuvor nachgewiesenen
Pretty-URLs-/Zertifikatsprobleme blockieren diese beiden Testseiten nicht mehr.

Aktualisierung nach Betreiberlauf10:29: Datenbank-/Storage-Wiederherstellung und Queue-Ergänzung
bestanden. Keine erneute einmalige Backupabnahme nötig. [Konkrete Nachweise und Grenzen](backup-acceptance-result-2026-10-31.md).

Aktualisierung11:11: INWX-Kontotest und dauerhafte Benutzernamekorrektur abgeschlossen; nicht
erneut verlangen. Betreiber hat einen niedrigeren KI-Wochenrahmen vorgegeben; bestehendes
App-Budget entsprechend korrigiert und auditiert, übrige Einstellungen unverändert. Das interne
Budget allein garantiert keine harte Anbietergrenze. [Kostenprüfung und Grenzen](llm-costs-and-worker-pause-2026-10-31.md).
Worker pausiert lassen; Provider- und Kostenkorrekturen sind inzwischen veröffentlicht, siehe nächste Aktualisierung.
Geeigneter Kontrollbetrieb bleibt
eine getrennte Abnahme. Spam bei Gmail und eigenem Postfach bleibt offen;
Betreiber hat weitere Diagnosefragen vorerst beendet. Keine erneute Testmail ungefragt senden.
Ein öffentlicher Webseiten-Deploy ist kein Verkaufsstart.

Aktualisierung 12:14 UTC: Netlify-Produktionsdeploy `6ae5db4c1352178f03173752`, Quellcommit
`2345428f7a44458a165a417d3cc67df8970405dd`, ready und veröffentlicht. Regulärer App-Provider
Resend/Netlify anhand authentifizierter Laufzeitdaten bestätigt, ebenso Stripe-Testmodus,
DRY_RUN und S3-Lesezugriff. Stripe bleibt Sandbox, reale Briefe gesperrt, unbekannte Steuerfelder leer.
Jeder physische Anthropic-Aufruf erhält jetzt eine atomare konservative Kostenreservierung;
unklare Antworten bleiben reserviert. Kein kontoweites Anbieterlimit daraus ableiten.
INWX-Produktionsumschaltung wurde von der automatischen Freigabeprüfung wegen möglicher
Domain-/DNS-Kosten bei bisherigen Testgrenzen abgelehnt; Registrar weiterhin mock/sandbox.
Nicht per VPS umgehen. [Umsetzung und Grenzen](remaining-work-implementation-2026-10-31.md).

Keine echte Kundenbestellung, Briefe an Betriebe oder Domainkäufe aus dieser Statusprüfung.
DRY_RUN=true und bestehende Empfängerversand-/Live-Checkout-Sperren unverändert.
