'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import {
  approveClaimLetter,
  audit,
  cancelClaimLetter,
  enqueue,
  getDb,
  guaranteeRefund,
  QUEUES,
  refundOrder,
  schema,
} from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function resendInvoiceAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  const db = getDb();
  // Neuer Versand: alte Idempotenz-Sperre der Rechnungs-Mail aufheben
  await db.update(schema.orders).set({ invoiceSentAt: null }).where(eq(schema.orders.id, id));
  await db.delete(schema.outboundEmails).where(eq(schema.outboundEmails.idempotencyKey, `invoice:${id}`));
  await enqueue(QUEUES.sendInvoice, { orderId: id });
  await audit(db, { entity: 'order', entityId: id, action: 'invoice_resend', actor: actorOf(s) });
  revalidatePath(`/admin/orders/${id}`);
}

/** Echte Erstattung – nur mit getippter Bestätigung. */
export async function refundOrderAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  if (String(form.get('confirm')).trim().toUpperCase() !== 'ERSTATTEN')
    throw new Error('Bitte zur Bestätigung ERSTATTEN eintippen.');
  const euros = String(form.get('amount') ?? '')
    .replace(',', '.')
    .trim();
  const cents = euros ? Math.round(Number(euros) * 100) : undefined;
  if (cents !== undefined && (!Number.isFinite(cents) || cents <= 0)) throw new Error('Ungültiger Betrag');
  await refundOrder(id, actorOf(s), cents);
  revalidatePath(`/admin/orders/${id}`);
}

/** Zufriedenheitsgarantie: Erstattung, Vertrag beenden, Seite offline – nur mit getippter Bestätigung. */
export async function guaranteeRefundAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  if (String(form.get('confirm')).trim().toUpperCase() !== 'GARANTIE')
    throw new Error('Bitte zur Bestätigung GARANTIE eintippen.');
  await guaranteeRefund(id, actorOf(s));
  revalidatePath(`/admin/orders/${id}`);
}

/** Forderungsbrief freigeben (Versand über den Briefdienst; im DRY_RUN nur Freigabe). */
export async function approveClaimLetterAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  if (String(form.get('confirm')).trim().toUpperCase() !== 'FREIGEBEN')
    throw new Error('Bitte zur Bestätigung FREIGEBEN eintippen.');
  await approveClaimLetter(id, actorOf(s));
  revalidatePath(`/admin/orders/${String(form.get('orderId'))}`);
}

export async function cancelClaimLetterAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await cancelClaimLetter(String(form.get('id')), actorOf(s), String(form.get('note') ?? ''));
  revalidatePath(`/admin/orders/${String(form.get('orderId'))}`);
}
