'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';
import {
  LETTER_QUALITY_DIMENSIONS,
  type LetterQualityScores,
  approveLetter,
  audit,
  bulkApproveLetters,
  enqueue,
  getConfig,
  getDb,
  QUEUES,
  rejectLetter,
  schema,
  submitLxpTestJob,
} from '@wbm/core';
import { redirect } from 'next/navigation';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function approveLetterAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const ok = await approveLetter(
    String(form.get('id')),
    actorOf(s),
    Object.fromEntries(
      Object.keys(LETTER_QUALITY_DIMENSIONS).map((key) => [
        key,
        form.has(`quality_${key}`) ? Number(form.get(`quality_${key}`)) : NaN,
      ]),
    ) as LetterQualityScores,
  );
  if (!ok)
    redirect(
      `/admin/letters/${encodeURIComponent(String(form.get('id')))}?hinweis=${encodeURIComponent('Freigabe nicht möglich. Wahrheitsprüfung und vollständige Qualitätsbewertung müssen bestanden sein.')}`,
    );
  revalidatePath('/admin/letters');
}

export async function bulkApproveLettersAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const ids = form.getAll('ids').map(String);
  const count = await bulkApproveLetters(ids, actorOf(s));
  if (count < ids.length)
    redirect(
      `/admin/letters/${encodeURIComponent(ids[0]!)}?hinweis=${encodeURIComponent('Neue Briefe benötigen eine tatsächliche Einzelbewertung. Nicht alle ausgewählten Briefe wurden freigegeben.')}`,
    );
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
  if (!t.street || !t.postalCode || !t.city)
    throw new Error('Bitte zuerst die Testadresse unter Einstellungen → Brief & Versand eintragen.');
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

/** Testauftrag im Testmodus des Briefdienstes (easyNova/LetterXpress: kein Druck, keine Kosten – auch bei DRY_RUN). */
export async function lxpTestJobAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  let msg: string;
  try {
    const r = await submitLxpTestJob(id, actorOf(s));
    msg = `Testauftrag ${r.jobId} im Testmodus des Briefdienstes eingeliefert (Status ${r.status}). Bisher ${r.count} Testaufträge.`;
  } catch (err) {
    msg = `Testauftrag fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`;
  }
  revalidatePath(`/admin/letters/${id}`);
  redirect(`/admin/letters/${id}?hinweis=${encodeURIComponent(msg)}`);
}
