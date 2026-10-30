# Vier Betriebsabnahmen – 30.10.2026

Bestehendes V4/V5-System; Steuerstatus ausdrücklich unbestätigt. Keine §19-/USt-Angabe erfinden.
DRY_RUN=true, kein Kundenbrief, keine echte Zahlung, keine Domainbestellung. Die ausdrückliche
Freigabe „Ja push und veröffentlich“ gilt für geprüfte Änderungen; VPS bedient der Betreiber selbst.

| Strecke | Tatsächlicher Nachweis | Offen |
|---|---|---|
| Stripe | Website-Sandbox verbunden; vorhandene Preise 597/19/99 und aktiver Webhook an dynamischer App erneut gelesen. PAYMENT_PROVIDER=stripe in Netlify gespeichert, Standardmodus test. | Hosted-Kauf beider Tarife, signierte Verarbeitung und Monatsstart nach tatsächlichem Go-Live. Neue ENV erst nach Deploy wirksam. |
| Mail/Onboarding/Domain | Resend-Domain verifiziert, bestehende Adapter erhalten. Seitenwerk.world vorhanden, Netlify-DNS. | Mailfluss noch mock. Hosting-Token fehlt. Vorhandene Domain ersetzt keinen Registrar-Test für neue Kundendomains. |
| Backup/Restore | Lokaler PostgreSQL-Dump und Restore in separatem Container ohne Netzwerk; identische Inhaltsfingerprints. Neue Storage-Restore-CLI prüft Binärdaten/Korruption. | Noch kein auf dem VPS ausgeführter Supabase-/S3-Gesamtrestore. Lokaler Lauf setzt keinen produktiven backup_status. |
| Recherche | Offene OSM-Kandidaten nachrecherchiert; Yalcin hat eigene Website, Malz-Datensatz überholte Identität. Weiterer aktiver Reinigungsbetrieb hat ebenfalls eigene Website. | Kein Mindestkriterien vollständig erfüllender echter Betrieb abgenommen. Keine generische Demo zur künstlichen Erfüllung erzeugt. |

## Implementierung

- `queue:prepare --apply --queues-only`: fehlende Queues im installierten pg-boss ergänzen, ohne
  Migrationen/Seeds. Tatsächlich fehlen research-lead und revise-demo. Test erhält bestehende Jobs,
  Migrationenzahl und Schemaversion.
- `storage:backup restore-local`: Hashprüfung vor Anlage eines neuen Restore-Ziels; bestehendes Ziel
  niemals überschreiben. Quelle nur lesen, kein Remote-PUT/DELETE.
- `infra/backup/managed-acceptance.sh`: private Worker-Verbindung, Dump, isolierter DB-Restore und
  Inhaltsvergleich, S3-Snapshot plus lokaler Objekt-Restore. Optional erst danach fehlende Queues
  ergänzen. Kein automatischer grüner Betriebsstatus.
- `backup-connection.ts`: verifiziertes TLS, 0600-Dateien, keine Zugangsdaten in Ausgabe. Fehlende
  SELECT-/RLS-Rechte blockieren Vollbackup. BACKUP_DATABASE_URL darf privat auf dem VPS eine
  berechtigte Verbindung derselben DB liefern. App-Rolle nicht hochstufen, RLS nicht abschalten,
  niemals --enable-row-security als vermeintlich vollständiges Backup einsetzen.
- Vorhandener Worker-Einmal-Code exportiert nun NETLIFY_API_TOKEN; NETLIFY_AUTH_TOKEN bleibt
  ausgeschlossen. Keine beliebigen Konto-Secrets exportieren.

## Prüfungen dieser Fortsetzung

- 10/10 Tests in fünf Dateien bestanden: Storage-Hash/Restore/Korruption, Queue mit Joberhalt,
  private Backup-Verbindung und Sperre eingeschränkter Rolle, Bootstrap/parallel eingelöster Code.
- Gesamter Workspace-Typecheck, gezieltes ESLint und Bash-Syntax bestanden.
- 28/28 zusätzliche bestehende Stripe-/Hosted-Checkout-/Abo-Lebenszyklus-Regressionen bestanden
  (lokale Testdatenbank und Fake-Transport, kein echter Stripe-End-to-End-Nachweis).
- Vollständiger Produktionsbuild bestanden, einschließlich Worker-TypeScript. Unveränderte
  Warnungen aus Template-Fotoimporten und pnpm-Childprozess; kein Buildfehler.
- Lokaler vollständiger DB-Restore nach Korrektur der Docker-Dateirechte bestanden. Dieser Lauf
  schloss bewusst kein produktives S3 ein; Storage-Restore separat lokal getestet.
- Erster Testaufruf scheiterte an Sandbox-Netzrechten; korrekter isolierter Wiederholungslauf grün.
  Keine Prüfungen gegen Produktionsdatenbank und kein Supabase-Testreset.

## Hosting-Secret im bestehenden Netlify-Projekt

1. User settings → Applications → Personal access tokens: Hosting-Test-Token anlegen.
2. Projekt `seitenwerkworld` → Project configuration → Environment variables.
3. NETLIFY_API_TOKEN als Secret, Production-Kontext, Functions-Scope hinterlegen.
4. Nach App-Deploy regulären Worker-Einmal-Code verwenden. Token nie im Chat/Git/NEXT_PUBLIC_.

Testziel: test.seitenwerk.world. Root-Domain/Firmenwebsite erhalten. Kein Domainkauf. Ein Token
allein aktiviert weder Hosting-Provider noch automatische Kundenseiten-Veröffentlichungen.

## VPS-Prüfung nach Veröffentlichung

Neuen Worker-Code im Admin erzeugen, bekannten Setup-Aufruf mit NEU=1 LIVE=0 ausführen.
Die App-Rolle seitenwerk_admin_backend ist weder Tabelleninhaber noch BYPASSRLS; für Vollbackup
privat BACKUP_DATABASE_URL mit berechtigter Supabase-Rolle derselben DB setzen. Keine Geheimnisse
im Chat. Im vorhandenen Verzeichnis /opt/seitenwerk anschließend:

```bash
PREPARE_MISSING_QUEUES=1 bash infra/backup/managed-acceptance.sh
```

Noch kein Nachweis eines VPS-Laufs. Bei geänderten Quelldaten keine Abnahme; in ruhiger Pipeline
wiederholen. Für Dauerbetrieb fehlen zusätzlich Aufbewahrung, externe geschützte Backup-Kopie
und wiederkehrende Restore-Probe.
