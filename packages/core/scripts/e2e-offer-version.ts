import { updateConfig } from '../src/config/service';
import { closeDb } from '../src/db/client';

const url = new URL(process.env.DATABASE_URL ?? 'http://invalid');
if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || !/e2e/.test(url.pathname))
  throw new Error('Angebots-Fixtures dürfen ausschließlich eine lokale E2E-Datenbank ändern.');
const version = process.argv[2];
if (version !== 'v4' && version !== 'legacy') throw new Error('Unbekannte Angebotsversion');
try {
  await updateConfig({ offers: { activeVersion: version } }, 'e2e:fixture');
} finally {
  await closeDb();
}
