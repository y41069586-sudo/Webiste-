import { findPublicDemo, getProviders } from '@wbm/core';

export const dynamic = 'force-dynamic';

/** Vorschaubild (Desktop-Screenshot ohne Banner) für die Bestellseite – nur für veröffentlichte Demos. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok' || !found.demo.screenshotDesktopKey) return new Response('not found', { status: 404 });
  const img = await getProviders().storage.get(found.demo.screenshotDesktopKey);
  if (!img) return new Response('not found', { status: 404 });
  return new Response(new Uint8Array(img), {
    headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=600', 'x-robots-tag': 'noindex' },
  });
}
