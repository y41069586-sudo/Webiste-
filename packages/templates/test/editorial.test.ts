import { describe, it, expect } from 'vitest';
import { editorialPlan, renderSite, designBrief, kitFor } from '../src';
import { sampleContent, sampleFacts, demoInput } from './fixtures';

describe('Editorial standard: evidence and complete renderer', () => {
  it('composition follows verified work, not an invented promise in the business name', () => {
    expect(editorialPlan('handwerk', 'Malerbetrieb', ['Innenanstrich']).composition).toBe('panorama');
    expect(editorialPlan('handwerk', 'Malerbetrieb', ['Fassadenbeschichtung']).composition).toBe('werkstatt');
    expect(editorialPlan('handwerk', 'Malerbetrieb').composition).toBe('werkstatt');
    expect(editorialPlan('gastronomie', 'Café').composition).toBe('speisekarte');
  });
  it('a generated about paragraph does not become source evidence', () => {
    const brief = designBrief(sampleFacts, sampleContent, kitFor('handwerk', 'Maler')!, { variant: 'kalk', reason: 'test' });
    expect(brief.verified.join(' ')).not.toContain('Über uns');
    expect(brief.editorial.review.length).toBeGreaterThan(4);
  });
  it('preserves a specific headline and exposes verified services without blank portfolio frames', () => {
    const input = demoInput('kit-maler', 'leinen');
    input.content = { ...sampleContent, hero_headline: 'Malerarbeiten für Ihre Wohnräume' };
    input.facts = { ...sampleFacts, verifiedServices: ['Innenanstrich', 'Tapezierarbeiten'] };
    const html = renderSite(input);
    expect(html).toContain('data-composition="panorama"');
    expect(html).toMatch(/<h1[^>]*>Malerarbeiten für Ihre Wohnräume<\/h1>/);
    expect(html).toContain('aria-label="Bestätigte Leistungen"');
    expect(html).not.toContain('Hier steht Ihr Foto');
    expect(html).not.toContain('class="k-frame"');
    expect(html).toContain('data-editorial="seitenwerk-editorial-1"');
  });
  it('retains a truthful no-image version and the real form endpoint', () => {
    const html = renderSite({
      templateId: 'kit-maler',
      palette: 'leinen',
      mode: 'live',
      content: sampleContent,
      facts: sampleFacts,
      live: { formAction: '/api/forms/existing', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' },
    });
    expect(html).not.toContain('k-hero k-panorama');
    expect(html).toContain('/api/forms/existing');
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain('data-composition="panorama"');
  });
});
