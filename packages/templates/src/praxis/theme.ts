import { kitFontFaces, kitFontFamily } from '../kits/fonts';
import { PRAXIS_DIRECTIONS, isPraxisTemplate, praxisAccentFor, praxisKeyOf } from './directions';

/**
 * Gestaltung der Website eines Betriebs für Seiten außerhalb der Website (Terminwahl, Bestätigung):
 * gleiche Farben, Akzentfarbe und Schriften wie die Praxis-Vorlage des Betriebs. Andere Vorlagen erhalten die
 * ruhige Grundgestaltung (Service-Richtung).
 */
export interface SiteTheme {
  base: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  onAccent: string;
  display: string;
  text: string;
  weight: number;
  stretch?: number;
  faces: { family: string; file: string; weight: string; stretch?: string }[];
}

export function siteThemeFor(templateId: string, businessName: string): SiteTheme {
  const praxis = isPraxisTemplate(templateId);
  const d = PRAXIS_DIRECTIONS[praxis ? praxisKeyOf(templateId) : 'service'];
  return {
    ...d.colors,
    accent: praxis ? praxisAccentFor(businessName, d) : d.colors.accent,
    display: kitFontFamily(d.display),
    text: kitFontFamily(d.text),
    weight: d.weight,
    ...(d.stretch ? { stretch: d.stretch } : {}),
    faces: kitFontFaces([d.display, d.text]),
  };
}
