import { and, eq, inArray, isNotNull, isNull, lt, notInArray, or, sql } from 'drizzle-orm';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { adminSessions, alerts, customers, demos, letters, orders, outboundEmails, sites, supportMessages, webhookEvents } from '../db/schema';
import { logger } from '../logger';
import { getProviders } from '../providers';
import { addDays, addMonths } from '../util/time';
import { audit } from './audit';
import { raiseAlert } from './budget';
import { transitionLead } from './lead-state';
import { cleanupRateLimits } from './rate-limit';
import { anonymizeLead } from './suppression';

/** Leads, die (noch) Kunden sind oder kaufen – deren Daten löscht der Job nie. */
const CUSTOMER_STATUSES = ['checkout_started', 'paid', 'onboarding', 'preview_approved', 'live'] as const;

export interface RetentionResult {
  demosExpired: number;
  lettersCancelled: number;
  leadsAnonymized: number;
  supportDeleted: number;
  unpaidOrdersDeleted: number;
  customersAnonymized: number;
  emailsDeleted: number;
  eventsStripped: number;
  housekeeping: number;
}

/**
 * Nächtlicher Lösch-Job (Löschfristen aus der Config, jede Löschung im Audit-Log):
 * Demos nach Ablauf, Leads ohne Reaktion nach X Monaten, Support-Nachrichten ohne Kundenbezug,
 * abgebrochene Bestellungen, Kundendaten nach Ablauf der Aufbewahrungsfrist für Rechnungen.
 * Gesperrte Betriebe bleiben nur als Hash in der Sperrliste.
 */
export async function runRetention(now = new Date(), actor = 'job:retention'): Promise<RetentionResult> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const storage = getProviders().storage;
  const r: RetentionResult = { demosExpired: 0, lettersCancelled: 0, leadsAnonymized: 0, supportDeleted: 0, unpaidOrdersDeleted: 0, customersAnonymized: 0, emailsDeleted: 0, eventsStripped: 0, housekeeping: 0 };

  // 1) Abgelaufene Demos: Dateien und Texte löschen, ungesendete Briefe stoppen
  const expired = await db
    .select({ id: demos.id, leadId: demos.leadId })
    .from(demos)
    .where(and(inArray(demos.status, ['published', 'approved', 'pending_review', 'qa_failed', 'building']), isNotNull(demos.expiresAt), lt(demos.expiresAt, now)));
  for (const d of expired) {
    const buyer = await db.query.orders.findFirst({ where: and(eq(orders.leadId, d.leadId), inArray(orders.status, ['paid', 'processing'])) });
    if (buyer) continue;
    await storage.deletePrefix(`demos/${d.id}/`);
    await db
      .update(demos)
      .set({ status: 'expired', contentJson: null, htmlStorageKey: null, screenshotDesktopKey: null, screenshotMobileKey: null, compositeKey: null, deletedAt: now, updatedAt: now })
      .where(eq(demos.id, d.id));
    const cancelled = await db
      .update(letters)
      .set({ status: 'cancelled', statusReason: 'Demo abgelaufen' })
      .where(and(eq(letters.leadId, d.leadId), inArray(letters.status, ['generated', 'approved'])))
      .returning({ id: letters.id });
    r.lettersCancelled += cancelled.length;
    await transitionLead(db, d.leadId, 'expired', { actor, soft: true, reason: 'Demo abgelaufen' });
    r.demosExpired++;
  }

  // 2) Leads ohne Reaktion: X Monate nach dem letzten Brief (bzw. nach Anlage, falls nie angeschrieben)
  const cutoff = addMonths(now, -cfg.timing.leadRetentionMonths);
  const stale = await db.execute<{ id: string }>(sql`
    SELECT ld.id FROM leads ld
    WHERE ld.anonymized_at IS NULL
      AND ld.status NOT IN (${sql.join(CUSTOMER_STATUSES.map((s) => sql`${s}`), sql`, `)})
      AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.lead_id = ld.id AND o.status IN ('paid', 'processing'))
      AND coalesce((SELECT max(l.sent_at) FROM letters l WHERE l.lead_id = ld.id), ld.created_at) < ${cutoff}
    LIMIT 2000
  `);
  for (const { id } of stale.rows) {
    const leadDemos = await db.select({ id: demos.id }).from(demos).where(eq(demos.leadId, id));
    for (const d of leadDemos) {
      await storage.deletePrefix(`demos/${d.id}/`);
      await db.update(demos).set({ status: 'deleted', contentJson: null, htmlStorageKey: null, screenshotDesktopKey: null, screenshotMobileKey: null, compositeKey: null, deletedAt: now }).where(eq(demos.id, d.id));
    }
    await storage.deletePrefix(`letters/${id}/`);
    await db.update(letters).set({ pdfStorageKey: null }).where(eq(letters.leadId, id));
    await anonymizeLead(db, id);
    r.leadsAnonymized++;
  }

  // 3) Support-Nachrichten ohne Kundenbezug
  const supportCut = addMonths(now, -cfg.timing.supportRetentionMonths);
  const sup = await db.delete(supportMessages).where(and(isNull(supportMessages.customerId), lt(supportMessages.createdAt, supportCut))).returning({ id: supportMessages.id });
  r.supportDeleted = sup.length;

  // 4) Abgebrochene/unbezahlte Bestellungen (Checkout-Daten von Nicht-Käufern)
  const unpaidCut = addMonths(now, -cfg.timing.unpaidOrderRetentionMonths);
  const unpaid = await db
    .delete(orders)
    .where(and(inArray(orders.status, ['pending', 'expired', 'cancelled', 'failed']), lt(orders.createdAt, unpaidCut), isNull(orders.invoiceNumber)))
    .returning({ id: orders.id });
  r.unpaidOrdersDeleted = unpaid.length;

  // 5) Kunden nach Ablauf der Aufbewahrungsfrist (Rechnungen: Jahre ab Zahlung, Seite nicht mehr live)
  const invoiceCut = addMonths(now, -12 * cfg.timing.invoiceRetentionYears);
  const old = await db
    .select({ o: orders, c: customers })
    .from(orders)
    .leftJoin(customers, eq(customers.orderId, orders.id))
    .where(and(inArray(orders.status, ['paid', 'refunded']), lt(orders.paidAt, invoiceCut), sql`${orders.customerName} <> '[gelöscht]'`))
    .limit(500);
  for (const { o, c } of old) {
    const site = c ? await db.query.sites.findFirst({ where: eq(sites.customerId, c.id) }) : undefined;
    if (site && site.status === 'live' && (c?.subscriptionId || (c?.hostingUntil && c.hostingUntil > now))) continue; // aktive Kunden behalten
    if (o.invoicePdfKey) await storage.delete(o.invoicePdfKey);
    if (o.cancellationPdfKey) await storage.delete(o.cancellationPdfKey);
    await db
      .update(orders)
      .set({ customerCompany: '[gelöscht]', customerName: '[gelöscht]', customerEmail: '[gelöscht]', customerPhone: null, billingAddressJson: { street: '', postalCode: '', city: '', country: 'DE' }, invoiceJson: null, invoicePdfKey: null, cancellationPdfKey: null, checkoutUrl: null })
      .where(eq(orders.id, o.id));
    if (c) {
      await storage.deletePrefix(`uploads/${c.id}/`);
      await db.update(customers).set({ company: '[gelöscht]', contactName: '[gelöscht]', email: `deleted+${c.id}@invalid`, phone: null, updatedAt: now }).where(eq(customers.id, c.id));
      if (site) await db.update(sites).set({ onboardingJson: null, impressumJson: null, privacyText: null, formTargetEmail: null, status: 'suspended' }).where(eq(sites.id, site.id));
    }
    r.customersAnonymized++;
  }

  // 6) Mails: Metadaten nach 24 Monaten (Rechnungsmails nach Aufbewahrungsfrist)
  const mails = await db
    .delete(outboundEmails)
    .where(
      or(
        and(notInArray(outboundEmails.kind, ['invoice', 'cancellation']), lt(outboundEmails.createdAt, addMonths(now, -24))),
        lt(outboundEmails.createdAt, invoiceCut),
      ),
    )
    .returning({ id: outboundEmails.id });
  r.emailsDeleted = mails.length;

  // 7) Tracking-Metadaten (gehashte IP, Gerätetyp) nach 30 Tagen entfernen
  const stripped = await db.execute(sql`
    UPDATE events SET meta_json = meta_json - 'ipHash' - 'ua'
    WHERE created_at < ${addDays(now, -30)} AND (meta_json ? 'ipHash' OR meta_json ? 'ua')
  `);
  r.eventsStripped = stripped.rowCount ?? 0;

  // 8) Aufräumen: Webhook-Replay-Tabelle, Sitzungen, Rate-Limits, alte quittierte Meldungen
  const wh = await db.delete(webhookEvents).where(lt(webhookEvents.receivedAt, addDays(now, -90))).returning({ id: webhookEvents.eventId });
  const sess = await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now)).returning({ id: adminSessions.id });
  const al = await db.delete(alerts).where(and(isNotNull(alerts.acknowledgedAt), lt(alerts.createdAt, addDays(now, -90)))).returning({ id: alerts.id });
  await cleanupRateLimits(db);
  r.housekeeping = wh.length + sess.length + al.length;

  // 9) Hinweis auf abgelaufenes Hosting ohne Verlängerung (keine automatische Abschaltung)
  const ended = await db
    .select({ c: customers })
    .from(customers)
    .innerJoin(sites, eq(sites.customerId, customers.id))
    .where(and(eq(sites.status, 'live'), isNull(customers.subscriptionId), lt(customers.hostingUntil, now)));
  for (const { c } of ended) {
    await raiseAlert(db, { level: 'warn', code: `hosting_ended_${c.id}`, message: `Hosting von ${c.company} (${c.domain ?? '–'}) ist abgelaufen – verlängern oder Seite sperren`, context: { customerId: c.id } });
  }

  await audit(db, { entity: 'retention', entityId: now.toISOString().slice(0, 10), action: 'run', actor, context: { ...r } });
  logger.info({ ...r }, 'Lösch-Job abgeschlossen');
  return r;
}
