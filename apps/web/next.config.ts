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
    '/*': ['../../packages/core/drizzle/**/*', '../../packages/templates/dist/**/*'],
  },
  turbopack: { root },
  experimental: {
    // Onboarding-Formular (lange Datenschutzerklärung); Bilder laufen über eine eigene Route
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/d/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
      {
        source: '/(onboarding|preview|verlaengern|checkout)/:path*',
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
