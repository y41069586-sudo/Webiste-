# Tatsächlicher Sandbox-Monatsstart nach Testveröffentlichung

Stand 30.10.2026: bestehende Dienste gezielt korrigiert, lokal geprüft. **Der neue VPS-Lauf wurde
noch nicht ausgeführt, die beiden tatsächlichen Monatsstarts sind weiter offen.**

## Behobene Ursachen

- Eine bereits registrierte/vorhandene Domain wurde beim Hostingwechsel nicht erneut angebunden.
  Deploy bindet sie jetzt an, ohne erneuten Registrar-Kauf oder Domainkostenbuchung. Verfügbarkeit
  neuer Domains wird weiterhin vor ihrer Anbindung geprüft.
- Eine noch nicht bestätigte Domain darf keinen Live-Check über die Standard-Hosting-URL bestehen.
- Ein gesetzter Live-Status allein genügt Stripe nicht mehr: Vorschaufreigabe, tatsächlicher
  erfolgreicher Live-Check, reales Hosting und HTTPS-Produktions-URL erforderlich. Test-/Live-
  Zahlungsmodi werden in beiden Richtungen abgeglichen. Bestehende Abos bleiben idempotent erhalten.
- Alle Stripe-Sandbox-Kundenseiten bleiben anhand des gespeicherten Zahlungsmodus als fiktive
  Testseite erkennbar, noindex, robots Disallow und ohne Sitemap/aktives Anfrageformular. Das bleibt
  auch nach Änderung der Betreiberadresse erhalten. Normale Live-Kunden und Legacy-/Mock-E2E behalten
  ihren bisherigen Ablauf. Keine neue Templatefamilie oder Anwendung.
- Der Live-Check prüft die zum Zahlungsmodus passende Indexierungs-/Testkennzeichnung. Ein Mock-
  Registrar darf kein angeblich bestätigtes Ablaufdatum einer vorhandenen realen Domain eintragen.

## Begrenzter bestehender Kundenablauf

`packages/core/scripts/customer-acceptance.ts` arbeitet ausschließlich auf diesen zwei vorhandenen,
bereits mit Stripe-Testkarte bezahlten Bestellungen und privaten Testkunden:

| Tarif | Bestellung | Eigener Testhost |
|---|---|---|
| Basis | 4991f35d-0c23-465f-b4b1-0f320d5a5f91 | basis-test.seitenwerk.world |
| Care+ | c7e74a8b-1b06-4809-8680-951b014919e6 | care-test.seitenwerk.world |

Ohne `--apply`: lesende Fixture-Prüfung, keine externen Provideraufrufe. Tatsächlicher Lauf braucht
`CUSTOMER_ACCEPTANCE_CONFIRM=stripe-sandbox-owned-domain` und DRY_RUN=true. Nur source=mock, klarer
Testname, bezahlte Stripe-Testbestellung, gespeicherte Tarifzustimmung und eigenes konfiguriertes
Postfach. Keine beliebigen IDs, Domains, Live-Schlüssel oder fremden Kunden.

Die vorhandene Root-Domain-Zuordnung wird tatsächlich über Netlify gelesen. Root-/App-Projekte als
Uploadziele gesperrt; Root-Homepage vor/nach dem Test vergleichen. Zwei eigene Testprojekte/-Hosts
mit dem vorhandenen Adapter, einschließlich dessen automatischer www-Aliasse. Keine Domainbestellung,
kein Registraraufruf für einen Kauf, keine Root-/Mail-DNS-Umschaltung. `domainStatus=registered`
bedeutet hier dokumentiert eine bestätigte schon vorhandene eigene Domain; Registrar-IDs und
domainRegisteredAt werden dafür **nicht** erfunden.

Für Care+ wird das noch offene fiktive Onboarding über den vorhandenen Service abgeschlossen,
mit fiktivem, ausdrücklich nicht freigegebenem Datenschutz-Testtext. Private Vorschau über denselben
Builder, Freigabe über denselben Service, Veröffentlichung und Live-Check über dieselben Dienste.
Interne optionale Queue-Parameter erlauben die gezielte synchrone Abnahme, ohne parallel laufende
Mock-Deploy-Jobs zu erzeugen; öffentliche Actions übernehmen diese Parameter nicht aus Eingaben.
KI/E-Mail bleiben in diesem Einmalprozess Mock, Hosting Netlify und Zahlung ausdrücklich Stripe/test.
Kein allgemeiner Providerwechsel, keine weitere tatsächliche E-Mail.

Vor Live-Bestätigung: echtes HTTPS mit identischem gespeichertem HTML-Hash, kein privater Token,
Mobil390/Deskop1440 ohne Überlauf, Formulare gesperrt, noindex und Root unverändert. Screenshots im
privaten vorhandenen Speicher unter sites/<siteId>/acceptance-{mobile-390,desktop-1440}.png, über den
bestehenden authentifizierten /admin/files/-Download erreichbar. Der normale Live-Check setzt erst
danach tatsächlich liveAt und startet das Sandbox-Abo über startBillingV4. Kein direkter erfundener
Go-Live-Zeitstempel und kein zweites Zahlungs-/Abrechnungssystem.

Erwartet: genau derselbe Abo-Identifier bei wiederholtem Start, monatlich1900/9900Cent aus dem
unveränderten Angebot, tatsächlicher invoice.paid-Eingang im vorhandenen order_payments. Active
allein gilt nicht als Zahlungsnachweis. Nach nachgewiesener erster Testzahlung wird die Verlängerung
über die bestehende Kündigungsfunktion zum Periodenende beendet; kein endlos laufendes Testabo.
Bei ausstehender Zahlung Exit2 und klarer offener Befund, niemals neuen Checkout/Abo erzwingen.

## Operator-Aufruf nach einem regulären Code-Update

Der bisherige VPS-Stand03734a1 enthält diese Core-Korrekturen noch nicht. Anders als beim einzelnen
E-Mail-CLI ist **diesmal ein regulärer Worker-Code-Neuaufbau erforderlich**. Kein NEU=1 und kein neuer
Einmal-Code nötig, solange vorhandene Hosting-/Stripe-Secrets unverändert sind. LIVE=0 beibehalten.

Danach auf dem bestehenden VPS:

```bash
cd /opt/seitenwerk
docker compose -f docker-compose.worker.yml run --rm -T --no-deps \
  -e CUSTOMER_ACCEPTANCE_CONFIRM=stripe-sandbox-owned-domain \
  --entrypoint node worker --import tsx \
  /repo/packages/core/scripts/customer-acceptance.ts --apply
```

Fortschritt erscheint pro Tarif. Nachweis in vorhandenem Audit customer_acceptance und normalen
Go-Live-/Billing-/Webhookzuständen. Erst tatsächlicher VPS-Lauf und unabhängiger Provider-/App-
Readback erlauben eine externe Abnahme. Fachliche/steuerliche Live-Freigaben bleiben getrennt.

## Lokale Nachweise

32 bestehende/erweiterte Onboarding-/V4-/Stripe-Lifecycle-Tests bestanden; betroffene Sandboxfälle
anschließend gezielt mit installierter Chromium-Version erneut geprüft. Sechs zusätzliche CLI-/
Backup-/Queue-/Storage-Tests bestanden. Vollständiger Workspace-Typecheck, Lint, Produktionsbuild
einschließlich Worker sowie zwei V4-Browser-E2E gegen Produktionsbuild bestanden. Alle externen
Provider dieser Tests simuliert, lokale ausdrücklich benannte Test-/E2E-Datenbanken. Kein tatsächlicher
Stripe-Monatsstart aus diesen lokalen Tests. Unveränderte Build-Warnungen zu Dateitracing/pnpm dokumentiert.
