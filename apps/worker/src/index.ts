import { createServer } from 'node:http';
import { closeDb, getBoss, getEnv, logger, pingDb, runMigrations, seedDefaults, stopBoss, QUEUES } from '@wbm/core';
import { scheduleCrons, startWorkers } from './runtime';
import './jobs';

async function main(): Promise<void> {
  process.env.APP_NAME ??= 'wbm-worker';
  const env = getEnv();
  if (process.env.RUN_MIGRATIONS !== 'false') {
    await runMigrations();
    await seedDefaults();
    logger.info('Migrationen ausgeführt');
  }
  const boss = await getBoss();
  await startWorkers(boss);
  await scheduleCrons(boss, [
    { queue: QUEUES.pipelineTick, cron: '*/5 * * * *' },
    { queue: QUEUES.syncLetterStatus, cron: '15 */2 * * *' },
    { queue: QUEUES.followup, cron: '5 9 * * *' },
    { queue: QUEUES.retention, cron: '15 3 * * *' },
    { queue: QUEUES.renewalReminders, cron: '10 8 * * *' },
    { queue: QUEUES.weeklyOptimizer, cron: '0 18 * * 0' },
    { queue: QUEUES.alertMails, cron: '*/15 * * * *' },
    { queue: QUEUES.imapPoll, cron: '*/5 * * * *', enabled: () => Boolean(env.IMAP_HOST && env.IMAP_USER) },
  ]);
  logger.info({ dryRun: env.DRY_RUN }, 'Worker gestartet');

  // Optionaler Health-Endpoint (Docker-Healthcheck, E2E-Tests)
  const healthPort = Number(process.env.WORKER_HEALTH_PORT ?? 0);
  if (healthPort > 0) {
    createServer((req, res) => {
      if (req.url !== '/health') {
        res.writeHead(404).end();
        return;
      }
      // Lebenszeichen inkl. Datenbank-Erreichbarkeit
      void pingDb().then((ok) => res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' }).end(JSON.stringify({ status: ok ? 'ok' : 'db_down' })));
    }).listen(healthPort, process.env.WORKER_HEALTH_HOST ?? '127.0.0.1');
  }

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, 'Worker wird beendet …');
    await stopBoss().catch(() => undefined);
    await closeDb().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch(async (err) => {
  logger.fatal({ err: err instanceof Error ? err.message : String(err) }, 'Worker-Start fehlgeschlagen');
  await closeDb().catch(() => undefined);
  process.exit(1);
});
