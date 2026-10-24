CREATE TABLE "experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"industry" text,
	"hypothesis" text NOT NULL,
	"variant_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"control_variant_id" uuid,
	"changed_slot" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"result_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decision" text DEFAULT 'proposed' NOT NULL,
	"notes" text,
	"created_by" text DEFAULT 'learning_agent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"industry" text,
	"source" text NOT NULL,
	"category" text NOT NULL,
	"text_hash" text NOT NULL,
	"text" text,
	"support_message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week" text NOT NULL,
	"markdown" text NOT NULL,
	"metrics_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "experiments_industry_idx" ON "experiments" USING btree ("industry","created_at");--> statement-breakpoint
CREATE INDEX "objections_industry_idx" ON "objections" USING btree ("industry","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "objections_support_msg_uidx" ON "objections" USING btree ("support_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_reports_week_uidx" ON "weekly_reports" USING btree ("week");