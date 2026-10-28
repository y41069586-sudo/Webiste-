-- Worker-Warteschlange: Besitz an die Backend-Rolle übertragen.
-- Grund: Supabase schaltet auf neuen Tabellen automatisch Row Level Security ein; die Backend-Rolle sah dadurch
-- leere Tabellen ("pg-boss database requires migrations"). Als Besitzerin gilt RLS für sie nicht, und sie kann
-- die täglichen Statistik-Partitionen (queue_stats_JJJJMMTT) selbst anlegen und löschen.
-- Browser-Rollen (anon, authenticated) behalten keinen Zugriff; pgboss ist nicht über die Data API erreichbar.
BEGIN;

-- Nur für die Dauer dieser Änderung darf postgres Objekte an die Rolle übergeben
GRANT seitenwerk_admin_backend TO postgres WITH SET TRUE;

GRANT USAGE, CREATE ON SCHEMA pgboss TO seitenwerk_admin_backend;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS obj, c.relkind
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'pgboss' AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
  LOOP
    IF r.relkind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE %s OWNER TO seitenwerk_admin_backend', r.obj);
    ELSIF r.relkind IN ('v', 'm') THEN
      EXECUTE format('ALTER %s %s OWNER TO seitenwerk_admin_backend',
        CASE r.relkind WHEN 'v' THEN 'VIEW' ELSE 'MATERIALIZED VIEW' END, r.obj);
    ELSE
      EXECUTE format('ALTER TABLE %s OWNER TO seitenwerk_admin_backend', r.obj);
    END IF;
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS obj
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'pgboss'
  LOOP
    EXECUTE format('ALTER ROUTINE %s OWNER TO seitenwerk_admin_backend', r.obj);
  END LOOP;

  FOR r IN
    SELECT t.oid::regtype AS obj
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'pgboss' AND t.typtype = 'e'
  LOOP
    EXECUTE format('ALTER TYPE %s OWNER TO seitenwerk_admin_backend', r.obj);
  END LOOP;
END $$;

-- Zurück auf den vorherigen Stand der Mitgliedschaft
GRANT seitenwerk_admin_backend TO postgres WITH SET FALSE;

COMMIT;

-- Prüfung: alles muss der Backend-Rolle gehören (fremd = 0) und die Version 46 sein
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'pgboss' AND c.relkind IN ('r', 'p')) AS tabellen,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'pgboss' AND c.relkind IN ('r', 'p', 'S')
      AND pg_get_userbyid(c.relowner) <> 'seitenwerk_admin_backend') AS fremd,
  (SELECT version FROM pgboss.version) AS schema_version;
