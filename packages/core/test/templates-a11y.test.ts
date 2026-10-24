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
const minimalFacts = {
  ...fullFacts,
  name: 'Ein sehr langer Firmenname für Kosmetik, Wellness und Gesundheit',
  phone: null,
  phoneHref: null,
  openingLines: [],
};

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
      for (const [label, facts] of [
        ['voll', fullFacts],
        ['minimal', minimalFacts],
      ] as const) {
        it(`${t.id} / ${palette} / ${label}`, async () => {
          const branchFor = {
            beauty: 'kosmetikstudio',
            handwerk: 'elektriker',
            gastronomie: 'cafe',
            einzelhandel: 'blumenladen',
            kurse: 'tanzschule',
          };
          const content = libraryContent(
            branchFor[t.group],
            t.group,
            { name: facts.name, stadt: 'Dortmund', branche: facts.branchLabel },
            3,
          );
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

describe('Branchen-Abschnitte (B3): axe, HTML, Layout; Live ohne Platzhalter', () => {
  afterAll(closeBrowser);
  const industries = ['gastronomie', 'handwerk', 'beauty', 'einzelhandel', 'kurse_training', 'dienstleistung'] as const;
  const render = (industry: (typeof industries)[number], mode: 'demo' | 'live') => {
    const t = TEMPLATES[0]!;
    return renderSite({
      templateId: t.id,
      palette: t.palettes[0]!,
      mode,
      content: libraryContent('elektriker', t.group, { name: fullFacts.name, stadt: 'Dortmund', branche: 'Betrieb' }, 1),
      facts: { ...fullFacts, group: t.group, industry },
      demo:
        mode === 'demo'
          ? {
              slug: 'abcdefghijklmnopqrstuvwx',
              priceLabel: '590 €',
              checkoutUrl: '/x',
              questionUrl: '/y',
              optOutUrl: '/z',
              expiresLabel: 'am 21.11.2026',
              sender,
            }
          : undefined,
      live:
        mode === 'live'
          ? { formAction: '/api/forms/x', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' }
          : undefined,
    });
  };
  for (const industry of industries) {
    it(`${industry}: Abschnitte im Entwurf sind barrierefrei`, async () => {
      const html = render(industry, 'demo');
      const checks = [await validateHtml(html), ...(await browserChecks({ html }))];
      const failed = checks.filter((c) => !c.passed);
      expect(failed, JSON.stringify(failed, null, 1)).toEqual([]);
    }, 60_000);
  }

  it('Demo zeigt den Aufhänger des Briefs, Live zeigt keine Platzhalter', () => {
    const g = render('gastronomie', 'demo');
    expect(g).toContain('id="speisekarte"');
    expect(g).toContain('Reservierungsanfrage');
    expect(g).toContain('Beispiel-Speisekarte');
    const h = render('handwerk', 'demo');
    expect(h).toContain('id="einzugsgebiet"');
    expect(h).toContain('Wir stellen ein');
    expect(render('beauty', 'demo')).toContain('Terminanfrage');
    expect(render('beauty', 'demo')).toContain('Preise auf Anfrage');
    expect(render('einzelhandel', 'demo')).toContain('Vorab reservieren');
    const k = render('kurse_training', 'demo');
    expect(k).toContain('id="kursplan"');
    expect(k).toContain('Probestunde anfragen');
    expect(render('dienstleistung', 'demo')).not.toContain('id="anfrage"');
    for (const i of industries) {
      const live = render(i, 'live');
      expect(live, i).not.toMatch(/Ihr Gericht|Platzhalter|id="speisekarte"|id="kursplan"|id="einzugsgebiet"/);
    }
    // Live: Branchenformular mit Zusatzfeld
    const liveG = render('gastronomie', 'live');
    expect(liveG).toContain('name="wunsch"');
    expect(liveG).toContain('value="Reservierungsanfrage"');
    expect(render('dienstleistung', 'live')).not.toContain('name="wunsch"');
  });
});
