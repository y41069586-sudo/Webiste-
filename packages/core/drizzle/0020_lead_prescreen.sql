-- Automatische Vorauswahl (leads/prescreen.ts): ungeprüfte Quellsignale getrennt vom belegten Eignungs-Score.
-- Rein additiv; bestehende Zeilen erhalten 0 bzw. NULL und werden beim nächsten Lead-Lauf neu bewertet.
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "prescreen_score" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "prescreen_reasons" jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_prescreen_idx" ON "leads" USING btree ("prescreen_score");
