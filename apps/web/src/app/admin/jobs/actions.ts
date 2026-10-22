'use server';

import { revalidatePath } from 'next/cache';
import { audit, enqueue, getDb, QUEUES, type QueueName } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function startFindLeads(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const cities = form.getAll('cities').map(String).filter(Boolean);
  const branches = form.getAll('branches').map(String).filter(Boolean);
  await enqueue(QUEUES.findLeads, { cities, branches, triggeredBy: actorOf(s) }, { singletonKey: 'find-leads' });
  await audit(getDb(), { entity: 'job', entityId: QUEUES.findLeads, action: 'enqueue', actor: actorOf(s), context: { cities, branches } });
  revalidatePath('/admin/jobs');
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
}
