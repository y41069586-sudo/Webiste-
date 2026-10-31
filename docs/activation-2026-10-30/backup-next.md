# Supabase/S3-Abnahme auf dem bestehenden VPS

Stand 30.10.2026: Script und lokale Schutz-/Restoretests vorhanden; tatsächlicher Produktionslauf
weiter offen. Aktuell backup_status=null. **Nicht** aufgrund lokaler Tests als abgenommen kennzeichnen.

Aktualisierung31.10.2026: Betreiber hat den Aufruf ausgeführt; im verdeckten Feld kam keine
vollständige Verbindungs-URL an. Abbruch mit ERR_INVALID_URL vor Dump/Restore/Queue-Ergänzung;
EXIT-Trap hat den kurz gestoppten Worker wieder gestartet. Kein erfolgreicher Backuplauf daraus.
Die Eingabeprüfung ist korrigiert: URL-Form und Verbindungs-/Berechtigungsprüfung vor Worker-Stopp,
keine Ausgabe roher Parser-/Verbindungsfehler mit möglichen Passwörtern.13 lokale Tests bestanden
(8 Verbindung/Eingabe/Worker-Schutz,4 Queue,1 Storage), Core-Typecheck, Lint und Bash-Syntax bestanden.
Keine neue Gesamt-Backupabnahme und kein automatischer grüner backup_status.

Die reguläre App-Rolle ist nicht für pg_dump mit abgeschalteter Row-Security berechtigt. Kein RLS
abschalten und App-Rolle nicht hochstufen. Eine berechtigte Verbindung derselben vorhandenen Supabase-
Datenbank ist erforderlich. Netlify-Metadaten enthalten keine konfigurierte BACKUP_DATABASE_URL.
Öffentliche App-Policies brauchen keine auth-Schema-Funktionen und es bestehen keine Fremdschlüssel
auf externe Schemas; tatsächlicher Restore bleibt trotzdem der entscheidende Nachweis.

## Privaten Zugang finden und eingeben

Im vorhandenen Supabase-Projekt über Connect die **Session-Pooler-Verbindung mit Port5432** für die
berechtigte postgres-Rolle kopieren und das eigene Datenbankpasswort einsetzen. Nicht anon/service_role-
API-Key und nicht Transaction-Port6543. Verbindung/Passwort nicht im Chat, Git oder Screenshot teilen.
Falls das Datenbankpasswort unbekannt ist, nicht unbedacht zurücksetzen: andere eingerichtete Verbindungen
können davon abhängen. Bereits privat konfigurierte BACKUP_DATABASE_URL kann weiterverwendet werden.

Im Dashboard des vorhandenen Projekts `Webiste-`: **Connect → Session pooler → URI**.
Den Platzhalter `[YOUR-PASSWORD]` durch das Datenbankpasswort dieses Projekts ersetzen; bei
Sonderzeichen im Passwort URL-Kodierung beachten. Die vollständige einzelne URI-Zeile ab
`postgresql://` oder `postgres://` in die verdeckte Terminaleingabe kopieren. Das Feld bleibt beim
Einfügen optisch leer; Enter bestätigt. Die hier dokumentierten Bezeichnungen sind keine echten
Zugangsdaten. Keine Passwörter zur Kontrolle im Chat oder als sichtbares Shell-Argument angeben.

Nach aktuellem regulärem Worker-Code-Update im vorhandenen Verzeichnis:

```bash
cd /opt/seitenwerk
ASK_BACKUP_URL=1 QUIESCE_WORKER=1 PREPARE_MISSING_QUEUES=1 \
  bash infra/backup/managed-acceptance.sh
```

Für die Eingabekorrektur reicht `git pull --ff-only`: Das vorhandene Script bindet
`packages/core/scripts` schreibgeschützt in den Worker ein; kein Image-Neuaufbau oder Secret-Abruf nötig.

Die Eingabe im Terminal ist verdeckt und wird nicht in der Shell-History/Repository gespeichert.
Der kurz angehaltene Worker wird über EXIT-Trap auch bei Fehler wieder gestartet. Die Web-App bleibt
verfügbar; eintreffende Änderungen können den Konsistenzvergleich scheitern lassen, dann kein Erfolg.
Wer den Zugang nicht parat hat, kann abbrechen; keine fehlenden Rechte mit eingeschränktem Dump umgehen.

## Tatsächliche Reihenfolge und Nachweise

1. Identität derselben DB, berechtigte Rolle und verifiziertes TLS prüfen; private0600-Dateien.
2. Konsistenten Custom-Dump der App-/Drizzle-/pg-boss-Schemas erzeugen; App-Inhaltsfingerprints vor/nach
   vergleichen. Quelle wird ausschließlich gelesen und niemals zurückgesichert/gelöscht.
3. Restore in einen temporären PostgreSQL-Container mit **network none**. Tabellen-/Inhaltsfingerprints
   vergleichen, privaten S3-Dateisnapshot erstellen und lokal mit Hashprüfung wiederherstellen.
4. Erst nach Erfolg vorhandene fehlende Queues über --queues-only ergänzen: keine Migrationen,
   keine Seeds und vorhandene Jobs erhalten. Positives queuePreparationVerified nur nach echtem Erfolg.
5. Dump/Hash/Manifest und Ergebnis unter /opt/seitenwerk-backups/acceptance-… erhalten; temporäre
   Verbindungs-/Passwortdateien und Restore-Container entfernen, Worker wieder starten.

Dieses Script setzt noch keinen pauschalen grünen Dashboardstatus. Tatsächliche Resultate anschließend
prüfen. Dauerhafte private Backup-Verbindung, automatische Wiederholung/Aufbewahrung und geschützte
externe Kopie sind eigene verbleibende Betriebsaufgaben; lokaler Abnahmedump allein ersetzt sie nicht.
