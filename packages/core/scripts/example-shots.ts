/**
 * Bilder für „Beispiele“ der Firmen-Website: je Branchengruppe ein Template mit einem klar fiktiven
 * Musterbetrieb (Name „… Muster“), ohne Demo-Banner. Ausgabe nach apps/web/public/beispiele.
 * Ausgabe: `{id}-karte.webp` (960 × 600) – nur der Kopfbereich bei 1024 px Breite in doppelter Auflösung,
 * groß lesbar statt kleiner Gesamtansicht. Je Branche ein anderes Layout in einer ruhigen, natürlichen Palette,
 * damit sich die Beispiele in der Hero-Treppe unterscheiden, ohne grell zu wirken.
 * Aufruf: pnpm --filter @wbm/core exec tsx scripts/example-shots.ts
 */
import { mkdirSync } from 'node:fs';
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
    id: 'gastronomie',
    group: 'gastronomie',
    branch: 'restaurant',
    label: 'Restaurant',
    name: 'Trattoria Muster',
    templateId: 'gastronomie-split',
    palette: 'tomate',
  },
  {
    id: 'handwerk',
    group: 'handwerk',
    branch: 'maler',
    label: 'Malerbetrieb',
    name: 'Malerei Muster',
    templateId: 'handwerk-klar',
    palette: 'waldgruen',
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
  {
    id: 'einzelhandel',
    group: 'einzelhandel',
    branch: 'blumenladen',
    label: 'Blumenladen',
    name: 'Blumen Muster',
    templateId: 'einzelhandel-foto',
    palette: 'flieder',
  },
  {
    id: 'kurse',
    group: 'kurse',
    branch: 'tanzschule',
    label: 'Tanzschule',
    name: 'Tanzschule Muster',
    templateId: 'kurse-magazin',
    palette: 'lagune',
  },
];

interface SharpPipeline {
  resize(w: number, h: number): SharpPipeline;
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
    const shot = await withPage({ width: 1024, height: 640, deviceScaleFactor: 2 }, async (page) => {
      await page.setContent(html, { waitUntil: 'load' });
      await imagesPainted(page);
      return page.screenshot({ type: 'jpeg', quality: 90 });
    });
    await sharp(shot)
      .resize(960, 600)
      .webp({ quality: 76 })
      .toFile(path.join(out, `${ex.id}-karte.webp`));
    console.log(`${ex.id}-karte.webp (${t.id} / ${ex.palette ?? t.palettes[0]})`);
  }
  await closeBrowser();
}

void main();
