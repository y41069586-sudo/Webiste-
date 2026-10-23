import { getEnv, getProviders } from '@wbm/core';

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  css: 'text/css',
};

/** Simuliertes Hosting (HOSTING_PROVIDER=mock, nicht in Produktion): liefert hochgeladene Kundenseiten aus. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { hosting, storage } = getProviders();
  if (hosting.name !== 'mock' || (getEnv().NODE_ENV === 'production' && process.env.ALLOW_MOCK_HOSTING !== 'true')) return new Response('not found', { status: 404 });
  const { path } = await params;
  if (path.some((p) => p === '..' || p.includes('\\'))) return new Response('bad request', { status: 400 });
  let rel = path.join('/');
  if (path.length === 1) rel = `${path[0]}/index.html`;
  const data = await storage.get(`mock-hosting/${rel}`);
  if (!data) {
    const nf = await storage.get(`mock-hosting/${path[0]}/404.html`);
    return new Response(nf ? new Uint8Array(nf) : 'not found', { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  const ext = rel.split('.').pop() ?? '';
  return new Response(new Uint8Array(data), { headers: { 'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'no-store' } });
}
