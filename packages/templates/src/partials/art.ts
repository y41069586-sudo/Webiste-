import { icon } from '../icons';
import type { IconKey } from '../types';

/**
 * Abstrakte, eigene Illustrationen (SVG, Farben aus der Palette). Keine Fotos,
 * keine Logos oder Markenelemente des Betriebs.
 */
export function blobArt(iconKey: IconKey, cls = ''): string {
  return `<div class="relative mx-auto aspect-square w-full max-w-sm ${cls}" aria-hidden="true">
  <svg viewBox="0 0 400 400" class="absolute inset-0 h-full w-full" focusable="false">
    <path fill="var(--c-accent)" opacity=".85" d="M311 64c45 34 69 98 52 152-17 55-75 99-133 111-58 13-117-7-147-50-30-44-31-110 0-158 30-48 92-78 145-79 33 0 57 8 83 24z"/>
    <path fill="var(--c-primary)" opacity=".9" d="M286 118c32 26 44 74 30 115-13 41-53 75-97 82-45 8-94-11-114-46-21-35-13-86 13-121 25-35 69-55 107-53 25 1 44 9 61 23z"/>
  </svg>
  <div class="absolute inset-0 flex items-center justify-center text-on-primary">${icon(iconKey, 'h-28 w-28')}</div>
</div>`;
}

export function gridArt(icons: IconKey[], cls = ''): string {
  const cells = icons.slice(0, 4);
  return `<div class="grid grid-cols-2 gap-3 ${cls}" aria-hidden="true">${cells
    .map(
      (k, i) =>
        `<div class="flex aspect-square items-center justify-center rounded-2xl ${i % 3 === 0 ? 'bg-primary text-on-primary' : i % 3 === 1 ? 'bg-accent text-on-accent' : 'bg-surface-alt text-primary'}">${icon(k, 'h-12 w-12')}</div>`,
    )
    .join('')}</div>`;
}

export function archArt(iconKey: IconKey, cls = ''): string {
  return `<div class="relative mx-auto w-full max-w-xs ${cls}" aria-hidden="true">
  <div class="aspect-[3/4] rounded-t-full bg-accent"></div>
  <div class="absolute inset-x-6 bottom-6 top-10 flex items-center justify-center rounded-t-full border border-primary/30 bg-surface/60 text-primary">${icon(iconKey, 'h-24 w-24')}</div>
</div>`;
}

export function stripeArt(cls = ''): string {
  return `<svg viewBox="0 0 600 40" preserveAspectRatio="none" class="h-6 w-full ${cls}" aria-hidden="true" focusable="false"><path d="M0 40 L600 0 L600 40 Z" fill="currentColor"/></svg>`;
}
