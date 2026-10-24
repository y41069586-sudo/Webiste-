import { recordDemoEngagement } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/**
 * Beacon der Demo-Seite (B6.1): Verweildauer, Scrolltiefe, angeklickte Abschnitte. Ohne Cookies, ohne IP;
 * zugeordnet nur über den Entwurf (Slug). Antwortet immer 204.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const text = await req.text().catch(() => '');
  if (text.length > 0 && text.length <= 2048) {
    try {
      await recordDemoEngagement(slug, JSON.parse(text), requestMetaFrom(req.headers));
    } catch {
      // ungültige Daten werden ignoriert
    }
  }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
