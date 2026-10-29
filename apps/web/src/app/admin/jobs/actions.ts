'use server';

import { revalidatePath } from 'next/cache';
import { applyMinLeadScore, audit, cancelWaitingJobs, enqueue, getConfig, getDb, QUEUES, type QueueName } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';
import { enqueueLeadSearch, stopLeadSearch } from '@/lib/lead-search';

export async function startFindLeads(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const cities = form.getAll('cities').map(String).filter(Boolean);
  const branches = form.getAll('branches').map(String).filter(Boolean);
  const rawMin = Number(form.get('minScore'));
  const minScore =
    Number.isFinite(rawMin) && form.get('minScore') !== null ? Math.max(0, Math.min(100, Math.round(rawMin))) : undefined;
  // Nur eine Lead-Suche zur Zeit: weitere Klicks reihen nichts zusätzlich ein
  await enqueueLeadSearch(actorOf(s), { cities, branches, minScore });
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

/** Laufende Lead-Suche anhalten: Bereits geprüfte Treffer bleiben gespeichert, der Rest wird nicht mehr geprüft. */
export async function stopFindLeads(): Promise<void> {
  const s = await requireAdmin();
  await stopLeadSearch(actorOf(s));
  revalidatePath('/admin/suche');
}

/** Mindestgrenze auf die vorhandenen offenen Leads anwenden (nichts wird gelöscht) */
export async function applyMinScore(): Promise<void> {
  const s = await requireAdmin();
  const cfg = await getConfig({ fresh: true });
  await applyMinLeadScore(cfg.filters.minLeadScore, actorOf(s));
  revalidatePath('/admin/suche');
  revalidatePath('/admin/leads');
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
