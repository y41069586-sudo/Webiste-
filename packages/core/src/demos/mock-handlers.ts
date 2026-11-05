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
  // Explicit provider mock only; never a production design fallback. Erfüllt die Pflicht-Inhalte (05.11.2026).
  const slots = /Verfügbare Bildslots[^:]*: (\[.*\])/.exec(req.prompt)?.[1];
  const images = slots ? (JSON.parse(slots) as { slot: number; alt: string }[]) : [];
  return { ...result, design: testAuthoredDesign(result, { verified: Boolean(verified), images }) };
});

/** Vollständiger fiktiver Testentwurf (Mock-Anbieter und Tests), nie Produktionsgestaltung. */
export function testAuthoredDesign(
  result: Pick<SiteContent, 'hero_headline' | 'hero_subline' | 'cta_text' | 'services'>,
  opts: { verified: boolean; images: { slot: number; alt: string }[] },
): NonNullable<SiteContent['design']> {
  const { verified, images } = opts;

  const beispiel = !verified
    ? '<p class="ad-note">Beispiel-Leistungen, vor Veröffentlichung mit dem Betrieb abgestimmt.</p>'
    : '';
  const html = [
    `<div class="ad-page"><header class="ad-hero" id="ad-start"><p>{{branch}} in {{city}}</p><h1>${esc(result.hero_headline)}</h1><p>${esc(result.hero_subline)}</p><p><a class="ad-btn" href="#anfrage">${esc(result.cta_text)}</a></p></header>`,
    `<section id="ad-leistungen"><h2>Leistungen</h2><p>Hier steht, was zu den einzelnen Arbeiten gehört. So lässt sich vorab einschätzen, ob die Leistung zum eigenen Vorhaben passt und welche Angaben für eine Anfrage nützlich sind.</p>${beispiel}${result.services
      .map(
        (x) =>
          `<article><h3>${esc(x.title)}</h3><p>${esc(x.text)} Was genau dazugehört, hängt vom Vorhaben ab und wird vor Beginn gemeinsam festgelegt. Je genauer die Beschreibung, desto besser lässt sich der Umfang einschätzen.</p></article>`,
      )
      .join('')}</section>`,
    '<section id="ad-ablauf"><h2>So läuft eine Anfrage ab</h2><p class="ad-note">Beispielablauf</p><ol><li>Sie schildern kurz Ihr Vorhaben, telefonisch oder über das Formular.</li><li>Gemeinsam werden Umfang und Wunschzeitraum besprochen.</li><li>Bei Bedarf wird vor Ort angesehen, was zu tun ist.</li><li>Sie erhalten ein Angebot, bevor etwas beginnt.</li></ol></section>',
    '<section id="ad-vorbereitung"><h2>Gut vorbereitet anfragen</h2><p>Hilfreich sind ein paar Angaben vorab: worum es geht, wo es ist, wie groß die Fläche oder wie viele Teile es sind und bis wann es fertig sein soll. Fotos der Ausgangslage helfen oft mehr als eine lange Beschreibung. Wer einen Wunschtermin hat, nennt ihn am besten gleich mit. Auch Hinweise zum Zugang, etwa Etage, Parkmöglichkeit oder Schlüsselübergabe, sparen später Rückfragen. Wer unsicher ist, welche Leistung passt, beschreibt einfach das Ziel. Den passenden Weg dorthin klärt der Betrieb im Gespräch, oft lassen sich so unnötige Arbeiten vermeiden.</p></section>',
    `<section id="ad-eindruecke"><h2>Eindrücke</h2>${images
      .slice(0, 3)
      .map((i) => `<figure><img src="{{image_${i.slot}}}" alt="${esc(i.alt)}"></figure>`)
      .join('')}<p>Bilder zur Einordnung der Arbeiten.</p></section>`,
    '<section id="ad-fragen"><h2>Fragen zum Ablauf</h2><details><summary>Ist eine Anfrage verbindlich?</summary><p>Nein. Eine Anfrage ist noch kein Auftrag; verbindlich wird es erst mit einem bestätigten Angebot.</p></details><details><summary>Was passiert nach dem Absenden?</summary><p>Die Anfrage geht direkt an den Betrieb, der sich mit einer Rückmeldung meldet.</p></details><details><summary>Kann ich auch anrufen?</summary><p>Ja, wenn eine Telefonnummer angegeben ist, geht das am schnellsten.</p></details></section>',
    '<section id="ad-ort"><h2>Standort und Kontakt</h2><p>{{street}}, {{postal_code}} {{city}}</p><p><a href="{{map_url}}">Route planen</a></p><p><a href="#anfrage">Anfrage stellen</a></p></section></div>',
  ].join('');
  return {
    concept: 'Fiktiver isolierter Testentwurf, kein Produktionsdesign.',
    displayFont: 'archivo',
    textFont: 'karla',
    colors: { background: '#ffffff', foreground: '#202020', accent: '#eeeeee', onAccent: '#202020' },
    html,
    css: '.ad-page{padding:24px;max-width:1100px;margin:auto;font-family:var(--body)}h1{font-family:var(--display)}figure{margin:0}img{width:100%}',
  };
}

registerMockStructured(QA_TOOL_NAME, () => ({ issues: [] }));
