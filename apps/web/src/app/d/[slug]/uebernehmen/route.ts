import {
  appUrl,
  beginCheckoutDraft,
  getCheckoutContext,
  getDb,
  notifyInterest,
  recordEvent,
  setupCookieName,
  SETUP_TTL_SECONDS,
} from '@wbm/core';
import { simplePage } from '@/lib/public-page';
import { cookies } from 'next/headers';
import { after } from 'next/server';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/** Neutral entry starts an unpaid private setup; GET never creates a Stripe session. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Tempo (18.11.2026): Demo, Betrieb, Bestellung und Einstellungen nur einmal laden (vorher doppelt, je ~0,1 s)
  const ctx = await getCheckoutContext(slug);
  if (ctx.state === 'ordered') return Response.redirect(appUrl(`/checkout/${slug}`), 303);
  if (ctx.state === 'not_found' || ctx.state === 'gone') return Response.redirect(appUrl(`/d/${slug}`), 302);
  const meta = requestMetaFrom(req.headers);
  // Tempo (17.11.2026): Zählung und Benachrichtigungs-Mail erst nach der Antwort – der Betrieb wartet nicht darauf
  if (ctx.state === 'ok') {
    const leadId = ctx.lead.id;
    after(async () => {
      if (await recordEvent(getDb(), { leadId, type: 'cta_click', req: meta }).catch(() => false))
        await notifyInterest(leadId, 'cta_click', meta).catch(() => undefined);
    });
  }
  const jar = await cookies();
  const token =
    ctx.state === 'ok' ? await beginCheckoutDraft(slug, jar.get(setupCookieName(slug))?.value ?? '', meta, ctx) : null;
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
