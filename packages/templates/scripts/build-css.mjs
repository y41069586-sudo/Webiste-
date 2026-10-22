// Platzhalter – wird in Phase 3 durch den Tailwind-Build der Templates ersetzt.
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/.built', import.meta.url), new Date().toISOString());
