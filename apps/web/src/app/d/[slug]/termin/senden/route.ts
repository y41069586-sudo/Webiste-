import { bookingInput, logger, requestDemoTestBooking } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/** Testanfrage über den Entwurf eines fiktiven Testbetriebs (nur Lead-Quelle „mock“; sonst keine Wirkung). */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const back = (q: string) => new Response(null, { status: 303, headers: { location: `/d/${slug}/termin${q}` } });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return back('?fehler=invalid');
  }
  try {
    const res = await requestDemoTestBooking(slug, bookingInput(form), requestMetaFrom(req.headers));
    if (res.ok) return back(`/danke?t=${encodeURIComponent(res.startsAt.toISOString())}`);
    if (res.reason === 'not_found') return back('');
    return back(`?fehler=${res.reason}${res.reason === 'invalid' ? `&feld=${res.field}` : ''}`);
  } catch (err) {
    logger.error({ errorClass: err instanceof Error ? err.name : 'Error' }, 'Test-Terminanfrage fehlgeschlagen');
    return back('?fehler=unavailable');
  }
}
