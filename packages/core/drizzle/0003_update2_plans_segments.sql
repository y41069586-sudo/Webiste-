CREATE TABLE "order_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_invoice_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"net_cents" integer NOT NULL,
	"vat_cents" integer DEFAULT 0 NOT NULL,
	"vat_rate_percent" double precision DEFAULT 0 NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"paid_at" timestamp with time zone NOT NULL,
	"invoice_number" text,
	"invoice_json" jsonb,
	"invoice_pdf_key" text,
	"invoice_sent_at" timestamp with time zone,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "lead_segment" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "first_seen_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "short_code" text;--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "format" text DEFAULT 'letter' NOT NULL;--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "stated_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "estimated_delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "plan" text DEFAULT 'one_time' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_schedule_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_invoice_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "min_term_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guarantee_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "ended_reason" text;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_payments_invoice_uidx" ON "order_payments" USING btree ("provider","provider_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_payments_number_uidx" ON "order_payments" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "order_payments_order_idx" ON "order_payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_short_code_uidx" ON "leads" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "orders_subscription_idx" ON "orders" USING btree ("stripe_subscription_id");--> statement-breakpoint
-- Bestandsdaten: erstes Auftauchen = Anlagezeitpunkt (statt Migrationszeitpunkt)
UPDATE "leads" SET "first_seen_at" = "created_at";
