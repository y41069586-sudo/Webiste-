import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

export function database() {
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
  const key = keys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new Error('Missing server key');
  return createClient(Deno.env.get('SUPABASE_URL')!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
const origins = new Set([
  'https://seitenwerk.world',
  'https://www.seitenwerk.world',
  'https://seitenwerk-website.netlify.app',
  'http://localhost:3000',
  'http://localhost:3200',
]);
export function headers(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    ...(origins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}
export function json(request: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: headers(request) });
}
