export function GET() {
  const body = [
    'User-agent: *',
    'Disallow: /d/',
    'Disallow: /q/',
    'Disallow: /admin',
    'Disallow: /checkout',
    'Disallow: /onboarding',
    'Disallow: /preview',
    'Disallow: /mock-hosting/',
    'Disallow: /verlaengern',
    'Disallow: /api/',
    'Disallow: /abmelden/',
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
