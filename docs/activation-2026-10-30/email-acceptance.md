# Begrenzte Bestätigungsmail an das eigene Postfach

Stand 30.10.2026: vorbereitet und lokal geprüft, **noch keine tatsächliche Resend-App-Zustellung**.
Die zwei bisherigen Sandbox-Bestätigungen haben provider=mock/status=sent. Diese historischen
Zustände dürfen weder gelöscht noch als reale Zustellung ausgegeben werden.

## Vorhandene Komponenten nutzen

`packages/core/scripts/email-acceptance.ts` verwendet dieselbe Bestellbestätigungsvorlage,
den unveränderten Original-Testbeleg aus privatem Storage, denselben Onboarding-Link, den bestehenden
idempotenten Transaktions-Maildienst und Resend-Adapter. Kein neuer Mail-Endpunkt oder Provider.

Nur fiktive, bezahlte Stripe-Sandbox-Bestellungen (lead.source=mock, sichtbarer Testname) mit
Bestell-/Kundenadresse identisch zum konfigurierten eigenen Absenderpostfach und passendem EMAIL_FROM.
DRY_RUN=true erforderlich. Alte Testbelege mit Steuerbehauptung bei unbestätigtem Steuerstatus sind
gesperrt; deshalb vorhandene Care+-Bestellung verwenden. Kein Live-Verkauf oder steuerlich gültiger
Rechnungsnachweis. Betreff, Text und HTML tragen einen deutlichen SANDBOX-TEST-Hinweis.

Ohne `--apply` ausschließlich lesende Fixture-Prüfung. Mit `--apply` zusätzlich
`EMAIL_ACCEPTANCE_CONFIRM=own-inbox`; erst dann genau eine tatsächliche Mail. Resend wird ausschließlich
im Einmalprozess gewählt. Laufender Worker, allgemeiner EMAIL_PROVIDER, Auto-Reply/-Send und Netlify-
Konfiguration bleiben unverändert. Das ist eine gezielte Transport-/Inhaltsabnahme, keine Freigabe
des gesamten automatischen E-Mail-Betriebs.

Postausgangsschlüssel `acceptance:order-confirmation:<orderId>:resend:v1`, Art `acceptance_invoice`.
Historische Mock-Rechnungszeilen, invoiceSentAt und Onboardingzustand bleiben unverändert. Ein
Wiederholungsaufruf sendet über den vorhandenen dauerhaften Idempotenzschutz keine zweite Mail.
Original-PDF fehlt oder ungültig: abbrechen, nicht neu generieren. Kein privater Link in CLI-Ausgabe,
kein Secret ausgeben oder aus Netlify exportieren. Vorhandene geschützte VPS-Umgebung nutzen.

## Ausführung durch den Betreiber

Der vorhandene VPS hat nachweislich den Hosting-Stand03734a1. Es genügt, den neu geprüften einzelnen
CLI im vorhandenen Worker-Image read-only einzuhängen. Kein Worker-Neuaufbau, kein weiterer Einmal-Code
und kein globaler Providerwechsel. Nach Veröffentlichung dieses CLI auf dem bestehenden Betriebsbranch:

```bash
cd /opt/seitenwerk
curl -fsSL https://raw.githubusercontent.com/y41069586-sudo/Webiste-/claude/website-brief-maschine-0d0s37/packages/core/scripts/email-acceptance.ts -o /tmp/seitenwerk-email-acceptance.ts
docker compose -f docker-compose.worker.yml run --rm -T --no-deps \
  -v /tmp/seitenwerk-email-acceptance.ts:/repo/packages/core/scripts/email-acceptance.ts:ro \
  -e EMAIL_ACCEPTANCE_CONFIRM=own-inbox \
  --entrypoint node worker --import tsx \
  /repo/packages/core/scripts/email-acceptance.ts \
  --order=c7e74a8b-1b06-4809-8680-951b014919e6 --apply
```

Fehlt EMAIL_API_KEY, bricht der Lauf ab. Keine andere Kundenadresse einsetzen oder Secret im Chat
nachreichen. `sent`/`duplicate` plus messageId beweisen API-Annahme, **keine Zustellung**. Danach
Resend-Ereignis und eigene Inbox lesen; PDF öffnet sich, Testkennzeichnung/597€ und Care+ insgesamt99€,
Monatsbeginn nach bestätigtem Go-Live, Onboarding-Link korrekt und nur im eigenen privaten Postfach.
Keine Domainregistrierung oder Veröffentlichung durch den Link auslösen.

## Lokale Prüfungen

- Fünf CLI-Sicherheitstests gegen eine ausdrücklich lokale Wegwerf-Testdatenbank: lesend/keine Links
  im Output/historischer Mock unverändert; ausdrückliche Zustimmung; keine Live-Zahlung; nur eigene
  Absender-/Empfängeradresse; kein unbestätigter Steuerhinweis; kein Mock-Erfolg bei fehlendem Secret.
- Sechs vorhandene Stripe-/E-Mail-Adaptertests mit Fake-Transport, keine externen Provideraufrufe.
- Ein vorhandener Maildienst-Test: Fehler → erfolgreiche Wiederholung → Duplicate ohne Doppelversand.
- Core-TypeScript und gezieltes ESLint. Kein neuer App-Build nötig: kein App-/Bundlecode geändert.

Die positive tatsächliche CLI-Sendung und Zustellung bleiben bis zum VPS-Lauf offen.
