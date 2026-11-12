import { trackTokenForShortCode } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';
import { GET as qrGet } from '../q/[token]/route';
import { fallbackRedirect, fallbackSlugForCode, withTimeout } from '@/lib/demo-fallback';

export const dynamic = 'force-dynamic';

/** Kurz-URL aus dem Brief ({TRACK_DOMAIN}/{kurzcode}) – gleiche Behandlung wie ein QR-Scan. */
export async function GET(req: Request, { params }: { params: Promise<{ kurzcode: string }> }) {
  const { kurzcode } = await params;
  let token: Awaited<ReturnType<typeof trackTokenForShortCode>>;
  try {
    token = await withTimeout(trackTokenForShortCode(kurzcode, requestMetaFrom(req.headers)));
  } catch {
    return fallbackRedirect(req, fallbackSlugForCode(kurzcode), 'Kurz-URL');
  }
  if (token === 'rate_limited') return simplePage('Zu viele Versuche', '<p>Bitte versuchen Sie es später erneut.</p>', 429);
  if (!token)
    return simplePage('Seite nicht gefunden', '<p>Dieser Link ist ungültig. Bitte prüfen Sie die Schreibweise.</p>', 404);
  return qrGet(req, { params: Promise.resolve({ token }) });
}
