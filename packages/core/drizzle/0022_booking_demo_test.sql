-- Testlauf der Terminbuchung über Entwürfe fiktiver Testbetriebe (19.11.2026): Buchung hängt dann an der Demo statt
-- an einer Kunden-Website. Rein erweiternd; bestehende Zeilen behalten site_id.
ALTER TABLE "bookings" ALTER COLUMN "site_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "demo_id" uuid REFERENCES "demos"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_target_chk" CHECK ("site_id" IS NOT NULL OR "demo_id" IS NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_demo_slot_uidx" ON "bookings" USING btree ("demo_id","starts_at") WHERE "status" IN ('requested','confirmed') AND "demo_id" IS NOT NULL;
