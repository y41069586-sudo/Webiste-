import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '../../');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Schwebendes Dev-Symbol verdeckt sonst unten links die Seitenleiste (nur Entwicklung)
  devIndicators: false,
  transpilePackages: ['@wbm/core', '@wbm/templates'],
  serverExternalPackages: [
    'pg',
    'pg-boss',
    'pino',
    'playwright',
    'playwright-core',
    'qrcode',
    'stripe',
    'imapflow',
    'mailparser',
    '@aws-sdk/client-s3',
    '@anthropic-ai/sdk',
  ],
  outputFileTracingRoot: root,
  outputFileTracingIncludes: {
    '/*': [
      '../../packages/core/drizzle/**/*',
      '../../packages/core/claims/**/*',
      '../../packages/core/playbooks/**/*',
      '../../packages/templates/dist/**/*',
      '../../packages/templates/assets/**/*',
    ],
  },
  turbopack: { root },
  experimental: {
    // Onboarding-Formular (lange Datenschutzerklärung); Bilder laufen über eine eigene Route
    // 25.11.2026: Die Startseite seitenwerk.world leitet App-Pfade unsichtbar an diese App weiter (Netlify-Proxy).
    // Formulare (Server Actions) kommen dann mit Origin seitenwerk.world an und müssen ausdrücklich erlaubt sein.
    serverActions: { bodySizeLimit: '2mb', allowedOrigins: ['seitenwerk.world', 'www.seitenwerk.world'] },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/d/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
      // Tempo (19.11.2026): Seiten der Firmen-Website kommen aus dem Netlify-Zwischenspeicher statt aus der Serverfunktion
      // (keine Kaltstarts, keine Datenbankrunde). Inhalte ändern sich selten; nach 5 Minuten wird im Hintergrund erneuert.
      ...[
        '/',
        '/preise',
        '/so-funktionierts',
        '/beispiele',
        '/garantie',
        '/ueber-mich',
        '/impressum',
        '/datenschutz',
        '/agb',
        '/quellen',
      ].map((source) => ({
        source,
        headers: [
          { key: 'Netlify-CDN-Cache-Control', value: 'public, durable, s-maxage=300, stale-while-revalidate=604800' },
          { key: 'Netlify-Cache-Tag', value: 'site-pages' },
        ],
      })),
      {
        source: '/(einrichten|onboarding|preview|verlaengern|checkout)/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
