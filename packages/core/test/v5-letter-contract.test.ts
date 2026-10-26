import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { composeLetter, letterTruthBlocklist, placeholderValues, type ComposeInput } from '../src/letters/compose';
import { V4_LETTER_INDUSTRIES, v4LetterVariant } from '../src/letters/conversion-v4';
import { checkLetterTruth } from '../src/letters/truth-check';
import { LETTER_VARIANT_A } from '../src/letters/variants';
import { legalDrafts } from '../../../apps/web/src/lib/legal-drafts';

const cfg = { ...DEFAULT_CONFIG, offers: { ...DEFAULT_CONFIG.offers, activeVersion: 'v4' as const } };
function truth(variant: ComposeInput['variant'], branchLabel?: string) {
  const input: ComposeInput = {
    cfg,
    variant,
    branchLabel,
    recipient: {
      businessName: 'Fiktiver Betrieb',
      street: 'Musterweg',
      houseNumber: '1',
      postalCode: '12345',
      city: 'Musterstadt',
    },
    domain: null,
    rating: null,
    compositeDataUri: null,
    qrDataUri: 'data:image/png;base64,',
    shortUrl: 'example.test/t/fictional',
    dateLine: '25. Oktober 2026',
    privacyNotice: 'Test',
    objectionNotice: 'Test',
    priceLabel: '597 €',
    expiresLabel: '25. November 2026',
  };
  const letter = composeLetter(input);
  return {
    letter,
    check: checkLetterTruth({
      letter,
      placeholderValues: placeholderValues(input),
      claimSpans: [],
      claims: [],
      allowedClaimIds: [],
      industry: null,
      sourcesLabel: 'example.test/quellen',
      extraBlocklist: letterTruthBlocklist(cfg),
    }),
  };
}
describe('V5: tatsächliche V4-Brief- und Vertragsbedingungen', () => {
  it.each(V4_LETTER_INDUSTRIES)(
    '%s: alle drei Kandidaten bestehen den vollständigen deterministischen Wahrheitscheck',
    (industry) => {
      for (const arm of ['A', 'B', 'C'] as const) {
        const { letter, check } = truth(v4LetterVariant(industry, arm));
        expect(check.violations).toEqual([]);
        expect(letter.offer).toContain('597 €');
        expect(letter.offer).toContain('insgesamt 99');
        expect(letter.offer).toContain('bestätigtem Go-Live');
        expect(JSON.stringify(letter)).not.toMatch(/fertige Website|Sie ist fertig|12 Monate Mindestlaufzeit/);
      }
    },
  );
  it.each(['Malerbetrieb', 'Friseursalon', 'Garten- und Landschaftsbau', 'Reinigungsunternehmen', 'Sanitärbetrieb'])(
    '%s: personalisierte A/B/C bleiben wahrheitsgemäße Vorschauangebote',
    (label) => {
      for (const arm of ['A', 'B', 'C'] as const) {
        const { check } = truth(v4LetterVariant(label === 'Friseursalon' ? 'beauty' : 'handwerk', arm), label);
        expect(check.violations).toEqual([]);
      }
    },
  );
  it('alte gespeicherte Fertig-Versprechen bleiben gesperrt statt still überschrieben', () => {
    expect(truth(LETTER_VARIANT_A).check.violations.some((v) => v.rule === 'blocklist' && /fertig/i.test(v.detail))).toBe(true);
  });
  it('V4-AGB-Entwurf nennt Pflicht-Monatstarif, wirklichen Abostart und Einrichtungsgarantie ohne Legacy-Bindung', () => {
    const text = legalDrafts(cfg).termsMarkdown.replace(/\u00a0/g, ' ');
    expect(text).toContain('dazu insgesamt 99 €/Monat');
    expect(text).toContain('erst nach dem tatsächlich bestätigten Go-Live');
    expect(text).toContain('monatlich zum Ende des laufenden Abrechnungszeitraums kündbar');
    expect(text).toContain('Einrichtungsgebühr wird erstattet');
    expect(text).not.toContain('erste Rate bei Vertragsschluss');
    expect(text).not.toContain('spätestens der 14. Tag nach Zahlung');
    expect(text).toContain('rechtlichen Freigabe');
  });
});
