/**
 * Mockup-Bilder für die Launch-Seite: echte Renderings der eigenen Entwurfsvorlagen für fiktive Musterbetriebe
 * (keine fremden Websites, keine echten Betriebe). Desktop-Karten für Browser-Mockups und Handy-Ausschnitte.
 * Aufruf: pnpm --filter @wbm/launch shots
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { renderSite, TEMPLATES, type BranchGroup } from '@wbm/templates';
import { libraryContent } from '../../../packages/core/src/demos/library';
import { closeBrowser, imagesPainted, withPage } from '../../../packages/core/src/render';

const FIXTURES: { id: string; branch: string; label: string; name: string; template: string; palette?: string }[] = [
  {
    id: 'maler',
    branch: 'maler',
    label: 'Malerbetrieb',
    name: 'Malerei Muster',
    template: 'handwerk-klar',
    palette: 'waldgruen',
  },
  {
    id: 'reinigung',
    branch: 'gebäudereinigung',
    label: 'Gebäudereinigung',
    name: 'Reinigung Muster',
    template: 'handwerk-solid',
    palette: 'werkblau',
  },
  {
    id: 'fliesen',
    branch: 'fliesenleger',
    label: 'Fliesenleger',
    name: 'Fliesen Muster',
    template: 'handwerk-werkstatt',
    palette: 'anthrazit',
  },
];

interface Sharp {
  resize(w: number, h?: number): Sharp;
  extract(r: { left: number; top: number; width: number; height: number }): Sharp;
  webp(o: { quality: number }): Sharp;
  toFile(p: string): Promise<unknown>;
}
const sharp = createRequire(path.resolve(import.meta.dirname, '../../web/package.json'))('sharp') as (b: Buffer) => Sharp;

const out = path.resolve(import.meta.dirname, '../src/img');
mkdirSync(out, { recursive: true });
for (const [seed, f] of FIXTURES.entries()) {
  const t = TEMPLATES.find((x) => x.id === f.template);
  if (!t) throw new Error(`Vorlage fehlt: ${f.template}`);
  const group = t.group as BranchGroup;
  const html = renderSite({
    templateId: t.id,
    palette: f.palette ?? t.palettes[0]!,
    mode: 'screenshot',
    content: libraryContent(f.branch, group, { name: f.name, stadt: 'Musterstadt', branche: f.label }, seed + 1),
    facts: {
      name: f.name,
      branchLabel: f.label,
      group,
      street: 'Musterweg',
      houseNumber: '1',
      postalCode: '12345',
      city: 'Musterstadt',
      phone: '01234 567890',
      phoneHref: 'tel:+491234567890',
      openingLines: [{ label: 'Montag – Freitag', value: '08:00 – 17:00 Uhr' }],
    },
  });
  const desktop = await withPage({ width: 1280, height: 800, deviceScaleFactor: 1.5 }, async (page) => {
    await page.setContent(html, { waitUntil: 'load' });
    await imagesPainted(page);
    return page.screenshot({ type: 'png' });
  });
  await sharp(desktop)
    .resize(1200, 750)
    .webp({ quality: 80 })
    .toFile(path.join(out, `${f.id}-desktop.webp`));
  const phone = await withPage({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true }, async (page) => {
    await page.setContent(html, { waitUntil: 'load' });
    await imagesPainted(page);
    return page.screenshot({ type: 'png' });
  });
  await sharp(phone)
    .resize(390, 844)
    .webp({ quality: 82 })
    .toFile(path.join(out, `${f.id}-phone.webp`));
  console.log(`${f.id}: ${t.id}`);
}
await closeBrowser();
