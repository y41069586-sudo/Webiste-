import { esc } from '@wbm/core';

/** Schlichte, eigenständige Seite (für 410, Bestätigungen) ohne JS und ohne Tracking. */
export function simplePage(title: string, bodyHtml: string, status = 200): Response {
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${esc(title)}</title>
<style>body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;color:#0f172a;line-height:1.55}
main{max-width:40rem;margin:0 auto;padding:3rem 1.25rem}h1{font-size:1.6rem;margin:0 0 1rem}a{color:#1d4ed8}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:1rem;padding:1.5rem}button{font:inherit;background:#b91c1c;color:#fff;border:0;border-radius:.5rem;padding:.7rem 1.1rem;cursor:pointer}
.muted{color:#475569;font-size:.95rem}</style></head><body><main><div class="card"><h1>${esc(title)}</h1>${bodyHtml}</div></main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}
