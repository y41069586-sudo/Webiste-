import { describe, expect, it } from 'vitest';
import { demoImageId, findDemoImage, offloadLazyDemoImages } from '../src/services/demo-images';

const big = Buffer.alloc(30_000, 7).toString('base64');
const small = Buffer.alloc(100, 1).toString('base64');
const html = `<main><img src="data:image/jpeg;base64,${big}" alt="Hauptbild" loading="eager" fetchpriority="high"><img src="data:image/webp;base64,${big}A" alt="Galerie" loading="lazy"><img src="data:image/png;base64,${small}" alt="" loading="lazy"></main>`;

describe('Demo-Bilder auslagern (Tempo)', () => {
  it('lagert nur große, nachgelagerte Bilder aus; Hauptbild und kleine Bilder bleiben eingebettet', () => {
    const out = offloadLazyDemoImages(html, (id) => `/d/slug/bild/${id}`);
    expect(out.ids).toHaveLength(1);
    expect(out.html).toContain(`src="/d/slug/bild/${out.ids[0]}" alt="Galerie" loading="lazy"`);
    expect(out.html).toContain('alt="Hauptbild" loading="eager"');
    expect(out.html).toContain(`data:image/png;base64,${small}`);
    expect(out.html.length).toBeLessThan(html.length - 30_000);
  });

  it('liefert genau das eingebettete Bild zum Hash, sonst nichts', () => {
    const id = demoImageId(`${big}A`);
    const img = findDemoImage(html, id)!;
    expect(img.mime).toBe('image/webp');
    expect(img.bytes.equals(Buffer.from(`${big}A`, 'base64'))).toBe(true);
    expect(findDemoImage(html, 'x'.repeat(22))).toBeNull();
    expect(findDemoImage(html, '../../etc/passwd')).toBeNull();
  });
});
