import { getProviders } from '../src/providers';
import { uploadOffsiteBackup, restoreOffsiteBackup, pruneOffsiteBackups } from '../src/services/offsite-backup';
import { writeFile } from 'node:fs/promises';
const [mode, file, target] = process.argv.slice(2);
try {
  const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error();
  const storage = getProviders().storage;
  if (storage.name !== 's3' && process.env.LOCAL_BACKUP_ACCEPTANCE_TEST !== 'true') throw new Error();
  if (mode === 'upload' && file?.startsWith('/') && target?.startsWith('/')) {
    const receipt = await uploadOffsiteBackup(storage, file, secret);
    const pruned = await pruneOffsiteBackups(storage, Number(process.env.BACKUP_KEEP_DAYS || 14));
    await writeFile(target, JSON.stringify({ ...receipt, pruned }, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ offsiteVerified: true, encrypted: true, pruned }));
  } else if (mode === 'restore-local' && file && target?.startsWith('/')) {
    console.log(JSON.stringify(await restoreOffsiteBackup(storage, file, target, secret)));
  } else throw new Error();
} catch {
  console.error(
    JSON.stringify({
      stage: 'blocked',
      offsiteVerified: false,
      reason:
        'Externe Sicherung fehlgeschlagen; Speicher, privaten Schlüssel und lokale Dateien prüfen. Keine automatische Wiederherstellung der Quelldatenbank.',
    }),
  );
  process.exitCode = 1;
}
