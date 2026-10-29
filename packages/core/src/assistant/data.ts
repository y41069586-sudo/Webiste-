import { sql, type SQL } from 'drizzle-orm';
import { getDb } from '../db/client';
import { logger } from '../logger';

/**
 * Lesender Datenzugriff des Assistenten über alle Bereiche. Nur Zählungen, Zustände und Betriebsnamen; keine
 * E-Mail-Adressen oder Nachrichteninhalte. Jede Funktion ist für sich robust (leere Ergebnisse statt Fehler).
 */
export const STATUS_DE: Record<string, string> = {
  discovered: 'zur Prüfung',
  qualified: 'geeignet',
  demo_built: 'Demo zu prüfen',
  demo_approved: 'Demo freigegeben',
  demo_published: 'Demo online',
  letter_generated: 'Brief zu prüfen',
  letter_approved: 'Brief freigegeben',
  letter_sent: 'Brief verschickt',
  letter_delivered: 'zugestellt',
  scanned: 'QR gescannt',
  cta_clicked: 'Interesse',
  checkout_started: 'im Checkout',
  paid: 'bezahlt',
  onboarding: 'Onboarding',
  preview_approved: 'Vorschau ok',
  live: 'live',
  rejected: 'aussortiert',
  suppressed: 'gesperrt',
  expired: 'abgelaufen',
  followup_sent: 'Folgebrief',
  failed: 'Fehler',
  building: 'wird gebaut',
  qa_failed: 'Prüfung fehlgeschlagen',
  pending_review: 'zur Prüfung',
  approved: 'freigegeben',
  published: 'online',
  deleted: 'gelöscht',
  generated: 'erstellt',
  queued: 'in Zustellung',
  sent: 'versendet',
  delivered: 'zugestellt',
  cancelled: 'storniert',
  pending: 'offen',
  processing: 'in Bearbeitung',
  refunded: 'erstattet',
  generating: 'wird erstellt',
  preview: 'Vorschau',
  changes_requested: 'Änderungen gewünscht',
  deploying: 'geht online',
  suspended: 'pausiert',
  new: 'neu',
  classified: 'eingeordnet',
  drafted: 'Entwurf',
  escalated: 'zu prüfen',
  done: 'erledigt',
  ignored: 'aussortiert',
};
export const de = (s: string) => STATUS_DE[s] ?? s;

export interface LeadFilter {
  cities?: string[];
  branches?: string[];
  groups?: string[];
  statuses?: string[];
  minScore?: number;
}

export interface LeadRow {
  id: string;
  name: string;
  city: string;
  branch: string;
  status: string;
  prescreen: number;
  score: number;
  reasons: string[];
  segment: string | null;
}

export interface CountRow {
  key: string;
  n: number;
}

export interface AssistantData {
  leadCounts(f: LeadFilter, by: 'status' | 'city' | 'branch' | 'segment'): Promise<CountRow[]>;
  topLeads(f: LeadFilter, limit: number): Promise<LeadRow[]>;
  findLeadsByName(q: string, limit: number): Promise<LeadRow[]>;
  knownCities(): Promise<string[]>;
  demoCounts(): Promise<CountRow[]>;
  pendingDemos(limit: number): Promise<{ id: string; name: string; city: string; since: string }[]>;
  letterCounts(): Promise<CountRow[]>;
  letterWeek(): Promise<{ sent: number; costCents: number; tests: number }>;
  orderStats(): Promise<{
    byStatus: CountRow[];
    byPlan: CountRow[];
    paidCents: number;
    paid30: number;
    last: { plan: string; status: string; amountCents: number; at: string }[];
  }>;
  siteCounts(): Promise<CountRow[]>;
  supportStats(): Promise<{
    open: number;
    byClass: CountRow[];
    byStatus: CountRow[];
    recent: { subject: string; cls: string | null; status: string; at: string }[];
  }>;
  budgetWeek(): Promise<CountRow[]>;
  funnel(days: number): Promise<CountRow[]>;
  jobs(): Promise<{ name: string; state: string; at: string | null; n: number }[]>;
  workerSeenAt(): Promise<string | null>;
  alerts(limit: number): Promise<{ id: string; level: string; message: string; at: string }[]>;
  audit(limit: number): Promise<{ action: string; entity: string; actor: string; at: string }[]>;
}

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : '');

function leadWhere(f: LeadFilter): SQL {
  const parts: SQL[] = [sql`anonymized_at IS NULL`];
  if (f.cities?.length)
    parts.push(
      sql`lower(city) IN (${sql.join(
        f.cities.map((c) => sql`${c.toLowerCase()}`),
        sql`, `,
      )})`,
    );
  if (f.branches?.length)
    parts.push(
      sql`branch IN (${sql.join(
        f.branches.map((b) => sql`${b}`),
        sql`, `,
      )})`,
    );
  if (f.groups?.length)
    parts.push(
      sql`branch_group IN (${sql.join(
        f.groups.map((g) => sql`${g}`),
        sql`, `,
      )})`,
    );
  if (f.statuses?.length)
    parts.push(
      sql`status IN (${sql.join(
        f.statuses.map((s) => sql`${s}`),
        sql`, `,
      )})`,
    );
  if (f.minScore !== undefined) parts.push(sql`prescreen_score >= ${f.minScore}`);
  return sql.join(parts, sql` AND `);
}

async function rows<T>(q: SQL): Promise<T[]> {
  try {
    return (await getDb().execute(q)).rows as T[];
  } catch (err) {
    if (process.env.ASSISTANT_STRICT) throw err;
    logger.warn({ err: err instanceof Error ? err.message.slice(0, 200) : 'unknown' }, 'assistent: Abfrage fehlgeschlagen');
    return [];
  }
}

const leadSelect = sql`SELECT id, business_name AS name, city, branch, status, prescreen_score AS prescreen, score,
  rejection_reasons AS reasons, lead_segment AS segment FROM leads`;

export const dbAssistantData: AssistantData = {
  async leadCounts(f, by) {
    const col = by === 'status' ? sql`status` : by === 'city' ? sql`city` : by === 'branch' ? sql`branch` : sql`lead_segment`;
    return rows<CountRow>(
      sql`SELECT coalesce(${col}::text, '–') AS key, count(*)::int AS n FROM leads WHERE ${leadWhere(f)} GROUP BY 1 ORDER BY 2 DESC`,
    );
  },
  async topLeads(f, limit) {
    return rows<LeadRow>(
      sql`${leadSelect} WHERE ${leadWhere(f)} ORDER BY prescreen_score DESC, score DESC, created_at DESC LIMIT ${limit}`,
    );
  },
  async findLeadsByName(q, limit) {
    const words = q
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 5);
    if (!words.length) return [];
    const match = sql.join(
      words.map((w) => sql`lower(business_name) LIKE ${`%${w.replace(/[%_]/g, '')}%`}`),
      sql` AND `,
    );
    return rows<LeadRow>(
      sql`${leadSelect} WHERE anonymized_at IS NULL AND ${match} ORDER BY prescreen_score DESC LIMIT ${limit}`,
    );
  },
  async knownCities() {
    return (
      await rows<{ city: string }>(sql`SELECT DISTINCT city FROM leads WHERE city IS NOT NULL AND anonymized_at IS NULL`)
    ).map((r) => r.city);
  },
  async demoCounts() {
    return rows<CountRow>(
      sql`SELECT status AS key, count(*)::int AS n FROM demos WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`,
    );
  },
  async pendingDemos(limit) {
    const r = await rows<{ id: string; name: string; city: string; since: Date }>(
      sql`SELECT d.id, l.business_name AS name, l.city, d.created_at AS since FROM demos d JOIN leads l ON l.id = d.lead_id
          WHERE d.status = 'pending_review' AND d.deleted_at IS NULL ORDER BY d.created_at LIMIT ${limit}`,
    );
    return r.map((x) => ({ ...x, since: iso(x.since) }));
  },
  async letterCounts() {
    return rows<CountRow>(sql`SELECT status AS key, count(*)::int AS n FROM letters GROUP BY 1 ORDER BY 2 DESC`);
  },
  async letterWeek() {
    const r = await rows<{ sent: number; cost: number; tests: number }>(
      sql`SELECT count(*) FILTER (WHERE NOT is_test AND NOT dry_run)::int AS sent, coalesce(sum(cost_cents), 0)::int AS cost,
                 count(*) FILTER (WHERE is_test OR dry_run)::int AS tests
            FROM letters WHERE sent_at >= date_trunc('week', now())`,
    );
    return { sent: r[0]?.sent ?? 0, costCents: r[0]?.cost ?? 0, tests: r[0]?.tests ?? 0 };
  },
  async orderStats() {
    const [byStatus, byPlan, sums, last] = await Promise.all([
      rows<CountRow>(sql`SELECT status AS key, count(*)::int AS n FROM orders GROUP BY 1 ORDER BY 2 DESC`),
      rows<CountRow>(sql`SELECT plan AS key, count(*)::int AS n FROM orders WHERE status = 'paid' GROUP BY 1 ORDER BY 2 DESC`),
      rows<{ paid: number; paid30: number }>(
        sql`SELECT coalesce(sum(amount_cents) FILTER (WHERE status = 'paid'), 0)::int AS paid,
                   count(*) FILTER (WHERE status = 'paid' AND paid_at > now() - interval '30 days')::int AS paid30 FROM orders`,
      ),
      rows<{ plan: string; status: string; amount: number; at: Date }>(
        sql`SELECT plan, status, amount_cents AS amount, created_at AS at FROM orders ORDER BY created_at DESC LIMIT 5`,
      ),
    ]);
    return {
      byStatus,
      byPlan,
      paidCents: sums[0]?.paid ?? 0,
      paid30: sums[0]?.paid30 ?? 0,
      last: last.map((o) => ({ plan: o.plan, status: o.status, amountCents: o.amount, at: iso(o.at) })),
    };
  },
  async siteCounts() {
    return rows<CountRow>(sql`SELECT status AS key, count(*)::int AS n FROM sites GROUP BY 1 ORDER BY 2 DESC`);
  },
  async supportStats() {
    const [open, byClass, byStatus, recent] = await Promise.all([
      rows<{ n: number }>(
        sql`SELECT count(*)::int AS n FROM support_messages WHERE direction = 'in' AND status IN ('new', 'classified', 'drafted', 'escalated')`,
      ),
      rows<CountRow>(
        sql`SELECT coalesce(classification, 'unbekannt') AS key, count(*)::int AS n FROM support_messages
            WHERE direction = 'in' AND status IN ('new', 'classified', 'drafted', 'escalated') GROUP BY 1 ORDER BY 2 DESC`,
      ),
      rows<CountRow>(
        sql`SELECT status AS key, count(*)::int AS n FROM support_messages WHERE direction = 'in' GROUP BY 1 ORDER BY 2 DESC`,
      ),
      rows<{ subject: string | null; cls: string | null; status: string; at: Date }>(
        sql`SELECT subject, classification AS cls, status, created_at AS at FROM support_messages
            WHERE direction = 'in' ORDER BY created_at DESC LIMIT 5`,
      ),
    ]);
    return {
      open: open[0]?.n ?? 0,
      byClass,
      byStatus,
      recent: recent.map((r) => ({
        subject: (r.subject ?? '(ohne Betreff)').slice(0, 80),
        cls: r.cls,
        status: r.status,
        at: iso(r.at),
      })),
    };
  },
  async budgetWeek() {
    return rows<CountRow>(
      sql`SELECT category AS key, round(sum(amount_cents + amount_micro_cents / 1000000.0))::int AS n FROM budget_ledger
          WHERE coalesce(incurred_at, created_at) >= date_trunc('week', now()) GROUP BY 1 ORDER BY 2 DESC`,
    );
  },
  async funnel(days) {
    return rows<CountRow>(
      sql`SELECT type AS key, count(*)::int AS n FROM events WHERE created_at > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 2 DESC`,
    );
  },
  async jobs() {
    const r = await rows<{ name: string; state: string; at: Date | null; n: number }>(
      sql`SELECT name, state, max(coalesce(completed_on, started_on, created_on)) AS at, count(*)::int AS n FROM pgboss.job
          WHERE created_on > now() - interval '2 days' AND name NOT LIKE '\\_\\_pgboss%' GROUP BY 1, 2 ORDER BY 3 DESC NULLS LAST`,
    );
    return r.map((x) => ({ ...x, at: x.at ? iso(x.at) : null }));
  },
  async workerSeenAt() {
    const r = await rows<{ seen: Date | null }>(
      sql`SELECT max(completed_on) AS seen FROM pgboss.job WHERE state = 'completed' AND completed_on > now() - interval '2 days'`,
    );
    return r[0]?.seen ? iso(r[0].seen) : null;
  },
  async alerts(limit) {
    const r = await rows<{ id: string; level: string; message: string; at: Date }>(
      sql`SELECT id, level, message, created_at AS at FROM alerts WHERE acknowledged_at IS NULL ORDER BY created_at DESC LIMIT ${limit}`,
    );
    return r.map((a) => ({ ...a, message: a.message.slice(0, 200), at: iso(a.at) }));
  },
  async audit(limit) {
    const r = await rows<{ action: string; entity: string; actor: string; at: Date }>(
      sql`SELECT action, entity, actor, created_at AS at FROM audit_log ORDER BY id DESC LIMIT ${limit}`,
    );
    return r.map((a) => ({ ...a, at: iso(a.at) }));
  },
};
