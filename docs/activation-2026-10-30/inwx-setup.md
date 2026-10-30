# INWX-Zugang über vorhandene Konfiguration

Stand 30.10.2026: Betreiber bestätigt vorhandenes INWX-Konto. REGISTRAR_USER und REGISTRAR_PASSWORD
sind jetzt im Netlify-Projekt seitenwerkworld als Secrets mit Production-/Functions-Scope hinterlegt.
Die neue Konfiguration wurde um 16:29:33 UTC mit unverändertem getestetem Anwendungscode veröffentlicht.
Die Zugangsdaten werden hier nicht veröffentlicht. Worker-Übernahme und erfolgreiche INWX-Anmeldung
sind weiterhin nicht nachgewiesen. [Aktueller Konfigurations-/Deploynachweis](inwx-secrets-configured.json).

## Konkrete Korrektur

Der bestehende Worker-Bootstrap exportierte lediglich REGISTRAR_PROVIDER. Die gezielte Allowlist
übernimmt jetzt zusätzlich REGISTRAR_USER, REGISTRAR_PASSWORD, REGISTRAR_ENV und optional
REGISTRAR_TOTP_SECRET. Nur im bereits geschützten Einmal-Code-Abruf für den vorhandenen VPS;
kein beliebiger Secret-Export, keine Zugangsdaten in Logs/Repository und kein Abruf ins Workspace.
Registrar-/Live-/Domainkauf-Schalter bleiben unverändert.

## Private Einrichtung

Im Netlify-Projekt **seitenwerkworld** unter Project configuration → Environment variables:

| Key | Inhalt | Schutz |
|---|---|---|
| REGISTRAR_USER | Tatsächlicher INWX-Loginname; eine E-Mail-Adresse nur verwenden, wenn sie dort als API-Login funktioniert | Secret, Functions, Production |
| REGISTRAR_PASSWORD | Frisches geändertes Kontopasswort, privat eingeben | Secret, Functions, Production |
| REGISTRAR_TOTP_SECRET | Falls für die API-Anmeldung erforderlich: vorhandenes TOTP-Secret ausschließlich privat hinterlegen | Secret, Functions, Production |
| REGISTRAR_ENV | sandbox | Kein Secret nötig |
| REGISTRAR_PROVIDER | mock bis zur tatsächlichen Abnahme | Kein Secret nötig |

Das im Chat geteilte Passwort nicht erneut ins Chatfenster/Repository schreiben. Neue private
Werte erst nach App-Neuveröffentlichung per frischem normalen Einmal-Code übernehmen: diesmal
NEU=1 LIVE=0 auf dem vorhandenen VPS, damit .env.worker die neu angelegten Secrets enthält.
Das gilt für diese neue INWX-Konfiguration; die vorigen Monats-/Backup-Abnahmen brauchen keinen
INWX-Zugang und können mit ihrer schon vorhandenen Konfiguration fortgeführt werden.

## Begrenzte tatsächliche Prüfung

`packages/core/scripts/registrar-preflight.ts` liest standardmäßig nur Konfigurations-Bools. Mit
--check und REGISTRAR_CHECK_CONFIRM=read-only: vorhandenen InwxRegistrar im Sandbox-Modus aufrufen,
Anmeldung/gegebenenfalls 2FA und ausschließlich domain.check für example.org. DRY_RUN=true und
REGISTRAR_ENV=sandbox zwingend; keine Domain kaufen, keinen Kontakt erzeugen, keine DNS-/Nameserver-
Änderung und keinen allgemeinen Providerwechsel. Unvollständige Antwort gilt nicht als Erfolg.
Anbieterfehler nur als Code/Klasse, keine eventuell kontobezogene Rohmeldung ausgeben.

Auf dem bestehenden VPS nach Secret-Übernahme:

```bash
cd /opt/seitenwerk
docker compose -f docker-compose.worker.yml run --rm -T --no-deps \
  -e REGISTRAR_CHECK_CONFIRM=read-only \
  --entrypoint node worker --import tsx \
  /repo/packages/core/scripts/registrar-preflight.ts --check
```

Ein vorhandenes Konto ist noch kein erfolgreicher Zugang zum gewählten Testsystem. Bei einem
Anmeldefehler Testzugang/API-Login/2FA privat prüfen, niemals versuchsweise auf produktive
Registrierung umschalten. Anmeldung noch nicht tatsächlich ausgeführt; kein kostenpflichtiger Vorgang.

## Prüfungen

Sieben lokale Worker-Bootstrap-Tests bestanden: Einmaligkeit/Ablauf/Parallelabruf, Poolerumstellung,
Allowlist/Quoting/Alias und gezielte INWX-Felder bei unverändertem Mock-/Sandbox-Modus. Vorhandene
INWX-/Hosting-Fake-Transporttests ebenfalls6/6bestanden, insgesamt13gezielteTests. TypeScript/ESLint
für die Änderung bestanden.
Kein echter Konto- oder Sandbox-Registrierungsnachweis aus lokalen Tests ableiten.

Der erste Testversuch wurde wegen eines Nutzungslimits der automatischen Freigabeprüfung nicht
ausgeführt. Nach Nutzerfortsetzung wurde derselbe Test erneut geprüft und normal ausgeführt;
keine Umgehung der Freigabeprüfung.

Code91f07e0 wurde zunächst mit Deploy6ae4c16bedf5d21f461ab0f3 veröffentlicht; der Health-Endpunkt
antwortete danach HTTP200. Nach Hinterlegung der beiden INWX-Secrets wurde derselbe Anwendungscode
über den reinen Dokumentationscommit65788f3 erneut gebaut und veröffentlicht: Deploy
6ae4c5b86f8e571363c4c90d ready/production,30.10.16:29:33UTC,keine gemeldeten Buildfehler oder
Secret-Scanner-Treffer. Worker-Secrets noch per frischem Einmal-Code mit NEU=1 LIVE=0 übernehmen.
Keine INWX-Anmeldung oder Domainregistrierung behauptet; Registrar bleibt mock und DRY_RUN=true.
Die folgende reine Nachweissicherung überspringt CI/Netlify und startet keinen weiteren Deploy.


## Tatsächlicher VPS-Befund und normaler Kontotest

Der Betreiber hat den neuen Worker samt Secrets gestartet. Sein Terminal-Screenshot zeigt einen
erfolgreichen Worker-Gesundheitscheck mit DRY_RUN=true und anschließend beim INWX-Sandbox-Lauf:
stage=blocked,code=2200,errorClass=InwxError. Die Zugangsfelder waren im Prozess vorhanden, sonst
wäre bereits die Konfigurationsprüfung abgebrochen. Eine erfolgreiche Kontoanmeldung ist **nicht**
nachgewiesen. Der Screenshot enthält keinen Nachweis einer Registrierung oder DNS-Änderung.

INWX beschreibt OT&E ausdrücklich als Testsystem mit eigener Testdatenbank:
[offizielle INWX-Clientdokumentation](https://github.com/inwx/python-client/blob/master/README.md).
Ein erfolgreicher Login im normalen Kundenkonto darf daher nicht als erfolgreicher OT&E-Login
gelten. Der aktuelle Fehler beweist umgekehrt weder einen Tippfehler im Passwort noch allein eine
Verwechslung der Systeme. API-Loginname, Kontosystem und gegebenenfalls 2FA bleiben zu unterscheiden.

Der bestehende registrar-preflight.ts bietet jetzt zusätzlich **--production-read-only**.
Dafür ist REGISTRAR_CHECK_CONFIRM=production-read-only erforderlich. Die globale Konfiguration
muss weiterhin DRY_RUN=true,REGISTRAR_ENV=sandbox und REGISTRAR_PROVIDER=mock enthalten.
Nur die einzelne Adapterinstanz verwendet den normalen API-Endpunkt. Ein zusätzlicher Transportfilter
erlaubt ausschließlich account.login, gegebenenfalls account.unlock und domain.check für example.org.
Andere Methoden, Endpunkte oder Domains werden vor der Übertragung abgewiesen. Keine Registrierung,
keine Kontaktanlage, keine DNS-Änderung, kein Providerwechsel und keine Live-Freigabe.

Für diesen einzelnen aktualisierten CLI genügt ein schreibgeschützt eingebundenes Script. Der schon
aktualisierte Worker und die darin vorhandenen Secrets können weiterverwendet werden; kein NEU=1,
kein neuer Einmal-Code und kein allgemeiner Worker-Neuaufbau nötig:

```bash
bash <<'SH'
set -e
curl -fsSL https://raw.githubusercontent.com/y41069586-sudo/Webiste-/codex/resume-2026-10-29/packages/core/scripts/registrar-preflight.ts -o /tmp/seitenwerk-registrar-preflight.ts
cd /opt/seitenwerk
docker compose -f docker-compose.worker.yml run --rm -T --no-deps \
  -v /tmp/seitenwerk-registrar-preflight.ts:/repo/packages/core/scripts/registrar-preflight.ts:ro \
  -e REGISTRAR_CHECK_CONFIRM=production-read-only \
  --entrypoint node worker --import tsx \
  /repo/packages/core/scripts/registrar-preflight.ts --check --production-read-only
SH
```

Erfolg erst bei stage=result,environment=production,authenticatedRead=true. Auch dieser Erfolg
bestätigt nur Anmeldung und Verfügbarkeitsabfrage, keine Domainregistrierung oder vollständige
Go-Live-Abnahme. Bei erneutem2200 den echten INWX-API-Loginnamen im eigenen Kundenkonto prüfen;
Zugangsdaten nicht im Chat teilen. Für vollständige Sandbox-Registrierungsprüfungen bleibt ein
funktionierender OT&E-Zugang gesondert nötig.

17 neue Prüfungen des tatsächlichen CLI-Moduls mit simuliertem Transport und6bestehende
INWX-/Hostingtests bestanden. Geprüft: keine Aufrufe ohne --check, passende doppelte Lesefreigabe,
DRY_RUN/Mock-/Sandbox-Sperren, erfolgreiche Leseantwort auf beiden Systemen, abgewiesene Anmeldung,
fehlgeschlagene Leseantwort, unvollständige Daten und 2FA. Keine echten Kontozugriffe durch die Tests.
Der isolierte Lauf verwendet kein DB-Setup und keinen Datenbank-Reset.
