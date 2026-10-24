import { createHash } from 'node:crypto';
import { findPublicDemo, formatDateDe, getConfig, getProviders, recordEvent, getDb, esc } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

const EXPIRES_PLACEHOLDER = '__WBM_EXPIRES_LABEL__';

/**
 * Messung ohne Cookies (B6.1): Verweildauer, Scrolltiefe und angeklickte Abschnitte per sendBeacon an
 * /d/{slug}/beacon – keine Speicherung im Browser, keine Kennungen. Erlaubt per CSP-Hash, sonst kein Skript.
 */
const BEACON_SCRIPT =
  '(function(){var s=Date.now(),m=0,c={},d=false;function p(){var h=document.documentElement,v=(window.scrollY+window.innerHeight)/Math.max(1,h.scrollHeight);if(v>m)m=v}' +
  "window.addEventListener('scroll',p,{passive:true});p();" +
  "document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href^=\"#\"]');if(a){var id=a.getAttribute('href').slice(1);if(/^[a-z0-9-]{1,40}$/.test(id))c[id]=1}});" +
  "function send(){if(d||!navigator.sendBeacon)return;d=true;navigator.sendBeacon(location.pathname.replace(/\\/$/,'')+'/beacon',JSON.stringify({t:Math.round((Date.now()-s)/1000),s:Math.round(m*100),c:Object.keys(c)}))}" +
  "window.addEventListener('pagehide',send);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')send()})})();";
const BEACON_HASH = createHash('sha256').update(BEACON_SCRIPT).digest('base64');

const DEMO_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'private, no-store',
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'referrer-policy': 'no-referrer',
  'content-security-policy': `default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'sha256-${BEACON_HASH}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
};

/** Demo-Auslieferung: nur veröffentlichte, nicht abgelaufene Entwürfe; sonst 410. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findPublicDemo(slug);
  if (found.state === 'not_found') return simplePage('Seite nicht gefunden', '<p>Dieser Link ist ungültig.</p>', 404);
  if (found.state === 'gone') {
    const cfg = await getConfig();
    return simplePage(
      'Dieser Entwurf ist nicht mehr verfügbar',
      `<p>Der Website-Entwurf ist abgelaufen oder wurde gelöscht.</p><p class="muted">Fragen? <a href="mailto:${esc(cfg.sender.email)}">${esc(cfg.sender.email)}</a></p>`,
      410,
    );
  }
  const html = await getProviders().storage.get(found.demo.htmlStorageKey ?? '');
  if (!html) return simplePage('Nicht verfügbar', '<p>Der Entwurf ist vorübergehend nicht verfügbar.</p>', 503);
  const cfg = await getConfig();
  const label = found.demo.expiresAt ? `am ${formatDateDe(found.demo.expiresAt)}` : 'nach Ablauf der Frist';
  await recordEvent(getDb(), { leadId: found.lead.id, type: 'demo_view', req: requestMetaFrom(req.headers), dedupeDaily: true });
  const page = html
    .toString('utf8')
    .replaceAll(EXPIRES_PLACEHOLDER, label)
    .replace('</body>', cfg.metrics.engagementBeacon ? `<script>${BEACON_SCRIPT}</script></body>` : '</body>');
  return new Response(page, { status: 200, headers: DEMO_HEADERS });
}
