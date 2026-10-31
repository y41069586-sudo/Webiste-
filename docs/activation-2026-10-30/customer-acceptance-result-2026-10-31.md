# Kundenablauf in der Stripe-Sandbox bestanden

Der Betreiber hat das korrigierte Worker-Image gebaut und den begrenzten Kunden-Abnahmelauf
am31.10.2026 erfolgreich für beide vorhandenen fiktiven Bestellungen ausgeführt. Anschließend
wurden App-Datenbank, öffentliche Testseiten, gespeicherte Dateien und Stripe unabhängig gelesen.

| Tarif | Tatsächliche Testveröffentlichung UTC | Abo-Start UTC | Erste Monatsrechnung |
|---|---|---|---|
| Basis | 08:06:47.886 | 08:06:49 | Stripe paid,1900Cent EUR |
| Care+ | 08:07:57.368 | 08:07:58 | Stripe paid,9900Cent EUR insgesamt |

- Beide Bestellungen payment_mode=test, beide Stripe-Abos livemode=false.
- Jeweils genau eine Tarifposition, quantity1, Intervall month; kein zusätzliches Basisentgelt bei Care+.
- Monatsstart zeitlich nach dokumentiertem Go-Live, Rechnungs-ID und Betrag in order_payments identisch
  zum tatsächlich gelesenen Stripe-Beleg. Nicht nur Status active als Zahlungsnachweis verwendet.
- Wiederholter Start liefert laut abgeschlossener customer_acceptance-Auditprüfung dieselbe Abo-ID.
- Beide Testabos cancel_at_period_end=true: Verlängerung beendet, laufende Testperiode noch active.
- Beide öffentlichen Testseiten tatsächlich HTTPS200, ausgeliefertes HTML jetzt bytegleich mit
  gespeichertem live-v1.html und dem abgeschlossenen Audit-Hash. Keine TLS-Ausnahme verwendet.
- Vier tatsächliche VPS-Screenshots im vorhandenen privaten Speicher erneut als PNG gelesen:
  Desktop1440 und Mobil390 für beide Tarife. Browserprüfungen waren Teil des abgeschlossenen Laufs.
- Root-Homepage weiterhin hashgleich. Keine Domain gekauft, keine globalen Provider umgestellt.
- Geschützter App-Laufzeitabgleich bestätigt DRY_RUN=true, Stripe/test, reguläre E-Mail-/Hosting-Provider
  mock. Die im Screenshot protokollierten Übergabe-/Admin-Mails liefen ebenfalls über mock;
  daraus folgt kein tatsächlicher Zustellnachweis für diese Nachrichten.

Nachweise: [HTTPS/Dateien/Laufzeit](customer-acceptance-2026-10-31.json),
[Stripe-Abos und bezahlte Rechnungen](customer-acceptance-stripe-2026-10-31.json).
Die Zugangsdaten und privaten Kundenlinks sind nicht Bestandteil dieser Nachweise.

## Nächste Betriebsprüfung

Backupstatus weiterhin null; research-lead und revise-demo fehlen laut erneutem lesendem
Datenbankabgleich. Vorhandenes [Backup-/Restore-Script](backup-next.md) auf VPS ausführen, danach
fehlende Queues ergänzen. Es benötigt die berechtigte private Supabase-Verbindung; niemals
hierfür RLS abschalten oder die App-Rolle hochstufen. Kein weiterer Worker-Neuaufbau für diesen
Schritt erforderlich.

Allgemeine Providerabnahme, INWX-Zugang für neue Kundendomains, physischer Probebrief,
geeigneter echter Kontrollbetrieb und Steuer-/Vertragsfreigaben bleiben getrennt offen.
Spamplatzierung dokumentiert und Diagnose vom Betreiber vorerst beendet. Keine neue Mail,
Live-Zahlung, echte Briefsendung oder Domainbestellung aus dieser Nachprüfung.
