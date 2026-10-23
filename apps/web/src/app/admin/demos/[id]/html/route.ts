import { eq } from 'drizzle-orm';
import { formatDateDe, getDb, getProviders, schema } from '@wbm/core';
import { adminOrNull } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Admin-Vorschau einer Demo in jedem Status (in sandboxed iframe). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminOrNull())) return new Response('unauthorized', { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('not found', { status: 404 });
  const demo = await getDb().query.demos.findFirst({ where: eq(schema.demos.id, id) });
  if (!demo?.htmlStorageKey) return new Response('not found', { status: 404 });
  const html = await getProviders().storage.get(demo.htmlStorageKey);
  if (!html) return new Response('not found', { status: 404 });
  const label = demo.expiresAt ? `am ${formatDateDe(demo.expiresAt)}` : 'nach Ablauf der Frist';
  return new Response(html.toString('utf8').replaceAll('__WBM_EXPIRES_LABEL__', label), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex',
      'content-security-policy':
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; sandbox allow-same-origin",
    },
  });
}
