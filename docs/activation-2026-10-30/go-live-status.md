# Kundenstart: noch nicht abgenommen

## Aktueller Abschlussstand nach INWX-Freigabe und VPS-Bestätigung

**Neuster Nachweis, 31.10.2026 um 13:47 UTC:** Betreiber hat Backupinstaller und Kontrolllauf
ausgeführt. Timer installiert, erster Sicherungslauf bestanden; eine neue externe verschlüsselte
Kopie zusätzlich unabhängig im vorhandenen Bucket bestätigt. Backupinstallation damit erledigt.
Echte Kontroll-Demo erzeugt, aber noch nicht freigegeben: allein Lighthouse-Performance 88 statt
mindestens 90 blockiert. Alle anderen technischen Prüfungen bestanden. Zwei ungenaue Textstellen
werden gezielt korrigiert. Testserver-Kompression an reale Auslieferung angeglichen; lokale
Live-Gegenprüfung 100 in allen vier Kategorien. Neuer VPS-Prüflauf noch nötig, keine pauschale
Design-/Conversionbewertung oder Brief-Freigabe daraus ableiten. Die älteren Pending-Zeilen
zu fehlender Sicherung oder noch nicht gebauter Kontroll-Demo sind damit überholt.

App-Commit `b0eb1ff` tatsächlich veröffentlicht: Netlify `6ae5e8f6146689d171f0bd1b`,
production/ready, 31.10.2026 um 13:13:06 UTC. Authentifiziert bestätigt: INWX production,
Zugangsdaten vorhanden, Resend und Netlify aktiv, Stripe test, DRY_RUN true. Betreiber bestätigt
anschließend den angeforderten VPS-Git-/Dateiabgleich und Imagebau. Diese Aufgabe ist anhand
seiner Bestätigung erledigt; denselben Aufruf nicht nochmals verlangen. Worker bleibt pausiert.

Erledigt bleiben die tatsächlichen Basis-/Care+-Sandboxkäufe mit Monatsstart nach Testveröffentlichung,
beide Testseiten samt HTTPS-/Hashnachweis, einmaliger Datenbank-/Storage-Restore, fehlende Queues,
implementierte Kostenreservierung, INWX-Kontozugang und Produktionsfreigabe.

| Verbleibender Abschluss | Aktueller Nachweis | Nächster Schritt |
|---|---|---|
| Regelmäßige Sicherung | Code und lokaler Test vorhanden. Neue Leseprüfung: kein Objekt im externen Backuppräfix, kein gespeicherter Erfolgsstatus | Installer auf VPS ausführen bzw. tatsächliches Ergebnis prüfen; erster Restore-/Offsite-Lauf und Timer müssen bestehen |
| Kontrollbetrieb bis Brief | Rechercheinput privat vorbereitet. Neue Leseprüfung: noch kein importierter Kontrolllead, keine dazugehörige Demo oder Brief | Einzelnen vorbereiteten Kontrolllauf ausführen, dann tatsächliche Mobil-/Desktop-/Faktenprüfung und Brief-PDF |
| Papier-Probebrief | Drei easyNova-Testaufträge und Rückgabe-PDF geprüft | Echten eigenen Probebrief verschicken und nach Eingang Druck/QR prüfen; kein Empfängerversand |
| Bezahlter Verkauf | Steuerbestätigung weiterhin false, unbekannte Nummern leer | Steuer-/Rechnungsbehandlung und Verkaufsfreigabe klären, anschließend kontrolliert Stripe/Versand freischalten |

Keine Gesamtfreigabe aus einzelnen bestandenen Tests ableiten. Der früheste tatsächliche Start hängt
vom Ausgang der beiden technischen Abnahmen, dem Papierbrief und der Verkaufsfreigabe ab.
Die bekannten Spam-Einstufungen der eigenen Testmails bleiben ein dokumentiertes Restrisiko;
weitere Diagnose wurde vom Betreiber beendet, keine erneute Testmail ungefragt senden.

Die folgenden Abschnitte dokumentieren frühere Zwischenstände und einzelne Nachweise.
Bei widersprüchlichem Pending-Status gilt die obige aktuelle Zusammenfassung.

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

Ergänzender Kontrollstrecken-Code `4b39524` ist auf GitHub gesichert, aber noch nicht als App-Version
veröffentlicht. Die Netlify-Verbindung hier bietet keinen Build-Aufruf; vorhandene Secretwerte sind
verdeckt, kein verwendbarer privater CLI-Buildtoken. Im bestehenden Projekt kann der Betreiber
Deploys → Trigger deploy → Deploy site ausführen. Noch keinen erfolgreichen Deploy dieses Commits
behaupten; bisher veröffentlichter Provider-/Kostenstand bleibt `2345428`.

Aktueller Nachtrag: Kontrollstrecken-Commit `4b39524` ist inzwischen nachweislich veröffentlicht
(Netlify `6ae5e39538428cc0f08fa842`, ready, 12:49:21 UTC); vorherige Pending-Aussage überholt.
Betreiber hat danach INWX-Produktion für bezahlte Kundenaufträge ausdrücklich freigegeben.
Production-Variablen in Netlify gespeichert, zusätzliche Zahlungssperre im Code implementiert,
VPS-Abgleich und folgender App-Deploy gesondert nachzuweisen. Keine Domain gekauft.
[Freigabe, Umsetzung und Grenzen](inwx-production-approval-2026-10-31.md).

Keine echte Kundenbestellung, Briefe an Betriebe oder Domainkäufe aus dieser Statusprüfung.
DRY_RUN=true und bestehende Empfängerversand-/Live-Checkout-Sperren unverändert.
