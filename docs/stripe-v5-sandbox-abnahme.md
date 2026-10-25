# Stripe V5 – tatsächliche Sandbox-Abnahme

25.10.2026, ausschließlich `acct_1UToabGn2A630LhH`, `livemode=false` (Website sandbox).
Keine realen Betriebe, Adressen, E-Mails oder Bankverbindungen verwendet. Keine echten Zahlungen.
Diese API-Prüfung ersetzt keinen vollständigen Hosted-Checkout-/Browser-/Webhook-Liefernachweis.

## Nachgewiesene API-Aufrufe

- Bereits vorher angelegter fiktiver Kunde `cus_VVNOIpOKbkrsCw` mit Stripe-Testkarte,
  ohne E-Mail/Telefon, eingefrorener Testclock `clock_1UUMcwGn2A630LhH3OTAWegU`.
- Erster Versuch `sub_1UUPofGn2A630LhH9cCgxGan`: `default_incomplete` lässt erste Rechnung
  `in_1UUPogGn2A630LhHb4qYDdL1` offen, `amount_paid=0`. **Fehler nachgewiesen**, nicht als
  erfolgreicher Abostart gewertet. Testabo anschließend beendet, Status `incomplete_expired`.
- Korrigierter Versuch `sub_1UUPpPGn2A630LhH0F8aTA9N`: genau eine Basisposition mit vorhandenem
  1900-Cent-Preis, `allow_incomplete`, `off_session=true`. Status `active`; Rechnung
  `in_1UUPpPGn2A630LhH4V0BVmQA` **paid**, `amount_paid=1900` EUR, PaymentIntent
  `pi_3UUPpQGn2A630LhH10idLVcs`. Keine Einrichtungsgebühr im Monatsabo, keine Proration/Rückdatierung.
- Vollständige Sandbox-Erstattung und Beendigung dieses Testabos angefragt; endgültigen Readback
  und weitere Fälle im nächsten Protokolleintrag festhalten.

## Codekorrektur

V4-Mandatsstart verwendet `allow_incomplete` mit Off-Session-Einzug. Der Zustand `active` allein
ist weiterhin kein Zahlungsbeleg. Rechnungen/Umsatz entstehen erst bei `invoice.paid`;
SEPA, SCA und Ausfälle behalten den ausstehenden Zustand ohne zweites Abo.

## Noch abzugrenzen

Basis/Karte API belegt; Care+, SEPA, initialer 597-Euro-Hosted-Checkout, Browser-Bestätigung,
echte Signaturzustellung an die App, Folgemonat und Tarifplanwechsel noch nicht extern abgenommen.
Plugin stellt nicht jeden Stripe-Aktionsendpunkt bereit. Fehlende Operationen nicht durch
erfundene IDs oder Auslesen fremder Laufzeit-Secrets umgehen.

## Ergänzung – beide Tarife und Bereinigung bestätigt

| Fall | Subscription / Rechnung | Testbetrag | Endzustand |
| --- | --- | ---: | --- |
| Basis / Karte | sub_1UUPpPGn2A630LhH0F8aTA9N / in_1UUPpPGn2A630LhH4V0BVmQA | 1900 Cent | Rechnung paid; Abo canceled |
| Care+ / Karte | sub_1UUQ1sGn2A630LhHuM7BzBq1 / in_1UUQ1sGn2A630LhHEuHjCMo2 | 9900 Cent insgesamt | Rechnung paid; genau eine Position, Abo canceled |

Care+-Kunde cus_VVQt7oheePw20y, ebenfalls ohne E-Mail/Telefon, mit veröffentlichter Stripe-Testkarte.
Erstattungen re_3UUPpQGn2A630LhH1iwJIyJ9 (1900) und re_3UUQ1tGn2A630LhH0JTG7XIA (9900):
**succeeded**, anschließend beide Abos **canceled**. Alle vier Endzustände ausdrücklich per GET
zurückgelesen. Kein weiteres laufendes Abo aus diesen Testfällen.

Der Versuch mit dem Alias pm_sepa_debit schlug mit „No such PaymentMethod“ fehl. Kein SEPA-Erfolg.
Die vorliegende Plugin-Operationsliste bietet weder PaymentMethod-/PaymentIntent-Erstellung und
Bestätigung noch Testclock-Advance oder Subscription-Schedule-Schreibaktionen an. Verfügbare GETs
sind kein Ersatz. Daher bleiben **echter SEPA-Mandatsabschluss/Verzögerung, Folgemonat und echter
Schedulewechsel extern offen**. Keine Operationen erfunden und keine Netlify-Secrets als Umweg benutzt.

Die 597-Euro-Initialzahlung wird lokal mit Mock-Checkout und SDK-Vertragstests geprüft; es wurde
kein Browser-Abschluss einer echten gehosteten Stripe-Session durchgeführt. Die obigen Testabos
verwenden einen ausdrücklich fiktiven bestätigten Go-Live, keine tatsächlich veröffentlichte Website.
Testclock-/Kundendatensätze bleiben als fiktive Auditobjekte bestehen; ihre IDs sind keine Secrets.
