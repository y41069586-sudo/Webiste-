import { expect, it } from 'vitest';
import { assessLetterQuality } from '../src/quality/letter';
const scores = { personalization: 90, industry: 90, text: 90, visual: 90, screenshot: 90 };
it('passing QR/PDF/truth checks cannot invent a letter design score', () => {
  expect(assessLetterQuality([{ passed: true }]).total).toBeNull();
  expect(assessLetterQuality([{ passed: true }]).passed).toBe(false);
});
it('weights actual reviewed criteria and requires all hard technical checks', () => {
  expect(assessLetterQuality([{ passed: true }], scores).total).toBe(92);
  expect(assessLetterQuality([{ passed: true }], scores).passed).toBe(true);
  expect(assessLetterQuality([{ passed: false }], scores).passed).toBe(false);
  expect(assessLetterQuality([{ passed: true }], { ...scores, screenshot: 40 }).passed).toBe(false);
});
