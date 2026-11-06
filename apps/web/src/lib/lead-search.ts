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
  /** Was nach der Suche passiert (seit Start der letzten Suche): KI-Prüfung, Demo-Bau, Freigabe */
  flow: SearchFlow;
  now: string;
}

export interface SearchFlow {
  /** KI prüft gerade bzw. wartet auf Prüfung */
  checking: number;
  /** KI: passt */
  fits: number;
  /** KI: aussortiert (Website gefunden, unsicher, ungeeignet) */
  sortedOut: number;
  /** Demo wird gebaut oder geprüft */
  building: number;
  /** Demo wartet auf deine Freigabe */
  waiting: number;
}

async function loadFlow(since: string | null): Promise<SearchFlow> {
  const from = since ?? new Date(Date.now() - 24 * 3600_000).toISOString();
  const r = await getDb().execute<SearchFlow & Record<string, unknown>>(sql`SELECT
      (SELECT count(*)::int FROM leads l WHERE l.status = 'discovered' AND l.anonymized_at IS NULL AND l.phone IS NOT NULL) AS checking,
      (SELECT count(*)::int FROM settings s WHERE s.key LIKE 'ai-research:%' AND s.updated_at >= ${from}::timestamptz
         AND s.value->>'state' = 'ready') AS fits,
      (SELECT count(*)::int FROM settings s WHERE s.key LIKE 'ai-research:%' AND s.updated_at >= ${from}::timestamptz
         AND s.value->>'state' IN ('excluded', 'has_website', 'review')) AS "sortedOut",
      (SELECT count(*)::int FROM leads l WHERE l.status = 'qualified' AND l.anonymized_at IS NULL)
        + (SELECT count(*)::int FROM demos d WHERE d.status = 'building') AS building,
      (SELECT count(*)::int FROM demos d WHERE d.status = 'pending_review') AS waiting`);
  return r.rows[0] ?? { checking: 0, fits: 0, sortedOut: 0, building: 0, waiting: 0 };
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
  const flow = await loadFlow(progress?.startedAt ?? null).catch(() => ({
    checking: 0,
    fits: 0,
    sortedOut: 0,
    building: 0,
    waiting: 0,
  }));
  return {
    active: queue.active,
    waiting: queue.waiting.length,
    progress,
    workerSeenAt: worker ? new Date(worker).toISOString() : null,
    flow,
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
