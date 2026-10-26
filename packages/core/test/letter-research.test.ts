import { expect, it } from 'vitest';
import { personalizedLetterCopy, type VerifiedLetterContext } from '../src/letters/personalization';
const base: VerifiedLetterContext = {
  businessName: 'Fiktiver Betrieb',
  city: 'Testort',
  branchLabel: 'Elektrobetrieb',
  details: [{ text: 'Elektroinstallation', source: 'fixture:review', verified: true }],
};
const research: VerifiedLetterContext['details'][number] = {
  kind: 'website_search',
  text: 'not_found',
  source: 'fixture:search',
  verified: true,
  checkedAt: new Date().toISOString(),
  checks: ['name_city_search', 'directory_links', 'social_links'],
};
it('does not claim research merely because ordinary services or missing website tags exist', () => {
  expect(personalizedLetterCopy(base).researchOpening).toBeUndefined();
});
it('uses a qualified search result only with a recent complete reviewed search', () => {
  const copy = personalizedLetterCopy({ ...base, details: [research, ...base.details] });
  expect(copy.researchOpening).toContain('Bei unserer Recherche');
  expect(copy.researchOpening).toContain('keinen eigenen Webauftritt gefunden');
  expect(copy.intro[0]).toContain('Elektroinstallation');
  expect(copy.intro.join()).not.toMatch(/garantiert|mehr Kunden|mehr Leads/);
});
it.each([
  { ...research, checks: ['directory_links'] as const },
  { ...research, checkedAt: '2020-01-01T00:00:00Z' },
  { ...research, text: 'found' },
])('blocks incomplete, stale or contrary website research', (fact) => {
  expect(() =>
    personalizedLetterCopy({
      ...base,
      details: [{ ...fact, checks: fact.checks ? [...fact.checks] : undefined }, ...base.details],
    }),
  ).toThrow(/Recherche|Prüftermin|prüfen/);
});
it('a reviewed public observation is distinct from a generic sector assumption', () => {
  const copy = personalizedLetterCopy({
    ...base,
    details: [
      {
        kind: 'public_observation',
        text: 'Ihr öffentlicher Eintrag nennt Elektroinstallation',
        verified: true,
        source: 'fixture:listing',
        checkedAt: new Date().toISOString(),
      },
      ...base.details,
    ],
  });
  expect(copy.researchOpening).toContain('Ihr öffentlicher Eintrag nennt Elektroinstallation');
});
it('rejects a guarantee disguised as a research fact', () => {
  expect(() =>
    personalizedLetterCopy({
      ...base,
      details: [{ ...research, kind: 'public_observation', text: 'Wir versichern Ihnen mehr Kunden' }],
    }),
  ).toThrow(/prüfen/);
});
