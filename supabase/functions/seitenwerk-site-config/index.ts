import { database, headers, json } from '../_shared/runtime.ts';
import { publicConfig } from '../_shared/policy.ts';

// Deliberately public: only the allowlisted website configuration, never the raw settings row.
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(request) });
  if (request.method !== 'GET') return json(request, { error: 'method_not_allowed' }, 405);
  try {
    const db = database();
    if (new URL(request.url).searchParams.get('view') === 'sources') {
      const [claims, variants] = await Promise.all([
        db
          .from('claims')
          .select(
            'id, text_de, footnote_de, source_publisher, source_title, source_url, published_at, sample, population, status, expires_at, claim_usages(count)',
          ),
        db.from('variants').select('slots_json').eq('active', true).eq('status', 'active'),
      ]);
      if (claims.error || variants.error) throw new Error('sources_unavailable');
      const slots = JSON.stringify(variants.data);
      const rows = claims.data
        .map((c) => ({
          id: c.id,
          textDe: c.text_de,
          footnoteDe: c.footnote_de,
          sourcePublisher: c.source_publisher,
          sourceTitle: c.source_title,
          sourceUrl: c.source_url,
          publishedAt: c.published_at,
          sample: c.sample,
          population: c.population,
          inUse: c.status === 'approved' && new Date(c.expires_at).getTime() > Date.now() && slots.includes(`{CLAIM:${c.id}}`),
          used: c.claim_usages.some((u) => u.count > 0),
        }))
        .filter((c) => c.inUse || c.used)
        .sort((a, b) => a.id.localeCompare(b.id));
      return json(
        request,
        rows.map(({ used: _used, ...row }) => row),
      );
    }
    const { data, error } = await db.from('settings').select('value').eq('key', 'app_config').single();
    if (error) throw error;
    return json(request, publicConfig(data.value));
  } catch {
    return json(request, { error: 'configuration_unavailable' }, 503);
  }
});
