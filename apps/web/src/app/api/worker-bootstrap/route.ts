import { getDb, rateLimit, redeemWorkerBootstrapCode, sha256, workerEnvFile } from '@wbm/core';

export const dynamic = 'force-dynamic';

/**
 * Einrichtungsskript des Worker-Servers (infra/vps/setup.sh): tauscht einen im Admin erzeugten Einmal-Code gegen die
 * Worker-Umgebung. Ohne gültigen Code nur 403; höchstens 10 Versuche pro Stunde und Adresse.
 */
export async function POST(req: Request) {
  const noStore = { 'cache-control': 'no-store' };
  const ip =
    req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unbekannt';
  const limit = await rateLimit(getDb(), `worker-bootstrap:${sha256(ip).slice(0, 24)}`, 10, 3600);
  if (!limit.allowed) return new Response('Zu viele Versuche.\n', { status: 429, headers: noStore });
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === 'string' ? body.code : '';
  if (!(await redeemWorkerBootstrapCode(code)))
    return new Response('Code ungültig, abgelaufen oder bereits verwendet.\n', { status: 403, headers: noStore });
  return new Response(workerEnvFile(process.env), {
    headers: { ...noStore, 'content-type': 'text/plain; charset=utf-8' },
  });
}
