/**
 * Muster der Standardvorlage 4 (16.11.2026) als PDF, ohne Datenbank: echte Layoutprüfung (DOM + PDF) und
 * deterministischer Wahrheits-Check. Aufruf:
 *   pnpm --filter @wbm/core exec tsx scripts/letter-standard4-sample.ts <ausgabe.pdf> [desktop.jpg] [mobil.jpg]
 * Ohne Bilder werden graue Platzhalter verwendet.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { returnAddressLine } from '@wbm/templates';
import { DEFAULT_CONFIG } from '../src/config/settings';
import {
  composeLetter,
  letterTruthBlocklist,
  placeholderValues,
  recipientLines,
  type ComposeInput,
} from '../src/letters/compose';
import { standard4ObjectionNotice, standard4PrivacyNotice } from '../src/letters/standard4';
import { v4LetterVariant } from '../src/letters/conversion-v4';
import { checkLetterTruth } from '../src/letters/truth-check';
import { closeBrowser, htmlToPdf, validateLetterPdf } from '../src/render';
import { fitLetterLayout } from '../src/render/letter';
import QRCode from 'qrcode';

const [out, deskPath, mobPath] = process.argv.slice(2);
if (!out) throw new Error('Ausgabedatei fehlt');
const grey =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844"><rect width="100%" height="100%" fill="#9aa4b1"/></svg>',
  ).toString('base64');
const img = (p?: string) => (p ? `data:image/jpeg;base64,${readFileSync(p).toString('base64')}` : grey);

const cfg = structuredClone(DEFAULT_CONFIG);
cfg.offers.activeVersion = 'v4';
// Design wählbar: LETTER_DESIGN=standard-4 oder standard-5 (Standard)
cfg.letter.design = process.env.LETTER_DESIGN === 'standard-4' ? 'standard-4' : 'standard-5';
cfg.sender = {
  ...cfg.sender,
  name: 'Doaa Attia',
  company: 'SeitenWerk',
  street: 'Wilhelm-Diess-Weg 3a',
  postalCode: '94081',
  city: 'Fürstenzell',
  email: 'support@seitenwerk.world',
  website: 'seitenwerk.world',
  phone: '',
  whatsappNumber: '',
};
const input: ComposeInput = {
  variant: v4LetterVariant('handwerk', 'A'),
  cfg,
  sequence: 1,
  design: cfg.letter.design,
  recipient: { businessName: 'Müller', street: 'Jobs-Böse-Straße', houseNumber: '7', postalCode: '37085', city: 'Göttingen' },
  branchLabel: 'Dachdecker',
  industry: 'handwerk',
  personalization: { businessName: 'Müller', city: 'Göttingen', branchLabel: 'Dachdecker', details: [] },
  recipientPhone: '0551 793785',
  listedWithoutWebsite: true,
  domain: null,
  rating: null,
  compositeDataUri: null,
  desktopScreenshotDataUri: img(deskPath),
  mobileDataUri: img(mobPath),
  qrDataUri: await QRCode.toDataURL('https://seitenwerk.world/k7m2xq', { errorCorrectionLevel: 'M', margin: 4, width: 600 }),
  shortUrl: 'seitenwerk.world/k7m2xq',
  expiresLabel: '17. Dezember 2026',
  dateLine: 'Fürstenzell, 17. November 2026',
  privacyNotice: standard4PrivacyNotice(cfg, 'osm', 'https://seitenwerk.world/datenschutz'),
  objectionNotice: standard4ObjectionNotice('widerspruch@seitenwerk.world'),
  priceLabel: '597 €',
};
const data = composeLetter(input);
const { html, domIssues } = await fitLetterLayout(data, cfg);
const pdf = await htmlToPdf(html);
const check = await validateLetterPdf(pdf, {
  recipientLines: recipientLines(input.recipient),
  position: 'left',
  expectedPages: 1,
  returnAddressLine: returnAddressLine(data.sender),
});
const truth = checkLetterTruth({
  letter: data,
  claimSpans: [],
  claims: [],
  allowedClaimIds: [],
  industry: 'handwerk',
  placeholderValues: placeholderValues(input),
  sourcesLabel: 'seitenwerk.world/quellen',
  extraBlocklist: letterTruthBlocklist(cfg),
});
writeFileSync(out, pdf);
console.log(
  JSON.stringify(
    {
      compact: data.compact === true,
      postscript: Boolean(data.postscript),
      dom: domIssues,
      pdf: check.issues,
      truth: truth.violations,
    },
    null,
    1,
  ),
);
await closeBrowser();
