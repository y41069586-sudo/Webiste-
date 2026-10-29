import { sql } from 'drizzle-orm';
import {
  audit,
  cancelWaitingJobs,
  enqueue,
  getConfig,
  getDb,
  queueState,
  QUEUES,
  readSearchProgress,
  requestSearchStop,
  updateConfig,
} from '@wbm/core';

export interface LeadSearchStatus {
  active: number;
  waiting: number;
  progress: Awaited<ReturnType<typeof readSearchProgress>>;
  /** Letztes Lebenszeichen des Worker-Servers (Takt alle 5 Minuten) */
  workerSeenAt: string | null;
  now: string;
}

export async function loadLeadSearchStatus(): Promise<LeadSearchStatus> {
  const [queue, progress, worker] = await Promise.all([
    queueState(QUEUES.findLeads).catch(() => ({ waiting: [] as string[], active: 0 })),
    readSearchProgress().catch(() => null),
    getDb()
      .execute<{ seen: Date | null }>(
        sql`SELECT max(completed_on) AS seen FROM pgboss.job WHERE state = 'completed' AND completed_on > now() - interval '1 day'`,
      )
      .then((r) => r.rows[0]?.seen ?? null)
      .catch(() => null),
  ]);
  return {
    active: queue.active,
    waiting: queue.waiting.length,
    progress,
    workerSeenAt: worker ? new Date(worker).toISOString() : null,
    now: new Date().toISOString(),
  };
}

/** Lead-Suche einreihen (nur eine zur Zeit); eine geänderte Mindestgrenze wird für spätere Suchen gemerkt. */
export async function enqueueLeadSearch(
  actor: string,
  opts: { cities: string[]; branches: string[]; minScore?: number },
): Promise<'started' | 'already_running'> {
  const state = await queueState(QUEUES.findLeads);
  if (state.active || state.waiting.length) return 'already_running';
  const { cities, branches, minScore } = opts;
  if (minScore !== undefined && minScore !== (await getConfig()).filters.minLeadScore)
    await updateConfig({ filters: { minLeadScore: minScore } }, actor);
  await enqueue(
    QUEUES.findLeads,
    { cities, branches, minScore, triggeredBy: actor },
    { singletonKey: 'find-leads', expireInSeconds: 3 * 60 * 60 },
  );
  await audit(getDb(), {
    entity: 'job',
    entityId: QUEUES.findLeads,
    action: 'enqueue',
    actor,
    context: { cities, branches, minScore },
  });
  return 'started';
}

/** Laufende Suche anhalten, wartende abbrechen. Bereits geprüfte Treffer bleiben gespeichert. */
export async function stopLeadSearch(actor: string): Promise<void> {
  const [progress] = await Promise.all([readSearchProgress(), cancelWaitingJobs(QUEUES.findLeads)]);
  if (progress?.runId) await requestSearchStop(progress.runId, actor);
  await audit(getDb(), {
    entity: 'job',
    entityId: QUEUES.findLeads,
    action: 'stop',
    actor,
    context: { runId: progress?.runId ?? null },
  });
}
