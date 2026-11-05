import { esc } from '@wbm/templates';
import type { BranchGroup } from '@wbm/templates/types';
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
  const faq = [
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
  // Explicit provider mock only; never a production design fallback.
  return {
    ...result,
    faq,
    design: {
      concept: 'Fiktiver isolierter Testentwurf, kein Produktionsdesign.',
      displayFont: 'archivo-elektro',
      contentVersion: 'full-page-1',
      textFont: 'karla',
      colors: { background: '#ffffff', foreground: '#202020', accent: '#eeeeee', onAccent: '#202020' },
      html: `<div class="ad-page"><h1>${esc(result.hero_headline)}</h1><p>{{name}} · {{city}}</p><p>${esc(result.hero_subline)}</p><section data-ad-section="services"><h2>Leistungen und allgemeines Branchenwissen</h2>${!verified ? '<p>Beispiel-Leistungen · keine bestätigten Betriebsangebote</p>' : ''}${result.services.map((s) => `<article><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></article>`).join('')}</section><section data-ad-section="process"><h2>Beispielablauf einer Anfrage</h2><p>Ein möglicher Ablauf: Anliegen schildern, offene Fragen klären und die nächsten Schritte direkt abstimmen.</p></section><section data-ad-section="preparation"><h2>Was Sie für die Anfrage brauchen</h2><ul><li>Anlass und gewünschter Umfang</li><li>Ort und vorhandene Unterlagen</li><li>Wunschzeitraum und mögliche Alternativen</li></ul></section><section data-ad-section="area"><h2>Einsatzgebiet vorab abklären</h2><p>{{service_area}}</p></section><section data-ad-section="gallery"><h2>Bildstrecke zur Gestaltung</h2><figure><img src="{{image_1}}" alt="Beispielbild"></figure><figure><img src="{{image_2}}" alt="Beispielbild"></figure><p data-ad-placeholder="photos">{{placeholder_photos}}</p></section><section data-ad-section="faq"><h2>Fragen zum Anfrageablauf</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section><section data-ad-section="placeholders"><h2>Eigene Inhalte für die spätere Website</h2><p data-ad-placeholder="photos">{{placeholder_photos}}</p><p data-ad-placeholder="team">{{placeholder_team}}</p><p data-ad-placeholder="references">{{placeholder_references}}</p></section><a href="#anfrage">${esc(result.cta_text)}</a></div>`,
      css: '.ad-page{padding:24px;max-width:1100px;margin:auto;font-family:var(--body)}h1{font-family:var(--display)}',
    },
  };
});

registerMockStructured(QA_TOOL_NAME, () => ({ issues: [] }));
