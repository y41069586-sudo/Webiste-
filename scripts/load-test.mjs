#!/usr/bin/env node
// Einfacher Lasttest ohne Zusatzpakete: node scripts/load-test.mjs <BASE_URL> <demoSlug> <trackToken> [anzahl] [parallel]
// Misst Latenzen (p50/p95/p99) und Fehlerquote der öffentlichen Routen (QR, Demo, Checkout, Health).
const [base, slug, token, totalArg = '600', concArg = '25'] = process.argv.slice(2);
if (!base || !slug || !token) {
  console.error('Aufruf: node scripts/load-test.mjs <BASE_URL> <demoSlug> <trackToken> [anzahl] [parallel]');
  process.exit(2);
}
const total = Number(totalArg);
const conc = Number(concArg);
const routes = [
  { name: 'QR-Scan /q', path: `/q/${token}`, expect: [302] },
  { name: 'Demo /d', path: `/d/${slug}`, expect: [200] },
  { name: 'Checkout', path: `/checkout/${slug}`, expect: [200] },
  { name: 'Health', path: '/api/health', expect: [200] },
];
const stats = new Map(routes.map((r) => [r.name, { ms: [], errors: 0 }]));
let next = 0;
async function worker() {
  while (next < total) {
    const i = next++;
    const r = routes[i % routes.length];
    const t0 = performance.now();
    try {
      const res = await fetch(base + r.path, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (Lasttest) Chrome/130', 'x-forwarded-for': `10.0.${(i >> 8) & 255}.${i & 255}` } });
      await res.arrayBuffer();
      if (!r.expect.includes(res.status)) stats.get(r.name).errors++;
    } catch {
      stats.get(r.name).errors++;
    }
    stats.get(r.name).ms.push(performance.now() - t0);
  }
}
const start = performance.now();
await Promise.all(Array.from({ length: conc }, worker));
const secs = (performance.now() - start) / 1000;
const q = (a, p) => a.sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] ?? 0;
let failed = false;
console.log(`${total} Anfragen, ${conc} parallel, ${secs.toFixed(1)} s, ${(total / secs).toFixed(0)} Anfragen/s`);
for (const [name, s] of stats) {
  const p95 = q(s.ms, 0.95);
  console.log(`${name.padEnd(14)} n=${s.ms.length} p50=${q(s.ms, 0.5).toFixed(0)}ms p95=${p95.toFixed(0)}ms p99=${q(s.ms, 0.99).toFixed(0)}ms Fehler=${s.errors}`);
  if (s.errors > 0 || p95 > 1500) failed = true;
}
process.exit(failed ? 1 : 0);
