import { describe, it, expect } from 'vitest';
import { renderSite, renderSubpage, checkAuthoredDesign, authoredText, type AuthoredDesign } from '../src';
import { authoredFragment, scopedDesignCss } from '../src/authored/design';
import { demoInput } from './fixtures';
export const design: AuthoredDesign = {
  concept: 'Ein eigener Satzspiegel',
  displayFont: 'archivo',
  textFont: 'karla',
  colors: { background: '#ffffff', foreground: '#222222', accent: '#f0e0ff', onAccent: '#222222' },
  html: '<div class="ad-page"><h1>{{name}}</h1><p>{{branch}} in {{city}}</p><a href="#anfrage">Anfragen</a><figure><img src="{{image_1}}" alt="Foto"></figure></div>',
  css: '.ad-page{padding:30px;border-radius:24px;background:linear-gradient(#fff,#eee)}h1{font:800 50px/1 var(--display)}@media(max-width:600px){h1{font-size:32px}}',
};
const render = (d = design) => {
  const i = demoInput('authored-handwerk', 'custom');
  return renderSite({ ...i, content: { ...i.content, design: d } });
};
describe('Individuelles HTML/CSS statt Layoutvorgabe', () => {
  it('allows model composition, purple, rounded edges and gradients; scopes every rule', () => {
    expect(checkAuthoredDesign(design)).toEqual([]);
    const h = render();
    expect(h).toContain('data-design="free-design-1"');
    expect(h).toContain('#sw-ai-design .ad-page');
    expect(h).toContain('border-radius:24px');
    expect(h).toContain('background:linear-gradient');
    expect(h).not.toContain('data-kit=');
    expect(scopedDesignCss('.a,.b{color:red}@media(min-width:1px){.c{color:blue}}')).toContain('#sw-ai-design .c');
  });
  it('keeps a second concept exactly instead of substituting the first layout', () => {
    const d = {
      ...design,
      html: '<article class="ad-other"><h1>{{branch}}</h1><p>{{name}}</p></article>',
      css: '.ad-other{display:grid;grid-template-columns:2fr 1fr}',
    };
    const h = render(d);
    expect(h).toContain('class="ad-other"');
    expect(h).toContain('grid-template-columns:2fr 1fr');
    expect(h).not.toContain('class="ad-page"');
  });
  it('fails closed when no own design exists', () => {
    expect(() => renderSite(demoInput('authored-handwerk', 'custom'))).toThrow(/Individueller Entwurf/);
  });
  it('preserves checkout links, prices, disclosure and opt-out outside the authored scope', () => {
    const h = render();
    for (const s of [
      'Website übernehmen',
      '590 €',
      '49 €',
      '12 Monate Mindestlaufzeit',
      'href="#uebernehmen"',
      'hat diese Seite nicht beauftragt',
      'Kein Interesse',
    ])
      expect(h).toContain(s);
    expect(h.indexOf('id="sw-ai-design"')).toBeGreaterThan(h.indexOf('sw-demo-buy'));
    expect(h).toContain('id="uebernehmen"');
    expect(h).toContain('<fieldset disabled>');
  });
  it('retains the live endpoint and legal subpages, with no stock photos live', () => {
    const i = demoInput('authored-handwerk', 'custom');
    const live = {
      ...i,
      mode: 'live' as const,
      demo: undefined,
      content: { ...i.content, design },
      live: {
        formAction: 'https://app.example.de/api/forms/abc',
        imprintPath: 'impressum.html',
        privacyPath: 'datenschutz.html',
      },
    };
    const h = renderSite(live);
    expect(h).toContain('action="https://app.example.de/api/forms/abc"');
    expect(h).not.toContain('class="sw-demo-buy"');
    expect(h).not.toContain('data:image/jpeg');
    expect(renderSubpage(live, { title: 'Impressum', bodyHtml: '<p>Rechtstext</p>' })).toContain('Rechtstext');
  });
  it.each([
    '<script>alert(1)</script>',
    '<form action="https://evil.test"><input></form>',
    '<iframe src="https://evil.test"></iframe>',
    '<style>.sw-demo-buy{display:none}</style>',
    '<img src="{{image_1}}" alt="x" onerror="alert(1)">',
    '<a href="jav&#97;script:alert(1)">Klick</a>',
    '<svg><a href="https://evil.test">x</a></svg>',
  ])('rejects active or unmanaged HTML: %s', (s) => {
    expect(checkAuthoredDesign({ ...design, html: design.html + s }).length).toBeGreaterThan(0);
  });
  it.each([
    '@import "https://evil.test";',
    '.a{background:url(https://evil.test)}',
    '.a{background:u\\72l(x)}',
    'body{display:none}',
    ':root{color:red}',
    '.a{display:none!important}',
    '.a{/* </style><script>alert(1)</script> */color:red}',
    '@media(min-width:1px){color:red}',
    '.a{& .b{color:red}}',
    '+ #uebernehmen{display:none}',
    '.a{behavior:x}',
    '.a::before{content:"Meister seit 1999"}',
  ])('rejects unscoped or active CSS: %s', (css) => {
    expect(checkAuthoredDesign({ ...design, css }).length).toBeGreaterThan(0);
  });
  it('does not let model IDs collide with form/checkout, and checks broken navigation', () => {
    for (const id of ['anfrage', 'uebernehmen', 'sw-ai-design'])
      expect(checkAuthoredDesign({ ...design, html: design.html + `<div id="${id}"></div>` }).length).toBeGreaterThan(0);
    expect(checkAuthoredDesign({ ...design, html: design.html + '<a href="#ad-missing">x</a>' })).toContain(
      'Sprungziel fehlt: ad-missing',
    );
  });
  it('escapes source facts as DOM text and attributes and only uses approved image data', () => {
    const h = authoredFragment(design.html, { name: '<script>x</script>', branch: 'Elektro', city: 'Ort' }, [
      { src: 'data:image/jpeg;base64,AA', alt: 'A " photo', example: true },
    ]);
    expect(h).toContain('&lt;script&gt;');
    expect(h).not.toContain('<script>');
    expect(h).toContain('Symbolbild · keine Aufnahme des Betriebs');
    expect(h).toContain('alt="A &quot; photo"');
    expect(authoredFragment(design.html, {}, [])).not.toContain('<img');
  });
  it('checks visible prose while excluding placeholders and decorative indices', () => {
    expect(authoredText('<h1>{{name}}</h1><p>Garantiert</p><span aria-hidden="true">01</span>')).toBe('Garantiert');
  });
  it('rejects unreadable theme combinations', () => {
    expect(checkAuthoredDesign({ ...design, colors: { ...design.colors, foreground: '#eeeeee' } })).toContain(
      'Text- und Akzentfarben brauchen mindestens 4,5:1 Kontrast.',
    );
  });
});

describe('Vollständige Seiten und Änderungen im freien Entwurf (05.11.2026)', () => {
  it('meldet Kurzseiten: zu wenige Abschnitte, Bilder ungenutzt – aber keine Mindesttextmenge mehr (07.11.2026)', async () => {
    const { authoredCompleteness } = await import('../src');
    const short = authoredCompleteness(design.html, 3);
    expect(short.join(' ')).toMatch(/Abschnitte/);
    expect(short.join(' ')).not.toMatch(/Zeichen/);
    expect(short.join(' ')).toMatch(/Bildslots/);
    const brief = Array.from(
      { length: 5 },
      (_, i) => `<section><h2>Teil ${i}</h2><p>Kurz.</p><img src="{{image_${(i % 2) + 1}}}" alt="x"></section>`,
    ).join('');
    expect(authoredCompleteness(`<div><h1>x</h1>${brief}</div>`, 3)).toEqual([]);
    const sections = Array.from(
      { length: 6 },
      (_, i) =>
        `<section><h2>Teil ${i}</h2><p>${'Fachwissen für Besucher. '.repeat(14)}</p><img src="{{image_${(i % 2) + 1}}}" alt="x"></section>`,
    ).join('');
    expect(authoredCompleteness(`<div><h1>x</h1>${sections}</div>`, 3)).toEqual([]);
  });

  it('übernimmt eine zusätzliche Leistung im Aufbau des vorhandenen Eintrags', async () => {
    const { updateAuthoredCopy } = await import('../src');
    const d = {
      ...design,
      html: '<div class="ad-page"><h1>{{name}}</h1><ul class="ad-l"><li class="ad-i"><h3>Innenanstrich</h3><p>Wände.</p></li><li class="ad-i"><h3>Lackieren</h3><p>Türen.</p></li></ul></div>',
    };
    const i = demoInput('authored-handwerk', 'custom');
    const current = {
      ...i.content,
      services: [
        { title: 'Innenanstrich', text: 'Wände.', icon: 'check' as const },
        { title: 'Lackieren', text: 'Türen.', icon: 'check' as const },
      ],
      design: d,
    };
    const next = {
      ...current,
      services: [...current.services, { title: 'Fassade', text: 'Außenwände.', icon: 'check' as const }],
    };
    const out = updateAuthoredCopy(current, next);
    expect(out.design!.html).toContain('<li class="ad-i"><h3>Fassade</h3><p>Außenwände.</p></li>');
    expect((out.design!.html.match(/class="ad-i"/g) ?? []).length).toBe(3);
    expect(checkAuthoredDesign(out.design!)).toEqual([]);
    const fewer = updateAuthoredCopy(current, { ...current, services: [current.services[1]!] });
    expect(fewer.design!.html).not.toContain('Innenanstrich');
    expect(fewer.design!.html).toContain('Lackieren');
  });

  it('kürzt ungenutztes CSS und nutzt die zugeschnittene Archivo-Datei', () => {
    const h = render();
    // erster <style>-Block = gemeinsames Tailwind-CSS (ungekürzt rund 49 KB)
    expect(h.match(/<style>([\s\S]*?)<\/style>/)![1]!.length).toBeLessThan(25_000);
    expect(h).toContain('url(data:font/woff2;base64,');
    expect(h.length).toBeLessThan(600_000);
  });
});
