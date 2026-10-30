import { getProviders } from '../src/providers';
import { backupStorage, verifyStorageBackup } from '../src/services/storage-backup';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { LocalStorage } from '../src/providers/storage/local';

const mode = process.argv[2];
const directory = process.argv[3];
if (!directory || !['create', 'verify', 'restore-local'].includes(mode ?? ''))
  throw new Error(
    'Aufruf: backup-storage.ts create|verify|restore-local /privater/absoluter/sicherungspfad [lokales Restore-Ziel]',
  );
if (!directory.startsWith('/')) throw new Error('Privaten absoluten Zielpfad außerhalb öffentlicher Website-Dateien angeben.');
const result = mode === 'create' ? await backupStorage(getProviders().storage, directory) : await verifyStorageBackup(directory);
if (mode === 'restore-local') {
  const target = process.argv[4];
  if (!target?.startsWith('/') || path.resolve(target) === path.resolve(directory))
    throw new Error('Getrenntes lokales Restore-Ziel erforderlich.');
  await mkdir(target, { mode: 0o700 }); // Fail on an existing destination; never overwrite customer files.
  const storage = new LocalStorage(target);
  for (const entry of result.entries) {
    const data = await readFile(path.join(directory, entry.file));
    await storage.put(entry.key, data);
    const restored = await storage.get(entry.key);
    if (!restored?.equals(data)) throw new Error('Lokaler Storage-Restore stimmt nicht überein.');
  }
}
console.log(
  JSON.stringify({
    status: 'verified',
    objects: result.entries.length,
    restoredLocally: mode === 'restore-local',
    at: result.at,
    notice: 'Kein Datenbank-Restore und kein Produktions-Abnahmenachweis.',
  }),
);
