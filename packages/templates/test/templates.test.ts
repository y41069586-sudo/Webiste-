import { describe, expect, it } from 'vitest';
import { contrastRatio, PALETTES, renderSite, TEMPLATES } from '../src';
import { demoInput, sampleContent } from './fixtures';

describe('Paletten (WCAG 2.1 AA)', () => {
  for (const p of PALETTES) {
    it(`${p.id}: alle Text-/Hintergrund-Kombinationen ≥ 4,5:1`, () => {
      const pairs: [string, string, string][] = [
        ['ink/surface', p.ink, p.surface],
        ['ink/surfaceAlt', p.ink, p.surfaceAlt],
        ['muted/surface', p.muted, p.surface],
        ['muted/surfaceAlt', p.muted, p.surfaceAlt],
        ['onPrimary/primary', p.onPrimary, p.primary],
        ['onPrimary/primaryDark', p.onPrimary, p.primaryDark],
        ['onAccent/accent', p.onAccent, p.accent],
        ['primary/surface', p.primary, p.surface],
        ['primary/surfaceAlt', p.primary, p.surfaceAlt],
      ];
      for (const [name, fg, bg] of pairs) {
        expect(contrastRatio(fg, bg), name).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe('Templates', () => {
  it('3 Templates je Branchengruppe mit je 3 Paletten', () => {
    for (const g of ['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse'] as const) {
      const ts = TEMPLATES.filter((t) => t.group === g);
      expect(ts).toHaveLength(3);
      for (const t of ts) expect(t.palettes).toHaveLength(3);
    }
  });

  for (const t of TEMPLATES) {
    for (const palette of t.palettes) {
      it(`${t.id} / ${palette}: Demo-Modus enthält Banner, noindex, Pflichtabschnitte`, () => {
        const html = renderSite(demoInput(t.id, palette, t.group));
        expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
        expect(html).toContain('<html lang="de">');
        expect(html).toContain('<meta name="robots" content="noindex, nofollow, noarchive">');
        expect(html).toContain('Unverbindlicher Entwurf');
        expect(html).toContain('Seite übernehmen');
        expect(html).toContain('href="#uebernehmen"');
        expect(html).toContain('Frage per WhatsApp');
        expect(html).toContain('https://wa.me/491701234567?text=');
        // Zwei gleichwertige Karten, Mindestlaufzeit neben den 49 €, Folgepreis sichtbar
        expect(html).toContain('id="uebernehmen"');
        expect(html).toContain('590 €');
        expect(html).toContain('49 €');
        expect(html).toContain('12 Monate Mindestlaufzeit');
        expect(html).toContain('Ab Monat 13 nur noch 19 €/Monat');
        expect(html).toContain('Wer hat diesen Entwurf gebaut?');
        expect(html).not.toContain('checked');
        expect(html).toContain('Kein Interesse');
        expect(html).toContain('Frage zu diesem Entwurf');
        expect(html).toContain('hat diese Seite nicht beauftragt');
        // Gastronomie: im Entwurf ersetzt die Beispiel-Speisekarte den Angebotsabschnitt
        const offerId = t.group === 'gastronomie' ? 'speisekarte' : 'leistungen';
        expect(html).toContain(t.group === 'gastronomie' ? 'Beispiel-Speisekarte' : 'Beispiel-Leistungen');
        for (const id of [offerId, 'ueber-uns', 'oeffnungszeiten', 'frage']) expect(html).toContain(`id="${id}"`);
        expect(html).toContain('openstreetmap.org/search');
        expect(html).not.toMatch(/maps\.google|googleapis|<script(?! type="application\/ld\+json")/);
        expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
        for (const s of sampleContent.services) expect(html).toContain(s.title);
        expect(html.replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, '')).not.toMatch(/undefined|\[object Object\]|NaN/);
      });
    }
  }

  it('Live-Modus: kein Banner, indexierbar, Formular an Kunden-Endpoint, JSON-LD', () => {
    const t = TEMPLATES[0]!;
    const base = demoInput(t.id, t.palettes[0]!);
    const html = renderSite({
      ...base,
      mode: 'live',
      demo: undefined,
      live: {
        formAction: 'https://app.example.de/api/forms/abc',
        imprintPath: 'impressum.html',
        privacyPath: 'datenschutz.html',
        canonicalUrl: 'https://malerbetrieb-beispiel.de/',
      },
    });
    expect(html).not.toContain('Unverbindlicher Entwurf');
    expect(html).not.toContain('noindex');
    expect(html).not.toContain('Beispiel-Leistungen');
    expect(html).toContain('action="https://app.example.de/api/forms/abc"');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('href="impressum.html"');
  });

  it('Screenshot-Modus: ohne Banner, aber noindex', () => {
    const html = renderSite({ ...demoInput('beauty-soft', 'salbei', 'beauty'), mode: 'screenshot' });
    expect(html).not.toContain('Unverbindlicher Entwurf');
    expect(html).not.toContain('id="uebernehmen"');
    expect(html).not.toContain('wa.me');
    expect(html).toContain('noindex');
  });

  it('escaped Benutzereingaben (XSS)', () => {
    const input = demoInput('handwerk-klar', 'werkblau');
    input.facts.name = '<script>alert(1)</script> & Co';
    input.content = { ...input.content, hero_headline: '"><img src=x onerror=alert(1)>' };
    const html = renderSite(input);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('Beispielfotos (lizenzfrei, nur im Entwurf)', () => {
  it('Manifest: jede Datei vorhanden, CC0, Quelle, Lizenz auch in den EXIF-Daten', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const { imagesDir, stockPhotoManifest } = await import('../src');
    const list = stockPhotoManifest();
    expect(list.length).toBeGreaterThanOrEqual(9);
    for (const g of ['gastronomie', 'einzelhandel', 'kurse'] as const)
      expect(list.filter((p) => p.group === g).length, g).toBeGreaterThanOrEqual(3);
    for (const p of list) {
      expect(p.license, p.file).toMatch(/^CC0/);
      expect(p.sourceUrl).toMatch(/^https:\/\//);
      expect(p.alt.length).toBeGreaterThan(5);
      const bytes = readFileSync(path.join(imagesDir(), p.file));
      expect(bytes.length, p.file).toBeLessThan(150_000);
      expect(bytes.toString('latin1'), `${p.file}: EXIF`).toContain('CC0');
      expect(bytes.toString('latin1')).toContain(p.sourceUrl);
    }
  });

  it('Entwurf zeigt gekennzeichnete Beispielfotos; Vorschau und Live nie', () => {
    const t = TEMPLATES.find((x) => x.id === 'gastronomie-foto')!;
    const demo = renderSite(demoInput(t.id, t.palettes[0]!, 'gastronomie'));
    expect(demo).toContain('data:image/jpeg;base64,');
    expect(demo).toContain('Beispielfoto');
    for (const mode of ['preview', 'live'] as const) {
      const html = renderSite({
        ...demoInput(t.id, t.palettes[0]!, 'gastronomie'),
        mode,
        demo: undefined,
        live: { formAction: '/api/forms/x', imprintPath: 'impressum.html', privacyPath: 'datenschutz.html' },
      });
      expect(html, mode).not.toContain('Beispielfoto');
      expect(html, mode).not.toContain('data:image/jpeg;base64,');
    }
  });

  it('passende Fotos zuerst (Tanzschule → Ballettschuhe)', async () => {
    const { stockPhotos } = await import('../src');
    expect(stockPhotos('kurse', 0, 'Tanzschule')[0]!.file).toBe('kurse/ballettschuhe.jpg');
    expect(stockPhotos('kurse', 0, 'Yogastudio')[0]!.file).toBe('kurse/yogamatte.jpg');
  });
});
