CREATE TABLE "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"totp_secret_enc" text NOT NULL,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"last_totp_step" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"emailed_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"context_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"amount_micro_cents" integer DEFAULT 0 NOT NULL,
	"lead_id" uuid,
	"ref" text,
	"idempotency_key" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"estimated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"source" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"counts_as_round" boolean DEFAULT true NOT NULL,
	"result_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"name" text PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"lead_id" uuid,
	"company" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"domain" text,
	"domain_status" text DEFAULT 'none' NOT NULL,
	"registrar_handle" text,
	"registrar_domain_id" text,
	"site_id" uuid,
	"subscription_id" text,
	"access_token" text NOT NULL,
	"change_rounds_used" integer DEFAULT 0 NOT NULL,
	"hosting_until" timestamp with time zone,
	"renewal_reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"template_id" text NOT NULL,
	"palette" text NOT NULL,
	"status" text DEFAULT 'building' NOT NULL,
	"content_json" jsonb,
	"html_storage_key" text,
	"screenshot_desktop_key" text,
	"screenshot_mobile_key" text,
	"composite_key" text,
	"qa_result_json" jsonb,
	"review_required" boolean DEFAULT true NOT NULL,
	"review_note" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"type" text NOT NULL,
	"meta_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"business_name" text NOT NULL,
	"branch" text NOT NULL,
	"branch_group" text NOT NULL,
	"city" text NOT NULL,
	"street" text,
	"house_number" text,
	"postal_code" text,
	"country" text DEFAULT 'DE' NOT NULL,
	"phone" text,
	"opening_hours" jsonb,
	"rating" double precision,
	"rating_count" integer,
	"has_website" boolean DEFAULT false NOT NULL,
	"website_uri" text,
	"social_only" boolean DEFAULT false NOT NULL,
	"business_status" text,
	"primary_type" text,
	"status" text DEFAULT 'discovered' NOT NULL,
	"status_reason" text,
	"rejection_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" double precision DEFAULT 0 NOT NULL,
	"segment_key" text NOT NULL,
	"track_token" text NOT NULL,
	"search_query" text,
	"identity_hash" text,
	"google_place_id" text,
	"google_checked_at" timestamp with time zone,
	"domain_suggestion" text,
	"domain_checked_at" timestamp with time zone,
	"source_fetched_at" timestamp with time zone,
	"letters_sent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contacted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"anonymized_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"demo_id" uuid,
	"variant_id" uuid,
	"sequence" integer DEFAULT 1 NOT NULL,
	"pdf_storage_key" text,
	"page_count" integer DEFAULT 1 NOT NULL,
	"provider" text,
	"provider_letter_id" text,
	"estimated_cost_cents" integer,
	"cost_cents" integer,
	"status" text DEFAULT 'generated' NOT NULL,
	"status_reason" text,
	"dry_run" boolean DEFAULT false NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"demo_id" uuid,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invoice_number" text,
	"invoice_pdf_key" text,
	"invoice_sent_at" timestamp with time zone,
	"customer_company" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"billing_address_json" jsonb NOT NULL,
	"domain_wish" text,
	"b2b_confirmed" boolean DEFAULT false NOT NULL,
	"terms_accepted_at" timestamp with time zone,
	"terms_version" text,
	"subscription_opt_in" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text DEFAULT 'weekly' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"markdown" text NOT NULL,
	"allocation_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"applied" boolean DEFAULT false NOT NULL,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"template_id" text NOT NULL,
	"palette" text NOT NULL,
	"hosting_provider" text,
	"hosting_project_id" text,
	"production_url" text,
	"content_json" jsonb NOT NULL,
	"impressum_json" jsonb,
	"privacy_text" text,
	"form_target_email" text,
	"form_key" text NOT NULL,
	"preview_html_key" text,
	"live_html_key" text,
	"asset_keys" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'onboarding' NOT NULL,
	"status_reason" text,
	"version" integer DEFAULT 0 NOT NULL,
	"live_check_json" jsonb,
	"last_deployed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"lead_id" uuid,
	"direction" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"from_email" text,
	"to_email" text,
	"subject" text,
	"body" text NOT NULL,
	"classification" text,
	"classification_confidence" double precision,
	"draft_reply" text,
	"status" text DEFAULT 'new' NOT NULL,
	"provider_message_id" text,
	"in_reply_to_id" uuid,
	"escalation_reason" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppression_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" text NOT NULL,
	"kind" text DEFAULT 'business' NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"content" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"weight" double precision DEFAULT 1 NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	CONSTRAINT "webhook_events_provider_event_id_pk" PRIMARY KEY("provider","event_id")
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_ledger" ADD CONSTRAINT "budget_ledger_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demos" ADD CONSTRAINT "demos_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letters" ADD CONSTRAINT "letters_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letters" ADD CONSTRAINT "letters_demo_id_demos_id_fk" FOREIGN KEY ("demo_id") REFERENCES "public"."demos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letters" ADD CONSTRAINT "letters_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_demo_id_demos_id_fk" FOREIGN KEY ("demo_id") REFERENCES "public"."demos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_sessions_admin_idx" ON "admin_sessions" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_uidx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "alerts_open_idx" ON "alerts" USING btree ("acknowledged_at","created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_idem_uidx" ON "budget_ledger" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "budget_created_idx" ON "budget_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "budget_lead_idx" ON "budget_ledger" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "change_requests_site_idx" ON "change_requests" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_order_uidx" ON "customers" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_token_uidx" ON "customers" USING btree ("access_token");--> statement-breakpoint
CREATE UNIQUE INDEX "demos_slug_uidx" ON "demos" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "demos_lead_idx" ON "demos" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "demos_status_idx" ON "demos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_lead_idx" ON "events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "events_type_created_idx" ON "events" USING btree ("type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_source_uidx" ON "leads" USING btree ("source","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_track_token_uidx" ON "leads" USING btree ("track_token");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_segment_idx" ON "leads" USING btree ("segment_key");--> statement-breakpoint
CREATE INDEX "leads_score_idx" ON "leads" USING btree ("score");--> statement-breakpoint
CREATE INDEX "leads_identity_idx" ON "leads" USING btree ("identity_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "letters_lead_sequence_uidx" ON "letters" USING btree ("lead_id","sequence");--> statement-breakpoint
CREATE INDEX "letters_status_idx" ON "letters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "letters_provider_id_idx" ON "letters" USING btree ("provider_letter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_session_uidx" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_invoice_uidx" ON "orders" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "orders_lead_idx" ON "orders" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_kind_period_uidx" ON "reports" USING btree ("kind","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_customer_uidx" ON "sites" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_form_key_uidx" ON "sites" USING btree ("form_key");--> statement-breakpoint
CREATE UNIQUE INDEX "support_provider_msg_uidx" ON "support_messages" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "support_status_idx" ON "support_messages" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "suppression_hash_uidx" ON "suppression_list" USING btree ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_kind_name_uidx" ON "variants" USING btree ("kind","name");