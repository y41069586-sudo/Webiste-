import { randomInt } from 'node:crypto';
import { getSetting, setSetting } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';
import { safeEqual, sha256 } from '../util/crypto';
import { audit } from './audit';

/**
 * Einrichtung des Worker-Servers ohne Geheimnisse im Chat oder im Repository: Die angemeldete Betreiberin erzeugt im
 * Admin einen Einmal-Code (30 Minuten gültig, nur einmal einlösbar). Das Einrichtungsskript auf dem Server tauscht ihn
 * bei der Admin-App gegen die Worker-Umgebung, die aus den Laufzeit-Variablen der App gebildet wird.
 */
const KEY = 'worker-bootstrap';
const TTL_MS = 30 * 60_000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface StoredCode {
  hash: string;
  expiresAt: string;
  usedAt: string | null;
}

/** Normalisiert die Eingabe (Groß-/Kleinschreibung, Bindestriche, Leerzeichen egal). */
function normalize(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function createWorkerBootstrapCode(actor: string, now = new Date(), db: DbOrTx = getDb()) {
  const raw = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  const expiresAt = new Date(now.getTime() + TTL_MS);
  await setSetting(KEY, { hash: sha256(raw), expiresAt: expiresAt.toISOString(), usedAt: null } satisfies StoredCode, actor, db);
  await audit(db, { entity: 'worker', entityId: 'bootstrap', action: 'code_created', actor, context: { expiresAt } });
  return { code: raw.match(/.{4}/g)!.join('-'), expiresAt };
}

/** true genau einmal für einen gültigen, nicht abgelaufenen Code; danach ist der Code verbraucht. */
export async function redeemWorkerBootstrapCode(code: string, now = new Date(), db: DbOrTx = getDb()): Promise<boolean> {
  const stored = await getSetting<StoredCode | null>(KEY, null, db);
  const input = normalize(code);
  if (!stored || stored.usedAt || input.length !== 12) return false;
  if (new Date(stored.expiresAt).getTime() < now.getTime()) return false;
  if (!safeEqual(sha256(input), stored.hash)) return false;
  await setSetting(KEY, { ...stored, usedAt: now.toISOString() }, 'worker:bootstrap', db);
  await audit(db, { entity: 'worker', entityId: 'bootstrap', action: 'code_redeemed', actor: 'worker:bootstrap' });
  return true;
}

/** Variablen, die der Worker von der App übernimmt (alles andere setzt docker-compose.worker.yml fest). */
const PASSTHROUGH = [
  'APP_URL',
  'DEMO_DOMAIN',
  'TRACK_DOMAIN',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'EMAIL_FROM',
  'EMAIL_API_KEY',
  'RESEND_API_KEY',
  'RESEND_WEBHOOK_SECRET',
  'RESEND_INBOUND_TO',
  'RESEND_INBOX_ID',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'LLM_PROVIDER',
  'ANTHROPIC_API_KEY',
  'MODEL_CREATIVE',
  'MODEL_BULK',
  'MODEL_ASSISTANT',
  'LEAD_SOURCE',
  'EMAIL_PROVIDER',
  'PAYMENT_PROVIDER',
  'MAIL_PROVIDER',
  'EASYNOVA_USERNAME',
  'EASYNOVA_PASSWORD',
  'EASYNOVA_MODE',
  'EASYNOVA_TEST_EMAIL',
  'REGISTRAR_PROVIDER',
  'HOSTING_PROVIDER',
  'DRY_RUN',
] as const;

/**
 * Supabase-Transaction-Pooler (6543) kann keine Queue betreiben; der Worker nutzt denselben Zugang über den
 * Session-Pooler (5432) desselben Hosts.
 */
export function sessionPoolerUrl(url: string): string {
  const u = new URL(url);
  if (u.hostname.endsWith('.pooler.supabase.com') && u.port === '6543') u.port = '5432';
  u.searchParams.delete('pgbouncer');
  return u.toString();
}

function quote(value: string): string {
  return /^[A-Za-z0-9_./:@%+=,-]*$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Inhalt der `.env.worker` aus der Laufzeitumgebung der App (ohne leere Werte). */
export function workerEnvFile(env: Record<string, string | undefined>): string {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL fehlt in der App-Umgebung.');
  const db = sessionPoolerUrl(env.DATABASE_URL);
  const lines = [
    '# Erzeugt durch die Admin-App (Einmal-Code). Nicht teilen, nicht committen. chmod 600.',
    `DATABASE_URL=${quote(db)}`,
    `QUEUE_DATABASE_URL=${quote(db)}`,
    'PUBLIC_PROTOCOL=https',
    'STORAGE_DRIVER=s3',
    // Öffentliche Overpass-Instanzen als Ausweich in Reihenfolge (Fair Use, docs/compliance-google.md)
    'OVERPASS_URL=https://overpass-api.de/api/interpreter,https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];
  for (const key of PASSTHROUGH) {
    const value = env[key];
    if (value !== undefined && value !== '') lines.push(`${key}=${quote(value)}`);
  }
  return `${lines.join('\n')}\n`;
}
