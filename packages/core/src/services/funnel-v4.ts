import { sql } from 'drizzle-orm';
import { getConfig } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';

/** Operational totals, not a cohort or a claim that every stage was tracked historically. */
export async function operationalFunnelV4(db: DbOrTx = getDb()) {
  const cfg = await getConfig({ db });
  const result = await db.execute<
    Record<string, string>
  >(sql`WITH real_leads AS (SELECT * FROM leads WHERE source <> 'mock'), real_demos AS (SELECT d.* FROM demos d JOIN real_leads l ON l.id=d.lead_id), real_letters AS (SELECT * FROM letters WHERE NOT is_test AND NOT dry_run AND provider <> 'mock'), real_orders AS (SELECT * FROM orders WHERE payment_mode='live' AND provider='stripe'), real_events AS (SELECT e.* FROM events e WHERE coalesce(e.meta_json->>'audience','') NOT IN ('test','control') AND EXISTS (SELECT 1 FROM real_letters l WHERE l.lead_id=e.lead_id AND l.sent_at <= e.created_at)) SELECT
    (SELECT count(*) FROM real_leads) AS identified,
    (SELECT count(DISTINCT a.entity_id) FROM audit_log a JOIN real_leads l ON l.id::text=a.entity_id WHERE a.entity='lead' AND a.action LIKE 'status:%->qualified') AS qualified,
    (SELECT count(*) FROM real_demos WHERE content_json IS NOT NULL) AS demos,
    (SELECT count(*) FROM real_demos WHERE approved_at IS NOT NULL) AS demos_approved,
    (SELECT count(*) FROM real_letters WHERE pdf_storage_key IS NOT NULL AND NOT is_test) AS letters,
    (SELECT count(*) FROM real_letters WHERE approved_at IS NOT NULL AND NOT is_test) AS letters_approved,
    (SELECT count(*) FROM real_letters WHERE sent_at IS NOT NULL AND NOT is_test) AS sent,
    (SELECT count(*) FROM real_letters WHERE sent_at IS NOT NULL AND delivered_at IS NULL AND NOT undeliverable) AS unknown_delivery,
    (SELECT count(*) FROM real_letters WHERE NOT is_test AND NOT undeliverable AND delivered_at <= now() AND NOT EXISTS (SELECT 1 FROM audit_log a WHERE a.entity='letter' AND a.entity_id=real_letters.id::text AND a.action='status:delivered' AND (a.actor='public:scan' OR a.actor LIKE '%:angenommen'))) AS delivered,
    (SELECT count(DISTINCT lead_id) FROM real_events WHERE type='scan') AS scans,
    (SELECT count(DISTINCT lead_id) FROM real_events WHERE type='demo_view') AS views,
    (SELECT count(DISTINCT lead_id) FROM real_events WHERE type='demo_engagement' AND meta_json->'sections' ? 'uebernehmen') AS pricing,
    (SELECT count(*) FROM real_orders WHERE offer_snapshot->>'tier'='basis') AS basis,
    (SELECT count(*) FROM real_orders WHERE offer_snapshot->>'tier'='care_plus') AS care,
    (SELECT count(*) FROM real_orders) AS checkout,
    (SELECT count(*) FROM real_orders WHERE paid_at IS NOT NULL) AS paid,
    (SELECT count(*) FROM sites s JOIN customers c ON c.id=s.customer_id JOIN real_orders o ON o.id=c.order_id WHERE s.live_at IS NOT NULL) AS live,
    (SELECT count(*) FROM order_payments p JOIN real_orders o ON o.id=p.order_id WHERE p.paid_at IS NOT NULL) AS recurring,
    (SELECT count(*) FROM real_orders WHERE ended_at IS NOT NULL) AS cancelled,
    (SELECT count(*) FROM real_orders WHERE refunded_cents>0) AS refunded,
    (SELECT count(*) FROM audit_log a JOIN real_orders o ON o.id::text=a.entity_id WHERE a.entity='order' AND a.action='v4_tier_changed') AS switched`);
  const r = result.rows[0]!;
  return [
    ['Lead identifiziert', Number(r.identified)],
    ['Lead qualifiziert (Auditnachweis)', Number(r.qualified)],
    ['Demo erstellt', Number(r.demos)],
    ['Demo freigegeben', Number(r.demos_approved)],
    ['Brief erstellt', Number(r.letters)],
    ['Brief freigegeben', Number(r.letters_approved)],
    ['Brief versendet', Number(r.sent)],
    ['Brief zugestellt (bestätigt)', Number(r.delivered)],
    ['Zustellung unbekannt (versendete Briefe)', Number(r.unknown_delivery)],
    ['QR/Kurz-URL genutzt (eindeutige Leads)', Number(r.scans)],
    ['Demo geöffnet (eindeutige Leads)', Number(r.views)],
    ['Tarifbereich angesehen', cfg.metrics.engagementBeacon ? Number(r.pricing) : null],
    [`Tarif im Checkout gewählt · Basis ${r.basis} / Care+ ${r.care}`, Number(r.basis) + Number(r.care)],
    ['Checkout angelegt (Bestellungen)', Number(r.checkout)],
    ['Kauf abgeschlossen', Number(r.paid)],
    ['Website live geschaltet', Number(r.live)],
    ['Monatszahlung erfolgreich (Rechnungen)', Number(r.recurring)],
    [
      `Tarifwechsel ${r.switched} · Kündigung ${r.cancelled} · Erstattung ${r.refunded}`,
      Number(r.switched) + Number(r.cancelled) + Number(r.refunded),
    ],
  ].map(([label, count]) => ({ label: String(label), count: count === null ? null : Number(count) }));
}
