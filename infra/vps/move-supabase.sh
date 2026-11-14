#!/usr/bin/env bash
# Supabase-Umzug in ein neues Projekt (11.11.2026). Kopiert Datenbank (public, drizzle, pgboss) und Dateien,
# legt die Backend-Rolle mit demselben Passwort an, prüft die Zeilenzahlen und stellt erst dann Worker,
# Sicherungszugang und Netlify-Umgebung um. Das alte Projekt wird nur gelesen, nichts wird dort gelöscht.
# Bei einem Fehler vor der Umstellung läuft der Worker unverändert mit dem alten Projekt weiter.
set -euo pipefail
umask 077
[ "$(id -u)" = 0 ] || { echo 'Bitte als root ausführen.' >&2; exit 1; }
cd /opt/seitenwerk
. infra/backup/compose-files.sh
mapfile -t compose_args < <(compose_files) # vor dem Anhalten: Live-Datei des laufenden Workers erkennen
compose=(docker compose "${compose_args[@]}")
img=${BACKUP_POSTGRES_IMAGE:-postgres:17-alpine}
work=$(mktemp -d /root/supabase-umzug-XXXXXX)
state="$work/state.env"
switched=0
cleanup() {
  rc=$?
  [ "$switched" = 1 ] || echo 'Nicht umgestellt: Der Worker läuft weiter mit dem bisherigen Projekt.'
  "${compose[@]}" up -d --no-deps worker >/dev/null 2>&1 || true
  shred -u "$state" 2>/dev/null || rm -f "$state"
  rm -f "$work/db.dump"
  exit "$rc"
}
trap cleanup EXIT

python3 infra/vps/move-supabase.py prepare "$state"
psql_new() { docker run --rm -i --env-file "$state" "$img" sh -c 'psql "$NEW_PG_URL" -XqAt -v ON_ERROR_STOP=1'; }
psql_old() { docker run --rm -i --env-file "$state" "$img" sh -c 'psql "$OLD_PG_URL" -XqAt -v ON_ERROR_STOP=1'; }

echo '1/6 Neues Projekt prüfen …'
if [ "${NEU_LEEREN:-0}" = 1 ]; then
  # Wiederholung nach abgebrochenem Lauf (14.11.2026): nur im NEUEN Projekt (prepare prüft NEW_REF != OLD_REF)
  # die beim letzten Versuch kopierten Tabellen, Typen, Sequenzen und Funktionen entfernen.
  echo '  Neues Projekt wird für einen frischen Versuch geleert (das alte Projekt bleibt unberührt) …'
  psql_new <<'SQL'
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT nspname FROM pg_namespace WHERE nspname IN ('pgboss','drizzle') LOOP
    EXECUTE format('DROP SCHEMA %I CASCADE', r.nspname);
  END LOOP;
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'm' LOOP
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS public.%I CASCADE', r.relname);
  END LOOP;
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'v' LOOP
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', r.relname);
  END LOOP;
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public' LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', r.sequence_name);
  END LOOP;
  FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
           WHERE n.nspname = 'public' AND t.typtype IN ('e', 'd')
             AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e') LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.typname);
  END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS f FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e') LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.f || ' CASCADE';
  END LOOP;
END $$;
SQL
fi
n=$(echo "select count(*) from pg_tables where schemaname in ('public','pgboss','drizzle');" | psql_new)
[ "$n" = 0 ] || {
  echo "Abbruch: Das neue Projekt enthält schon $n Tabellen (z. B. von einem früheren Versuch)." >&2
  echo 'Für einen frischen Versuch: NEU_LEEREN=1 bash infra/vps/move-supabase.sh' >&2
  exit 1
}

echo '2/6 Worker anhalten …'
"${compose[@]}" stop worker >/dev/null

echo '3/6 Backend-Rolle anlegen …'
python3 infra/vps/move-supabase.py role-sql "$state" | psql_new

echo '4/6 Datenbank kopieren …'
docker run --rm --env-file "$state" -v "$work:/w" "$img" \
  sh -c 'pg_dump "$OLD_PG_URL" -Fc --schema=public --schema=drizzle --schema=pgboss -f /w/db.dump'
docker run --rm --env-file "$state" -v "$work:/w" "$img" \
  sh -c 'pg_restore -d "$NEW_PG_URL" --no-publications --no-subscriptions /w/db.dump' 2>"$work/restore.log" || true
if grep -qi 'error' "$work/restore.log"; then
  echo '  Meldungen beim Einspielen (bekannte Hinweise wie „already exists“ sind harmlos):'
  grep -i 'error' "$work/restore.log" | sed 's/^/  /' | head -15
fi
countsql=$(echo "select string_agg(format('select %L || ''='' || count(*) from %I.%I', n.nspname||'.'||c.relname, n.nspname, c.relname), ' union all ') from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname in ('public','drizzle','pgboss');" | psql_old)
echo "$countsql;" | psql_old >"$work/old.txt"
echo "$countsql;" | psql_new >"$work/new.txt" || true
python3 infra/vps/move-supabase.py compare "$work/old.txt" "$work/new.txt"

echo '5/6 Dateien kopieren (dauert einige Minuten) …'
while IFS='=' read -r k v; do case "$k" in NEW_S3_*) export "$k=$v" ;; esac; done <"$state"
"${compose[@]}" run --rm -T --no-deps \
  -e NEW_S3_ENDPOINT -e NEW_S3_REGION -e NEW_S3_ACCESS_KEY_ID -e NEW_S3_SECRET_ACCESS_KEY \
  -v "$PWD/packages/core/scripts:/repo/packages/core/scripts:ro" \
  --entrypoint node worker --import tsx /repo/packages/core/scripts/copy-storage.ts

echo '6/6 Umstellen …'
python3 infra/vps/move-supabase.py apply "$state"
switched=1
"${compose[@]}" up -d --force-recreate --no-deps worker >/dev/null
sleep 20
if [ "$(docker inspect -f '{{.State.Running}}' "$("${compose[@]}" ps -q worker)")" = true ]; then
  echo 'Fertig: Der Worker läuft mit dem neuen Projekt. Jetzt Claude Bescheid geben (Netlify veröffentlichen).'
else
  echo 'Achtung: Worker läuft nicht. Ausgabe von „docker logs --tail 30“ an Claude schicken.' >&2
  exit 1
fi
