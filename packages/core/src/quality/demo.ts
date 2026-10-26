import { weightedQuality } from './weighted';
export const DEMO_QUALITY_DIMENSIONS = {
  design: { label: 'Gestaltung', weight: 25 },
  industry: { label: 'Branchenrelevanz', weight: 20 },
  personalization: { label: 'Personalisierung', weight: 15 },
  images: { label: 'Bildqualität und Bildrechte', weight: 15 },
  mobile: { label: 'Mobile Bedienbarkeit', weight: 15 },
} as const;
export type ManualQualityScores = Record<keyof typeof DEMO_QUALITY_DIMENSIONS, number>;
export function assessDemoQuality(checks: readonly { passed: boolean }[], scores?: Partial<ManualQualityScores>, minimum = 80) {
  return weightedQuality(DEMO_QUALITY_DIMENSIONS, checks, scores, minimum, 10);
}
export type DemoQualityAssessment = ReturnType<typeof assessDemoQuality> & { htmlHash?: string };
