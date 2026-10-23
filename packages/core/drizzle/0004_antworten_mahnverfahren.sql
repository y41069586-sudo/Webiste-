CREATE TABLE "dunning_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"open_rates" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"pdf_storage_key" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"provider" text,
	"provider_letter_id" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "dunning_stage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "dunning_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dunning_letters" ADD CONSTRAINT "dunning_letters_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dunning_letters_order_idx" ON "dunning_letters" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "dunning_letters_status_idx" ON "dunning_letters" USING btree ("status");