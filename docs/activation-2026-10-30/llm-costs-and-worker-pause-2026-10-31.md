# Tatsächliche KI-Recherche und bestätigte Worker-Pause

Betreiber meldet sinkendes Anthropic-Guthaben. Lesender Abgleich zeigte research.autoAi=true,
perTick3, maxSearches8, killSwitch=false und weeklyLlmBudgetCents3000. DRY_RUN sperrt keine
LLM-API-Aufrufe. Nach Queue-Einrichtung wurden zwei research-lead-Jobs triggeredBy=pipeline
abgeschlossen.31.10.2026 um09:31–09:33UTC: zwei lead_research- und zwei lead_research_extract-
Buchungen mit claude-opus-5-5, zusammen intern64,519722Cent, ungefähr0,65€. Das ist eine
konfigurierte interne Berechnung aus Nutzungswerten, kein Abgleich mit der Anthropic-Rechnung.

Initialisieren des Adapters allein kostet keinen Modellaufruf. Der Backup-/Storage-Code
generiert selbst keinen KI-Inhalt; der wieder gestartete Worker führte die bereits aktivierte
Recherche über die nun vorhandene Queue aus. Diese Kostenfolge hätte vor Wiederanlauf
deutlich erklärt werden müssen. Aus der Kostenfrage wurde keine Budget-/Modelländerung ausgeführt.

## Worker-Pause bestätigt

Betreiber-Screenshot31.10.2026 um10:46 zeigt `docker compose ... stop worker` erfolgreich.
Anschließender INWX-Test: kurzlebiger Container mit --no-deps und eigenem CLI-Einstieg,
kein Wiederanlauf des dauerhaften Workers. Keine weitere `up`-/`start`-/Setup-Anweisung,
bis die Fortsetzung mit geklärtem Kostenrahmen beauftragt ist.

Andere manuelle KI-Aufrufe der Web-App oder andere Programme mit demselben Schlüssel sind
dadurch nicht gesperrt. Bereits gestartete Anfragen können später gebucht werden. Keinen
accountweiten Anthropic-Kostenstopp behaupten. INWX-Lesetest war zunächst bei account.login2200
gescheitert, ist inzwischen mit korrigiertem Benutzernamen tatsächlich bestanden; dauerhafte
Worker-Zeile laut Screenshot11:11 ebenfalls gespeichert. Details: [INWX](inwx-setup.md).

## Neues Budget nach ausdrücklicher Betreiberangabe

Der Betreiber hat einen niedrigeren KI-Wochenrahmen vorgegeben. Nur das bestehende Feld
budget.weeklyLlmBudgetCents in der privaten App-Konfiguration wurde atomar angepasst und im
vorhandenen Audit protokolliert. SQL-Rückmeldung bestätigt alle übrigen Konfigurationswerte
unverändert. Der konkrete Betrag bleibt in der privaten Konfiguration, nicht im öffentlichen Git.
Keine Modelle gewechselt, keine neuen Dienste eingerichtet und den Worker nicht gestartet.

## Ergebnis der lokalen Kostenprüfung

Der vorhandene LLM-Service prüft vor Aufrufen nur feste Schätzungen (Text5Cent, strukturiert10Cent,
Recherche20Cent) gegen das interne Wochenbudget. Er nutzt dafür assertBudgetAvailable ohne
Reservierung. Die Token-/Suchkosten werden erst nach der Antwort gebucht. Das ist kein garantierter
Deckel der tatsächlichen Anbieterrechnung; laufende oder parallele Aufrufe können die Schätzung
übersteigen. Aktueller Stand bleibt deshalb pausiert; kein zusätzlicher realer API-Aufruf zur Prüfung.

Anthropic dokumentiert gesonderte monatliche [Workspace-Ausgabenlimits](https://platform.claude.com/docs/en/manage-claude/workspaces).
Ein solches Anbieterlimit wurde hier weder gelesen noch gesetzt. Monatliche Anbieterwährung und
interner Euro-Wochenrahmen nicht als identisch behandeln. Keine harte Kostenbegrenzung behaupten,
solange sie nicht tatsächlich umgesetzt und überprüft ist. Die vorhandene feste Go-Live-Restliste
bleibt bestehen; Kostenfreigabe ist kein automatischer Auftrag zum Wiederanlauf.
