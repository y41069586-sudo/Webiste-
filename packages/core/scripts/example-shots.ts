/**
 * Bilder für „Beispiele“ der Firmen-Website: je Branchengruppe ein Template mit einem klar fiktiven
 * Musterbetrieb (Name „… Muster“), ohne Demo-Banner. Ausgabe nach apps/web/public/beispiele.
 * Dazu kompakte WebP-Varianten für die Website: `{id}-karte.webp` (960 × 600, nur der Kopfbereich bei 1024 px
 * Breite in doppelter Auflösung – groß lesbar statt kleiner Gesamtansicht) und `{id}-hoch.webp` (420 × 525).
 * Für Handwerk und Beauty (ohne Beispielfotos) die farbstärkste Vorlage, damit die Vorschau auffällt.
 * Aufruf: pnpm --filter @wbm/core exec tsx scripts/example-shots.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { renderSite, TEMPLATES, type BranchGroup } from '@wbm/templates';
import { libraryContent } from '../src/demos/library';
import { closeBrowser, withPage, imagesPainted } from '../src/render';

export const EXAMPLES: {
  id: string;
  group: BranchGroup;
  branch: string;
  label: string;
  name: string;
  templateId: string;
  palette?: string;
}[] = [
  {
    id: 'handwerk',
    group: 'handwerk',
    branch: 'maler',
    label: 'Malerbetrieb',
    name: 'Malerei Muster',
    templateId: 'handwerk-solid',
    palette: 'werkblau',
  },
  {
    id: 'beauty',
    group: 'beauty',
    branch: 'kosmetikstudio',
    label: 'Kosmetikstudio',
    name: 'Kosmetik Muster',
    templateId: 'beauty-modern',
    palette: 'rose',
  },
  { id: 'gastronomie', group: 'gastronomie', branch: 'cafe', label: 'Café', name: 'Café Muster', templateId: 'gastronomie-foto' },
  {
    id: 'einzelhandel',
    group: 'einzelhandel',
    branch: 'blumenladen',
    label: 'Blumenladen',
    name: 'Blumen Muster',
    templateId: '',
  },
  { id: 'kurse', group: 'kurse', branch: 'tanzschule', label: 'Tanzschule', name: 'Tanzschule Muster', templateId: '' },
];

interface SharpPipeline {
  resize(w: number, h: number): SharpPipeline;
  extract(r: { left: number; top: number; width: number; height: number }): SharpPipeline;
  webp(o: { quality: number }): SharpPipeline;
  toFile(p: string): Promise<unknown>;
}
type SharpFactory = (input: Buffer) => SharpPipeline;
// sharp kommt mit Next.js (apps/web) – hier nur für dieses Skript geladen
const sharp = createRequire(path.resolve(import.meta.dirname, '../../../apps/web/package.json'))('sharp') as SharpFactory;

async function main(): Promise<void> {
  const out = path.resolve(import.meta.dirname, '../../../apps/web/public/beispiele');
  mkdirSync(out, { recursive: true });
  for (const ex of EXAMPLES) {
    const t = TEMPLATES.find((x) => x.id === ex.templateId) ?? TEMPLATES.find((x) => x.group === ex.group)!;
    const html = renderSite({
      templateId: t.id,
      palette: ex.palette ?? t.palettes[0]!,
      mode: 'screenshot',
      content: libraryContent(ex.branch, ex.group, { name: ex.name, stadt: 'Dortmund', branche: ex.label }, 1),
      facts: {
        name: ex.name,
        branchLabel: ex.label,
        group: ex.group,
        street: 'Musterstraße',
        houseNumber: '1',
        postalCode: '44137',
        city: 'Dortmund',
        phone: '0231 000000',
        phoneHref: 'tel:+49231000000',
        openingLines: [{ label: 'Montag – Freitag', value: '09:00 – 18:00 Uhr' }],
      },
    });
    for (const [kind, vp] of [
      ['desktop', { width: 1280, height: 800, deviceScaleFactor: 1 }],
      ['karte', { width: 1024, height: 640, deviceScaleFactor: 2 }],
      ['mobil', { width: 390, height: 780, deviceScaleFactor: 2, isMobile: true }],
    ] as const) {
      const shot = await withPage(vp, async (page) => {
        await page.setContent(html, { waitUntil: 'load' });
        await imagesPainted(page);
        return page.screenshot({ type: 'jpeg', quality: kind === 'karte' ? 90 : 72 });
      });
      if (kind !== 'karte') writeFileSync(path.join(out, `${ex.id}-${kind}.jpg`), shot);
      if (kind === 'karte')
        await sharp(shot)
          .resize(960, 600)
          .webp({ quality: 74 })
          .toFile(path.join(out, `${ex.id}-karte.webp`));
      else if (kind === 'mobil')
        await sharp(shot)
          .extract({ left: 0, top: 0, width: 780, height: 975 })
          .resize(420, 525)
          .webp({ quality: 74 })
          .toFile(path.join(out, `${ex.id}-hoch.webp`));
      console.log(`${ex.id}-${kind}.jpg ${Math.round(shot.length / 1024)} KB (${t.id})`);
    }
  }
  await closeBrowser();
}

void main();
