-- Backend access to the funnel materialized views after 0018 recreated them.
-- Found in a local rehearsal of the production state (11 migrations + Supabase roles/grants):
--   * 0018 drops/recreates letter_outcomes/funnel_by_arm; the new views no longer carry the backend role's SELECT.
--   * REFRESH MATERIALIZED VIEW requires ownership, so the backend role could never refresh them.
-- Fix without transferring ownership: SELECT grant plus a narrowly scoped SECURITY DEFINER refresh function in a
-- schema that is not exposed through the Data API. Browser roles get nothing. No-op where the role is absent
-- (local/test databases, where the application user owns the views and refreshes directly).
CREATE SCHEMA IF NOT EXISTS seitenwerk_ops;
--> statement-breakpoint
REVOKE ALL ON SCHEMA seitenwerk_ops FROM PUBLIC;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION seitenwerk_ops.refresh_funnel_views() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.letter_outcomes;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.funnel_by_arm;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION seitenwerk_ops.refresh_funnel_views() FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA seitenwerk_ops FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION seitenwerk_ops.refresh_funnel_views() FROM %I', r);
      EXECUTE format('REVOKE ALL ON public.letter_outcomes, public.funnel_by_arm FROM %I', r);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='seitenwerk_admin_backend') THEN
    GRANT SELECT ON public.letter_outcomes, public.funnel_by_arm TO seitenwerk_admin_backend;
    GRANT USAGE ON SCHEMA seitenwerk_ops TO seitenwerk_admin_backend;
    GRANT EXECUTE ON FUNCTION seitenwerk_ops.refresh_funnel_views() TO seitenwerk_admin_backend;
  END IF;
END $$;
