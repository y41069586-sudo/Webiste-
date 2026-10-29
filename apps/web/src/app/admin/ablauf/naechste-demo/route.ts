import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@wbm/core';
import { adminOrNull } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Älteste Demo, die auf die Prüfung wartet – oder zurück zur Liste. */
export async function GET(req: Request) {
  if (!(await adminOrNull())) return new Response('unauthorized', { status: 401 });
  const next = await getDb()
    .select({ id: schema.demos.id })
    .from(schema.demos)
    .where(eq(schema.demos.status, 'pending_review'))
    .orderBy(asc(schema.demos.createdAt))
    .limit(1);
  const target = next[0] ? `/admin/demos/${next[0].id}?flow=1` : '/admin/demos?fertig=1';
  return Response.redirect(new URL(target, req.url), 303);
}
