-- Local preparation only. No productive application authorized.
ALTER TABLE orders ADD COLUMN payment_mode text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint
UPDATE orders SET payment_mode='mock' WHERE provider='mock';
--> statement-breakpoint
DROP MATERIALIZED VIEW funnel_by_arm;
--> statement-breakpoint
DROP MATERIALIZED VIEW letter_outcomes;
--> statement-breakpoint
-- L4 Messung (B6.1/B6.2/B7): Funnel je Erstbrief und je Arm (Branche × Variante × Segment × Woche).
-- Ereignisse zählen ab Versand des Briefs; Kauf nur innerhalb von 45 Tagen nach (geschätzter) Zustellung.
CREATE MATERIALIZED VIEW "letter_outcomes" AS
SELECT
  l.id AS letter_id,
  l.lead_id,
  coalesce(l.industry, ld.industry, ld.branch_group, 'unbekannt') AS industry,
  coalesce(l.variant_id::text, 'ohne') AS variant_key,
  coalesce(ld.lead_segment, 'etabliert') AS segment,
  date_trunc('week', l.sent_at) AS week,
  l.sent_at,
  CASE WHEN EXISTS (SELECT 1 FROM audit_log a WHERE a.entity='letter' AND a.entity_id=l.id::text AND a.action='status:delivered' AND (a.actor='public:scan' OR a.actor LIKE '%:angenommen')) THEN NULL ELSE l.delivered_at END AS delivered_at,
  (SELECT coalesce(sum(o.amount_cents-o.refunded_cents),0) FROM orders o WHERE o.lead_id=l.lead_id AND o.payment_mode='live' AND o.paid_at>=l.sent_at AND o.paid_at < l.sent_at + interval '45 days') AS revenue_cents,
  l.undeliverable,
  coalesce(l.cost_cents, l.estimated_cost_cents, 0) AS cost_cents,
  (SELECT min(e.created_at) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'scan' AND e.created_at >= l.sent_at) AS first_scan_at,
  (SELECT min(e.created_at) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'demo_view' AND e.created_at >= l.sent_at) AS first_view_at,
  (SELECT max((e.meta_json->>'seconds')::int) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'demo_engagement' AND e.created_at >= l.sent_at) AS max_seconds,
  (SELECT max((e.meta_json->>'scroll')::int) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'demo_engagement' AND e.created_at >= l.sent_at) AS max_scroll,
  (SELECT min(e.created_at) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'cta_click' AND e.created_at >= l.sent_at) AS first_cta_at,
  (SELECT min(e.created_at) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'whatsapp_click' AND e.created_at >= l.sent_at) AS first_whatsapp_at,
  (SELECT min(e.created_at) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'question_sent' AND e.created_at >= l.sent_at) AS first_question_at,
  (SELECT min(e.created_at) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'checkout_started' AND e.created_at >= l.sent_at) AS first_checkout_at,
  (SELECT min(e.created_at) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'checkout_abandoned' AND e.created_at >= l.sent_at) AS first_abandon_at,
  (SELECT min(o.paid_at) FROM orders o WHERE o.lead_id=l.lead_id AND o.payment_mode='live' AND o.paid_at>=l.sent_at) AS paid_at,
  (SELECT o.plan FROM orders o WHERE o.lead_id=l.lead_id AND o.payment_mode='live' AND o.paid_at>=l.sent_at ORDER BY o.paid_at LIMIT 1) AS paid_plan,
  (SELECT min(e.created_at) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'opt_out' AND e.created_at >= l.sent_at) AS opt_out_at,
  (SELECT min(e.created_at) FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND e.lead_id = l.lead_id AND e.type = 'complaint' AND e.created_at >= l.sent_at) AS complaint_at
FROM letters l
JOIN leads ld ON ld.id = l.lead_id
WHERE l.sequence = 1 AND NOT l.is_test AND NOT l.dry_run AND l.provider <> 'mock' AND l.sent_at IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "letter_outcomes_letter_uidx" ON "letter_outcomes" ("letter_id");
--> statement-breakpoint
CREATE MATERIALIZED VIEW "funnel_by_arm" AS
SELECT
  industry,
  variant_key,
  segment,
  week,
  count(*)::int AS letters,
  count(*) FILTER (WHERE NOT undeliverable AND delivered_at <= now())::int AS delivered,
  count(*) FILTER (WHERE NOT undeliverable AND sent_at + interval '45 days' <= now())::int AS evaluated,
  count(*) FILTER (WHERE undeliverable)::int AS undeliverable,
  count(*) FILTER (WHERE first_scan_at < sent_at + interval '45 days')::int AS scans,
  count(*) FILTER (WHERE first_view_at < sent_at + interval '45 days')::int AS demo_views,
  count(*) FILTER (WHERE max_seconds >= 30)::int AS engaged,
  count(*) FILTER (WHERE first_cta_at < sent_at + interval '45 days')::int AS cta_clicks,
  count(*) FILTER (WHERE first_whatsapp_at < sent_at + interval '45 days')::int AS whatsapp,
  count(*) FILTER (WHERE first_question_at < sent_at + interval '45 days')::int AS questions,
  count(*) FILTER (WHERE first_checkout_at < sent_at + interval '45 days')::int AS checkouts,
  count(*) FILTER (WHERE first_abandon_at < sent_at + interval '45 days' AND (paid_at IS NULL OR paid_at >= sent_at + interval '45 days'))::int AS abandoned,
  count(*) FILTER (WHERE paid_at < sent_at + interval '45 days')::int AS purchases,
  count(*) FILTER (WHERE paid_at < sent_at + interval '45 days' AND sent_at + interval '45 days' <= now())::int AS purchases_evaluated,
  count(*) FILTER (WHERE paid_at < sent_at + interval '45 days' AND paid_plan IN ('one_time','basis','care_plus'))::int AS purchases_one_time,
  count(*) FILTER (WHERE paid_at < sent_at + interval '45 days' AND paid_plan = 'monthly')::int AS purchases_monthly,
  count(*) FILTER (WHERE opt_out_at IS NOT NULL)::int AS opt_outs,
  count(*) FILTER (WHERE complaint_at IS NOT NULL)::int AS complaints,
  sum(revenue_cents)::bigint AS revenue_cents,
  sum(cost_cents)::int AS cost_cents,
  now() AS refreshed_at
FROM letter_outcomes
GROUP BY industry, variant_key, segment, week;
--> statement-breakpoint
CREATE UNIQUE INDEX "funnel_by_arm_uidx" ON "funnel_by_arm" ("industry", "variant_key", "segment", "week");
