import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getEnv } from '../config/env';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;

/** URL-sicheres, zufälliges Token (Base62-ähnlich). */
export function randomToken(length = 24): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length * 2);
  let out = '';
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    const b = bytes[i]!;
    // Ablehnungs-Sampling gegen Modulo-Bias
    if (b < 256 - (256 % alphabet.length)) out += alphabet[b % alphabet.length];
  }
  return out.length === length ? out : randomToken(length);
}

export function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hmacSha256(key: string | Buffer, input: string | Buffer): string {
  return createHmac('sha256', key).update(input).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// --- Passwörter (scrypt, ohne native Abhängigkeiten) -----------------------
const SCRYPT_N = 2 ** 15;
const SCRYPT_PARAMS = { N: SCRYPT_N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize('NFKC'), salt, 64, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_N}$8$1$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts as [string, string, string, string, string, string];
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scryptAsync(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(key, expected);
}

// --- Symmetrische Verschlüsselung (AES-256-GCM) für TOTP-Secrets ----------
function encKey(): Buffer {
  const env = getEnv();
  const material = env.ENCRYPTION_KEY ?? env.SESSION_SECRET;
  return createHash('sha256').update(`wbm-enc:${material}`).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [v, ivB64, tagB64, dataB64] = payload.split('.');
  if (v !== 'v1' || !ivB64 || !tagB64 || !dataB64) throw new Error('Ungültiges Chiffrat');
  const decipher = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
