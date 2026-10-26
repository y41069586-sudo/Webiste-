import type { Industry } from '../types';
import { LETTER_VARIANT_A, LETTER_VARIANT_B, type LetterVariantContent } from './variants';

export const V4_LETTER_INDUSTRIES = ['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse_training'] as const;
/** Review candidates. A's old finished-site promise is corrected; no active DB arm is overwritten. */
export function v4LetterVariant(industry: Industry, arm: 'A' | 'B' | 'C'): LetterVariantContent {
  const benefit = '{branch_benefit}';
  return {
    ...(arm === 'A' ? LETTER_VARIANT_A : LETTER_VARIANT_B),
    subject:
      arm === 'A'
        ? 'Ihr Website-Entwurf für {firmenname}'
        : arm === 'B'
          ? 'Ein Website-Entwurf für {firmenname} in {ort}'
          : 'Eine Website-Idee für {firmenname}',
    greeting: 'Guten Tag an das Team von {firmenname},',
    ratingSentence: '',
    hook: arm === 'B' ? benefit : 'für {firmenname} in {ort} habe ich einen unverbindlichen Website-Entwurf vorbereitet.',
    intro:
      arm === 'B'
        ? [
            'Ich habe dazu einen persönlichen Website-Entwurf für Ihren Betrieb vorbereitet. Unter dem QR-Code können Sie ihn kostenlos ansehen, ohne Anmeldung.',
          ]
        : arm === 'A'
          ? ['Unter dem QR-Code können Sie die Vorschau kostenlos ansehen. Eine Anmeldung ist nicht erforderlich.', benefit]
          : [
              'Sie können sich den Entwurf kostenlos ansehen, ohne Anmeldung. Ihre tatsächlichen Inhalte stimmen wir vor der Veröffentlichung ab. Fragen können Sie schriftlich stellen.',
            ],
    offerWithDomain:
      'Wenn der Entwurf zu Ihnen passt: {preise} Standard-Domain (z. B. **{domain_vorschlag}**) und Hosting sind im gewählten Tarif enthalten. Vor Veröffentlichung bestätigen Sie alle Inhalte. {garantie_satz}',
    offerWithoutDomain:
      'Wenn der Entwurf zu Ihnen passt: {preise} Standard-Domain und Hosting sind im gewählten Tarif enthalten. Vor Veröffentlichung bestätigen Sie alle Inhalte. {garantie_satz}',
    noAction:
      'Kein Interesse? Sie müssen nichts kaufen. Die Vorschau ist bis {ablaufdatum} verfügbar. Einem weiteren Werbebrief können Sie jederzeit widersprechen.',
    qrCaption: 'Ihre persönliche Vorschau kostenlos ansehen',
  };
}
