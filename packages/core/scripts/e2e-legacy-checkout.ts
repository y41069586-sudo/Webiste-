/** Fixture for existing customers still completing the original post-payment onboarding. No public bypass. */
import { closeDb } from '../src/db/client';
import { startHostedCheckout } from '../src/services/orders';
const target = new URL(process.env.DATABASE_URL ?? 'http://invalid');
if (
  !['localhost', '127.0.0.1', '::1'].includes(target.hostname) ||
  !/e2e/.test(target.pathname) ||
  ['LLM_PROVIDER', 'PAYMENT_PROVIDER', 'EMAIL_PROVIDER', 'MAIL_PROVIDER', 'REGISTRAR_PROVIDER', 'HOSTING_PROVIDER'].some(
    (k) => process.env[k] !== 'mock',
  )
)
  throw new Error('Bestandskunden-Fixture nur lokal mit isolierter E2E-Datenbank und Mock-Providern.');
try {
  const result = await startHostedCheckout(process.argv[2] ?? '', 'one_time', {
    ua: 'fixture',
    ipHash: 'fixture-legacy',
    isBot: false,
  });
  if (!result.ok) throw new Error(result.error);
  process.stdout.write(JSON.stringify({ url: result.url }));
} finally {
  await closeDb();
}
