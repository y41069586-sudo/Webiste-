import { getProviders } from '../src/providers';
import { backupStorage, verifyStorageBackup } from '../src/services/storage-backup';

const mode = process.argv[2];
const directory = process.argv[3];
if (!directory || !['create', 'verify'].includes(mode ?? ''))
  throw new Error('Aufruf: backup-storage.ts create|verify /privater/absoluter/sicherungspfad');
if (!directory.startsWith('/')) throw new Error('Privaten absoluten Zielpfad außerhalb öffentlicher Website-Dateien angeben.');
const result = mode === 'verify' ? await verifyStorageBackup(directory) : await backupStorage(getProviders().storage, directory);
console.log(
  JSON.stringify({
    status: 'verified',
    objects: result.entries.length,
    at: result.at,
    notice: 'Kein Datenbank-Restore und kein Produktions-Abnahmenachweis.',
  }),
);
