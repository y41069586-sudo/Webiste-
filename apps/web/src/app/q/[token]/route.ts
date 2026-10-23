import { getConfig, handleScan, esc } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

/** QR-Code-Ziel: Scan zählen (ohne IP/Cookies), dann 302 zur Demo. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await handleScan(token, requestMetaFrom(req.headers));
  if ('redirect' in res) {
    return new Response(null, { status: 302, headers: { location: res.redirect, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
  }
  const cfg = await getConfig();
  if ('gone' in res) {
    return simplePage(
      'Dieser Entwurf ist nicht mehr verfügbar',
      `<p>Der Website-Entwurf wurde inzwischen gelöscht oder ist abgelaufen.</p><p class="muted">Fragen? Schreiben Sie an <a href="mailto:${esc(cfg.sender.email)}">${esc(cfg.sender.email)}</a>.</p>`,
      410,
    );
  }
  return simplePage('Seite nicht gefunden', '<p>Dieser Link ist ungültig.</p>', 404);
}
