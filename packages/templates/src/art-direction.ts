import { contrastRatio, getPalette, paletteCssVars, type Palette } from './palettes';
import type { BranchGroup } from './types';

/** Visual interpretation, never a claim about services, price level or business quality. */
export const CHARACTERS = ['warm', 'refined', 'precise', 'natural', 'urban', 'classic'] as const;
export type DesignCharacter = (typeof CHARACTERS)[number];
export const TYPOGRAPHIES = ['editorial', 'humanist', 'grotesk'] as const;
export type Typography = (typeof TYPOGRAPHIES)[number];
export const COMPOSITIONS = ['editorial', 'business', 'studio', 'poster'] as const;
export interface ArtDirection {
  version: 1;
  character: DesignCharacter;
  typography: Typography;
  composition: (typeof COMPOSITIONS)[number];
  source: 'business_evidence' | 'source_hint' | 'industry_proposal';
  primaryColor?: string;
  imageMood?: 'warm' | 'neutral' | 'dark' | 'natural';
}
const serif = "Georgia, 'Times New Roman', serif";
const sans = "'SeitenWerk Text', Arial, sans-serif";
const tight = "'SeitenWerk Display', Arial, sans-serif";
const themes: Record<
  DesignCharacter,
  {
    primary: string;
    accent: string;
    surface: string;
    alt: string;
    ink: string;
    muted: string;
    line: string;
    type: Typography;
    composition: ArtDirection['composition'];
  }
> = {
  warm: {
    primary: '#78452f',
    accent: '#e3b17a',
    surface: '#fcf8f1',
    alt: '#f2e8dc',
    ink: '#29251f',
    muted: '#67594d',
    line: '#ddd1c1',
    type: 'editorial',
    composition: 'editorial',
  },
  refined: {
    primary: '#383a35',
    accent: '#c3ac82',
    surface: '#fbfaf6',
    alt: '#f0eee6',
    ink: '#242722',
    muted: '#606356',
    line: '#d9d8ce',
    type: 'editorial',
    composition: 'studio',
  },
  precise: {
    primary: '#174c69',
    accent: '#b8d6df',
    surface: '#fbfcfd',
    alt: '#edf2f5',
    ink: '#172d38',
    muted: '#526773',
    line: '#d2dfe5',
    type: 'grotesk',
    composition: 'business',
  },
  natural: {
    primary: '#365647',
    accent: '#cad4b2',
    surface: '#faf9f2',
    alt: '#edf0e5',
    ink: '#283a2f',
    muted: '#596557',
    line: '#d5ddca',
    type: 'humanist',
    composition: 'studio',
  },
  urban: {
    primary: '#302e2b',
    accent: '#da603b',
    surface: '#faf8f3',
    alt: '#eeeae1',
    ink: '#24231f',
    muted: '#605b52',
    line: '#d5d0c6',
    type: 'grotesk',
    composition: 'poster',
  },
  classic: {
    primary: '#6b2634',
    accent: '#d9bc88',
    surface: '#fdf9f0',
    alt: '#f3e9d8',
    ink: '#332a25',
    muted: '#6e5c50',
    line: '#dfd0ba',
    type: 'editorial',
    composition: 'editorial',
  },
};
export function industryDirection(group: BranchGroup, branch: string): ArtDirection {
  const b = branch.toLowerCase();
  const character: DesignCharacter = /barber|barbier/.test(b)
    ? 'urban'
    : /maler|anstrich/.test(b)
      ? 'warm'
      : /garten|landschaft|yoga|blumen|kosmetik/.test(b)
        ? 'natural'
        : /elektro|sanit|reinig/.test(b)
          ? 'precise'
          : /café|cafe|bäck|baeck/.test(b)
            ? 'warm'
            : group === 'gastronomie'
              ? 'classic'
              : group === 'beauty'
                ? 'refined'
                : group === 'kurse'
                  ? 'precise'
                  : group === 'einzelhandel'
                    ? 'refined'
                    : 'precise';
  return {
    version: 1,
    character,
    typography: themes[character].type,
    composition: themes[character].composition,
    source: 'industry_proposal',
    imageMood: character === 'natural' ? 'natural' : character === 'warm' || character === 'classic' ? 'warm' : 'neutral',
  };
}
/** Runtime allowlist also protects historical/malformed JSON; no model text enters CSS. */
export function normalizeDirection(value: unknown, fallback: ArtDirection): ArtDirection {
  if (!value || typeof value !== 'object') return fallback;
  const v = value as Partial<ArtDirection>;
  return {
    version: 1,
    character: CHARACTERS.includes(v.character as DesignCharacter) ? v.character! : fallback.character,
    typography: TYPOGRAPHIES.includes(v.typography as Typography) ? v.typography! : fallback.typography,
    composition: COMPOSITIONS.includes(v.composition as ArtDirection['composition']) ? v.composition! : fallback.composition,
    source: ['business_evidence', 'source_hint', 'industry_proposal'].includes(v.source ?? '') ? v.source! : fallback.source,
    ...(typeof v.primaryColor === 'string' && /^#[0-9a-f]{6}$/i.test(v.primaryColor) ? { primaryColor: v.primaryColor } : {}),
    ...(v.imageMood && ['warm', 'neutral', 'dark', 'natural'].includes(v.imageMood) ? { imageMood: v.imageMood } : {}),
  };
}
function mix(hex: string, to: string, n: number): string {
  const a = parseInt(hex.slice(1), 16),
    b = parseInt(to.slice(1), 16);
  return (
    '#' +
    [16, 8, 0]
      .map((shift) =>
        Math.round(((a >> shift) & 255) * (1 - n) + ((b >> shift) & 255) * n)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
function foreground(bg: string): string {
  return contrastRatio('#ffffff', bg) >= contrastRatio('#171b19', bg) ? '#ffffff' : '#171b19';
}
export function artPalette(palette: string, d: ArtDirection): Palette {
  const base = getPalette(palette),
    t = themes[d.character];
  const brand = d.primaryColor ?? t.primary;
  let primary = brand;
  for (let i = 0; i < 20 && (contrastRatio(primary, t.surface) < 4.5 || contrastRatio(primary, t.alt) < 4.5); i++)
    primary = mix(primary, '#121b18', 0.12);
  const dark = mix(primary, '#121b18', 0.2);
  return {
    ...base,
    primary,
    primaryDark: dark,
    onPrimary: foreground(primary),
    accent: d.primaryColor ?? t.accent,
    onAccent: foreground(d.primaryColor ?? t.accent),
    surface: t.surface,
    surfaceAlt: t.alt,
    ink: t.ink,
    muted: t.muted,
    line: t.line,
    fontHeading: d.typography === 'editorial' ? serif : d.typography === 'humanist' ? sans : tight,
    fontBody: sans,
  };
}
export function artDirectionCss(palette: string, d: ArtDirection): string {
  return paletteCssVars(artPalette(palette, d));
}
/** Composition preference before usage balancing. Plakat remains selectable, never an accidental default. */
export function designTemplateRank(id: string, d: ArtDirection): number {
  if (id.endsWith('-plakat')) return d.composition === 'poster' ? 0 : 8;
  const preferred: Record<ArtDirection['composition'], string[]> = {
    editorial: ['klar', 'elegant', 'magazin'],
    business: ['solid', 'split'],
    studio: ['soft', 'foto', 'elegant'],
    poster: ['werkstatt', 'modern', 'foto'],
  };
  return preferred[d.composition].some((s) => id.endsWith('-' + s)) ? 0 : 2;
}
