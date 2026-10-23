#!/bin/sh
# Wiederherstellungstest: neuesten (oder angegebenen) Dump in eine temporäre Datenbank einspielen,
# Tabellen und Datenmengen mit der Live-Datenbank vergleichen, Ergebnis in der App vermerken.
#   docker compose exec backup sh /scripts/restore-test.sh [/backups/db/wbm-….dump]
set -eu
DUMP="${1:-$(ls -1t /backups/db/*.dump 2>/dev/null | head -n 1)}"
TEST_DB="${RESTORE_TEST_DB:-wbm_restore_test}"
LIVE_DB="${PGDATABASE:-wbm}"
if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo '{"level":"error","msg":"restore-test: kein Dump gefunden"}'
  exit 1
fi

note() {
  # Ergebnis in settings (backup_status) und bei Fehler als Meldung im Dashboard
  STATUS="$1"; DETAIL="$2"
  psql -q -d "$LIVE_DB" -v ON_ERROR_STOP=1 -c "INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('backup_status', jsonb_build_object('status', '$STATUS', 'file', '$(basename "$DUMP")', 'detail', '$DETAIL', 'at', now()), 'backup', now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = 'backup', updated_at = now();" || true
  if [ "$STATUS" != "ok" ]; then
    psql -q -d "$LIVE_DB" -c "INSERT INTO alerts (level, code, message) VALUES ('error', 'backup_restore_failed', 'Wiederherstellungstest fehlgeschlagen: $DETAIL');" || true
  fi
}

dropdb --if-exists "$TEST_DB"
createdb "$TEST_DB"
if ! pg_restore --no-owner --no-privileges -d "$TEST_DB" "$DUMP" > /tmp/restore.log 2>&1; then
  dropdb --if-exists "$TEST_DB"
  note failed "pg_restore fehlgeschlagen"
  echo '{"level":"error","msg":"restore-test: pg_restore fehlgeschlagen"}'
  exit 1
fi

FAIL=""
for T in leads demos letters orders customers sites settings audit_log suppression_list budget_ledger; do
  R=$(psql -tA -d "$TEST_DB" -c "SELECT count(*) FROM $T" 2>/dev/null || echo "x")
  L=$(psql -tA -d "$LIVE_DB" -c "SELECT count(*) FROM $T" 2>/dev/null || echo "x")
  if [ "$R" = "x" ]; then FAIL="$FAIL $T(fehlt)"; continue; fi
  # Der Dump ist älter als die Live-Daten: weniger ist erlaubt, mehr nicht
  if [ "$L" != "x" ] && [ "$R" -gt "$L" ]; then FAIL="$FAIL $T($R>$L)"; fi
  echo "{\"level\":\"info\",\"msg\":\"restore-test\",\"table\":\"$T\",\"restored\":$R,\"live\":${L:-0}}"
done
MIG=$(psql -tA -d "$TEST_DB" -c "SELECT count(*) FROM drizzle.__drizzle_migrations" 2>/dev/null || echo 0)
[ "$MIG" -ge 1 ] || FAIL="$FAIL migrations"
dropdb --if-exists "$TEST_DB"

if [ -n "$FAIL" ]; then
  note failed "Abweichungen:$FAIL"
  echo "{\"level\":\"error\",\"msg\":\"restore-test fehlgeschlagen\",\"detail\":\"$FAIL\"}"
  exit 1
fi
note ok "Wiederherstellung geprüft"
echo "{\"level\":\"info\",\"msg\":\"restore-test ok\",\"file\":\"$(basename "$DUMP")\"}"
