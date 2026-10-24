'use server';

import { revalidatePath } from 'next/cache';
import { getDb, markLetterUndeliverable, optOutLead, transitionLead } from '@wbm/core';
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

/** Rücksendung „unzustellbar“ erfassen (B6.1) – nur mit getippter Bestätigung, da der Lead auf failed geht. */
export async function markUndeliverableAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const letterId = String(form.get('letterId'));
  const leadId = String(form.get('leadId'));
  if (String(form.get('confirm')).trim().toUpperCase() !== 'UNZUSTELLBAR')
    throw new Error('Bitte zur Bestätigung UNZUSTELLBAR eintippen.');
  await markLetterUndeliverable(letterId, actorOf(s));
  revalidatePath(`/admin/leads/${leadId}`);
}
