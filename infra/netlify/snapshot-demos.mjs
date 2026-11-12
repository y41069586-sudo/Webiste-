#!/usr/bin/env node
// Notbetrieb (13.11.2026): erzeugt statische Kopien der Demos aus apps/web/src/lib/demo-fallback-map.json für den
// Fall, dass Supabase gesperrt ist. Aufruf vor einer Veröffentlichung im Export-Verzeichnis:
//   node infra/netlify/snapshot-demos.mjs <export>/apps/web/public/notfall [https://seitenwerkworld.netlify.app]
// Abruf als Bot (zählt keinen Aufruf). Kauf-, Frage- und Kein-Interesse-Wege brauchen die Datenbank und werden in der
// Kopie durch E-Mail-Kontakt ersetzt. Die Kopien liegen nicht im Repository (.gitignore).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [outDir, base = 'https://seitenwerkworld.netlify.app'] = process.argv.slice(2);
if (!outDir) {
  console.error('Zielordner fehlt.');
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(await readFile(path.join(here, '../../apps/web/src/lib/demo-fallback-map.json'), 'utf8'));
const slugs = [...new Set(Object.values(map.tokens))].slice(0, Number(process.env.SNAPSHOT_LIMIT) || undefined);
const contact = process.env.SNAPSHOT_CONTACT || 'support@seitenwerk.world';
await mkdir(outDir, { recursive: true });

const box = (slug) =>
  `<section id="kontakt-notfall" style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:24px;border-radius:18px;background:#fff;border:1px solid #e2e8f0"><h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Interesse oder Fragen?</h2><p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#334155">Schreiben Sie mir einfach eine kurze E-Mail – ich passe den Entwurf kostenlos an und schicke Ihnen alle Details.</p><a href="mailto:${contact}?subject=${encodeURIComponent('Website-Entwurf ' + slug.slice(0, 6))}" style="display:block;text-align:center;min-height:50px;line-height:50px;border-radius:12px;background:#0f172a;color:#fff;font-weight:650;text-decoration:none">E-Mail schreiben</a></div></section>`;

let ok = 0;
for (const slug of slugs) {
  const res = await fetch(`${base}/d/${slug}`, { headers: { 'user-agent': 'seitenwerk-notfall-snapshot-bot' } });
  if (!res.ok) {
    console.error(`übersprungen (${res.status}): ${slug.slice(0, 6)}…`);
    continue;
  }
  let html = await res.text();
  const mail = (subject) => `mailto:${contact}?subject=${encodeURIComponent(subject + ' ' + slug.slice(0, 6))}`;
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(new RegExp(`/d/${slug}/uebernehmen(\\?[^"']*)?`, 'g'), mail('Website übernehmen'))
    .replaceAll(`/d/${slug}/kein-interesse`, mail('Kein Interesse'))
    .replace('</head>', '<meta name="robots" content="noindex, nofollow"><style>form[action^="/d/"],#link-per-email{display:none!important}</style></head>')
    .replace(/<section id="uebernehmen"/, (m) => box(slug) + m);
  if (!html.includes('kontakt-notfall')) html = html.replace('</body>', box(slug) + '</body>');
  await writeFile(path.join(outDir, `${slug}.html`), html);
  ok++;
}
console.log(JSON.stringify({ kopien: ok, von: slugs.length }));
process.exit(ok === slugs.length ? 0 : 1);
