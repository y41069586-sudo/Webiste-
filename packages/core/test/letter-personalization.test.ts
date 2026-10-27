import { expect, it } from 'vitest';
import { letterBranchBenefit } from '../src/letters/personalization';
import { composeLetter, recipientLines, type ComposeInput } from '../src/letters/compose';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { v4LetterVariant } from '../src/letters/conversion-v4';

it.each(['Malerbetrieb', 'Friseursalon', 'Garten- und Landschaftsbau', 'Reinigungsunternehmen', 'Sanitärbetrieb'])(
  '%s has a truthful preview benefit and no invented performance promises',
  (branch) => {
    const benefit = letterBranchBenefit(branch);
    expect(benefit).toMatch(/könnten/);
    expect(benefit).not.toMatch(/garantiert|verdoppeln|verlieren|Kunden begeistert|Notdienst/);
  },
);
it('keeps verified recipient facts and resolves branch context through the existing composer', () => {
  const input: ComposeInput = {
    cfg: DEFAULT_CONFIG,
    variant: v4LetterVariant('handwerk', 'B'),
    branchLabel: 'Garten- und Landschaftsbau',
    recipient: { businessName: 'Gärten & Co', street: 'Testweg', houseNumber: '1', postalCode: '12345', city: 'Teststadt' },
    domain: null,
    rating: null,
    compositeDataUri: null,
    qrDataUri: 'data:image/png;base64,',
    shortUrl: 'example.test/x',
    dateLine: '25. Oktober 2026',
    privacyNotice: 'Fiktiv',
    objectionNotice: 'Test',
    priceLabel: '597 €',
    expiresLabel: '25. November 2026',
  };
  const letter = composeLetter(input);
  expect(letter.subject).toContain('Gärten & Co');
  expect(letter.greeting).toBe('Guten Tag, liebes Team von Gärten & Co,');
  expect(letter.intro.join(' ')).toContain('Garten- und Landschaftsbau');
  expect(letter.copyEvidence?.level).toBe('basic');
  expect(JSON.stringify(letter)).not.toMatch(/\{branch_benefit\}|Malerleistungen|Gesichtsbehandlungen/);
});

it('preserves every recipient word and blocks addresses that cannot fit the window', () => {
  const recipient = {
    businessName: 'Fiktive Garten und Landschaftsgestaltung Muster Partner GmbH und Co KG',
    street: 'Testweg',
    houseNumber: '3',
    postalCode: '12345',
    city: 'Teststadt',
  };
  const lines = recipientLines(recipient);
  expect(lines.join(' ')).toContain(recipient.businessName);
  expect(lines.length).toBeLessThanOrEqual(5);
  expect(lines.join(' ')).not.toContain('…');
  expect(() => recipientLines({ ...recipient, businessName: 'SehrlangerFirmenname'.repeat(8) })).toThrow(/manuelle/);
  expect(() =>
    recipientLines({ ...recipient, street: 'Eine besonders lange Straße mit einem nicht kürzbaren Namen'.repeat(2) }),
  ).toThrow(/manuelle/);
  expect(() => recipientLines({ ...recipient, businessName: '' })).toThrow(/Firmenname/);
});
