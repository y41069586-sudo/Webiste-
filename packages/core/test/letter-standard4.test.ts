import { afterAll, describe, expect, it } from 'vitest';
import QRCode from 'qrcode';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { composeLetter, placeholderValues, letterTruthBlocklist, usesStandard4, type ComposeInput } from '../src/letters/compose';
import { v4LetterVariant } from '../src/letters/conversion-v4';
import {
  STANDARD4_VERSION,
  standard4DisplayName,
  standard4FixedTexts,
  standard4ObjectionNotice,
  standard4PrivacyNotice,
} from '../src/letters/standard4';
import { checkLetterTruth, letterBodyText } from '../src/letters/truth-check';
import { closeBrowser, htmlToPdf } from '../src/render';
import { pdfTextItems } from '../src/render/pdf';
import { fitLetterLayout } from '../src/render/letter';

const grey = (w: number, h: number) =>
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#9aa4b1"/></svg>`,
  ).toString('base64');

function cfgV4() {
  const cfg = structuredClone(DEFAULT_CONFIG);
  cfg.offers.activeVersion = 'v4';
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
  return cfg;
}

async function input(over: Partial<ComposeInput> = {}): Promise<ComposeInput> {
  const cfg = cfgV4();
  return {
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
    desktopScreenshotDataUri: grey(1440, 900),
    mobileDataUri: grey(390, 844),
    qrDataUri: await QRCode.toDataURL('https://seitenwerk.world/k7m2xq', { errorCorrectionLevel: 'M', margin: 4, width: 600 }),
    shortUrl: 'seitenwerk.world/k7m2xq',
    expiresLabel: '17. Dezember 2026',
    dateLine: 'Fürstenzell, 17. November 2026',
    privacyNotice: standard4PrivacyNotice(cfg, 'osm', 'https://seitenwerk.world/datenschutz'),
    objectionNotice: standard4ObjectionNotice('widerspruch@seitenwerk.world'),
    priceLabel: '597 €',
    ...over,
  };
}

afterAll(async () => {
  await closeBrowser();
});

describe('Standardvorlage 4', () => {
  it('ist Standard für den V4-Erstbrief, nicht für Folgebriefe, Altangebot oder rechtes Anschriftenfeld', async () => {
    const i = await input();
    expect(DEFAULT_CONFIG.letter.design).toBe('standard-4');
    expect(usesStandard4(i)).toBe(true);
    expect(usesStandard4({ ...i, sequence: 2 })).toBe(false);
    expect(usesStandard4({ ...i, design: 'standard-3' })).toBe(false);
    const legacy = structuredClone(i.cfg);
    legacy.offers.activeVersion = 'legacy';
    expect(usesStandard4({ ...i, cfg: legacy })).toBe(false);
    const right = structuredClone(i.cfg);
    right.letter.addressPosition = 'right';
    expect(usesStandard4({ ...i, cfg: right })).toBe(false);
  });

  it('Betriebsname: einzelnes Wort bekommt die Branche, sonst bleibt der Name unverändert', () => {
    expect(standard4DisplayName('Müller', 'Dachdecker')).toBe('Dachdecker Müller');
    expect(standard4DisplayName('Elektro Uluca + Belzhause', 'Elektriker')).toBe('Elektro Uluca + Belzhause');
    expect(standard4DisplayName('Dachdeckerei', 'Dachdecker')).toBe('Dachdeckerei');
    expect(standard4DisplayName('Müller')).toBe('Müller');
  });

  it('nennt Entwurf, Grund und Kostenpflicht oben – ohne Preise, mit bestandenem Wahrheits-Check', async () => {
    const i = await input();
    const data = composeLetter(i);
    expect(data.standard4).toBeDefined();
    expect(data.copyEvidence?.version).toBe(STANDARD4_VERSION);
    expect(data.subject).toBe('Ich habe für Dachdecker Müller schon eine Website gebaut – als Entwurf zum Ansehen.');
    expect(data.standard4!.calm).toMatch(/Übernahme kostenpflichtig/);
    expect(data.intro.join(' ')).toMatch(/ohne Auftrag einen Entwurf/);
    expect(data.intro.join(' ')).toMatch(/öffentlichen Firmeneinträgen zu Ihrem Betrieb keine Website hinterlegt/);
    expect(data.intro.join(' ')).toContain('**0551 793785**');
    expect(data.standard4!.until).toContain('17. Dezember 2026');
    const body = letterBodyText(data);
    expect(body).not.toMatch(/€|\bEuro\b|Care\+|Basis|Komplett/);
    const truth = checkLetterTruth({
      letter: data,
      claimSpans: [],
      claims: [],
      allowedClaimIds: [],
      industry: 'handwerk',
      placeholderValues: placeholderValues(i),
      sourcesLabel: 'seitenwerk.world/quellen',
      extraBlocklist: letterTruthBlocklist(i.cfg),
    });
    expect(truth.violations).toEqual([]);
    expect(standard4FixedTexts(data)).toContain(data.standard4!.calm);
  });

  it('Grund nur mit Beleg; Telefonnummer nur, wenn übergeben', async () => {
    const recent = new Date(Date.now() - 86400000).toISOString();
    const withSearch = composeLetter(
      await input({
        listedWithoutWebsite: false,
        recipientPhone: null,
        personalization: {
          businessName: 'Müller',
          city: 'Göttingen',
          branchLabel: 'Dachdecker',
          details: [
            {
              text: 'not_found',
              source: 'Website-Recherche',
              verified: true,
              kind: 'website_search',
              checkedAt: recent,
              checks: ['name_city_search', 'directory_links', 'social_links'],
            },
          ],
        },
      }),
    );
    expect(withSearch.intro[0]).toMatch(/im Netz keine eigene Website von Ihnen gefunden/);
    expect(withSearch.intro[0]).not.toMatch(/Telefonnummer/);
    const without = composeLetter(await input({ listedWithoutWebsite: false }));
    expect(without.intro[0]).not.toMatch(/Ich schreibe Ihnen, weil/);
    expect(without.copyEvidence?.level).toBe('basic');
  });

  it('passt mit echter Layoutprüfung auf eine Seite: Fensterzone frei, QR ≥ 40 mm, Pflichttext ≥ 8 pt', async () => {
    const i = await input();
    const data = composeLetter(i);
    const { html, domIssues } = await fitLetterLayout(data, i.cfg);
    expect(domIssues).toEqual([]);
    expect(html).toContain('std4-page');
    const pdf = await htmlToPdf(html);
    const text = (await pdfTextItems(pdf)).items
      .map((t) => t.str)
      .join(' ')
      .replace(/\s+/g, ' ');
    expect(text).toMatch(/Übernahme kostenpflichtig/);
    expect(text).toMatch(/Dachdecker Müller/);
    expect(text).toMatch(/Art\. 14 DSGVO/);
    expect(text).toMatch(/Art\. 21 DSGVO/);
    expect(text).not.toMatch(/Sperrhash/);
  }, 60000);
});
