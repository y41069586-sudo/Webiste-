# Einmalige Backup-/Restore-Abnahme auf dem VPS bestanden

Der Betreiber hat den korrigierten bestehenden Abnahmelauf auf dem eigenen VPS ausgeführt.
Sein Terminal-Screenshot31.10.2026 um10:29 zeigt einen vollständigen erfolgreichen Abschluss.
Speicherprüfung protokolliert2026-10-31T09:29:08.737Z; Worker-Code020b84c.

- Tatsächlicher Datenbankdump, Wiederherstellung in isoliertem Testcontainer und unveränderter
  Quell-/Restore-Fingerprintvergleich erfolgreich. Die Quelldatenbank wurde nicht zurückgesichert.
- 66 Speicherobjekte gesichert, lokal wiederhergestellt und geprüft.
- Erst anschließend Queue-Vorbereitung erfolgreich: migrationsEnabled=false,
  pg-boss-Schemaversion46,31Queues. Keine App-Migrationen oder Seeds ausgeführt.
- Der Worker wurde nach dem Lauf durch den EXIT-Trap wieder gestartet. Ein zusätzlicher
  unabhängiger Worker-Gesundheitscheck ist aus diesem Screenshot nicht ableitbar.
- Lesender Supabase-Abgleich danach bestätigt die zuvor fehlenden Queues research-lead und
  revise-demo. Keine Testereignisse oder künstlichen Erfolgseinträge in Produktivtabellen angelegt.

Nachweisniveau: Ausführung und lokale Wiederherstellung nach Betreiber-Terminalausgabe;
Queue-Existenz zusätzlich unabhängig direkt gelesen. Die privaten Archiv-/Manifestdateien auf
dem VPS wurden hier nicht heruntergeladen oder erneut gehasht. Keine Zugangsdaten im Nachweis.
[Strukturierter Beleg](backup-acceptance-result-2026-10-31.json).

## Verbleibende Betriebsaufgaben

Dies bestätigt die einmalige Wiederherstellbarkeit dieses Laufs. Ein automatischer regelmäßiger
Supabase-/Storage-Backupplan, Aufbewahrungsregeln und eine geschützte Kopie außerhalb des VPS sind
weiter nicht nachgewiesen. Der erhaltene lokale Backup-Loop allein beweist diese Einrichtung nicht.

dashboard backup_status ist weiterhin null: Der Abnahmelauf schreibt bewusst keinen pauschalen
grünen Status. Dieser fehlende Dashboard-Eintrag widerlegt den erfolgreichen Lauf nicht und wird
nicht durch einen erfundenen Erfolgswert ersetzt.

Keine erneute einmalige Backup-/Queue-Abnahme verlangen, solange kein neuer Fehler oder geänderter
Prüfumfang das rechtfertigt. Nächster operativer Verbindungscheck: vorhandener begrenzter lesender
INWX-Kontotest. Registrar-/Mail-/Hosting-Betriebsfreigaben, physischer Probebrief, qualifizierter
Kontrollbetrieb und Steuer-/Vertragsfreigaben bleiben eigenständige offene Punkte.
