import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let cached: string | undefined;

/** Pfad zur kompilierten Tailwind-CSS (pnpm --filter @wbm/templates build). */
export function siteCssPath(): string {
  // Basis-URL in Variable, damit Bundler den Pfad nicht als Asset auflösen
  const base = import.meta.url;
  return process.env.TEMPLATES_CSS_PATH ?? fileURLToPath(new URL('../dist/site.css', base));
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
