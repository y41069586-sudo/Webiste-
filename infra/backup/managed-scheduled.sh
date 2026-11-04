#!/usr/bin/env bash
# Daily verified managed DB+object snapshot, encrypted copy to existing private off-VPS S3.
# Never starts/stops the daemon worker, never imports its scheduler or calls an LLM.
set -euo pipefail
umask 077
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo"
# shellcheck source=compose-files.sh
. "$repo/infra/backup/compose-files.sh"
mapfile -t compose_args < <(compose_files)
: "${BACKUP_DATABASE_URL:?Privater vollständiger Backupzugang fehlt}"
root=${BACKUP_ROOT:-/opt/seitenwerk-backups}
mkdir -p "$root"
exec 9>"$root/scheduled.lock"
flock -n 9 || exit 0
run=$(mktemp -d "$root/scheduled-XXXXXXXX")
BACKUP_ROOT="$run" QUIESCE_WORKER=0 PREPARE_MISSING_QUEUES=0 CONSISTENT_BACKUP_SNAPSHOT=1 bash infra/backup/managed-acceptance.sh
snapshot=$(find "$run" -mindepth 1 -maxdepth 1 -type d -name 'acceptance-*' -print -quit)
[ -s "$snapshot/result.json" ] || exit 1
[ ! -e "$snapshot/source-pg.env" ] && [ ! -e "$snapshot/local-pg.env" ] || exit 1
tar --exclude=storage-restored -czf "$run/snapshot.tar.gz" -C "$snapshot" .
docker compose "${compose_args[@]}" run --rm -T --no-deps --user 0:0 \
  -v "$run:/snapshot" -v "$repo/packages/core/scripts:/repo/packages/core/scripts:ro" \
  -e BACKUP_ENCRYPTION_KEY -e BACKUP_KEEP_DAYS \
  --entrypoint node worker --import tsx /repo/packages/core/scripts/offsite-backup.ts \
  upload /snapshot/snapshot.tar.gz /snapshot/offsite-receipt.json
# Retention happens only after both restore verification and offsite read/decrypt verification.
keep=${BACKUP_KEEP_DAYS:-14}
[[ "$keep" =~ ^[0-9]+$ ]] && [ "$keep" -ge 7 ] || exit 1
find "$root" -mindepth 1 -maxdepth 1 -type d -name 'scheduled-*' -mtime +"$keep" -exec rm -rf -- {} +
# Erst jetzt (Restore + Offsite geprüft) den Erfolg für Health/Watchdog der App eintragen.
docker compose "${compose_args[@]}" run --rm -T --no-deps \
  -v "$snapshot/result.json:/snapshot/result.json:ro" -v "$run/offsite-receipt.json:/snapshot/offsite-receipt.json:ro" \
  -v "$repo/packages/core/scripts:/repo/packages/core/scripts:ro" \
  --entrypoint node worker --import tsx /repo/packages/core/scripts/record-backup-status.ts \
  /snapshot/result.json /snapshot/offsite-receipt.json
printf '{"scheduledBackupSucceeded":true,"workerRestarted":false,"llmCalled":false}\n'
