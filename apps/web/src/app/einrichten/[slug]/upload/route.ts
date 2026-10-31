import { cookies } from 'next/headers';
import { removeCheckoutUpload, SETUP_UPLOAD_BYTES, setupCookieName, uploadCheckoutDraft } from '@wbm/core';

export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return Response.json({ error: 'Ungültiger Ursprung.' }, { status: 403 });
  const token = (await cookies()).get(setupCookieName(slug))?.value ?? '';
  if (Number(req.headers.get('content-length') ?? 0) > SETUP_UPLOAD_BYTES + 65536)
    return Response.json({ error: 'Datei zu groß.' }, { status: 413 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Ungültiger Upload.' }, { status: 400 });
  }
  const remove = form.get('remove');
  if (typeof remove === 'string') {
    const r = await removeCheckoutUpload(slug, token, remove);
    return Response.json(r ?? { error: 'Entwurf nicht verfügbar.' }, {
      status: r ? 200 : 404,
      headers: { 'cache-control': 'no-store' },
    });
  }
  const file = form.get('file');
  const kind = form.get('kind');
  if (!(file instanceof File) || file.size > SETUP_UPLOAD_BYTES || (kind !== 'logo' && kind !== 'photo'))
    return Response.json({ error: 'Bitte JPG, PNG oder WebP bis 4 MB wählen.' }, { status: 400 });
  const r = await uploadCheckoutDraft(slug, token, kind, Buffer.from(await file.arrayBuffer()));
  return Response.json(r ?? { error: 'Entwurf nicht verfügbar.' }, {
    status: !r ? 404 : 'error' in r ? 400 : 200,
    headers: { 'cache-control': 'no-store' },
  });
}
