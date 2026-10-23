import { findPublicDemo, formatDateDe, getConfig, getProviders, recordEvent, getDb, esc } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

const EXPIRES_PLACEHOLDER = '__WBM_EXPIRES_LABEL__';

const DEMO_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'private, no-store',
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'referrer-policy': 'no-referrer',
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
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
  const label = found.demo.expiresAt ? `am ${formatDateDe(found.demo.expiresAt)}` : 'nach Ablauf der Frist';
  await recordEvent(getDb(), { leadId: found.lead.id, type: 'demo_view', req: requestMetaFrom(req.headers), dedupeDaily: true });
  return new Response(html.toString('utf8').replaceAll(EXPIRES_PLACEHOLDER, label), { status: 200, headers: DEMO_HEADERS });
}
