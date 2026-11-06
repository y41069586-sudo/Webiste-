import { createHash } from 'node:crypto';
import {
  findPublicDemo,
  formatDateDe,
  getConfig,
  DEFAULT_CONFIG,
  publicOperatorSettings,
  getProviders,
  recordEvent,
  getDb,
  esc,
  demoOfferSectionHtml,
  v4TierLabel,
} from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';
import { welcomeDialog } from '@/lib/welcome-dialog';

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
  'content-security-policy': `default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; script-src 'sha256-${BEACON_HASH}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
};

/**
 * Preissektion beim Ausliefern auf die aktuellen Tarife bringen (z. B. „Komplett“ statt Care+), auch für vor der
 * Umstellung gebaute Demos. Inhalte des Betriebs bleiben unberührt; das Foto im Vertrauensblock wird übernommen.
 */
function refreshOfferSection(page: string, slug: string, cfg: Awaited<ReturnType<typeof getConfig>>): string {
  const start = page.indexOf('<section id="uebernehmen"');
  if (start < 0) return page;
  const end = page.indexOf('</section>', start);
  if (end < 0) return page;
  const old = page.slice(start, end + '</section>'.length);
  const photo = /<img src="(data:image\/[a-z+]+;base64,[^"]+)"[^>]*class="h-24 w-24/.exec(old)?.[1] ?? null;
  const fresh = demoOfferSectionHtml(slug, cfg, photo);
  return fresh ? page.slice(0, start) + fresh + page.slice(end + '</section>'.length) : page;
}

/** Demo-Auslieferung: nur veröffentlichte, nicht abgelaufene Entwürfe; sonst 410. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findPublicDemo(slug);
  if (found.state === 'not_found') return simplePage('Seite nicht gefunden', '<p>Dieser Link ist ungültig.</p>', 404);
  if (found.state === 'gone') {
    const cfg = publicOperatorSettings(await getConfig(), DEFAULT_CONFIG.sender);
    return simplePage(
      'Dieser Entwurf ist nicht mehr verfügbar',
      `<p>Der Website-Entwurf ist abgelaufen oder wurde gelöscht.</p><p class="muted">Fragen? <a href="mailto:${esc(cfg.sender.email)}">${esc(cfg.sender.email)}</a></p>`,
      410,
    );
  }
  const html = await getProviders().storage.get(found.demo.htmlStorageKey ?? '');
  if (!html) return simplePage('Nicht verfügbar', '<p>Der Entwurf ist vorübergehend nicht verfügbar.</p>', 503);
  const fullCfg = await getConfig();
  const cfg = publicOperatorSettings(fullCfg, DEFAULT_CONFIG.sender);
  const label = found.demo.expiresAt ? `am ${formatDateDe(found.demo.expiresAt)}` : 'nach Ablauf der Frist';
  await recordEvent(getDb(), { leadId: found.lead.id, type: 'demo_view', req: requestMetaFrom(req.headers), dedupeDaily: true });
  const query = new URL(req.url).searchParams;
  const selected = query.get('plan');
  const cancelled = query.get('abgebrochen') === '1' && (selected === 'basis' || selected === 'care_plus');
  const notice = cancelled
    ? `<p role="status" style="margin:1rem 0;padding:1rem;border:1px solid #94a3b8;border-radius:.75rem;background:white;color:#0f172a">Bezahlvorgang verlassen. Zuletzt gewählter Tarif: <strong>${v4TierLabel(selected)}</strong>. Sie können das Angebot hier noch einmal prüfen. Falls Sie bereits bezahlt haben, warten Sie bitte auf die Bestätigung.</p>`
    : '';
  const page = refreshOfferSection(html.toString('utf8'), slug, fullCfg)
    // Upgrade only our purchase toolbar in already stored demos; business content stays untouched.
    .replace(
      /<a href="#uebernehmen" class="sw-demo-buy">[^<]*<\/a>/,
      `<a href="/d/${slug}/uebernehmen" class="sw-demo-buy">Website übernehmen</a><a href="#uebernehmen" class="sw-demo-ask">Preise und Leistungen</a>`,
    )
    .replace('In Ruhe ansehen, direkt übernehmen.', 'Erst einrichten, dann kostenpflichtig bestellen.')
    .replace('Nach der Einmalzahlung ergänzen Sie Ihre Angaben.', 'Ihre vor der Zahlung gespeicherten Angaben werden übernommen.')
    .replaceAll(EXPIRES_PLACEHOLDER, label)
    .replace('<h2 id="uebernehmen-titel"', `${notice}<h2 id="uebernehmen-titel"`)
    .replace(/<body([^>]*)>/, (m) =>
      query.get('start') === '1'
        ? `${m}${welcomeDialog(found.lead.businessName, slug, found.demo.expiresAt ? formatDateDe(found.demo.expiresAt) : 'auf Weiteres', fullCfg.offers.komplettEnabled === true)}`
        : m,
    )
    .replace('</body>', cfg.metrics.engagementBeacon ? `<script>${BEACON_SCRIPT}</script></body>` : '</body>');
  return new Response(page, { status: 200, headers: DEMO_HEADERS });
}
