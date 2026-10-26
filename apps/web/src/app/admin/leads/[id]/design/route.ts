import { saveBusinessDesignEvidence } from '@wbm/core';
import { adminOrNull, actorOf } from '@/lib/auth';
import { simplePage } from '@/lib/public-page';
export const dynamic = 'force-dynamic';
/** Small authenticated upload, no crawling, provider call, Chromium or public photo URL. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await adminOrNull();
  if (!session) return new Response('unauthorized', { status: 401 });
  if (req.headers.get('origin') !== new URL(req.url).origin) return new Response('forbidden', { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('not found', { status: 404 });
  if (Number(req.headers.get('content-length') ?? 0) > 4 * 1024 * 1024)
    return simplePage('Dateien zu groß', '<p>Höchstens drei Bilder mit jeweils 1 MB.</p>', 413);
  try {
    const form = await req.formData();
    const files = [];
    for (const file of form.getAll('photos'))
      if (typeof file !== 'string' && file.size) {
        if (file.size > 1024 * 1024 || files.length >= 3) throw Error('upload');
        files.push({
          data: Buffer.from(await file.arrayBuffer()),
          alt: String(form.get('description') ?? 'Bildreferenz des Betriebs').slice(0, 140),
        });
      }
    const kind = form.get('sourceKind');
    if (kind !== 'owner_provided' && kind !== 'licensed_reference') throw Error('source');
    await saveBusinessDesignEvidence(
      id,
      {
        sourceRef: String(form.get('sourceRef') ?? ''),
        sourceKind: kind,
        notes: String(form.get('notes') ?? ''),
        analysisPermission: form.get('analysisPermission') === 'on',
        displayPermission: form.get('displayPermission') === 'on',
        files,
      },
      actorOf(session),
    );
    return new Response(null, {
      status: 303,
      headers: { location: `/admin/leads/${id}?design=gespeichert`, 'cache-control': 'no-store' },
    });
  } catch {
    return simplePage(
      'Gestaltungskontext nicht gespeichert',
      '<p>Bitte Quelle, Analyseberechtigung und Bildformat prüfen. Höchstens drei JPG-/PNG-/WebP-Dateien mit jeweils 1 MB und 1000 Zeichen Stilnotizen.</p>',
      400,
    );
  }
}
