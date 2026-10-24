CREATE TABLE "arm_allocations" (
	"industry" text NOT NULL,
	"variant_id" uuid NOT NULL,
	"share" double precision NOT NULL,
	"is_control" boolean DEFAULT false NOT NULL,
	"report_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "arm_allocations_industry_variant_id_pk" PRIMARY KEY("industry","variant_id")
);
--> statement-breakpoint
CREATE TABLE "safety_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"action" text NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "arm_allocations" ADD CONSTRAINT "arm_allocations_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "safety_actions_key_uidx" ON "safety_actions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "safety_actions_kind_idx" ON "safety_actions" USING btree ("kind","created_at");