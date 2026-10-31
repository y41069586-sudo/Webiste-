/** Gemeinsame Domänentypen. */

export const LEAD_STATUSES = [
  'discovered',
  'qualified',
  'demo_built',
  'demo_approved',
  'demo_published',
  'letter_generated',
  'letter_approved',
  'letter_sent',
  'letter_delivered',
  'scanned',
  'cta_clicked',
  'checkout_started',
  'paid',
  'onboarding',
  'preview_approved',
  'live',
  // Nebenzustände
  'rejected',
  'suppressed',
  'expired',
  'followup_sent',
  'failed',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Template-Gruppen (Design-Familien); Gastronomie, Einzelhandel und Kurse seit L2 */
export const BRANCH_GROUPS = ['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse'] as const;
export type BranchGroup = (typeof BRANCH_GROUPS)[number];

/** Branchen-Playbooks (Update 2, B3). Gesundheit und Recht sind ausgeschlossen. */
export const INDUSTRIES = ['gastronomie', 'handwerk', 'beauty', 'einzelhandel', 'kurse_training', 'dienstleistung'] as const;
export type Industry = (typeof INDUSTRIES)[number];

/** Claims-Bibliothek (Update 2, B2) */
export const CLAIM_STATUSES = ['approved', 'needs_verification', 'blocked'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export const CLAIM_CHECK_RESULTS = ['ok', 'corrected', 'primary_missing', 'mismatch'] as const;
export type ClaimCheckResult = (typeof CLAIM_CHECK_RESULTS)[number];
export type ClaimSourceType = 'external' | 'own_data';

export type LeadSourceKind = 'google_places' | 'osm' | 'mock' | 'public_profile';

export const DEMO_STATUSES = [
  'building',
  'qa_failed',
  'pending_review',
  'approved',
  'rejected',
  'published',
  'expired',
  'deleted',
] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

export const LETTER_STATUSES = ['generated', 'approved', 'queued', 'sent', 'delivered', 'failed', 'cancelled'] as const;
export type LetterStatus = (typeof LETTER_STATUSES)[number];

export const EVENT_TYPES = [
  'scan',
  'demo_view',
  'cta_click',
  'question_sent',
  'opt_out',
  'checkout_started',
  'paid',
  'onboarding_submitted',
  'preview_approved',
  'live',
  // L4 Messung (B6.1)
  'demo_engagement',
  'whatsapp_click',
  'checkout_abandoned',
  'complaint',
  'undeliverable',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type VariantKind = 'letter' | 'demo_banner' | 'price';

/** Lebenszyklus einer Variante (B7); `active` am Datensatz spiegelt status === 'active' */
export const VARIANT_STATUSES = ['proposed', 'active', 'paused', 'retired'] as const;
export type VariantStatus = (typeof VARIANT_STATUSES)[number];
export type VariantCreator = 'human' | 'learning_agent';

/** one_time = 590 € einmalig (mode=payment), monthly = 49 €/Monat mit Mindestlaufzeit (mode=subscription) */
export const ORDER_PLANS = ['one_time', 'monthly', 'basis', 'care_plus'] as const;
export type OrderPlan = (typeof ORDER_PLANS)[number];

/** Priorität: neu > social_only > etabliert (Update 2, A2) */
export const LEAD_SEGMENTS = ['neu', 'social_only', 'etabliert'] as const;
export type LeadSegment = (typeof LEAD_SEGMENTS)[number];

export const LETTER_FORMATS = ['letter', 'postcard'] as const;
export type LetterFormat = (typeof LETTER_FORMATS)[number];

export const ORDER_STATUSES = ['pending', 'processing', 'paid', 'failed', 'expired', 'refunded', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SITE_STATUSES = [
  'onboarding',
  'generating',
  'preview',
  'changes_requested',
  'approved',
  'deploying',
  'live',
  'failed',
  'suspended',
] as const;
export type SiteStatus = (typeof SITE_STATUSES)[number];

export const SUPPORT_CLASSES = ['frage', 'aenderungswunsch', 'beschwerde', 'opt_out', 'rechnung', 'spam'] as const;
export type SupportClass = (typeof SUPPORT_CLASSES)[number];

/** Einwand-Kategorien (L6, B6.5) – vom Support-Agent zusätzlich zur Klasse erkannt */
export const OBJECTION_CATEGORIES = [
  'zu_teuer',
  'habe_social_media',
  'wer_sind_sie',
  'domain_vorhanden',
  'website_vorhanden',
  'kein_bedarf',
  'keine_zeit',
  'laufzeit_vertrag',
  'angaben_falsch',
  'sonstiges',
] as const;
export type ObjectionCategory = (typeof OBJECTION_CATEGORIES)[number];

export const OBJECTION_LABEL: Record<ObjectionCategory, string> = {
  zu_teuer: '„zu teuer“',
  habe_social_media: '„habe schon Instagram/Facebook“',
  wer_sind_sie: '„wer sind Sie?“ (Vertrauen)',
  domain_vorhanden: '„Domain schon vorhanden“',
  website_vorhanden: '„Website vorhanden oder in Arbeit“',
  kein_bedarf: '„brauche keine Website“',
  keine_zeit: '„keine Zeit / später“',
  laufzeit_vertrag: '„Mindestlaufzeit / Abo“',
  angaben_falsch: '„Angaben im Entwurf falsch“',
  sonstiges: 'sonstiger Einwand',
};

export type ExperimentDecision =
  'proposed' | 'rejected' | 'running' | 'auto_activated' | 'winner' | 'paused_worse' | 'stopped' | 'no_difference';

export type SupportStatus = 'new' | 'classified' | 'drafted' | 'approved' | 'sent' | 'escalated' | 'done' | 'ignored';

export type BudgetCategory = 'letter' | 'places_api' | 'llm' | 'domain' | 'hosting' | 'other';

export type Actor = `admin:${string}` | `job:${string}` | `webhook:${string}` | `public:${string}` | 'system';

export interface OpeningHoursDay {
  /** 0 = Sonntag … 6 = Samstag (wie Google Places) */
  day: number;
  /** z. B. [{ open: '09:00', close: '18:00' }] */
  periods: { open: string; close: string }[];
}

export interface OpeningHours {
  days: OpeningHoursDay[];
  /** Original-Textzeilen, falls vorhanden ("Montag: 09:00–18:00") */
  weekdayText?: string[];
}

export interface PostalAddress {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
}
