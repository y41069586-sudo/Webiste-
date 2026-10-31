# Verbleibende Betriebsarbeit tatsächlich umgesetzt,31.10.2026

Betreiberauftrag: die fünf verbleibenden Punkte nacheinander bearbeiten. Bestehende Preise,
Architektur und bestandene Abnahmen erhalten. Fehlende Angaben nicht erfinden. Ein leerer
Steuerstatus wird nicht als bestätigte Steuerbefreiung oder korrekte Verkaufsrechnung behandelt.

## Provider und Veröffentlichung

In der vorhandenen Netlify-App wurden EMAIL_PROVIDER=resend und HOSTING_PROVIDER=netlify
im Production-Kontext gesetzt. Zugangsdaten waren vorhanden und die bisherigen einzelnen
Providerabnahmen bestanden. Veröffentlicht mit Deploy `6ae5db4c1352178f03173752` am
31.10.2026 um 12:14:09 UTC, Quellcommit `2345428f7a44458a165a417d3cc67df8970405dd`.
Danach authentifizierter Laufzeitabgleich: Resend/Netlify aktiv, bestehende API-Zugänge lesbar,
Stripe-Testmodus und DRY_RUN erhalten. Keine Mail wurde aus dieser Konfigurationsänderung
verschickt. Vorherige Queue-Leseprüfung: keine created/retry/active-Jobs.

Die automatische Freigabeprüfung hat REGISTRAR_ENV=production abgelehnt: dauerhafter
Produktionsmodus ermöglicht Domainregistrierung/DNS und Kosten bei bisherigen Testgrenzen.
Kein Umgehen per Shell, Bootstrap oder Worker. REGISTRAR_PROVIDER wurde wieder auf mock
gesetzt. Der bestandene einmalige INWX-Kontotest und gespeicherte Benutzername bleiben gültig.
Stripe bleibt test, DRY_RUN=true und Echtbrief-Freigabe false. Steuerbestätigung bleibt false.

## KI-Kosten

Bestehendes Budgetfeld bleibt der Maßstab, kein Modellwechsel. Jeder physische Anthropic-
Generierungsversuch zählt jetzt separat: kostenlose Tokenzählung, bei Websuche begrenzende
Model-Metadaten, anschließend konservative Reservierung unter gemeinsamer DB-Advisory-Sperre.
Ausgabetokenlimit und Suchkosten berücksichtigt, keine Cache-Rabatte im reservierten Betrag.
Keine versteckten SDK-Retries oder Server-Fallbacks. Tool-Retry und pause_turn müssen erneut
reservieren. Jede physische Anfrage bekommt einen eigenen Schlüssel, auch bei wiederholtem
fachlichem Idempotenzschlüssel. Bekannte Antworten lösen die Reservierung genau einmal ab.
Unklare Transportabbrüche bleiben reserviert, auch über den Wochenwechsel. Kostenabweichung
sperrt weitere KI-Aufrufe bis zur tatsächlichen Klärung. Mikro-Cent werden zur Zulassung aufgerundet.

Grenze: konfigurierte Modellpreise und Wechselkurs sind weiterhin keine Anbieterrechnung und
kein kontoweites Anthropic-Ausgabenlimit. Bei Websuche wird das maximale Anbieter-Eingabefenster
reserviert. Passt dessen möglicher Betrag nicht ins freigegebene Budget, erfolgt KEIN Aufruf.
Kein stiller Wechsel auf ein günstigeres Modell und kein Wiederanlauf des VPS-Workers.

Offizielle Dokumentation:
- https://platform.claude.com/docs/en/build-with-claude/token-counting
- https://platform.claude.com/docs/en/api/models/retrieve
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool

## Regelmäßiger Backupplan

infra/backup/install-managed.sh installiert auf dem vorhandenen VPS einen systemd-Timer:
täglich02:15UTC plus höchstens10Minuten Zufallsversatz, nachgeholter Lauf nach Ausfall.
Vor der Timeraktivierung muss der erste tatsächliche Lauf bestehen. Privilegierter DB-Zugang
einmalig verdeckt im Terminal, Datei /etc/seitenwerk-backup.env mit0600, keine Chat-Secrets.
Das Worker-Image wird gebaut, der Daemon aber weder gestartet noch recreatet.

Jeder Lauf: gemeinsamer read-only PostgreSQL-MVCC-Snapshot für Fingerprints und pg_dump,
isolierter Restore, Inhaltsvergleich und bestehende S3-Objektsicherung/Restoreprüfung.
Damit dürfen während der Sicherung normale App-Schreibvorgänge stattfinden. Keine Quelle
zurücksetzen, keine Migrations-/Queuejobs und keine kostenpflichtige KI auslösen.

Danach komprimiertes Archiv, AES-256-GCM mit gesonderter HKDF-Schlüsselableitung aus dem
vorhandenen privaten ENCRYPTION_KEY (optional BACKUP_ENCRYPTION_KEY). Externe Kopie in
backups/managed/ im bestehenden privaten S3-Speicher. Zur Prüfung vollständig herunterladen,
authentifizieren, entschlüsseln und SHA256 vergleichen. Dieser Präfix wird aus Objektsicherungen
ausgeschlossen, damit alte Backups nicht rekursiv erneut archiviert werden. Kein neuer Anbieter.
Nur nach Erfolg Aufbewahrung14Tage, externe Kopien mindestens die neuesten zwei behalten.
Maximal256MiB Archiv im vorhandenen Buffer-Adapter; darüber klarer Fehler statt Teilsicherung.

Der bestehende Supabase-Speicher liegt außerhalb des VPS, teilt aber den Datenbankanbieter.
Das ist keine unabhängige Zweitanbieter-/Account-Sicherung. Wiederherstellung erfordert den
privaten Schlüssel außerhalb des verlorenen VPS; bestehende geschützte Konfiguration separat
sichern. Kein Erfolgseintrag in backup_status, bevor tatsächlich ein Lauf nachgewiesen ist.
Installation/Timer und erste externe Kopie können hier ohne VPS-Zugang nicht ausgeführt werden.

## Kontrollbetrieb und rechtliche Angaben

Öffentliche Kandidaten recherchiert; eigene Website, gelöschte Anzeige oder unbestätigte
Identität/Anschrift werden nicht durch positive Annahmen ersetzt. Ein Malerbetrieb erfüllt anhand
aktueller Eigenwerbung, tatsächlich beworbener kurzfristiger Termine, geprüfter Anschrift und
mehrerer Website-Prüfwege die lokale Eignungsprüfung. Recherche privat als Kontrollinput
hinterlegt; keine ungeprüften positiven Lead-/Demo-/Briefstatus gesetzt. Name und Kontaktdaten
gehören nicht ins öffentliche Repository. Eine vollständige reale Demo-/Briefabnahme bleibt offen.
Keine Empfängeranschrift, Bildrechte oder Leistungen erfunden, kein Fremdbrief versandt.
Der bereits geprüfte Rückgabe-PDF-Nachweis ersetzt keinen tatsächlich empfangenen Papierbrief.

Der einzelne CLI `control-acceptance.ts` nutzt den normalen Import und die normale
Recherchevalidierung, erzeugt die individuelle Demo und führt Browser-/KI-QA durch. Er fordert
DRY_RUN und Stripe-Testmodus, startet keinen Daemon, erzeugt keine Folgejobs und erteilt keine
Freigaben. Wiederholung bereits ausgeführter QA verwendet das vorhandene Ergebnis. Danach
müssen Fakten, Bildkennzeichnung, Desktop und Mobilansicht tatsächlich geprüft werden, bevor
eine Demo veröffentlicht oder ein Brief erzeugt wird. Generierungsaufrufe laufen ausschließlich
durch die neue Kostenreservierung; bei zu kleinem Budget bleibt der Lauf klar blockiert.

Frische Aktivität darf nicht aus dem heutigen Lesen einer alten Anzeige entstehen: KI-Fakten
für Betrieb/Akquise brauchen jetzt ein tatsächliches Ereignis-/Veröffentlichungsdatum. Fehlende,
ungültige oder zukünftige Daten werden verworfen; alte Daten bleiben als alt erkennbar. Ein
neues Profil-Mitgliedsdatum wird weiterhin nicht zum Gründungsdatum. Wohnungsübergabe und
Einzug können den belegten Privatkundenfokus eines Malers beschreiben, ohne zusätzliche
Renovierungsleistungen zu erfinden.

Ein geprüfter öffentlicher Profilimport hat eine eigene Quellenart und nennt im Art.-14-Hinweis
die tatsächlich gespeicherte Kleinanzeigen-Anzeigen-ID. Ungeprüfte Plattformen werden nicht
unter dieser Quellenart akzeptiert. Telefonnummern werden auch über Orts-/PLZ-Grenzen auf
Dubletten geprüft; abweichende Identitäten oder Anschriften erfordern manuelle Zusammenführung.
`infra/vps/prepare-providers.py` aktualisiert ausschließlich die Provider-Auswahl in der vorhandenen
privaten Worker-Datei, bewahrt Geheimnisse/Modellwahl und hält Stripe-Test, DRY_RUN und Registrar-
Sperre fest. Es startet Docker oder den Worker nicht.

Leere Steuerfelder werden schon vom vorhandenen Rechnungslayout ausgeblendet. Keine neue
§19-Erklärung, Handelsregistereintragung oder Unternehmensrechtsform erzeugen. Das erlaubt
nicht, erforderliche Rechnungsangaben als optional zu deklarieren: §14Abs.4Nr.2UStG für die
reguläre Rechnung; §34aUStDV hat eigene Anforderungen bei Kleinunternehmerrechnungen.
Der Einrichtungsbetrag597€ liegt über der Kleinbetragsgrenze250€ aus §33UStDV.
§14GewO knüpft die Anzeige an den Beginn eines stehenden Gewerbes; eine Testbezeichnung
beweist keine Ausnahme. Tatsächliche Einordnung nicht aus fehlendem Registereintrag ableiten.
Bestehende Trennung Brief-/Verkaufsfreigabe bleibt erhalten.

Quellen erneut31.10.2026 gelesen:
- https://www.gesetze-im-internet.de/ustg_1980/__14.html
- https://www.gesetze-im-internet.de/ustdv_1980/__34a.html
- https://www.gesetze-im-internet.de/ustdv_1980/__33.html
- https://www.gesetze-im-internet.de/gewo/__14.html

## Prüfungen

- Ergänzende Kontrollstrecke: 49 unterschiedliche gezielte Tests in sieben Dateien bestanden,
  einschließlich echter Browser-/Lighthouse-Prüfung, bisherigem automatischem Rebuild und
  dem neuen Einzelmodus ohne spätere QA-/Rebuild-Jobs. Zwei reine lokale Python-Tests prüfen
  die atomare Providerdatei-Korrektur, erhaltene Geheimnisse und unveränderten Workerzustand.
  Workspace-Typecheck, ESLint und App-/Worker-Build erneut bestanden.
-51gezielte Tests in11Dateien bestanden: Budget/Parallelität/Retry/Abrechnung, verschlüsselte
  externe Kopie/Tamper/Retention, Storage, echtes lokales MVCC-Verhalten, Onboarding,
  Domainkauf-Sperre, Rechnungsneutralität, Stripe-Test-/Live-Trennung und Readiness.
-Nach präzisierter Mikro-Cent-Grenzprüfung17betroffene Tests erneut bestanden.
-Workspace-Typecheck, ESLint und vollständiger App-/Worker-Build bestanden.
-Bash-Syntax und git diff --check bestanden. systemd-Dateien hier gelesen; lokale Cloudumgebung
  hat keine docker.service-Systemd-Unit. Kein behaupteter installierter VPS-Timer.
-Ein erster versehentlich breiter Testaufruf ohne Chromium-Pfad wurde beendet; anschließend
  gezielte Prüfungen mit installiertem /usr/bin/chromium und separaten lokalen Testdatenbanken.
  Keine Produktions-Testresets oder echten Provideraufrufe durch diese Tests.

## Nächster tatsächlicher Betreiberlauf

Kontrollstrecken-Codecommit `4b39524` auf beiden bisherigen Branches gepusht. Der Netlify-Connector
bietet keinen Build-Aufruf, vorhandene Secrets werden verdeckt zurückgegeben; privater lokaler
CLI-Buildtoken nicht vorhanden. Kein neuer Build gestartet, keine Secretwerte veröffentlicht.
Zuerst im bestehenden Netlify-Projekt `seitenwerkworld`: Deploys → Trigger deploy → Deploy site.
Nach Veröffentlichung prüfen, dass der aktuelle Produktionsbranch und mindestens `4b39524`
veröffentlicht sind. Vorhandene Provider-/Kostenkorrektur `2345428` ist schon aktiv.

Nach Abschluss eines eventuell noch laufenden Backupinstallers im vorhandenen VPS:

```bash
bash <<'SH'
set -e
cd /opt/seitenwerk
git fetch origin claude/website-brief-maschine-0d0s37
git merge --ff-only origin/claude/website-brief-maschine-0d0s37
python3 infra/vps/prepare-providers.py /opt/seitenwerk/.env.worker --apply
bash infra/backup/install-managed.sh
docker compose -f docker-compose.worker.yml run --rm -T --no-deps \
  -e CONTROL_ACCEPTANCE_CONFIRM=single-demo-no-send \
  --entrypoint node worker --import tsx \
  /repo/packages/core/scripts/control-acceptance.ts --case=launch-control-2026-10-31
SH
```

Der Installer braucht das Datenbankpasswort nur bei noch fehlender privater Backupdatei und
fragt es unsichtbar im Terminal ab. Ein Image-Build, erster geprüfter täglicher Sicherungslauf,
danach genau eine echte KI-Demo mit QA innerhalb des bestehenden internen Budgets. Dauerhafter
Worker wird nicht gestartet, keine Empfängerbriefe, Domainkäufe oder Live-Zahlungen. Fehler bricht
die Folge ab. `awaiting_manual_review` bedeutet anschließend Prüfung, keine Versandfreigabe.
Eine erfolgreiche Erstinstallation ersetzt keine Prüfung nach Eingang des physischen Probebriefs.
