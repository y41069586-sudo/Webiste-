import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { LocalStorage } from '../src/providers/storage/local';
import {
  decryptBackup,
  encryptBackup,
  pruneOffsiteBackups,
  restoreOffsiteBackup,
  uploadOffsiteBackup,
} from '../src/services/offsite-backup';
import { backupStorage } from '../src/services/storage-backup';
const roots: string[] = [];
const secret = 'fixture-only-strong-key-012345678901234567890';
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'sw-backup-test-'));
  roots.push(root);
  return { root, storage: new LocalStorage(path.join(root, 'remote')) };
}
afterEach(async () => {
  for (const r of roots.splice(0)) await rm(r, { recursive: true, force: true });
});
it('downloads and decrypts the uploaded bytes, and restores to a new private local file', async () => {
  const { root, storage } = await fixture(),
    file = path.join(root, 'dump.tar.gz');
  const bytes = Buffer.from([0, 1, 2, 255, 41]);
  await writeFile(file, bytes);
  const receipt = await uploadOffsiteBackup(storage, file, secret);
  const encrypted = (await storage.get(receipt.remoteKey))!;
  expect(encrypted.equals(bytes)).toBe(false);
  const target = path.join(root, 'restored.tar.gz');
  await expect(restoreOffsiteBackup(storage, receipt.remoteKey, target, secret)).resolves.toMatchObject({
    restoredLocally: true,
    archiveSha256: receipt.archiveSha256,
  });
  expect(await readFile(target)).toEqual(bytes);
  expect((await stat(target)).mode & 0o777).toBe(0o600);
  await expect(restoreOffsiteBackup(storage, receipt.remoteKey, target, secret)).rejects.toThrow();
});
it('detects tampering, wrong keys and unreadable remote copies', async () => {
  const encrypted = encryptBackup(Buffer.from('private database'), secret);
  encrypted[encrypted.length - 1] = encrypted[encrypted.length - 1]! ^ 1;
  expect(() => decryptBackup(encrypted, secret)).toThrow();
  expect(() => decryptBackup(encryptBackup(Buffer.from('x'), secret), 'another-private-key-012345678901234567890')).toThrow();
  const { root, storage } = await fixture(),
    file = path.join(root, 'x');
  await writeFile(file, 'x');
  vi.spyOn(storage, 'get').mockResolvedValue(Buffer.from('corrupt'));
  await expect(uploadOffsiteBackup(storage, file, secret)).rejects.toThrow('zurückgelesen');
});
it('prunes only old valid snapshots within the reserved prefix, preserving at least two', async () => {
  const { storage } = await fixture();
  const keys = [1, 2, 3].map((d) => `backups/managed/2020-01-0${d}T02-15-00Z-00000000-0000-4000-8000-000000000000.swb`);
  for (const k of [...keys, 'backups/managed/operator-important.txt', 'invoices/old.pdf']) await storage.put(k, 'x');
  expect(await pruneOffsiteBackups(storage, 14, new Date('2026-10-31'))).toBe(1);
  expect(await storage.list('')).toEqual(
    expect.arrayContaining([keys[1], keys[2], 'backups/managed/operator-important.txt', 'invoices/old.pdf']),
  );
  expect(await storage.exists(keys[0]!)).toBe(false);
});
it('object snapshots exclude their own remote backup archives', async () => {
  const { root, storage } = await fixture();
  await storage.put('demos/a.html', 'html');
  await storage.put('backups/managed/older.swb', 'encrypted');
  const manifest = await backupStorage(storage, path.join(root, 'snapshot'));
  expect(manifest.entries.map((e) => e.key)).toEqual(['demos/a.html']);
});
