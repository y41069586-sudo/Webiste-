import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { PgBoss } from 'pg-boss';
import { expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { sql } from 'drizzle-orm';
import { createQueues } from '../src/queue';
const exec = promisify(execFile);
it('queue-only preparation preserves installed schema and pending jobs', async () => {
  const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL!,
    schema: 'pgboss',
    migrate: true,
    supervise: false,
    schedule: false,
  });
  boss.on('error', () => {});
  await boss.start();
  try {
    await createQueues(boss);
    await boss.deleteQueue('research-lead');
    const id = await boss.send('find-leads', { acceptanceFixture: true });
    const version = await boss.schemaVersion();
    const before = await getDb().execute(sql`select count(*)::int n from drizzle.__drizzle_migrations`);
    const { stdout } = await exec(
      process.execPath,
      ['--import', 'tsx', fileURLToPath(new URL('../scripts/prepare-queue.ts', import.meta.url)), '--apply', '--queues-only'],
      { env: { ...process.env, QUEUE_PREPARE_CONFIRM: 'prepare-existing-database' } },
    );
    expect(stdout).toContain('"migrationsEnabled":false');
    expect(await boss.schemaVersion()).toBe(version);
    expect(await boss.getQueue('research-lead')).toBeTruthy();
    expect((await boss.getJobById('find-leads', id!))?.data).toEqual({ acceptanceFixture: true });
    const after = await getDb().execute(sql`select count(*)::int n from drizzle.__drizzle_migrations`);
    expect(after.rows).toEqual(before.rows);
  } finally {
    await boss.stop({ graceful: true });
  }
});
