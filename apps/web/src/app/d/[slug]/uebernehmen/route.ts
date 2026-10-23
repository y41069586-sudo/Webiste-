import { appUrl, findPublicDemo, getDb, recordEvent } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/** Banner-Button „Für … übernehmen“: CTA-Klick zählen, weiter zum Checkout. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok') return Response.redirect(appUrl(`/d/${slug}`), 302);
  await recordEvent(getDb(), { leadId: found.lead.id, type: 'cta_click', req: requestMetaFrom(req.headers) });
  return new Response(null, { status: 302, headers: { location: appUrl(`/checkout/${slug}`), 'cache-control': 'no-store' } });
}
