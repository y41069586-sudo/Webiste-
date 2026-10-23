import { trackTokenForShortCode } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';
import { GET as qrGet } from '../q/[token]/route';

export const dynamic = 'force-dynamic';

/** Kurz-URL aus dem Brief ({TRACK_DOMAIN}/{kurzcode}) – gleiche Behandlung wie ein QR-Scan. */
export async function GET(req: Request, { params }: { params: Promise<{ kurzcode: string }> }) {
  const { kurzcode } = await params;
  const token = await trackTokenForShortCode(kurzcode, requestMetaFrom(req.headers));
  if (token === 'rate_limited') return simplePage('Zu viele Versuche', '<p>Bitte versuchen Sie es später erneut.</p>', 429);
  if (!token)
    return simplePage('Seite nicht gefunden', '<p>Dieser Link ist ungültig. Bitte prüfen Sie die Schreibweise.</p>', 404);
  return qrGet(req, { params: Promise.resolve({ token }) });
}
