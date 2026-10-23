CREATE TABLE "claim_usages" (
	"letter_id" uuid NOT NULL,
	"claim_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_usages_letter_id_claim_id_pk" PRIMARY KEY("letter_id","claim_id")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY NOT NULL,
	"text_de" text NOT NULL,
	"footnote_de" text NOT NULL,
	"source_publisher" text NOT NULL,
	"source_title" text NOT NULL,
	"source_url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"sample" integer,
	"population" text,
	"scope" text NOT NULL,
	"industries" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'needs_verification' NOT NULL,
	"blocked_reason" text,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"source_type" text DEFAULT 'external' NOT NULL,
	"note" text,
	"check_result" text,
	"check_quote" text,
	"check_note" text,
	"checked_at" timestamp with time zone,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" text PRIMARY KEY NOT NULL,
	"branche" text NOT NULL,
	"google_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"hook" text NOT NULL,
	"allowed_claim_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"demo_sections" text[] DEFAULT '{}'::text[] NOT NULL,
	"definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "claim_usages" ADD CONSTRAINT "claim_usages_letter_id_letters_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_usages" ADD CONSTRAINT "claim_usages_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_usages_claim_idx" ON "claim_usages" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status");--> statement-breakpoint
UPDATE "leads" SET "industry" = "branch_group" WHERE "industry" IS NULL;
