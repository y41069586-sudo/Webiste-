#!/bin/sh
# Read-only database export for the managed Supabase database. No restore or source-side status write.
# Use PostgreSQL client matching the server major (currently 17); standard PG* env, no password in argv.
set -eu
umask 077
: "${PGHOST:?PGHOST fehlt}"
: "${PGDATABASE:?PGDATABASE fehlt}"
: "${PGUSER:?PGUSER fehlt}"
: "${BACKUP_DIRECTORY:?Privates Sicherungsverzeichnis fehlt}"
case "${PGPORT:-5432}" in 6543) echo 'Backup benötigt Direct- oder Session-Verbindung, keinen Transaction-Pooler.' >&2; exit 1;; esac
case "$PGHOST" in localhost|127.0.0.1|postgres) ;; *)
  [ "${PGSSLMODE:-}" = verify-full ] || { echo 'Für externe Sicherungen PGSSLMODE=verify-full mit CA verwenden.' >&2; exit 1; }
esac
mkdir -p "$BACKUP_DIRECTORY"
stamp=$(date -u +%Y%m%d-%H%M%S)
dump="$BACKUP_DIRECTORY/seitenwerk-$stamp.dump"
[ ! -e "$dump" ] || { echo 'Sicherung existiert bereits.' >&2; exit 1; }
trap 'rm -f "$dump.partial"' EXIT HUP INT TERM
pg_dump --format=custom --no-owner --no-privileges --schema=public --schema=drizzle --schema=pgboss --file="$dump.partial"
pg_restore --list "$dump.partial" >/dev/null
mv "$dump.partial" "$dump"
sha256sum "$dump" > "$dump.sha256"
echo '{"status":"dump_created","restore_verified":false,"storage_included":false}'
