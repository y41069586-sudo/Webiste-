import { logger } from '../../logger';
import { formatPhoneDe } from '../../leads/normalize';
import { parseOsmOpeningHours } from '../../leads/opening-hours';
import { HttpError, withRetry } from '../../util/retry';
import type { LeadSearchQuery, LeadSearchResult, LeadSource, RawPlace, SourceMeta } from '../types';

export interface OsmElement {
  type: 'node' | 'way' | 'relation' | 'area';
  id: number;
  tags?: Record<string, string>;
  /** Nur mit `out … meta`: Zeitpunkt der letzten Bearbeitung (Bearbeiter-Felder werden ignoriert) */
  timestamp?: string;
}

/**
 * Anreicherungsabfrage für Einträge ohne vollständige Anschrift: je Element das
 * umschließende Gebäude mit Adresse und das amtliche PLZ-Gebiet (boundary=postal_code).
 * Ausgabe-Reihenfolge: Marker-Element (nur ID), dann zugehörige Gebiete/Gebäude.
 */
export function buildEnrichmentQuery(ids: { type: 'node' | 'way'; id: number }[], timeoutSec = 120): string {
  const nodes = ids.filter((i) => i.type === 'node').map((i) => i.id);
  const ways = ids.filter((i) => i.type === 'way').map((i) => i.id);
  const sel = [nodes.length ? `node(id:${nodes.join(',')});` : '', ways.length ? `way(id:${ways.join(',')});` : ''].join(' ');
  return `[out:json][timeout:${timeoutSec}];
(${sel})->.p;
foreach.p->.n(
  .n out ids;
  (.n; .n >;)->.pts;
  .pts is_in->.ar;
  area.ar["boundary"="postal_code"]->.pc;
  .pc out tags;
  way(pivot.ar)["building"]["addr:housenumber"]["addr:street"];
  out tags;
);`;
}

export interface Enrichment {
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  from: string[];
}

/** Ordnet die Antwort der Anreicherungsabfrage den Elementen zu. */
export function parseEnrichment(elements: OsmElement[], wanted: Set<string>): Map<string, Enrichment> {
  const out = new Map<string, Enrichment>();
  let current: string | null = null;
  for (const el of elements) {
    const key = `${el.type}/${el.id}`;
    if (!el.tags && wanted.has(key)) {
      current = key;
      out.set(key, { from: [] });
      continue;
    }
    if (!current) continue;
    const e = out.get(current)!;
    const t = el.tags ?? {};
    if (el.type === 'area' && t.boundary === 'postal_code' && /^\d{5}$/.test(t.postal_code ?? '')) {
      if (!e.postalCode) {
        e.postalCode = t.postal_code;
        e.from.push('postal_code_area');
      }
    } else if (el.type === 'way' && t['addr:street'] && t['addr:housenumber'] && !e.street) {
      e.street = t['addr:street'];
      e.houseNumber = t['addr:housenumber'];
      if (t['addr:postcode']) e.postalCode = t['addr:postcode'];
      if (t['addr:city']) e.city = t['addr:city'];
      e.from.push('building');
    }
  }
  return out;
}

/** Ergänzt fehlende Adressteile – ohne vorhandene, abweichende Angaben zu überschreiben. */
export function applyEnrichment(p: RawPlace, e: Enrichment | undefined): RawPlace {
  if (!e) return p;
  const r = { ...p };
  const streetMatches = !p.street || !e.street || p.street.toLowerCase() === e.street.toLowerCase();
  if (!r.street && !r.houseNumber && e.street && e.houseNumber) {
    r.street = e.street;
    r.houseNumber = e.houseNumber;
  } else if (r.street && !r.houseNumber && e.houseNumber && streetMatches) {
    r.houseNumber = e.houseNumber;
  }
  if (!r.postalCode && e.postalCode) r.postalCode = e.postalCode;
  return r;
}

/** Overpass-QL-String sicher quoten. */
function q(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function buildOverpassQuery(
  city: string,
  osmTags: LeadSearchQuery['branch']['osmTags'],
  timeoutSec = 90,
  agsPrefix = '',
): string {
  const filters = osmTags
    .map((t) => {
      const extra = Object.entries(t.extra ?? {})
        .map(([k, v]) => `[${q(k)}=${q(v)}]`)
        .join('');
      const exclude = Object.entries(t.exclude ?? {})
        .map(([k, v]) => `[${q(k)}!~${q(`^(${v})$`)}]`)
        .join('');
      return `  nwr[${q(t.key)}=${q(t.value)}]${extra}${exclude}(area.a);`;
    })
    .join('\n');
  return `[out:json][timeout:${timeoutSec}];
area["name"=${q(city)}]["boundary"="administrative"]["admin_level"~"^(6|8)$"]["de:amtlicher_gemeindeschluessel"~${q(`^${agsPrefix.replace(/\D/g, '')}`)}]->.a;
.a out ids;
(
${filters}
);
out center tags meta;`;
}

/** OSM-Schlüssel, die für Branchen-Zuordnung und Ausschluss (Playbooks) gebraucht werden */
const CLASSIFY_KEYS = ['amenity', 'shop', 'craft', 'leisure', 'healthcare', 'office', 'beauty', 'sport'] as const;

const FREEMAIL = new Set(
  'gmail.com googlemail.com web.de gmx.de gmx.net gmx.com gmx.at t-online.de outlook.com outlook.de hotmail.com hotmail.de live.com live.de yahoo.com yahoo.de ymail.com icloud.com me.com aol.com aol.de freenet.de mail.de mail.com posteo.de arcor.de online.de email.de protonmail.com proton.me vodafone.de kabelmail.de 1und1.de ewe.net'.split(
    ' ',
  ),
);

/** ISO-Datum (YYYY, YYYY-MM oder YYYY-MM-DD) aus einem OSM-Datumsfeld, sonst undefined. */
function osmDate(v: string | undefined): string | undefined {
  const m = /^\s*(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(v ?? '');
  if (!m) return undefined;
  const year = Number(m[1]);
  return year >= 1800 && year <= 2100 ? [m[1], m[2], m[3]].filter(Boolean).join('-') : undefined;
}

/**
 * Ungeprüfte Aktivitäts- und Kontaktsignale für die Vorauswahl. Von einer E-Mail-Adresse wird nur die Domain
 * behalten; Freemail-Domains gelten als „keine eigene Domain“ und werden als `freemail` markiert.
 */
export function osmSourceMeta(el: OsmElement): SourceMeta {
  const t = el.tags ?? {};
  const email = (t.email ?? t['contact:email'] ?? '')
    .split(/[;,\s]/)[0]!
    .trim()
    .toLowerCase();
  const domain = /^[^@\s]+@([a-z0-9.-]+\.[a-z]{2,})$/.exec(email)?.[1];
  const checked = [
    'check_date',
    'survey:date',
    'check_date:opening_hours',
    'opening_hours:check_date',
    'lastcheck',
    'last_checked',
  ]
    .map((k) => osmDate(t[k]))
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop();
  const socialLinks = [
    'contact:instagram',
    'contact:facebook',
    'contact:tiktok',
    'contact:youtube',
    'contact:linkedin',
    'contact:xing',
  ].filter((k) => t[k]?.trim()).length;
  return {
    ...(el.timestamp && !Number.isNaN(Date.parse(el.timestamp)) ? { lastEditedAt: el.timestamp } : {}),
    ...(checked ? { checkedOn: checked } : {}),
    ...(osmDate(t.start_date) ? { startDate: osmDate(t.start_date) } : {}),
    ...(domain ? { emailDomain: FREEMAIL.has(domain) ? 'freemail' : domain } : {}),
    ...(socialLinks ? { socialLinks } : {}),
  };
}

/** OSM-Element → RawPlace. Website/Social-Tags werden für die Qualifizierung übernommen. */
export function osmElementToPlace(el: OsmElement, fallbackCity: string): RawPlace | null {
  const t = el.tags ?? {};
  const name = t.name ?? t['name:de'];
  if (!name) return null;
  const website = t.website ?? t['contact:website'] ?? t.url ?? t['contact:url'];
  const social = t['contact:instagram'] ?? t['contact:facebook'] ?? t['contact:tiktok'];
  const status =
    t['disused:shop'] || t['disused:craft'] || t['abandoned:shop'] || t.opening_hours === 'closed'
      ? 'CLOSED_PERMANENTLY'
      : 'OPERATIONAL';
  return {
    source: 'osm',
    sourceId: `${el.type}/${el.id}`,
    name: name.trim(),
    street: t['addr:street']?.trim(),
    houseNumber: t['addr:housenumber']?.trim(),
    postalCode: t['addr:postcode']?.trim(),
    city: (t['addr:city'] ?? fallbackCity).trim(),
    country: (t['addr:country'] ?? 'DE').toUpperCase(),
    phone: formatPhoneDe(t.phone ?? t['contact:phone'] ?? t['contact:mobile']) ?? undefined,
    websiteUri: website ?? (social ? (social.startsWith('http') ? social : `https://www.instagram.com/${social}`) : undefined),
    businessStatus: status,
    primaryType: t.craft ?? t.shop,
    types: [t.craft, t.shop, t.beauty].filter((x): x is string => Boolean(x)),
    osmTags: Object.fromEntries(CLASSIFY_KEYS.filter((k) => t[k]).map((k) => [k, t[k]!])),
    openingHours: parseOsmOpeningHours(t.opening_hours),
    sourceMeta: osmSourceMeta(el),
    ...(/^#[0-9a-f]{6}$/i.test(t['brand:colour'] ?? '')
      ? { designHint: { primaryColor: t['brand:colour']!, sourceRef: `https://www.openstreetmap.org/${el.type}/${el.id}` } }
      : {}),
  };
}

/**
 * OpenStreetMap über die Overpass API (ODbL, © OpenStreetMap-Mitwirkende).
 * Fair Use der öffentlichen Instanz: < 10 000 Requests/Tag, < 1 GB/Tag.
 */
export class OverpassLeadSource implements LeadSource {
  readonly kind = 'osm' as const;
  private readonly endpoints: string[];

  constructor(
    endpoints: string,
    private readonly userAgent: string,
  ) {
    this.endpoints = endpoints
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
  }

  async search(query: LeadSearchQuery): Promise<LeadSearchResult> {
    const ql = buildOverpassQuery(query.city, query.branch.osmTags, 90, query.agsPrefix);
    let lastErr: unknown;
    for (const endpoint of this.endpoints) {
      try {
        const data = await this.post(endpoint, ql);
        // Erste Ausgabe: die gefundenen Gemeindegebiete. Mehr als eines = gleichnamige Gemeinden zusammengelegt.
        const areas = (data.elements ?? []).filter((el) => el.type === 'area').length;
        const warnings =
          areas === 0
            ? [`Gemeinde „${query.city}“ nicht gefunden (Name/Gemeindeschlüssel prüfen)`]
            : areas > 1
              ? [`„${query.city}“ ist mehrdeutig (${areas} Gemeinden) – Gemeindeschlüssel in targeting.cityAgs eintragen`]
              : [];
        let places = (data.elements ?? [])
          .filter((el) => el.type !== 'area')
          .map((el) => osmElementToPlace(el, query.city))
          .filter((p): p is RawPlace => p !== null);
        places = await this.enrich(endpoint, places);
        return { places, requests: 1, costCents: 0, ...(warnings.length ? { warnings } : {}) };
      } catch (err) {
        lastErr = err;
        logger.warn(
          { endpoint: new URL(endpoint).host, err: err instanceof Error ? err.message : String(err) },
          'overpass: Instanz fehlgeschlagen',
        );
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Overpass nicht erreichbar');
  }

  /** Einzelnen Eintrag (node/way/relation mit ID) neu laden – z. B. vor einer Überarbeitung der Demo. */
  async refresh(sourceId: string): Promise<{ place: RawPlace | null; costCents: number }> {
    const m = /^(node|way|relation)\/(\d+)$/.exec(sourceId);
    if (!m) return { place: null, costCents: 0 };
    const ql = `[out:json][timeout:60];\n${m[1]}(${m[2]});\nout center tags meta;`;
    let lastErr: unknown;
    for (const endpoint of this.endpoints) {
      try {
        const data = await this.post(endpoint, ql);
        const el = (data.elements ?? [])[0];
        if (!el) return { place: null, costCents: 0 };
        const place = osmElementToPlace(el, '');
        if (!place) return { place: null, costCents: 0 };
        const [enriched] = await this.enrich(endpoint, [place]);
        return { place: enriched ?? place, costCents: 0 };
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Overpass nicht erreichbar');
  }

  private async post(endpoint: string, ql: string): Promise<{ elements?: OsmElement[] }> {
    return withRetry(
      async () => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': this.userAgent },
          body: new URLSearchParams({ data: ql }).toString(),
          signal: AbortSignal.timeout(150_000),
        });
        const text = await res.text();
        if (!res.ok) throw new HttpError(`Overpass HTTP ${res.status}`, res.status, text.slice(0, 500));
        return JSON.parse(text) as { elements?: OsmElement[] };
      },
      {
        retries: 3,
        baseDelayMs: 8_000,
        shouldRetry: (e) => (e instanceof HttpError ? [429, 502, 503, 504].includes(e.status) : true),
      },
    );
  }

  /** Fehlende Anschriften aus Gebäude/PLZ-Gebiet ergänzen (Fehler sind nicht fatal). */
  private async enrich(endpoint: string, places: RawPlace[]): Promise<RawPlace[]> {
    const missing = places.filter((p) => !p.street || !p.houseNumber || !p.postalCode);
    if (missing.length === 0) return places;
    const enrichments = new Map<string, Enrichment>();
    for (let i = 0; i < missing.length; i += 40) {
      const batch = missing.slice(i, i + 40);
      const ids = batch.map((p) => {
        const [type, id] = p.sourceId.split('/') as ['node' | 'way', string];
        return { type, id: Number(id) };
      });
      try {
        const data = await this.post(endpoint, buildEnrichmentQuery(ids));
        for (const [k, v] of parseEnrichment(data.elements ?? [], new Set(batch.map((p) => p.sourceId)))) enrichments.set(k, v);
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'overpass: Adress-Anreicherung fehlgeschlagen');
      }
    }
    return places.map((p) => applyEnrichment(p, enrichments.get(p.sourceId)));
  }
}
