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

describe('Kits: ehrliche Inhalte, Passung, Briefing (04.11.2026, Qualitätsauftrag)', () => {
  const live = { formAction: '/api/forms/x', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' };

  it('Entwurfsformular: gleiche Felder wie live, kein Foto-Upload, sichtbar nicht absendbar', () => {
    for (const kit of KITS) {
      const facts = { ...sampleFacts, group: kit.group };
      const html = renderSite({
        templateId: kit.id,
        palette: Object.keys(kit.variants)[0]!,
        mode: 'demo',
        content: sampleContent,
        facts,
        demo,
      });
      expect(html, kit.id).not.toContain('type="file"');
      expect(html, kit.id).not.toMatch(/Anfrage mit Fotos|gern mit Fotos/);
      expect(html, kit.id).toContain('<fieldset disabled>');
      expect(html, kit.id).toContain('im Entwurf nicht absendbar');
      for (const name of ['name', 'email', 'phone', 'message']) expect(html, `${kit.id}:${name}`).toContain(`name="${name}"`);
    }
  });

  it('Buttons nach Funktion: Tisch, Behandlung, Reinigungsangebot, Projekt', async () => {
    const { requestLabel } = await import('../src');
    expect(requestLabel(kitFor('gastronomie', 'Restaurant')!, 'Restaurant')).toBe('Tisch anfragen');
    expect(requestLabel(kitFor('beauty', 'Kosmetikstudio')!, 'Kosmetikstudio')).toBe('Behandlung anfragen');
    expect(requestLabel(kitFor('beauty', 'Friseur')!, 'Friseur')).toBe('Termin anfragen');
    expect(requestLabel(kitFor('handwerk', 'Gebäudereinigung')!, 'Gebäudereinigung')).toBe('Reinigungsangebot anfragen');
    expect(requestLabel(kitFor('handwerk', 'Malerbetrieb')!, 'Malerbetrieb')).toBe('Projekt anfragen');
  });

  it('ohne Angaben: kein „Über uns“, keine Fragen und live keine erfundenen Öffnungszeiten', () => {
    const kit = kitFor('handwerk', 'Malerbetrieb')!;
    const facts = { ...sampleFacts, group: kit.group, openingLines: [] };
    const content = { ...sampleContent, about: '', faq: [] };
    const html = renderSite({ templateId: kit.id, palette: 'kalk', mode: 'live', content, facts, live });
    expect(html).not.toContain('id="ueber-uns"');
    expect(html).not.toContain('id="fragen"');
    expect(html).not.toContain('noch nicht bestätigt');
    const draft = renderSite({ templateId: kit.id, palette: 'kalk', mode: 'demo', content, facts, demo });
    expect(draft).toContain('Was für Ihre Seite noch fehlt');
    expect(draft).toContain('Ihre Öffnungszeiten');
  });

  it('Farbwelt nach Passung vor Abwechslung', async () => {
    const { kitVariantFor, hoursHints } = await import('../src');
    const gastro = kitFor('gastronomie', 'Restaurant')!;
    expect(kitVariantFor(gastro, 'Restaurant', hoursHints([{ value: '17:00–23:00 Uhr' }])).variant).toBe('abend');
    expect(kitVariantFor(gastro, 'Café', hoursHints([{ value: '8:00–18:00 Uhr' }])).variant).toBe('kreide');
    const elektro = kitFor('handwerk', 'Sanitär')!;
    expect(kitVariantFor(elektro, 'Sanitär und Heizung').variant).toBe('marine');
    expect(kitVariantFor(elektro, 'Elektriker').variant).toBe('graphit');
    // ohne eindeutige Passung entscheidet die Nutzung (zwei Maler sehen verschieden aus)
    const maler = kitFor('handwerk', 'Malerbetrieb')!;
    expect(kitVariantFor(maler, 'Malerbetrieb', { usage: { 'kit-maler/kalk': 3 } }).variant).toBe('schiefer');
    expect(kitVariantFor(maler, 'Malerbetrieb', { usage: { 'kit-maler/schiefer': 3 } }).variant).toBe('kalk');
  });

  it('Gestaltungsbriefing trennt belegt, Vorschlag, fehlt; dünne Daten → kompakt', async () => {
    const { designBrief } = await import('../src');
    const kit = kitFor('handwerk', 'Malerbetrieb')!;
    const thin = designBrief(
      { ...sampleFacts, group: 'handwerk', phone: null, openingLines: [] },
      { services: [], about: '', faq: [] },
      kit,
      { variant: 'kalk', reason: 'x' },
    );
    expect(thin.density).toBe('kompakt');
    expect(thin.missing).toContain('Ihre Telefonnummer');
    expect(thin.action).toBe('Projekt anfragen');
    const full = designBrief(
      { ...sampleFacts, group: 'handwerk', verifiedServices: ['A', 'B', 'C'] },
      { services: [], about: 'Belegt.', faq: [] },
      kit,
      { variant: 'kalk', reason: 'x' },
    );
    expect(full.density).toBe('voll');
    expect(full.verified.join(' ')).toContain('Leistungen laut Quelle');
  });
});
