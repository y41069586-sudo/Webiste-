import { getConfig, DEFAULT_CONFIG, publicOperatorSettings, handleScan, esc } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';
import { fallbackRedirect, fallbackSlugForToken, withTimeout } from '@/lib/demo-fallback';

export const dynamic = 'force-dynamic';

/** QR-Code-Ziel: Scan zählen (ohne IP/Cookies), dann 302 zur Demo. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let res: Awaited<ReturnType<typeof handleScan>>;
  try {
    res = await withTimeout(handleScan(token, requestMetaFrom(req.headers)));
  } catch {
    return fallbackRedirect(req, fallbackSlugForToken(token), 'QR-Code');
  }
  if ('redirect' in res) {
    return new Response(null, {
      status: 302,
      headers: { location: res.redirect, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' },
    });
  }
  const cfg = publicOperatorSettings(await getConfig().catch(() => DEFAULT_CONFIG), DEFAULT_CONFIG.sender);
  if ('gone' in res) {
    return simplePage(
      'Dieser Entwurf ist nicht mehr verfügbar',
      `<p>Der Website-Entwurf ist abgelaufen oder wurde gelöscht.</p><p>Sie möchten ihn trotzdem sehen oder eine Website für Ihren Betrieb? Schreiben Sie einfach an <a href="mailto:${esc(cfg.sender.email)}">${esc(cfg.sender.email)}</a> – ich stelle den Entwurf gern kostenlos und unverbindlich wieder bereit.</p>`,
      410,
    );
  }
  return simplePage('Seite nicht gefunden', '<p>Dieser Link ist ungültig.</p>', 404);
}
