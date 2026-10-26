import { expect, it, afterAll } from 'vitest';
import { previewInvitationCopy, PREVIEW_LETTER_VERSION, type VerifiedLetterContext } from '../src/letters/personalization';
import { composeLetter, placeholderValues, letterTruthBlocklist, type ComposeInput } from '../src/letters/compose';
import { DEFAULT_CONFIG, deepMerge } from '../src/config/settings';
import { v4LetterVariant } from '../src/letters/conversion-v4';
import { checkLetterTruth } from '../src/letters/truth-check';
function context(branch = 'Malerbetrieb', details = ['Innenanstriche']): VerifiedLetterContext {
  return {
    businessName: 'Fiktiver Testbetrieb',
    city: 'Teststadt',
    branchLabel: branch,
    details: details.map((text) => ({ text, verified: true, source: 'fixture:review' })),
  };
}
function input(c = context()): ComposeInput {
  return {
    cfg: deepMerge(DEFAULT_CONFIG, { offers: { activeVersion: 'v4' } }),
    variant: v4LetterVariant('handwerk', 'A'),
    recipient: { businessName: c.businessName, street: 'Testweg', houseNumber: '1', postalCode: '12345', city: c.city },
    branchLabel: c.branchLabel,
    personalization: c,
    domain: null,
    rating: null,
    compositeDataUri: null,
    qrDataUri: 'data:image/png;base64,',
    shortUrl: 'example.test/test',
    dateLine: '26. Oktober 2026',
    privacyNotice: 'Art. 14 DSGVO',
    objectionNotice: 'Art. 21 DSGVO',
    priceLabel: '597 €',
    expiresLabel: '26. November 2026',
  };
}
it('changes the meaning, headline and benefit for distinct verified offers within the same industry', () => {
  const c = context();
  const a = previewInvitationCopy({ ...c, details: [{ text: 'Kalkfarben', source: 'fixture:review', verified: true }] });
  const b = previewInvitationCopy({ ...c, details: [{ text: 'Fassaden', source: 'fixture:review', verified: true }] });
  const d = previewInvitationCopy({ ...c, details: [{ text: 'Lackierarbeiten', source: 'fixture:review', verified: true }] });
  expect(new Set([a.profile, b.profile, d.profile]).size).toBe(3);
  expect(new Set([a.subject, b.subject, d.subject]).size).toBe(3);
  expect(a.intro.join()).toContain('Kalkfarben');
  expect(b.intro.join()).not.toContain('Kalkfarben');
  expect(a.intro).not.toEqual(b.intro);
});
it('does not use unverified, source-free or price facts; basic fallback never invents research', () => {
  const c = context();
  c.details = [
    { text: 'Meisterbetrieb mit garantiert mehr Kunden', verified: false, source: 'guess' },
    { text: 'Photovoltaik', verified: true, source: '' },
    { text: 'Maniküre 30 Euro', verified: true, source: 'fixture:price' },
  ];
  const copy = previewInvitationCopy(c);
  expect(copy.level).toBe('basic');
  expect(copy.sources).toEqual([]);
  expect(JSON.stringify(copy)).not.toMatch(/Photovoltaik|Meister|30|Recherche|gefunden/);
});
it('filters prices in public observations too, instead of reproducing a price list', () => {
  const c = context();
  c.details = [
    {
      text: 'Preisliste ab 30 €',
      kind: 'public_observation',
      verified: true,
      checkedAt: new Date().toISOString(),
      source: 'fixture:source',
    },
  ];
  expect(previewInvitationCopy(c).sources).toEqual([]);
  expect(JSON.stringify(previewInvitationCopy(c))).not.toContain('30');
});
it('keeps noncommissioned/free-preview and future paid-order boundaries clear without any tariff', () => {
  const i = input();
  const d = composeLetter(i);
  expect(d.previewInvitation).toBe(true);
  expect(d.copyEvidence).toMatchObject({ version: PREVIEW_LETTER_VERSION, level: 'verified' });
  expect(d.offerSummary).toBeUndefined();
  expect(JSON.stringify(d)).not.toMatch(/\b(?:597|590|49|19|99)\s*€|Care\+|Monatsabrechnung|Mindestlaufzeit/);
  expect(d.intro.join()).toContain('kostenlos ansehen');
  expect(d.offer).toContain('nicht beauftragt');
  expect(d.offer).toContain('kostenpflichtig');
  expect(d.offer).toContain('vor jeder Bestellung');
  expect(d.privacyNotice).toBe(i.privacyNotice);
  expect(d.objectionNotice).toBe(i.objectionNotice);
  const truth = checkLetterTruth({
    letter: d,
    placeholderValues: placeholderValues(i),
    claims: [],
    claimSpans: [],
    allowedClaimIds: [],
    industry: null,
    sourcesLabel: 'example.test/quellen',
    extraBlocklist: letterTruthBlocklist(i.cfg),
  });
  expect(truth.violations).toEqual([]);
});
it('keeps claim text verbatim and follows the existing variant/footnote pipeline', () => {
  const i = input();
  i.claimTexts = ['Geprüfter Testclaim¹'];
  i.footnotes = ['¹ Testquelle'];
  const d = composeLetter(i);
  expect(d.intro.join()).toContain('Geprüfter Testclaim¹');
  expect(d.footnotes).toEqual(i.footnotes);
});
it('does not pretend a new enquiry or a revision on the first letter, but supports actual followup sequences', () => {
  const c = context();
  expect(previewInvitationCopy(c, 1).opening).not.toMatch(/erneut|überarbeitet|Gespräch/);
  expect(previewInvitationCopy(c, 2).opening).toContain('noch einmal');
  expect(previewInvitationCopy(c, 3).opening).toContain('überarbeitet');
});
it('rejects a cross-company fact context and stale source details', () => {
  const i = input();
  i.personalization = { ...i.personalization!, businessName: 'Andere Firma' };
  expect(() => composeLetter(i)).toThrow(/adressierten/);
  const c = context();
  c.details[0]!.checkedAt = '2020-01-01T00:00:00Z';
  expect(() => previewInvitationCopy(c)).toThrow(/Prüftermin/);
});
it('uses only a bounded subset of complete details and never clips an individual fact', () => {
  const c = context('Elektrobetrieb', ['Elektroinstallation', 'Lichtplanung', 'Kalkfarben']);
  const copy = previewInvitationCopy(c);
  expect(copy.sources).toHaveLength(2);
  expect(copy.sources.map((s) => s.text)).toEqual(['Elektroinstallation', 'Lichtplanung']);
  expect(copy.intro.join()).not.toContain('Kalkfarben');
});

it('leaves the complete V4 prices on the demo before any order', async () => {
  const { demoOptions } = await import('../src/demos/build');
  const d = demoOptions('fiktiver-test', input().cfg);
  const text = JSON.stringify(d.offers);
  expect(text).toContain('597');
  expect(text).toContain('19');
  expect(text).toContain('99');
  expect(text).toContain('Go-Live');
});

afterAll(async () => {
  await (await import('../src/render/browser')).closeBrowser();
});
it('keeps the formerly clipped medium-length company inside the actual rendered address window', async () => {
  const c = context();
  c.businessName = 'Malerei Fassade & Treppenhaus';
  const i = input(c);
  const data = composeLetter(i);
  const { renderLetterHtml } = await import('@wbm/templates');
  const { validateLetterDom } = await import('../src/render/pdf');
  const issues = await validateLetterDom(renderLetterHtml(data), 'left');
  expect(issues.filter((x) => /anschrift|fenster/i.test(x.check))).toEqual([]);
  expect(data.recipientLines.join(' ')).toContain(c.businessName);
});

it('also omits monetary German shorthand facts without a Euro symbol', () => {
  const c = context('Friseursalon', ['Haarschnitt ab 19', 'Färben 39,-']);
  const copy = previewInvitationCopy(c);
  expect(copy.level).toBe('basic');
  expect(copy.sources).toEqual([]);
});
