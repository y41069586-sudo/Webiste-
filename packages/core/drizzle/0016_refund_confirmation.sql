ALTER TABLE "orders" ADD COLUMN "pending_refund_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pending_refund_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pending_refund_status" text;