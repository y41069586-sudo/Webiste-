# Aktivierungsauftrag – 30.10.2026

**Aktuell nach dem erfolgreichen VPS-Hosting-Test:** [Go-Live-Status und nächste Abnahmen](go-live-status.md).
Die folgenden älteren Prüfungen bleiben historische Momentaufnahmen.

Fortsetzung von [29.10.](../resume-2026-10-29/README.md), geprüfter Quellstand `9cd0d83`.
Der Betreiber beauftragte ausdrücklich die fünf offenen Aufgaben einschließlich Veröffentlichung,
easyNova-Tests, bestehendem VPS und eigenem echten Probedruck. Das frühere Ja zu Stripe/easyNova
live ist dokumentiert. Keine bereits abgeschlossenen Funktionen neu implementiert.

## Tatsächlich neu geprüft

| Prüfung | Ergebnis / Nachweis |
|---|---|
| Stripe-Live-Konto | `charges_enabled=true`, `payouts_enabled=true`, Unterlagen eingereicht, keine aktuell fälligen Anforderungen. Kein rechtlicher/steuerlicher Freigabenachweis. |
| Drei vorhandene Live-Preise | EUR 59700 einmalig, 1900 monatlich, 9900 monatlich; aktiv, livemode=true; exakt die IDs des vorhandenen Live-Katalogs. Keine neuen Produkte oder Preise erstellt. |
| Live-Webhook | Aktiv, richtige dynamische App `/api/webhooks/stripe`, neun benötigte Checkout-/Abo-/Rechnungs-/Refund-Ereignisse. Signatursecret-Zuordnung und vollständige Zustellung noch nicht abgenommen. |
| Regulärer Admin-Zugang | Vorhandener privater Zugang per Passwort und TOTP erfolgreich verwendet. Kein Passwortreset oder Umgehen der Anmeldung. Keine Zugangsdaten im Git. |
| Tatsächliche Laufzeit | Authentifizierter GET auf `/api/admin/integrations`: DRY_RUN=true, Stripe-Sandbox lesend HTTP200; privater S3-Speicher lesbar; Resend-Inbox lesbar. PAYMENT_PROVIDER und EMAIL_PROVIDER weiterhin mock. |
| easyNova-Guthaben | Über den bestehenden Admin tatsächlich **12,61 €** abgelesen. Kein Aufladen in dieser Sitzung. |
| Eigene Brief-PDF | Über geschützten Admin aus privatem Speicher geladen: 420391 Bytes, A4, eine Seite. SHA-256 in `letter-inspection.json`. Gerenderte Druckansicht mit 160 dpi tatsächlich angesehen. |
| PDF-Inhalt | Einladung ohne alte/neue Tarifpreise; kostenloses Ansehen, spätere kostenpflichtige Beauftragung, unabhängiger Entwurf und Art.-14/21-Hinweise enthalten. **Widerspruchsadresse ist noch `widerspruch@example.com` – Druckblocker.** |
| QR im endgültigen PDF | Mit vorhandener `pdfQrTargets`-Implementierung erfolgreich dekodiert. Tatsächliche QR-Route 302 zur richtigen Demo, Demo HTTP200, Firmenname identisch. |
| Mobile Demo | Tatsächlich mit 390 px gerendert, kein horizontaler Überlauf; 597/19/99 und Entwurfskennzeichnung vorhanden. Screenshot lokal privat gespeichert. Keine neue gestalterische Gesamtfreigabe. |
| Einmaliger Provider-Testversuch | Über die bestehende sichtbare Admin-Aktion im easyNova-Testmodus ausgeführt. **Vor Anbieterübertragung wegen veralteter PDF-Bindung abgewiesen.** Kein angenommener Auftrag, kein Druck, keine Zustellung, kein Zählerfortschritt. |
| Testzähler / Versand | Supabase-Readback weiterhin **1/3**, keine neuen `easynova_test_job`-Auditnachweise heute, realLettersUnlocked=false, Bestellungen=0. Zweiten identischen Fehlversuch unterlassen. |
| Rückgabe-PDFs | Eingestellte easyNova-Testadresse gehört nicht zum hier verbundenen Support-Postfach. Support-Inbox und Receiving-API geprüft: keine easyNova-Proofs dort. Zugriff auf die tatsächlichen Rückmeldungen bleibt nötig. |
| Worker | Weiterhin frischer abgeschlossener Pipeline-Takt in Supabase; exakte Serverversion/Update nicht per SSH möglich. `research-lead`-Queue weiterhin nicht vorhanden. |

Sichere Nachweise: [Stripe](stripe-readback.json), [Laufzeit](runtime-integration-check.json),
[PDF-Metadaten](letter-inspection.json), [PDF-Textprüfungen](pdf-checks.json),
[QR/Mobil](qr-route-readback.json).

Private PDF/Druckansicht, vollständige Testergebnisse und Admin-Sitzung liegen ausschließlich im
ignorierten `data/activation-2026-10-30/`. Sie enthalten Betreiberanschrift bzw. Zugangsdaten und
gehören nicht ins öffentliche Repository. Der frühere private Zugang wurde unverändert erhalten.

## Veröffentlichung durch automatische Freigabeprüfung blockiert

Der konkrete Befehl sollte den getesteten Patch auf den bestehenden Betriebsbranch
`claude/website-brief-maschine-0d0s37` pushen und dadurch einen Netlify-Produktionsdeploy auslösen.
Die automatische Freigabeprüfung lehnte ihn **vor Ausführung** ab: „mach alles“ sei angesichts der
früheren getrennten Deploy-Freigabe nicht eindeutig genug für diesen produktiven Push.

Keine alternative API, kein Build-Hook und kein indirekter Deploy zur Umgehung verwendet.
Die konkrete Zustimmung zum Betriebsbranch-Push/Netlify-Deploy bei weiterhin DRY_RUN=true wurde
beim Betreiber angefragt und ist noch ausstehend. App bleibt auf `484b060`, Deploy
`6ae3aafe619f0d38be405dc0`. Die statische Firmenwebsite bleibt ebenfalls unverändert.
Die ergänzenden Nachweise werden nur auf dem vorhandenen Codex-Zweig mit Skip-Markierungen gesichert.

## Nächste Schritte in sicherer Reihenfolge

1. Konkrete Freigabe für Push auf den bestehenden Betriebsbranch und Netlify-Produktionsdeploy
   beantworten; geprüften Code mit unverändertem Dry-Run veröffentlichen und Deploy/Health prüfen.
2. Vorhandenen VPS sicher verbinden oder Update in Termius ausführen. **Erst nach neuer App-Version**
   einen frischen Worker-Einmal-Code erzeugen, damit OPTOUT_EMAIL und die neue Stripe-Auswahl exportiert
   werden. Setup mit NEU=1, zunächst ohne LIVE=1. Keine Zugangsdaten im Chat teilen.
3. Eigene Test-PDF über den aktualisierten Worker neu erzeugen. Adresse, Entwurfszuordnung, QR,
   Widerspruchsadresse, Seitenzahl und Druckansicht erneut prüfen. Alte Datei nicht für echten Druck freigeben.
4. Erst mit unverändert gebundener, geprüfter PDF zwei weitere **tatsächliche** easyNova-Testaufträge
   im Testmodus einreichen; Rückgabe-PDFs aus der eingestellten Testadresse ansehen. Zähler nicht bearbeiten.
5. easyNova nach bestandenen Prüfungen gezielt live konfigurieren, eigenen Probebrief innerhalb des
   bestehenden Budgets auslösen; Kundenversandfreigabe bleibt geschlossen bis zum geprüften Posteingang.
6. Für Stripe den verbindlichen Steuerstatus beantworten, passende Preise/Rechnungen prüfen,
   vollständigen Sandbox-Zyklus und Live-Signaturzustellung abnehmen. Kein eigener Live-Kauf als Test.
7. Fehlende Recherche-Queue nur kontrolliert nach Versions-/Rollen-/Backupprüfung vorbereiten;
   keine neue Produktionsdatenbank, keine unkontrollierten Startup-Migrationen oder Seeds.

### Vorbereiteter Server-Update-Aufruf

Voraussetzung: neue App-Version veröffentlicht und neuer Einmal-Code im Admin erzeugt. Danach auf
dem **bestehenden** Ubuntu-Server in Termius (nicht in dieser lokalen Arbeitsumgebung):

```bash
curl -fsSL https://raw.githubusercontent.com/y41069586-sudo/Webiste-/eebfdbad3cebc46a5b4ad3cae3a669c7284337f5/infra/vps/setup.sh -o /tmp/seitenwerk-setup.sh
NEU=1 LIVE=0 bash /tmp/seitenwerk-setup.sh
```

Das Skript lädt den vorhandenen Betriebsbranch; deshalb muss Schritt 1 vorher abgeschlossen sein.
Kein LIVE=1 beim gewöhnlichen Update. Queue-/Backup-Voraussetzungen gesondert prüfen. Anschließend
Health, Commitstand und OPTOUT_EMAIL-Präsenz prüfen, ohne `.env.worker` auszugeben.

## Grenzen

Keine neue Anwendung, keine neue Datenbank und keine neuen Preispläne. Keine echte Zahlung,
Erstattung, Domainbestellung, Drucksendung oder Kundenfreigabe. Keine Produktionsmigration.
Produktiver Code-Push und Deployment wegen Freigabeprüfung nicht ausgeführt. Steuerstatus wurde
nicht selbst bestätigt. Bestehende Tests aus 29.10. nicht als heute erneut ausgeführt ausgeben;
heute kamen die konkreten Konto-/Provider-/Admin-/PDF-/QR-/Mobilprüfungen hinzu.

## Nachtrag: konkrete Veröffentlichungsfreigabe

Der Betreiber hat anschließend ausdrücklich „Ja push und veröffentlich“ bestätigt. Die zuvor
fehlende konkrete Zustimmung liegt damit vor. Der getestete Code wird auf den vorhandenen
Betriebsbranch übernommen und die tatsächliche Netlify-Veröffentlichung geprüft. DRY_RUN=true
bleibt erhalten. Der Betreiber aktualisiert den vorhandenen VPS selbst; ein neues SSH-Onboarding
ist nicht erforderlich. Nach neuer App-Version den Setup-Aufruf mit NEU=1 verwenden und einen
neuen Einmal-Code ausschließlich direkt auf dem Server eingeben.

## Veröffentlichung abgeschlossen

- Betriebsbranch per Fast-Forward auf `eebfdba` gepusht; keine fremden Änderungen überschrieben.
- Netlify-Deploy `6ae4382fd4ef7bebeb43a347`, production, ready, Commit exakt `eebfdba`;
  veröffentlicht am 30.10.2026 um 06:25:44 UTC. Next.js-Plugin erfolgreich, Secretscan ohne Treffer.
- Login, Preise, Impressum und Health tatsächlich HTTP200. DB, privater Speicher und Queue
  erreichbar, Worker-Takt 124 Sekunden alt, keine fehlgeschlagenen Jobs in der letzten Stunde.
  Health weiter degraded: geprüftes Backup fehlt. Zwei ältere Dead-Letter-Jobs separat offen.
- Keine Provider-/DRY_RUN-/Empfängerschalter geändert, keine Migrationen oder echten Geschäftsvorgänge.
- Server-Update führt der Betreiber aus. Der oben dokumentierte gepinnte Setup-Aufruf wurde
  tatsächlich von GitHub geladen, mit lokalem Skript verglichen und per bash -n geprüft.
  Erst neuen Worker-Einmal-Code im aktualisierten Admin erzeugen, dann NEU=1 LIVE=0 ausführen.
- Nach Server-Update eigene PDF neu generieren; die alte Datei enthält noch den Platzhalter und
  bleibt gesperrt. Danach die zwei easyNova-Testaufträge und Rückgabe-PDF-Prüfung fortsetzen.

Nachweis: [deployment.json](deployment.json). Der Produktionsdeploy ist damit erfolgt; der
Gesamtbetrieb bleibt im Testmodus. Diese nachträglichen Dokumentationsänderungen tragen
Skip-Markierungen und lösen keinen weiteren Deploy aus.

## Worker-Update bestätigt, drei Provider-Testaufträge eingeliefert

Nach Rückmeldung des Betreibers wurde der Update tatsächlich geprüft: neuer Bootstrap-Code
um 06:57:03 UTC eingelöst, danach erfolgreiche Worker-Takte. Über die reguläre angemeldete
Admin-Aktion „Testbrief an mich“ die eigene Test-PDF neu erzeugt. Auftrag
`2d40d21e-a61a-47bf-8f87-78812f532ea1` abgeschlossen, null technische Probleme,
neuer Brief `cd300821-c543-4876-b1ee-98c8fe2c8d33`.

Die tatsächliche neue PDF wurde aus privatem S3 geladen und mit 160 dpi gerendert/angesehen:
A4, eine Seite, Laptop/Handy, Preise weiterhin nicht im Einladungstext, kostenloses Ansehen und
spätere kostenpflichtige Umsetzung unterscheidbar, Art.-14/21-Hinweise vorhanden.
**Widerspruchsadresse jetzt support@seitenwerk.world; kein example-Platzhalter mehr.**
QR aus der neuen PDF mit bestehendem Decoder erfolgreich geprüft; identisches bereits geprüftes
Demo-Ziel. Neue Testempfängerbindung vorhanden. PDF-SHA256 und maschinelle Checks im Nachweis.

Anschließend nacheinander zwei tatsächliche easyNova-Testaufträge über die bestehende Admin-Aktion
eingeliefert: **125250** (Zähler 2), **125251** (Zähler 3). Getrennte tatsächliche Anbieterantworten
und Auditdatensätze bestätigen die Einlieferung. Kein manuelles Hochsetzen des Zählers.
**Stand jetzt 3/3 eingeliefert; die zurückgesendeten Prüf-PDFs sind noch nicht abgenommen.**
Sie gehen an die bereits eingestellte, hier nicht verbundene Testadresse. Der Betreiber muss sie
zur Druckflächen-/Anschriftenprüfung bereitstellen. Annahmestatus queued allein ist kein
Nachweis fehlerfreier Verarbeitung oder eines erfolgreichen physischen Probedrucks.

DRY_RUN=true, realLettersUnlocked=false, null Bestellungen; kein echter Brief, keine Live-Zahlung.
Brief bleibt generated zur Kontrolle, keine Qualitätsnoten erfunden. Fiktive Demo ist ausschließlich
Vorlage für den eigenen Testdruck; der Hinweis auf fehlende belegte Betriebsdetails bleibt erhalten.
Neuerstellung erfolgte über den vorhandenen Testbrief-Pfad, nicht durch Löschen des bisherigen Briefs
vor erfolgreicher Ersatzgenerierung. Weitere Branchen-/Kampagnenfreigaben wurden nicht erteilt.

Nachweis: [post-worker-update.json](post-worker-update.json). Private Vorher-/Nachher-PDFs und
Druckansichten bleiben im ignorierten data-Verzeichnis; keine Betreiberanschrift im Git.
Keine Codeänderung in diesem Schritt, kein erneutes Worker-Update oder Deployment erforderlich.
Nächster Schritt: easyNova-Rückgabe-PDFs prüfen, danach eigener echter Probedruck. Für Live-Verkäufe
bleiben Steuerbestätigung und vollständige Stripe-/E-Mail-/Backup-Abnahme gesondert offen.

## Rückgabe-PDF 125251 tatsächlich abgenommen

Der Betreiber hat die von easyNova zurückgegebene Datei für Testauftrag 125251 hochgeladen.
Die Datei wurde lokal gesichert, gerendert und visuell geprüft; vollständiger Textvergleich
mit der tatsächlich eingereichten Original-PDF. Alle Originalwörter erhalten; ausschließlich
die Anbieter-Prüflabels „Absender“, „DV-Freimachung“ und „Adresse“ ergänzt.

- A4, eine Seite. Absender innerhalb x19–108/y45–51 mm. Anschrift innerhalb x19–108/y68–90 mm.
- Rote DV-Freimachungsfläche x20–108/y52–68 mm frei von Originaltext; Betreff beginnt darunter.
- QR 41,01 × 41,01 mm, 600 × 600 Pixel. Dekodierung sowohl des eingebetteten QR-Bildes als auch
  der vollständigen gerenderten Rückgabe-Seite bei 160 dpi erfolgreich; korrektes bisher geprüftes Demo-Ziel.
- Richtige Widerspruchsadresse, Laptop-/Handy-Komposition unverändert, keine abgeschnittenen
  Absätze oder überlagerten Pflichttexte erkennbar. Physische Lesbarkeit/Materialqualität erst am Papier prüfen.
- Die roten/blauen Flächen sind Testmarkierungen. Sie werden nicht in die Versandvorlage übernommen.
  In der Anwendung bleibt die unveränderte Original-PDF mit Hash 7824f24be8cdd89bdfca558f1c1c5e561f98619df37a7bf47b08e096c6ad64b1 gebunden.

**Ergebnis: diese Rückgabe-PDF ist druckgeometrisch für den eigenen physischen Probedruck geeignet.**
Nur Auftrag 125251 tatsächlich geprüft; keine pauschale Abnahme aller zurückgesendeten Proofs,
keine juristische Freigabe oder Designnote daraus ableiten. Kundensendungen weiterhin gesperrt.
Kein echter Druckauftrag ausgelöst; ENV/DB-Dry-Run unverändert. Der anschließende echte Probedruck
braucht den vorgesehenen expliziten Betriebswechsel; der Worker wurde zuletzt mit LIVE=0 gestartet.

Nachweis: [provider-proof-125251.json](provider-proof-125251.json). Betreiberanschrift und vollständige
PDF/Druckansicht verbleiben ausschließlich im ignorierten data-Verzeichnis. Keine Codeänderung,
kein Deployment und kein neues Worker-Update in diesem Prüfschritt.
