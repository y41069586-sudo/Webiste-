import { demoUrl, whatsappRedirect } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/** „Frage per WhatsApp“: Klick zählen (B6.1), dann weiter zu wa.me. Wir schreiben nie von uns aus per WhatsApp. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const target = await whatsappRedirect(slug, requestMetaFrom(req.headers));
  return new Response(null, {
    status: 302,
    headers: { location: target ?? demoUrl(`/d/${slug}#frage`), 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' },
  });
}
