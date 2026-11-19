import { cancelByVisitor, logger } from '@wbm/core';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const back = (q: string) => new Response(null, { status: 303, headers: { location: `/termin/absagen/${token}${q}` } });
  try {
    const res = await cancelByVisitor(token);
    return back(res.ok ? '?ok=1' : `?fehler=${res.reason}`);
  } catch (err) {
    logger.error({ errorClass: err instanceof Error ? err.name : 'Error' }, 'Terminabsage fehlgeschlagen');
    return back('?fehler=not_found');
  }
}
