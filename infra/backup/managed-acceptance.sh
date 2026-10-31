#!/usr/bin/env bash
# Existing VPS only: read-only source dump -> isolated Docker restore -> private S3 snapshot/local restore.
# No source DROP/restore, no app migrations/seeds. Queue creation is optional and follows success only.
set -euo pipefail
umask 077
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo"
compose=(docker compose -f docker-compose.worker.yml)
# Supabase's privileged connection stays on the operator's terminal/host, never in chat or Git.
if [ "${ASK_BACKUP_URL:-0}" = 1 ] && [ -z "${BACKUP_DATABASE_URL:-}" ]; then
  printf 'Vollständige Supabase-Verbindungs-URL (postgresql://…, Session-Port5432), Eingabe verdeckt: ' >/dev/tty
  IFS= read -r -s BACKUP_DATABASE_URL </dev/tty
  printf '\n' >/dev/tty
  [ -n "$BACKUP_DATABASE_URL" ] || { echo 'Keine Verbindung eingegeben; keine Abnahme ausgeführt.' >&2; exit 1; }
  export BACKUP_DATABASE_URL
fi
if [ -n "${BACKUP_DATABASE_URL:-}" ]; then
  case "$BACKUP_DATABASE_URL" in
    postgres://*|postgresql://*) ;;
    *) echo 'Keine gültige PostgreSQL-Verbindungs-URL. In Supabase unter Connect → Session pooler die vollständige URI kopieren und das Datenbankpasswort privat einsetzen. Worker bleibt unverändert.' >&2; exit 1 ;;
  esac
  if [[ "$BACKUP_DATABASE_URL" =~ [[:space:]] ]]; then
    echo 'Die Verbindungs-URL enthält Leerzeichen oder Steuerzeichen. Vollständige URI ohne Zeilenumbruch eingeben; Sonderzeichen im Passwort müssen URL-kodiert sein. Worker bleibt unverändert.' >&2
    exit 1
  fi
fi
backup_root=${BACKUP_ROOT:-/opt/seitenwerk-backups}
mkdir -p "$backup_root"
target=$(mktemp -d "$backup_root/acceptance-XXXXXXXX")
chmod 700 "$target"
restore_container="seitenwerk-restore-test-$(basename "$target" | tr '[:upper:]' '[:lower:]')"
restore_started=false
snapshot_keeper="seitenwerk-snapshot-$(basename "$target" | tr '[:upper:]' '[:lower:]')"
snapshot_started=false
worker_was_running=false
cleanup() {
  if [ "$snapshot_started" = true ]; then docker rm -f "$snapshot_keeper" >/dev/null 2>&1 || true; fi
  if [ "$restore_started" = true ]; then docker rm -f -v "$restore_container" >/dev/null 2>&1 || true; fi
  rm -f "$target/source-pg.env" "$target/local-pg.env"
  unset BACKUP_DATABASE_URL
  if [ "$worker_was_running" = true ]; then "${compose[@]}" start worker >/dev/null; fi
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
# Validate URL, project identity, verified TLS and full-backup privileges before interrupting the worker.
if [ "${QUIESCE_WORKER:-0}" = 1 ] && [ -n "$("${compose[@]}" ps --status running -q worker)" ]; then
  worker_was_running=true
  "${compose[@]}" stop worker
fi
image=${BACKUP_POSTGRES_IMAGE:-postgres:17-alpine}
source_network=()
if [ "${LOCAL_BACKUP_ACCEPTANCE_TEST:-}" = true ] && [ -n "${SOURCE_DOCKER_NETWORK:-}" ]; then source_network=(--network "$SOURCE_DOCKER_NETWORK"); fi
source_run() { docker run --rm --user "$(id -u):$(id -g)" "${source_network[@]}" --env-file "$target/source-pg.env" -v "$target:/snapshot" -v "$repo/infra/backup:/scripts:ro" "$image" "$@"; }
snapshot_args=()
fingerprint_args=(-f /scripts/fingerprint.sql)
if [ "${CONSISTENT_BACKUP_SNAPSHOT:-0}" = 1 ]; then
  # A shared read-only MVCC snapshot permits normal app writes during the scheduled backup.
  docker run -d --name "$snapshot_keeper" --user "$(id -u):$(id -g)" "${source_network[@]}" \
    --env-file "$target/source-pg.env" -v "$target:/snapshot" -v "$repo/infra/backup:/scripts:ro" \
    "$image" psql -XqAt -v ON_ERROR_STOP=1 -f /scripts/hold-snapshot.sql >/dev/null
  snapshot_started=true
  for attempt in $(seq 1 30); do [ -s "$target/source-snapshot.id" ] && break; sleep 1; done
  [ -s "$target/source-snapshot.id" ] || { echo 'Konsistenter Lese-Snapshot fehlt.' >&2; exit 1; }
  snapshot_id=$(tr -d '\r\n' < "$target/source-snapshot.id")
  [[ "$snapshot_id" =~ ^[A-Fa-f0-9]+-[A-Fa-f0-9]+-[0-9]+$ ]] || exit 1
  snapshot_args=(-e "BACKUP_SNAPSHOT=$snapshot_id")
  fingerprint_args=(-v "snapshot=$snapshot_id" -f /scripts/fingerprint-snapshot.sql)
fi
source_run psql -XqAt -v ON_ERROR_STOP=1 "${fingerprint_args[@]}" > "$target/source-before.jsonl"
# NO --enable-row-security: a role-limited/incomplete dump must fail, not pretend to be a full backup.
if [ "${#snapshot_args[@]}" -gt 0 ]; then
  docker run --rm --user "$(id -u):$(id -g)" "${source_network[@]}" --env-file "$target/source-pg.env" "${snapshot_args[@]}" \
    -v "$target:/snapshot" -v "$repo/infra/backup:/scripts:ro" "$image" sh -c 'BACKUP_DIRECTORY=/snapshot sh /scripts/backup-managed.sh'
else
  source_run sh -c 'BACKUP_DIRECTORY=/snapshot sh /scripts/backup-managed.sh'
fi
dump=$(find "$target" -maxdepth 1 -name '*.dump' -print -quit)
[ -n "$dump" ] || { echo 'Kein Datenbankdump erzeugt.' >&2; exit 1; }
source_run psql -XqAt -v ON_ERROR_STOP=1 "${fingerprint_args[@]}" > "$target/source-after.jsonl"
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
cmp "$target/source-before.jsonl" "$target/restored.jsonl" || {
  # These manifests contain only table names, counts and digests, never row contents or credentials.
  echo 'Abweichende Tabellen/Zeilenzahlen/Prüfsummen:' >&2
  diff -u "$target/source-before.jsonl" "$target/restored.jsonl" >&2 || true
  echo 'Restore-Inhalte weichen ab; Sicherung bleibt ungeprüft.' >&2
  exit 1
}
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
  # Only add a positive queue result after the actual command succeeded.
  sed -i 's/"queuePreparationRequested":true/"queuePreparationRequested":true,"queuePreparationVerified":true/' "$target/result.json"
fi
cat "$target/result.json"
echo "Private Sicherung: $target"
