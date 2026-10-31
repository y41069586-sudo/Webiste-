import { expect, it } from 'vitest';
import { lighthouseCpuMultiplier } from '../src/render/lighthouse-cpu';
it('retains standard slowdown on reference hardware and never accelerates a weak host', () => {
  expect(lighthouseCpuMultiplier(1843)).toBe(4);
  expect(lighthouseCpuMultiplier(1500)).toBe(4);
  expect(lighthouseCpuMultiplier(750)).toBe(2);
  expect(lighthouseCpuMultiplier(126)).toBe(1);
});
it('fails conservatively when the host benchmark is unknown', () => {
  for (const n of [0, -1, NaN, Infinity]) expect(lighthouseCpuMultiplier(n)).toBe(4);
});
