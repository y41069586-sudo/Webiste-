-- Terminbuchung auf Kunden-Websites (19.11.2026): Anfrage mit fester Uhrzeit, Bestätigung durch den Betrieb per E-Mail-Link.
-- Rein additiv. Doppelbuchung: Teil-Eindeutigkeit je Website und Beginn für offene und bestätigte Termine,
-- zusätzlich Überschneidungsprüfung unter Sperre im Dienst. Personenbezogene Angaben löscht der nächtliche Lauf.
CREATE TABLE IF NOT EXISTS "bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "site_id" uuid NOT NULL REFERENCES "sites"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'requested' NOT NULL,
  "service" text,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "visitor_name" text,
  "visitor_email" text,
  "visitor_phone" text,
  "message" text,
  "business_token_hash" text NOT NULL,
  "visitor_token_hash" text NOT NULL,
  "decision_note" text,
  "decided_at" timestamp with time zone,
  "request_expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_business_token_uidx" ON "bookings" USING btree ("business_token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_visitor_token_uidx" ON "bookings" USING btree ("visitor_token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_active_slot_uidx" ON "bookings" USING btree ("site_id","starts_at") WHERE "status" IN ('requested','confirmed');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_site_time_idx" ON "bookings" USING btree ("site_id","starts_at");
--> statement-breakpoint
-- Nur der Server (Eigentümerrolle) greift zu; öffentliche Supabase-Schnittstellen sehen nichts (wie 0015).
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
