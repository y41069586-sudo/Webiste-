import { and, eq, gt, ne, or, sql } from 'drizzle-orm';
import { getEnv } from '../config/env';
import { getConfig } from '../config/service';
import type { AppConfig, BranchConfig } from '../config/settings';
import { getDb, type DbOrTx } from '../db/client';
import { leads } from '../db/schema';
import { businessHash, normalizeAddress, normalizeBusinessName, segmentKey } from '../leads/normalize';
import { qualify, type RatingSignal, type RejectionReason } from '../leads/qualify';
import { logger } from '../logger';
import { getProviders } from '../providers';
import { GooglePlacesClient, GooglePlacesLeadSource } from '../providers/lead-source/google-places';
import type { LeadSource, RawPlace } from '../providers/types';
import { randomToken } from '../util/crypto';
import { addMonths } from '../util/time';
import { audit } from './audit';
import { assertBudgetAvailable, assertNotHalted, recordCost } from './budget';
import { transitionLead } from './lead-state';
import { isSuppressed } from './suppression';

export interface FindLeadsOptions {
  cities?: string[];
  branches?: string[];
  actor: string;
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
  byReason: Partial<Record<RejectionReason, number>>;
  costCents: number;
  googleLookups: number;
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
    const rows = await db.execute<{ business_name: string; city: string; street: string | null; house_number: string | null; postal_code: string | null }>(
      sql`SELECT business_name, city, street, house_number, postal_code FROM leads WHERE anonymized_at IS NULL`,
    );
    for (const r of rows.rows) {
      const k = normalizeBusinessName(r.business_name);
      const set = locations.get(k);
      if (set) set.add(`${r.city}|${normalizeAddress({ street: r.street, houseNumber: r.house_number, postalCode: r.postal_code })}`);
    }
  }
  return new Set([...locations.entries()].filter(([, s]) => s.size >= minLocations).map(([k]) => k));
}

async function recentlyContacted(db: DbOrTx, identity: string, place: RawPlace, months: number, selfId?: string): Promise<boolean> {
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
    .where(and(or(eq(leads.identityHash, identity), sameAddress), gt(leads.contactedAt, since), selfId ? ne(leads.id, selfId) : undefined))
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

const UPDATABLE_STATUSES = new Set(['discovered', 'qualified', 'rejected']);

/** Lead-Suche über alle konfigurierten Städte × Branchen. Idempotent (Upsert über Quelle + ID). */
export async function findLeads(opts: FindLeadsOptions): Promise<FindLeadsSummary> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  await assertNotHalted(cfg);
  const src = resolveLeadSources(cfg);
  const cities = opts.cities?.length ? opts.cities : cfg.targeting.cities;
  const branches = cfg.targeting.branches.filter((b) => b.active && (!opts.branches?.length || opts.branches.includes(b.key)));
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
    byReason: {},
    costCents: 0,
    googleLookups: 0,
    errors: [],
  };

  // 1) Suchen
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (const city of cities) {
    for (const branch of branches) {
      // OSM sucht über Tags (einmal je Branche), Google über die Suchbegriffe
      const texts = src.primary.kind === 'google_places' ? branch.queries.map((q) => `${q} ${city}`) : [`${branch.label} ${city}`];
      for (const text of texts) {
        try {
          if (src.primary.kind === 'google_places') {
            await assertBudgetAvailable('places_api', Math.ceil(cfg.targeting.maxPagesPerQuery * 4));
          }
          let res;
          try {
            res = await src.primary.search({ text, city, branch, maxPages: cfg.targeting.maxPagesPerQuery });
          } catch (err) {
            if (!src.fallback) throw err;
            logger.warn({ text, err: err instanceof Error ? err.message : String(err) }, 'lead-finder: Primärquelle fehlgeschlagen, nutze Fallback');
            res = await src.fallback.search({ text, city, branch, maxPages: cfg.targeting.maxPagesPerQuery });
          }
          summary.queries++;
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
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          summary.errors.push(`${text}: ${msg}`);
          if (err instanceof Error && (err.name === 'KillSwitchError' || err.name === 'BudgetExceededError')) throw err;
        }
      }
    }
  }
  summary.found = candidates.length;
  const chains = await chainNames(db, candidates, cfg.targeting.chainMinCities);

  // 2) Upsert + Qualifizierung
  for (const c of candidates) {
    const { place, branch, city } = c;
    const existing = await db.query.leads.findFirst({ where: and(eq(leads.source, place.source), eq(leads.sourceId, place.sourceId)) });
    if (existing && (!UPDATABLE_STATUSES.has(existing.status) || existing.anonymizedAt)) {
      summary.skipped++;
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
    const dup = await duplicateOf(db, identity, existing?.id);

    // Bewertungssignal: Mock-Daten direkt; Google nur flüchtig im Signal-Modus
    let rating: RatingSignal | null = null;
    let googlePlaceId: string | null = existing?.googlePlaceId ?? null;
    let googleWebsite: string | null = null;
    if (place.source === 'mock' && place.rating !== undefined && place.ratingCount !== undefined) {
      rating = { rating: place.rating, ratingCount: place.ratingCount };
    } else if (place.source === 'google_places' && place.rating !== undefined && place.ratingCount !== undefined) {
      rating = { rating: place.rating, ratingCount: place.ratingCount };
    }
    const prelim = qualify({ place, branch, city, cfg, isSuppressed: suppressed, recentlyContacted: contacted, chainByFrequency: chains.has(nameKey(place)), isDuplicate: Boolean(dup), rating });
    if (src.signal && prelim.qualified && place.street && place.houseNumber && place.postalCode) {
      try {
        await assertBudgetAvailable('places_api', 4);
        const sig = await src.signal.lookupSignal(place.name, place.street, place.houseNumber, place.postalCode, city);
        summary.googleLookups++;
        const cost = src.signal.costPerRequestCents();
        summary.costCents += cost;
        await recordCost(db, { category: 'places_api', amountMicroCents: Math.round(cost * 1e6), ref: 'signal', meta: { requests: 1 } });
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
    const placeForQualify = googleWebsite && !place.websiteUri ? { ...place, websiteUri: googleWebsite } : place;
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
    });

    // Google-Inhalte (Bewertung, Website, Name/Anschrift) werden NICHT gespeichert – nur place_id
    const persistRating = place.source === 'mock';
    const values = {
      source: place.source,
      sourceId: place.sourceId,
      businessName: place.name,
      branch: branch.key,
      branchGroup: branch.group,
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
      rejectionReasons: result.reasons,
      score: result.score,
      segmentKey: segmentKey(city, branch.group, branch.key),
      searchQuery: c.query,
      identityHash: identity,
      googlePlaceId,
      googleCheckedAt: src.signal ? new Date() : (existing?.googleCheckedAt ?? null),
      sourceFetchedAt: new Date(),
      updatedAt: new Date(),
    };

    const target = result.qualified ? 'qualified' : 'rejected';
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
        await audit(tx, { entity: 'lead', entityId: id, action: 'discovered', actor: opts.actor, context: { source: place.source, segment: values.segmentKey } });
      }
      const current = existing?.status ?? 'discovered';
      if (current !== target) {
        await transitionLead(tx, id, target, {
          actor: opts.actor,
          reason: result.reasons.join(',') || undefined,
          soft: true,
        });
      }
    });
    if (result.qualified) summary.qualified++;
    else {
      summary.rejected++;
      for (const r of result.reasons) summary.byReason[r] = (summary.byReason[r] ?? 0) + 1;
    }
  }

  summary.costCents = Math.round(summary.costCents * 100) / 100;
  await audit(db, { entity: 'job', entityId: 'find-leads', action: 'run', actor: opts.actor, context: { ...summary } });
  logger.info({ ...summary, errors: summary.errors.length }, 'lead-finder abgeschlossen');
  return summary;
}
