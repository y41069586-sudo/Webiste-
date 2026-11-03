import { readFile } from 'node:fs/promises';
import { setSetting } from '../src/config/service';
import { closeDb } from '../src/db/client';

/**
 * Hält einen vollständig geprüften Sicherungslauf für die App-Überwachung fest (Health/Watchdog).
 * Aufruf nur aus managed-scheduled.sh nach Restore- UND Offsite-Prüfung; liest deren Belege,
 * schreibt nur Status und Zeitstempel – keine Inhalte, Pfade oder Zugangsdaten.
 */
const [resultFile, receiptFile] = process.argv.slice(2);
try {
  const result = JSON.parse(await readFile(resultFile!, 'utf8')) as Record<string, unknown>;
  const receipt = JSON.parse(await readFile(receiptFile!, 'utf8')) as Record<string, unknown>;
  if (
    result.databaseRestoreVerified !== true ||
    result.contentFingerprintsMatch !== true ||
    !receipt ||
    typeof receipt !== 'object'
  )
    throw new Error();
  await setSetting(
    'backup_status',
    {
      status: 'ok',
      at: new Date().toISOString(),
      kind: 'managed-scheduled',
      storageRestoreVerified: result.storageRestoreVerified === true,
    },
    'system:backup',
  );
  console.log(JSON.stringify({ backupStatusRecorded: true }));
} catch {
  console.error(JSON.stringify({ backupStatusRecorded: false }));
  process.exitCode = 1;
} finally {
  await closeDb().catch(() => undefined);
}
