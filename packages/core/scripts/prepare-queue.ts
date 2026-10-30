import { writeFile } from 'node:fs/promises';
import { PgBoss, getConstructionPlans } from 'pg-boss';
import { getDatabaseConnectionConfig } from '../src/db/client';
import { getEnv } from '../src/config/env';
import { createQueues } from '../src/queue';
import { assertQueueConnection } from '../src/queue-config';

// Offline SQL generation is the default. Never seed business data here.
const apply = process.argv.includes('--apply');
const queuesOnly = process.argv.includes('--queues-only');
if (!apply) {
  const file = process.argv.find((a) => a.startsWith('--output='))?.slice(9) ?? '/tmp/seitenwerk-pgboss-install.sql';
  await writeFile(file, getConstructionPlans('pgboss'), { mode: 0o600 });
  console.log(
    JSON.stringify({
      mode: 'offline',
      file,
      notice: 'Nur SQL erzeugt; keine Datenbankverbindung. Vor Anwendung Rollen, pg-boss-Version und Backup prüfen.',
    }),
  );
} else {
  if (process.env.QUEUE_PREPARE_CONFIRM !== 'prepare-existing-database')
    throw new Error('Explizite QUEUE_PREPARE_CONFIRM fehlt; keine Migration ausgeführt.');
  const url = process.env.QUEUE_DATABASE_URL || getEnv().DATABASE_URL;
  assertQueueConnection(url, { migrate: !queuesOnly, supervise: false, schedule: false });
  const boss = new PgBoss({
    ...getDatabaseConnectionConfig(url),
    schema: 'pgboss',
    migrate: !queuesOnly,
    supervise: false,
    schedule: false,
    max: 1,
  });
  boss.on('error', () => console.error('Queue-Einrichtung fehlgeschlagen; private Betriebslogs prüfen.'));
  try {
    await boss.start();
    if (queuesOnly && !(await boss.isInstalled()))
      throw new Error('Bestehendes pg-boss-Schema fehlt; keine Migration ausgeführt.');
    await createQueues(boss);
    console.log(
      JSON.stringify({
        status: 'prepared',
        migrationsEnabled: !queuesOnly,
        schemaVersion: await boss.schemaVersion(),
        queues: (await boss.getQueues()).length,
      }),
    );
  } finally {
    await boss.stop({ graceful: true });
  }
}
