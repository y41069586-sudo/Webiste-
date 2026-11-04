import { describe, expect, it } from 'vitest';
import { KITS, kitFor, renderSite, slopFindingsForPage } from '../src';
import { sampleContent as raw, sampleFacts } from './fixtures';

// Kits prüfen das Layout; der Beispieltext wird von Gedankenstrichen befreit (die prüft der Textfilter separat)
const clean = (t: string) => t.replace(/\s[–—]\s/g, '. ');
const sampleContent = {
  ...raw,
  hero_subline: clean(raw.hero_subline),
  about: clean(raw.about),
  faq: raw.faq.map((f) => ({ q: f.q, a: clean(f.a) })),
};

const demo = {
  slug: 'abcdefghijklmnopqrstuvwx',
  priceLabel: '597 €',
  checkoutUrl: '/x',
  questionUrl: '/y',
  optOutUrl: '/z',
  expiresLabel: 'am 4.12.2026',
  sender: {
    name: 'a',
    company: 'SeitenWerk',
    street: 'b',
    postalCode: '1',
    city: 'c',
    email: 'x@y.de',
    phone: '1',
    imprintUrl: '/i',
    privacyUrl: '/p',
  },
};

describe('Gestaltungs-Kits (04.11.2026)', () => {
  it('jedes Gewerk bekommt sein eigenes Kit', () => {
    expect(kitFor('handwerk', 'Malerbetrieb')?.id).toBe('kit-maler');
    expect(kitFor('handwerk', 'Fliesenleger')?.id).toBe('kit-fliesen');
    expect(kitFor('handwerk', 'Elektriker')?.id).toBe('kit-elektro');
    expect(kitFor('handwerk', 'Gartenbau')?.id).toBe('kit-reinigung');
    expect(kitFor('beauty', 'Friseur')?.id).toBe('kit-beauty');
    expect(kitFor('gastronomie', 'Café')?.id).toBe('kit-gastro');
    expect(kitFor('einzelhandel', 'Blumen')).toBeNull();
  });

  for (const kit of KITS)
    for (const variant of Object.keys(kit.variants)) {
      it(`${kit.id}/${variant}: keine KI-Muster, eigener Aufbau, Platzhalter nur im Entwurf`, () => {
        const facts = { ...sampleFacts, group: kit.group };
        const html = renderSite({ templateId: kit.id, palette: variant, mode: 'demo', content: sampleContent, facts, demo });
        expect(slopFindingsForPage(html)).toEqual([]);
        expect(html).toContain(`data-kit="${kit.id}"`);
        expect(html).toContain('noindex');

        const live = renderSite({
          templateId: kit.id,
          palette: variant,
          mode: 'live',
          content: sampleContent,
          facts,
          live: { formAction: '/api/forms/x', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' },
        });
        for (const draftOnly of [
          'Hier steht Ihr Foto',
          'Beispielablauf',
          'Ihre Projekte',
          'Symbolbild',
          'Preis folgt',
          'Beispielplan',
        ])
          expect(live, draftOnly).not.toContain(draftOnly);
        expect(slopFindingsForPage(live)).toEqual([]);
      });
    }

  it('Kits unterscheiden sich im Aufbau, nicht nur in der Farbe', () => {
    const shapes = KITS.map((kit) => {
      const html = renderSite({
        templateId: kit.id,
        palette: Object.keys(kit.variants)[0]!,
        mode: 'demo',
        content: sampleContent,
        facts: { ...sampleFacts, group: kit.group },
        demo,
      });
      const main = html.match(/<main[\s\S]*<\/main>/)![0];
      return [...main.matchAll(/class="(k-[a-z-]+)/g)].map((m) => m[1]).join(' ');
    });
    expect(new Set(shapes).size).toBe(KITS.length);
  });
});
