/**
 * Betriebs-CLI im Worker-Container:
 *   docker compose exec worker node --import tsx src/cli.ts admin:create --email du@example.de
 *   docker compose exec worker node --import tsx src/cli.ts migrate
 *   docker compose exec worker node --import tsx src/cli.ts enqueue find-leads
 */
import { createInterface } from 'node:readline/promises';
import QRCode from 'qrcode';
import { appUrl, closeDb, createAdmin, enqueue, getEnv, getProviders, PingenMailProvider, runMigrations, seedDefaults, stopBoss, type QueueName } from '@wbm/core';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'migrate':
      await runMigrations();
      await seedDefaults();
      console.log('Migrationen ausgeführt.');
      break;
    case 'admin:create': {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const email = arg('email') ?? (await rl.question('Admin-E-Mail: '));
      const password = process.env.ADMIN_PASSWORD ?? (await rl.question('Passwort (min. 12 Zeichen): '));
      rl.close();
      const { otpauth, secret } = await createAdmin(email, password);
      console.log('\nAdmin angelegt. 2FA einrichten (Authenticator-App scannen):\n');
      console.log(await QRCode.toString(otpauth, { type: 'terminal', small: true }));
      console.log(`Manuelle Eingabe: ${secret}\n`);
      break;
    }
    case 'enqueue': {
      const queue = process.argv[3] as QueueName;
      const data = JSON.parse(arg('data') ?? '{"triggeredBy":"cli"}');
      const id = await enqueue(queue, data);
      console.log(`Job ${id} in ${queue} eingereiht.`);
      await stopBoss();
      break;
    }
    case 'pingen:webhooks': {
      const mail = getProviders().mail;
      if (!(mail instanceof PingenMailProvider)) throw new Error('MAIL_PROVIDER ist nicht pingen.');
      const secret = getEnv().PINGEN_WEBHOOK_SECRET;
      if (!secret) throw new Error('PINGEN_WEBHOOK_SECRET fehlt (20–32 Zeichen, z. B. openssl rand -hex 16).');
      const ids = await mail.registerWebhooks(appUrl('/api/webhooks/pingen'), secret);
      console.log(`Webhooks angelegt (${getEnv().PINGEN_ENV}): ${ids.join(', ')}`);
      break;
    }
    default:
      console.log('Befehle: migrate | admin:create [--email x] | enqueue <queue> [--data JSON] | pingen:webhooks');
  }
  await closeDb();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await closeDb();
  process.exit(1);
});
