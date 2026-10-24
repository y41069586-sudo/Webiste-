import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BranchGroup } from './types';

/**
 * Lizenzfreie Beispielfotos (CC0) für Entwürfe. Lizenz, Urheber und Quelle stehen in den EXIF-Daten
 * jedes Bildes und in assets/images/manifest.json. Sie erscheinen nur im Entwurf und sind dort als
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
export function stockPhotos(group: BranchGroup, seed = 0, branchLabel = ''): StockPhoto[] {
  const list = stockPhotoManifest().filter((p) => p.group === group);
  if (!list.length) return [];
  const start = seed % list.length;
  const rotated = [...list.slice(start), ...list.slice(0, start)];
  // Passende Fotos zuerst (Tanzschule → Ballettschuhe statt Hanteln), Reihenfolge sonst stabil
  const label = branchLabel.toLowerCase();
  const fits = (p: StockPhoto) => (p.keywords ?? []).some((k) => label.includes(k));
  return [...rotated.filter(fits), ...rotated.filter((p) => !fits(p))];
}

export function stockPhotoDataUri(photo: StockPhoto): string {
  let uri = dataCache.get(photo.file);
  if (!uri) {
    uri = `data:image/jpeg;base64,${readFileSync(path.join(imagesDir(), photo.file)).toString('base64')}`;
    dataCache.set(photo.file, uri);
  }
  return uri;
}
