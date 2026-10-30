#!/usr/bin/env bash
# Existing VPS only: read-only source dump -> isolated Docker restore -> private S3 snapshot/local restore.
# No source DROP/restore, no app migrations/seeds. Queue creation is optional and follows success only.
set -euo pipefail
umask 077
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo"
compose=(docker compose -f docker-compose.worker.yml)
backup_root=${BACKUP_ROOT:-/opt/seitenwerk-backups}
mkdir -p "$backup_root"
target=$(mktemp -d "$backup_root/acceptance-XXXXXXXX")
chmod 700 "$target"
restore_container="seitenwerk-restore-test-$(basename "$target" | tr '[:upper:]' '[:lower:]')"
restore_started=false
cleanup() {
  if [ "$restore_started" = true ]; then docker rm -f -v "$restore_container" >/dev/null 2>&1 || true; fi
  rm -f "$target/source-pg.env" "$target/local-pg.env"
}
trap cleanup EXIT
run_worker() {
  "${compose[@]}" run --rm -T --no-deps --user 0:0 -v "$target:/snapshot" \
    -v "$repo/packages/core/scripts:/repo/packages/core/scripts:ro" \
    -e BACKUP_DATABASE_URL \
    --entrypoint node worker --import tsx "$@"
}
if [ -n "${SOURCE_PG_ENV:-}" ]; then
  [ "${LOCAL_BACKUP_ACCEPTANCE_TEST:-}" = true ] || { echo 'SOURCE_PG_ENV nur für expliziten lokalen Test.' >&2; exit 1; }
  cp "$SOURCE_PG_ENV" "$target/source-pg.env"
else
  run_worker /repo/packages/core/scripts/backup-connection.ts /snapshot
fi
image=${BACKUP_POSTGRES_IMAGE:-postgres:17-alpine}
source_network=()
if [ "${LOCAL_BACKUP_ACCEPTANCE_TEST:-}" = true ] && [ -n "${SOURCE_DOCKER_NETWORK:-}" ]; then source_network=(--network "$SOURCE_DOCKER_NETWORK"); fi
source_run() { docker run --rm --user "$(id -u):$(id -g)" "${source_network[@]}" --env-file "$target/source-pg.env" -v "$target:/snapshot" -v "$repo/infra/backup:/scripts:ro" "$image" "$@"; }
source_run psql -XqAt -v ON_ERROR_STOP=1 -f /scripts/fingerprint.sql > "$target/source-before.jsonl"
# NO --enable-row-security: a role-limited/incomplete dump must fail, not pretend to be a full backup.
source_run sh -c 'BACKUP_DIRECTORY=/snapshot sh /scripts/backup-managed.sh'
dump=$(find "$target" -maxdepth 1 -name '*.dump' -print -quit)
[ -n "$dump" ] || { echo 'Kein Datenbankdump erzeugt.' >&2; exit 1; }
source_run psql -XqAt -v ON_ERROR_STOP=1 -f /scripts/fingerprint.sql > "$target/source-after.jsonl"
cmp "$target/source-before.jsonl" "$target/source-after.jsonl" || { echo 'Quelldaten geändert: Backup bleibt erhalten, keine Abnahme. Bei ruhiger Pipeline wiederholen.' >&2; exit 1; }
source_run psql -XqAt -v ON_ERROR_STOP=1 -c "select distinct format('CREATE ROLE %I NOLOGIN;',r) from pg_policies p,unnest(p.roles) r where schemaname in ('public','drizzle','pgboss') and r not in ('public','postgres') and r not like 'pg_%';" > "$target/restore-roles.sql"
printf 'POSTGRES_PASSWORD=%s\n' "$(head -c 32 /dev/urandom | base64 | tr -d '\n')" > "$target/local-pg.env"
docker run -d --name "$restore_container" --network none --env-file "$target/local-pg.env" "$image" >/dev/null
restore_started=true
for attempt in $(seq 1 30); do
  if docker exec "$restore_container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$restore_container" createdb -U postgres seitenwerk_restore_test
docker exec -i "$restore_container" psql -Xq -v ON_ERROR_STOP=1 -U postgres -d seitenwerk_restore_test < "$target/restore-roles.sql"
docker exec "$restore_container" psql -Xq -v ON_ERROR_STOP=1 -U postgres -d seitenwerk_restore_test -c 'DROP SCHEMA public;'
docker cp "$dump" "$restore_container:/tmp/source.dump"
if ! docker exec "$restore_container" pg_restore --exit-on-error --no-owner --no-privileges -U postgres -d seitenwerk_restore_test /tmp/source.dump > "$target/restore.private.log" 2>&1; then
  echo "Restore fehlgeschlagen; privates Protokoll: $target/restore.private.log" >&2; exit 1
fi
docker exec -i "$restore_container" psql -XqAt -v ON_ERROR_STOP=1 -U postgres -d seitenwerk_restore_test < infra/backup/fingerprint.sql > "$target/restored.jsonl"
cmp "$target/source-before.jsonl" "$target/restored.jsonl" || { echo 'Restore-Inhalte weichen ab.' >&2; exit 1; }
if [ "${LOCAL_BACKUP_ACCEPTANCE_TEST:-}" != true ]; then
  run_worker /repo/packages/core/scripts/backup-storage.ts create /snapshot/storage
  run_worker /repo/packages/core/scripts/backup-storage.ts restore-local /snapshot/storage /snapshot/storage-restored
fi
sha256sum "$dump" > "$target/dump.sha256"
printf '{"databaseRestoreVerified":true,"contentFingerprintsMatch":true,"storageRestoreVerified":%s,"sourceRestored":false,"queuePreparationRequested":%s}\n' \
  "$([ "${LOCAL_BACKUP_ACCEPTANCE_TEST:-}" = true ] && echo false || echo true)" \
  "$([ "${PREPARE_MISSING_QUEUES:-}" = 1 ] && echo true || echo false)" > "$target/result.json"
if [ "${PREPARE_MISSING_QUEUES:-}" = 1 ]; then
  [ "${LOCAL_BACKUP_ACCEPTANCE_TEST:-}" != true ] || { echo 'Keine Produktionsqueue im lokalen Backuptest.' >&2; exit 1; }
  "${compose[@]}" run --rm -T --no-deps \
    -v "$repo/packages/core/scripts:/repo/packages/core/scripts:ro" \
    -e QUEUE_PREPARE_CONFIRM=prepare-existing-database --entrypoint node worker --import tsx \
    /repo/packages/core/scripts/prepare-queue.ts --apply --queues-only
fi
cat "$target/result.json"
echo "Private Sicherung: $target"
