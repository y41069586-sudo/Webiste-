CREATE TABLE "care_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"month" text NOT NULL,
	"status" text DEFAULT 'due' NOT NULL,
	"checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"simulated" boolean DEFAULT false NOT NULL,
	"checked_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_work" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"change_request_id" uuid,
	"kind" text NOT NULL,
	"minutes" integer NOT NULL,
	"hourly_cost_cents" integer,
	"cost_cents" integer,
	"worked_at" timestamp with time zone NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"note" text NOT NULL,
	"extra_approved" boolean DEFAULT false NOT NULL,
	"voided_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tariff_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_tier" text NOT NULL,
	"to_tier" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"consent_version" text NOT NULL,
	"effective_at" timestamp with time zone,
	"schedule_id" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_ledger" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "budget_ledger" ADD COLUMN "incurred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "billing_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "active_offer_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "care_checks" ADD CONSTRAINT "care_checks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_work" ADD CONSTRAINT "care_work_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_work" ADD CONSTRAINT "care_work_change_request_id_change_requests_id_fk" FOREIGN KEY ("change_request_id") REFERENCES "public"."change_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_changes" ADD CONSTRAINT "tariff_changes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "care_checks_month_uidx" ON "care_checks" USING btree ("customer_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "care_work_idem_uidx" ON "care_work" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "care_work_period_idx" ON "care_work" USING btree ("customer_id","period_start");--> statement-breakpoint
CREATE INDEX "tariff_changes_order_idx" ON "tariff_changes" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "budget_ledger" ADD CONSTRAINT "budget_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;