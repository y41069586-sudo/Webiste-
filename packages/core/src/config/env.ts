import { z } from 'zod';

/**
 * Umgebungsvariablen. Secrets kommen ausschließlich aus der Umgebung (.env),
 * niemals aus der Datenbank. Schalter (DRY_RUN, AUTO_SEND, …) sind hier die
 * Ausgangswerte; im Dashboard können sie nur in die *sicherere* Richtung
 * übersteuert werden, solange die Umgebung sie sperrt (siehe effectiveSwitches).
 */
const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));

const optStr = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgres://wbm:wbm@localhost:5432/wbm'),
  APP_URL: z.string().default('http://localhost:3000'),
  DEMO_DOMAIN: z.string().default('localhost:3000'),
  TRACK_DOMAIN: z.string().default('localhost:3000'),
  PUBLIC_PROTOCOL: z.enum(['http', 'https']).optional(),
  SESSION_SECRET: z.string().default('dev-only-change-me-dev-only-change-me'),
  ENCRYPTION_KEY: optStr,

  ANTHROPIC_API_KEY: optStr,
  LLM_PROVIDER: z.enum(['anthropic', 'mock']).optional(),
  MODEL_CREATIVE: z.string().default('claude-opus-5-5'),
  MODEL_BULK: z.string().default('claude-sonnet-5-5'),

  LEAD_SOURCE: z.enum(['google_places', 'osm', 'mock']).optional(),
  GOOGLE_PLACES_API_KEY: optStr,
  OVERPASS_URL: z.string().default('https://overpass-api.de/api/interpreter'),

  PAYMENT_PROVIDER: z.enum(['stripe', 'mock']).optional(),
  STRIPE_SECRET_KEY: optStr,
  STRIPE_WEBHOOK_SECRET: optStr,

  MAIL_PROVIDER: z.enum(['pingen', 'mock']).default('mock'),
  PINGEN_CLIENT_ID: optStr,
  PINGEN_CLIENT_SECRET: optStr,
  PINGEN_ORGANISATION_ID: optStr,
  PINGEN_ENV: z.enum(['staging', 'production']).default('staging'),
  PINGEN_WEBHOOK_SECRET: optStr,

  REGISTRAR_PROVIDER: z.enum(['inwx', 'mock']).default('mock'),
  REGISTRAR_USER: optStr,
  REGISTRAR_PASSWORD: optStr,
  REGISTRAR_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  REGISTRAR_TOTP_SECRET: optStr,

  HOSTING_PROVIDER: z.enum(['cloudflare', 'netlify', 'mock']).default('mock'),
  CLOUDFLARE_API_TOKEN: optStr,
  CLOUDFLARE_ACCOUNT_ID: optStr,
  NETLIFY_API_TOKEN: optStr,

  EMAIL_PROVIDER: z.enum(['resend', 'postmark', 'mock', '']).optional(),
  EMAIL_API_KEY: optStr,
  EMAIL_FROM: z.string().default('Website-Brief <hallo@example.com>'),
  EMAIL_INBOUND_SECRET: optStr,
  IMAP_HOST: optStr,
  IMAP_PORT: z.coerce.number().default(993),
  IMAP_USER: optStr,
  IMAP_PASSWORD: optStr,
  OPTOUT_EMAIL: z.string().default('widerspruch@example.com'),
  ADMIN_EMAIL: z.string().default('admin@example.com'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./data/storage'),
  S3_ENDPOINT: optStr,
  S3_REGION: z.string().default('eu-central-1'),
  S3_BUCKET: optStr,
  S3_ACCESS_KEY_ID: optStr,
  S3_SECRET_ACCESS_KEY: optStr,

  CHROMIUM_EXECUTABLE_PATH: optStr,

  DRY_RUN: bool(true),
  AUTO_SEND: bool(false),
  AUTO_APPROVE_DEMOS: bool(false),
  AUTO_REPLY: bool(false),
  FOLLOWUP_ENABLED: bool(false),
  AUTO_OPTIMIZE: bool(false),
  USE_RATING_IN_LETTER: bool(false),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (!cached) {
    // Leere Werte (z. B. `LLM_PROVIDER=` aus der .env-Vorlage) gelten als nicht gesetzt
    const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''));
    const parsed = envSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`Ungültige Umgebungsvariablen: ${issues}`);
    }
    cached = parsed.data;
    if (cached.NODE_ENV === 'production' && cached.SESSION_SECRET.startsWith('dev-only')) {
      throw new Error('SESSION_SECRET muss in Produktion gesetzt sein (mind. 32 zufällige Zeichen).');
    }
  }
  return cached;
}

/** Nur für Tests: Env neu einlesen. */
export function resetEnvCache(): void {
  cached = undefined;
}

function hostToUrl(host: string): string {
  if (host.startsWith('http://') || host.startsWith('https://')) return host.replace(/\/$/, '');
  const env = getEnv();
  const proto = env.PUBLIC_PROTOCOL ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function appUrl(path = ''): string {
  return `${getEnv().APP_URL.replace(/\/$/, '')}${path}`;
}
export function demoUrl(path = ''): string {
  return `${hostToUrl(getEnv().DEMO_DOMAIN)}${path}`;
}
export function trackUrl(path = ''): string {
  return `${hostToUrl(getEnv().TRACK_DOMAIN)}${path}`;
}
