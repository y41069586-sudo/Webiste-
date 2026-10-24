import { sql } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { invalidateConfigCache } from '../src/config/service';

/** Leert alle fachlichen Tabellen (Schema bleibt). */
export async function resetDb(): Promise<void> {
  const db = getDb();
  await db.execute(sql`TRUNCATE leads, demos, letters, events, orders, customers, sites, change_requests,
    support_messages, suppression_list, budget_ledger, settings, audit_log, admin_users, admin_sessions,
    rate_limits, webhook_events, reports, alerts, outbound_emails, order_payments, dunning_letters, arm_allocations, safety_actions RESTART IDENTITY CASCADE`);
  await db.execute(sql`UPDATE counters SET value = 0`);
  invalidateConfigCache();
}

/** Vollständige Betreiberdaten (sonst sperrt die Livegang-Prüfung echte Briefe und den Live-Checkout). */
export const OPERATOR_TEST_CONFIG = {
  sender: {
    name: 'Erika Betreiberin',
    company: 'Betreiberin Websites',
    street: 'Kampstraße 1',
    postalCode: '44137',
    city: 'Dortmund',
    email: 'hallo@betreiberin-websites.test',
    phone: '0231 123123',
    website: 'betreiberin-websites.test',
    taxNumber: '315/123/45678',
    whatsappNumber: '491701234567',
    photoUrl: 'data:image/jpeg;base64,AAAA',
    intro: 'Ich baue Websites für Betriebe in Dortmund.',
    bankIban: 'DE02120300000000202051',
    bankName: 'Testbank',
  },
  legal: { impressumMarkdown: '# Impressum', privacyMarkdown: '# Datenschutz', termsMarkdown: '# AGB' },
};
