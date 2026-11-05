import { esc } from '@wbm/templates';
import type { BranchGroup, SiteContent } from '@wbm/templates/types';
import { registerMockStructured } from '../providers/llm/mock';
import { DEMO_TOOL_NAME, QA_TOOL_NAME, verifiedServiceFallback } from './content';
import { libraryContent } from './library';

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
    contentVersion: 'full-page-1',
    textFont: 'karla',
    colors: { background: '#ffffff', foreground: '#202020', accent: '#eeeeee', onAccent: '#202020' },
    html: `<div class="ad-page"><h1>${esc(result.hero_headline)}</h1><p>{{name}} · {{city}}</p><p>${esc(result.hero_subline)}</p><section data-ad-section="services"><h2>Leistungen und allgemeines Branchenwissen</h2><p>Eine fachliche Beschreibung unterscheidet das Ziel einer Arbeit von ihrem genauen Umfang. Für die Einordnung sind der vorhandene Zustand, die betroffenen Bereiche und die gewünschte Veränderung hilfreich. Welche einzelnen Arbeiten tatsächlich nötig sind, lässt sich aus einer allgemeinen Beschreibung allein nicht ableiten. Die Hinweise dienen der Vorbereitung und ersetzen keine individuelle Prüfung. Technische Unterlagen und freigegebene Bilder können offene Fragen verständlicher machen.</p>${!verified ? '<p>Beispiel-Leistungen · keine bestätigten Betriebsangebote</p>' : ''}${result.services.map((s) => `<article><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></article>`).join('')}</section><section data-ad-section="process"><h2>Beispielablauf einer Anfrage</h2><p>Ein möglicher Ablauf: Anliegen schildern, offene Fragen klären und die nächsten Schritte direkt abstimmen.</p></section><section data-ad-section="preparation"><h2>Was Sie für die Anfrage brauchen</h2><p>Beschreiben Sie das gewünschte Ergebnis und was bislang vorhanden ist. Falls Unterlagen oder Fotos vorliegen, nennen Sie diese zunächst in Ihrer Nachricht. Lassen Sie persönliche Dokumente und sensible Angaben weg. Zugang und Besonderheiten am Einsatzort können für Rückfragen relevant sein. Ein Wunschzeitraum ist eine Orientierung und keine bestätigte Verfügbarkeit. Noch unklare Punkte lassen sich als offene Fragen festhalten.</p><ul><li>Anlass und gewünschter Umfang</li><li>Ort und vorhandene Unterlagen</li><li>Wunschzeitraum und mögliche Alternativen</li></ul></section><section data-ad-section="area"><h2>Einsatzgebiet vorab abklären</h2><p>{{service_area}}</p></section><section data-ad-section="gallery"><h2>Bildstrecke zur Gestaltung</h2>${
      images.length
        ? images
            .slice(0, 3)
            .map((i) => `<figure><img src="{{image_${i.slot}}}" alt="${esc(i.alt)}"></figure>`)
            .join('')
        : '<p data-ad-placeholder="photos">{{placeholder_photos}}</p>'
    }</section><section data-ad-section="faq"><h2>Fragen zum Anfrageablauf</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section><section data-ad-section="placeholders"><h2>Eigene Inhalte für die spätere Website</h2><p data-ad-placeholder="photos">{{placeholder_photos}}</p><p data-ad-placeholder="team">{{placeholder_team}}</p><p data-ad-placeholder="references">{{placeholder_references}}</p></section><a href="#anfrage">${esc(result.cta_text)}</a></div>`,
    css: '.ad-page{padding:24px;max-width:1100px;margin:auto;font-family:var(--body)}h1{font-family:var(--display)}',
  };
}
registerMockStructured(QA_TOOL_NAME, () => ({ issues: [] }));
