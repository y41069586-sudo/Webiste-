import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let cached: string | undefined;

/** Pfad zur kompilierten Tailwind-CSS (pnpm --filter @wbm/templates build). */
export function siteCssPath(): string {
  if (process.env.TEMPLATES_CSS_PATH) return process.env.TEMPLATES_CSS_PATH;
  // Bewusst kein `new URL(rel, import.meta.url)`, damit Bundler den Pfad nicht als Asset behandeln
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '..', 'dist', ['site', 'css'].join('.'));
}

export function readSiteCss(): string {
  if (cached === undefined) {
    const p = siteCssPath();
    if (!existsSync(p)) {
      throw new Error(`Template-CSS fehlt (${p}). Bitte \`pnpm --filter @wbm/templates build\` ausführen.`);
    }
    cached = readFileSync(p, 'utf8');
  }
  return cached;
}
