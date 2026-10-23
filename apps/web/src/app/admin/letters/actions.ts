'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';
import { approveLetter, audit, bulkApproveLetters, enqueue, getConfig, getDb, QUEUES, rejectLetter, schema } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function approveLetterAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await approveLetter(String(form.get('id')), actorOf(s));
  revalidatePath('/admin/letters');
}

export async function bulkApproveLettersAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await bulkApproveLetters(form.getAll('ids').map(String), actorOf(s));
  revalidatePath('/admin/letters');
}

export async function rejectLetterAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await rejectLetter(String(form.get('id')), actorOf(s), String(form.get('note') || 'verworfen'), form.get('regenerate') === '1');
  revalidatePath('/admin/letters');
}

/** Testbrief an die in den Einstellungen hinterlegte eigene Adresse (nutzt die neueste veröffentlichte Demo). */
export async function createTestLetterAction(): Promise<void> {
  const s = await requireAdmin();
  const cfg = await getConfig({ fresh: true });
  const t = cfg.letter.testRecipient;
  if (!t.street || !t.postalCode || !t.city) throw new Error('Bitte zuerst die Testadresse unter Einstellungen → Brief & Versand eintragen.');
  const demo = await getDb()
    .select({ leadId: schema.demos.leadId })
    .from(schema.demos)
    .where(eq(schema.demos.status, 'published'))
    .orderBy(desc(schema.demos.publishedAt))
    .limit(1);
  if (!demo[0]) throw new Error('Es gibt noch keine veröffentlichte Demo als Vorlage.');
  await enqueue(QUEUES.generateLetter, { leadId: demo[0].leadId, sequence: 1, triggeredBy: actorOf(s), test: true });
  await audit(getDb(), { entity: 'letter', entityId: 'test', action: 'test_requested', actor: actorOf(s) });
  revalidatePath('/admin/letters');
}

export async function sendApprovedNowAction(): Promise<void> {
  const s = await requireAdmin();
  await enqueue(QUEUES.sendApprovedLetters, { triggeredBy: actorOf(s) }, { singletonKey: 'send-approved' });
  await audit(getDb(), { entity: 'job', entityId: QUEUES.sendApprovedLetters, action: 'enqueue', actor: actorOf(s) });
  revalidatePath('/admin/letters');
}
