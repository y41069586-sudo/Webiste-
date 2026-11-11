import {
  appUrl,
  beginCheckoutDraft,
  findPublicDemo,
  getCheckoutContext,
  getDb,
  notifyInterest,
  recordEvent,
  setupCookieName,
  SETUP_TTL_SECONDS,
} from '@wbm/core';
import { simplePage } from '@/lib/public-page';
import { cookies } from 'next/headers';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/** Neutral entry starts an unpaid private setup; GET never creates a Stripe session. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok') return Response.redirect(appUrl(`/d/${slug}`), 302);
  const meta = requestMetaFrom(req.headers);
  if (await recordEvent(getDb(), { leadId: found.lead.id, type: 'cta_click', req: meta }))
    await notifyInterest(found.lead.id, 'cta_click', meta);
  const jar = await cookies();
  const token = await beginCheckoutDraft(slug, jar.get(setupCookieName(slug))?.value ?? '', meta);
  if (!token && (await getCheckoutContext(slug)).state === 'ordered') return Response.redirect(appUrl(`/checkout/${slug}`), 303);
  if (!token)
    return simplePage(
      'Einrichtung derzeit nicht verfügbar',
      '<p>Bitte versuchen Sie es später erneut oder kontaktieren Sie SeitenWerk über die Kontaktangaben im Impressum.</p>',
      409,
    );
  jar.set(setupCookieName(slug), token, {
    httpOnly: true,
    secure: new URL(req.url).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: SETUP_TTL_SECONDS,
  });
  return new Response(null, { status: 303, headers: { location: appUrl(`/einrichten/${slug}`), 'cache-control': 'no-store' } });
}
