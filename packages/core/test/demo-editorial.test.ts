import { describe, expect, it } from 'vitest';
import { buildDemoPrompt } from '../src/demos/content';
import { visualReviewInput } from '../src/demos/visual-review';

describe('Editorial generation and bounded visual review', () => {
  it('does not force FAQs or an invented history on thin evidence', () => {
    const prompt = buildDemoPrompt(
      {
        name: 'Fiktiver Betrieb',
        branchLabel: 'Malerbetrieb',
        branchKey: 'maler',
        group: 'handwerk',
        city: 'Dortmund',
        postalCode: '44139',
        street: 'Teststraße',
        houseNumber: '1',
        phone: null,
        hasOpeningHours: false,
        socialOnly: false,
      },
      0,
    );
    expect(prompt).toContain('free-design-1');
    expect(prompt).toContain('Über uns: leer lassen');
    expect(prompt).not.toContain('3–4 FAQ');
    expect(prompt).not.toContain('zwei kurzen Absätzen');
    expect(prompt).toContain('Keine Leistungen bestätigt');
  });
  it('pairs the exact stored screenshots in desktop/mobile order; does not claim full-page proof', () => {
    const desktop = Buffer.from('desktop'),
      mobile = Buffer.from('mobile');
    const input = visualReviewInput({ desktop, mobile });
    expect(input.images.map((x) => Buffer.from(x.data, 'base64').toString())).toEqual(['desktop', 'mobile']);
    expect(input.images).toHaveLength(2);
    expect(input.prompt).toContain('untrusted Daten');
    expect(input.prompt).toContain('nur den ersten Bildschirm');
    expect(input.prompt).toContain('keine pauschale Punktzahl');
  });
});
