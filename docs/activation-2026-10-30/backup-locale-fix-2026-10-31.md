# Restorevergleich: Sortierregeln nicht identisch

## Tatsächlicher VPS-Befund

Screenshot31.10.2026 um10:18 zeigt: Passwort-/Verbindungs-/Berechtigungsprüfung bestanden,
Dump erstellt und in den isolierten Testcontainer kopiert, pg_restore ohne gemeldeten Fehler
abgeschlossen. Der anschließende Inhaltsvergleich scheitert in Zeile12. Der EXIT-Trap startet
den Worker wieder. Storage-Wiederherstellung und Ergänzung der fehlenden Queues sind noch
nicht erreicht. Keine erfolgreiche Gesamt-Backupabnahme.

## Nachgewiesener Fehler im Vergleich

Die bisherige fingerprint.sql sortiert vollständige JSON-Zeilen und Tabellennamen mit der
Standardsortierung der jeweiligen Datenbank. Diese ist von Locale/Provider/Betriebssystem
abhängig. [PostgreSQL-Dokumentation](https://www.postgresql.org/docs/17/collation.html).

Lesend in der tatsächlichen Quelldatenbank geprüft:

- PostgreSQL17.11, datcollate/datctype=en_US.UTF-8.
- Zeile12 der aktuellen verwendeten Tabellenreihenfolge ist public.claims.
- Dieselben17 Einträge dieser Tabelle ergeben mit alter Locale-Sortierung
  `e989a68aacaca5326f500d74099a39a2`, mit Byte-Sortierung
  `1a180f9c6643f617e6fa317356344139`. Keine Quelldaten dafür geändert oder exportiert.

Das beweist eine mögliche falsche Abweichung bei identischen Daten. Die beiden privaten
Manifestdateien auf dem VPS wurden hier nicht gelesen; deshalb bleibt die tatsächliche
Übereinstimmung dieses Produktionsdumps ungeprüft. Nicht pauschal Datenverlust ausschließen
und den Fehler nicht durch Abschalten der Inhaltsprüfung übergehen.

## Korrektur und Nachweise

- Bestehende fingerprint.sql: `COLLATE "C"` für vollständige Zeilen und Tabellenreihenfolge.
  Weiterhin alle bisherigen Tabellen, vollständige Zeilenwerte, Zeilenzahlen und Digestvergleich.
  Keine Tabellen-/Zeilenfilter, keine Normalisierung oder Ausnahmen für Abweichungen.
- Bei verbleibendem Restorefehler zeigt das bestehende Script zusätzlich den Manifest-Diff:
  ausschließlich Tabellennamen, Anzahl und Prüfsummen; keine Datensätze/Zugangsdaten.
- Vier neue Tests mit zwei getrennten lokalen Testdatenbanken und unterschiedlichen Default-
  Sortierungen: alte falsche Abweichung reproduziert; korrigierter Vergleich identisch;
  geänderter Wert bei gleicher Zeilenzahl, verlorene Zeile und fehlende leere Tabelle blockieren.
- Zusätzlich tatsächlicher lokaler pg_dump/pg_restore mit fiktiven Daten unter PostgreSQL16.15:
  vorher unterschiedliche Hashes bei gleichem Inhalt, nach Korrektur gleich; echte Änderung
  weiterhin erkannt. ICU/en-US als Quelle und libc/C als Wiederherstellung. Keine Produktions-
  Verbindung in diesem lokalen Lauf. Der konkrete externe17er-Lauf bleibt separat offen.
- Insgesamt17 gezielte Core-Tests, Core-Typecheck, Lint, Bash-Syntax und Diffprüfung bestanden.
  Keine erneute Web-App-Veröffentlichung erforderlich; ausschließlich Backup-SQL/-Script und Tests.

## Nächster VPS-Lauf

Git-Update genügt: Das vorhandene Script bindet infra/backup und packages/core/scripts direkt
ein. Kein Docker-Neuaufbau und kein neuer Worker-Einmal-Code. Vorhandene Dumps behalten.
Danach die bestehende Passwort-Eingabehilfe erneut ausführen; Zugang zur richtigen Datenbank
bleibt erneut geprüft. Erst erfolgreicher Quell-/Restore- und Storage-Vergleich erlaubt das
anschließende Ergänzen der fehlenden Queues. DRY_RUN und Versand-/Live-Zahlungssperren erhalten.
