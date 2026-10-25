ALTER TABLE "care_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "care_work" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tariff_changes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Backend-only extension of the existing Supabase access model; no browser policies.
DO $$
DECLARE table_name text; browser_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['care_checks','care_work','tariff_changes'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH browser_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I',table_name,browser_role);
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='seitenwerk_admin_backend') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO seitenwerk_admin_backend',table_name);
      EXECUTE format('CREATE POLICY seitenwerk_backend ON public.%I FOR ALL TO seitenwerk_admin_backend USING (true) WITH CHECK (true)',table_name);
    END IF;
  END LOOP;
END $$;
