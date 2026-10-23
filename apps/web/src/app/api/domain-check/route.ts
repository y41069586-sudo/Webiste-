import { checkDomain, findPublicDemo, getDb, rateLimit } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/** Live-Prüfung der Wunschdomain (Checkout/Onboarding). Ratenbegrenzt pro (gehashter) IP. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const d = (url.searchParams.get('d') ?? '').slice(0, 100);
  const slug = url.searchParams.get('s') ?? '';
  const meta = requestMetaFrom(req.headers);
  const rl = await rateLimit(getDb(), `domain-check:${meta.ipHash}`, 60, 600);
  if (!rl.allowed) return Response.json({ error: 'rate_limited' }, { status: 429 });
  let ctx: { businessName: string; city: string; branch: string } | undefined;
  if (slug) {
    const found = await findPublicDemo(slug);
    if (found.state === 'ok') ctx = { businessName: found.lead.businessName, city: found.lead.city, branch: found.lead.branch };
  }
  const res = await checkDomain(d, ctx);
  return Response.json(
    { domain: res.domain, valid: res.valid, available: res.available, message: res.message, alternatives: res.alternatives },
    { headers: { 'cache-control': 'no-store' } },
  );
}
