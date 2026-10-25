import { appUrl, esc, findPublicDemo, getDb, recordEvent, startHostedCheckout } from '@wbm/core';
import { simplePage } from '@/lib/public-page';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/**
 * Preiskarte auf dem Entwurf gewählt: CTA-Klick zählen und direkt zur Bezahlseite von Stripe.
 * Ohne gewählte Option zurück zu den beiden Preiskarten (keine Vorauswahl).
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok') return Response.redirect(appUrl(`/d/${slug}`), 302);
  const raw = new URL(req.url).searchParams.get('plan');
  const plan = raw === 'one_time' || raw === 'monthly' || raw === 'basis' || raw === 'care_plus' ? raw : null;
  const meta = requestMetaFrom(req.headers);
  await recordEvent(getDb(), { leadId: found.lead.id, type: 'cta_click', meta: plan ? { plan } : undefined, req: meta });
  if (!plan || meta.isBot) {
    return new Response(null, {
      status: 302,
      headers: { location: appUrl(`/d/${slug}#uebernehmen`), 'cache-control': 'no-store' },
    });
  }
  const res = await startHostedCheckout(slug, plan, meta);
  if (res.ok) return new Response(null, { status: 303, headers: { location: res.url, 'cache-control': 'no-store' } });
  return simplePage(
    'Bezahlseite nicht verfügbar',
    `<p>${esc(res.error)}</p><p><a href="${appUrl(`/d/${slug}#uebernehmen`)}">Zurück zum Entwurf</a></p>`,
    409,
  );
}
