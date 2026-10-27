/**
 * Statischer Export der Firmen-Website (z. B. für Netlify) – nur die öffentlichen Seiten, ohne Admin,
 * Demos, Checkout und Datenbank. Liest die Seiten von einer laufenden Produktions-Instanz
 * (`next build` + `next start` mit SITE_STATIC=true) und legt sie mit den statischen Dateien in `out/` ab.
 *
 * Aufruf: node scripts/export-site.mjs [Basis-URL]   (Standard: http://localhost:3200)
 * Indexierung folgt SITE_INDEXABLE (Standard: aus → noindex per Header und robots.txt).
 * Platzhalter-Anbieterdaten oder Legacy-Preise sperren den Export (export-guard.mjs).
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPublicPage } from './export-guard.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, '..');
const out = path.join(app, 'out');
const base = (process.argv[2] ?? 'http://localhost:3200').replace(/\/$/, '');
const indexable = process.env.SITE_INDEXABLE === 'true';

export const ROUTES = [
  '/',
  '/so-funktionierts',
  '/preise',
  '/garantie',
  '/beispiele',
  '/ueber-mich',
  '/kontakt',
  '/impressum',
  '/datenschutz',
  '/agb',
  '/quellen',
];

async function page(route) {
  const res = await fetch(base + route, { redirect: 'manual' });
  if (res.status !== 200) throw new Error(`${route}: HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes('<h1')) throw new Error(`${route}: keine Überschrift – Seite unvollständig?`);
  return html;
}

async function main() {
  // Erst alle Seiten laden und prüfen; bei Befunden wird nichts geschrieben (kein halber Export)
  const pages = [];
  for (const route of ROUTES) pages.push([route, await page(route)]);
  const findings = pages.flatMap(([route, html]) => checkPublicPage(route, html));
  if (findings.length) {
    throw new Error(`Export gesperrt – nicht veröffentlichbar:\n- ${findings.join('\n- ')}`);
  }
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const [route, html] of pages) {
    const file = route === '/' ? path.join(out, 'index.html') : path.join(out, route.slice(1), 'index.html');
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, html);
    console.log(`${route} ✓`);
  }
  // Fehlerseite für unbekannte Pfade (Netlify liefert 404.html automatisch aus)
  const missing = await fetch(`${base}/diese-seite-gibt-es-nicht`);
  writeFileSync(path.join(out, '404.html'), await missing.text());

  cpSync(path.join(app, 'public'), out, { recursive: true });
  const statics = path.join(app, '.next', 'static');
  if (!existsSync(statics)) throw new Error('.next/static fehlt – zuerst `next build` ausführen');
  cpSync(statics, path.join(out, '_next', 'static'), { recursive: true });

  writeFileSync(path.join(out, 'robots.txt'), indexable ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n');
  const headers = [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  X-Frame-Options: SAMEORIGIN',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()',
    ...(indexable ? [] : ['  X-Robots-Tag: noindex, nofollow']),
    '/_next/static/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ];
  writeFileSync(path.join(out, '_headers'), headers.join('\n'));
  console.log(`Export fertig: ${out} (${indexable ? 'indexierbar' : 'noindex'})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
