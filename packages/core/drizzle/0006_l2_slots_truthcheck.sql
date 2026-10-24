ALTER TABLE "letters" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "truth_check_json" jsonb;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "slots_json" jsonb;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "parent_variant_id" uuid;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "changed_slot" text;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "hypothesis" text;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "created_by" text DEFAULT 'human' NOT NULL;--> statement-breakpoint
CREATE INDEX "variants_industry_idx" ON "variants" USING btree ("industry");--> statement-breakpoint
UPDATE "variants" SET "status" = CASE WHEN "active" THEN 'active' ELSE 'paused' END;
