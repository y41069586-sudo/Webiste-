import type { BranchGroup, IconKey } from './types';

/**
 * Eigene, einfache Linien-Icons (24×24, stroke = currentColor). Frei von Lizenzen Dritter.
 */
const PATHS: Record<IconKey, string> = {
  cup: '<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c-.6 1 .6 2 0 3M12 3c-.6 1 .6 2 0 3"/>',
  plate:
    '<circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3.5"/><path d="M3 3v6a2 2 0 0 0 2 2M5 3v18M21 3c-1.5 1-2 3-2 5s.5 3 2 3v10"/>',
  bread: '<path d="M5 11a4 4 0 0 1 0-8h14a4 4 0 0 1 0 8v9H5z"/><path d="M9 7v2M12 7v2M15 7v2"/>',
  glass: '<path d="M7 3h10l-1 7a4 4 0 0 1-8 0z"/><path d="M12 14v6M8 21h8"/>',
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8c-2-4-6-4-6-1.5S9 8 12 8c3 0 6-.5 6-2.5S14 4 12 8z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h6"/>',
  dumbbell: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  car: '<path d="M5 16l1.5-6A2 2 0 0 1 8.4 8.5h7.2a2 2 0 0 1 1.9 1.5L19 16"/><rect x="3" y="14" width="18" height="5" rx="1.5"/><path d="M7 19v2M17 19v2"/>',
  mat: '<rect x="3" y="6" width="14" height="12" rx="1"/><path d="M17 8a3 3 0 0 1 0 6"/><path d="M20 9v4"/>',
  brush:
    '<path d="M14.5 3.5l6 6-7.5 7.5-6-6z"/><path d="M7 11l-2.5 2.5a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L13 17"/><path d="M4 20l2-2"/>',
  roller:
    '<rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M18 6h2.5v5H11v3"/><rect x="9.5" y="14" width="3" height="7" rx="1"/>',
  ladder: '<path d="M7 2v20M17 2v20M7 6h10M7 10h10M7 14h10M7 18h10"/>',
  house: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  wall: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M9 4v5M15 9v5M9 14v6M15 14v6"/>',
  spray: '<rect x="7" y="9" width="8" height="12" rx="1.5"/><path d="M9 9V6h4v3M13 6h3M18 4h.01M20 6h.01M18 8h.01"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  plug: '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v4"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  solar: '<path d="M4 15l2-9h12l2 9z"/><path d="M5 10.5h14M10 6l-1 9M14 6l1 9M12 15v5M8 20h8"/>',
  charger:
    '<rect x="4" y="3" width="10" height="18" rx="2"/><path d="M9 7l-2 4h4l-2 4"/><path d="M14 9h3a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0v-6l-2-2"/>',
  network:
    '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
  nail: '<path d="M8 21V11a4 4 0 0 1 8 0v10"/><path d="M8 14h8"/><path d="M10 7.5V4.5a2 2 0 0 1 4 0v3"/>',
  sparkle:
    '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4a1.5 1.5 0 0 1 3 0v8M14 11.5V6a1.5 1.5 0 0 1 3 0v8.5a6.5 6.5 0 0 1-6.5 6.5H10a5 5 0 0 1-4-2l-2.6-3.5a1.5 1.5 0 0 1 2.3-1.9L8 16"/>',
  face: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l8-8"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  flower:
    '<circle cx="12" cy="10" r="2.5"/><path d="M12 7.5a3 3 0 1 1 2.5-4.6M14.4 9a3 3 0 1 1 1.6 5.3M13.4 12.3a3 3 0 1 1-2.8 4.9M10.6 12.3A3 3 0 1 1 6 9.1M9.6 9A3 3 0 1 1 9.5 2.9M12 12.5V21M12 18c-2 0-3.5-1-4-2.5M12 17c2 0 3.5-1 4-2.5"/>',
};

export const ICON_KEYS = Object.keys(PATHS) as IconKey[];

export function icon(key: IconKey | string, cls = 'h-6 w-6'): string {
  const d = PATHS[key as IconKey] ?? PATHS.check;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
}

/** Icons, die zu einer Branchengruppe passen (für Prompt und Fallback). */
export const ICONS_BY_GROUP: Record<BranchGroup, IconKey[]> = {
  gastronomie: ['cup', 'plate', 'bread', 'glass', 'leaf', 'heart', 'calendar', 'clock', 'check', 'sparkle'],
  einzelhandel: ['bag', 'tag', 'gift', 'book', 'flower', 'leaf', 'heart', 'sparkle', 'check', 'clock'],
  kurse: ['dumbbell', 'mat', 'music', 'car', 'heart', 'leaf', 'calendar', 'clock', 'check', 'sparkle'],
  handwerk: [
    'brush',
    'roller',
    'ladder',
    'house',
    'wall',
    'spray',
    'bolt',
    'plug',
    'bulb',
    'wrench',
    'shield',
    'solar',
    'charger',
    'network',
    'check',
    'calendar',
  ],
  beauty: ['nail', 'sparkle', 'hand', 'face', 'leaf', 'drop', 'heart', 'flower', 'eye', 'calendar', 'check', 'clock'],
};
