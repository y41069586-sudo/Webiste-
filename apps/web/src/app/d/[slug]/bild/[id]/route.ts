import { demoCdnHeaders, findDemoImage, findPublicDemo } from '@wbm/core';
import { cachedDemoHtml } from '@/lib/demo-html';

export const dynamic = 'force-dynamic';

/**
 * Nachgelagertes Demo-Bild (19.11.2026, Tempo): stammt aus der gespeicherten Demo selbst (Inhalts-Hash in der Adresse),
 * nur für veröffentlichte, nicht abgelaufene Entwürfe. Netlify hält es wie die Demo zwischen; „Kein Interesse“ verwirft
 * beides über denselben Cache-Tag.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok') return new Response('not found', { status: found.state === 'gone' ? 410 : 404 });
  const html = await cachedDemoHtml(found.demo.htmlStorageKey ?? '', found.demo.updatedAt);
  const image = html ? findDemoImage(html.toString('utf8'), id) : null;
  if (!image) return new Response('not found', { status: 404 });
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      'content-type': image.mime,
      'cache-control': 'public, max-age=86400',
      'x-robots-tag': 'noindex',
      'x-content-type-options': 'nosniff',
      ...demoCdnHeaders(slug, found.demo.expiresAt),
    },
  });
}
