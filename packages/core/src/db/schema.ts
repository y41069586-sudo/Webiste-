import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  BranchGroup,
  BudgetCategory,
  DemoStatus,
  EventType,
  LeadSourceKind,
  LeadStatus,
  LetterStatus,
  OpeningHours,
  OrderStatus,
  SiteStatus,
  SupportClass,
  SupportStatus,
  VariantKind,
} from '../types';

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const createdAt = () => ts('created_at').defaultNow().notNull();
const updatedAt = () => ts('updated_at').defaultNow().notNull();

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: text('source').$type<LeadSourceKind>().notNull(),
    sourceId: text('source_id').notNull(),
    businessName: text('business_name').notNull(),
    branch: text('branch').notNull(),
    branchGroup: text('branch_group').$type<BranchGroup>().notNull(),
    city: text('city').notNull(),
    street: text('street'),
    houseNumber: text('house_number'),
    postalCode: text('postal_code'),
    country: text('country').default('DE').notNull(),
    phone: text('phone'),
    openingHours: jsonb('opening_hours').$type<OpeningHours | null>(),
    rating: doublePrecision('rating'),
    ratingCount: integer('rating_count'),
    hasWebsite: boolean('has_website').default(false).notNull(),
    websiteUri: text('website_uri'),
    socialOnly: boolean('social_only').default(false).notNull(),
    businessStatus: text('business_status'),
    primaryType: text('primary_type'),
    status: text('status').$type<LeadStatus>().default('discovered').notNull(),
    /** Fehlergrund bei `failed`, Hinweis bei `suppressed`/`expired` */
    statusReason: text('status_reason'),
    /** Alle Gründe, aus denen die Qualifizierung fehlschlug */
    rejectionReasons: jsonb('rejection_reasons').$type<string[]>().default([]).notNull(),
    score: doublePrecision('score').default(0).notNull(),
    segmentKey: text('segment_key').notNull(),
    /** Token für QR-Code (/q/{token}) – zufällig, nicht erratbar */
    trackToken: text('track_token').notNull(),
    searchQuery: text('search_query'),
    /** Hash aus normalisiertem Namen + Anschrift (Dubletten über Quellen hinweg) */
    identityHash: text('identity_hash'),
    /** Nur die place_id darf dauerhaft gespeichert werden (Google-Bedingungen) */
    googlePlaceId: text('google_place_id'),
    googleCheckedAt: ts('google_checked_at'),
    domainSuggestion: text('domain_suggestion'),
    domainCheckedAt: ts('domain_checked_at'),
    /** Zeitpunkt, zu dem die Quelldaten zuletzt von der Quelle abgerufen wurden (Cache-Regeln) */
    sourceFetchedAt: ts('source_fetched_at'),
    lettersSent: integer('letters_sent').default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    contactedAt: ts('contacted_at'),
    expiresAt: ts('expires_at'),
    /** Wenn gesetzt, sind personenbezogene Felder bereits gelöscht/anonymisiert */
    anonymizedAt: ts('anonymized_at'),
  },
  (t) => [
    uniqueIndex('leads_source_uidx').on(t.source, t.sourceId),
    uniqueIndex('leads_track_token_uidx').on(t.trackToken),
    index('leads_status_idx').on(t.status),
    index('leads_segment_idx').on(t.segmentKey),
    index('leads_score_idx').on(t.score),
    index('leads_identity_idx').on(t.identityHash),
  ],
);

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------
export interface QaResult {
  passed: boolean;
  checkedAt: string;
  checks: { name: string; passed: boolean; details?: string; score?: number }[];
}

export const demos = pgTable(
  'demos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    templateId: text('template_id').notNull(),
    palette: text('palette').notNull(),
    status: text('status').$type<DemoStatus>().default('building').notNull(),
    contentJson: jsonb('content_json').$type<Record<string, unknown>>(),
    htmlStorageKey: text('html_storage_key'),
    screenshotDesktopKey: text('screenshot_desktop_key'),
    screenshotMobileKey: text('screenshot_mobile_key'),
    compositeKey: text('composite_key'),
    qaResultJson: jsonb('qa_result_json').$type<QaResult | null>(),
    reviewRequired: boolean('review_required').default(true).notNull(),
    reviewNote: text('review_note'),
    approvedBy: text('approved_by'),
    approvedAt: ts('approved_at'),
    publishedAt: ts('published_at'),
    expiresAt: ts('expires_at'),
    deletedAt: ts('deleted_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('demos_slug_uidx').on(t.slug),
    index('demos_lead_idx').on(t.leadId),
    index('demos_status_idx').on(t.status),
  ],
);

// ---------------------------------------------------------------------------
// Varianten (A/B)
// ---------------------------------------------------------------------------
export const variants = pgTable(
  'variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: text('kind').$type<VariantKind>().notNull(),
    name: text('name').notNull(),
    /** Variante als JSON (z. B. Brieftext-Bausteine) */
    content: jsonb('content').$type<Record<string, unknown>>().notNull(),
    active: boolean('active').default(true).notNull(),
    /** Gewicht für die Zuweisung (vom Optimizer gesetzt) */
    weight: doublePrecision('weight').default(1).notNull(),
    /** 1 = Erstbrief, 2 = Follow-up */
    sequence: integer('sequence').default(1).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('variants_kind_name_uidx').on(t.kind, t.name)],
);

// ---------------------------------------------------------------------------
// Briefe
// ---------------------------------------------------------------------------
export const letters = pgTable(
  'letters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    demoId: uuid('demo_id').references(() => demos.id, { onDelete: 'set null' }),
    variantId: uuid('variant_id').references(() => variants.id, { onDelete: 'set null' }),
    sequence: integer('sequence').default(1).notNull(),
    pdfStorageKey: text('pdf_storage_key'),
    pageCount: integer('page_count').default(1).notNull(),
    provider: text('provider'),
    providerLetterId: text('provider_letter_id'),
    estimatedCostCents: integer('estimated_cost_cents'),
    costCents: integer('cost_cents'),
    status: text('status').$type<LetterStatus>().default('generated').notNull(),
    statusReason: text('status_reason'),
    dryRun: boolean('dry_run').default(false).notNull(),
    isTest: boolean('is_test').default(false).notNull(),
    approvedBy: text('approved_by'),
    approvedAt: ts('approved_at'),
    sentAt: ts('sent_at'),
    deliveredAt: ts('delivered_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('letters_lead_sequence_uidx').on(t.leadId, t.sequence),
    index('letters_status_idx').on(t.status),
    index('letters_provider_id_idx').on(t.providerLetterId),
  ],
);

// ---------------------------------------------------------------------------
// Events (Tracking ohne vollständige IP)
// ---------------------------------------------------------------------------
export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
    type: text('type').$type<EventType>().notNull(),
    metaJson: jsonb('meta_json').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('events_lead_idx').on(t.leadId), index('events_type_created_idx').on(t.type, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Bestellungen, Kunden, Seiten
// ---------------------------------------------------------------------------
export interface BillingAddress {
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    demoId: uuid('demo_id').references(() => demos.id, { onDelete: 'set null' }),
    provider: text('provider').default('stripe').notNull(),
    stripeSessionId: text('stripe_session_id'),
    stripePaymentIntent: text('stripe_payment_intent'),
    amountCents: integer('amount_cents').notNull(),
    /** Steueraufteilung zum Zeitpunkt der Bestellung (Rechnung unabhängig von späteren Config-Änderungen) */
    netCents: integer('net_cents').notNull(),
    vatCents: integer('vat_cents').default(0).notNull(),
    vatRatePercent: doublePrecision('vat_rate_percent').default(0).notNull(),
    currency: text('currency').default('eur').notNull(),
    status: text('status').$type<OrderStatus>().default('pending').notNull(),
    /** Stripe-Checkout-URL (für erneutes Öffnen bei Doppelklick) */
    checkoutUrl: text('checkout_url'),
    checkoutExpiresAt: ts('checkout_expires_at'),
    invoiceNumber: text('invoice_number'),
    invoicePdfKey: text('invoice_pdf_key'),
    /** Unveränderlicher Stand der Rechnungsdaten (Verkäufer, Käufer, Positionen, Steuer) */
    invoiceJson: jsonb('invoice_json').$type<Record<string, unknown> | null>(),
    invoiceSentAt: ts('invoice_sent_at'),
    refundedCents: integer('refunded_cents').default(0).notNull(),
    refundedAt: ts('refunded_at'),
    cancellationNumber: text('cancellation_number'),
    cancellationPdfKey: text('cancellation_pdf_key'),
    cancellationSentAt: ts('cancellation_sent_at'),
    customerCompany: text('customer_company').notNull(),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone'),
    billingAddressJson: jsonb('billing_address_json').$type<BillingAddress>().notNull(),
    domainWish: text('domain_wish'),
    b2bConfirmed: boolean('b2b_confirmed').default(false).notNull(),
    termsAcceptedAt: ts('terms_accepted_at'),
    termsVersion: text('terms_version'),
    subscriptionOptIn: boolean('subscription_opt_in').default(false).notNull(),
    paidAt: ts('paid_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('orders_session_uidx').on(t.stripeSessionId),
    uniqueIndex('orders_invoice_uidx').on(t.invoiceNumber),
    uniqueIndex('orders_cancellation_uidx').on(t.cancellationNumber),
    index('orders_lead_idx').on(t.leadId),
    index('orders_payment_intent_idx').on(t.stripePaymentIntent),
    index('orders_status_idx').on(t.status),
  ],
);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    company: text('company').notNull(),
    contactName: text('contact_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    domain: text('domain'),
    /** none | checking | available | registering | registered | failed | transfer */
    domainStatus: text('domain_status').default('none').notNull(),
    registrarHandle: text('registrar_handle'),
    registrarDomainId: text('registrar_domain_id'),
    siteId: uuid('site_id'),
    subscriptionId: text('subscription_id'),
    /** Token für Onboarding-/Vorschau-Links (zufällig) */
    accessToken: text('access_token').notNull(),
    onboardingMailSentAt: ts('onboarding_mail_sent_at'),
    onboardingRemindedAt: ts('onboarding_reminded_at'),
    /** Freigabe des Domainkaufs durch den Betreiber (solange autoRegisterDomains aus ist) */
    domainApprovedAt: ts('domain_approved_at'),
    domainApprovedBy: text('domain_approved_by'),
    domainRegisteredAt: ts('domain_registered_at'),
    domainExpiresAt: ts('domain_expires_at'),
    changeRoundsUsed: integer('change_rounds_used').default(0).notNull(),
    hostingUntil: ts('hosting_until'),
    renewalReminderSentAt: ts('renewal_reminder_sent_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('customers_order_uidx').on(t.orderId), uniqueIndex('customers_token_uidx').on(t.accessToken)],
);

export interface ImpressumData {
  company: string;
  owner: string;
  legalForm?: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  register?: string;
  registerNumber?: string;
  vatId?: string;
  supervisoryAuthority?: string;
  chamber?: string;
  professionalTitle?: string;
  responsibleForContent?: string;
}

export const sites = pgTable(
  'sites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    templateId: text('template_id').notNull(),
    palette: text('palette').notNull(),
    hostingProvider: text('hosting_provider'),
    hostingProjectId: text('hosting_project_id'),
    /** Standard-URL beim Hosting (z. B. *.workers.dev, *.netlify.app) */
    hostingUrl: text('hosting_url'),
    productionUrl: text('production_url'),
    contentJson: jsonb('content_json').$type<Record<string, unknown>>().notNull(),
    impressumJson: jsonb('impressum_json').$type<ImpressumData | null>(),
    privacyText: text('privacy_text'),
    formTargetEmail: text('form_target_email'),
    /** Angaben aus dem Onboarding-Formular (Entwurf bzw. abgesendeter Stand) */
    onboardingJson: jsonb('onboarding_json').$type<Record<string, unknown> | null>(),
    onboardingSubmittedAt: ts('onboarding_submitted_at'),
    previewApprovedAt: ts('preview_approved_at'),
    liveAt: ts('live_at'),
    /** Öffentliche ID für den Formular-Endpoint */
    formKey: text('form_key').notNull(),
    previewHtmlKey: text('preview_html_key'),
    liveHtmlKey: text('live_html_key'),
    assetKeys: jsonb('asset_keys').$type<Record<string, string>>().default({}).notNull(),
    status: text('status').$type<SiteStatus>().default('onboarding').notNull(),
    statusReason: text('status_reason'),
    version: integer('version').default(0).notNull(),
    liveCheckJson: jsonb('live_check_json').$type<Record<string, unknown> | null>(),
    lastDeployedAt: ts('last_deployed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('sites_customer_uidx').on(t.customerId), uniqueIndex('sites_form_key_uidx').on(t.formKey)],
);

export const changeRequests = pgTable(
  'change_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    source: text('source').$type<'preview' | 'support' | 'admin'>().notNull(),
    text: text('text').notNull(),
    /** open | applied | rejected | needs_admin */
    status: text('status').default('open').notNull(),
    countsAsRound: boolean('counts_as_round').default(true).notNull(),
    resultNote: text('result_note'),
    createdAt: createdAt(),
    appliedAt: ts('applied_at'),
  },
  (t) => [index('change_requests_site_idx').on(t.siteId)],
);

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------
export const supportMessages = pgTable(
  'support_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
    direction: text('direction').$type<'in' | 'out'>().notNull(),
    channel: text('channel').$type<'email' | 'form'>().default('email').notNull(),
    fromEmail: text('from_email'),
    toEmail: text('to_email'),
    subject: text('subject'),
    body: text('body').notNull(),
    classification: text('classification').$type<SupportClass | null>(),
    classificationConfidence: doublePrecision('classification_confidence'),
    draftReply: text('draft_reply'),
    status: text('status').$type<SupportStatus>().default('new').notNull(),
    providerMessageId: text('provider_message_id'),
    inReplyToId: uuid('in_reply_to_id'),
    escalationReason: text('escalation_reason'),
    approvedBy: text('approved_by'),
    approvedAt: ts('approved_at'),
    sentAt: ts('sent_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('support_provider_msg_uidx').on(t.providerMessageId), index('support_status_idx').on(t.status)],
);

// ---------------------------------------------------------------------------
// Sperrliste (nur Hashes, keine Klartextdaten)
// ---------------------------------------------------------------------------
export const suppressionList = pgTable(
  'suppression_list',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    hash: text('hash').notNull(),
    /** business (Name+Anschrift), address (nur Anschrift), email, source_id */
    kind: text('kind').default('business').notNull(),
    reason: text('reason').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('suppression_hash_uidx').on(t.hash)],
);

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------
export const budgetLedger = pgTable(
  'budget_ledger',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    category: text('category').$type<BudgetCategory>().notNull(),
    amountCents: integer('amount_cents').notNull(),
    /** Bruchteile von Cent (z. B. LLM-Kosten) in Mikro-Cent für genaue Summen */
    amountMicroCents: integer('amount_micro_cents').default(0).notNull(),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    ref: text('ref'),
    /** Verhindert Doppelbuchungen bei Job-Wiederholungen */
    idempotencyKey: text('idempotency_key'),
    meta: jsonb('meta').$type<Record<string, unknown>>().default({}).notNull(),
    estimated: boolean('estimated').default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('budget_idem_uidx').on(t.idempotencyKey),
    index('budget_created_idx').on(t.createdAt),
    index('budget_lead_idx').on(t.leadId),
  ],
);

// ---------------------------------------------------------------------------
// Einstellungen, Audit, Admin
// ---------------------------------------------------------------------------
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedBy: text('updated_by'),
  updatedAt: updatedAt(),
});

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    actor: text('actor').notNull(),
    contextJson: jsonb('context_json').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('audit_entity_idx').on(t.entity, t.entityId), index('audit_created_idx').on(t.createdAt)],
);

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    /** AES-GCM-verschlüsseltes TOTP-Secret */
    totpSecretEnc: text('totp_secret_enc').notNull(),
    totpEnabled: boolean('totp_enabled').default(false).notNull(),
    /** Letzter akzeptierter TOTP-Zeitschritt (Replay-Schutz) */
    lastTotpStep: integer('last_totp_step').default(0).notNull(),
    createdAt: createdAt(),
    lastLoginAt: ts('last_login_at'),
  },
  (t) => [uniqueIndex('admin_users_email_uidx').on(t.email)],
);

export const adminSessions = pgTable(
  'admin_sessions',
  {
    /** SHA-256 des Session-Tokens (Token selbst liegt nur im Cookie) */
    id: text('id').primaryKey(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    expiresAt: ts('expires_at').notNull(),
    lastSeenAt: ts('last_seen_at').defaultNow().notNull(),
  },
  (t) => [index('admin_sessions_admin_idx').on(t.adminId)],
);

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: ts('window_start').notNull(),
  count: integer('count').default(0).notNull(),
});

export const webhookEvents = pgTable(
  'webhook_events',
  {
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    type: text('type'),
    receivedAt: ts('received_at').defaultNow().notNull(),
    processedAt: ts('processed_at'),
    error: text('error'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.eventId] })],
);

/** Ausgehende Transaktions-Mails (Idempotenz + Postausgang im Dashboard). */
export const outboundEmails = pgTable(
  'outbound_emails',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: text('kind').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    toEmail: text('to_email').notNull(),
    subject: text('subject').notNull(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    provider: text('provider').notNull(),
    providerMessageId: text('provider_message_id'),
    /** sending | sent | failed */
    status: text('status').default('sending').notNull(),
    error: text('error'),
    attachmentNames: jsonb('attachment_names').$type<string[]>().default([]).notNull(),
    createdAt: createdAt(),
    sentAt: ts('sent_at'),
  },
  (t) => [uniqueIndex('outbound_emails_key_uidx').on(t.idempotencyKey), index('outbound_emails_created_idx').on(t.createdAt)],
);

export const counters = pgTable('counters', {
  name: text('name').primaryKey(),
  value: integer('value').default(0).notNull(),
});

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: text('kind').default('weekly').notNull(),
    periodStart: ts('period_start').notNull(),
    periodEnd: ts('period_end').notNull(),
    markdown: text('markdown').notNull(),
    allocationJson: jsonb('allocation_json').$type<Record<string, unknown>>().default({}).notNull(),
    applied: boolean('applied').default(false).notNull(),
    appliedAt: ts('applied_at'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('reports_kind_period_uidx').on(t.kind, t.periodStart)],
);

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    level: text('level').$type<'info' | 'warn' | 'error'>().default('info').notNull(),
    code: text('code').notNull(),
    message: text('message').notNull(),
    context: jsonb('context').$type<Record<string, unknown>>().default({}).notNull(),
    emailedAt: ts('emailed_at'),
    acknowledgedAt: ts('acknowledged_at'),
    createdAt: createdAt(),
  },
  (t) => [index('alerts_open_idx').on(t.acknowledgedAt, t.createdAt)],
);

export const sqlNow = sql`now()`;
