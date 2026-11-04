import type { BranchGroup } from '../types';
import type { KitDisplayFont, KitTextFont } from './fonts';

/**
 * Gestaltungs-Kits (Betreiberentscheidung 04.11.2026, Bericht „Demo Websites ohne KI Look“):
 * Jedes Gewerk hat ein eigenes, von Hand gestaltetes Konzept – Schriftpaar, Farbrollen, Radius, Hero-Aufbau und
 * genau EIN Signatur-Element. Das Sprachmodell wählt nichts davon; es schreibt nur Texte in feste Felder.
 * Regeln (siehe kits/slop.ts): keine Standard-/Modeschriften, kein Indigo/Lila, keine Verläufe, keine Glas-Effekte,
 * keine Icon-Karten, Radius ≤ 6 px, keine gesperrten Versal-Etiketten, genau ein Bewegungsmoment.
 */
export type KitSignature = 'farbfaecher' | 'fugenraster' | 'schaltlinie' | 'turnus' | 'preisliste' | 'karte';
export type KitHero = 'type' | 'dark' | 'beauty' | 'gastro';

export interface KitColors {
  /** Seitengrund */
  base: string;
  /** abgesetzte Fläche */
  surface: string;
  /** Text und Überschriften */
  ink: string;
  /** Nebentext (≥ 4,5:1 auf base) */
  muted: string;
  /** Haarlinien */
  line: string;
  /** einziger Akzent: Handlung (Buttons, Nummern) */
  accent: string;
  /** Text auf dem Akzent (≥ 4,5:1) */
  onAccent: string;
}

export interface Kit {
  id: string;
  group: BranchGroup;
  name: string;
  /** passt zu diesen Gewerken (Branchenbezeichnung, klein geschrieben) */
  match: RegExp;
  display: KitDisplayFont;
  text: KitTextFont;
  /** Schriftbreite der Überschrift (nur Archivo, variabel 62–125 %) */
  stretch?: number;
  weight: number;
  /** Zeilenabstand der großen Überschrift */
  leading: number;
  radius: number;
  hero: KitHero;
  signature: KitSignature;
  /** Haupt-Handlung im ersten Bildschirm */
  primary: 'call' | 'appointment' | 'reserve';
  /** Zwei vorab geprüfte Farbwelten; Auswahl deterministisch je Betrieb */
  variants: Record<string, KitColors>;
}

export const KITS: Kit[] = [
  {
    id: 'kit-maler',
    group: 'handwerk',
    name: 'Farbfächer (Maler)',
    match: /maler|anstrich|lackier|tapezier/,
    display: 'archivo',
    text: 'atkinson',
    stretch: 66,
    weight: 900,
    leading: 0.88,
    radius: 4,
    hero: 'type',
    signature: 'farbfaecher',
    primary: 'call',
    variants: {
      kalk: {
        base: '#ECEAE4',
        surface: '#E2DFD7',
        ink: '#1B1E21',
        muted: '#535A60',
        line: '#C9C5BB',
        accent: '#0A6468',
        onAccent: '#FFFFFF',
      },
      schiefer: {
        base: '#22262A',
        surface: '#2C3136',
        ink: '#EFEDE7',
        muted: '#B8BCBD',
        line: '#454B50',
        accent: '#E0B54A',
        onAccent: '#1B1E21',
      },
    },
  },
  {
    id: 'kit-fliesen',
    group: 'handwerk',
    name: 'Fugenraster (Fliesen, Bad)',
    match: /fliese|bad|naturstein|platten|estrich|boden/,
    display: 'archivo',
    text: 'atkinson',
    stretch: 118,
    weight: 700,
    leading: 0.98,
    radius: 2,
    hero: 'type',
    signature: 'fugenraster',
    primary: 'call',
    variants: {
      travertin: {
        base: '#EAE5DC',
        surface: '#DDD6C9',
        ink: '#23211E',
        muted: '#5C564E',
        line: '#C4BCAE',
        accent: '#7A2E2A',
        onAccent: '#FFFFFF',
      },
      stein: {
        base: '#E5E7E6',
        surface: '#D6DADA',
        ink: '#1E2223',
        muted: '#4F575A',
        line: '#BCC3C4',
        accent: '#1F4E79',
        onAccent: '#FFFFFF',
      },
    },
  },
  {
    id: 'kit-elektro',
    group: 'handwerk',
    name: 'Schaltlinie (Elektro, Sanitär, Heizung)',
    match: /elektr|sanit|heizung|install|klima|solar/,
    display: 'archivo',
    text: 'atkinson',
    stretch: 92,
    weight: 800,
    leading: 0.95,
    radius: 3,
    hero: 'dark',
    signature: 'schaltlinie',
    primary: 'call',
    variants: {
      graphit: {
        base: '#1A1D20',
        surface: '#23272B',
        ink: '#F1F1EE',
        muted: '#AEB3B7',
        line: '#3B4046',
        accent: '#F2C230',
        onAccent: '#1A1D20',
      },
      marine: {
        base: '#EEF0EF',
        surface: '#E0E4E3',
        ink: '#14212B',
        muted: '#4D5B64',
        line: '#C2CACC',
        accent: '#9A4F15',
        onAccent: '#FFFFFF',
      },
    },
  },
  {
    id: 'kit-reinigung',
    group: 'handwerk',
    name: 'Turnus (Reinigung, Dienstleistung, Garten)',
    match: /.*/,
    display: 'archivo',
    text: 'karla',
    stretch: 84,
    weight: 650,
    leading: 0.98,
    radius: 6,
    hero: 'type',
    signature: 'turnus',
    primary: 'call',
    variants: {
      leinen: {
        base: '#F3F2EE',
        surface: '#E6E9E3',
        ink: '#1D2A25',
        muted: '#4E5E58',
        line: '#CBD2CB',
        accent: '#1E6B4F',
        onAccent: '#FFFFFF',
      },
      wasser: {
        base: '#EEF3F4',
        surface: '#DEE7E9',
        ink: '#152A33',
        muted: '#475E68',
        line: '#C2D2D6',
        accent: '#0F5E7A',
        onAccent: '#FFFFFF',
      },
    },
  },
  {
    id: 'kit-beauty',
    group: 'beauty',
    name: 'Preisliste (Kosmetik, Nagelstudio, Friseur)',
    match: /.*/,
    display: 'bodoni',
    text: 'karla',
    weight: 500,
    leading: 0.96,
    radius: 2,
    hero: 'beauty',
    signature: 'preisliste',
    primary: 'appointment',
    variants: {
      puder: {
        base: '#F1ECE8',
        surface: '#E6DED9',
        ink: '#241E1F',
        muted: '#5F5456',
        line: '#D1C5C0',
        accent: '#5B2A3A',
        onAccent: '#FFFFFF',
      },
      eukalyptus: {
        base: '#ECEEEA',
        surface: '#DEE3DC',
        ink: '#1F2420',
        muted: '#535D57',
        line: '#C5CDC5',
        accent: '#2F4A3E',
        onAccent: '#FFFFFF',
      },
    },
  },
  {
    id: 'kit-gastro',
    group: 'gastronomie',
    name: 'Karte (Restaurant, Café, Imbiss)',
    match: /.*/,
    display: 'gloock',
    text: 'karla',
    weight: 400,
    leading: 1,
    radius: 2,
    hero: 'gastro',
    signature: 'karte',
    primary: 'reserve',
    variants: {
      abend: {
        base: '#191715',
        surface: '#24211E',
        ink: '#F2EDE6',
        muted: '#B5ACA2',
        line: '#3D3834',
        accent: '#D8A35A',
        onAccent: '#191715',
      },
      kreide: {
        base: '#EFEFEA',
        surface: '#E3E2DA',
        ink: '#1F1B18',
        muted: '#5A544E',
        line: '#CCC8BD',
        accent: '#4D5A2A',
        onAccent: '#FFFFFF',
      },
    },
  },
];

/** Passendes Kit für Gruppe und Gewerk (spezifische Kits vor dem allgemeinen Kit der Gruppe). */
export function kitFor(group: BranchGroup, branchLabel: string): Kit | null {
  const b = branchLabel.toLocaleLowerCase('de');
  const candidates = KITS.filter((k) => k.group === group);
  return (
    candidates.find((k) => k.match.source !== '.*' && k.match.test(b)) ?? candidates.find((k) => k.match.source === '.*') ?? null
  );
}

export function getKit(id: string): Kit | undefined {
  return KITS.find((k) => k.id === id);
}
