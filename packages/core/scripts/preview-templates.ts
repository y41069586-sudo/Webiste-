/**
 * Vorschau aller Templates einer Gruppe als Screenshots (Desktop + Handy) und Lighthouse-Wert.
 * Aufruf: pnpm --filter @wbm/core exec tsx scripts/preview-templates.ts <ausgabeordner> [gruppe…]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { renderSite, TEMPLATES, type BranchGroup } from '@wbm/templates';
import { libraryContent } from '../src/demos/library';
import { closeBrowser, lighthouseCheck, takeScreenshots } from '../src/render';

const BRANCH: Record<BranchGroup, [string, string]> = {
  handwerk: ['maler', 'Malerbetrieb'],
  beauty: ['kosmetikstudio', 'Kosmetikstudio'],
  gastronomie: ['cafe', 'Café'],
  einzelhandel: ['blumenladen', 'Blumenladen'],
  kurse: ['tanzschule', 'Tanzschule'],
};
const NAMES: Record<BranchGroup, string> = {
  handwerk: 'Malerbetrieb Kowalski',
  beauty: 'Kosmetik Hautnah',
  gastronomie: 'Café Pause',
  einzelhandel: 'Blütenzauber',
  kurse: 'Tanzwerk',
};

async function main(): Promise<void> {
  const [out, ...groups] = process.argv.slice(2);
  if (!out) throw new Error('Ausgabeordner fehlt');
  mkdirSync(out, { recursive: true });
  for (const t of TEMPLATES.filter((x) => !groups.length || groups.includes(x.group))) {
    const [key, label] = BRANCH[t.group];
    const name = NAMES[t.group];
    const html = renderSite({
      templateId: t.id,
      palette: t.palettes[0]!,
      mode: 'demo',
      content: libraryContent(key, t.group, { name, stadt: 'Dortmund', branche: label }, 1),
      facts: {
        name,
        branchLabel: label,
        group: t.group,
        street: 'Kampstraße',
        houseNumber: '12',
        postalCode: '44137',
        city: 'Dortmund',
        phone: '0231 123456',
        phoneHref: 'tel:+49231123456',
        openingLines: [
          { label: 'Dienstag – Samstag', value: '09:00 – 18:00 Uhr' },
          { label: 'Sonntag', value: '10:00 – 16:00 Uhr' },
        ],
      },
      demo: {
        slug: 'abcdefghijklmnopqrstuvwx',
        priceLabel: '590 €',
        checkoutUrl: '/x',
        questionUrl: '/y',
        optOutUrl: '/z',
        expiresLabel: 'am 23.11.2026',
        sender: {
          name: 'Max Muster',
          company: 'Seitenwerk',
          street: 'Musterstraße 1',
          postalCode: '44135',
          city: 'Dortmund',
          email: 'hallo@seitenwerk.world',
          phone: '0231 000000',
          imprintUrl: '/impressum',
          privacyUrl: '/datenschutz',
        },
      },
    });
    const shots = await takeScreenshots(html);
    writeFileSync(path.join(out, `${t.id}-desktop.jpg`), shots.desktop);
    writeFileSync(path.join(out, `${t.id}-mobil.jpg`), shots.mobile);
    const lh = await lighthouseCheck(html);
    console.log(`${t.id}: ${Math.round(html.length / 1024)} KB, Lighthouse: ${lh.details}`);
  }
  await closeBrowser();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
