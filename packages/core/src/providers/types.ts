/**
 * Provider-Interfaces. Jede externe Anbindung steckt hinter einem dieser Interfaces,
 * damit Anbieter austauschbar sind und Tests/DRY_RUN ohne Netzwerk laufen.
 */
import type { BranchConfig } from '../config/settings';
import type { LeadSourceKind, OpeningHours } from '../types';

// ---------------------------------------------------------------------------
// Lead-Quellen
// ---------------------------------------------------------------------------
export interface RawPlace {
  source: LeadSourceKind;
  sourceId: string;
  name: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  formattedAddress?: string;
  phone?: string;
  websiteUri?: string;
  rating?: number;
  ratingCount?: number;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
  openingHours?: OpeningHours | null;
}

export interface LeadSearchQuery {
  /** Vollständiger Suchbegriff, z. B. „Nagelstudio Dortmund“ */
  text: string;
  city: string;
  branch: BranchConfig;
  maxPages: number;
}

export interface LeadSearchResult {
  places: RawPlace[];
  /** Anzahl abgerechneter API-Requests */
  requests: number;
  /** Geschätzte Kosten in Cent */
  costCents: number;
}

export interface LeadSource {
  readonly kind: LeadSourceKind;
  search(query: LeadSearchQuery): Promise<LeadSearchResult>;
  /** Einzelnen Eintrag neu laden (z. B. für Cache-Auffrischung). */
  refresh?(sourceId: string): Promise<{ place: RawPlace | null; costCents: number }>;
}

// ---------------------------------------------------------------------------
// Briefversand (Print & Mail)
// ---------------------------------------------------------------------------
export interface LetterSendOptions {
  color: boolean;
  deliveryProduct: string;
  addressPosition: 'left' | 'right';
  recipientCountry: string;
  /** Idempotenz – gleicher Schlüssel ⇒ kein zweiter Brief */
  idempotencyKey: string;
  /** Interne Referenz (Letter-ID), wird beim Anbieter als Metadatum gespeichert */
  reference: string;
  /** Seitenzahl des PDFs (für Preis und Druckmodus) */
  pages?: number;
  /** Strukturierte Anschriften zur Plausibilisierung beim Anbieter (optional) */
  recipient?: PostalParty;
  sender?: PostalParty;
}

export interface PostalParty {
  name: string;
  street: string;
  number: string;
  zip: string;
  city: string;
  country: string;
}

export type ProviderLetterStatus = 'validating' | 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled' | 'unknown';

export interface LetterSendResult {
  providerLetterId: string;
  status: ProviderLetterStatus;
  costCents?: number;
}

export interface LetterWebhookEvent {
  /** eindeutige Event-ID (für Replay-Schutz) */
  eventId: string;
  providerLetterId: string;
  status: ProviderLetterStatus;
  occurredAt: Date;
  reason?: string;
}

export interface MailProvider {
  readonly name: string;
  /** Preis in Cent laut Anbieter (null = unbekannt, dann Config-Schätzung) */
  estimateCost(pdf: Buffer, opts: Omit<LetterSendOptions, 'idempotencyKey' | 'reference' | 'recipient' | 'sender'>): Promise<number | null>;
  send(pdf: Buffer, opts: LetterSendOptions): Promise<LetterSendResult>;
  getStatus(providerLetterId: string): Promise<{ status: ProviderLetterStatus; costCents?: number }>;
  cancel?(providerLetterId: string): Promise<void>;
  verifyWebhook(rawBody: string, headers: Headers): boolean;
  parseWebhook(rawBody: string): LetterWebhookEvent[];
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------
export interface DomainAvailability {
  domain: string;
  available: boolean;
  /** Preis pro Jahr in Cent (falls bekannt) */
  priceCents?: number;
  reason?: string;
}

export interface DomainOwner {
  /** Domain-Inhaber ist der Kunde */
  company: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
}

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'ALIAS';
  /** '' oder '@' für Apex, sonst Subdomain (z. B. 'www') */
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
}

export interface DomainRegistration {
  domain: string;
  registrarDomainId: string;
  ownerHandle: string;
  status: 'registered' | 'pending' | 'failed';
  costCents?: number;
}

export interface RegistrarProvider {
  readonly name: string;
  checkAvailability(domains: string[]): Promise<DomainAvailability[]>;
  registerDomain(input: {
    domain: string;
    owner: DomainOwner;
    nameservers?: string[];
    idempotencyKey: string;
  }): Promise<DomainRegistration>;
  setNameservers(domain: string, nameservers: string[]): Promise<void>;
  setDnsRecords(domain: string, records: DnsRecord[]): Promise<void>;
  getDomainStatus(domain: string): Promise<{ status: string; expiresAt?: Date }>;
}

// ---------------------------------------------------------------------------
// Hosting der Kundenseiten
// ---------------------------------------------------------------------------
export interface DnsPlan {
  /** Wenn gesetzt: Domain muss diese Nameserver bekommen (z. B. Cloudflare-Zone) */
  nameservers?: string[];
  /** Sonst: diese Records beim Registrar-DNS setzen */
  records?: DnsRecord[];
}

export interface HostingDomainStatus {
  domain: string;
  active: boolean;
  ssl: 'pending' | 'active' | 'error' | 'unknown';
  details?: string;
}

export interface SiteFile {
  path: string;
  content: Buffer | string;
  contentType?: string;
}

export interface HostingProvider {
  readonly name: string;
  /** Projekt anlegen (idempotent über den Namen) */
  ensureProject(name: string): Promise<{ projectId: string; defaultUrl: string }>;
  deploy(projectId: string, files: SiteFile[]): Promise<{ deploymentId: string; url: string }>;
  attachDomain(projectId: string, domain: string): Promise<DnsPlan>;
  getDomainStatus(projectId: string, domain: string): Promise<HostingDomainStatus>;
  deleteProject?(projectId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// E-Mail (nur Transaktions-Mails an Personen, die uns ihre Adresse gegeben haben)
// ---------------------------------------------------------------------------
export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Interne Kategorie für Auswertung, z. B. invoice, onboarding */
  tag?: string;
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export interface InboundEmail {
  providerMessageId: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  receivedAt: Date;
  inReplyTo?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(mail: OutgoingEmail): Promise<{ messageId: string }>;
  verifyInbound?(rawBody: string, headers: Headers, url: URL): boolean;
  parseInbound?(rawBody: string): Promise<InboundEmail | null>;
}

// ---------------------------------------------------------------------------
// LLM
// ---------------------------------------------------------------------------
export interface LlmUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface LlmStructuredRequest {
  model: string;
  /** Statischer System-Prompt (wird gecacht) */
  system: string;
  /** Variabler Teil */
  prompt: string;
  toolName: string;
  toolDescription: string;
  /** JSON-Schema des Tool-Inputs (additionalProperties: false) */
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high';
  /** Zweck für das Budget-Ledger, z. B. demo_content */
  purpose: string;
  leadId?: string;
}

export interface LlmTextRequest {
  model: string;
  system: string;
  prompt: string;
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high';
  purpose: string;
  leadId?: string;
}

export interface LlmResult<T> {
  data: T;
  usage: LlmUsage;
}

export interface LlmProvider {
  readonly name: string;
  generateStructured<T>(req: LlmStructuredRequest): Promise<LlmResult<T>>;
  generateText(req: LlmTextRequest): Promise<LlmResult<string>>;
}

// ---------------------------------------------------------------------------
// Datei-Speicher
// ---------------------------------------------------------------------------
export interface StorageProvider {
  readonly name: string;
  put(key: string, data: Buffer | string, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<number>;
  list(prefix: string): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Zahlungen
// ---------------------------------------------------------------------------
export interface CheckoutSessionInput {
  orderId: string;
  amountCents: number;
  currency: 'eur';
  productName: string;
  productDescription: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
  /** Ablauf der Session (Minuten, Stripe: 30 min – 24 h) */
  expiresInMinutes?: number;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export type PaymentEventType =
  | 'checkout.completed'
  | 'checkout.async_succeeded'
  | 'checkout.async_failed'
  | 'checkout.expired'
  | 'charge.refunded'
  | 'other';

export interface PaymentEvent {
  eventId: string;
  type: PaymentEventType;
  rawType: string;
  sessionId?: string;
  paymentIntentId?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'no_payment_required';
  amountTotal?: number;
  metadata?: Record<string, string>;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
  /** Webhook verifizieren und normalisieren. Wirft bei ungültiger Signatur. */
  parseWebhook(rawBody: string, signatureHeader: string | null): Promise<PaymentEvent>;
  refund?(paymentIntentId: string): Promise<void>;
}
