import type { PgBoss, Job } from 'pg-boss';
import {
  BudgetExceededError,
  errInfo,
  getDb,
  KillSwitchError,
  logger,
  raiseAlert,
  type QueueName,
  type QueuePayloads,
} from '@wbm/core';

export interface JobContext {
  jobId: string;
  retryCount: number;
  log: typeof logger;
  signal: AbortSignal;
}

export type Handler<Q extends QueueName> = (data: QueuePayloads[Q], ctx: JobContext) => Promise<unknown>;

interface Registration {
  queue: QueueName;
  handler: Handler<QueueName>;
  concurrency: number;
}

const registrations: Registration[] = [];

/** Job-Handler registrieren (wird beim Start an pg-boss gebunden). */
export function defineJob<Q extends QueueName>(queue: Q, handler: Handler<Q>, opts: { concurrency?: number } = {}): void {
  registrations.push({ queue, handler: handler as Handler<QueueName>, concurrency: opts.concurrency ?? 1 });
}

/** Fehler, die nicht wiederholt werden sollen (Job wird als erledigt markiert). */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

export async function startWorkers(boss: PgBoss): Promise<void> {
  for (const r of registrations) {
    await boss.work(
      r.queue,
      { batchSize: 1, localConcurrency: r.concurrency, pollingIntervalSeconds: 2 },
      async (jobs: Job<object>[]) => {
        for (const job of jobs) {
          const log = logger.child({ queue: r.queue, jobId: job.id });
          const started = Date.now();
          try {
            const result = await r.handler(job.data as QueuePayloads[QueueName], {
              jobId: job.id,
              retryCount: job.retryCount,
              log,
              signal: job.signal,
            });
            log.info({ ms: Date.now() - started }, 'job erledigt');
            return result;
          } catch (err) {
            if (err instanceof KillSwitchError || err instanceof BudgetExceededError || err instanceof NonRetryableError) {
              // Kein Retry-Sturm: Job beenden, Zustand bleibt für den nächsten Lauf erhalten
              log.warn({ err: errInfo(err) }, 'job gestoppt (nicht wiederholbar)');
              return { stopped: err.name, message: err.message };
            }
            log.error({ err: errInfo(err), retry: job.retryCount }, 'job fehlgeschlagen');
            throw err;
          }
        }
        return undefined;
      },
    );
    logger.info({ queue: r.queue, concurrency: r.concurrency }, 'worker registriert');
  }

  // Dead-Letter: endgültig fehlgeschlagene Jobs als Meldung ins Dashboard
  await boss.work('dead-letters', { batchSize: 10 }, async (jobs: Job<object>[]) => {
    for (const job of jobs) {
      await raiseAlert(getDb(), {
        level: 'error',
        code: `dead_letter:${job.id}`,
        message: 'Ein Job ist nach allen Wiederholungen endgültig fehlgeschlagen.',
        context: { jobId: job.id, data: job.data },
      });
    }
  });
}

export interface CronDef {
  queue: QueueName;
  cron: string;
  enabled?: () => boolean;
}

export async function scheduleCrons(boss: PgBoss, crons: CronDef[]): Promise<void> {
  const tz = 'Europe/Berlin';
  for (const c of crons) {
    if (c.enabled && !c.enabled()) {
      await boss.unschedule(c.queue).catch(() => undefined);
      continue;
    }
    await boss.schedule(c.queue, c.cron, {}, { tz });
    logger.info({ queue: c.queue, cron: c.cron }, 'cron geplant');
  }
}
