/**
 * Referenz-Demos für die Sichtprüfung (keine KI, keine Kosten, wiederholbar): echte Generator-Bausteine mit festen,
 * fiktiven Testdaten. Enthält zwei Betriebe derselben Branche, Grenzfälle (langer Name, keine Fotos, keine
 * Öffnungszeiten, keine Telefonnummer, wenige Leistungen) und für Vorher/Nachher dieselben Daten im alten Template.
 * Aufruf: npx tsx scripts/render-reference-demos.ts <Ausgabeordner>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  designBrief,
  getKit,
  kitFor,
  kitVariantFor,
  hoursHints,
  renderSite,
  slopFindingsForPage,
  TEMPLATES,
} from '@wbm/templates';
import type { BranchGroup, SiteContent } from '@wbm/templates';
import { libraryContent } from '../src/demos/library';

const out = process.argv[2] ?? './reference-demos';
mkdirSync(out, { recursive: true });

interface Case {
  id: string;
  name: string;
  branch: string;
  key: string;
  group: BranchGroup;
  phone?: string;
  hours?: { label: string; value: string }[];
  verified?: string[];
  thin?: boolean;
  before?: string;
  live?: boolean;
}

const day = [
  { label: 'Mo–Fr', value: '7:30–17:00 Uhr' },
  { label: 'Sa', value: 'nach Vereinbarung' },
];
const CASES: Case[] = [
  {
    id: 'maler-voll',
    name: 'Malerbetrieb Hennig',
    branch: 'Malerbetrieb',
    key: 'maler',
    group: 'handwerk',
    phone: '0231 471108',
    hours: day,
    verified: ['Innenanstrich', 'Tapezierarbeiten', 'Lackierarbeiten', 'Fassadenanstrich'],
    before: 'handwerk-klar',
    live: true,
  },
  {
    id: 'maler-duenn',
    name: 'Raumgestaltung Özdemir-Kowalczyk',
    branch: 'Maler und Lackierer',
    key: 'maler',
    group: 'handwerk',
    thin: true,
  },
  {
    id: 'fliesen',
    name: 'Fliesen Arslan',
    branch: 'Fliesenleger',
    key: 'fliesenleger',
    group: 'handwerk',
    phone: '0231 5570210',
    hours: day,
    verified: ['Fliesenverlegung', 'Badsanierung', 'Fugensanierung'],
  },
  {
    id: 'boden-ohne-foto',
    name: 'Fußbodentechnik Großekathöfer',
    branch: 'Bodenleger',
    key: 'fliesenleger',
    group: 'handwerk',
    phone: '0231 998877',
    verified: ['Parkettverlegung', 'Vinylböden'],
  },
  {
    id: 'elektro',
    name: 'Elektro Brandt',
    branch: 'Elektriker',
    key: 'elektriker',
    group: 'handwerk',
    phone: '0231 220044',
    hours: day,
    verified: ['Elektroinstallation', 'Zählerschrank', 'E-Check'],
  },
  {
    id: 'sanitaer',
    name: 'Haustechnik Yilmaz',
    branch: 'Sanitär und Heizung',
    key: 'sanitaer',
    group: 'handwerk',
    phone: '0231 310099',
    hours: day,
  },
  {
    id: 'reinigung',
    name: 'Glanzwerk Gebäudereinigung',
    branch: 'Gebäudereinigung',
    key: 'reinigung',
    group: 'handwerk',
    phone: '0231 660011',
    hours: day,
    verified: ['Unterhaltsreinigung', 'Glasreinigung', 'Treppenhausreinigung'],
    before: 'handwerk-solid',
  },
  {
    id: 'kosmetik',
    name: 'Studio Liv',
    branch: 'Kosmetikstudio',
    key: 'kosmetikstudio',
    group: 'beauty',
    phone: '0231 120034',
    hours: [
      { label: 'Di–Fr', value: '10:00–19:00 Uhr' },
      { label: 'Sa', value: '10:00–15:00 Uhr' },
    ],
    verified: ['Gesichtsbehandlung', 'Wimpernlifting', 'Augenbrauen'],
    before: 'beauty-modern',
  },
  { id: 'friseur', name: 'Salon Ida', branch: 'Friseur', key: 'friseur', group: 'beauty', phone: '0231 880012' },
  {
    id: 'restaurant',
    name: 'Trattoria Lucca',
    branch: 'Restaurant',
    key: 'restaurant',
    group: 'gastronomie',
    phone: '0231 445566',
    hours: [{ label: 'Di–So', value: '17:00–23:00 Uhr' }],
    before: 'gastronomie-split',
    live: true,
  },
  {
    id: 'cafe',
    name: 'Café Mahlwerk',
    branch: 'Café',
    key: 'cafe',
    group: 'gastronomie',
    hours: [{ label: 'Mo–Sa', value: '8:00–18:00 Uhr' }],
    thin: true,
  },
];

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
const demo = {
  slug: 'abcdefghijklmnopqrstuvwx',
  priceLabel: '597 €',
  checkoutUrl: '#uebernehmen',
  questionUrl: '/y',
  optOutUrl: '/z',
  expiresLabel: 'am 4.12.2026',
  sender,
  offers: [{ title: 'SeitenWerk Basis', price: '597 €', unit: 'einmalig', points: ['Website', 'eigene Domain'], href: '#' }],
};

const report: string[] = [];
// wie im Generator: bisherige Nutzung je Farbwelt (Abwechslung, wenn keine Farbwelt besser passt)
const usage: Record<string, number> = {};
for (const c of CASES) {
  const base = libraryContent(c.key, c.group, { name: c.name, stadt: 'Dortmund', branche: c.branch }, 1);
  const content: SiteContent = {
    ...base,
    services: c.verified
      ? c.verified.map((t, i) => ({
          title: t,
          text: base.services[i]?.text ?? 'Auf Anfrage.',
          icon: base.services[i]?.icon ?? 'check',
        }))
      : c.thin
        ? base.services.slice(0, 2)
        : base.services,
    about: c.thin ? '' : base.about,
    faq: c.thin ? [] : base.faq.slice(0, 3),
  };
  const facts = {
    name: c.name,
    branchLabel: c.branch,
    group: c.group,
    verifiedServices: c.verified,
    street: 'Hörder Bahnhofstraße',
    houseNumber: '12',
    postalCode: '44263',
    city: 'Dortmund',
    phone: c.phone ?? null,
    phoneHref: c.phone ? `tel:+49${c.phone.replace(/\D/g, '').slice(1)}` : null,
    openingLines: c.hours ?? [],
  };
  const kit = kitFor(c.group, c.branch)!;
  const v = kitVariantFor(getKit(kit.id)!, c.branch, { ...hoursHints(facts.openingLines), usage });
  usage[`${kit.id}/${v.variant}`] = (usage[`${kit.id}/${v.variant}`] ?? 0) + 1;
  const brief = designBrief(facts, content, kit, v);
  const html = renderSite({ templateId: kit.id, palette: v.variant, mode: 'demo', content, facts, demo });
  writeFileSync(`${out}/${c.id}.html`, html);
  if (c.live)
    writeFileSync(
      `${out}/${c.id}-live.html`,
      renderSite({
        templateId: kit.id,
        palette: v.variant,
        mode: 'live',
        content,
        facts,
        live: { formAction: '/api/forms/x', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' },
      }),
    );
  if (c.before)
    writeFileSync(
      `${out}/${c.id}-vorher.html`,
      renderSite({
        templateId: c.before,
        palette: TEMPLATES.find((t) => t.id === c.before)!.palettes[0]!,
        mode: 'demo',
        content,
        facts,
        demo,
      }),
    );
  const slop = slopFindingsForPage(html);
  report.push(
    `${c.id}: ${kit.id}/${v.variant} (${v.reason}) · ${brief.density} · ${Math.round(html.length / 1024)} KB · KI-Muster: ${slop.length ? JSON.stringify(slop) : 'keine'}`,
  );
}
writeFileSync(`${out}/bericht.txt`, report.join('\n') + '\n');
console.log(report.join('\n'));
