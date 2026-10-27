import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BranchGroup } from './types';

/**
 * Kuratierte CC0-/Pexels-/Burst-Fotos und getrennt dokumentierte KI-Beispielbilder für Entwürfe. Herkunft und
 * Nutzungsgrundlage stehen in assets/images/manifest.json und den EXIF-Lizenzdaten. Sie erscheinen nur im Entwurf und sind dort als
 * „Beispielfoto“ gekennzeichnet – auf Live-Seiten stehen nur Fotos des Kunden.
 */
export interface StockPhoto {
  file: string;
  group: BranchGroup;
  alt: string;
  title: string;
  creator: string | null;
  license: string;
  licenseUrl: string;
  source: string;
  sourceUrl: string;
  openverseId: string;
  checkedAt: string;
  /** Stichwörter für die Auswahl passend zur Branche (z. B. „tanz“ für eine Tanzschule) */
  keywords?: string[];
  kind?: 'generated';
  reviewOnly?: boolean;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
  moods?: ('warm' | 'neutral' | 'dark' | 'natural')[];
  role?: 'work' | 'detail' | 'interior' | 'product';
  /** Deliberately curated main composition, not a claim that this is the business's work. */
  hero?: boolean;
}

export function imagesDir(): string {
  if (process.env.TEMPLATES_IMAGES_DIR) return process.env.TEMPLATES_IMAGES_DIR;
  // Bewusst kein `new URL(rel, import.meta.url)`, damit Bundler den Pfad nicht als Asset behandeln
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '..', 'assets', 'images');
}

let manifest: StockPhoto[] | undefined;
const dataCache = new Map<string, string>();

export function stockPhotoManifest(): StockPhoto[] {
  if (!manifest) {
    const p = path.join(imagesDir(), 'manifest.json');
    manifest = existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as StockPhoto[]) : [];
  }
  return manifest;
}

/** Fotos einer Gruppe in fester, vom Seed abhängiger Reihenfolge (Abwechslung zwischen Demos). */
export function stockPhotos(
  group: BranchGroup,
  seed = 0,
  branchLabel = '',
  opts: { includeReview?: boolean; allowGenerated?: boolean; mood?: 'warm' | 'neutral' | 'dark' | 'natural' } = {},
): StockPhoto[] {
  const root = path.resolve(imagesDir());
  const list = stockPhotoManifest().filter((p) => {
    const file = path.resolve(root, p.file);
    return (
      p.group === group &&
      (!p.reviewOnly || opts.includeReview) &&
      (p.license === 'CC0 1.0' ||
        (p.license === 'Pexels License' &&
          p.source === 'Pexels' &&
          p.licenseUrl === 'https://www.pexels.com/license/' &&
          /^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+-\d+\/$/.test(p.sourceUrl) &&
          Boolean(p.creator)) ||
        (p.license === 'Burst Some Rights Reserved' &&
          p.source === 'Burst' &&
          p.licenseUrl === 'https://www.shopify.com/stock-photos/licenses/shopify-some-rights-reserved' &&
          /^https:\/\/www\.shopify\.com\/stock-photos\/photos\/[a-z0-9-]+$/.test(p.sourceUrl) &&
          Boolean(p.creator)) ||
        (opts.allowGenerated === true &&
          p.kind === 'generated' &&
          p.source === 'OpenAI image generation' &&
          p.license === 'Generated – OpenAI terms')) &&
      Boolean(p.sourceUrl && p.checkedAt) &&
      file.startsWith(root + path.sep) &&
      existsSync(file)
    );
  });
  if (!list.length) return [];
  const start = ((seed % list.length) + list.length) % list.length;
  const rotated = [...list.slice(start), ...list.slice(0, start)];
  // Passende Fotos zuerst (Tanzschule → Ballettschuhe statt Hanteln), Reihenfolge sonst stabil
  const label = branchLabel.toLowerCase();
  const fits = (p: StockPhoto) => (p.keywords ?? []).some((k) => label.includes(k));
  const matching = rotated.filter(fits);
  // Prefer a relevant activity/detail over another generic interior. Ties keep stable variety.
  const roleOrder = { work: 0, detail: 1, product: 1, interior: 2 };
  matching.sort(
    (a, b) =>
      Number(Boolean(b.moods?.includes(opts.mood!))) - Number(Boolean(a.moods?.includes(opts.mood!))) ||
      Number(Boolean(b.hero)) - Number(Boolean(a.hero)) ||
      roleOrder[a.role ?? 'interior'] - roleOrder[b.role ?? 'interior'],
  );
  // Unknown specialties must not silently receive an unrelated service photograph.
  return matching.length ? matching : label.trim() ? rotated.filter((p) => !p.keywords?.length) : rotated;
}

export function stockPhotoDataUri(photo: StockPhoto): string {
  let uri = dataCache.get(photo.file);
  if (!uri) {
    const mime = photo.file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    uri = `data:${mime};base64,${readFileSync(path.join(imagesDir(), photo.file)).toString('base64')}`;
    dataCache.set(photo.file, uri);
  }
  return uri;
}
