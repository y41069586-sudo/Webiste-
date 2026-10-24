import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Page } from '@playwright/test';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32(s: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of s.toUpperCase()) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpNow(secret: string, offsetSteps = 0): string {
  const counter = Math.floor(Date.now() / 30000) + offsetSteps;
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', b32(secret)).update(msg).digest();
  const o = h[h.length - 1]! & 0xf;
  const code = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(code % 1_000_000).padStart(6, '0');
}

export function e2eState(): { email: string; password: string; secret: string } {
  return JSON.parse(readFileSync(path.join(os.tmpdir(), 'wbm-e2e-state.json'), 'utf8'));
}

let usedStep = 0;
/**
 * Meldet den Admin an (wartet ggf. auf den nächsten TOTP-Schritt – Replay-Schutz).
 * Wiederholt, falls der Dev-Server die Seite beim ersten Aufruf neu lädt.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const s = e2eState();
  for (let attempt = 0; attempt < 3; attempt++) {
    let step = Math.floor(Date.now() / 30000);
    if (step <= usedStep) {
      await page.waitForTimeout((usedStep + 1) * 30000 - Date.now() + 200);
      step = Math.floor(Date.now() / 30000);
    }
    usedStep = step;
    await page.goto('/login', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Anmelden' }).waitFor();
    await page.getByLabel('E-Mail').fill(s.email);
    await page.getByLabel('Passwort').fill(s.password);
    await page.getByLabel('2FA-Code').fill(totpNow(s.secret));
    await page.getByRole('button', { name: 'Anmelden' }).click();
    try {
      // Kalter Dev-Server kompiliert /admin beim ersten Aufruf – großzügig warten
      await page.waitForURL('**/admin', { timeout: 60_000 });
      return;
    } catch {
      // nächster Versuch mit neuem Code
    }
  }
  throw new Error('Admin-Anmeldung fehlgeschlagen');
}
