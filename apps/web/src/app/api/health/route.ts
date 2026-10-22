import { sql } from 'drizzle-orm';
import { getDb } from '@wbm/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  try {
    await getDb().execute(sql`SELECT 1`);
    const q = await getDb().execute<{ n: string }>(
      sql`SELECT count(*)::text AS n FROM pgboss.job WHERE state = 'failed' AND completed_on > now() - interval '1 hour'`,
    ).catch(() => ({ rows: [{ n: '0' }] }));
    return Response.json(
      { status: 'ok', db: 'ok', failedJobsLastHour: Number(q.rows[0]?.n ?? 0), latencyMs: Date.now() - started },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return Response.json({ status: 'error', db: 'down' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
