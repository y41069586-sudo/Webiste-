import { systemHealth } from '@wbm/core';

export const dynamic = 'force-dynamic';

/**
 * Health-Check für Docker und externes Uptime-Monitoring.
 * 200 = ok, 503 = Datenbank weg oder (mit ?strict=1) Worker steht/Probleme.
 */
export async function GET(req: Request) {
  const strict = new URL(req.url).searchParams.get('strict') === '1';
  const started = Date.now();
  const h = await systemHealth();
  const code = h.status === 'down' || (strict && h.status !== 'ok') ? 503 : 200;
  return Response.json({ ...h, latencyMs: Date.now() - started }, { status: code, headers: { 'cache-control': 'no-store' } });
}
