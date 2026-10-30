import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { backupStorage } from '../src/services/storage-backup';
import { LocalStorage } from '../src/providers/storage/local';
const exec = promisify(execFile);
const dirs: string[] = [];
afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true });
});
const script = fileURLToPath(new URL('../scripts/backup-storage.ts', import.meta.url));
it('restores exact binary bytes locally and refuses an existing target', async () => {
  const d = await mkdtemp(path.join(os.tmpdir(), 'storage-cli-test-'));
  dirs.push(d);
  const source = new LocalStorage(path.join(d, 'source'));
  await source.put('demos/fictional.html', 'ä & <h1>Test</h1>');
  await source.put('invoices/test.pdf', Buffer.from([0, 255, 5]));
  await backupStorage(source, path.join(d, 'snapshot'));
  await exec(process.execPath, ['--import', 'tsx', script, 'restore-local', path.join(d, 'snapshot'), path.join(d, 'restored')]);
  expect(await readFile(path.join(d, 'restored/invoices/test.pdf'))).toEqual(Buffer.from([0, 255, 5]));
  await expect(
    exec(process.execPath, ['--import', 'tsx', script, 'restore-local', path.join(d, 'snapshot'), path.join(d, 'restored')]),
  ).rejects.toThrow();
  expect(await readFile(path.join(d, 'restored/demos/fictional.html'), 'utf8')).toBe('ä & <h1>Test</h1>');
});
it('rejects corruption before creating a restore destination', async () => {
  const d = await mkdtemp(path.join(os.tmpdir(), 'storage-cli-test-'));
  dirs.push(d);
  const source = new LocalStorage(path.join(d, 'source'));
  await source.put('demos/test.html', 'original');
  const m = await backupStorage(source, path.join(d, 'snapshot'));
  await writeFile(path.join(d, 'snapshot', m.entries[0]!.file), 'changed');
  await expect(
    exec(process.execPath, ['--import', 'tsx', script, 'restore-local', path.join(d, 'snapshot'), path.join(d, 'restored')]),
  ).rejects.toThrow();
  await expect(access(path.join(d, 'restored'))).rejects.toThrow();
});
