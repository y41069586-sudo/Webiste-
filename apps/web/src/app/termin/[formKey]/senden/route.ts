import { bookingInput, logger, requestBooking } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/** Terminanfrage absenden (ohne JavaScript, klassisches Formular). Antwort immer per Weiterleitung. */
export async function POST(req: Request, { params }: { params: Promise<{ formKey: string }> }) {
  const { formKey } = await params;
  const back = (q: string) => new Response(null, { status: 303, headers: { location: `/termin/${formKey}${q}` } });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return back('?fehler=invalid');
  }
  try {
    const res = await requestBooking(formKey, bookingInput(form), requestMetaFrom(req.headers));
    if (res.ok) return back(`/danke?t=${encodeURIComponent(res.startsAt.toISOString())}`);
    if (res.reason === 'not_found') return back('');
    return back(`?fehler=${res.reason}${res.reason === 'invalid' ? `&feld=${res.field}` : ''}`);
  } catch (err) {
    logger.error({ errorClass: err instanceof Error ? err.name : 'Error' }, 'Terminanfrage fehlgeschlagen');
    return back('?fehler=unavailable');
  }
}
