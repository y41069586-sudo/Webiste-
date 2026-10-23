import { deleteUpload, saveUpload } from '@wbm/core';

export const dynamic = 'force-dynamic';

/** Logo/Fotos hochladen oder löschen (normales HTML-Formular, danach zurück zum Onboarding). */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const back = (q: string) => new Response(null, { status: 303, headers: { location: `/onboarding/${token}?${q}#bilder` } });
  const form = await req.formData();
  const del = form.get('delete');
  if (typeof del === 'string' && del) {
    await deleteUpload(token, del);
    return back('bild=geloescht');
  }
  const kind = form.get('kind') === 'logo' ? 'logo' : 'photo';
  const files = form.getAll('file').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f && f.size > 0);
  if (!files.length) return back('fehler=Keine%20Datei%20ausgew%C3%A4hlt');
  for (const file of files.slice(0, kind === 'logo' ? 1 : 6)) {
    const res = await saveUpload(token, kind, Buffer.from(await file.arrayBuffer()));
    if (!res.ok) return back(`fehler=${encodeURIComponent(res.error)}`);
  }
  return back('bild=ok');
}
