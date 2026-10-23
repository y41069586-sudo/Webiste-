ALTER TABLE "customers" ADD COLUMN "onboarding_reminded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "domain_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "domain_approved_by" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "domain_registered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "domain_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "hosting_url" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "onboarding_json" jsonb;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "onboarding_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "preview_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "live_at" timestamp with time zone;