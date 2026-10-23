#!/bin/sh
# Tägliches Postgres-Backup (pg_dump -Fc) + Storage-Archiv, Aufbewahrung BACKUP_KEEP_DAYS.
# Läuft im Container "backup". Nach jedem Backup: Wiederherstellungstest (restore-test.sh).
set -eu
KEEP="${BACKUP_KEEP_DAYS:-14}"
HOUR="${BACKUP_HOUR:-2}"
mkdir -p /backups/db /backups/storage

run_backup() {
  TS=$(date -u +%Y%m%d-%H%M%S)
  echo "{\"level\":\"info\",\"msg\":\"backup start\",\"ts\":\"$TS\"}"
  pg_dump -Fc -f "/backups/db/wbm-$TS.dump.tmp" && mv "/backups/db/wbm-$TS.dump.tmp" "/backups/db/wbm-$TS.dump"
  tar -czf "/backups/storage/storage-$TS.tar.gz.tmp" -C /data storage 2>/dev/null && mv "/backups/storage/storage-$TS.tar.gz.tmp" "/backups/storage/storage-$TS.tar.gz" || true
  find /backups/db -name '*.dump' -mtime +"$KEEP" -delete
  find /backups/storage -name '*.tar.gz' -mtime +"$KEEP" -delete
  # Integritätsprüfung: Inhaltsverzeichnis des Dumps muss lesbar sein
  pg_restore -l "/backups/db/wbm-$TS.dump" > /dev/null
  echo "{\"level\":\"info\",\"msg\":\"backup ok\",\"file\":\"wbm-$TS.dump\"}"
  sh /scripts/restore-test.sh "/backups/db/wbm-$TS.dump"
}

# Beim Start einmal sichern, danach täglich zur Stunde HOUR (UTC)
run_backup || { echo '{"level":"error","msg":"backup fehlgeschlagen"}'; psql -q -c "INSERT INTO alerts (level, code, message) VALUES ('error', 'backup_failed', 'Backup fehlgeschlagen')" || true; }
while true; do
  NOW_H=$(date -u +%H | sed 's/^0//')
  if [ "${NOW_H:-0}" -eq "$HOUR" ]; then
    run_backup || { echo '{"level":"error","msg":"backup fehlgeschlagen"}'; psql -q -c "INSERT INTO alerts (level, code, message) VALUES ('error', 'backup_failed', 'Backup fehlgeschlagen')" || true; }
    sleep 3700
  fi
  sleep 300
done
