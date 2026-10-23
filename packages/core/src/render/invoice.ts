import { eq, sql } from 'drizzle-orm';
import { renderInvoiceHtml, type InvoiceData } from '@wbm/templates';
import { appUrl } from '../config/env';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { customers, orders } from '../db/schema';
import { orderConfirmationEmail, refundEmail } from '../emails/templates';
import { buildCancellationData, nextInvoiceNumber, orderAmounts } from '../invoices/build';
import { logger } from '../logger';
import { getProviders } from '../providers';
import { audit } from '../services/audit';
import { sendTransactionalEmail } from '../services/email';
import { formatEuro } from '../util/time';
import { htmlToPdf } from './pdf';

function invoiceKey(number: string, issued: Date): string {
  return `invoices/${issued.getUTCFullYear()}/${number}.pdf`;
}

/** PDF der Rechnung erzeugen bzw. laden (das gespeicherte PDF ist das Original). */
export async function ensureInvoicePdf(orderId: string): Promise<{ key: string; pdf: Buffer; number: string }> {
  const db = getDb();
  const { storage } = getProviders();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order?.invoiceNumber || !order.invoiceJson || !order.paidAt) throw new Error('Bestellung ohne Rechnungsdaten');
  if (order.invoicePdfKey) {
    const existing = await storage.get(order.invoicePdfKey);
    if (existing) return { key: order.invoicePdfKey, pdf: existing, number: order.invoiceNumber };
  }
  const pdf = await htmlToPdf(renderInvoiceHtml(order.invoiceJson as unknown as InvoiceData));
  const key = invoiceKey(order.invoiceNumber, order.paidAt);
  await storage.put(key, pdf, 'application/pdf');
  await db.update(orders).set({ invoicePdfKey: key, updatedAt: new Date() }).where(eq(orders.id, orderId));
  return { key, pdf, number: order.invoiceNumber };
}

/** Rechnung + Bestellbestätigung mit Onboarding-Link senden (idempotent). */
export async function sendOrderInvoice(orderId: string): Promise<'sent' | 'already' | 'skipped'> {
  const db = getDb();
  const cfg = await getConfig();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || !['paid', 'refunded'].includes(order.status)) return 'skipped';
  if (order.invoiceSentAt) return 'already';
  const customer = await db.query.customers.findFirst({ where: eq(customers.orderId, orderId) });
  if (!customer) throw new Error('Kunde zur Bestellung fehlt');
  const { pdf, number } = await ensureInvoicePdf(orderId);
  const mail = orderConfirmationEmail(cfg, {
    name: order.customerName,
    company: order.customerCompany,
    invoiceNumber: number,
    amount: formatEuro(order.amountCents),
    onboardingUrl: appUrl(`/onboarding/${customer.accessToken}`),
    domain: order.domainWish,
  });
  await sendTransactionalEmail({
    ...mail,
    kind: 'invoice',
    idempotencyKey: `invoice:${order.id}`,
    to: order.customerEmail,
    attachments: [{ filename: `Rechnung-${number}.pdf`, content: pdf, contentType: 'application/pdf' }],
    orderId: order.id,
    customerId: customer.id,
    leadId: order.leadId,
  });
  const now = new Date();
  await db.update(orders).set({ invoiceSentAt: now, updatedAt: now }).where(eq(orders.id, orderId));
  // Die Bestellbestätigung enthält den Onboarding-Link
  await db.update(customers).set({ onboardingMailSentAt: sql`coalesce(${customers.onboardingMailSentAt}, now())`, updatedAt: now }).where(eq(customers.id, customer.id));
  await audit(db, { entity: 'order', entityId: orderId, action: 'invoice_sent', actor: 'job:send-invoice', context: { invoiceNumber: number } });
  return 'sent';
}

/** Stornorechnung (eigene fortlaufende Nummer) erzeugen und senden – idempotent. */
export async function sendCancellationInvoice(orderId: string): Promise<'sent' | 'already' | 'skipped'> {
  const db = getDb();
  const cfg = await getConfig();
  const { storage } = getProviders();
  let order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order?.invoiceJson || !order.invoiceNumber || order.refundedCents <= 0) return 'skipped';
  if (order.cancellationSentAt) return 'already';
  if (!order.cancellationNumber) {
    await db.transaction(async (tx) => {
      const locked = await tx.execute<{ cancellation_number: string | null }>(sql`SELECT cancellation_number FROM orders WHERE id = ${orderId} FOR UPDATE`);
      if (locked.rows[0]?.cancellation_number) return;
      const now = new Date();
      const number = await nextInvoiceNumber(tx, cfg, now);
      const data = buildCancellationData(order!.invoiceJson as unknown as InvoiceData, {
        number,
        issuedAt: now,
        refundedCents: order!.refundedCents,
        amounts: orderAmounts(order!),
      });
      const pdf = await htmlToPdf(renderInvoiceHtml(data));
      const key = invoiceKey(number, now);
      await storage.put(key, pdf, 'application/pdf');
      await tx.update(orders).set({ cancellationNumber: number, cancellationPdfKey: key, updatedAt: now }).where(eq(orders.id, orderId));
    });
    order = (await db.query.orders.findFirst({ where: eq(orders.id, orderId) }))!;
  }
  const pdf = await storage.get(order.cancellationPdfKey!);
  if (!pdf) throw new Error('Stornorechnung-PDF fehlt im Speicher');
  const mail = refundEmail(cfg, { name: order.customerName, amount: formatEuro(order.refundedCents), cancellationNumber: order.cancellationNumber! });
  await sendTransactionalEmail({
    ...mail,
    kind: 'cancellation',
    idempotencyKey: `cancellation:${order.id}:${order.cancellationNumber}`,
    to: order.customerEmail,
    attachments: [{ filename: `Stornorechnung-${order.cancellationNumber}.pdf`, content: pdf, contentType: 'application/pdf' }],
    orderId: order.id,
    leadId: order.leadId,
  });
  await db.update(orders).set({ cancellationSentAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, orderId));
  logger.info({ orderId }, 'Stornorechnung versendet');
  return 'sent';
}
