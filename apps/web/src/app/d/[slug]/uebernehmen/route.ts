import { appUrl, findPublicDemo, getDb, recordEvent } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/**
 * „Seite übernehmen“ bzw. Preiskarte gewählt: CTA-Klick zählen (mit gewählter Option), weiter zum Checkout.
 * Die Option wird nur übernommen, wenn der Betrieb sie auf einer Karte selbst gewählt hat.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok') return Response.redirect(appUrl(`/d/${slug}`), 302);
  const raw = new URL(req.url).searchParams.get('plan');
  const plan = raw === 'one_time' || raw === 'monthly' ? raw : null;
  await recordEvent(getDb(), {
    leadId: found.lead.id,
    type: 'cta_click',
    meta: plan ? { plan } : undefined,
    req: requestMetaFrom(req.headers),
  });
  const target = appUrl(`/checkout/${slug}${plan ? `?plan=${plan}` : ''}`);
  return new Response(null, { status: 302, headers: { location: target, 'cache-control': 'no-store' } });
}
