/**
 * Kompiliert die wichtigsten Routen des Dev-Servers vor dem ersten Test. Ohne Aufwärmen bricht der
 * Dev-Server bei der Erstkompilierung gelegentlich Navigationen ab (ERR_ABORTED).
 */
export default async function warmup(): Promise<void> {
  const base = `http://localhost:${Number(process.env.E2E_PORT ?? 3100)}`;
  const dummy = 'a'.repeat(32);
  const routes = [
    '/login',
    '/admin',
    '/admin/claims',
    '/admin/letters',
    '/admin/settings',
    '/quellen',
    '/api/health',
    // dynamische Seiten mit Client-Komponenten (404 genügt, die Route wird dabei kompiliert)
    `/checkout/${dummy}`,
    `/checkout/${dummy}/erfolg`,
    `/onboarding/${dummy}`,
  ];
  for (const r of routes) {
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(base + r, { redirect: 'manual', signal: AbortSignal.timeout(120_000) });
        if (res.status < 500) break;
      } catch {
        // Server kompiliert noch
      }
      await new Promise((ok) => setTimeout(ok, 2000));
    }
  }
}
