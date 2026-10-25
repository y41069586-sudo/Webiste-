import { eq, sql } from 'drizzle-orm';
import { renderInvoiceHtml, type InvoiceData } from '@wbm/templates';
import { appUrl } from '../config/env';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { customers, orderPayments, orders } from '../db/schema';
import { orderConfirmationEmail, recurringInvoiceEmail, refundEmail } from '../emails/templates';
import { buildCancellationData, nextInvoiceNumber, orderAmounts } from '../invoices/build';
import { getProviders } from '../providers';
import { audit } from '../services/audit';
import { sendTransactionalEmail } from '../services/email';
import { formatDateDe, formatDateLongDe, formatEuro } from '../util/time';
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
    monthlyMinTermEnds: order.plan === 'monthly' && order.minTermEndsAt ? formatDateLongDe(order.minTermEndsAt) : null,
    guaranteeUntil: order.guaranteeEndsAt ? formatDateLongDe(order.guaranteeEndsAt) : null,
    v4: order.offerSnapshot ?? undefined,
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
  await db
    .update(customers)
    .set({ onboardingMailSentAt: sql`coalesce(${customers.onboardingMailSentAt}, now())`, updatedAt: now })
    .where(eq(customers.id, customer.id));
  await audit(db, {
    entity: 'order',
    entityId: orderId,
    action: 'invoice_sent',
    actor: 'job:send-invoice',
    context: { invoiceNumber: number },
  });
  return 'sent';
}

/** Immutable delta corrections for setup and recurring payments; retries never credit twice. */
export async function sendCancellationInvoice(orderId: string, paymentId?: string): Promise<'sent' | 'already' | 'skipped'> {
  const db = getDb(),
    cfg = await getConfig(),
    storage = getProviders().storage;
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return 'skipped';
  const sourceId = paymentId ?? orderId;
  const prepared = await db.transaction(async (tx) => {
    if (paymentId) await tx.execute(sql`SELECT id FROM order_payments WHERE id=${paymentId} FOR UPDATE`);
    else await tx.execute(sql`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`);
    const source = paymentId
      ? await tx.query.orderPayments.findFirst({ where: eq(orderPayments.id, paymentId) })
      : await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!source || (paymentId && 'orderId' in source && source.orderId !== orderId))
      throw new Error('Korrekturzahlung falsch zugeordnet.');
    if (!source.invoiceNumber || !source.invoiceJson || source.refundedCents <= 0) return null;
    const docs = [...source.refundDocuments];
    // Historical cancellations predate the document list. Never invent a second credit.
    if (!paymentId && 'cancellationNumber' in source && source.cancellationNumber && !docs.length) return { legacy: true, docs };
    const credited = docs.at(-1)?.cumulativeCents ?? 0;
    if (credited < source.refundedCents) {
      const now = new Date(),
        number = await nextInvoiceNumber(tx, cfg, now);
      const delta = source.refundedCents - credited;
      const data = buildCancellationData(source.invoiceJson as unknown as InvoiceData, {
        number,
        issuedAt: now,
        refundedCents: delta,
        alreadyRefundedCents: credited,
        amounts: orderAmounts(source),
      });
      const key = invoiceKey(number, now);
      await storage.put(key, await htmlToPdf(renderInvoiceHtml(data)), 'application/pdf');
      docs.push({
        number,
        cumulativeCents: source.refundedCents,
        deltaCents: delta,
        issuedAt: now.toISOString(),
        pdfKey: key,
        sentAt: null,
      });
      if (paymentId) await tx.update(orderPayments).set({ refundDocuments: docs }).where(eq(orderPayments.id, paymentId));
      else
        await tx
          .update(orders)
          .set({
            refundDocuments: docs,
            cancellationNumber: docs[0]!.number,
            cancellationPdfKey: docs[0]!.pdfKey,
            updatedAt: now,
          })
          .where(eq(orders.id, orderId));
      await audit(tx, {
        entity: 'order',
        entityId: orderId,
        action: 'refund_document_prepared',
        actor: 'job:send-invoice',
        context: { paymentId: paymentId ?? null, number, deltaCents: delta, cumulativeCents: source.refundedCents },
      });
    }
    return { legacy: false, docs };
  });
  if (!prepared) return 'skipped';
  if (prepared.legacy) {
    // Preserve retry delivery of immutable pre-migration PDFs, including their old
    // idempotency key. Never generate a replacement with a guessed historic amount.
    const legacy = (await db.query.orders.findFirst({ where: eq(orders.id, orderId) }))!;
    if (legacy.cancellationSentAt) return 'already';
    const pdf = legacy.cancellationPdfKey ? await storage.get(legacy.cancellationPdfKey) : null;
    if (!pdf || !legacy.cancellationNumber) throw new Error('Historischer Korrekturbeleg fehlt; manuelle Prüfung erforderlich.');
    const mail = refundEmail(cfg, {
      name: legacy.customerName,
      amount: formatEuro(legacy.refundedCents),
      cancellationNumber: legacy.cancellationNumber,
    });
    await sendTransactionalEmail({
      ...mail,
      kind: 'cancellation',
      idempotencyKey: `cancellation:${orderId}:${legacy.cancellationNumber}`,
      to: legacy.customerEmail,
      orderId,
      leadId: legacy.leadId,
      attachments: [
        { filename: `Stornorechnung-${legacy.cancellationNumber}.pdf`, content: pdf, contentType: 'application/pdf' },
      ],
    });
    await db.update(orders).set({ cancellationSentAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, orderId));
    return 'sent';
  }
  const unsent = prepared.docs.filter((d) => !d.sentAt);
  for (const doc of unsent) {
    const pdf = await storage.get(doc.pdfKey);
    if (!pdf) throw new Error('Korrekturbeleg fehlt im privaten Speicher.');
    const mail = refundEmail(cfg, {
      name: order.customerName,
      amount: formatEuro(doc.deltaCents),
      cancellationNumber: doc.number,
    });
    await sendTransactionalEmail({
      ...mail,
      kind: 'cancellation',
      idempotencyKey: `cancellation:${sourceId}:${doc.number}`,
      to: order.customerEmail,
      attachments: [{ filename: `Stornorechnung-${doc.number}.pdf`, content: pdf, contentType: 'application/pdf' }],
      orderId,
      leadId: order.leadId,
    });
    await db.transaction(async (tx) => {
      if (paymentId) await tx.execute(sql`SELECT id FROM order_payments WHERE id=${paymentId} FOR UPDATE`);
      else await tx.execute(sql`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`);
      const source = paymentId
        ? await tx.query.orderPayments.findFirst({ where: eq(orderPayments.id, paymentId) })
        : await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
      const docs = source!.refundDocuments.map((d) =>
        d.number === doc.number ? { ...d, sentAt: d.sentAt ?? new Date().toISOString() } : d,
      );
      if (paymentId) await tx.update(orderPayments).set({ refundDocuments: docs }).where(eq(orderPayments.id, paymentId));
      else
        await tx
          .update(orders)
          .set({ refundDocuments: docs, cancellationSentAt: new Date(), updatedAt: new Date() })
          .where(eq(orders.id, orderId));
    });
  }
  return unsent.length ? 'sent' : 'already';
}

/** Recover a lost queue insertion or interrupted correction delivery without requesting money. */
export async function sweepRefundDocuments(): Promise<number> {
  const db = getDb();
  const pending = await db.execute<{ order_id: string; payment_id: string | null; amount: number }>(sql`
    SELECT id AS order_id,NULL::uuid AS payment_id,refunded_cents AS amount FROM orders
    WHERE refunded_cents>0 AND cancellation_number IS NULL
      OR refunded_cents>0 AND jsonb_array_length(refund_documents)>0 AND
        ((refund_documents->-1->>'cumulativeCents')::int<refunded_cents OR EXISTS(SELECT 1 FROM jsonb_array_elements(refund_documents) d WHERE d->>'sentAt' IS NULL))
    UNION ALL
    SELECT order_id,id AS payment_id,refunded_cents AS amount FROM order_payments WHERE refunded_cents>0 AND
      (jsonb_array_length(refund_documents)=0 OR (refund_documents->-1->>'cumulativeCents')::int<refunded_cents
        OR EXISTS(SELECT 1 FROM jsonb_array_elements(refund_documents) d WHERE d->>'sentAt' IS NULL))`);
  const { enqueue, QUEUES } = await import('../queue');
  for (const row of pending.rows)
    await enqueue(
      QUEUES.sendInvoice,
      { orderId: row.order_id, kind: 'cancellation', paymentId: row.payment_id ?? undefined },
      { singletonKey: `refund-document-${row.payment_id ?? row.order_id}-${row.amount}` },
    );
  return pending.rows.length;
}

/** Rechnung zu einer Monatsrate bzw. „Hosting & Pflege“ erzeugen und senden (idempotent). */
export async function sendPaymentInvoice(paymentId: string): Promise<'sent' | 'already' | 'skipped'> {
  const db = getDb();
  const cfg = await getConfig();
  const { storage } = getProviders();
  const pay = await db.query.orderPayments.findFirst({ where: eq(orderPayments.id, paymentId) });
  if (!pay?.invoiceNumber || !pay.invoiceJson) return 'skipped';
  if (pay.invoiceSentAt) return 'already';
  const order = await db.query.orders.findFirst({ where: eq(orders.id, pay.orderId) });
  if (!order) return 'skipped';
  let key = pay.invoicePdfKey;
  let pdf = key ? await storage.get(key) : null;
  if (!pdf) {
    pdf = await htmlToPdf(renderInvoiceHtml(pay.invoiceJson as unknown as InvoiceData));
    key = invoiceKey(pay.invoiceNumber, pay.paidAt);
    await storage.put(key, pdf, 'application/pdf');
    await db.update(orderPayments).set({ invoicePdfKey: key }).where(eq(orderPayments.id, pay.id));
  }
  const customer = await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) });
  const period =
    pay.periodStart && pay.periodEnd
      ? `${formatDateDe(pay.periodStart)} bis ${formatDateDe(new Date(pay.periodEnd.getTime() - 86400_000))}`
      : formatDateDe(pay.paidAt);
  const mail = recurringInvoiceEmail(cfg, {
    name: order.customerName,
    invoiceNumber: pay.invoiceNumber,
    amount: formatEuro(pay.amountCents),
    period,
    domain: customer?.domain ?? order.domainWish,
  });
  await sendTransactionalEmail({
    ...mail,
    kind: 'invoice',
    idempotencyKey: `invoice:${order.id}:${pay.invoiceNumber}`,
    to: customer?.email ?? order.customerEmail,
    attachments: [{ filename: `Rechnung-${pay.invoiceNumber}.pdf`, content: pdf, contentType: 'application/pdf' }],
    orderId: order.id,
    customerId: customer?.id,
    leadId: order.leadId,
  });
  await db.update(orderPayments).set({ invoiceSentAt: new Date() }).where(eq(orderPayments.id, pay.id));
  await audit(db, {
    entity: 'order',
    entityId: order.id,
    action: 'payment_invoice_sent',
    actor: 'job:send-invoice',
    context: { invoiceNumber: pay.invoiceNumber, sequence: pay.sequence },
  });
  return 'sent';
}
