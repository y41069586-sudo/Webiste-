'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminOptOut, approveSupportReply, deleteSupportMessage, redraftSupport, setSupportStatus } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function approveReplyAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  await approveSupportReply(id, String(form.get('text') ?? ''), actorOf(s));
  revalidatePath('/admin/support');
  redirect('/admin/support');
}

export async function setStatusAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const status = form.get('status') === 'ignored' ? 'ignored' : 'done';
  await setSupportStatus(String(form.get('id')), status, actorOf(s));
  revalidatePath('/admin/support');
  redirect('/admin/support');
}

export async function redraftAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  await redraftSupport(id, actorOf(s));
  revalidatePath(`/admin/support/${id}`);
}

export async function optOutAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const leadId = String(form.get('leadId') ?? '').trim();
  if (leadId && !/^[0-9a-f-]{36}$/.test(leadId)) throw new Error('Ungültige Lead-ID');
  const id = String(form.get('id'));
  let hinweis: string | null = null;
  try {
    await adminOptOut(id, leadId || null, actorOf(s));
  } catch (err) {
    hinweis = err instanceof Error ? err.message : String(err);
  }
  revalidatePath('/admin/support');
  // Fehler (z. B. kein Betrieb zugeordnet) als Hinweis auf der Nachricht statt Fehlerseite
  redirect(hinweis ? `/admin/support/${id}?hinweis=${encodeURIComponent(hinweis)}` : '/admin/support');
}

/** Nachricht endgültig entfernen (Newsletter, Werbung, Fehlleitungen). */
export async function deleteAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Ungültige Nachricht');
  await deleteSupportMessage(id, actorOf(s));
  revalidatePath('/admin', 'layout');
  redirect('/admin/support');
}
