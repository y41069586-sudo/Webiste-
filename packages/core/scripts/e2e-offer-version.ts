import { updateConfig } from '../src/config/service';
import { closeDb } from '../src/db/client';

const url = new URL(process.env.DATABASE_URL ?? 'http://invalid');
if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || !/e2e/.test(url.pathname))
  throw new Error('Angebots-Fixtures dürfen ausschließlich eine lokale E2E-Datenbank ändern.');
const version = process.argv[2];
if (version !== 'v4' && version !== 'legacy') throw new Error('Unbekannte Angebotsversion');
try {
  await updateConfig(
    {
      offers: { activeVersion: version },
      ...(process.env.E2E_TRUST_FIXTURE === '1'
        ? {
            sender: {
              name: 'Erika Testanbieterin',
              company: 'SeitenWerk – fiktiver Testanbieter',
              street: 'Fiktiver Anbieterweg 1',
              postalCode: '12345',
              city: 'Teststadt',
              email: 'support@seitenwerk.example.test',
              phone: '030 0000000',
              whatsappNumber: '',
              intro: 'Fiktive Anbieterangaben für den isolierten Kaufstreckentest.',
            },
            checkout: { paymentMethods: ['card'] },
          }
        : {}),
    },
    'e2e:fixture',
  );
} finally {
  await closeDb();
}
