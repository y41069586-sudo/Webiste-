ALTER TABLE "letters" ADD COLUMN "delivery_corrected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "undeliverable" boolean DEFAULT false NOT NULL;