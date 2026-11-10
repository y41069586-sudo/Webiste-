import { esc } from '@wbm/templates';
import type { BranchGroup, SiteContent } from '@wbm/templates/types';
import { registerMockStructured } from '../providers/llm/mock';
import { DEMO_TOOL_NAME, QA_TOOL_NAME, verifiedServiceFallback } from './content';
import { libraryContent } from './library';
import { STUDIO_TOOL, STUDIO_REVIEW_DIMENSIONS } from './studio';

registerMockStructured(STUDIO_TOOL, () => ({
  visitorTask: 'Fiktiver Ablauf-Test: ein Anliegen verstehen und eine Anfrage vorbereiten.',
  first: {
    idea: 'Fiktives typografisches Konzept für isolierte Tests.',
    composition: 'Eine große typografische Einstiegsfläche mit anschließendem lesbarem Inhaltsverlauf.',
    typography: 'Fiktive Hierarchie mit einer lokalen Groteskschrift.',
    imageDirection: 'Nur bereitgestellte Motive als gekennzeichnete Illustrationen verwenden.',
    mobile: 'Inhalte und Aktion mit lesbaren Abständen für schmale Bildschirme anordnen.',
  },
  second: {
    idea: 'Fiktives bildgeführtes Konzept für isolierte Tests.',
    composition: 'Ein bildgeführter Einstieg mit einem schmalen Textband und wechselnden Flächenproportionen.',
    typography: 'Fiktive Hierarchie mit einer lokalen Serifenschrift.',
    imageDirection: 'Bereitgestellte Bilder als zusammenhängende illustrative Bildstrecke gestalten.',
    mobile: 'Bildzuschnitte neu wählen und die Anfrage früh im mobilen Verlauf erreichbar machen.',
  },
  selected: 'first',
  reason: 'Deterministische Testantwort; keine echte gestalterische Entscheidung eines Modells.',
  pageJourney: Array.from({ length: 5 }, (_, i) => ({
    purpose: `Fiktiver Inhaltszweck für Testbereich ${i}`,
    treatment: 'Fiktive visuelle Behandlung zur Prüfung des Datenflusses, keine Produktionsvorlage.',
  })),
  restraint: 'Keine erfundenen Betriebsfakten und keine Behauptung einer echten Modellbewertung.',
}));

function line(prompt: string, key: string): string {
  return new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(prompt)?.[1]?.trim() ?? '';
}

function seedOf(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Deterministische Ersatzantworten (ohne API-Key, Tests, DRY_RUN). */
registerMockStructured(DEMO_TOOL_NAME, (req) => {
  const name = line(req.prompt, 'Firmenname');
  const branche = line(req.prompt, 'Branche');
  const key = line(req.prompt, 'Branchen-Schlüssel');
  const stadt = line(req.prompt, 'Stadt');
  const group = (line(req.prompt, 'Design-Gruppe') || 'handwerk') as BranchGroup;
  const content = libraryContent(key, group, { name, stadt, branche }, seedOf(name));
  const verified = line(req.prompt, 'Bestätigte Leistungen');
  const result = !verified
    ? content
    : verifiedServiceFallback(content, {
        name,
        branchKey: key,
        branchLabel: branche,
        group,
        city: stadt,
        postalCode: '',
        street: '',
        houseNumber: '',
        phone: null,
        hasOpeningHours: false,
        socialOnly: false,
        verifiedServices: JSON.parse(verified),
      });
  const slots = /Verfügbare Bildslots[^:]*: (\[.*\])/.exec(req.prompt)?.[1];
  const images = slots ? (JSON.parse(slots) as { slot: number; alt: string }[]) : [];
  return { ...result, faq: MOCK_FAQ, design: testAuthoredDesign(result, { verified: Boolean(verified), images }) };
});

const MOCK_FAQ = [
  {
    q: 'Welche Angaben helfen bei der Anfrage?',
    a: 'Beschreiben Sie Anlass, Ort und Umfang Ihres Anliegens. Vorhandene Unterlagen können die erste Einordnung erleichtern.',
  },
  {
    q: 'Wie nenne ich meinen Wunschzeitraum?',
    a: 'Nennen Sie Ihren Wunschzeitraum und mögliche Alternativen. Die tatsächliche Verfügbarkeit muss direkt abgestimmt werden.',
  },
  {
    q: 'Ist meine Anfrage schon ein fester Termin?',
    a: 'Eine Anfrage ist noch keine Terminbestätigung. Ein verbindlicher Termin muss direkt mit dem Betrieb abgestimmt werden.',
  },
];

/** Complete fictional provider/test fixture; never used as a production design fallback. */
export function testAuthoredDesign(
  result: Pick<SiteContent, 'hero_headline' | 'hero_subline' | 'cta_text' | 'services'>,
  opts: { verified: boolean; images: { slot: number; alt: string }[] },
): NonNullable<SiteContent['design']> {
  const { verified, images } = opts;
  const faq = MOCK_FAQ;
  return {
    concept: 'Fiktiver isolierter Testentwurf, kein Produktionsdesign.',
    displayFont: 'archivo-elektro',
    contentVersion: 'full-page-2',
    textFont: 'karla',
    colors: { background: '#ffffff', foreground: '#202020', accent: '#eeeeee', onAccent: '#202020' },
    html: `<div class="ad-page"><header><h1>${esc(result.hero_headline)}</h1><p>{{name}} · {{city}}</p><p>${esc(result.hero_subline)}</p>${
      images[0] ? `<img src="{{image_${images[0].slot}}}" alt="${esc(images[0].alt)}">` : ''
    }<a href="#anfrage">${esc(result.cta_text)}</a></header><section data-ad-section="services"><h2>Leistungen</h2>${result.services
      .map((s) => `<article><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></article>`)
      .join('')}</section><section data-ad-section="gallery"><h2>Eindrücke</h2>${
      images.length > 1
        ? images
            .slice(1, 3)
            .map((i) => `<figure><img src="{{image_${i.slot}}}" alt="${esc(i.alt)}"></figure>`)
            .join('')
        : '<p data-ad-placeholder="photos">{{placeholder_photos}}</p>'
    }</section><section data-ad-section="inquiry"><h2>So einfach fragen Sie an</h2><ul><li>Anlass und gewünschten Umfang nennen</li><li>Ort und vorhandene Unterlagen angeben</li><li>Wunschzeitraum und Alternativen nennen</li></ul></section><section data-ad-section="area"><h2>So erreichen Sie uns</h2><p>{{service_area}}</p></section><section data-ad-section="faq"><h2>Kurze Fragen</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section><section data-ad-section="placeholders"><h2>Noch zu ergänzen</h2><p data-ad-placeholder="photos">{{placeholder_photos}}</p><p data-ad-placeholder="team">{{placeholder_team}}</p><p data-ad-placeholder="references">{{placeholder_references}}</p></section></div>`,
    css: '.ad-page{padding:24px;max-width:1100px;margin:auto;font-family:var(--body)}h1{font-family:var(--display)}',
  };
}
registerMockStructured(QA_TOOL_NAME, () => ({
  issues: [],
  craft: STUDIO_REVIEW_DIMENSIONS.map((dimension) => ({
    dimension,
    verdict: 'unverifiable',
    evidence: 'Mock hat keine visuelle Modellprüfung durchgeführt.',
    correction: 'Tatsächliche Bildprüfung und Betreiberabnahme erforderlich.',
  })),
}));
