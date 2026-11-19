import { decideBooking, logger } from '@wbm/core';

export const dynamic = 'force-dynamic';

/** Entscheidung des Betriebs: nur POST (Mail-Vorschauen rufen Links per GET ab und dürfen nichts auslösen). */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const back = (q: string) => new Response(null, { status: 303, headers: { location: `/termin/aktion/${token}${q}` } });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return back('');
  }
  const a = String(form.get('a') ?? '');
  if (a !== 'confirm' && a !== 'decline' && a !== 'cancel') return back('');
  try {
    const res = await decideBooking(token, a, String(form.get('note') ?? ''));
    return back(res.ok ? `?ok=${res.status}` : `?fehler=${res.reason}`);
  } catch (err) {
    logger.error({ errorClass: err instanceof Error ? err.name : 'Error' }, 'Terminentscheidung fehlgeschlagen');
    return back('?fehler=not_found');
  }
}
