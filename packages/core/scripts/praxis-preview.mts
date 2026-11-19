/**
 * Vorschau der Praxis-Vorlage mit eindeutig bezeichneten Testbetrieben (keine echten Betriebe, keine KI-Aufrufe).
 * Aufruf: npx tsx scripts/praxis-preview.mts <ausgabeordner> [--lighthouse]
 * Mit --lighthouse wird jede Live-Variante (ohne Banner) zusätzlich im Labor gemessen (Handy-Profil).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { renderDemoHtml } from '../src/demos/build';
import { lighthouseCheck } from '../src/render/qa';
import { findDemoImage, offloadLazyDemoImages } from '../src/services/demo-images';
import { praxisDirectionFor, praxisTemplateId, renderSite } from '@wbm/templates';
import type { BusinessFacts, SiteContent } from '@wbm/templates/types';

const out = process.argv[2] ?? 'praxis-preview';
mkdirSync(out, { recursive: true });
const hours = [
  { label: 'Mo–Fr', value: '7:30–16:30 Uhr' },
  { label: 'Sa', value: 'nach Vereinbarung' },
];
type Case = { slug: string; facts: Partial<BusinessFacts> & Pick<BusinessFacts, 'name' | 'branchLabel' | 'city'>; content: SiteContent };
const faq = (a: [string, string][]) => a.map(([q, x]) => ({ q, a: x }));
const cases: Case[] = [
  {
    slug: 'dachdecker',
    facts: { name: 'Testbetrieb Dachdeckerei Hollmann', branchLabel: 'Dachdeckerbetrieb', city: 'Dortmund', street: 'Musterweg', houseNumber: '12', postalCode: '44135', phone: '0231 0000001', openingLines: hours },
    content: {
      hero_headline: 'Dachsanierung und Dachreparaturen in Dortmund',
      hero_subline: 'Steildach, Flachdach und Dachfenster: Schildern Sie kurz Ihr Dach, dann wird ein Termin zur Besichtigung abgestimmt.',
      services: [
        { title: 'Dachsanierung', text: 'Neueindeckung und Erneuerung bestehender Dachflächen.', icon: 'house' },
        { title: 'Dachreparatur', text: 'Undichte Stellen, verrutschte Ziegel, beschädigte Anschlüsse.', icon: 'wrench' },
        { title: 'Flachdach', text: 'Abdichtung und Instandsetzung von Flachdächern.', icon: 'shield' },
        { title: 'Dachfenster', text: 'Einbau und Austausch von Dachfenstern.', icon: 'house' },
      ],
      about: '',
      cta_text: 'Besichtigung anfragen',
      seo_title: 'Dachdecker in Dortmund',
      seo_description: 'Dachsanierung und Reparaturen in Dortmund.',
      faq: faq([
        ['Was sollte ich in der Anfrage angeben?', 'Dachart, ungefähre Fläche und was Ihnen aufgefallen ist. Fotos helfen bei der Einschätzung.'],
        ['Wie läuft eine Besichtigung ab?', 'Der Termin wird abgestimmt; vor Ort wird der Zustand angesehen und der Umfang besprochen.'],
        ['Übernehmen Sie auch kleine Reparaturen?', 'Fragen Sie kurz an und beschreiben Sie den Schaden; dann wird geklärt, was möglich ist.'],
      ]),
    },
  },
  {
    slug: 'elektriker',
    facts: { name: 'Testbetrieb Elektro Brandt', branchLabel: 'Elektriker', city: 'Bochum', street: 'Beispielstraße', houseNumber: '3', postalCode: '44787', phone: '0234 0000002', openingLines: hours },
    content: {
      hero_headline: 'Elektroinstallation und Reparaturen in Bochum',
      hero_subline: 'Steckdosen, Sicherungskasten, Beleuchtung: Rufen Sie an oder lassen Sie sich zurückrufen.',
      services: [
        { title: 'Elektroinstallation', text: 'Neue Leitungen, Steckdosen und Schalter im Bestand.', icon: 'plug' },
        { title: 'Sicherungskasten', text: 'Austausch und Erneuerung von Unterverteilungen.', icon: 'bolt' },
        { title: 'Beleuchtung', text: 'Leuchten anschließen und Beleuchtung planen.', icon: 'bulb' },
        { title: 'Fehlersuche', text: 'Ursache finden, wenn Sicherungen auslösen.', icon: 'eye' },
      ],
      about: '', cta_text: 'Rückruf anfragen', seo_title: 'Elektriker in Bochum', seo_description: 'Elektroinstallation in Bochum.',
      faq: faq([
        ['Welche Angaben helfen bei einer Anfrage?', 'Was nicht funktioniert, seit wann und wo. Ein Foto vom Sicherungskasten ist hilfreich.'],
        ['Kann ich einen Rückruf zu einer bestimmten Zeit wünschen?', 'Ja, nennen Sie ein Zeitfenster. Es ist ein Wunsch, kein fester Termin.'],
      ]),
    },
  },
  {
    slug: 'sanitaer-heizung',
    facts: { name: 'Testbetrieb Haustechnik Yilmaz Sanitär- und Heizungsbau GmbH & Co. KG', branchLabel: 'Sanitärbetrieb', city: 'Gelsenkirchen', street: 'Testallee', houseNumber: '88', postalCode: '45879', phone: '0209 0000003', openingLines: [] },
    content: {
      hero_headline: 'Sanitär und Heizung in Gelsenkirchen',
      hero_subline: 'Tropfender Hahn, kalte Heizung oder neues Bad: Beschreiben Sie Ihr Anliegen telefonisch oder per Rückruf.',
      services: [
        { title: 'Heizungswartung', text: 'Regelmäßige Wartung von Gas- und Ölheizungen.', icon: 'wrench' },
        { title: 'Rohrreparatur', text: 'Undichte Leitungen und Anschlüsse instand setzen.', icon: 'wrench' },
        { title: 'Badmodernisierung', text: 'Sanitärobjekte austauschen und Leitungen anpassen.', icon: 'drop' },
      ],
      about: '', cta_text: 'Rückruf anfragen', seo_title: 'Sanitär und Heizung in Gelsenkirchen', seo_description: 'Sanitär und Heizung in Gelsenkirchen.',
      faq: faq([['Was soll ich bei einem Heizungsproblem angeben?', 'Heizungsart, Fehleranzeige und seit wann das Problem besteht.']]),
    },
  },
  {
    slug: 'maler',
    facts: { name: 'Testbetrieb Malerwerkstatt Ott', branchLabel: 'Malerbetrieb', city: 'Essen', street: 'Farbweg', houseNumber: '5', postalCode: '45127', phone: null, openingLines: [] },
    content: {
      hero_headline: 'Wände, Decken und Fassaden in Essen',
      hero_subline: 'Innenanstrich, Tapezierarbeiten und Lackierungen: Beschreiben Sie Raum und Wunsch, dann wird eine Beratung abgestimmt.',
      services: [
        { title: 'Innenanstrich', text: 'Wände und Decken in Wohnräumen und Treppenhäusern.', icon: 'brush' },
        { title: 'Tapezierarbeiten', text: 'Raufaser, Vlies und Mustertapeten.', icon: 'roller' },
        { title: 'Lackierarbeiten', text: 'Türen, Zargen, Heizkörper und Geländer.', icon: 'drop' },
        { title: 'Fassadenanstrich', text: 'Anstrich von Außenwänden nach Untergrundprüfung.', icon: 'house' },
      ],
      about: '', cta_text: 'Beratung anfragen', seo_title: 'Maler in Essen', seo_description: 'Malerarbeiten in Essen.',
      faq: faq([['Brauche ich vorab ein Farbkonzept?', 'Nein. Ein Foto vom Raum und Ihr Wunsch genügen für die erste Beratung.']]),
    },
  },
  {
    slug: 'fliesenleger',
    facts: { name: 'Testbetrieb Fliesen Kaya', branchLabel: 'Fliesenleger', city: 'Duisburg', street: 'Plattenweg', houseNumber: '21', postalCode: '47051', phone: '0203 0000005', openingLines: hours },
    content: {
      hero_headline: 'Fliesen für Bad und Wohnraum in Duisburg',
      hero_subline: 'Wand- und Bodenfliesen, Duschen und Fugensanierung: Nennen Sie Raum und Fläche für eine erste Beratung.',
      services: [
        { title: 'Badfliesen', text: 'Wand- und Bodenflächen im Bad, auch großformatig.', icon: 'wall' },
        { title: 'Bodengleiche Dusche', text: 'Abdichtung und Verfliesung ebenerdiger Duschen.', icon: 'drop' },
        { title: 'Wohnraumböden', text: 'Fliesen in Küche, Flur und Wohnraum.', icon: 'house' },
        { title: 'Fugensanierung', text: 'Alte Fugen erneuern, Silikon austauschen.', icon: 'wrench' },
      ],
      about: '', cta_text: 'Beratung anfragen', seo_title: 'Fliesenleger in Duisburg', seo_description: 'Fliesen in Duisburg.',
      faq: faq([['Kann ich die Fliesen selbst aussuchen?', 'Ja. Bringen Sie Ihre Wunschfliese mit oder lassen Sie sich bei der Auswahl beraten.']]),
    },
  },
  {
    slug: 'galabau',
    facts: { name: 'Testbetrieb Grünwerk Becker', branchLabel: 'Garten- und Landschaftsbau', city: 'Münster', street: 'Gartenpfad', houseNumber: '9', postalCode: '48143', phone: '0251 0000006', openingLines: hours },
    content: {
      hero_headline: 'Gartengestaltung und Gartenpflege in Münster',
      hero_subline: 'Terrassen, Pflanzungen, Hecken: Beschreiben Sie Ihren Garten, dann wird ein Termin vor Ort abgestimmt.',
      services: [
        { title: 'Gartengestaltung', text: 'Beete, Rasenflächen und Wege neu anlegen.', icon: 'leaf' },
        { title: 'Terrassenbau', text: 'Terrassen aus Naturstein, Pflaster oder Holz.', icon: 'wall' },
        { title: 'Heckenschnitt', text: 'Form- und Rückschnitt von Hecken und Gehölzen.', icon: 'leaf' },
        { title: 'Gartenpflege', text: 'Regelmäßige Pflege über die Saison.', icon: 'calendar' },
      ],
      about: '', cta_text: 'Gartenprojekt besprechen', seo_title: 'Gartenbau in Münster', seo_description: 'Gartengestaltung in Münster.',
      faq: faq([['Lohnt sich eine Anfrage schon im Winter?', 'Ja. Planung und Abstimmung lassen sich gut vor der Saison erledigen.']]),
    },
  },
  {
    slug: 'randfall-ohne-bilder',
    facts: { name: 'Testbetrieb Schornsteinfegerei Lange', branchLabel: 'Schornsteinfeger', city: 'Hagen', street: 'Kaminstraße', houseNumber: '1', postalCode: '58095', phone: '02331 0000007', openingLines: [] },
    content: {
      hero_headline: 'Schornsteinfeger in Hagen',
      hero_subline: 'Kehren, Messen und Prüfen nach Absprache. Rufen Sie an oder lassen Sie sich zurückrufen.',
      services: [
        { title: 'Kehrarbeiten', text: 'Reinigung von Schornsteinen und Abgasleitungen.', icon: 'house' },
        { title: 'Messungen', text: 'Abgasmessung an Feuerstätten.', icon: 'check' },
        { title: 'Feuerstättenschau', text: 'Prüfung der Anlagen nach Termin.', icon: 'check' },
      ],
      about: '', cta_text: 'Rückruf anfragen', seo_title: 'Schornsteinfeger in Hagen', seo_description: 'Schornsteinfeger in Hagen.',
      faq: [],
    },
  },
];
for (const c of cases) {
  const key = praxisDirectionFor(c.facts.branchLabel);
  const facts: BusinessFacts = {
    group: 'handwerk', street: '', houseNumber: '', postalCode: '', openingLines: [],
    ...c.facts,
    phoneHref: c.facts.phone ? `tel:+49${c.facts.phone.replace(/\D/g, '').slice(1)}` : null,
  } as BusinessFacts;
  const html = renderDemoHtml({ templateId: praxisTemplateId(key), palette: 'anthrazit', content: c.content, facts, slug: `test${c.slug.replace(/-/g, '')}xxxxxxxxxxxxxxxxxx`.slice(0, 24), cfg: DEFAULT_CONFIG });
  writeFileSync(`${out}/${c.slug}.html`, html);
  console.log(c.slug, key, Math.round(html.length / 1024) + ' KB');
  const liveHtml = renderSite({
    templateId: praxisTemplateId(key), palette: 'anthrazit', mode: 'live', content: c.content, facts,
    live: { formAction: '/api/forms/qa', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html', canonicalUrl: 'http://127.0.0.1/' },
  });
  writeFileSync(`${out}/${c.slug}.live.html`, liveHtml);
  if (process.argv.includes('--lighthouse')) {
    // Demo wie ausgeliefert: nachgelagerte Bilder als eigene Dateien (wie /d/{slug}/bild/{id})
    const off = offloadLazyDemoImages(html, (id) => `/bild/${id}`);
    const assets = off.ids.map((id) => {
      const img = findDemoImage(html, id)!;
      return { path: `bild/${id}`, content: img.bytes, contentType: img.mime };
    });
    for (const [label, page, files] of [['live', liveHtml, []], ['demo', off.html, assets]] as const) {
      const lh = await lighthouseCheck(page, 0.9, [...files]);
      const m = JSON.parse(lh.details?.match(/"metrics":(\{[^}]*\})/)?.[1] ?? '{}') as Record<string, number>;
      const scores = lh.details?.split('; diagnostics')[0];
      console.log(`  ${label}: ${lh.passed ? 'bestanden' : 'NICHT bestanden'} | ${scores} | LCP ${Math.round(m['largest-contentful-paint'] ?? 0)} ms, CLS ${(m['cumulative-layout-shift'] ?? 0).toFixed(3)}, TBT ${Math.round(m['total-blocking-time'] ?? 0)} ms`);
    }
  }
}
