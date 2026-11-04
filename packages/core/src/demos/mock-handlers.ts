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
  // Explicit provider mock only; never a production design fallback.
  return {
    ...result,
    design: {
      concept: 'Fiktiver isolierter Testentwurf, kein Produktionsdesign.',
      displayFont: 'archivo',
      textFont: 'karla',
      colors: { background: '#ffffff', foreground: '#202020', accent: '#eeeeee', onAccent: '#202020' },
      html: `<div class="ad-page"><h1>${esc(result.hero_headline)}</h1><p>{{name}} · {{city}}</p>${!verified ? '<p>Beispiel-Leistungen</p>' : ''}<p>${esc(result.hero_subline)}</p>${result.services.map((s) => `<section><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></section>`).join('')}<a href="#anfrage">${esc(result.cta_text)}</a></div>`,
      css: '.ad-page{padding:24px;max-width:1100px;margin:auto;font-family:var(--body)}h1{font-family:var(--display)}',
    },
  };
});

registerMockStructured(QA_TOOL_NAME, () => ({ issues: [] }));
