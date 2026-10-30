# Begrenzter Hosting-Probelauf auf dem bestehenden VPS

## Tatsächlich bestätigt

Die App liest den vorhandenen Secret-Eintrag NELITFY_API_TOKEN kompatibel als NETLIFY_API_TOKEN.
Die frühere Screenshot-Auswertung hatte die vertauschten Buchstaben übersehen. Neues Laufzeit-GET
am 30.10.2026 11:26:11 UTC: tokenConfigured=true, Netlify HTTP200. Provider weiterhin mock,
DRY_RUN=true. Token nicht ausgelesen, umgespeichert oder offengelegt. Nachweis: hosting-connection.json.

Die tatsächliche private Basis-Kundenvorschau wurde geprüft: noindex, sichtbarer fiktiver Teststatus,
kein privater Kundentoken im HTML, keine lokalen Bild-/CSS-Dateiverweise und kein aktiver Submit.
Diese Prüfung erlaubt den Hosting-Probelauf, ersetzt aber keine Rechts-/Design-/Kundenabnahme.

## Vorbereiteter Ablauf, noch nicht auf dem VPS ausgeführt

Der Betreiber aktualisiert den vorhandenen Worker selbst. Neuen Einmal-Code im Admin erzeugen,
dann bekannten Setup-Aufruf mit NEU=1 LIVE=0 verwenden. Er exportiert den Hosting-Token unter dem
kanonischen Namen in die geschützte Worker-Umgebung. Keine Secrets im Chat/Repository.

Danach im vorhandenen Verzeichnis /opt/seitenwerk:

```bash
docker compose -f docker-compose.worker.yml run --rm -T --no-deps \
  -e HOSTING_ACCEPTANCE_CONFIRM=test.seitenwerk.world \
  --entrypoint node worker --import tsx \
  /repo/packages/core/scripts/hosting-acceptance.ts \
  --order=4991f35d-0c23-465f-b4b1-0f320d5a5f91 --apply
```

Ohne --apply prüft derselbe Aufruf ausschließlich die Fixture, ohne Hosting-API-Aufruf.
Mit --apply wird tatsächlich ein separates Testprojekt erstellt/wiederverwendet, die gespeicherte
fiktive Vorschau hochgeladen und ausschließlich test.seitenwerk.world gebunden. Vorher bestehende
Root-Domain-Zuordnung lesen; bestehende Firmen-/App-Projekt-IDs als Uploadziele ausdrücklich sperren.
Kein Registraraufruf, Domainkauf oder Ändern von Root-/Mail-DNS. Netlify DNS erstellt bei Zuordnung
einer Subdomain zu einer Site die NETLIFY-Einträge automatisch; siehe offizielle Dokumentation unten.

Erfolg benötigt tatsächliches HTTPS200 mit identischem HTML-Hash. Zusätzlich Root-Startseite vor/
nach dem Test vergleichen. Bei noch ausstehendem DNS/SSL endet der Lauf mit Code2; kein Erfolg
behauptet. Keine Abschaltung der Zertifikatsprüfung. Ein eigener hosting_acceptance-Audit enthält
nur technische Nachweise, keine Tokens oder Empfängeranschriften. Keine App-Kundenveröffentlichung,
kein billingStartedAt/liveAt und kein Abostart werden gesetzt. Positiver Monatsstart bleibt separat offen.

Der Test kann bestehende Netlify-Kontingente verbrauchen; er bucht keinen neuen Tarif oder Registrar.
Keine automatische Aktivierung des allgemeinen Hosting-Providers oder Versandfreigabe.

## Implementierung und Prüfstand

- Bestehender NetlifyHosting-Adapter wiederverwendet, keine neue Datenbank/Anwendung/Providerwahl.
- CLI sperrt Live-/echte Empfänger, fehlenden Teststatus, fehlende Vorschau, private Links,
  aktive Formulare und mobile Überläufe. Eigenes Absenderpostfach als Testempfänger erforderlich.
- 3/3 lokale CLI-Sicherheitstests mit fiktiven Daten und **ohne** Hosting-API-Aufrufe bestanden.
- 12/12 Konfigurations-/Bootstrap-Tests und6/6 bestehende Hosting-/Registrar-Fake-Transporttests grün.
- TypeScript und gezieltes ESLint bestanden. Alias-Fix zusätzlich per Web-Produktionsbuild geprüft
  und tatsächlicher Netlify-Laufzeitbestätigung verifiziert. CLI nicht als extern bestanden ausgeben.
- Vor externem Einsatz gefundener TypeScript-Fehler (fetch Response.status ist eine Eigenschaft)
  korrigiert. Bestehende Netlify-CSP ließ eingebettete Fonts nicht zu; font-src self/data ergänzt,
  weil die echte Kundenvorschau WOFF-Fonts als Data-URLs enthält. Sonstige Restriktionen bleiben.

Offizielle DNS-Grundlage, abgerufen 30.10.2026:
https://docs.netlify.com/manage/domains/configure-domains/dns-records/
https://docs.netlify.com/manage/domains/configure-domains/delegate-a-standalone-subdomain/
