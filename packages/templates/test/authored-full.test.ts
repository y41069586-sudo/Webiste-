import { describe, expect, it } from 'vitest';
import { parseFragment, serializeOuter, type DefaultTreeAdapterTypes as T } from 'parse5';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSite, authoredSectionIssues, type AuthoredDesign } from '../src';
import { demoInput } from './fixtures';
const d: AuthoredDesign = {
  concept: 'Ein frei gestalteter vollständiger Testentwurf.',
  displayFont: 'archivo-elektro',
  textFont: 'karla',
  contentVersion: 'full-page-1',
  colors: { background: '#202b32', foreground: '#f7f2e7', accent: '#efcb65', onAccent: '#202b32' },
  html: `<div class="ad-page"><h1>{{name}}</h1><section data-ad-section="services"><h2>Allgemeines Branchenwissen</h2><p>Elektroinstallationen verteilen elektrische Energie über Leitungen und Anschlüsse. Der konkrete Umfang ist individuell zu klären.</p></section><section data-ad-section="process"><h2>Beispielablauf einer Anfrage</h2><p>Anliegen schildern, Rückfragen klären und die nächsten Schritte direkt abstimmen.</p></section><section data-ad-section="preparation"><h2>Was Sie für die Anfrage brauchen</h2><ul><li>Ort und Anlass</li><li>Vorhandene Unterlagen</li><li>Gewünschter Zeitraum</li></ul></section><section data-ad-section="area"><h2>Das Einsatzgebiet klären</h2><p>{{service_area}}</p></section><section data-ad-section="gallery"><h2>Bildstrecke zur Gestaltung</h2><figure><img src="{{image_1}}" alt="Symbolbild"></figure><figure><img src="{{image_2}}" alt="Symbolbild"></figure><p data-ad-placeholder="photos">{{placeholder_photos}}</p></section><section data-ad-section="faq"><h2>Fragen zum Ablauf</h2><details><summary>Welche Angaben sind hilfreich?</summary><p>Ort und Anlass helfen bei der Einordnung.</p></details><details><summary>Wie nenne ich einen Zeitraum?</summary><p>Nennen Sie Wunschzeitraum und Alternativen.</p></details><details><summary>Ist die Anfrage schon verbindlich?</summary><p>Ein Termin muss direkt bestätigt werden.</p></details></section><section data-ad-section="placeholders"><h2>Eigene Inhalte werden ergänzt</h2><p data-ad-placeholder="photos">{{placeholder_photos}}</p><p data-ad-placeholder="team">{{placeholder_team}}</p><p data-ad-placeholder="references">{{placeholder_references}}</p></section><a href="#anfrage">Anfragen</a></div>`,
  css: '.ad-page{padding:24px}h1{font-family:var(--display);font-weight:800}details[open]{border-bottom:2px solid currentColor}@media(max-width:600px){.ad-page{padding:16px}}',
};
const input = () => {
  const i = demoInput('authored-handwerk', 'custom');
  return { ...i, content: { ...i.content, design: d } };
};
describe('Vollständige freie Seiten, Laufzeit und Größe', () => {
  it('full-page-2: feste Reihenfolge, Leistungen als Kacheln, ein Anfrage-Block, keine Warnsätze nötig', () => {
    const v2 = `<div class="ad-page"><header><h1>{{name}}</h1><img src="{{image_1}}" alt="x"><a href="#anfrage">Anfragen</a></header><section data-ad-section="services"><h2>Leistungen</h2><article><h3>Innenanstrich</h3><p>Wände und Decken.</p></article><article><h3>Lackieren</h3><p>Türen und Rahmen.</p></article><article><h3>Tapezieren</h3><p>Vlies und Raufaser.</p></article></section><section data-ad-section="gallery"><h2>Eindrücke</h2><img src="{{image_1}}" alt="a"><img src="{{image_2}}" alt="b"></section><section data-ad-section="inquiry"><h2>So einfach fragen Sie an</h2><ul><li>Anlass nennen</li><li>Ort angeben</li><li>Wunschzeitraum nennen</li></ul></section><section data-ad-section="area"><h2>So erreichen Sie uns</h2><p>{{service_area}}</p></section><section data-ad-section="faq"><h2>Kurze Fragen</h2><details><summary>Welche Angaben?</summary><p>Anlass und Ort.</p></details><details><summary>Fotos?</summary><p>Gern.</p></details><details><summary>Buchung?</summary><p>Nein.</p></details></section><section data-ad-section="placeholders"><h2>Noch zu ergänzen</h2><p data-ad-placeholder="photos">{{placeholder_photos}}</p><p data-ad-placeholder="team">{{placeholder_team}}</p><p data-ad-placeholder="references">{{placeholder_references}}</p></section></div>`;
    expect(authoredSectionIssues(v2, 3, 2)).toEqual([]);
    const swapped = v2
      .replace('data-ad-section="services"', 'data-ad-section="tmp"')
      .replace('data-ad-section="gallery"', 'data-ad-section="services"')
      .replace('data-ad-section="tmp"', 'data-ad-section="gallery"');
    expect(authoredSectionIssues(swapped, 3, 2).join()).toMatch(/Reihenfolge/);
    expect(authoredSectionIssues(v2.replace('<li>Wunschzeitraum nennen</li>', ''), 3, 2).join()).toMatch(
      /So einfach fragen Sie an/,
    );
  });
  it('requires all semantic content blocks, not a fixed layout order', () => {
    expect(authoredSectionIssues(d.html, 3, 2, 'full-page-1')).toEqual([]);
    for (const section of ['services', 'process', 'preparation', 'area', 'gallery', 'faq', 'placeholders']) {
      expect(
        authoredSectionIssues(d.html.replace(`data-ad-section="${section}"`, ''), 3, 2, 'full-page-1').length,
      ).toBeGreaterThan(0);
    }
  });
  it('rejects missing example labels, invented area output and incomplete FAQs', () => {
    expect(authoredSectionIssues(d.html.replace('Beispielablauf', 'Ablauf'), 3, 2, 'full-page-1')).toContain(
      'Anfrageablauf sichtbar als Beispiel kennzeichnen.',
    );
    expect(
      authoredSectionIssues(d.html.replace('{{service_area}}', 'Wir sind im gesamten Ruhrgebiet tätig.'), 3, 2, 'full-page-1'),
    ).toContain('Einsatzgebiet nur über den geprüften service_area-Token ausgeben.');
    expect(authoredSectionIssues(d.html, 2, 2, 'full-page-1').length).toBeGreaterThan(0);
  });
  it('labels the proposed area and missing assets in draft, removes placeholders and unconfirmed surrounding region live', () => {
    const i = input();
    i.facts.city = 'Testort';
    const draft = renderSite(i);
    expect(draft).toContain('Testort und Umgebung · Vorschlag');
    for (const word of ['Entwurfsplatzhalter', 'Referenzen', 'Teams']) expect(draft).toContain(word);
    const live = renderSite({
      ...i,
      mode: 'live',
      demo: undefined,
      live: { formAction: '/api/forms/abc', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' },
    });
    expect(live).not.toContain('Entwurfsplatzhalter');
    expect(live).not.toContain('data-ad-placeholder=');
    expect(live).not.toContain('Testort und Umgebung');
    expect(live).toContain('action="/api/forms/abc"');
  });
  it('uses a compact font asset, prunes utility CSS, preserves authored media/details selectors', () => {
    const i = input();
    const html = renderSite({
      ...i,
      mode: 'live',
      demo: undefined,
      live: { formAction: '/api/forms/abc', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' },
    });
    const compact = readFileSync(fileURLToPath(new URL('../assets/fonts/kits/archivo-elektro.woff2', import.meta.url))).toString(
      'base64',
    );
    const full = readFileSync(fileURLToPath(new URL('../assets/fonts/kits/archivo.woff2', import.meta.url))).toString('base64');
    expect(html).toContain(compact);
    expect(html).not.toContain(full);
    expect(html).toContain('#sw-ai-design details[open]');
    expect(html).toContain('@media(max-width:600px)');
    expect(html).not.toContain('.k-faecher');
    expect(html).not.toContain('.grid-cols-4');
    expect(Buffer.byteLength(html)).toBeLessThan(160000);
  });
  it('keeps the protected contact markup identical while changing only the CSS theme', () => {
    const dark = renderSite(input());
    const i = input();
    const light = renderSite({
      ...i,
      content: {
        ...i.content,
        design: {
          ...d,
          displayFont: 'bodoni',
          textFont: 'atkinson',
          colors: { background: '#ffffff', foreground: '#202020', accent: '#202020', onAccent: '#ffffff' },
        },
      },
    });
    const form = (h: string) => {
      let result = '';
      const walk = (n: T.Node) => {
        if ('tagName' in n && n.attrs.some((a) => a.name === 'id' && a.value === 'anfrage')) result = serializeOuter(n);
        if ('childNodes' in n) n.childNodes.forEach(walk);
      };
      walk(parseFragment(h));
      return result;
    };
    expect(form(dark)).toBe(form(light));
    expect(dark).toContain('--ad-contact-bg:#202b32');
    expect(dark).toContain("--ad-contact-display:'Kit Archivo',serif");
    expect(dark).toContain('background:var(--ad-contact-bg);color:var(--ad-contact-ink);border-color:var(--ad-contact-ink)');
    expect(light).toContain("--ad-contact-display:'Kit Bodoni',serif");
  });
});
