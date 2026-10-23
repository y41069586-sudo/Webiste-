import { afterAll, describe, expect, it } from 'vitest';
import { renderSite, TEMPLATES } from '@wbm/templates';
import { browserChecks, closeBrowser, validateHtml } from '../src/render';
import { libraryContent } from '../src/demos/library';

const fullFacts = {
  name: 'Studio Beispiel & Co',
  branchLabel: 'Kosmetikstudio',
  street: 'Kampstraße',
  houseNumber: '12a',
  postalCode: '44137',
  city: 'Dortmund',
  phone: '0231 123456',
  phoneHref: 'tel:+49231123456',
  openingLines: [
    { label: 'Montag – Freitag', value: '09:00 – 18:00 Uhr' },
    { label: 'Samstag', value: '10:00 – 14:00 Uhr' },
    { label: 'Sonntag', value: 'geschlossen' },
  ],
};
const minimalFacts = { ...fullFacts, name: 'Ein sehr langer Firmenname für Kosmetik, Wellness und Gesundheit', phone: null, phoneHref: null, openingLines: [] };

const sender = {
  name: 'Max Muster',
  company: 'Website-Brief',
  street: 'Musterstraße 1',
  postalCode: '44135',
  city: 'Dortmund',
  email: 'hallo@example.de',
  phone: '0231 000000',
  imprintUrl: 'https://app.example.de/impressum',
  privacyUrl: 'https://app.example.de/datenschutz',
};

describe('Alle Templates × Paletten: axe, HTML, Layout (volle und minimale Daten)', () => {
  afterAll(closeBrowser);
  for (const t of TEMPLATES) {
    for (const palette of t.palettes) {
      for (const [label, facts] of [['voll', fullFacts], ['minimal', minimalFacts]] as const) {
        it(`${t.id} / ${palette} / ${label}`, async () => {
          const content = libraryContent(t.group === 'beauty' ? 'kosmetikstudio' : 'elektriker', t.group, { name: facts.name, stadt: 'Dortmund', branche: facts.branchLabel }, 3);
          const html = renderSite({
            templateId: t.id,
            palette,
            mode: 'demo',
            content,
            facts: { ...facts, group: t.group },
            demo: {
              slug: 'abcdefghijklmnopqrstuvwx',
              priceLabel: '390 €',
              checkoutUrl: '/x',
              questionUrl: '/y',
              optOutUrl: '/z',
              expiresLabel: 'am 21.11.2026',
              sender,
            },
          });
          const checks = [await validateHtml(html), ...(await browserChecks({ html }))];
          const failed = checks.filter((c) => !c.passed);
          expect(failed, JSON.stringify(failed, null, 1)).toEqual([]);
        }, 60_000);
      }
    }
  }
});
