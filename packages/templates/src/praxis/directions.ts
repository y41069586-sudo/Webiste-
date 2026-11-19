import type { KitDisplayFont, KitTextFont } from '../kits/fonts';

/**
 * Gestaltungsrichtungen der Praxis-Vorlage (Designrichtlinie 2026-11-19). Jede Richtung hat eine eigene
 * Komposition, Bildhierarchie, Informationsreihenfolge und Hauptaktion – nicht nur andere Farben.
 * Zuordnung nach Besuchsanlass, nicht starr nach Gewerk; Farben sind Ausgangspunkte.
 */
export type PraxisDirectionKey = 'service' | 'projekt' | 'raeume' | 'garten';

export interface PraxisDirection {
  key: PraxisDirectionKey;
  name: string;
  /** Passende Fälle (nur Dokumentation und Briefing) */
  fits: string;
  /** Hauptaktion: Beschriftung muss zum tatsächlichen Folgeschritt passen */
  primaryLabel: string;
  /** Art der Anfrage im Formular */
  request: 'rueckruf' | 'besichtigung' | 'beratung' | 'gartenprojekt';
  /** Abschnittsreihenfolge nach Besuchsanlass */
  order: ('kontaktband' | 'leistungen' | 'ablauf' | 'bilder' | 'fragen' | 'ueber')[];
  display: KitDisplayFont;
  text: KitTextFont;
  weight: number;
  stretch?: number;
  colors: { base: string; surface: string; ink: string; muted: string; line: string; accent: string; onAccent: string };
}

export const PRAXIS_DIRECTIONS: Record<PraxisDirectionKey, PraxisDirection> = {
  service: {
    key: 'service',
    name: 'Service und Reparatur',
    fits: 'Elektro, Sanitär, Dachreparatur, Kfz',
    primaryLabel: 'Rückruf anfragen',
    request: 'rueckruf',
    order: ['kontaktband', 'leistungen', 'ablauf', 'fragen', 'ueber'],
    display: 'archivo-elektro',
    text: 'atkinson',
    weight: 800,
    stretch: 96,
    colors: {
      base: '#ffffff',
      surface: '#f1f3f5',
      ink: '#15191e',
      muted: '#4a525c',
      line: '#d5dae0',
      accent: '#0b57d0',
      onAccent: '#ffffff',
    },
  },
  projekt: {
    key: 'projekt',
    name: 'Sanierung und Projekt',
    fits: 'Dach, Heizung, größere Umbauten',
    primaryLabel: 'Besichtigung anfragen',
    request: 'besichtigung',
    order: ['leistungen', 'bilder', 'ablauf', 'fragen', 'ueber'],
    display: 'archivo-maler',
    text: 'karla',
    weight: 900,
    stretch: 74,
    colors: {
      base: '#fbfaf8',
      surface: '#efece6',
      ink: '#1b1c1e',
      muted: '#4f4b45',
      line: '#d9d4cb',
      accent: '#9a3f0e',
      onAccent: '#ffffff',
    },
  },
  raeume: {
    key: 'raeume',
    name: 'Räume und Materialien',
    fits: 'Maler, Fliesen, hochwertiges Bad, Boden',
    primaryLabel: 'Beratung anfragen',
    request: 'beratung',
    order: ['bilder', 'leistungen', 'ablauf', 'fragen', 'ueber'],
    display: 'archivo-fliesen',
    text: 'karla',
    weight: 700,
    stretch: 108,
    colors: {
      base: '#f6f6f4',
      surface: '#e9ebe8',
      ink: '#1d2120',
      muted: '#4b524f',
      line: '#cfd4d1',
      accent: '#1f4f4a',
      onAccent: '#ffffff',
    },
  },
  garten: {
    key: 'garten',
    name: 'Garten und Außenraum',
    fits: 'GaLa-Bau, Terrasse, Gartenplanung, Gartenpflege',
    primaryLabel: 'Gartenprojekt besprechen',
    request: 'gartenprojekt',
    order: ['ablauf', 'leistungen', 'bilder', 'fragen', 'ueber'],
    display: 'archivo-reinigung',
    text: 'karla',
    weight: 650,
    stretch: 92,
    colors: {
      base: '#fafaf6',
      surface: '#eceee4',
      ink: '#1b261d',
      muted: '#48524a',
      line: '#d2d8cc',
      accent: '#2d5f34',
      onAccent: '#ffffff',
    },
  },
};

/** Ausgangszuordnung nach Gewerk; der Besuchsanlass (z. B. Notfall vs. Projekt) kann sie überstimmen. */
export function praxisDirectionFor(branch: string): PraxisDirectionKey {
  const b = branch.toLocaleLowerCase('de');
  if (/garten|landschaft|gala|terrass|pflaster/.test(b)) return 'garten';
  if (/maler|anstrich|tapezier|fliesen|boden|parkett|stuck|putz|tischler|schreiner/.test(b)) return 'raeume';
  if (/dach|zimmer|heizung|klima|maurer|bau|metall|glas|fenster/.test(b)) return 'projekt';
  return 'service';
}

export const PRAXIS_TEMPLATE_VERSION = 'praxis-1';
export const praxisTemplateId = (key: PraxisDirectionKey) => `praxis-${key}`;
export const isPraxisTemplate = (id: string) => id.startsWith('praxis-');
export const praxisKeyOf = (id: string): PraxisDirectionKey =>
  (['service', 'projekt', 'raeume', 'garten'] as const).find((k) => id === `praxis-${k}`) ?? 'service';
