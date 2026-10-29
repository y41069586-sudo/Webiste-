import { getEnv } from '../config/env';
import { logger } from '../logger';
import { AnthropicLlm } from './llm/anthropic';
import { MockLlm } from './llm/mock';
import { MockEmail } from './mock/email';
import { MockHosting } from './mock/hosting';
import { MockLeadSource } from './mock/lead-source';
import { MockMailProvider } from './mock/mail';
import { MockPayment } from './mock/payment';
import { MockRegistrar } from './mock/registrar';
import { LocalStorage } from './storage/local';
import { S3Storage } from './storage/s3';
import { OpenAiTts } from './tts/openai';
import type {
  EmailProvider,
  HostingProvider,
  LeadSource,
  LlmProvider,
  MailProvider,
  PaymentProvider,
  RegistrarProvider,
  StorageProvider,
  TtsProvider,
} from './types';
import { registry } from './registry';

export * from './types';
export { registerMockStructured, registerMockText } from './llm/mock';
export { LlmRefusalError, LlmNoToolCallError } from './llm/anthropic';
export { MockPayment } from './mock/payment';
export { StripePayment } from './payment/stripe';
export { ResendEmail } from './email/resend';
export { PostmarkEmail } from './email/postmark';
export { InwxRegistrar, inwxPhone, INWX_DEFAULT_NS } from './registrar/inwx';
export { CloudflareHosting, assetHash } from './hosting/cloudflare';
export { NetlifyHosting } from './hosting/netlify';

export interface Providers {
  storage: StorageProvider;
  llm: LlmProvider;
  leadSources: LeadSource[];
  mail: MailProvider;
  registrar: RegistrarProvider;
  hosting: HostingProvider;
  email: EmailProvider;
  payment: PaymentProvider;
  /** Natürliche Stimme für Jarvis; ohne Schlüssel null (dann Browser-Stimme) */
  tts: TtsProvider | null;
}

let cached: Providers | undefined;

function need(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} fehlt in der Umgebung`);
  return value;
}

export function createProviders(): Providers {
  const env = getEnv();
  const storage: StorageProvider =
    env.STORAGE_DRIVER === 's3'
      ? new S3Storage({
          endpoint: env.S3_ENDPOINT,
          region: env.S3_REGION,
          bucket: need(env.S3_BUCKET, 'S3_BUCKET'),
          accessKeyId: need(env.S3_ACCESS_KEY_ID, 'S3_ACCESS_KEY_ID'),
          secretAccessKey: need(env.S3_SECRET_ACCESS_KEY, 'S3_SECRET_ACCESS_KEY'),
        })
      : new LocalStorage(env.STORAGE_LOCAL_DIR);

  const llmKind = env.LLM_PROVIDER ?? (env.ANTHROPIC_API_KEY ? 'anthropic' : 'mock');
  const llm: LlmProvider =
    llmKind === 'anthropic'
      ? new AnthropicLlm(need(env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY'), process.env.LLM_SERVER_FALLBACK !== 'false')
      : new MockLlm();

  const leadKind = env.LEAD_SOURCE ?? 'osm';
  const leadSources: LeadSource[] = registry.leadSources(leadKind, env) ?? [new MockLeadSource()];

  const mail: MailProvider = registry.mail(env.MAIL_PROVIDER, env) ?? new MockMailProvider(env.SESSION_SECRET);
  const registrar: RegistrarProvider = registry.registrar(env.REGISTRAR_PROVIDER, env) ?? new MockRegistrar();
  const hosting: HostingProvider = registry.hosting(env.HOSTING_PROVIDER, env) ?? new MockHosting(storage);
  const emailKind = env.EMAIL_PROVIDER || (env.EMAIL_API_KEY ? 'resend' : 'mock');
  const email: EmailProvider = registry.email(emailKind, env) ?? new MockEmail(storage, env.SESSION_SECRET);
  const paymentKind = env.PAYMENT_PROVIDER ?? (env.STRIPE_SECRET_KEY ? 'stripe' : 'mock');
  const payment: PaymentProvider = registry.payment(paymentKind, env) ?? new MockPayment(env.SESSION_SECRET);
  const tts: TtsProvider | null = env.OPENAI_API_KEY ? new OpenAiTts(env.OPENAI_API_KEY) : null;

  logger.info(
    {
      storage: storage.name,
      llm: llm.name,
      leadSources: leadSources.map((s) => s.kind),
      mail: mail.name,
      registrar: registrar.name,
      hosting: hosting.name,
      email: email.name,
      payment: payment.name,
      tts: tts?.name ?? 'browser',
    },
    'providers initialisiert',
  );
  return { storage, llm, leadSources, mail, registrar, hosting, email, payment, tts };
}

export function getProviders(): Providers {
  if (!cached) cached = createProviders();
  return cached;
}

/** Nur für Tests: Provider ersetzen. */
export function setProviders(p: Partial<Providers>): void {
  cached = { ...(cached ?? createProviders()), ...p };
}

export function resetProviders(): void {
  cached = undefined;
}
