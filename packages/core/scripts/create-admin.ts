/**
 * Admin anlegen bzw. zurücksetzen:
 *   pnpm admin:create -- --email du@example.com
 * Das Passwort wird interaktiv abgefragt (oder via ADMIN_PASSWORD für Automatisierung).
 * Gibt einen QR-Code für die Authenticator-App (TOTP) im Terminal aus.
 */
import { createInterface } from 'node:readline/promises';
import QRCode from 'qrcode';
import { createAdmin } from '../src/auth/admin';
import { closeDb } from '../src/db/client';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const email = arg('email') ?? process.env.ADMIN_EMAIL ?? (await rl.question('Admin-E-Mail: '));
  const password = process.env.ADMIN_PASSWORD ?? (await rl.question('Passwort (min. 12 Zeichen): '));
  rl.close();
  const { otpauth, secret } = await createAdmin(email, password);
  console.log('\nAdmin angelegt. Richte jetzt die 2FA ein (Google Authenticator, 1Password, Aegis …):\n');
  console.log(await QRCode.toString(otpauth, { type: 'terminal', small: true }));
  console.log(`Manuelle Eingabe: ${secret}\n`);
  await closeDb();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await closeDb();
  process.exit(1);
});
