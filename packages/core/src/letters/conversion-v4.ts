import { PREVIEW_ORDER_NOTICE } from './personalization';
import type { Industry } from '../types';
import { LETTER_VARIANT_A, LETTER_VARIANT_B, type LetterVariantContent } from './variants';

export const V4_LETTER_INDUSTRIES = ['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse_training'] as const;
/** Review candidates. A's old finished-site promise is corrected; no active DB arm is overwritten. */
export function v4LetterVariant(industry: Industry, arm: 'A' | 'B' | 'C', sequence: 1 | 2 | 3 = 1): LetterVariantContent {
  const benefit = '{branch_benefit}';
  return {
    ...(arm === 'A' ? LETTER_VARIANT_A : LETTER_VARIANT_B),
    subject:
      sequence === 2
        ? 'Ihr Website-Entwurf: die Vorschau zum Wiederansehen'
        : sequence === 3
          ? 'Ihr überarbeiteter Website-Entwurf für {firmenname}'
          : arm === 'A'
            ? 'So könnte {firmenname} online aussehen'
            : arm === 'B'
              ? '{firmenname}: Ihre Leistungen auf einen Blick'
              : 'Eine Website-Idee für {firmenname}',
    greeting: 'Guten Tag an das Team von {firmenname},',
    ratingSentence: '',
    hook:
      sequence === 2
        ? 'hier finden Sie die Vorschau für {firmenname} noch einmal. Der Entwurf ist unverbindlich.'
        : sequence === 3
          ? 'hier ist der überarbeitete, unverbindliche Entwurf für Ihren Betrieb.'
          : arm === 'B'
            ? benefit
            : '{research_opening}',
    intro: [
      '{personal_context}',
      'Unabhängiger Entwurf. **Kostenlos ansehen**: QR-Code scannen – ohne Anmeldung, Kaufpflicht oder Verkaufsgespräch.',
    ],
    offerWithDomain: PREVIEW_ORDER_NOTICE,
    offerWithoutDomain: PREVIEW_ORDER_NOTICE,
    noAction: 'Ohne Bestellung entstehen keine Kosten. Vorschau online bis {ablaufdatum}.',
    qrCaption: 'Ihre persönliche Website-Vorschau kostenlos ansehen',
  };
}
