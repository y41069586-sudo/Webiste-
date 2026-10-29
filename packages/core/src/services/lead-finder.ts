import { hintKey } from '../demos/business-design';
import { setSetting } from '../config/service';
import { and, eq, gt, ne, or, sql } from 'drizzle-orm';
import { getEnv } from '../config/env';
import { getConfig } from '../config/service';
import { DEFAULT_BRANCHES, type AppConfig, type BranchConfig } from '../config/settings';
import { getDb, type DbOrTx } from '../db/client';
import { leads, settings } from '../db/schema';
import { businessHash, normalizeAddress, normalizeBusinessName, segmentKey, businessPhoneKey } from '../leads/normalize';
import { classifyWebsite, qualify, REJECTION_LABELS, type RatingSignal, type RejectionReason } from '../leads/qualify';
import { logger } from '../logger';
import { classifyIndustry, exclusionFor } from '../playbooks';
import { getProviders } from '../providers';
import { GooglePlacesClient, GooglePlacesLeadSource } from '../providers/lead-source/google-places';
import type { LeadSource, RawPlace } from '../providers/types';
import { randomToken } from '../util/crypto';
import { addMonths } from '../util/time';
import { audit } from './audit';
import { assertBudgetAvailable, assertNotHalted, recordCost } from './budget';
import { transitionLead } from './lead-state';
import { isSuppressed } from './suppression';
import { campaignBranches, campaignRank, assessAcquisition } from '../leads/acquisition';
import { prescreen } from '../leads/prescreen';
import { leadResearch } from './lead-research';
import { probeOwnWebsite } from '../leads/website-probe';
import { runWithProgress, type SearchProgressReporter } from './progress';

export interface FindLeadsOptions {
  cities?: string[];
  branches?: string[];
  actor: string;
  /** Mindest-Punkte der Vorauswahl; Standard filters.minLeadScore */
  minScore?: number;
  /** Live-Fortschritt für die Verwaltung */
  progress?: SearchProgressReporter;
}

export interface FindLeadsSummary {
  source: string;
  mode: string;
  queries: number;
  found: number;
  created: number;
  updated: number;
  skipped: number;
  qualified: number;
  rejected: number;
  needsReview: number;
  byReason: Partial<Record<RejectionReason, number>>;
  costCents: number;
  googleLookups: number;
  /** Automatische Website-Vorprüfungen (nur mit targeting.acquisition.websiteProbe) und deren Funde */
  websiteProbes: number;
  websiteProbeHits: number;
  /** Vorprüfung fand eine wahrscheinliche, aber nicht belegte eigene Website */
  websiteProbePossible: number;
  /** Automatische Vorauswahl der qualifizierten bzw. zu prüfenden Leads (leads/prescreen.ts) */
  prescreenTiers: { top: number; mittel: number; niedrig: number };
  /** Geeignet, aber unter der Mindestgrenze der Vorauswahl aussortiert */
  belowMin: number;
  minScore: number;
  /** In der Verwaltung gestoppt, bevor alle Treffer geprüft waren */
  stopped?: boolean;
  errors: string[];
}

interface Candidate {
  place: RawPlace;
  branch: BranchConfig;
  city: string;
  query: string;
}

export class LeadSourceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeadSourceConfigError';
  }
}

interface ResolvedSources {
  primary: LeadSource;
  fallback?: LeadSource;
  signal?: GooglePlacesClient;
  mode: string;
}

/** Wählt die Quelle gemäß Compliance-Modus (docs/compliance-google.md). */
export function resolveLeadSources(cfg: AppConfig): ResolvedSources {
  const env = getEnv();
  const providers = getProviders();
  const osm = providers.leadSources[0]!;
  if (osm.kind === 'mock') return { primary: osm, mode: 'mock' };

  const mode = cfg.leadSource.mode;
  if (mode === 'osm') return { primary: osm, mode };
  if (!env.GOOGLE_PLACES_API_KEY) {
    throw new LeadSourceConfigError(`Modus ${mode} verlangt GOOGLE_PLACES_API_KEY.`);
  }
  const client = new GooglePlacesClient(env.GOOGLE_PLACES_API_KEY, cfg.costs.placesTextSearchPer1000UsdCents, cfg.costs.usdToEur);
  if (mode === 'osm_google_signal') {
    if (!cfg.leadSource.googleSignalAcknowledgement.trim()) {
      throw new LeadSourceConfigError('Signal-Modus erst nach dokumentierter rechtlicher Prüfung (Einstellungen → Lead-Quelle).');
    }
    return { primary: osm, signal: client, mode };
  }
  if (!cfg.leadSource.googleTextSearchApproval.trim()) {
    throw new LeadSourceConfigError(
      'Google Text Search als Primärquelle ist nach den Google-Bedingungen (3.3.2(a)(iii)) ohne Genehmigung unzulässig.',
    );
  }
  return { primary: new GooglePlacesLeadSource(client), fallback: osm, mode };
}

function nameKey(p: RawPlace): string {
  return normalizeBusinessName(p.name);
}

/**
 * Ketten-Heuristik: gleicher normalisierter Name an ≥ N verschiedenen Standorten
 * (aktuelle Treffer + bereits bekannte Leads in anderen Städten).
 */
async function chainNames(db: DbOrTx, candidates: Candidate[], minLocations: number): Promise<Set<string>> {
  const locations = new Map<string, Set<string>>();
  for (const c of candidates) {
    const k = nameKey(c.place);
    if (!k) continue;
    const set = locations.get(k) ?? new Set<string>();
    set.add(`${c.city}|${normalizeAddress(c.place)}`);
    locations.set(k, set);
  }
  const keys = [...locations.keys()];
  if (keys.length) {
    // bekannte Leads mit gleichem Namen (andere Städte) einbeziehen
    const rows = await db.execute<{
      business_name: string;
      city: string;
      street: string | null;
      house_number: string | null;
      postal_code: string | null;
    }>(sql`SELECT business_name, city, street, house_number, postal_code FROM leads WHERE anonymized_at IS NULL`);
    for (const r of rows.rows) {
      const k = normalizeBusinessName(r.business_name);
      const set = locations.get(k);
      if (set)
        set.add(`${r.city}|${normalizeAddress({ street: r.street, houseNumber: r.house_number, postalCode: r.postal_code })}`);
    }
  }
  return new Set([...locations.entries()].filter(([, s]) => s.size >= minLocations).map(([k]) => k));
}

async function recentlyContacted(
  db: DbOrTx,
  identity: string,
  place: RawPlace,
  months: number,
  selfId?: string,
): Promise<boolean> {
  const since = addMonths(new Date(), -months);
  const sameAddress =
    place.street && place.houseNumber && place.postalCode
      ? and(
          sql`lower(${leads.street}) = lower(${place.street})`,
          sql`lower(${leads.houseNumber}) = lower(${place.houseNumber})`,
          eq(leads.postalCode, place.postalCode),
        )
      : undefined;
  const rows = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        or(eq(leads.identityHash, identity), sameAddress),
        gt(leads.contactedAt, since),
        selfId ? ne(leads.id, selfId) : undefined,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function duplicateOf(db: DbOrTx, identity: string, selfId?: string): Promise<string | null> {
  const rows = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.identityHash, identity), ne(leads.status, 'rejected'), selfId ? ne(leads.id, selfId) : undefined))
    .limit(1);
  return rows[0]?.id ?? null;
}
async function phoneDuplicateOf(db: DbOrTx, place: RawPlace, selfId?: string) {
  const phone = businessPhoneKey(place.phone);
  if (!phone || !place.city) return null;
  const rows = await db
    .select({ id: leads.id, name: leads.businessName, phone: leads.phone })
    .from(leads)
    .where(and(eq(leads.city, place.city), ne(leads.status, 'rejected'), selfId ? ne(leads.id, selfId) : undefined));
  return (
    rows.find(
      (other) =>
        businessPhoneKey(other.phone) === phone && normalizeBusinessName(other.name) === normalizeBusinessName(place.name),
    )?.id ?? null
  );
}

const UPDATABLE_STATUSES = new Set(['discovered', 'qualified', 'rejected']);

/** Lead-Suche über alle konfigurierten Städte × Branchen. Idempotent (Upsert über Quelle + ID). */
export async function findLeads(opts: FindLeadsOptions): Promise<FindLeadsSummary> {
  return opts.progress ? runWithProgress(opts.progress, () => findLeadsRun(opts)) : findLeadsRun(opts);
}

async function findLeadsRun(opts: FindLeadsOptions): Promise<FindLeadsSummary> {
  const progress = opts.progress;
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  await assertNotHalted(cfg);
  const src = resolveLeadSources(cfg);
  const cities = opts.cities?.length ? opts.cities : cfg.targeting.cities;
  const selection =
    cfg.offers.activeVersion === 'v4'
      ? campaignBranches(cfg.targeting.branches, cfg.targeting.acquisition, DEFAULT_BRANCHES)
      : cfg.targeting.branches.filter((b) => b.active);
  const branches = selection.filter((b) => !opts.branches?.length || opts.branches.includes(b.key));
  const minScore = opts.minScore ?? cfg.filters.minLeadScore;
  const summary: FindLeadsSummary = {
    source: src.primary.kind,
    mode: src.mode,
    queries: 0,
    found: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    qualified: 0,
    rejected: 0,
    needsReview: 0,
    byReason: {},
    costCents: 0,
    googleLookups: 0,
    websiteProbes: 0,
    websiteProbeHits: 0,
    websiteProbePossible: 0,
    prescreenTiers: { top: 0, mittel: 0, niedrig: 0 },
    belowMin: 0,
    minScore,
    errors: [],
  };
  const totalQueries =
    cities.length * branches.reduce((n, b) => n + (src.primary.kind === 'google_places' ? b.queries.length : 1), 0);
  progress?.phase('suchen', 'Betriebe werden gesucht …', totalQueries);

  // 1) Suchen
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (const city of cities) {
    const agsPrefix = cfg.targeting.cityAgs[city] ?? cfg.targeting.agsPrefix;
    for (const branch of branches) {
      // OSM sucht über Tags (einmal je Branche), Google über die Suchbegriffe
      const texts =
        src.primary.kind === 'google_places' ? branch.queries.map((q) => `${q} ${city}`) : [`${branch.label} ${city}`];
      for (const text of texts) {
        try {
          if (src.primary.kind === 'google_places') {
            await assertBudgetAvailable('places_api', Math.ceil(cfg.targeting.maxPagesPerQuery * 4));
          }
          let res;
          try {
            res = await src.primary.search({ text, city, branch, maxPages: cfg.targeting.maxPagesPerQuery, agsPrefix });
          } catch (err) {
            if (!src.fallback) throw err;
            logger.warn(
              { text, err: err instanceof Error ? err.message : String(err) },
              'lead-finder: Primärquelle fehlgeschlagen, nutze Fallback',
            );
            res = await src.fallback.search({ text, city, branch, maxPages: cfg.targeting.maxPagesPerQuery, agsPrefix });
          }
          summary.queries++;
          // Die erste Suche baut evtl. die Karte auf; danach zurück in die Suchphase
          if (progress && progress.state.phase !== 'suchen') progress.phase('suchen', 'Betriebe werden gesucht …', totalQueries);
          progress?.step(summary.queries, `Suche: ${branch.label} in ${city} (${summary.queries} von ${totalQueries})`);
          for (const w of res.warnings ?? []) if (!summary.errors.includes(w)) summary.errors.push(w);
          if (res.costCents > 0) {
            summary.costCents += res.costCents;
            await recordCost(db, {
              category: 'places_api',
              amountMicroCents: Math.round(res.costCents * 1e6),
              ref: `search:${text}`,
              meta: { requests: res.requests, source: src.primary.kind },
            });
          }
          for (const place of res.places) {
            const key = `${place.source}:${place.sourceId}`;
            if (seen.has(key)) continue; // erste passende Branche gewinnt
            seen.add(key);
            candidates.push({ place, branch, city, query: text });
          }
          if (progress) progress.state.counts.found = candidates.length;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          summary.errors.push(`${text}: ${msg}`);
          if (err instanceof Error && (err.name === 'KillSwitchError' || err.name === 'BudgetExceededError')) throw err;
        }
      }
    }
  }
  summary.found = candidates.length;
  // Vielversprechende Treffer zuerst: die begrenzte Website-Vorprüfung trifft so die Leads, die zuerst recherchiert werden
  const policy = cfg.targeting.acquisition;
  const early = (c: Candidate) =>
    prescreen({
      place: c.place,
      campaignRank: campaignRank(c.branch.key, policy),
      socialOnly: classifyWebsite(c.place.websiteUri, cfg.filters.socialDomains).socialOnly,
    }).score;
  if (policy.websiteProbe && src.primary.kind !== 'mock') candidates.sort((a, b) => early(b) - early(a));
  const chains = await chainNames(db, candidates, cfg.targeting.chainMinCities);
  const firstScan = new Map<string, Date | null>();
  /** Erstes Auftauchen eines Segments (vor diesem Lauf) – Grundlage für „neu aufgetaucht“ */
  const segmentFirstSeen = async (key: string): Promise<Date | null> => {
    if (!firstScan.has(key)) {
      const r = await db.execute<{ first: Date | null }>(
        sql`SELECT min(first_seen_at) AS first FROM leads WHERE segment_key = ${key}`,
      );
      firstScan.set(key, r.rows[0]?.first ? new Date(r.rows[0].first) : null);
    }
    return firstScan.get(key)!;
  };
  const runStart = new Date();

  // 2) Upsert + Qualifizierung
  progress?.phase('pruefen', `${candidates.length} Treffer werden geprüft …`, candidates.length);
  let checked = 0;
  const tick = (
    name: string,
    outcome: 'geeignet' | 'pruefen' | 'unter_schwelle' | 'aussortiert' | 'uebersprungen',
    detail?: string,
    score?: number,
  ) => {
    checked++;
    if (!progress) return;
    const k = progress.state.counts;
    k.checked = checked;
    k.qualified = summary.qualified;
    k.needsReview = summary.needsReview;
    k.belowMin = summary.belowMin;
    k.rejected = summary.rejected;
    progress.log({ name, outcome, detail, score });
    progress.step(checked, `Prüfe ${checked} von ${candidates.length}: ${name}`);
  };
  for (const c of candidates) {
    if (progress && (await progress.shouldStop())) {
      summary.stopped = true;
      break;
    }
    const { place, branch, city } = c;
    const existing = await db.query.leads.findFirst({
      where: and(eq(leads.source, place.source), eq(leads.sourceId, place.sourceId)),
    });
    if (existing && (!UPDATABLE_STATUSES.has(existing.status) || existing.anonymizedAt)) {
      summary.skipped++;
      tick(place.name, 'uebersprungen', 'schon in Bearbeitung');
      continue;
    }
    const identity = businessHash(place.name, place);
    const suppressed = await isSuppressed(db, {
      name: place.name,
      street: place.street,
      houseNumber: place.houseNumber,
      postalCode: place.postalCode,
      source: place.source,
      sourceId: place.sourceId,
    });
    const contacted = await recentlyContacted(db, identity, place, cfg.filters.recontactMonths, existing?.id);
    const dup = (await duplicateOf(db, identity, existing?.id)) ?? (await phoneDuplicateOf(db, place, existing?.id));

    // Bewertungssignal: Mock-Daten direkt; Google nur flüchtig im Signal-Modus
    let rating: RatingSignal | null = null;
    let googlePlaceId: string | null = existing?.googlePlaceId ?? null;
    let googleWebsite: string | null = null;
    if (place.source === 'mock' && place.rating !== undefined && place.ratingCount !== undefined) {
      rating = { rating: place.rating, ratingCount: place.ratingCount };
    } else if (place.source === 'google_places' && place.rating !== undefined && place.ratingCount !== undefined) {
      rating = { rating: place.rating, ratingCount: place.ratingCount };
    }
    // „neu aufgetaucht“: das Segment wurde schon früher (≥ 6 Tage vorher) durchsucht und der Betrieb kam erst später dazu
    const segKey = segmentKey(city, branch.group, branch.key);
    const segFirst = await segmentFirstSeen(segKey);
    const seenAt = existing?.firstSeenAt ?? runStart;
    const newAppearance = Boolean(
      segFirst &&
      seenAt.getTime() - segFirst.getTime() >= 6 * 86400_000 &&
      runStart.getTime() - seenAt.getTime() <= cfg.segments.newWindowDays * 86400_000,
    );
    // Branchen-Zuordnung und Ausschluss (Gesundheit/Recht) laut Playbooks
    const exclusion = exclusionFor(place);
    const excludedIndustry = exclusion !== null;
    const industry = classifyIndustry(place, branch);
    const prelim = qualify({
      place,
      branch,
      city,
      cfg,
      isSuppressed: suppressed,
      recentlyContacted: contacted,
      chainByFrequency: chains.has(nameKey(place)),
      isDuplicate: Boolean(dup),
      rating,
      newAppearance,
      excludedIndustry,
    });
    if (src.signal && prelim.qualified && place.street && place.houseNumber && place.postalCode) {
      try {
        await assertBudgetAvailable('places_api', 4);
        const sig = await src.signal.lookupSignal(place.name, place.street, place.houseNumber, place.postalCode, city);
        summary.googleLookups++;
        const cost = src.signal.costPerRequestCents();
        summary.costCents += cost;
        await recordCost(db, {
          category: 'places_api',
          amountMicroCents: Math.round(cost * 1e6),
          ref: 'signal',
          meta: { requests: 1 },
        });
        if (sig) {
          googlePlaceId = sig.placeId;
          if (sig.rating !== null && sig.ratingCount !== null) rating = { rating: sig.rating, ratingCount: sig.ratingCount };
          googleWebsite = sig.websiteUri;
          if (sig.businessStatus) place.businessStatus = sig.businessStatus;
        }
      } catch (err) {
        if (err instanceof Error && (err.name === 'KillSwitchError' || err.name === 'BudgetExceededError')) throw err;
        summary.errors.push(`signal: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    let placeForQualify = googleWebsite && !place.websiteUri ? { ...place, websiteUri: googleWebsite } : place;
    // Automatische Vorprüfung auf eine doch vorhandene eigene Website (nie für Mock-Quellen). Social-/Portal-Links
    // sind keine eigene Website und werden deshalb ebenfalls geprüft.
    let probeOutcome: 'found' | 'possible' | 'none' | undefined;
    if (
      policy.websiteProbe &&
      place.source !== 'mock' &&
      prelim.qualified &&
      !classifyWebsite(placeForQualify.websiteUri, cfg.filters.socialDomains).hasWebsite &&
      // Die Vorprüfung kann die Punkte nur senken: unter der Grenze lohnt sie sich nicht
      !(minScore > 0 && early(c) < minScore) &&
      summary.websiteProbes < policy.websiteProbeMax
    ) {
      summary.websiteProbes++;
      const probe = await probeOwnWebsite({
        businessName: place.name,
        city,
        branch: branch.key,
        phone: place.phone,
        street: place.street && place.houseNumber ? `${place.street} ${place.houseNumber}` : place.street,
        postalCode: place.postalCode,
        emailDomain: place.sourceMeta?.emailDomain,
      });
      probeOutcome = probe.result;
      if (probe.result === 'possible') {
        summary.websiteProbePossible++;
        await audit(db, {
          entity: 'lead_candidate',
          entityId: identity,
          actor: opts.actor,
          action: 'website_probe_possible',
          context: { checkedAt: probe.checkedAt, candidates: probe.candidates.length },
        });
      }
      if (probe.result === 'found' && probe.url) {
        summary.websiteProbeHits++;
        placeForQualify = { ...placeForQualify, websiteUri: probe.url };
        await audit(db, {
          entity: 'lead_candidate',
          entityId: identity,
          actor: opts.actor,
          action: 'website_probe_found',
          // Keine URL im Audit-Log (Domain kann einen Personennamen enthalten); sie steht am Lead (websiteUri)
          context: { matched: probe.matched, checkedAt: probe.checkedAt, candidates: probe.candidates.length },
        });
      }
    }
    const result = qualify({
      place: placeForQualify,
      branch,
      city,
      cfg,
      isSuppressed: suppressed,
      recentlyContacted: contacted,
      chainByFrequency: chains.has(nameKey(place)),
      isDuplicate: Boolean(dup),
      rating,
      newAppearance,
      excludedIndustry,
    });

    const pre = prescreen({
      place,
      campaignRank: campaignRank(branch.key, policy),
      socialOnly: result.website.socialOnly,
      probe: probeOutcome,
    });
    // Mindestgrenze der Vorauswahl (nicht für Offline-Mock-Daten)
    const belowMin = result.qualified && place.source !== 'mock' && minScore > 0 && pre.score < minScore;
    const reasons: RejectionReason[] = belowMin ? [...result.reasons, 'score_too_low'] : result.reasons;
    // Google-Inhalte (Bewertung, Website, Name/Anschrift) werden NICHT gespeichert – nur place_id
    const persistRating = place.source === 'mock';
    const values = {
      source: place.source,
      sourceId: place.sourceId,
      businessName: place.name,
      branch: branch.key,
      branchGroup: branch.group,
      industry,
      city,
      street: place.street ?? null,
      houseNumber: place.houseNumber ?? null,
      postalCode: place.postalCode ?? null,
      country: place.country ?? 'DE',
      phone: place.phone ?? null,
      openingHours: place.openingHours ?? null,
      rating: persistRating ? (place.rating ?? null) : null,
      ratingCount: persistRating ? (place.ratingCount ?? null) : null,
      hasWebsite: result.website.hasWebsite,
      websiteUri: place.source === 'google_places' ? null : (result.website.websiteUri ?? null),
      socialOnly: result.website.socialOnly,
      businessStatus: place.businessStatus ?? null,
      primaryType: place.primaryType ?? null,
      rejectionReasons: reasons,
      score: result.score,
      scoreReasons: result.scoreReasons,
      prescreenScore: result.qualified ? pre.score : 0,
      prescreenReasons: result.qualified ? pre.reasons : null,
      leadSegment: result.segment,
      segmentKey: segKey,
      searchQuery: c.query,
      identityHash: identity,
      googlePlaceId,
      googleCheckedAt: src.signal ? new Date() : (existing?.googleCheckedAt ?? null),
      sourceFetchedAt: new Date(),
      updatedAt: new Date(),
    };

    const research = existing ? await leadResearch({ ...existing, ...values }) : null;
    const acquisition =
      cfg.offers.activeVersion === 'v4' && cfg.targeting.acquisition.enabled
        ? assessAcquisition({ ...values }, research, cfg.targeting.acquisition)
        : null;
    if (acquisition) {
      values.score = acquisition.score;
      values.scoreReasons = acquisition.reasons;
    }
    // Mock discovery remains an offline fixture path, never a production verification.
    const target =
      !result.qualified || belowMin
        ? 'rejected'
        : acquisition && place.source !== 'mock' && acquisition.state !== 'ready'
          ? 'discovered'
          : 'qualified';
    await db.transaction(async (tx) => {
      let id: string;
      if (existing) {
        await tx.update(leads).set(values).where(eq(leads.id, existing.id));
        id = existing.id;
        summary.updated++;
      } else {
        const [row] = await tx
          .insert(leads)
          .values({ ...values, status: 'discovered', trackToken: randomToken(24) })
          .returning({ id: leads.id });
        id = row!.id;
        summary.created++;
        await audit(tx, {
          entity: 'lead',
          entityId: id,
          action: 'discovered',
          actor: opts.actor,
          context: { source: place.source, segment: values.segmentKey },
        });
      }
      if (place.source !== 'google_places' && place.designHint && /^#[0-9a-f]{6}$/i.test(place.designHint.primaryColor))
        await setSetting(hintKey(id), { ...place.designHint, checkedAt: new Date().toISOString() }, 'source:design-hint', tx);
      else if (place.source !== 'google_places') await tx.delete(settings).where(eq(settings.key, hintKey(id)));
      const current = existing?.status ?? 'discovered';
      if (current !== target) {
        await transitionLead(tx, id, target, {
          actor: opts.actor,
          reason: reasons.join(',') || undefined,
          soft: true,
        });
      }
    });
    if (target !== 'rejected') summary.prescreenTiers[pre.tier]++;
    if (target === 'qualified') summary.qualified++;
    else if (target === 'discovered') summary.needsReview++;
    else if (belowMin) summary.belowMin++;
    else summary.rejected++;
    if (target === 'rejected') for (const r of reasons) summary.byReason[r] = (summary.byReason[r] ?? 0) + 1;
    if (target === 'qualified') tick(place.name, 'geeignet', undefined, pre.score);
    else if (target === 'discovered') tick(place.name, 'pruefen', 'zur Prüfung', pre.score);
    else if (belowMin) tick(place.name, 'unter_schwelle', `${pre.score} von mind. ${minScore} Punkten`, pre.score);
    else tick(place.name, 'aussortiert', reasons.map((r) => REJECTION_LABELS[r]).join(', '));
  }

  summary.costCents = Math.round(summary.costCents * 100) / 100;
  await audit(db, { entity: 'job', entityId: 'find-leads', action: 'run', actor: opts.actor, context: { ...summary } });
  logger.info({ ...summary, errors: summary.errors.length }, 'lead-finder abgeschlossen');
  return summary;
}

export interface LeadRefresh {
  refreshed: boolean;
  /** Betrieb hat inzwischen eine eigene Website bzw. ist geschlossen → keine weitere Sendung */
  hasWebsite: boolean;
  closed: boolean;
}

/**
 * Neueste Daten eines Betriebs aus der Quelle laden (Telefon, Öffnungszeiten, Website/Social, Status).
 * Name und Anschrift bleiben unverändert (Brief und Demo sind darauf ausgelegt). Google-Inhalte werden nie
 * gespeichert; Quellen ohne Einzelabruf liefern „nicht aufgefrischt“.
 */
export async function refreshLeadData(leadId: string, actor = 'system'): Promise<LeadRefresh> {
  const db = getDb();
  const cfg = await getConfig();
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  if (!lead || lead.anonymizedAt) return { refreshed: false, hasWebsite: false, closed: false };
  const source = getProviders().leadSources.find((s) => s.kind === lead.source);
  if (!source?.refresh) return { refreshed: false, hasWebsite: lead.hasWebsite, closed: false };
  const { place } = await source.refresh(lead.sourceId);
  if (!place) return { refreshed: false, hasWebsite: lead.hasWebsite, closed: false };
  const website = classifyWebsite(place.websiteUri, cfg.filters.socialDomains);
  const closed = Boolean(place.businessStatus && place.businessStatus !== 'OPERATIONAL');
  await db
    .update(leads)
    .set({
      phone: place.phone ?? lead.phone,
      openingHours: place.openingHours ?? lead.openingHours,
      hasWebsite: website.hasWebsite,
      socialOnly: website.socialOnly,
      websiteUri: website.websiteUri ?? null,
      businessStatus: place.businessStatus ?? lead.businessStatus,
      sourceFetchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
  await audit(db, {
    entity: 'lead',
    entityId: leadId,
    action: 'refreshed',
    actor,
    context: { hasWebsite: website.hasWebsite, closed },
  });
  return { refreshed: true, hasWebsite: website.hasWebsite, closed };
}

/** Offene Leads (gefunden/qualifiziert) ober- und unterhalb der Mindestgrenze der Vorauswahl */
export async function leadScorePool(minScore: number): Promise<{ above: number; below: number; best: number }> {
  const r = await getDb().execute<{ above: number; below: number; best: number | null }>(sql`
    SELECT count(*) FILTER (WHERE prescreen_score >= ${minScore})::int AS above,
           count(*) FILTER (WHERE prescreen_score < ${minScore})::int AS below,
           max(prescreen_score)::int AS best
      FROM leads
     WHERE status IN ('discovered', 'qualified') AND anonymized_at IS NULL AND source <> 'mock'`);
  const row = r.rows[0];
  return { above: row?.above ?? 0, below: row?.below ?? 0, best: row?.best ?? 0 };
}

/**
 * Mindestgrenze nachträglich auf vorhandene offene Leads anwenden: unterhalb → „rejected“ mit score_too_low.
 * Nichts wird gelöscht; eine spätere Suche mit niedrigerer Grenze holt die Betriebe zurück.
 */
export async function applyMinLeadScore(minScore: number, actor: string): Promise<number> {
  if (minScore <= 0) return 0;
  const db = getDb();
  const rows = await db.execute<{ id: string; reasons: string[] }>(sql`
    SELECT id, rejection_reasons AS reasons FROM leads
     WHERE status IN ('discovered', 'qualified') AND anonymized_at IS NULL AND source <> 'mock'
       AND prescreen_score < ${minScore}`);
  let n = 0;
  for (const row of rows.rows) {
    await db.transaction(async (tx) => {
      const reasons = [...new Set([...(row.reasons ?? []), 'score_too_low'])];
      await tx.update(leads).set({ rejectionReasons: reasons, updatedAt: new Date() }).where(eq(leads.id, row.id));
      if (await transitionLead(tx, row.id, 'rejected', { actor, reason: 'score_too_low', soft: true })) n++;
    });
  }
  await audit(db, { entity: 'job', entityId: 'find-leads', action: 'apply_min_score', actor, context: { minScore, n } });
  return n;
}
