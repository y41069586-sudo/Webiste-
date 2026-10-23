import { sql } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { invalidateConfigCache } from '../src/config/service';

/** Leert alle fachlichen Tabellen (Schema bleibt). */
export async function resetDb(): Promise<void> {
  const db = getDb();
  await db.execute(sql`TRUNCATE leads, demos, letters, events, orders, customers, sites, change_requests,
    support_messages, suppression_list, budget_ledger, settings, audit_log, admin_users, admin_sessions,
    rate_limits, webhook_events, reports, alerts, outbound_emails RESTART IDENTITY CASCADE`);
  await db.execute(sql`UPDATE counters SET value = 0`);
  invalidateConfigCache();
}
