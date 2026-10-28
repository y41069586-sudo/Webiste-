'use server';

import { revalidatePath } from 'next/cache';
import { audit, cancelWaitingJobs, enqueue, getDb, queueState, QUEUES, type QueueName } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function startFindLeads(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const cities = form.getAll('cities').map(String).filter(Boolean);
  const branches = form.getAll('branches').map(String).filter(Boolean);
  // Nur eine Lead-Suche zur Zeit: weitere Klicks reihen nichts zusätzlich ein
  const state = await queueState(QUEUES.findLeads);
  if (state.active || state.waiting.length) {
    revalidatePath('/admin/jobs');
    revalidatePath('/admin/suche');
    return;
  }
  await enqueue(
    QUEUES.findLeads,
    { cities, branches, triggeredBy: actorOf(s) },
    { singletonKey: 'find-leads', expireInSeconds: 3 * 60 * 60 },
  );
  await audit(getDb(), {
    entity: 'job',
    entityId: QUEUES.findLeads,
    action: 'enqueue',
    actor: actorOf(s),
    context: { cities, branches },
  });
  revalidatePath('/admin/jobs');
  revalidatePath('/admin/suche');
}

/** Noch nicht gestartete Lead-Suchen abbrechen (laufende Suche läuft zu Ende). */
export async function cancelFindLeads(): Promise<void> {
  const s = await requireAdmin();
  const n = await cancelWaitingJobs(QUEUES.findLeads);
  await audit(getDb(), {
    entity: 'job',
    entityId: QUEUES.findLeads,
    action: 'cancel_waiting',
    actor: actorOf(s),
    context: { n },
  });
  revalidatePath('/admin/jobs');
  revalidatePath('/admin/suche');
}

const MANUAL: QueueName[] = [
  QUEUES.pipelineTick,
  QUEUES.sendApprovedLetters,
  QUEUES.syncLetterStatus,
  QUEUES.followup,
  QUEUES.retention,
  QUEUES.weeklyOptimizer,
  QUEUES.renewalReminders,
  QUEUES.alertMails,
];

export async function runJobNow(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const name = String(form.get('queue')) as QueueName;
  if (!MANUAL.includes(name)) throw new Error('Job nicht manuell startbar');
  const data = name === QUEUES.sendApprovedLetters ? { triggeredBy: actorOf(s) } : {};
  await enqueue(name, data as never);
  await audit(getDb(), { entity: 'job', entityId: name, action: 'enqueue', actor: actorOf(s) });
  revalidatePath('/admin/jobs');
  revalidatePath('/admin/suche');
}
