import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, randomUUID } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import type { StorageProvider } from '../providers/types';
import { OFFSITE_BACKUP_PREFIX } from './storage-backup';
const MAGIC = Buffer.from('SWB1');
const MAX_BYTES = 256 * 1024 * 1024;
function key(secret: string) {
  if (secret.length < 32 || /^(dev-|test-|example|placeholder)/i.test(secret))
    throw new Error('Privater Sicherungsschlüssel fehlt oder ist ungeeignet.');
  return Buffer.from(hkdfSync('sha256', secret, 'seitenwerk', 'managed-backup:v1', 32));
}
export function encryptBackup(data: Buffer, secret: string): Buffer {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  cipher.setAAD(MAGIC);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]);
}
export function decryptBackup(data: Buffer, secret: string): Buffer {
  if (data.length < 32 || !data.subarray(0, 4).equals(MAGIC)) throw new Error('Ungültiges Sicherungsformat.');
  const decipher = createDecipheriv('aes-256-gcm', key(secret), data.subarray(4, 16));
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(data.subarray(16, 32));
  return Buffer.concat([decipher.update(data.subarray(32)), decipher.final()]);
}
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const validKey = (k: string) => /^backups\/managed\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-[a-f0-9-]{36}\.swb$/.test(k);
/** Verify by downloading and decrypting before recording success or pruning older copies. */
export async function uploadOffsiteBackup(storage: StorageProvider, file: string, secret: string, now = new Date()) {
  if ((await stat(file)).size > MAX_BYTES)
    throw new Error('Sicherung größer als256MiB; Streaming-Sicherung erforderlich, keine stille Teilsicherung.');
  const archive = await readFile(file),
    payload = encryptBackup(archive, secret);
  const remoteKey = `${OFFSITE_BACKUP_PREFIX}${now.toISOString().slice(0, 19).replace(/:/g, '-')}Z-${randomUUID()}.swb`;
  await storage.put(remoteKey, payload, 'application/octet-stream');
  const copy = await storage.get(remoteKey);
  if (!copy || hash(copy) !== hash(payload) || hash(decryptBackup(copy, secret)) !== hash(archive))
    throw new Error('Externe Sicherung konnte nicht vollständig zurückgelesen werden.');
  return {
    remoteKey,
    archiveSha256: hash(archive),
    encryptedSha256: hash(payload),
    bytes: payload.length,
    at: now.toISOString(),
    offsiteVerified: true as const,
  };
}
export async function restoreOffsiteBackup(storage: StorageProvider, remoteKey: string, target: string, secret: string) {
  if (!validKey(remoteKey)) throw new Error('Ungültiger externer Sicherungsschlüssel.');
  const data = await storage.get(remoteKey);
  if (!data || data.length > MAX_BYTES + 32) throw new Error('Externe Sicherung fehlt oder überschreitet das Größenlimit.');
  const archive = decryptBackup(data, secret);
  await writeFile(target, archive, { flag: 'wx', mode: 0o600 });
  return { archiveSha256: hash(archive), restoredLocally: true };
}
/** Dedicated prefix only; preserve at least two snapshots even after a prolonged outage. */
export async function pruneOffsiteBackups(storage: StorageProvider, keepDays: number, now = new Date()) {
  if (!Number.isSafeInteger(keepDays) || keepDays < 7) throw new Error('Aufbewahrung mindestens7Tage.');
  const keys = (await storage.list(OFFSITE_BACKUP_PREFIX)).filter(validKey).sort().reverse();
  let removed = 0;
  for (const k of keys.slice(2)) {
    const stamp = k
      .slice(OFFSITE_BACKUP_PREFIX.length, OFFSITE_BACKUP_PREFIX.length + 20)
      .replace(/T(\d\d)-(\d\d)-(\d\d)Z$/, 'T$1:$2:$3Z');
    if (new Date(stamp).getTime() < now.getTime() - keepDays * 86400000) {
      await storage.delete(k);
      removed++;
    }
  }
  return removed;
}
