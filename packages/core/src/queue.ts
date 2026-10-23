import { PgBoss, type SendOptions } from 'pg-boss';
import { getEnv } from './config/env';
import { logger } from './logger';

/** Alle Queues mit Standardoptionen (Retries mit Backoff, Dead-Letter). */
export const QUEUES = {
  findLeads: 'find-leads',
  buildDemo: 'build-demo',
  qaDemo: 'qa-demo',
  publishDemo: 'publish-demo',
  generateLetter: 'generate-letter',
  sendLetter: 'send-letter',
  sendApprovedLetters: 'send-approved-letters',
  syncLetterStatus: 'sync-letter-status',
  followup: 'followup',
  processPayment: 'process-payment',
  sendInvoice: 'send-invoice',
  onboarding: 'onboarding',
  buildSite: 'build-site',
  deploySite: 'deploy-site',
  liveCheck: 'live-check',
  supportInbound: 'support-inbound',
  supportSend: 'support-send',
  imapPoll: 'imap-poll',
  weeklyOptimizer: 'weekly-optimizer',
  retention: 'retention',
  renewalReminders: 'renewal-reminders',
  alertMails: 'alert-mails',
  pipelineTick: 'pipeline-tick',
  deadLetters: 'dead-letters',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export interface QueuePayloads {
  'find-leads': { cities?: string[]; branches?: string[]; triggeredBy: string };
  'build-demo': { leadId: string; regenerate?: boolean; triggeredBy?: string };
  'qa-demo': { demoId: string };
  'publish-demo': { demoId: string };
  'generate-letter': { leadId: string; sequence: 1 | 2; triggeredBy?: string; test?: boolean; regenerate?: boolean };
  'send-letter': { letterId: string };
  'send-approved-letters': { triggeredBy: string; limit?: number };
  'sync-letter-status': Record<string, never>;
  followup: Record<string, never>;
  'process-payment': { orderId: string; eventId: string };
  'send-invoice': { orderId: string };
  onboarding: { customerId: string };
  'build-site': { siteId: string; changeRequestId?: string };
  'deploy-site': { siteId: string };
  'live-check': { siteId: string; attempt?: number };
  'support-inbound': { messageId: string };
  'support-send': { messageId: string };
  'imap-poll': Record<string, never>;
  'weekly-optimizer': { periodEnd?: string };
  retention: Record<string, never>;
  'renewal-reminders': Record<string, never>;
  'alert-mails': Record<string, never>;
  'pipeline-tick': Record<string, never>;
  'dead-letters': Record<string, unknown>;
}

interface QueueDef {
  retryLimit: number;
  retryDelay: number;
  expireInSeconds: number;
  policy?: 'standard' | 'singleton' | 'stately' | 'exclusive';
}

const DEFAULT_DEF: QueueDef = { retryLimit: 3, retryDelay: 30, expireInSeconds: 15 * 60 };

export const QUEUE_DEFS: Partial<Record<QueueName, Partial<QueueDef>>> = {
  'find-leads': { retryLimit: 1, expireInSeconds: 60 * 60, policy: 'singleton' },
  'build-demo': { retryLimit: 2, expireInSeconds: 20 * 60 },
  'send-letter': { retryLimit: 3, retryDelay: 120 },
  'send-approved-letters': { policy: 'singleton', retryLimit: 1 },
  'weekly-optimizer': { policy: 'singleton', retryLimit: 2 },
  retention: { policy: 'singleton', retryLimit: 2 },
  'live-check': { retryLimit: 10, retryDelay: 120 },
  'deploy-site': { retryLimit: 3, retryDelay: 60, expireInSeconds: 30 * 60 },
  'pipeline-tick': { policy: 'singleton', retryLimit: 0 },
  'dead-letters': { retryLimit: 0 },
};

interface BossGlobal {
  __wbmBoss?: Promise<PgBoss>;
}
const g = globalThis as unknown as BossGlobal;

export async function createQueues(boss: PgBoss): Promise<void> {
  const existing = new Set((await boss.getQueues()).map((q) => q.name));
  // Dead-Letter-Queue zuerst, da alle anderen Queues auf sie verweisen
  const names = [QUEUES.deadLetters, ...Object.values(QUEUES).filter((n) => n !== QUEUES.deadLetters)];
  for (const name of names) {
    const def = { ...DEFAULT_DEF, ...QUEUE_DEFS[name] };
    if (existing.has(name)) continue;
    await boss.createQueue(name, {
      retryLimit: def.retryLimit,
      retryDelay: def.retryDelay,
      retryBackoff: true,
      retryDelayMax: 60 * 60,
      expireInSeconds: def.expireInSeconds,
      policy: def.policy ?? 'standard',
      ...(name === QUEUES.deadLetters ? {} : { deadLetter: QUEUES.deadLetters }),
    });
  }
}

/** Gemeinsame pg-boss-Instanz (Web zum Einreihen, Worker zum Verarbeiten). */
export function getBoss(): Promise<PgBoss> {
  if (!g.__wbmBoss) {
    g.__wbmBoss = (async () => {
      const boss = new PgBoss({
        connectionString: getEnv().DATABASE_URL,
        schema: 'pgboss',
        max: Number(process.env.BOSS_POOL_MAX ?? 4),
        application_name: `${process.env.APP_NAME ?? 'wbm'}-boss`,
      });
      boss.on('error', (err: Error) => logger.error({ err: err.message }, 'pg-boss Fehler'));
      await boss.start();
      await createQueues(boss);
      return boss;
    })();
    g.__wbmBoss.catch(() => {
      g.__wbmBoss = undefined;
    });
  }
  return g.__wbmBoss;
}

export async function stopBoss(): Promise<void> {
  if (g.__wbmBoss) {
    const boss = await g.__wbmBoss;
    await boss.stop({ graceful: true, timeout: 10_000 });
    g.__wbmBoss = undefined;
  }
}

/** Job einreihen. Mit `singletonKey` idempotent (z. B. pro Lead). */
export async function enqueue<Q extends QueueName>(
  name: Q,
  data: QueuePayloads[Q],
  options: SendOptions = {},
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(name, data as object, options);
}
