/** Read-only, guarded local fictional invoice + existing approved letter composition. No providers. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { renderLetterHtml, renderInvoiceHtml, type InvoiceData } from '../packages/templates/src';
import { htmlToPdf, validateLetterPdf } from '../packages/core/src/render/pdf';
import { closeBrowser } from '../packages/core/src/render/browser';
import { getDb, closeDb } from '../packages/core/src/db/client';
import { composeLetter } from '../packages/core/src/letters/compose';
import { v4LetterVariant } from '../packages/core/src/letters/conversion-v4';
import { qrDataUri } from '../packages/core/src/render/letter';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
const target = new URL(process.env.DATABASE_URL ?? 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || !target.pathname.includes('task3_e2e'))
  throw Error('Only isolated task3 e2e database');
if (process.env.DRY_RUN !== 'true') throw Error('DRY_RUN required');
const out = 'data/exports/task3-checkout/brand-print';
mkdirSync(out, { recursive: true });
try {
  const fixture = JSON.parse(readFileSync('data/exports/task2-letters/fixtures/01.json', 'utf8'));
  const f = fixture.facts;
  const cfg = deepMerge(DEFAULT_CONFIG, {
    offers: { activeVersion: 'v4' },
    sender: {
      name: 'Erika Beispiel',
      company: 'SeitenWerk Testabsender',
      street: 'Beispielweg 1',
      postalCode: '12345',
      city: 'Testort',
      email: 'support@example.test',
      phone: '+493000000000',
      website: 'example.test',
    },
  });
  const data = {
    ...composeLetter({
      cfg,
      variant: v4LetterVariant('handwerk', 'A', 1),
      recipient: { businessName: f.name, street: f.street, houseNumber: f.houseNumber, postalCode: f.postalCode, city: f.city },
      branchLabel: f.branchLabel,
      domain: null,
      rating: null,
      compositeDataUri:
        'data:image/jpeg;base64,' + readFileSync('data/exports/task2-letters/fixtures/01-devices.jpg').toString('base64'),
      qrDataUri: await qrDataUri('http://127.0.0.1:3216/q/test-token-01'),
      shortUrl: '127.0.0.1:3216/s01',
      expiresLabel: '26. November 2026',
      dateLine: 'Testort, 26. Oktober 2026',
      privacyNotice: 'Fiktiver Musterbrief – kein Versand. Datenschutzangaben vor echtem Betrieb prüfen.',
      objectionNotice: 'Widerspruch jederzeit an support@example.test.',
      priceLabel: '597 €',
    }),
    ...JSON.parse(readFileSync('data/exports/task2-letters/refined/01-text.json', 'utf8')),
  };
  const html = renderLetterHtml(data);
  const pdf = await htmlToPdf(html);
  writeFileSync(`${out}/testbrief-logo.html`, html);
  writeFileSync(`${out}/testbrief-logo.pdf`, pdf);
  const check = await validateLetterPdf(pdf, {
    qrExpectedUrl: 'http://127.0.0.1:3216/q/test-token-01',
    recipientLines: data.recipientLines,
    position: 'left',
    expectedPages: 1,
  });
  writeFileSync(`${out}/letter-checks.json`, JSON.stringify(check, null, 2));
  const order = await getDb().query.orders.findFirst({ where: (o, { eq }) => eq(o.status, 'paid') });
  if (!order?.invoiceJson) throw Error('No fictional paid order/invoice');
  const invoice = renderInvoiceHtml(order.invoiceJson as InvoiceData);
  writeFileSync(`${out}/simulierte-rechnung.html`, invoice);
  writeFileSync(`${out}/simulierte-rechnung.pdf`, await htmlToPdf(invoice));
  for (const file of ['testbrief-logo', 'simulierte-rechnung'])
    execFileSync('pdftoppm', ['-png', '-scale-to', '1754', '-singlefile', `${out}/${file}.pdf`, `${out}/${file}`]);
  console.log('Fictional letter and mock invoice rendered; letter print checks:', check.issues.length === 0);
} finally {
  await closeBrowser();
  await closeDb();
}
