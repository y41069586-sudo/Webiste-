import { expect, it } from 'vitest';
import { assessDemoQuality } from '../src/quality/demo';
const scores = { design: 90, industry: 90, personalization: 90, images: 90, mobile: 90 };
it('does not invent visual ratings from passing technical checks', () => {
  const result = assessDemoQuality([{ passed: true }]);
  expect(result.total).toBeNull();
  expect(result.complete).toBe(false);
  expect(result.passed).toBe(false);
});
it('uses declared weights only after every dimension is actually provided', () => {
  const result = assessDemoQuality([{ passed: true }], scores);
  expect(result.total).toBe(91);
  expect(result.passed).toBe(true);
});
it('does not hide a bad design or failed technical check behind a high average', () => {
  expect(
    assessDemoQuality([{ passed: true }], {
      ...scores,
      design: 40,
      industry: 100,
      personalization: 100,
      images: 100,
      mobile: 100,
    }).passed,
  ).toBe(false);
  expect(assessDemoQuality([{ passed: false }], scores).passed).toBe(false);
});
it.each([NaN, Infinity, -1, 101])('rejects invalid or missing ratings (%s)', (value) => {
  expect(assessDemoQuality([{ passed: true }], { ...scores, images: value }).complete).toBe(false);
});
