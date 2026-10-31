import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, access, rm, writeFile } from 'node:fs/promises';
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

it.each([
  '\t ',
  'postgresql://postgres:secret-fixture-not-for-logs@/',
  'https://postgres:secret-fixture-not-for-logs@localhost/postgres',
  'postgresql://postgres:[YOUR-PASSWORD]@localhost/postgres',
  'postgresql://postgres@localhost/postgres',
])('rejects invalid connection input without printing it or preparing backup files: case %#', async (input) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'backup-input-test-'));
  const target = path.join(directory, 'rejected');
  try {
    const result = await exec(process.execPath, ['--import', 'tsx', script, target], {
      env: { ...process.env, BACKUP_DATABASE_URL: input },
    }).catch((err: { stdout: string; stderr: string; code: number }) => err);
    expect(result).toMatchObject({ code: 1, stdout: '' });
    expect(result.stderr).toContain('Ungültige PostgreSQL-Verbindungs-URL');
    expect(result.stderr).not.toContain('secret-fixture-not-for-logs');
    expect(result.stderr).not.toContain('YOUR-PASSWORD');
    expect(result.stderr).not.toContain('ERR_INVALID_URL');
    expect(result.stderr).not.toContain('at new URL');
    await expect(access(target)).rejects.toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it.each(['\t ', 'postgresql://postgres:fixture@localhost/postgres'])(
  'keeps the worker running when shell input or connection preflight fails: case %#',
  async (input) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'backup-shell-test-'));
    const log = path.join(directory, 'docker.log');
    try {
      // No real Docker or network: log every attempted command and fail its connection preflight.
      await writeFile(path.join(directory, 'docker'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$BACKUP_TEST_DOCKER_LOG"\nexit 1\n', {
        mode: 0o700,
      });
      const shell = fileURLToPath(new URL('../../../infra/backup/managed-acceptance.sh', import.meta.url));
      await expect(
        exec('bash', [shell], {
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            BACKUP_DATABASE_URL: input,
            BACKUP_ROOT: path.join(directory, 'snapshots'),
            BACKUP_TEST_DOCKER_LOG: log,
            QUIESCE_WORKER: '1',
            PREPARE_MISSING_QUEUES: '1',
            SOURCE_PG_ENV: '',
          },
        }),
      ).rejects.toThrow();
      const commands = await readFile(log, 'utf8').catch(() => '');
      expect(commands).not.toContain('stop worker');
      expect(commands).not.toContain('start worker');
      expect(commands).not.toContain('prepare-queue.ts');
      if (input.startsWith('postgresql:')) expect(commands).toContain('backup-connection.ts');
      else expect(commands).toBe('');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
