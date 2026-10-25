import { sql } from 'drizzle-orm';
import { getConfig } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';

/** Operational totals, not a cohort or a claim that every stage was tracked historically. */
export async function operationalFunnelV4(db: DbOrTx = getDb()) {
  const cfg = await getConfig({ db });
  const result = await db.execute<Record<string, string>>(sql`SELECT
    (SELECT count(*) FROM leads) AS identified,
    (SELECT count(DISTINCT entity_id) FROM audit_log WHERE entity='lead' AND action LIKE 'status:%->qualified') AS qualified,
    (SELECT count(*) FROM demos WHERE content_json IS NOT NULL) AS demos,
    (SELECT count(*) FROM demos WHERE approved_at IS NOT NULL) AS demos_approved,
    (SELECT count(*) FROM letters WHERE pdf_storage_key IS NOT NULL AND NOT is_test) AS letters,
    (SELECT count(*) FROM letters WHERE approved_at IS NOT NULL AND NOT is_test) AS letters_approved,
    (SELECT count(*) FROM letters WHERE sent_at IS NOT NULL AND NOT is_test) AS sent,
    (SELECT count(*) FROM letters WHERE NOT is_test AND NOT undeliverable AND coalesce(delivered_at,estimated_delivered_at) <= now()) AS delivered,
    (SELECT count(DISTINCT lead_id) FROM events WHERE type='scan') AS scans,
    (SELECT count(DISTINCT lead_id) FROM events WHERE type='demo_view') AS views,
    (SELECT count(DISTINCT lead_id) FROM events WHERE type='demo_engagement' AND meta_json->'sections' ? 'uebernehmen') AS pricing,
    (SELECT count(*) FROM orders WHERE offer_snapshot->>'tier'='basis') AS basis,
    (SELECT count(*) FROM orders WHERE offer_snapshot->>'tier'='care_plus') AS care,
    (SELECT count(*) FROM orders) AS checkout,
    (SELECT count(*) FROM orders WHERE paid_at IS NOT NULL) AS paid,
    (SELECT count(*) FROM sites WHERE live_at IS NOT NULL) AS live,
    (SELECT count(*) FROM order_payments WHERE paid_at IS NOT NULL) AS recurring,
    (SELECT count(*) FROM orders WHERE ended_at IS NOT NULL) AS cancelled,
    (SELECT count(*) FROM orders WHERE refunded_cents>0) AS refunded,
    (SELECT count(*) FROM audit_log WHERE action='v4_tier_changed') AS switched`);
  const r = result.rows[0]!;
  return [
    ['Lead identifiziert', Number(r.identified)],
    ['Lead qualifiziert (Auditnachweis)', Number(r.qualified)],
    ['Demo erstellt', Number(r.demos)],
    ['Demo freigegeben', Number(r.demos_approved)],
    ['Brief erstellt', Number(r.letters)],
    ['Brief freigegeben', Number(r.letters_approved)],
    ['Brief versendet', Number(r.sent)],
    ['Brief zugestellt (teils geschätzt)', Number(r.delivered)],
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
