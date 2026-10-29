import { createServer } from 'node:http';
import {
  closeBrowser,
  closeDb,
  ensureLetterVariants,
  getBoss,
  getConfig,
  getEnv,
  logger,
  pingDb,
  runMigrations,
  seedDefaults,
  stopBoss,
  QUEUES,
} from '@wbm/core';
import { scheduleCrons, startWorkers } from './runtime';
import './jobs';

async function main(): Promise<void> {
  process.env.APP_NAME ??= 'wbm-worker';
  const env = getEnv();
  if (process.env.RUN_MIGRATIONS === 'true' || (env.NODE_ENV !== 'production' && process.env.RUN_MIGRATIONS !== 'false')) {
    await runMigrations();
    await seedDefaults();
    logger.info('Migrationen ausgeführt');
  }
  // Briefvorlagen auch ohne Migrationslauf startklar (Produktion: Datenbank wird separat migriert)
  try {
    const r = await ensureLetterVariants(undefined, (await getConfig({ fresh: true })).offers.activeVersion);
    if (r.seeded || r.activated.length) logger.info(r, 'Briefvorlagen eingerichtet');
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Briefvorlagen konnten nicht eingerichtet werden');
  }
  const boss = await getBoss();
  await startWorkers(boss);
  await scheduleCrons(boss, [
    { queue: QUEUES.pipelineTick, cron: '*/5 * * * *' },
    // Briefstatus alle 30 Minuten (easyNova/LetterXpress ohne Webhooks, B5.2)
    { queue: QUEUES.syncLetterStatus, cron: '*/30 * * * *' },
    { queue: QUEUES.followup, cron: '5 9 * * *' },
    // Lead-Finder wöchentlich (montags früh); abschaltbar über segments.weeklyLeadFinder
    { queue: QUEUES.findLeads, cron: '20 5 * * 1' },
    { queue: QUEUES.retention, cron: '15 3 * * *' },
    { queue: QUEUES.renewalReminders, cron: '10 8 * * *' },
    { queue: QUEUES.dunning, cron: '40 8 * * *' },
    // Claims: Abgleich mit der Datei und Sperre abgelaufener Quellen (B2)
    { queue: QUEUES.claims, cron: '25 6 * * *' },
    // Funnel-Sichten (L4) auffrischen
    { queue: QUEUES.refreshFunnel, cron: '10,40 * * * *' },
    { queue: QUEUES.weeklyOptimizer, cron: '0 18 * * 0' },
    // Lern-Agent (L6) nach dem Optimizer
    { queue: QUEUES.learningAgent, cron: '30 18 * * 0' },
    { queue: QUEUES.alertMails, cron: '*/15 * * * *' },
    { queue: QUEUES.imapPoll, cron: '*/5 * * * *', enabled: () => Boolean(env.IMAP_HOST && env.IMAP_USER) },
  ]);
  logger.info({ dryRun: env.DRY_RUN }, 'Worker gestartet');

  let stopping = false;
  // Optionaler Health-Endpoint (Docker-Healthcheck, E2E-Tests)
  const healthPort = Number(process.env.WORKER_HEALTH_PORT ?? 0);
  if (healthPort > 0) {
    createServer((req, res) => {
      if (req.url !== '/health') {
        res.writeHead(404).end();
        return;
      }
      // Lebenszeichen inkl. Datenbank-Erreichbarkeit
      void pingDb()
        .then(async (dbOk) => {
          const queueOk = boss.isInstalled ? await boss.isInstalled().catch(() => false) : false;
          const ok = dbOk && queueOk && !stopping;
          return res
            .writeHead(ok ? 200 : 503, { 'content-type': 'application/json' })
            .end(JSON.stringify({ status: ok ? 'ok' : 'unavailable', db: dbOk, queue: queueOk }));
        })
        .catch(() => res.writeHead(503).end());
    }).listen(healthPort, process.env.WORKER_HEALTH_HOST ?? '127.0.0.1');
  }

  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, 'Worker wird beendet …');
    await stopBoss().catch(() => undefined);
    await closeBrowser().catch(() => undefined);
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
