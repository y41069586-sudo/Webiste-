import { readUpload } from '@wbm/core';

export const dynamic = 'force-dynamic';

/** Vorschaubild eines Uploads (nur mit gültigem Kunden-Link). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const img = await readUpload(token, id);
  if (!img) return new Response('not found', { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { 'content-type': img.type, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' },
  });
}
