/** Rendert alle Gestaltungs-Kits mit Beispielbetrieben (Entwurf) in einen Ordner – zur Sichtprüfung. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { renderSite, KITS, slopFindingsForPage } from '@wbm/templates';
import { libraryContent } from '../src/demos/library';
const out = process.argv[2] ?? './kit-samples';
mkdirSync(out, { recursive: true });
const samples: Record<string, { name: string; branch: string; key: string }> = {
  'kit-maler': { name: 'Malerei Hennig', branch: 'Malerbetrieb', key: 'maler' },
  'kit-fliesen': { name: 'Fliesen Arslan', branch: 'Fliesenleger', key: 'fliesenleger' },
  'kit-elektro': { name: 'Elektro Brandt', branch: 'Elektriker', key: 'elektriker' },
  'kit-reinigung': { name: 'Glanzwerk Gebäudereinigung', branch: 'Gebäudereinigung', key: 'reinigung' },
  'kit-beauty': { name: 'Studio Liv', branch: 'Kosmetikstudio', key: 'kosmetikstudio' },
  'kit-gastro': { name: 'Trattoria Lucca', branch: 'Restaurant', key: 'restaurant' },
};
const sender = {
  name: 'Max Muster',
  company: 'SeitenWerk',
  street: 'Musterstraße 1',
  postalCode: '44135',
  city: 'Dortmund',
  email: 'support@seitenwerk.world',
  phone: '0231 000000',
  imprintUrl: '/impressum',
  privacyUrl: '/datenschutz',
};
for (const kit of KITS) {
  const s = samples[kit.id]!;
  for (const variant of Object.keys(kit.variants)) {
    const content = libraryContent(s.key, kit.group, { name: s.name, stadt: 'Dortmund', branche: s.branch }, 1);
    const html = renderSite({
      templateId: kit.id,
      palette: variant,
      mode: 'demo',
      content,
      facts: {
        name: s.name,
        branchLabel: s.branch,
        group: kit.group,
        street: 'Hörder Bahnhofstraße',
        houseNumber: '12',
        postalCode: '44263',
        city: 'Dortmund',
        phone: '0231 471108',
        phoneHref: 'tel:+49231471108',
        openingLines: [
          { label: 'Mo–Fr', value: '8–18 Uhr' },
          { label: 'Sa', value: '9–13 Uhr' },
        ],
      },
      demo: {
        slug: 'abcdefghijklmnopqrstuvwx',
        priceLabel: '597 €',
        checkoutUrl: '#uebernehmen',
        questionUrl: '/y',
        optOutUrl: '/z',
        expiresLabel: 'am 4.12.2026',
        sender,
      },
    });
    writeFileSync(`${out}/${kit.id}-${variant}.html`, html);
    console.log(kit.id, variant, Math.round(html.length / 1024) + ' KB', JSON.stringify(slopFindingsForPage(html)));
  }
}
