ALTER TABLE "orders" ADD COLUMN "offer_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "recurring_checkout_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "recurring_checkout_session_id" text;