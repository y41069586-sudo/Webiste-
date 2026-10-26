import { afterAll, expect, it } from 'vitest';
import { renderLetterHtml } from '@wbm/templates';
import { composeLetter } from '../src/letters/compose';
import { v4LetterVariant } from '../src/letters/conversion-v4';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { qrDataUri } from '../src/render/letter';
import { htmlToPdf, validateLetterPdf } from '../src/render/pdf';
import { pdfQrTargets } from '../src/render/pdf-qr';
import { closeBrowser } from '../src/render/browser';
afterAll(closeBrowser);
it('decodes the QR in the final PDF and rejects a wrong expected demo target', async () => {
  const url = 'https://example.test/q/fictional-pdf-target';
  const letter = composeLetter({
    cfg: DEFAULT_CONFIG,
    variant: v4LetterVariant('handwerk', 'B'),
    branchLabel: 'Malerbetrieb',
    recipient: { businessName: 'Fiktiver Betrieb', street: 'Testweg', houseNumber: '1', postalCode: '12345', city: 'Teststadt' },
    domain: null,
    rating: null,
    compositeDataUri: null,
    qrDataUri: await qrDataUri(url),
    shortUrl: 'example.test/x',
    dateLine: '25. Oktober 2026',
    privacyNotice: 'Fiktive Testdaten',
    objectionNotice: 'Test',
    priceLabel: '597 €',
    expiresLabel: '25. November 2026',
  });
  const html = renderLetterHtml(letter),
    pdf = await htmlToPdf(html);
  expect(await pdfQrTargets(pdf)).toEqual([url]);
  const options = { recipientLines: letter.recipientLines, position: 'left' as const, expectedPages: 1 };
  expect((await validateLetterPdf(pdf, { ...options, qrExpectedUrl: url })).issues.filter((i) => i.check === 'qr-ziel')).toEqual(
    [],
  );
  expect(
    (await validateLetterPdf(pdf, { ...options, qrExpectedUrl: 'https://example.test/q/other' })).issues.some(
      (i) => i.check === 'qr-ziel',
    ),
  ).toBe(true);
  const noQr = await htmlToPdf(html.replace(/<img class="qr"[^>]*>/g, ''));
  expect((await validateLetterPdf(noQr, { ...options, qrExpectedUrl: url })).issues.some((i) => i.check === 'qr-ziel')).toBe(
    true,
  );
});
