/**
 * Muster-Briefe zur Abnahme (L2): je Branche zwei PDFs (Startvariante + Kontrolle bzw. zweite Variante)
 * mit echtem Komposit aus Demo-Screenshots. Claims werden für die Muster als freigegeben angenommen –
 * echte Briefe nutzen nur Claims, die im Dashboard freigegeben sind.
 * Aufruf: pnpm --filter @wbm/core exec tsx scripts/letter-samples.ts <ausgabeordner>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { renderSite, templatesForGroup, type BranchGroup } from '@wbm/templates';
import { loadClaimDefinitions } from '../src/claims/library';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { libraryContent } from '../src/demos/library';
import { SLOT_VARIANTS } from '../src/letters/slots';
import { DEFAULT_LETTER_VARIANTS } from '../src/letters/variants';
import { closeBrowser, htmlToPdf, renderComposite, renderLetterPreview, takeScreenshots, validateLetterPdf } from '../src/render';
import type { Industry } from '../src/types';

interface Sample {
  industry: Industry;
  group: BranchGroup;
  branchKey: string;
  label: string;
  name: string;
  domain: string;
  variants: string[];
}

const SAMPLES: Sample[] = [
  {
    industry: 'gastronomie',
    group: 'gastronomie',
    branchKey: 'cafe',
    label: 'Café',
    name: 'Café Pause',
    domain: 'cafe-pause-dortmund.de',
    variants: ['GASTRO_A', 'A – Standard'],
  },
  {
    industry: 'handwerk',
    group: 'handwerk',
    branchKey: 'maler',
    label: 'Malerbetrieb',
    name: 'Malerbetrieb Kowalski',
    domain: 'maler-kowalski.de',
    variants: ['HANDWERK_A', 'HANDWERK_B'],
  },
  {
    industry: 'beauty',
    group: 'beauty',
    branchKey: 'nagelstudio',
    label: 'Nagelstudio',
    name: 'Nails by Mira',
    domain: 'nails-by-mira.de',
    variants: ['BEAUTY_A', 'A – Standard'],
  },
  {
    industry: 'einzelhandel',
    group: 'einzelhandel',
    branchKey: 'blumenladen',
    label: 'Blumenladen',
    name: 'Blütenzauber',
    domain: 'bluetenzauber-dortmund.de',
    variants: ['HANDEL_A', 'A – Standard'],
  },
  {
    industry: 'kurse_training',
    group: 'kurse',
    branchKey: 'tanzschule',
    label: 'Tanzschule',
    name: 'Tanzwerk',
    domain: 'tanzwerk-dortmund.de',
    variants: ['KURSE_A', 'A – Standard'],
  },
  {
    industry: 'dienstleistung',
    group: 'handwerk',
    branchKey: 'elektriker',
    label: 'Fotostudio',
    name: 'Lichtblick Fotostudio',
    domain: 'lichtblick-fotostudio.de',
    variants: ['A – Standard', 'B – Ruf & Entwurf'],
  },
];

async function main(): Promise<void> {
  const out = process.argv[2];
  if (!out) throw new Error('Ausgabeordner fehlt');
  mkdirSync(out, { recursive: true });
  const claims = loadClaimDefinitions()
    .filter((c) => c.scope === 'DE')
    .map((c) => ({
      id: c.id,
      textDe: c.text_de,
      footnoteDe: c.footnote_de,
      status: 'approved',
      scope: c.scope,
      expiresAt: new Date('2030-01-01'),
      industries: c.industries,
    }));
  for (const s of SAMPLES) {
    const t = templatesForGroup(s.group)[0]!;
    const facts = {
      name: s.name,
      branchLabel: s.label,
      group: s.group,
      industry: s.industry,
      street: 'Kampstraße',
      houseNumber: '12',
      postalCode: '44137',
      city: 'Dortmund',
      phone: '0231 123456',
      phoneHref: 'tel:+49231123456',
      openingLines: [{ label: 'Montag – Freitag', value: '09:00 – 18:00 Uhr' }],
    };
    const html = renderSite({
      templateId: t.id,
      palette: t.palettes[0]!,
      mode: 'screenshot',
      content: libraryContent(s.branchKey, s.group, { name: s.name, stadt: 'Dortmund', branche: s.label }, 2),
      facts,
    });
    const shots = await takeScreenshots(html);
    const composite = await renderComposite(shots.desktop, shots.mobile);
    for (const [i, name] of s.variants.entries()) {
      const slotV = SLOT_VARIANTS.find((v) => v.name === name);
      const legacy = DEFAULT_LETTER_VARIANTS.find((v) => v.name === name);
      const p = await renderLetterPreview({
        cfg: DEFAULT_CONFIG,
        industry: s.industry,
        slots: slotV?.slots ?? null,
        content: legacy?.content,
        recipient: { businessName: s.name, street: 'Kampstraße', houseNumber: '12', postalCode: '44137', city: 'Dortmund' },
        domain: s.domain,
        claims,
        compositeDataUri: `data:image/jpeg;base64,${composite.toString('base64')}`,
        sourcesLabel: 'seitenwerk.world/quellen',
        shortUrl: 'seitenwerk.world/k7m2xq',
        qrUrl: 'https://seitenwerk.world/q/ABCDEFGHJKLMNPQRSTUVWXYZ',
        expiresLabel: '23. November 2026',
        dateLine: 'Dortmund, 24. Oktober 2026',
        privacyUrl: 'https://seitenwerk.world/datenschutz',
        optOutEmail: 'widerspruch@seitenwerk.world',
      });
      const pdf = await htmlToPdf(p.html);
      const check = await validateLetterPdf(pdf, { recipientLines: p.data.recipientLines, position: 'left', expectedPages: 1 });
      const file = `${s.industry}-${i + 1}-${name.replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '')}.pdf`;
      writeFileSync(path.join(out, file), pdf);
      console.log(
        `${file}: Wahrheits-Check ${p.truth.passed ? 'bestanden' : `BLOCKIERT ${JSON.stringify(p.truth.violations)}`}, Layout ${check.issues.length ? JSON.stringify(check.issues) : 'ok'}`,
      );
    }
  }
  await closeBrowser();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
