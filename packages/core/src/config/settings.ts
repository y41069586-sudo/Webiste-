import { z } from 'zod';
import { SUPPORT_CLASSES } from '../types';

/**
 * Fachliche Konfiguration („config.ts“ aus dem Auftrag). Standardwerte stehen hier,
 * Änderungen aus dem Dashboard liegen in der Tabelle `settings` (Schlüssel `app_config`)
 * und werden beim Lesen über die Standardwerte gelegt.
 */

export const branchSchema = z.object({
  /** technischer Schlüssel, z. B. `nagelstudio` */
  key: z.string().regex(/^[a-z0-9_-]+$/),
  group: z.enum(['handwerk', 'beauty']),
  label: z.string(),
  /** Suchbegriffe ohne Stadt, z. B. „Nagelstudio“ → „Nagelstudio Dortmund“ */
  queries: z.array(z.string()).min(1),
  /** OSM-Tags für den Overpass-Fallback, z. B. [{ key: 'shop', value: 'beauty', extra: { beauty: 'nails' } }] */
  osmTags: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      extra: z.record(z.string(), z.string()).optional(),
      /** Ausschluss per Regex, z. B. { beauty: 'nails|tanning' } (fehlender Tag zählt als passend) */
      exclude: z.record(z.string(), z.string()).optional(),
    }),
  ),
  /** Google-Places-Typen, die zur Branche passen (zur Plausibilisierung) */
  googleTypes: z.array(z.string()).default([]),
  /** Gewichtung im Score */
  weight: z.number().min(0).max(5).default(1),
  active: z.boolean().default(true),
});
export type BranchConfig = z.infer<typeof branchSchema>;

export const appConfigSchema = z.object({
  sender: z.object({
    name: z.string(),
    company: z.string(),
    street: z.string(),
    postalCode: z.string(),
    city: z.string(),
    email: z.email(),
    phone: z.string(),
    website: z.string(),
    /** Steuernummer oder USt-IdNr. für Rechnungen (Pflichtangabe) */
    taxNumber: z.string(),
    vatId: z.string().default(''),
    /** Bankverbindung NUR für Rechnungen (nie im Werbebrief) */
    bankIban: z.string().default(''),
    bankBic: z.string().default(''),
    bankName: z.string().default(''),
    /** WhatsApp-Nummer für „Frage per WhatsApp“ (international, nur Ziffern, z. B. 491701234567); leer = Button aus */
    whatsappNumber: z
      .string()
      .regex(/^(\d{8,15})?$/, 'Nur Ziffern mit Ländervorwahl, ohne + und Leerzeichen')
      .default(''),
    /** Foto für den Vertrauensblock (öffentliche URL oder Pfad unter /public); leer = ohne Foto */
    photoUrl: z.string().default(''),
    /** Kurzvorstellung (zwei Sätze, keine erfundenen Referenzen) */
    intro: z.string().max(400).default(''),
  }),
  pricing: z.object({
    /** Option A „Einmalzahlung“ (Stripe mode=payment) */
    packageCents: z.number().int().positive(),
    packageName: z.string(),
    hostingMonthsIncluded: z.number().int().positive(),
    /** Option A: Abo-Link in der Erinnerungs-Mail vor Ablauf des inklusiven Hostings */
    subscriptionEnabled: z.boolean(),
    /** „Hosting & Pflege“ ab Monat 13 – gilt für Option A (optional) und Option B (automatisch) */
    subscriptionCents: z.number().int().positive(),
    subscriptionName: z.string(),
    subscriptionStartMonth: z.number().int().positive(),
    /** Option B „Monatlich“ (Stripe mode=subscription), erste Rate sofort */
    monthlyEnabled: z.boolean(),
    monthlyCents: z.number().int().positive(),
    monthlyName: z.string(),
    /** Mindestlaufzeit von Option B in Monaten; danach automatisch subscriptionCents, monatlich kündbar */
    minTermMonths: z.number().int().min(1).max(36),
    currency: z.literal('eur'),
    /** Leistungsbeschreibung (Checkout, Rechnung) */
    packageDescription: z.string(),
  }),
  guarantee: z.object({
    /** 14-Tage-Zufriedenheitsgarantie: Erstattung per Admin-Button, Seite offline, Domain freigeben */
    enabled: z.boolean(),
    days: z.number().int().min(1).max(60),
    /** Garantie beginnt mit dem Go-Live, spätestens aber so viele Tage nach der Zahlung */
    latestStartDays: z.number().int().min(0).max(90),
  }),
  dunning: z.object({
    /** Nach dem letzten fehlgeschlagenen Einzug (Smart Retries): Erinnerung 1 sofort, Erinnerung 2 nach X Tagen */
    secondReminderAfterDays: z.number().int().min(1).max(60),
    /** Wartungsmodus X Tage nach Erinnerung 2; danach Forderungsbrief zur Freigabe */
    maintenanceAfterDays: z.number().int().min(1).max(60),
    /** Zahlungsziel im Forderungsbrief (Tage) */
    claimDueDays: z.number().int().min(7).max(60),
  }),
  segments: z.object({
    /** Segment „neu“: neu aufgetaucht mit so vielen Bewertungen (Mindestanzahl entfällt, Mindest-Rating bleibt) */
    newMinRatings: z.number().int().min(0),
    newMaxRatings: z.number().int().min(1),
    /** „neu“ gilt so viele Tage ab dem ersten Auftauchen */
    newWindowDays: z.number().int().min(7),
    /** Ein Betrieb gilt als „neu aufgetaucht“, wenn das Segment schon einmal durchsucht wurde (Wochen-Lauf) */
    scoreBonus: z.object({ neu: z.number(), social_only: z.number(), etabliert: z.number() }),
    /** Lead-Finder automatisch wöchentlich (montags) */
    weeklyLeadFinder: z.boolean(),
  }),
  tax: z.object({
    kleinunternehmer: z.boolean(),
    vatRatePercent: z.number().min(0).max(100),
    /**
     * Nur ohne Kleinunternehmerregelung relevant: true = Preise sind Bruttopreise (USt wird herausgerechnet),
     * false = Nettopreise zzgl. USt. (Standard: nach Wegfall der Regelung gelten die Preise für neue Verträge
     * als Nettopreise; bestehende Bestellungen behalten ihre gespeicherten Beträge)
     */
    pricesAreGross: z.boolean(),
    invoicePrefix: z.string(),
    kleinunternehmerNote: z.string(),
  }),
  checkout: z.object({
    /** Gültigkeit der Stripe-Checkout-Session (30–1440 Minuten) */
    sessionMinutes: z.number().int().min(30).max(1440),
    /** Erlaubte Endungen für die Wunschdomain */
    allowedTlds: z.array(z.string()).min(1),
    /** Domains teurer als dieser Jahrespreis gelten als nicht verfügbar (Premium) */
    maxDomainPriceCents: z.number().int().positive(),
    /** Zahlungsarten im Stripe Checkout (müssen im Stripe-Dashboard aktiviert sein) – kein PayPal */
    paymentMethods: z.array(z.enum(['card', 'sepa_debit'])).min(1),
  }),
  targeting: z.object({
    cities: z.array(z.string()).min(1),
    branches: z.array(branchSchema).min(1),
    /** Bekannte Ketten-/Franchise-Namen (Teilstring, case-insensitive) */
    chainNames: z.array(z.string()),
    /** Ab wie vielen gleichnamigen Treffern in verschiedenen Städten gilt ein Name als Kette */
    chainMinCities: z.number().int().min(2),
    /** Max. Seiten (à 20 Treffer) pro Places-Suchanfrage (max. 3 = 60 Treffer) */
    maxPagesPerQuery: z.number().int().min(1).max(3),
  }),
  filters: z.object({
    minRating: z.number().min(0).max(5),
    minRatingCount: z.number().int().min(0),
    recontactMonths: z.number().int().min(0),
    requireOperational: z.boolean(),
    /** Leads ohne Bewertungsdaten ablehnen (nur sinnvoll mit zulässiger Bewertungsquelle) */
    requireRatingSignal: z.boolean(),
    socialDomains: z.array(z.string()),
  }),
  leadSource: z.object({
    /**
     * osm: OpenStreetMap (Standard, ODbL)
     * osm_google_signal: OSM-Kandidaten + Google-Bewertung nur flüchtig zur Qualifizierung (nur place_id gespeichert)
     * google_text_search: Google Places als Primärquelle – nur mit schriftlicher Genehmigung (siehe docs/compliance-google.md)
     */
    mode: z.enum(['osm', 'osm_google_signal', 'google_text_search']),
    /** Bestätigung, dass der Signal-Modus rechtlich geprüft wurde (Name, Datum) */
    googleSignalAcknowledgement: z.string(),
    /** Nachweis einer Genehmigung von Google für die Speicherung (z. B. Vertragsnummer) */
    googleTextSearchApproval: z.string(),
  }),
  budget: z.object({
    weeklyBudgetCents: z.number().int().min(0),
    firstBatchSize: z.number().int().min(1),
    /** Anteil des Wochenbudgets je Segment (vom Optimizer oder manuell), Summe ≈ 1 */
    segmentShares: z.record(z.string(), z.number().min(0).max(1)),
    /** Max. Kosten für Places-API pro Woche */
    weeklyPlacesBudgetCents: z.number().int().min(0),
    /** Max. Kosten für LLM pro Woche */
    weeklyLlmBudgetCents: z.number().int().min(0),
  }),
  costs: z.object({
    /** Fallback-Schätzung pro Brief (Cent), wenn der Anbieter keinen Preis liefert */
    letterEstimateCents: z.number().int().min(0),
    /** Umrechnungskurs USD → EUR für Anbieter, die in USD abrechnen */
    usdToEur: z.number().positive(),
    /** Places Text Search (Enterprise-Felder) je 1000 Anfragen in US-Cent */
    placesTextSearchPer1000UsdCents: z.number().int().min(0),
    /** LLM-Preise je Million Tokens in US-Cent */
    llm: z.record(
      z.string(),
      z.object({
        inputPerMTokCents: z.number(),
        outputPerMTokCents: z.number(),
        cacheReadPerMTokCents: z.number(),
        cacheWritePerMTokCents: z.number(),
      }),
    ),
    domainPerYearCents: z.number().int().min(0),
  }),
  timing: z.object({
    demoExpiryDays: z.number().int().min(1),
    followupAfterDays: z.number().int().min(1),
    leadRetentionMonths: z.number().int().min(1),
    invoiceRetentionYears: z.number().int().min(1),
    /** Support-Nachrichten ohne Kundenbezug */
    supportRetentionMonths: z.number().int().min(1),
    /** Abgebrochene/unbezahlte Bestellungen (Checkout-Daten von Nicht-Käufern) */
    unpaidOrderRetentionMonths: z.number().int().min(1),
    renewalReminderDays: z.number().int().min(1),
    /** Follow-up 2: Demo-Laufzeit wird um so viele Tage verlängert („nur noch 7 Tage online“) */
    followupExtendDays: z.number().int().min(1).max(30),
    /** Follow-up 3 (heißer Lead): so viele Tage nach Scan/Klick ohne Kauf */
    hotLeadAfterDays: z.number().int().min(1),
    /** Heißer Lead ab so vielen Demo-Aufrufen (alternativ: CTA-Klick) */
    hotLeadMinViews: z.number().int().min(1),
    /** Ohne Zustellbestätigung gilt ein Brief nach X Tagen als zugestellt */
    assumeDeliveredAfterDays: z.number().int().min(1),
    /** Places-Inhalte (außer place_id) werden nach X Tagen neu geladen oder gelöscht */
    placesCacheDays: z.number().int().min(1).max(30),
  }),
  review: z.object({
    manualReviewFirstN: z.number().int().min(0),
    sampleRatePercent: z.number().min(0).max(100),
    /** Lighthouse in der Demo-QA (≈ 8 s je Demo) */
    qaLighthouse: z.boolean(),
    /** KI-Prüfung der Texte in der Demo-QA */
    qaLlm: z.boolean(),
    /** Brief 3 („Wir haben Ihre Website verbessert“): die ersten N Überarbeitungen und Briefe gibt der Betreiber frei */
    letter3ManualFirstN: z.number().int().min(0),
  }),
  onboarding: z.object({
    includedChangeRounds: z.number().int().min(0),
  }),
  letter: z.object({
    color: z.boolean(),
    /** Pingen delivery_product: z. B. cheap | fast | bulk | premium | registered */
    deliveryProduct: z.string(),
    /** Seite 2 mit Screenshots */
    includeScreenshotPage: z.boolean(),
    /** Position des Anschriftenfelds: left (DIN 5008 / DE) oder right (CH) */
    addressPosition: z.enum(['left', 'right']),
    /** Max. Sendungen pro Lead (Erstbrief + bis zu zwei Folgebriefe) */
    maxLettersPerLead: z.number().int().min(1).max(3),
    /** Test-Empfänger für den allerersten echten Brief */
    testRecipient: z.object({
      name: z.string(),
      street: z.string(),
      houseNumber: z.string(),
      postalCode: z.string(),
      city: z.string(),
    }),
  }),
  switches: z.object({
    dryRun: z.boolean(),
    autoSend: z.boolean(),
    autoApproveDemos: z.boolean(),
    autoReply: z.boolean(),
    followupEnabled: z.boolean(),
    autoOptimize: z.boolean(),
    useRatingInLetter: z.boolean(),
    /** Not-Aus: stoppt sofort alle Jobs mit Kostenfolge */
    killSwitch: z.boolean(),
    /** Echte Briefe an Leads freigegeben (erst nach erfolgreichem Testbrief) */
    realLettersUnlocked: z.boolean(),
    /** Domains nach Vorschau-Freigabe ohne weitere Admin-Freigabe registrieren */
    autoRegisterDomains: z.boolean(),
  }),
  support: z.object({
    autoReplyClasses: z.array(z.enum(SUPPORT_CLASSES)),
  }),
  optimizer: z.object({
    explorationShare: z.number().min(0).max(1),
    minLettersForSignal: z.number().int().min(0),
    samples: z.number().int().min(100),
  }),
  legal: z.object({
    /** Markdown-Texte, vom Betreiber geliefert. Leer = Platzhalterseite. */
    impressumMarkdown: z.string(),
    privacyMarkdown: z.string(),
    termsMarkdown: z.string(),
    termsVersion: z.string(),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const DEFAULT_BRANCHES: BranchConfig[] = [
  {
    key: 'nagelstudio',
    group: 'beauty',
    label: 'Nagelstudio',
    queries: ['Nagelstudio'],
    osmTags: [{ key: 'shop', value: 'beauty', extra: { beauty: 'nails' } }],
    googleTypes: ['nail_salon', 'beauty_salon'],
    weight: 1,
    active: true,
  },
  {
    key: 'kosmetikstudio',
    group: 'beauty',
    label: 'Kosmetikstudio',
    queries: ['Kosmetikstudio'],
    osmTags: [
      { key: 'shop', value: 'beauty', extra: { beauty: 'cosmetics' } },
      {
        key: 'shop',
        value: 'beauty',
        exclude: { beauty: 'nails|tanning|hair|hair_removal|waxing|massage|tattoo|piercing|lashes|brows|spa' },
      },
    ],
    googleTypes: ['beauty_salon', 'skin_care_clinic', 'spa'],
    weight: 1,
    active: true,
  },
  {
    key: 'maler',
    group: 'handwerk',
    label: 'Malerbetrieb',
    queries: ['Malerbetrieb'],
    osmTags: [{ key: 'craft', value: 'painter' }],
    googleTypes: ['painter', 'general_contractor'],
    weight: 1.1,
    active: true,
  },
  {
    key: 'elektriker',
    group: 'handwerk',
    label: 'Elektriker',
    queries: ['Elektriker'],
    osmTags: [{ key: 'craft', value: 'electrician' }],
    googleTypes: ['electrician'],
    weight: 1.1,
    active: true,
  },
];

export const DEFAULT_CONFIG: AppConfig = {
  sender: {
    name: 'Vorname Nachname',
    company: 'Website-Brief (Platzhalter)',
    street: 'Musterstraße 1',
    postalCode: '44135',
    city: 'Dortmund',
    email: 'hallo@example.com',
    phone: '0231 000000',
    website: 'example.com',
    taxNumber: '000/000/00000',
    vatId: '',
    bankIban: '',
    bankBic: '',
    bankName: '',
    whatsappNumber: '',
    photoUrl: '',
    intro: '',
  },
  pricing: {
    packageCents: 59000,
    packageName: 'Website-Paket',
    hostingMonthsIncluded: 12,
    subscriptionEnabled: true,
    subscriptionCents: 1900,
    subscriptionName: 'Hosting & Pflege',
    subscriptionStartMonth: 13,
    monthlyEnabled: true,
    monthlyCents: 4900,
    monthlyName: 'Website-Paket monatlich',
    minTermMonths: 12,
    currency: 'eur',
    packageDescription:
      'Ihre Website auf Basis des Entwurfs, eigene Domain auf Ihren Namen, Hosting mit SSL für 12 Monate ab Veröffentlichung, bis zu 2 Änderungsrunden vor dem Start.',
  },
  guarantee: {
    enabled: true,
    days: 14,
    latestStartDays: 14,
  },
  dunning: {
    secondReminderAfterDays: 7,
    maintenanceAfterDays: 7,
    claimDueDays: 14,
  },
  segments: {
    newMinRatings: 3,
    newMaxRatings: 20,
    newWindowDays: 90,
    scoreBonus: { neu: 6, social_only: 3, etabliert: 0 },
    weeklyLeadFinder: true,
  },
  tax: {
    kleinunternehmer: true,
    vatRatePercent: 19,
    pricesAreGross: false,
    invoicePrefix: 'RE',
    kleinunternehmerNote: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
  },
  targeting: {
    cities: ['Dortmund'],
    branches: DEFAULT_BRANCHES,
    chainNames: [
      'Douglas',
      'Yves Rocher',
      'Klier',
      'Essanelle',
      'Hairkiller',
      'Wax in the City',
      'Senzera',
      'OBI',
      'Bauhaus',
      'Hornbach',
      'toom',
      'hagebau',
      'E.ON',
      'Engie',
      'Stadtwerke',
      'DEW21',
      'Westnetz',
    ],
    chainMinCities: 3,
    maxPagesPerQuery: 3,
  },
  filters: {
    minRating: 4.5,
    minRatingCount: 30,
    recontactMonths: 12,
    requireOperational: true,
    requireRatingSignal: false,
    socialDomains: [
      'instagram.com',
      'facebook.com',
      'fb.com',
      'fb.me',
      'tiktok.com',
      'linktr.ee',
      'linktree.com',
      'youtube.com',
      'wa.me',
      'whatsapp.com',
      'treatwell.de',
      'booksy.com',
      'planity.com',
      'shore.com',
      'my.setmore.com',
      'calendly.com',
      'google.com',
      'business.site',
      'g.page',
      'maps.app.goo.gl',
      'goo.gl',
      'linkedin.com',
      'xing.com',
      'pinterest.com',
      'myhammer.de',
      'gelbeseiten.de',
      'dasoertliche.de',
      'meinestadt.de',
      'yelp.de',
      'jimdosite.com',
    ],
  },
  leadSource: {
    mode: 'osm',
    googleSignalAcknowledgement: '',
    googleTextSearchApproval: '',
  },
  budget: {
    weeklyBudgetCents: 6000,
    firstBatchSize: 40,
    segmentShares: {},
    weeklyPlacesBudgetCents: 2000,
    weeklyLlmBudgetCents: 3000,
  },
  costs: {
    letterEstimateCents: 150,
    usdToEur: 0.9,
    // Places API (New) Text Search Enterprise (Stand siehe docs/integrations.md)
    placesTextSearchPer1000UsdCents: 3500,
    llm: {
      // Preise in US-Cent je 1 Mio. Tokens (Stand 2026-10, siehe docs/integrations.md)
      'claude-opus-5-5': {
        inputPerMTokCents: 400,
        outputPerMTokCents: 2000,
        cacheReadPerMTokCents: 20,
        cacheWritePerMTokCents: 500,
      },
      'claude-sonnet-5-5': {
        inputPerMTokCents: 200,
        outputPerMTokCents: 1000,
        cacheReadPerMTokCents: 20,
        cacheWritePerMTokCents: 250,
      },
      'claude-opus-4-8': {
        inputPerMTokCents: 500,
        outputPerMTokCents: 2500,
        cacheReadPerMTokCents: 50,
        cacheWritePerMTokCents: 625,
      },
    },
    domainPerYearCents: 600,
  },
  timing: {
    demoExpiryDays: 30,
    followupAfterDays: 12,
    leadRetentionMonths: 6,
    invoiceRetentionYears: 10,
    supportRetentionMonths: 12,
    unpaidOrderRetentionMonths: 6,
    renewalReminderDays: 30,
    followupExtendDays: 7,
    hotLeadAfterDays: 7,
    hotLeadMinViews: 2,
    assumeDeliveredAfterDays: 4,
    placesCacheDays: 30,
  },
  review: {
    manualReviewFirstN: 30,
    sampleRatePercent: 10,
    qaLighthouse: true,
    qaLlm: true,
    letter3ManualFirstN: 20,
  },
  checkout: {
    sessionMinutes: 60,
    allowedTlds: ['de'],
    maxDomainPriceCents: 1500,
    paymentMethods: ['card', 'sepa_debit'],
  },
  onboarding: {
    includedChangeRounds: 2,
  },
  letter: {
    color: true,
    deliveryProduct: 'cheap',
    includeScreenshotPage: false,
    addressPosition: 'left',
    maxLettersPerLead: 3,
    testRecipient: {
      name: '',
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
    },
  },
  switches: {
    dryRun: true,
    autoSend: false,
    autoApproveDemos: false,
    autoReply: false,
    followupEnabled: false,
    autoOptimize: false,
    useRatingInLetter: false,
    killSwitch: false,
    realLettersUnlocked: false,
    autoRegisterDomains: false,
  },
  support: {
    autoReplyClasses: [],
  },
  optimizer: {
    explorationShare: 0.2,
    minLettersForSignal: 10,
    samples: 4000,
  },
  legal: {
    impressumMarkdown: '',
    privacyMarkdown: '',
    termsMarkdown: '',
    termsVersion: 'entwurf-1',
  },
};

type DeepPartial<T> = T extends (infer U)[] ? U[] : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
export type AppConfigPatch = DeepPartial<AppConfig>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Tiefes Zusammenführen: Arrays werden ersetzt, Objekte rekursiv gemischt. */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch === undefined ? base : (patch as T)) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const cur = (base as Record<string, unknown>)[k];
    out[k] = isPlainObject(cur) && isPlainObject(v) ? deepMerge(cur, v) : v;
  }
  return out as T;
}
