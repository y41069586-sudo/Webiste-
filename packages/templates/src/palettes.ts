import type { BranchGroup } from './types';

export interface Palette {
  id: string;
  label: string;
  group: BranchGroup;
  /** Hauptfarbe (Buttons, Flächen); Text darauf: onPrimary */
  primary: string;
  primaryDark: string;
  onPrimary: string;
  /** Akzentfarbe; Text darauf: onAccent */
  accent: string;
  onAccent: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  muted: string;
  line: string;
  fontHeading: string;
  fontBody: string;
}

const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";
const ROUNDED = "ui-rounded, 'SF Pro Rounded', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Alle Paletten sind auf WCAG-2.1-AA-Kontrast (≥ 4,5:1) geprüft – siehe test/palettes.test.ts. */
export const PALETTES: Palette[] = [
  // --- Handwerk ---
  {
    id: 'werkblau',
    label: 'Werkblau',
    group: 'handwerk',
    primary: '#1d4e89',
    primaryDark: '#143a68',
    onPrimary: '#ffffff',
    accent: '#f2b632',
    onAccent: '#1b1f27',
    surface: '#ffffff',
    surfaceAlt: '#f1f4f8',
    ink: '#18202b',
    muted: '#4a5565',
    line: '#d9e0e8',
    fontHeading: SANS,
    fontBody: SANS,
  },
  {
    id: 'anthrazit',
    label: 'Anthrazit & Orange',
    group: 'handwerk',
    primary: '#2a2e35',
    primaryDark: '#16191d',
    onPrimary: '#ffffff',
    accent: '#c2410c',
    onAccent: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#f4f2ef',
    ink: '#1c1d20',
    muted: '#4f535a',
    line: '#e2ddd6',
    fontHeading: SANS,
    fontBody: SANS,
  },
  {
    id: 'waldgruen',
    label: 'Waldgrün',
    group: 'handwerk',
    primary: '#1f5c47',
    primaryDark: '#15402f',
    onPrimary: '#ffffff',
    accent: '#e0a12a',
    onAccent: '#1a1f1c',
    surface: '#ffffff',
    surfaceAlt: '#eef3ef',
    ink: '#18221e',
    muted: '#4b5a53',
    line: '#d6e1da',
    fontHeading: SANS,
    fontBody: SANS,
  },
  // --- Beauty ---
  {
    id: 'rose',
    label: 'Rosé',
    group: 'beauty',
    primary: '#963a5a',
    primaryDark: '#722a43',
    onPrimary: '#ffffff',
    accent: '#f1d6d3',
    onAccent: '#3a2228',
    surface: '#fffaf8',
    surfaceAlt: '#f8eceb',
    ink: '#2d2226',
    muted: '#66545b',
    line: '#ecdcdb',
    fontHeading: SERIF,
    fontBody: SANS,
  },
  {
    id: 'salbei',
    label: 'Salbei',
    group: 'beauty',
    primary: '#3e6152',
    primaryDark: '#2c4a3d',
    onPrimary: '#ffffff',
    accent: '#e6d7c1',
    onAccent: '#2a2a22',
    surface: '#fbfaf6',
    surfaceAlt: '#eef1ec',
    ink: '#1f2925',
    muted: '#53615a',
    line: '#dfe4dc',
    fontHeading: SERIF,
    fontBody: ROUNDED,
  },
  {
    id: 'noir',
    label: 'Noir & Gold',
    group: 'beauty',
    primary: '#221d27',
    primaryDark: '#121015',
    onPrimary: '#ffffff',
    accent: '#c9a96e',
    onAccent: '#1d1820',
    surface: '#fcfbf9',
    surfaceAlt: '#f3efe8',
    ink: '#1f1b22',
    muted: '#5a5560',
    line: '#e5ded3',
    fontHeading: SERIF,
    fontBody: SANS,
  },
];

export function getPalette(id: string): Palette {
  const p = PALETTES.find((x) => x.id === id);
  if (!p) throw new Error(`Unbekannte Palette: ${id}`);
  return p;
}

export function paletteCssVars(p: Palette): string {
  return [
    `--c-primary:${p.primary}`,
    `--c-primary-dark:${p.primaryDark}`,
    `--c-on-primary:${p.onPrimary}`,
    `--c-accent:${p.accent}`,
    `--c-on-accent:${p.onAccent}`,
    `--c-surface:${p.surface}`,
    `--c-surface-alt:${p.surfaceAlt}`,
    `--c-ink:${p.ink}`,
    `--c-muted:${p.muted}`,
    `--c-line:${p.line}`,
    `--f-heading:${p.fontHeading}`,
    `--f-body:${p.fontBody}`,
  ].join(';');
}

// --- WCAG-Kontrast -----------------------------------------------------------
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
