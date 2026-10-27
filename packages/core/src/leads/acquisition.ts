import { z } from 'zod';
import { businessHash } from './normalize';
import { sha256 } from '../util/crypto';
import type { BranchConfig } from '../config/settings';
import type { PriorityReason } from './priority-v4';

export const acquisitionPolicySchema = z
  .object({
    enabled: z.boolean().default(true),
    primary: z.array(z.string()).default(['maler', 'reinigung', 'fliesenleger']),
    secondary: z.array(z.string()).default(['gartenbau', 'bodenleger', 'parkettleger', 'entruempelung']),
    evidenceMaxDays: z.number().int().min(1).max(90).default(30),
    demandMaxDays: z.number().int().min(1).max(180).default(90),
    youngMinMonths: z.number().int().min(0).max(120).default(6),
    youngMaxMonths: z.number().int().min(1).max(120).default(36),
    /**
     * Automatische Website-Vorprüfung (leads/website-probe.ts): ruft aus dem Namen abgeleitete .de-Domains ab.
     * Standard aus – externe Abrufe nur nach Freigabe. Ein Fund schließt aus; kein Fund beweist nichts.
     */
    websiteProbe: z.boolean().default(false),
    /** Höchstzahl geprüfter Betriebe je Lead-Suche (Zeitlimit: je Betrieb höchstens 4 Abrufe à 5 s) */
    websiteProbeMax: z.number().int().min(0).max(500).default(50),
  })
  .refine((p) => p.youngMinMonths <= p.youngMaxMonths, 'Altersfenster ist nicht geordnet.');
export const ACQUISITION_POLICY = acquisitionPolicySchema.parse({});
export type AcquisitionPolicy = z.infer<typeof acquisitionPolicySchema>;
export const RESEARCH_SIGNAL_LABELS = {
  operational: 'Betrieb nachweislich aktiv',
  address: 'Zustellanschrift geprüft',
  independent: 'Eigenständiger Betrieb',
  service: 'Tatsächlich angebotene Leistung',
  specialty: 'Bestätigter Schwerpunkt',
  area: 'Bestätigtes Einsatzgebiet',
  private_clients: 'Privatkundenangebot',
  business_clients: 'Gewerbekundenangebot',
  available_dates: 'Wirbt mit freien Terminen',
  service_advertising: 'Wirbt aktuell für Leistungen',
  new_offer: 'Neues Angebot',
  expansion: 'Nachgewiesene Erweiterung',
  takeover: 'Betriebsübernahme',
  active_profile: 'Aktive Social-/Plattformnutzung',
  full_time: 'Vollerwerbsbetrieb bestätigt',
  business_start: 'Tatsächlicher Beginn der Geschäftstätigkeit',
  listing_start: 'Nur Datum eines Verzeichniseintrags',
  recent_reviews: 'Aktuelle Rückmeldungen als Qualitätssignal',
  work_photos: 'Aktuelle Arbeitsbilder als Qualitätssignal',
  closed: 'Betrieb geschlossen',
  subcontract_only: 'Ausschließlich Subunternehmer',
  fully_booked: 'Keine neuen Aufträge / ausgelastet',
} as const;
const kindValues = Object.keys(RESEARCH_SIGNAL_LABELS) as [
  keyof typeof RESEARCH_SIGNAL_LABELS,
  ...(keyof typeof RESEARCH_SIGNAL_LABELS)[],
];
const safeReference = z
  .string()
  .min(8)
  .max(500)
  .refine((ref) => {
    if (/^review:[a-zA-Z0-9_./-]+$/.test(ref)) return true;
    try {
      const u = new URL(ref);
      return u.protocol === 'https:' && !u.username && !u.password && !/[?&](key|token|secret|password|api_key)=/i.test(ref);
    } catch {
      return false;
    }
  }, 'HTTPS-Quelle ohne Secrets oder interne review:Referenz erforderlich.');
export const researchSignalSchema = z.object({
  kind: z.enum(kindValues),
  text: z
    .string()
    .trim()
    .min(3)
    .max(140)
    .refine((s) => !/[\r\n{}*<>]/.test(s), 'Kurze sachliche Angabe ohne Markup.'),
  source: safeReference,
  observedAt: z.iso.datetime(),
  verified: z.literal(true),
  /** Actual event/publication date, or business start. Rereading a source does not renew its event. */
  occurredOn: z.iso.date().optional(),
});
export const WEBSITE_METHODS = ['name_city', 'phone', 'directory_links', 'profile_links'] as const;
export const leadResearchSchema = z.object({
  version: z.literal(1),
  identityHash: z.string(),
  checkedAt: z.iso.datetime(),
  lawfulUseConfirmed: z.literal(true),
  website: z.object({
    result: z.enum(['not_found', 'found', 'unknown']),
    checkedAt: z.iso.datetime(),
    methods: z.array(z.enum(WEBSITE_METHODS)),
    source: safeReference,
    foundUrl: z.url().optional(),
  }),
  signals: z.array(researchSignalSchema).max(20),
});
export type LeadResearch = z.infer<typeof leadResearchSchema>;
export type ResearchSignal = LeadResearch['signals'][number];
export type ResearchSubject = {
  businessName: string;
  branch: string;
  city: string;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  businessStatus?: string | null;
  hasWebsite?: boolean;
  socialOnly?: boolean;
};
export const leadResearchKey = (id: string) => `lead-research:${id}`;
/** Only content-bearing facts: a fresh intent/date review does not require rebuilding an unchanged demo. */
export function researchContentHash(research: LeadResearch | null) {
  return sha256(
    JSON.stringify(
      research
        ? [
            research.identityHash,
            research.signals
              .filter((s) => ['service', 'specialty', 'area'].includes(s.kind))
              .map((s) => [s.kind, s.text, s.source, s.verified]),
          ]
        : null,
    ),
  );
}
export function researchIdentity(lead: ResearchSubject) {
  return sha256(
    JSON.stringify([businessHash(lead.businessName, lead), lead.city, lead.branch, lead.phone?.replace(/\D/g, '') ?? '']),
  );
}
export function campaignRank(branch: string, policy = ACQUISITION_POLICY) {
  const first = policy.primary.indexOf(branch);
  return first >= 0 ? first + 1 : policy.secondary.includes(branch) ? policy.primary.length + 1 : null;
}
export function campaignBranches(branches: BranchConfig[], policy: AcquisitionPolicy) {
  return branches
    .filter((b) => b.active && (!policy.enabled || campaignRank(b.key, policy) !== null))
    .sort((a, b) => (campaignRank(a.key, policy) ?? 99) - (campaignRank(b.key, policy) ?? 99));
}
export function preferredCampaignTier<T extends { branch: string }>(candidates: T[], policy: AcquisitionPolicy) {
  const ranked = candidates.filter((c) => campaignRank(c.branch, policy) !== null);
  const best = Math.min(...ranked.map((c) => campaignRank(c.branch, policy)!));
  return ranked.filter((c) => campaignRank(c.branch, policy) === best);
}
export function isFresh(at: string, maxDays: number, now: Date) {
  const elapsed = now.getTime() - new Date(at).getTime();
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= maxDays * 86400000;
}
export function currentResearch(lead: ResearchSubject, raw: unknown, policy = ACQUISITION_POLICY, now = new Date()) {
  const parsed = leadResearchSchema.safeParse(raw);
  return parsed.success &&
    parsed.data.identityHash === researchIdentity(lead) &&
    isFresh(parsed.data.checkedAt, policy.evidenceMaxDays, now)
    ? parsed.data
    : null;
}
const DEMAND = new Set<ResearchSignal['kind']>([
  'available_dates',
  'service_advertising',
  'new_offer',
  'expansion',
  'takeover',
  'active_profile',
]);
/** This score expresses documented suitability, never purchasing power or probability. */
export function assessAcquisition(lead: ResearchSubject, raw: unknown, policy = ACQUISITION_POLICY, now = new Date()) {
  const evidence = currentResearch(lead, raw, policy, now);
  const signals =
    evidence?.signals.filter((s) => {
      const maxDays = DEMAND.has(s.kind) ? policy.demandMaxDays : policy.evidenceMaxDays;
      if (!isFresh(s.observedAt, maxDays, now)) return false;
      // A current check of a historical ad, takeover, review or photograph is not current activity.
      // Business/listing start dates deliberately remain historical facts for the lifecycle check.
      const datedSignal = DEMAND.has(s.kind) || s.kind === 'recent_reviews' || s.kind === 'work_photos';
      return !datedSignal || !s.occurredOn || isFresh(`${s.occurredOn}T00:00:00Z`, maxDays, now);
    }) ?? [];
  const has = (kind: ResearchSignal['kind']) => signals.some((s) => s.kind === kind);
  const services = signals.filter((s) => s.kind === 'service' || s.kind === 'specialty');
  const serviceText = services.map((s) => s.text).join(' ');
  const rank = campaignRank(lead.branch, policy);
  const websiteVerified = Boolean(
    evidence?.website.result === 'not_found' &&
    lead.phone?.trim() &&
    isFresh(evidence.website.checkedAt, policy.evidenceMaxDays, now) &&
    WEBSITE_METHODS.every((m) => evidence.website.methods.includes(m)),
  );
  const demand = signals.filter((s) => DEMAND.has(s.kind));
  const growth = demand.some((s) => ['new_offer', 'expansion', 'takeover'].includes(s.kind));
  const focused =
    lead.branch === 'maler'
      ? has('private_clients') && /renovier|sanier|innenanstrich|tapezier/i.test(serviceText)
      : lead.branch === 'reinigung'
        ? has('business_clients') && /büro|buero|treppen|fenster|gewerbe|objekt/i.test(serviceText)
        : lead.branch === 'fliesenleger'
          ? has('private_clients') && /bad|renovier|sanier/i.test(serviceText)
          : rank !== null && services.length > 0;
  const start = signals.find((s) => s.kind === 'business_start' && s.occurredOn);
  const started = start?.occurredOn ? new Date(start.occurredOn) : null;
  const months =
    started && started <= now
      ? (now.getUTCFullYear() - started.getUTCFullYear()) * 12 +
        now.getUTCMonth() -
        started.getUTCMonth() -
        (now.getUTCDate() < started.getUTCDate() ? 1 : 0)
      : null;
  const youngFullTime = months !== null && months >= policy.youngMinMonths && months <= policy.youngMaxMonths && has('full_time');
  const reasons: PriorityReason[] = [];
  const add = (criterion: string, verified: boolean, points: number, yes: string, no: string) =>
    reasons.push({ criterion, verified, points: verified ? points : 0, detail: verified ? yes : no });
  add('identity', Boolean(lead.businessName.trim()), 5, 'Firmenidentität vorhanden', 'Firmenname fehlt');
  add(
    'postal_address',
    has('address') &&
      Boolean(lead.street?.trim() && lead.houseNumber?.trim() && /^\d{5}$/.test(lead.postalCode ?? '') && lead.city.trim()),
    10,
    'Zustellanschrift gesondert geprüft',
    'Zustellanschrift noch nicht belegt',
  );
  add('operational', has('operational'), 10, 'Aktivität belegt, nicht aus Verzeichnisdatum abgeleitet', 'Aktivität unbekannt');
  add('independent', has('independent'), 5, 'Eigenständigkeit belegt', 'Eigenständigkeit offen');
  add(
    'campaign_branch',
    rank !== null,
    rank === 1 ? 20 : rank === 2 ? 17 : rank === 3 ? 14 : 10,
    `Kampagnenpriorität ${rank}; keine Kaufwahrscheinlichkeit`,
    'Nicht in dieser Zielkampagne',
  );
  add(
    'website',
    websiteVerified,
    20,
    'Name/Ort, Telefon und verlinkte Verzeichnis-/Profile geprüft: keine eigene Website gefunden',
    'Vollständige aktuelle Website-Suche fehlt; leeres Website-Feld genügt nicht',
  );
  add(
    'acquisition_need',
    demand.length > 0,
    15,
    'Konkretes aktuelles Akquise-/Wachstumssignal belegt; keine Kapazitätsgarantie',
    'Kein belegtes Akquisesignal; Bewertungen/Bilder sind dafür kein Ersatz',
  );
  add(
    'campaign_focus',
    focused,
    5,
    'Bestätigte Leistungen und Kundengruppe passen zur Zielkampagne',
    'Passender Leistungs-/Kundengruppenfokus noch nicht belegt',
  );
  add(
    'lifecycle',
    youngFullTime || growth,
    5,
    youngFullTime
      ? `Belegter Vollerwerbsbetrieb seit ${months} Monaten im Testfenster`
      : 'Belegtes neues Angebot, Übernahme oder Erweiterung',
    'Alter/Vollerwerb/Wachstum nicht hinreichend belegt; kein Gründungsdatum aus Eintragsalter',
  );
  add(
    'quality_reviews',
    has('recent_reviews'),
    2,
    'Aktuelle Rückmeldungen: nur zusätzliches Qualitätssignal',
    'Keine belegten aktuellen Rückmeldungen',
  );
  add(
    'quality_images',
    has('work_photos'),
    3,
    'Arbeitsbilder: Qualitätssignal, keine Kapazitäts- oder Nutzungsrechtsbestätigung',
    'Keine belegten aktuellen Arbeitsbilder',
  );
  const exclusions = [
    ...(has('closed') || lead.businessStatus?.startsWith('CLOSED_') ? ['Betrieb geschlossen'] : []),
    ...(has('subcontract_only') ? ['Ausschließlich Subunternehmer'] : []),
    ...(evidence?.website.result === 'found' || (lead.hasWebsite && !lead.socialOnly) ? ['Eigene Website gefunden'] : []),
    ...(has('fully_booked') && !growth ? ['Ausgelastet ohne belegtes Wachstumssignal'] : []),
    ...(rank === null ? ['Branche außerhalb dieser Zielkampagne'] : []),
  ];
  const missing = reasons
    .filter(
      (r) =>
        ['identity', 'postal_address', 'operational', 'independent', 'website', 'acquisition_need', 'campaign_focus'].includes(
          r.criterion,
        ) && !r.verified,
    )
    .map((r) => r.detail);
  if (has('fully_booked') && growth)
    missing.push('Auslastung und Wachstum zusammen manuell prüfen; keine freien Kapazitäten unterstellen');
  const state = exclusions.length ? 'excluded' : missing.length ? 'review' : 'ready';
  const score = exclusions.length ? 0 : reasons.reduce((sum, r) => sum + r.points, 0);
  reasons.push({
    criterion: 'suitability',
    points: 0,
    verified: state === 'ready',
    detail:
      state === 'ready' ? 'Recherchebasierte Eignung; weiterhin keine Versandfreigabe' : [...exclusions, ...missing].join(' · '),
  });
  return { score, state, rank, reasons, missing, exclusions, websiteVerified, youngFullTime, months, demand, services };
}
