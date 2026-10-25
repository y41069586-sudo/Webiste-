import { getEnv } from './config/env';
import { getDatabaseConnectionConfig } from './db/client';

/** Web producers never install schemas or run a background scheduler in production. */
export function queueRuntimeConfig() {
  const production = getEnv().NODE_ENV === 'production';
  const worker = process.env.APP_NAME === 'wbm-worker';
  const migrate = process.env.BOSS_MIGRATE === 'true' || (!production && process.env.BOSS_MIGRATE !== 'false');
  const supervise = process.env.BOSS_SUPERVISE ? process.env.BOSS_SUPERVISE === 'true' : worker || !production;
  const schedule = process.env.BOSS_SCHEDULE ? process.env.BOSS_SCHEDULE === 'true' : worker || !production;
  const create = process.env.BOSS_CREATE_QUEUES === 'true' || (!production && process.env.BOSS_CREATE_QUEUES !== 'false');
  const url = process.env.QUEUE_DATABASE_URL || getEnv().DATABASE_URL;
  assertQueueConnection(url, { migrate, supervise, schedule });
  return { ...getDatabaseConnectionConfig(url), migrate, supervise, schedule, create };
}

export function assertQueueConnection(url: string, options: { migrate: boolean; supervise: boolean; schedule: boolean }) {
  const u = new URL(url);
  if (
    (options.migrate || options.supervise || options.schedule) &&
    u.hostname.endsWith('.pooler.supabase.com') &&
    u.port === '6543'
  )
    throw new Error(
      'Worker/Queue-Migration benötigt eine direkte Supabase-Verbindung oder Session-Pooler (5432), keinen Transaction-Pooler.',
    );
}
