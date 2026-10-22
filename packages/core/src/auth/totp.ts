import { createHmac, randomBytes } from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error('Ungültiges Base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** HOTP nach RFC 4226 (HMAC-SHA1, 6 Stellen). */
export function hotp(secret: string, counter: number, digits = 6): string {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', key).update(msg).digest();
  const offset = h[h.length - 1]! & 0xf;
  const code =
    ((h[offset]! & 0x7f) << 24) | ((h[offset + 1]! & 0xff) << 16) | ((h[offset + 2]! & 0xff) << 8) | (h[offset + 3]! & 0xff);
  return String(code % 10 ** digits).padStart(digits, '0');
}

export function totpStep(now = Date.now(), period = 30): number {
  return Math.floor(now / 1000 / period);
}

export function totp(secret: string, now = Date.now()): string {
  return hotp(secret, totpStep(now));
}

/**
 * Prüft einen TOTP-Code (±1 Zeitschritt). Gibt den akzeptierten Zeitschritt zurück
 * oder null. `lastStep` verhindert die Wiederverwendung eines Codes (Replay).
 */
export function verifyTotp(secret: string, code: string, lastStep = 0, now = Date.now()): number | null {
  const c = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(c)) return null;
  const step = totpStep(now);
  for (const s of [step - 1, step, step + 1]) {
    if (s <= lastStep) continue;
    if (hotp(secret, s) === c) return s;
  }
  return null;
}

export function otpauthUrl(secret: string, account: string, issuer = 'Website-Brief-Maschine'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${label}?${params.toString()}`;
}
