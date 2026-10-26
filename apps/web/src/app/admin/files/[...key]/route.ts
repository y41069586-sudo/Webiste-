import { getProviders } from '@wbm/core';
import { adminOrNull } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  html: 'text/html; charset=utf-8',
  json: 'application/json',
};
const ALLOWED = /^(demos|letters|invoices|sites|outbox|uploads|lead-design)\//;

/** Dateien aus dem Speicher – nur für angemeldete Admins. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (!(await adminOrNull())) return new Response('unauthorized', { status: 401 });
  const { key } = await params;
  const path = key.map(decodeURIComponent).join('/');
  if (!ALLOWED.test(path) || path.includes('..')) return new Response('not found', { status: 404 });
  const data = await getProviders().storage.get(path);
  if (!data) return new Response('not found', { status: 404 });
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return new Response(new Uint8Array(data), {
    headers: {
      'content-type': TYPES[ext] ?? 'application/octet-stream',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      ...(ext === 'html'
        ? { 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; sandbox" }
        : {}),
    },
  });
}
