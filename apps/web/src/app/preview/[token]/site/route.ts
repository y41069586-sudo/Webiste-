import { eq } from 'drizzle-orm';
import { customerByToken, getDb, getProviders, schema } from '@wbm/core';

export const dynamic = 'force-dynamic';

/** Vorschau-HTML der Kundenseite (noindex, ohne Skripte, nur für den Kunden-Link). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const customer = await customerByToken(token);
  if (!customer?.siteId) return new Response('not found', { status: 404 });
  const site = await getDb().query.sites.findFirst({ where: eq(schema.sites.id, customer.siteId) });
  if (!site?.previewHtmlKey) return new Response('not found', { status: 404 });
  const html = await getProviders().storage.get(site.previewHtmlKey);
  if (!html) return new Response('not found', { status: 404 });
  return new Response(new Uint8Array(html), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
    },
  });
}
