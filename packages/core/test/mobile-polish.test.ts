import { describe, expect, it } from 'vitest';
import { dedupeDemoImages, polishDemoForMobile } from '../src/demos/mobile-polish';

const a = 'data:image/jpeg;base64,' + 'A'.repeat(30_000);
const b = 'data:image/jpeg;base64,' + 'B'.repeat(30_000);

describe('Handy-Feinschliff der Demos (17.11.2026)', () => {
  it('lässt das erste Vorkommen eines Fotos stehen und entfernt Wiederholungen in Abbildungen', () => {
    const html = `<head></head><figure class="hero"><img src="${a}"></figure><article><img src="${a}" alt="x"><span class="ad-stock-note">Symbolbild · keine Aufnahme</span><h3>Leistung</h3></article><section id="ad-galerie" class="gallery"><h2>Einblicke</h2><figure><img src="${a}"><span>Symbolbild</span></figure><figure><img src="${b}"></figure></section>`;
    const out = dedupeDemoImages(html);
    expect(out.split(`src="${a}"`).length - 1).toBe(1); // nur das Hero-Bild bleibt
    expect(out).toContain('<article><h3>Leistung</h3></article>'); // Kachel ohne Bild und ohne verwaisten Hinweis
    expect(out).toContain(b);
    expect(out).toContain('Einblicke');
  });

  it('entfernt eine Galerie, die nur aus Wiederholungen bestand', () => {
    const html = `<figure><img src="${a}"></figure><section id="ad-galerie"><h2>Einblicke</h2><figure><img src="${a}"></figure></section><p>Kontakt</p>`;
    const out = dedupeDemoImages(html);
    expect(out).not.toContain('Einblicke');
    expect(out).toContain('Kontakt');
  });

  it('Logos und kleine Symbole bleiben mehrfach erhalten', () => {
    const logo = 'data:image/png;base64,' + 'L'.repeat(500);
    const html = `<img src="${logo}"><footer><img src="${logo}"></footer>`;
    expect(dedupeDemoImages(html)).toBe(html);
  });

  it('fügt die Handy-Regeln genau einmal ein', () => {
    const once = polishDemoForMobile(`<html><head><title>x</title></head><body></body></html>`);
    expect(once).toContain('min-height:44px');
    expect(polishDemoForMobile(once)).toBe(once);
  });
});
