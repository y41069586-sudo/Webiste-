import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { effectiveSwitches, getConfig, getSetting, setSetting } from '../config/service';
import { getDb } from '../db/client';
import { leads } from '../db/schema';
import { WEBSITE_METHODS, type LeadResearch, type ResearchSignal } from '../leads/acquisition';
import { getProviders } from '../providers';
import { enqueue, QUEUES } from '../queue';
import { audit } from './audit';
import { saveLeadResearch } from './lead-research';
import { llmResearchText, llmStructured } from './llm';
import { rejectInQuickReview } from './workflow';

/**
 * KI-Prüfung gefundener Betriebe: Claude sucht selbst im Netz (Name + Ort, Telefonnummer, Verzeichnisse, Profile)
 * und liefert dieselbe Recherche wie die Schnellprüfung von Hand – aber nur mit Belegen, die die Websuche
 * tatsächlich gefunden hat. Gespeichert wird über `saveLeadResearch`, also mit denselben Regeln und Sperren.
 * Läuft nur, wenn der Betreiber `research.autoAi` einschaltet; das ist zugleich seine Bestätigung der zulässigen
 * Nutzung öffentlich auffindbarer Geschäftsangaben (lawfulUseConfirmed).
 */

export const aiResearchKey = (leadId: string) => `ai-research:${leadId}`;

export interface AiResearchStatus {
  at: string;
  state: 'running' | 'ready' | 'review' | 'excluded' | 'has_website' | 'error';
  note?: string;
  /** Anzahl gefundener Quellenseiten */
  sources?: number;
}

const DEMAND_KINDS = ['available_dates', 'service_advertising', 'new_offer', 'expansion', 'takeover', 'active_profile'] as const;

/** Ergebnis der strukturierten Auswertung des Rechercheberichts */
export interface AiResearchOutput {
  ownWebsite: { found: boolean; url: string | null };
  searched: { name_city: boolean; phone: boolean; directory_links: boolean; profile_links: boolean };
  notSuitable: { value: boolean; reason: string };
  facts: { kind: string; text: string; source: string; occurredOn?: string | null }[];
  summary: string;
}

const KINDS = [
  'address',
  'operational',
  'independent',
  'private_clients',
  'business_clients',
  'service',
  'specialty',
  'area',
  ...DEMAND_KINDS,
  'closed',
  'subcontract_only',
  'fully_booked',
] as const;

export const AI_RESEARCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ownWebsite', 'searched', 'notSuitable', 'facts', 'summary'],
  properties: {
    ownWebsite: {
      type: 'object',
      additionalProperties: false,
      required: ['found', 'url'],
      properties: { found: { type: 'boolean' }, url: { type: ['string', 'null'] } },
    },
    searched: {
      type: 'object',
      additionalProperties: false,
      required: [...WEBSITE_METHODS],
      properties: Object.fromEntries(WEBSITE_METHODS.map((m) => [m, { type: 'boolean' }])),
    },
    notSuitable: {
      type: 'object',
      additionalProperties: false,
      required: ['value', 'reason'],
      properties: { value: { type: 'boolean' }, reason: { type: 'string' } },
    },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'text', 'source', 'occurredOn'],
        properties: {
          kind: { type: 'string', enum: [...KINDS] },
          text: { type: 'string' },
          source: { type: 'string' },
          occurredOn: {
            type: ['string', 'null'],
            description:
              'Tatsächliches Veröffentlichungs-/Ereignisdatum YYYY-MM-DD. Kein Abrufdatum und kein geratenes Datum; sonst null.',
          },
        },
      },
    },
    summary: { type: 'string' },
  },
} as const;

const SEARCH_SYSTEM = `Du prüfst für ein kleines Webdesign-Unternehmen, ob ein lokaler Betrieb in Deutschland eine eigene Website hat und ob er gerade aktiv ist. Suche gründlich und ehrlich, erfinde nichts.
Suche nacheinander: 1) „Name + Ort“, 2) die Telefonnummer, 3) Branchenverzeichnisse (z. B. Gelbe Seiten, Das Örtliche, 11880), 4) Social-Media-Profile (Instagram, Facebook).
Schreibe danach einen kurzen sachlichen Bericht auf Deutsch:
- Eigene Website: ja/nein (eine eigene Domain des Betriebs zählt als Website; reine Verzeichnis- oder Social-Media-Seiten nicht). Falls ja: die Adresse.
- Stimmen Name und Anschrift? Ist der Betrieb aktiv (aktuelle Beiträge, Öffnungszeiten, neue Bewertungen)? Eigenständig oder Teil einer Kette/Franchise?
- Für wen arbeitet er (Privat-/Gewerbekunden)? Welche Leistungen bietet er tatsächlich an (wörtlich aus den Quellen)?
- Gibt es ein aktuelles Signal (wirbt gerade für Leistungen, freie Termine, neues Angebot, aktives Profil)?
- Nenne das tatsächlich sichtbare Veröffentlichungs-/Ereignisdatum jeder Aktivitäts-/Akquisebeobachtung. Ein erneut gelesener alter Suchtreffer ist kein neues Ereignis. Fehlende Daten als unbekannt lassen.
- Gründe gegen eine Ansprache (geschlossen, nur Subunternehmer, ausgelastet).
Nenne zu jeder Aussage die Seite, auf der du sie gefunden hast. Verwende keine Inhalte von Google Maps und keine Handelsregister-Auskünfte.`;

const EXTRACT_SYSTEM = `Du überträgst einen Rechercheberichts in ein festes Format. Übernimm nur Aussagen, die im Bericht stehen und eine Quelle aus der Quellenliste haben. Jede Angabe ist kurz (höchstens 140 Zeichen, Leistungen höchstens 40 Zeichen, wörtlich). Gib als source genau eine Adresse aus der Quellenliste an. „operational“ und aktuelle Signale (available_dates, service_advertising, new_offer, expansion, takeover, active_profile) nur, wenn im Bericht datierte sichtbare Aktivität aus den letzten drei Monaten steht (z. B. neue Beiträge, aktuelle Angebote, neue Bewertungen) – ein leeres oder altes Profil zählt nicht. Speichere das tatsächliche Datum in occurredOn, niemals das heutige Prüfdatum einsetzen. Ist kein Ereignisdatum belegt, occurredOn=null und keine aktuelle Aktivität bestätigen. Leistungen nur, wenn der Betrieb sie selbst nennt. Rufe das Tool recherche_ergebnis auf.`;

/**
 * Nicht als Quelle: Google-Maps-Inhalte (docs/compliance-google.md) und Handelsregister-Auskünfte
 * (nur nach eigener Compliance-Prüfung, docs/compliance-handelsregister.md).
 */
export const RESEARCH_BLOCKED_DOMAINS = [
  'maps.google.com',
  'maps.app.goo.gl',
  'g.page',
  'northdata.de',
  'northdata.com',
  'handelsregister.de',
  'unternehmensregister.de',
  'online-handelsregister.de',
  'peoplecheck.de',
  'firmenwissen.de',
  'moneyhouse.de',
  'companyhouse.de',
];
const blocked = (url: string) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return (
      RESEARCH_BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)) ||
      /googleapis\.com$/.test(host) ||
      /google\.[a-z.]+\/maps/i.test(url)
    );
  } catch {
    return true;
  }
};
const isAllowedSource = (url: string, allowed: Set<string>) => allowed.has(url) && /^https:\/\//.test(url) && !blocked(url);

/**
 * Aus der KI-Auswertung eine Recherche bauen. Nur Belege mit einer Quelle, die die Websuche wirklich geliefert hat;
 * ohne verwertbare Quelle gibt es keine Recherche (der Betrieb bleibt dann für die Prüfung von Hand stehen).
 */
export function researchFromAi(
  out: AiResearchOutput,
  sources: string[],
  now = new Date(),
): Omit<LeadResearch, 'version' | 'identityHash' | 'checkedAt'> | null {
  const allowed = new Set(sources);
  const at = now.toISOString();
  const signals: ResearchSignal[] = [];
  const seen = new Set<string>();
  for (const f of out.facts) {
    const dated = f.kind === 'operational' || (DEMAND_KINDS as readonly string[]).includes(f.kind);
    const event = f.occurredOn ? new Date(`${f.occurredOn}T00:00:00Z`) : null;
    const validEvent = Boolean(
      event &&
      Number.isFinite(event.getTime()) &&
      /^\d{4}-\d{2}-\d{2}$/.test(f.occurredOn!) &&
      event.toISOString().slice(0, 10) === f.occurredOn &&
      event <= now,
    );
    if ((dated && !validEvent) || (f.occurredOn && !validEvent)) continue;
    const text = f.text.replace(/[\r\n{}*<>]/g, ' ').trim();
    if (!KINDS.includes(f.kind as (typeof KINDS)[number]) || !isAllowedSource(f.source, allowed)) continue;
    if (text.length < 3 || (f.kind === 'service' && text.length > 40)) continue;
    const key = `${f.kind}|${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    signals.push({
      kind: f.kind as ResearchSignal['kind'],
      text: text.slice(0, 140),
      source: f.source,
      observedAt: at,
      verified: true,
      ...(validEvent ? { occurredOn: f.occurredOn! } : {}),
    });
  }
  const websiteSource =
    out.ownWebsite.found && out.ownWebsite.url && /^https:\/\//.test(out.ownWebsite.url)
      ? out.ownWebsite.url
      : (signals[0]?.source ?? sources.find((s) => isAllowedSource(s, allowed)));
  if (!websiteSource) return null;
  return {
    lawfulUseConfirmed: true,
    website: {
      result: out.ownWebsite.found ? 'found' : 'not_found',
      checkedAt: at,
      source: websiteSource,
      methods: WEBSITE_METHODS.filter((m) => out.searched[m]),
      ...(out.ownWebsite.found && out.ownWebsite.url && /^https:\/\//.test(out.ownWebsite.url)
        ? { foundUrl: out.ownWebsite.url }
        : {}),
    },
    signals: signals.slice(0, 20),
  };
}

/** Einen Betrieb per KI prüfen; Ergebnis landet in der Recherche, passende Betriebe gehen direkt zum Demo-Bau. */
export async function aiResearchLead(leadId: string, actor = 'job:ai-research'): Promise<AiResearchStatus> {
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  const status = async (s: Omit<AiResearchStatus, 'at'>) => {
    const full = { ...s, at: new Date().toISOString() };
    await setSetting(aiResearchKey(leadId), full, actor);
    return full;
  };
  if (!lead || lead.anonymizedAt || lead.status !== 'discovered')
    return { at: new Date().toISOString(), state: 'review', note: 'nicht offen' };
  await status({ state: 'running' });
  try {
    const facts = [
      `Name: ${lead.businessName}`,
      `Anschrift laut Karte: ${[lead.street, lead.houseNumber].filter(Boolean).join(' ')}, ${lead.postalCode ?? ''} ${lead.city}`,
      `Telefon laut Karte: ${lead.phone ?? 'unbekannt'}`,
      `Branche: ${lead.branch}`,
      `Eingetragener Link: ${lead.websiteUri ?? 'keiner'}`,
    ].join('\n');
    const cfg = await getConfig();
    const { text, sources } = await llmResearchText({
      tier: 'creative',
      purpose: 'lead_research',
      leadId,
      system: SEARCH_SYSTEM,
      prompt: `Prüfe diesen Betrieb:\n${facts}`,
      webSearch: { maxUses: cfg.research.maxSearches, city: lead.city, blockedDomains: RESEARCH_BLOCKED_DOMAINS },
      maxTokens: 6000,
      effort: 'medium',
    });
    const out = await llmStructured<AiResearchOutput>({
      tier: 'creative',
      purpose: 'lead_research_extract',
      leadId,
      system: EXTRACT_SYSTEM,
      prompt: `Betrieb:\n${facts}\n\nBericht:\n${text.slice(0, 12000)}\n\nQuellenliste:\n${sources.slice(0, 60).join('\n') || '(keine)'}`,
      toolName: 'recherche_ergebnis',
      toolDescription: 'Strukturiertes Ergebnis der Betriebsrecherche',
      inputSchema: AI_RESEARCH_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 3000,
      effort: 'low',
    });
    const found = sources.length;
    if (out.ownWebsite.found) {
      await rejectInQuickReview(leadId, 'has_website', actor);
      return await status({ state: 'has_website', note: out.ownWebsite.url ?? 'eigene Website gefunden', sources: found });
    }
    if (out.notSuitable.value) {
      await rejectInQuickReview(leadId, 'manual', actor);
      return await status({ state: 'excluded', note: out.notSuitable.reason.slice(0, 200), sources: found });
    }
    const research = researchFromAi(out, sources);
    if (!research) return await status({ state: 'review', note: 'Keine belastbaren Quellen gefunden', sources: found });
    const assessment = await saveLeadResearch(leadId, research, actor);
    if (assessment.state === 'ready')
      await enqueue(QUEUES.pipelineTick, {}, { singletonKey: 'pipeline-tick-now' }).catch(() => null);
    return await status({
      state: assessment.state === 'ready' ? 'ready' : assessment.state === 'excluded' ? 'excluded' : 'review',
      note: (assessment.state === 'ready' ? out.summary : [...assessment.exclusions, ...assessment.missing].join(' · ')).slice(
        0,
        300,
      ),
      sources: found,
    });
  } catch (err) {
    await audit(db, {
      entity: 'lead',
      entityId: leadId,
      action: 'ai_research_failed',
      actor,
      context: { error: err instanceof Error ? err.message.slice(0, 200) : 'unbekannt' },
    });
    await status({ state: 'error', note: err instanceof Error ? err.message.slice(0, 200) : 'Fehler' });
    throw err;
  }
}

/**
 * Teil des Pipeline-Takts: noch nie per KI geprüfte, offene Betriebe mit Telefonnummer einreihen (beste zuerst).
 * Ohne echten KI-Schlüssel (Mock) passiert nichts – erfundene Recherchen gibt es nicht.
 */
export async function enqueueAiResearch(): Promise<number> {
  const cfg = await getConfig({ fresh: true });
  const sw = effectiveSwitches(cfg);
  if (!cfg.research.autoAi || sw.killSwitch || getProviders().llm.name === 'mock') return 0;
  const rows = await getDb()
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.status, 'discovered'),
        isNull(leads.anonymizedAt),
        isNotNull(leads.phone),
        sql`NOT EXISTS (SELECT 1 FROM settings s WHERE s.key = 'ai-research:' || ${leads.id}::text)`,
      ),
    )
    .orderBy(desc(leads.prescreenScore), desc(leads.createdAt))
    .limit(cfg.research.perTick);
  for (const r of rows)
    await enqueue(QUEUES.researchLead, { leadId: r.id, triggeredBy: 'pipeline' }, { singletonKey: `research:${r.id}` });
  return rows.length;
}

/** Letzter KI-Prüfstand eines Betriebs (für Admin-Seiten). */
export async function aiResearchStatus(leadId: string): Promise<AiResearchStatus | null> {
  return getSetting<AiResearchStatus | null>(aiResearchKey(leadId), null);
}
