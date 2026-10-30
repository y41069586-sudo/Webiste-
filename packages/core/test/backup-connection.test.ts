import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, access, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { getDb } from '../src/db/client';

const exec = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/backup-connection.ts', import.meta.url));

it('prepares private connection files only for a role that can read the full backup', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'backup-connection-test-'));
  const role = `backup_test_${randomBytes(6).toString('hex')}`;
  const db = getDb();
  try {
    const accepted = path.join(directory, 'accepted');
    const result = await exec(process.execPath, ['--import', 'tsx', script, accepted]);
    expect(result.stdout).toContain('"credentialsPrinted":false');
    expect(result.stdout).not.toContain('PGPASSWORD');
    expect(await readFile(path.join(accepted, 'source-pg.env'), 'utf8')).toContain('PGDATABASE=');
    await db.execute(sql.raw(`CREATE ROLE ${role} LOGIN PASSWORD 'local-backup-fixture'`));
    const restricted = new URL(process.env.DATABASE_URL!);
    restricted.username = role;
    restricted.password = 'local-backup-fixture';
    const rejected = path.join(directory, 'rejected');
    await expect(
      exec(process.execPath, ['--import', 'tsx', script, rejected], {
        env: { ...process.env, BACKUP_DATABASE_URL: '', QUEUE_DATABASE_URL: '', DATABASE_URL: restricted.toString() },
      }),
    ).rejects.toThrow(/vollständiges Backup/);
    await expect(access(path.join(rejected, 'source-pg.env'))).rejects.toThrow();
  } finally {
    await db.execute(sql.raw(`DROP ROLE IF EXISTS ${role}`));
    await rm(directory, { recursive: true, force: true });
  }
});
