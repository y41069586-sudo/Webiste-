// Kompiliert die Template-CSS (Tailwind v4) nach dist/site.css (minifiziert).
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
mkdirSync(path.join(root, 'dist'), { recursive: true });
execFileSync(process.execPath, [cli, '-i', 'styles/site.css', '-o', 'dist/site.css', '--minify'], { cwd: root, stdio: 'inherit' });
const size = statSync(path.join(root, 'dist/site.css')).size;
console.log(`dist/site.css: ${(size / 1024).toFixed(1)} KB`);
