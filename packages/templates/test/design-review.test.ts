import { expect, it } from 'vitest';
import { renderSite, stockPhotos } from '../src';
import { demoInput } from './fixtures';
it('does not expose review assets or prototype markup in normal rendering', () => {
  expect(stockPhotos('handwerk', 0, 'Malerbetrieb').every((p) => !p.reviewOnly)).toBe(true);
  expect(stockPhotos('handwerk', 0, 'Malerbetrieb', { includeReview: true }).some((p) => p.reviewOnly)).toBe(true);
  const input = demoInput('handwerk-klar', 'werkblau', 'handwerk');
  expect(renderSite(input)).not.toContain('data-review-hero');
  expect(renderSite({ ...input, designReview: true })).toContain('data-review-hero');
});
it('rejects review rendering for live sites or another business branch', () => {
  const input = demoInput('handwerk-klar', 'werkblau', 'handwerk');
  expect(() =>
    renderSite({
      ...input,
      designReview: true,
      mode: 'live',
      live: { formAction: '/forms', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' },
    }),
  ).toThrow(/Designprüfung/);
  expect(() => renderSite({ ...input, designReview: true, facts: { ...input.facts, branchLabel: 'Elektriker' } })).toThrow(
    /Designprüfung/,
  );
});
it('identifies the provider rather than the painter as recipient of demo questions', () => {
  const input = demoInput('handwerk-klar', 'werkblau', 'handwerk');
  input.demo!.sender.street = 'Anbieterweg 9';
  const html = renderSite({ ...input, designReview: true });
  const question = html.slice(html.indexOf('id="frage"')).split('</form>')[0]!;
  expect(question).toContain('Anbieterweg 9');
  expect(question).not.toContain(input.facts.street);
});
