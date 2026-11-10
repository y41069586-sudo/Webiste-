import { describe, expect, it } from 'vitest';
import { lighthouseOnlyPerformanceFailed } from '../src/render/demo-qa';

describe('Lighthouse-Wiederholung nur bei reinem Leistungs-Ausreißer', () => {
  it('wiederholt nur, wenn ausschließlich die Leistung unter der Schwelle liegt', () => {
    expect(
      lighthouseOnlyPerformanceFailed('performance: 79, accessibility: 100, best-practices: 100, seo: 100; diagnostics: {}'),
    ).toBe(true);
    expect(lighthouseOnlyPerformanceFailed('performance: 79, accessibility: 85, best-practices: 100, seo: 100')).toBe(false);
    expect(lighthouseOnlyPerformanceFailed('performance: 95, accessibility: 100, best-practices: 100, seo: 100')).toBe(false);
    expect(lighthouseOnlyPerformanceFailed('Fehler: Zeitüberschreitung')).toBe(false);
    expect(lighthouseOnlyPerformanceFailed(undefined)).toBe(false);
  });
});
