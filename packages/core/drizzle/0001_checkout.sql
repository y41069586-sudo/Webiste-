CREATE TABLE "outbound_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"order_id" uuid,
	"customer_id" uuid,
	"lead_id" uuid,
	"provider" text NOT NULL,
	"provider_message_id" text,
	"status" text DEFAULT 'sending' NOT NULL,
	"error" text,
	"attachment_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "onboarding_mail_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "net_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "orders" SET "net_cents" = "amount_cents";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "net_cents" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vat_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vat_rate_percent" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_json" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancellation_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancellation_pdf_key" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancellation_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbound_emails" ADD CONSTRAINT "outbound_emails_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_emails" ADD CONSTRAINT "outbound_emails_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_emails" ADD CONSTRAINT "outbound_emails_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_emails_key_uidx" ON "outbound_emails" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "outbound_emails_created_idx" ON "outbound_emails" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_cancellation_uidx" ON "orders" USING btree ("cancellation_number");--> statement-breakpoint
CREATE INDEX "orders_payment_intent_idx" ON "orders" USING btree ("stripe_payment_intent");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");