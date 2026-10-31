/**
 * Lighthouse's 4x default assumes a high-end desktop (benchmark 1500–2000).
 * Reference: https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md#cpu-throttling
 * Scale down only on weaker machines; never pretend to accelerate an already slower host.
 * The 1500 reference is our documented lower-end desktop baseline, not a Google-mandated formula.
 */
export function lighthouseCpuMultiplier(benchmark: number): number {
  if (!Number.isFinite(benchmark) || benchmark <= 0) return 4;
  return Math.max(1, Math.min(4, (benchmark / 1500) * 4));
}
