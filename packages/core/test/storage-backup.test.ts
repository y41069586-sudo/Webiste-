import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalStorage } from '../src/providers/storage/local';
import { backupStorage, verifyStorageBackup } from '../src/services/storage-backup';

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});
describe('Private Storage-Sicherung', () => {
  it('PDF/HTML binär sichern, Prüfsummen prüfen und in getrennten lokalen Speicher zurücklesen', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'seitenwerk-backup-test-'));
    dirs.push(dir);
    const source = new LocalStorage(path.join(dir, 'source'));
    const target = new LocalStorage(path.join(dir, 'restore'));
    await source.put('invoices/fictional.pdf', Buffer.from([0, 255, 1, 2]));
    await source.put('demos/fixture.html', '<h1>Fiktiver Entwurf</h1>');
    const manifest = await backupStorage(source, path.join(dir, 'snapshot'));
    expect(manifest.entries).toHaveLength(2);
    for (const entry of manifest.entries) await target.put(entry.key, await readFile(path.join(dir, 'snapshot', entry.file)));
    for (const key of await source.list('')) expect(await target.get(key)).toEqual(await source.get(key));
    await writeFile(path.join(dir, 'snapshot', manifest.entries[0]!.file), 'kaputt');
    await expect(verifyStorageBackup(path.join(dir, 'snapshot'))).rejects.toThrow(/Prüfsumme/);
  });
});
