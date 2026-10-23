'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminOptOut, approveSupportReply, redraftSupport, setSupportStatus } from '@wbm/core';
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
  await adminOptOut(String(form.get('id')), leadId || null, actorOf(s));
  revalidatePath('/admin/support');
  redirect('/admin/support');
}
