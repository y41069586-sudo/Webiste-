import { createHash } from 'node:crypto';

/**
 * Tempo der Demo (Designrichtlinie 19.11.2026, LCP): Gespeicherte Demos enthalten ihre Bilder als data:-URI, damit sie
 * auch als Notfall-Kopie vollständig bleiben. Beim Ausliefern werden nur die nachgelagerten Bilder (`loading="lazy"`,
 * also nie das Hauptbild oben) durch eigene, zwischenspeicherbare Adressen ersetzt. Das erste Bild bleibt eingebettet.
 * Die Adresse enthält einen Inhalts-Hash; die Bilddatei wird aus derselben gespeicherten Demo gelesen.
 */
const LAZY_DATA_IMG = /<img\b([^>]*?)\bsrc="data:(image\/(?:jpeg|webp|png));base64,([A-Za-z0-9+/=]+)"([^>]*)>/g;
/** Kleine Bilder (Symbole, Absenderfoto) bleiben eingebettet; eine eigene Anfrage lohnt sich erst ab dieser Größe. */
const MIN_OFFLOAD_CHARS = 24_000;

export function demoImageId(base64: string): string {
  return createHash('sha256').update(base64).digest('base64url').slice(0, 22);
}

export function offloadLazyDemoImages(html: string, imagePath: (id: string) => string): { html: string; ids: string[] } {
  const ids: string[] = [];
  const out = html.replace(LAZY_DATA_IMG, (whole, before: string, _mime: string, data: string, after: string) => {
    if (data.length < MIN_OFFLOAD_CHARS || !/\bloading="lazy"/.test(before + after)) return whole;
    const id = demoImageId(data);
    ids.push(id);
    return `<img${before}src="${imagePath(id)}"${after}>`;
  });
  return { html: out, ids };
}

/** Bild mit diesem Hash aus der gespeicherten Demo (nur Bilder, die auch ausgelagert würden). */
export function findDemoImage(html: string, id: string): { mime: string; bytes: Buffer } | null {
  if (!/^[A-Za-z0-9_-]{22}$/.test(id)) return null;
  for (const m of html.matchAll(LAZY_DATA_IMG)) {
    const data = m[3]!;
    if (data.length >= MIN_OFFLOAD_CHARS && demoImageId(data) === id) return { mime: m[2]!, bytes: Buffer.from(data, 'base64') };
  }
  return null;
}
