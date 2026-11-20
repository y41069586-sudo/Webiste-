import { getPalette } from '../palettes';
import { kitFontFaces, kitFontFamily, type KitDisplayFont, type KitTextFont } from '../kits/fonts';
import { KITS } from '../kits/kits';
import { PRAXIS_DIRECTIONS, isPraxisTemplate, praxisAccentFor, praxisKeyOf } from './directions';

/**
 * Gestaltung der Website eines Betriebs für Seiten außerhalb der Website (Terminwahl, E-Mails): gleiche Farben,
 * Akzentfarbe und Schriften wie die Vorlage des Betriebs – Praxis-Vorlagen (Handwerk), Gestaltungs-Kits, KI-Entwürfe
 * (eigene Farben und Schriften) und ältere Paletten-Vorlagen. Unbekanntes erhält die ruhige Grundgestaltung.
 */
export interface SiteTheme {
  base: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  onAccent: string;
  /** Familienname der Überschriftschrift (bei Kit-Schriften); Vorlagen mit Systemschrift: leer */
  display: string;
  text: string;
  /** fertige font-family-Werte (inkl. Rückfallschriften) für CSS */
  displayCss: string;
  textCss: string;
  weight: number;
  stretch?: number;
  faces: { family: string; file: string; weight: string; stretch?: string }[];
}

export interface SiteThemeSource {
  /** Palette bzw. Farbwelt der Vorlage (Kits: Name der Farbwelt) */
  palette?: string | null;
  /** KI-Entwurf mit eigenen Farben und Schriften (contentJson.design) */
  design?: {
    colors: { background: string; foreground: string; accent: string; onAccent: string };
    displayFont: string;
    textFont: string;
  } | null;
}

function mix(fg: string, bg: string, t: number): string {
  const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = n(fg),
    b = n(bg);
  return `#${a
    .map((v, i) =>
      Math.round(v * t + b[i]! * (1 - t))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

const HEX = /^#[0-9a-f]{6}$/i;
const stack = (family: string, generic: 'serif' | 'sans-serif') => `'${family}',${generic === 'serif' ? 'Georgia,serif' : 'system-ui,sans-serif'}`;

function kitFonts(display: KitDisplayFont, text: KitTextFont) {
  return {
    display: kitFontFamily(display),
    text: kitFontFamily(text),
    displayCss: stack(kitFontFamily(display), display === 'bodoni' || display === 'gloock' ? 'serif' : 'sans-serif'),
    textCss: stack(kitFontFamily(text), 'sans-serif'),
    faces: kitFontFaces([display, text]),
  };
}

export function siteThemeFor(templateId: string, businessName: string, source: SiteThemeSource = {}): SiteTheme {
  // 1) KI-Entwurf: eigene Farben und Schriften
  const design = source.design;
  if (templateId.startsWith('authored-') && design && [design.colors.background, design.colors.foreground, design.colors.accent, design.colors.onAccent].every((c) => HEX.test(c))) {
    const c = design.colors;
    const display = (design.displayFont === 'archivo' ? 'archivo-free' : design.displayFont) as KitDisplayFont;
    const text = design.textFont as KitTextFont;
    return {
      base: c.background,
      surface: mix(c.foreground, c.background, 0.06),
      ink: c.foreground,
      muted: mix(c.foreground, c.background, 0.78),
      line: mix(c.foreground, c.background, 0.22),
      accent: c.accent,
      onAccent: c.onAccent,
      weight: design.displayFont === 'archivo' ? 700 : 500,
      ...kitFonts(display, text),
    };
  }
  // 2) Praxis-Vorlage (Handwerk)
  if (isPraxisTemplate(templateId)) {
    const d = PRAXIS_DIRECTIONS[praxisKeyOf(templateId)];
    return {
      ...d.colors,
      accent: praxisAccentFor(businessName, d),
      weight: d.weight,
      ...(d.stretch ? { stretch: d.stretch } : {}),
      ...kitFonts(d.display, d.text),
    };
  }
  // 3) Gestaltungs-Kit: Farbwelt und Schriftpaar des Kits
  const kit = KITS.find((k) => k.id === templateId);
  if (kit) {
    const colors = (source.palette ? kit.variants[source.palette] : undefined) ?? Object.values(kit.variants)[0]!;
    return {
      ...colors,
      weight: Math.min(kit.weight, 800),
      ...(kit.stretch ? { stretch: kit.stretch } : {}),
      ...kitFonts(kit.display, kit.text),
    };
  }
  // 4) ältere Vorlagen mit Palette (Systemschriften)
  if (source.palette) {
    try {
      const p = getPalette(source.palette);
      return {
        base: p.surface,
        surface: p.surfaceAlt,
        ink: p.ink,
        muted: p.muted,
        line: p.line,
        accent: p.primary,
        onAccent: p.onPrimary,
        display: '',
        text: '',
        displayCss: p.fontHeading,
        textCss: p.fontBody,
        weight: 700,
        faces: [],
      };
    } catch {
      // unbekannte Palette: Grundgestaltung
    }
  }
  const d = PRAXIS_DIRECTIONS.service;
  return { ...d.colors, weight: d.weight, ...(d.stretch ? { stretch: d.stretch } : {}), ...kitFonts(d.display, d.text) };
}
