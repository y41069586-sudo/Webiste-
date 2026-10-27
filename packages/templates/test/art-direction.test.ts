import { expect, it } from 'vitest';
import { TEMPLATES, CHARACTERS, artPalette, industryDirection, normalizeDirection, renderSite, stockPhotos } from '../src';
import { contrastRatio } from '../src/palettes';
import { demoInput } from './fixtures';
it('keeps text and button contrast for every character and extreme verified brand colours', () => {
  for (const character of CHARACTERS)
    for (const primaryColor of ['#ffffff', '#ffff00', '#000000', '#ff00ff', '#00ff00', '#004488']) {
      const p = artPalette('werkblau', { ...industryDirection('handwerk', 'elektriker'), character, primaryColor });
      expect(contrastRatio(p.primary, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.primary, p.surfaceAlt)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.primary, p.onPrimary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.ink, p.surface)).toBeGreaterThanOrEqual(4.5);
    }
});
it('rejects model CSS/HTML instructions and accepts only bounded design vocabulary', () => {
  const f = industryDirection('beauty', 'barber');
  const d = normalizeDirection(
    {
      character: '</style><script>',
      typography: 'url(evil)',
      composition: 'evil',
      primaryColor: '#fff; background:url(https://evil.test)',
      source: 'google',
    },
    f,
  );
  expect(d.character).toBe(f.character);
  expect(d.typography).toBe(f.typography);
  expect(d.primaryColor).toBeUndefined();
  expect(d.source).toBe('industry_proposal');
});
it('excludes generated assets even when review assets are listed without explicit generated opt-in', () => {
  for (const g of ['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse'] as const)
    expect(stockPhotos(g, 0, '', { includeReview: true }).some((p) => p.kind === 'generated')).toBe(false);
});
it('provides checked, optimized draft motifs for the primary sectors without cross-trade substitution', () => {
  for (const label of ['Büroreinigung', 'Fliesenleger']) {
    const photos = stockPhotos('handwerk', 0, label);
    expect(photos.length).toBeGreaterThan(0);
    expect(photos.every((p) => p.license === 'Burst Some Rights Reserved' && p.source === 'Burst')).toBe(true);
    expect(photos.every((p) => p.width && p.height && p.focalPoint!.x <= 100)).toBe(true);
  }
  expect(stockPhotos('handwerk', 0, 'Elektriker')).toEqual([]);
  expect(stockPhotos('handwerk', 0, 'Fensterreinigung').some((p) => p.role === 'work')).toBe(false);
  const input = demoInput('handwerk-klar', 'werkblau');
  input.facts.branchLabel = 'Handwerksbetrieb';
  input.facts.verifiedServices = ['Büroreinigung'];
  expect(renderSite(input)).toContain('Reinigung einer Oberfläche');
});
it('distinguishes source-verified offerings from sample offerings and leaves unknown hours unknown', () => {
  const input = demoInput('handwerk-klar', 'werkblau');
  input.facts.openingLines = [];
  input.facts.verifiedServices = input.content.services.map((s) => s.title);
  const html = renderSite(input);
  expect(html).toContain('Leistungsübersicht aus geprüften Betriebsangaben');
  expect(html).not.toContain('Beispiel-Leistungen –');
  expect(html).toContain('Öffnungszeiten sind noch nicht bestätigt');
  expect(html).not.toContain('Termine und Öffnungszeiten nach Vereinbarung');
  input.facts.verifiedServices = input.facts.verifiedServices.slice(0, 1);
  expect(renderSite(input)).toContain('Beispiel-Leistungen –');
});
it('uses the licensed painter work photo only for relevant draft sectors, never as a business project', () => {
  const photos = stockPhotos('handwerk', 0, 'Malerbetrieb');
  expect(photos.some((p) => p.source === 'Pexels' && p.role === 'work')).toBe(true);
  expect(stockPhotos('handwerk', 0, 'Elektriker').some((p) => p.source === 'Pexels')).toBe(false);
  const input = demoInput('handwerk-klar', 'werkblau');
  input.facts.branchLabel = 'Malerbetrieb';
  expect(renderSite(input)).not.toContain('class="sw-material-study"');
  expect(renderSite(input)).toContain('lizenzierte Beispielfotos, keine Aufnahmen des Betriebs');
  expect(renderSite({ ...input, mode: 'screenshot' })).toContain('data:image/jpeg;base64,');
  for (const mode of ['preview', 'live'] as const)
    expect(
      renderSite({
        ...input,
        mode,
        demo: undefined,
        live: { formAction: '/api/forms/test', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' },
      }),
    ).not.toContain('data:image/jpeg;base64,');
});
it('does not put an unlicensed business photo/logo in a draft; explicit permission permits it', () => {
  const input = demoInput('handwerk-klar', 'werkblau');
  const photo = 'data:image/png;base64,UNIQUE-PERMISSION-TEST';
  input.facts = { ...input.facts, photos: [{ src: photo, alt: 'Freigegebene Aufnahme' }], logoSrc: photo };
  expect(renderSite(input)).not.toContain(photo);
  input.facts.photos![0]!.rightsConfirmed = true;
  input.facts.logoRightsConfirmed = true;
  const html = renderSite(input);
  expect(html).toContain(photo);
  expect(html).not.toContain('KI-generiertes');
});
it('uses structurally different dining compositions for the same business without inventing content', () => {
  const input = demoInput('gastronomie-foto', TEMPLATES.find((t) => t.id === 'gastronomie-foto')!.palettes[0]!, 'gastronomie');
  input.facts.branchLabel = 'Café';
  const warm = renderSite({ ...input, artDirection: { ...industryDirection('gastronomie', 'cafe'), character: 'warm' } });
  const urban = renderSite({
    ...input,
    artDirection: { ...industryDirection('gastronomie', 'cafe'), character: 'urban', typography: 'grotesk' },
  });
  expect(warm).toContain('data-character="warm"');
  expect(urban).toContain('data-character="urban"');
  expect(urban).toContain('sw-dining-hero');
  expect(warm).toContain(input.facts.name);
  expect(urban).toContain(input.facts.name);
  expect(warm).toContain('font-family');
  expect(warm).toContain('data:font/woff2');
});
it('keeps legacy live palette and adds art direction only when a stored direction is supplied', () => {
  const input = demoInput('handwerk-klar', 'werkblau');
  input.mode = 'live';
  input.demo = undefined;
  input.live = { formAction: '/forms', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' };
  expect(renderSite(input)).toContain('data-character="legacy"');
  expect(renderSite({ ...input, artDirection: industryDirection('handwerk', 'maler') })).toContain('data-character="warm"');
});
