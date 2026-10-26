import { weightedQuality } from './weighted';
export const LETTER_QUALITY_DIMENSIONS = {
  personalization: { label: 'Empfänger und Personalisierung', weight: 20 },
  industry: { label: 'Branchenbezug', weight: 15 },
  text: { label: 'Sprache und Glaubwürdigkeit', weight: 15 },
  visual: { label: 'Druckbild und Lesbarkeit', weight: 15 },
  screenshot: { label: 'Passender Demo-Screenshot', weight: 15 },
} as const;
export type LetterQualityScores = Record<keyof typeof LETTER_QUALITY_DIMENSIONS, number>;
export function assessLetterQuality(checks: readonly { passed: boolean }[], scores?: Partial<LetterQualityScores>, minimum = 80) {
  return weightedQuality(LETTER_QUALITY_DIMENSIONS, checks, scores, minimum, 20);
}
export type LetterQualityAssessment = ReturnType<typeof assessLetterQuality>;
