-- Review-only companion to queue:prepare. Apply later ONLY with approved maintenance credentials.
-- Reuses the existing internal backend role; browser roles receive no queue access.
BEGIN;
REVOKE ALL ON SCHEMA pgboss FROM PUBLIC;
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA pgboss FROM %I',r);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA pgboss FROM %I',r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pgboss FROM %I',r);
    END IF;
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA pgboss TO seitenwerk_admin_backend;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA pgboss TO seitenwerk_admin_backend;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA pgboss TO seitenwerk_admin_backend;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgboss TO seitenwerk_admin_backend;
-- Migrations use a maintenance role. Runtime must set BOSS_MIGRATE/BOSS_CREATE_QUEUES=false.
-- Recheck grants after each explicit pg-boss upgrade. Do not expose pgboss via Data API.
COMMIT;
