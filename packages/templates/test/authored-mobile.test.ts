import { describe, expect, it } from 'vitest';
import { applyMobileHeroLayer, MOBILE_LAYER_VERSION } from '../src';

const page = (design: string) =>
  `<!doctype html><html lang="de"><head><style>.x{}</style></head><body class="k"><main id="inhalt"><div id="sw-ai-design">${design}</div></main></body></html>`;

describe('Handy-Einstieg als Vollbild-Foto mit Text darüber', () => {
  it('Einstieg ohne eigenes Bild: erstes Seitenbild nur fürs Handy übernehmen, samt Symbolbild-Hinweis', () => {
    const html = page(
      '<div class="ad-page"><header class="ad-top"><p>Auftragszettel</p><h1>Pintura Bau</h1><a href="#anfrage">Anfrage</a></header>' +
        '<section data-ad-section="gallery"><h2>Bilder</h2><figure><img src="data:image/jpeg;base64,AAA" alt="Farbrolle"><span class="ad-stock-note">Symbolbild · keine Aufnahme des Betriebs</span></figure></section></div>',
    );
    const out = applyMobileHeroLayer(html);
    expect(out).toContain('<header class="ad-top" data-ad-hero="section">');
    expect(out).toMatch(
      /<header class="ad-top" data-ad-hero="section"><figure data-ad-hero="media" data-ad-hero-added="1" aria-hidden="true"><img src="data:image\/jpeg;base64,AAA" alt="" decoding="async"><span class="ad-stock-note">Symbolbild/,
    );
    expect(out).toContain(`data-mobile-layer="${MOBILE_LAYER_VERSION}"`);
    expect(out).toContain('<style id="sw-mobile-layer">');
    // Desktop bleibt unverändert: übernommenes Bild ist außerhalb der Handy-Breite ausgeblendet
    expect(out).toContain('#sw-ai-design [data-ad-hero-added]{display:none}');
    expect(out).toContain('@media (max-width:700px)');
    // Galerie-Bild bleibt, wo es war
    expect(out).toContain('alt="Farbrolle"');
    expect(applyMobileHeroLayer(out)).toBe(out);
    // übriger Seitentext bleibt exakt erhalten
    expect(
      out.replace(
        / data-ad-hero="section"| data-mobile-layer="1"|<figure data-ad-hero="media"[\s\S]*?<\/figure>|<style id="sw-mobile-layer">[\s\S]*?<\/style>/g,
        '',
      ),
    ).toBe(html);
  });

  it('Einstieg mit eigenem Bild: die figure wird zur Hintergrundfläche, kein zusätzliches Bild', () => {
    const out = applyMobileHeroLayer(
      page(
        '<div class="ad-page"><header class="ad-hero"><div class="ad-hero-text"><h1>Elektro Reiche</h1></div><figure class="ad-hero-fig"><img src="data:image/jpeg;base64,BBB" alt="Verteiler"><figcaption>Beispielfoto</figcaption></figure></header><section data-ad-section="services"><h2>Leistungen</h2></section></div>',
      ),
    );
    expect(out).toContain('<header class="ad-hero" data-ad-hero="section">');
    expect(out).toContain('<figure class="ad-hero-fig" data-ad-hero="media">');
    expect(out).not.toMatch(/<figure[^>]*data-ad-hero-added/);
  });

  it('ohne erkennbaren Einstieg (h1 direkt neben Inhaltsbereichen) oder ohne freien Entwurf unverändert', () => {
    const flat = page('<h1>Name</h1><section data-ad-section="services"><h2>Leistungen</h2></section>');
    expect(applyMobileHeroLayer(flat)).toBe(flat);
    const kit = '<!doctype html><html><head></head><body><main><h1>Kit</h1></main></body></html>';
    expect(applyMobileHeroLayer(kit)).toBe(kit);
  });
});
