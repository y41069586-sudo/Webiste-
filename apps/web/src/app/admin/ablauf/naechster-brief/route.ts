import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { adminOrNull } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Ältester Brief, der auf die Freigabe wartet – oder zurück zum Ablauf. */
export async function GET(req: Request) {
  if (!(await adminOrNull())) return new Response('unauthorized', { status: 401 });
  const next = await getDb()
    .select({ id: schema.letters.id })
    .from(schema.letters)
    .where(eq(schema.letters.status, 'generated'))
    .orderBy(asc(schema.letters.createdAt))
    .limit(1);
  const target = next[0] ? `/admin/letters/${next[0].id}?flow=1` : '/admin/ablauf?briefe=fertig';
  return Response.redirect(new URL(target, req.url), 303);
}
