import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider } from '../providers/types';

interface SnapshotEntry {
  key: string;
  file: string;
  bytes: number;
  sha256: string;
}
interface StorageSnapshot {
  version: 1;
  at: string;
  provider: string;
  entries: SnapshotEntry[];
}
const digest = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
// Reserved backup namespace: never recursively archive prior off-server snapshots.
export const OFFSITE_BACKUP_PREFIX = 'backups/managed/';
const sourceKeys = async (storage: StorageProvider) =>
  (await storage.list('')).filter((k) => !k.startsWith(OFFSITE_BACKUP_PREFIX));
/** Full private object snapshot. No remote PUT/DELETE; fail if the keyset changes during backup. */
export async function backupStorage(storage: StorageProvider, directory: string) {
  await mkdir(directory, { mode: 0o700 }); // An existing destination is never overwritten.
  const keys = await sourceKeys(storage);
  const entries: SnapshotEntry[] = [];
  for (const key of keys) {
    const data = await storage.get(key);
    if (!data) throw new Error('Storage-Sicherung unvollständig: Objekt fehlt.');
    const file = `${createHash('sha256').update(key).digest('hex')}.bin`;
    await writeFile(path.join(directory, file), data, { mode: 0o600, flag: 'wx' });
    entries.push({ key, file, bytes: data.length, sha256: digest(data) });
  }
  if (JSON.stringify(keys) !== JSON.stringify(await sourceKeys(storage)))
    throw new Error('Storage-Inhalt hat sich während der Sicherung geändert. Erneut bei pausierter Pipeline sichern.');
  const manifest: StorageSnapshot = { version: 1, at: new Date().toISOString(), provider: storage.name, entries };
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' });
  return verifyStorageBackup(directory);
}
export async function verifyStorageBackup(directory: string) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')) as StorageSnapshot;
  if (manifest.version !== 1 || !Array.isArray(manifest.entries)) throw new Error('Ungültiges Storage-Manifest.');
  const keys = new Set<string>();
  for (const entry of manifest.entries) {
    if (!/^[a-f0-9]{64}\.bin$/.test(entry.file) || typeof entry.key !== 'string' || keys.has(entry.key))
      throw new Error('Ungültiger oder doppelter Sicherungseintrag.');
    keys.add(entry.key);
    const data = await readFile(path.join(directory, entry.file));
    if (data.length !== entry.bytes || digest(data) !== entry.sha256)
      throw new Error('Prüfsumme der Storage-Sicherung stimmt nicht.');
  }
  return manifest;
}
