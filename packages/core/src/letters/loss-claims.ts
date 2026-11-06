import type { Industry } from '../types';

/** Bevorzugte Belege je Branche, stärkster Verlustbezug zuerst. */
export const LOSS_CLAIMS: Partial<Record<Industry, string[]>> = {
  handwerk: ['HANDWERK_OHNE_WEBSITE_AUSSORTIERT'],
  gastronomie: ['GASTRO_WEBSITE_ERWARTET_KURZ', 'GASTRO_ONLINE_SUCHE'],
  einzelhandel: ['HANDEL_INFO_VORHER'],
  beauty: ['TERMIN_FLEXIBEL'],
  kurse_training: ['TERMIN_FLEXIBEL', 'TERMIN_ONLINE_GEWOHNT'],
};

export const ALL_LOSS_CLAIM_IDS = [...new Set(Object.values(LOSS_CLAIMS).flat())];
