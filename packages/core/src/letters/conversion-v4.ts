import type { Industry } from '../types';
import { LETTER_VARIANT_A, LETTER_VARIANT_B, type LetterVariantContent } from './variants';

export const V4_LETTER_INDUSTRIES = ['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse_training'] as const;
const BENEFIT: Partial<Record<Industry, string>> = {
  handwerk:
    'Leistungen, Einzugsgebiet und eine direkte Anfrage: So können Interessierte leichter einschätzen, ob Ihr Betrieb zu ihrem Vorhaben passt.',
  beauty:
    'Behandlungen, Einblicke und eine Terminanfrage an einem Ort: So können sich Interessierte vor ihrem ersten Besuch orientieren.',
  gastronomie: 'Speisekarte, Öffnungszeiten und Anfahrt auf einen Blick: So können Gäste ihren Besuch leichter planen.',
  einzelhandel:
    'Sortiment, Öffnungszeiten und Standort übersichtlich zeigen: So finden Interessierte die Informationen für ihren nächsten Besuch.',
  kurse_training:
    'Kursangebot, Zeiten und die Anfrage nach einer Probestunde verständlich zeigen: So fällt die erste Kontaktaufnahme leichter.',
};

/** Review candidates. A's old finished-site promise is corrected; no active DB arm is overwritten. */
export function v4LetterVariant(industry: Industry, arm: 'A' | 'B' | 'C'): LetterVariantContent {
  const benefit = BENEFIT[industry] ?? 'Leistungen, Standort und Kontakt übersichtlich an einem Ort zeigen.';
  return {
    ...(arm === 'A' ? LETTER_VARIANT_A : LETTER_VARIANT_B),
    subject:
      arm === 'A'
        ? 'Ihr persönlicher Website-Entwurf'
        : arm === 'B'
          ? 'Ein Website-Entwurf für {firmenname} in {ort}'
          : 'Ihr Betrieb auf einen Blick – ein Website-Entwurf',
    ratingSentence: '',
    hook: arm !== 'C' ? 'für {firmenname} in {ort} habe ich einen unverbindlichen Website-Entwurf vorbereitet.' : benefit,
    intro:
      arm !== 'C'
        ? [
            'Unter dem QR-Code können Sie die persönliche Vorschau kostenlos ansehen – ohne Anmeldung.',
            benefit,
            ...(arm === 'A'
              ? ['Ihre tatsächlichen Inhalte ergänzen wir vor der Veröffentlichung. Fragen können Sie schriftlich stellen.']
              : []),
          ]
        : [
            'Für {firmenname} in {ort} habe ich dazu eine persönliche Vorschau vorbereitet. Sie können sie kostenlos ansehen – ohne Anmeldung.',
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
