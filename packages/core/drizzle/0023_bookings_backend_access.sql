-- Web-App und Worker greifen mit der eingeschränkten Rolle seitenwerk_admin_backend zu (wie 0015): ohne diese Rechte
-- schlug die Terminseite in Produktion mit 500 fehl (19.11.2026). Nur wenn die Rolle existiert (lokal/Test nicht).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='seitenwerk_admin_backend') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bookings TO seitenwerk_admin_backend;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='seitenwerk_backend') THEN
      CREATE POLICY seitenwerk_backend ON public.bookings FOR ALL TO seitenwerk_admin_backend USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;
