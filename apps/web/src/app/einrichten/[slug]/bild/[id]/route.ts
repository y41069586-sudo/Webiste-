import { cookies } from 'next/headers';
import { readCheckoutUpload, setupCookieName } from '@wbm/core';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const token = (await cookies()).get(setupCookieName(slug))?.value ?? '';
  const image = await readCheckoutUpload(slug, token, id);
  if (!image) return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });
  return new Response(new Uint8Array(image.data), {
    headers: {
      'content-type': image.type,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
    },
  });
}
