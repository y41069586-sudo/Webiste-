'use server';

import { revalidatePath } from 'next/cache';
import { getDb, optOutLead, transitionLead } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function requalifyLead(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  await getDb().transaction((tx) =>
    transitionLead(tx, id, 'qualified', { actor: actorOf(s), reason: 'manuell freigegeben', soft: true }),
  );
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath('/admin/leads');
}

export async function rejectLead(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  const reason = String(form.get('reason') || 'manuell abgelehnt');
  await getDb().transaction((tx) => transitionLead(tx, id, 'rejected', { actor: actorOf(s), reason, soft: true }));
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath('/admin/leads');
}

export async function suppressLead(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  await getDb().transaction((tx) => optOutLead(tx, id, actorOf(s), 'admin_sperre'));
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath('/admin/leads');
}
