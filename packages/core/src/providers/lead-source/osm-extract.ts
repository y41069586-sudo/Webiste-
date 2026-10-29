import { execFile } from 'node:child_process';
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { promisify } from 'node:util';
import { logger } from '../../logger';
import { activeProgress } from '../../services/progress';
import type { LeadSearchQuery, LeadSearchResult, LeadSource, RawPlace } from '../types';
import { osmElementToPlace, type OsmElement } from './overpass';

/**
 * OpenStreetMap aus einem regionalen Auszug (Geofabrik, ODbL, © OpenStreetMap-Mitwirkende) statt der öffentlichen
 * Overpass-Server: Diese lehnen größere Abfragen inzwischen ab (HTTP 406) oder brechen ab (504). Der Worker lädt den
 * Auszug höchstens einmal je `maxAgeDays`, filtert ihn mit osmium auf die Branchen-Tags und ordnet jeden Betrieb über
 * die amtlichen Gemeindegrenzen (admin_level 6/8 mit Gemeindeschlüssel) einer Stadt zu – wie die Overpass-Suche.
 * Fehlende Postleitzahlen kommen aus den PLZ-Gebieten (boundary=postal_code). Ohne osmium oder ohne Auszug greift
 * die Overpass-Quelle als Ausweich.
 */

type Position = [number, number];
type Polygon = Position[][];
type BBox = [number, number, number, number];

interface Area {
  bbox: BBox;
  polygons: Polygon[];
}

export interface ExtractMuni {
  name: string;
  ags: string;
  level: number;
}

export interface ExtractPoi {
  type: 'node' | 'way' | 'relation';
  id: number;
  tags: Record<string, string>;
  timestamp?: string;
  munis: number[];
}

export interface OsmExtractIndex {
  version: 1;
  builtAt: string;
  /** Gefilterte Tag-Paare (key=value), aus denen der Index gebaut wurde */
  tagPairs: string[];
  munis: ExtractMuni[];
  pois: ExtractPoi[];
}

type BranchTags = LeadSearchQuery['branch']['osmTags'];

/** Tags, die Zuordnung, Qualifizierung und Vorauswahl brauchen – alles andere wird nicht gespeichert. */
const KEEP_TAG =
  /^(name(:de)?|addr:.+|website|url|phone|email|contact:.+|opening_hours|start_date|check_date(:.+)?|survey:date|opening_hours:check_date|lastcheck|last_checked|brand(:.+)?|operator|disused:.+|abandoned:.+|amenity|shop|craft|leisure|healthcare|office|beauty|sport|cuisine)$/;

export function tagPairsOf(tags: BranchTags): string[] {
  return [...new Set(tags.map((t) => `${t.key}=${t.value}`))].sort();
}

/** osmium-Filterausdrücke: je Schlüssel alle Werte, dazu Gemeinde- und PLZ-Grenzen. */
export function osmiumFilterExpressions(tagPairs: string[]): string[] {
  const byKey = new Map<string, Set<string>>();
  for (const pair of tagPairs) {
    const i = pair.indexOf('=');
    const key = pair.slice(0, i);
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key)!.add(pair.slice(i + 1));
  }
  return [...[...byKey].map(([k, vs]) => `nwr/${k}=${[...vs].sort().join(',')}`), 'r/boundary=administrative,postal_code'];
}

export function matchesBranch(tags: Record<string, string>, osmTags: BranchTags): boolean {
  return osmTags.some(
    (t) =>
      tags[t.key] === t.value &&
      Object.entries(t.extra ?? {}).every(([k, v]) => tags[k] === v) &&
      // wie Overpass `[k!~"^(v)$"]`: fehlender Tag zählt als passend
      Object.entries(t.exclude ?? {}).every(([k, v]) => !new RegExp(`^(${v})$`).test(tags[k] ?? '')),
  );
}

function bboxOf(polygons: Polygon[]): BBox {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polygons)
    for (const [x, y] of poly[0] ?? []) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  return [minX, minY, maxX, maxY];
}

function inRing([x, y]: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function inArea(p: Position, area: Area): boolean {
  const [x, y] = p;
  const [minX, minY, maxX, maxY] = area.bbox;
  if (x < minX || x > maxX || y < minY || y > maxY) return false;
  return area.polygons.some((poly) => inRing(p, poly[0] ?? []) && !poly.slice(1).some((hole) => inRing(p, hole)));
}

interface Feature {
  geometry: { type: string; coordinates: unknown } | null;
  properties: Record<string, string | number>;
}

function polygonsOf(g: Feature['geometry']): Polygon[] {
  if (!g) return [];
  if (g.type === 'Polygon') return [g.coordinates as Polygon];
  if (g.type === 'MultiPolygon') return g.coordinates as Polygon[];
  return [];
}

/** Repräsentativer Punkt: Punkt selbst, sonst Mittel der äußeren Ringpunkte (für Gebäude/Flächen ausreichend). */
function pointOf(g: Feature['geometry']): Position | null {
  if (!g) return null;
  if (g.type === 'Point') return g.coordinates as Position;
  const ring =
    g.type === 'LineString'
      ? (g.coordinates as Position[])
      : g.type === 'Polygon'
        ? (g.coordinates as Polygon)[0]
        : g.type === 'MultiPolygon'
          ? (g.coordinates as Polygon[])[0]?.[0]
          : undefined;
  if (!ring?.length) return null;
  const n = ring.length > 1 && ring[0]![0] === ring.at(-1)![0] && ring[0]![1] === ring.at(-1)![1] ? ring.length - 1 : ring.length;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += ring[i]![0];
    sy += ring[i]![1];
  }
  return [sx / n, sy / n];
}

async function* readFeatures(file: string): AsyncGenerator<Feature> {
  const rl = readline.createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const raw of rl) {
    // geojsonseq beginnt Zeilen ggf. mit dem RS-Zeichen (U+001E, RFC 8142)
    const line = (raw.startsWith('\u001e') ? raw.slice(1) : raw).trim();
    if (line) yield JSON.parse(line) as Feature;
  }
}

/**
 * Baut den Index aus der GeoJSON-Sequenz von `osmium export` (zwei Durchläufe: erst Grenzen, dann Betriebe).
 * Rein dateibasiert und damit ohne osmium testbar.
 */
export async function buildIndexFromGeoJsonSeq(file: string, tagPairs: string[], now = new Date()): Promise<OsmExtractIndex> {
  const munis: ExtractMuni[] = [];
  const muniAreas: Area[] = [];
  const postal: { code: string; area: Area }[] = [];
  for await (const f of readFeatures(file)) {
    const p = f.properties;
    const polygons = polygonsOf(f.geometry);
    if (!polygons.length || p['@type'] !== 'relation') continue;
    if (p.boundary === 'administrative' && (p.admin_level === '6' || p.admin_level === '8') && p.name) {
      const ags = String(p['de:amtlicher_gemeindeschluessel'] ?? '').replace(/\D/g, '');
      if (!ags) continue;
      munis.push({ name: String(p.name), ags, level: Number(p.admin_level) });
      muniAreas.push({ bbox: bboxOf(polygons), polygons });
    } else if (p.boundary === 'postal_code' && p.postal_code) {
      postal.push({ code: String(p.postal_code), area: { bbox: bboxOf(polygons), polygons } });
    }
  }
  const wanted = new Set(tagPairs);
  const seen = new Set<string>();
  const pois: ExtractPoi[] = [];
  for await (const f of readFeatures(file)) {
    const p = f.properties;
    const type = p['@type'] as ExtractPoi['type'];
    const id = Number(p['@id']);
    if (!p.name || !['node', 'way', 'relation'].includes(type)) continue;
    if (!Object.entries(p).some(([k, v]) => wanted.has(`${k}=${v}`))) continue;
    const key = `${type}/${id}`;
    if (seen.has(key)) continue; // geschlossene Wege erscheinen als Linie und als Fläche
    const point = pointOf(f.geometry);
    if (!point) continue;
    seen.add(key);
    const tags: Record<string, string> = {};
    for (const [k, v] of Object.entries(p)) if (KEEP_TAG.test(k)) tags[k] = String(v);
    if (!tags['addr:postcode']) {
      const pc = postal.find((z) => inArea(point, z.area));
      if (pc) tags['addr:postcode'] = pc.code;
    }
    const inMunis = muniAreas.flatMap((a, i) => (inArea(point, a) ? [i] : []));
    if (!inMunis.length) continue;
    const ts = Number(p['@timestamp']);
    pois.push({ type, id, tags, ...(ts > 0 ? { timestamp: new Date(ts * 1000).toISOString() } : {}), munis: inMunis });
  }
  return { version: 1, builtAt: now.toISOString(), tagPairs: [...tagPairs].sort(), munis, pois };
}

/** Suche im Index – gleiche Warnungen wie die Overpass-Suche. */
export function searchIndex(index: OsmExtractIndex, query: LeadSearchQuery): LeadSearchResult {
  const prefix = (query.agsPrefix ?? '').replace(/\D/g, '');
  const areas = new Set(
    index.munis.flatMap((m, i) =>
      m.name === query.city && (m.level === 6 || m.level === 8) && m.ags.startsWith(prefix) ? [i] : [],
    ),
  );
  const warnings =
    areas.size === 0
      ? [`Gemeinde „${query.city}“ nicht gefunden (Name/Gemeindeschlüssel prüfen)`]
      : areas.size > 1
        ? [`„${query.city}“ ist mehrdeutig (${areas.size} Gemeinden) – Gemeindeschlüssel in targeting.cityAgs eintragen`]
        : [];
  const places = index.pois
    .filter((p) => p.munis.some((m) => areas.has(m)) && matchesBranch(p.tags, query.branch.osmTags))
    .map((p) => osmElementToPlace(p as OsmElement, query.city))
    .filter((p): p is RawPlace => p !== null);
  return { places, requests: 0, costCents: 0, ...(warnings.length ? { warnings } : {}) };
}

const run = promisify(execFile);

export interface OsmExtractOptions {
  url: string;
  dir: string;
  userAgent: string;
  /** Tag-Paare, die immer im Index stehen (Standard-Branchen); weitere kommen bei Bedarf dazu */
  baseTags: BranchTags;
  maxAgeDays?: number;
  osmiumBin?: string;
  /** Ausweich ohne osmium/Auszug (z. B. lokale Entwicklung) */
  fallback?: LeadSource;
}

export class OsmExtractLeadSource implements LeadSource {
  readonly kind = 'osm' as const;
  private index?: OsmExtractIndex;
  private building?: Promise<OsmExtractIndex>;

  constructor(private readonly o: OsmExtractOptions) {}

  private get indexFile() {
    return path.join(this.o.dir, 'index-v1.json');
  }

  private fresh(i: OsmExtractIndex | undefined, pairs: string[]): i is OsmExtractIndex {
    if (!i) return false;
    const age = Date.now() - Date.parse(i.builtAt);
    return age < (this.o.maxAgeDays ?? 7) * 86_400_000 && pairs.every((p) => i.tagPairs.includes(p));
  }

  /** Index laden oder (neu) bauen; parallele Aufrufe teilen sich einen Bau. */
  async ensureIndex(extraTags: BranchTags = []): Promise<OsmExtractIndex> {
    const pairs = [...new Set([...tagPairsOf(this.o.baseTags), ...tagPairsOf(extraTags)])].sort();
    if (this.fresh(this.index, pairs)) return this.index;
    if (!this.index) {
      try {
        const disk = JSON.parse(await fs.readFile(this.indexFile, 'utf8')) as OsmExtractIndex;
        if (disk.version === 1) this.index = disk;
      } catch {
        // noch kein Index auf der Platte
      }
      if (this.fresh(this.index, pairs)) return this.index;
    }
    // Vorhandene Tags behalten, damit ein Neubau keine früher gesuchten Branchen verliert
    const known: string[] = (this.index as OsmExtractIndex | undefined)?.tagPairs ?? [];
    this.building ??= this.build([...new Set([...pairs, ...known])].sort()).finally(() => {
      this.building = undefined;
    });
    this.index = await this.building;
    return this.index;
  }

  private async build(tagPairs: string[]): Promise<OsmExtractIndex> {
    await fs.mkdir(this.o.dir, { recursive: true });
    const pbf = path.join(this.o.dir, 'extract.osm.pbf');
    const filtered = path.join(this.o.dir, 'filtered.osm.pbf');
    const seq = path.join(this.o.dir, 'features.geojsonseq');
    const started = Date.now();
    await this.download(pbf);
    const progress = activeProgress();
    progress?.phase('karte_auswerten', 'NRW-Karte wird ausgewertet (einmalig, dauert einige Minuten) …');
    // osmium meldet keinen Fortschritt: Lebenszeichen, damit die Verwaltung nicht „keine Rückmeldung“ zeigt
    const beat = progress ? setInterval(() => void progress.flush(true), 15_000) : undefined;
    try {
      return await this.buildFrom(pbf, filtered, seq, tagPairs, started);
    } finally {
      clearInterval(beat);
    }
  }

  private async buildFrom(pbf: string, filtered: string, seq: string, tagPairs: string[], started: number) {
    const osmium = this.o.osmiumBin ?? 'osmium';
    const opts = { maxBuffer: 16 * 1024 * 1024, timeout: 30 * 60_000 };
    await run(osmium, ['tags-filter', pbf, ...osmiumFilterExpressions(tagPairs), '-o', filtered, '--overwrite'], opts);
    await run(
      osmium,
      [
        'export',
        filtered,
        '-f',
        'geojsonseq',
        '-a',
        'type,id,timestamp',
        '--geometry-types=point,linestring,polygon',
        '-o',
        seq,
        '--overwrite',
      ],
      opts,
    );
    const index = await buildIndexFromGeoJsonSeq(seq, tagPairs);
    await fs.writeFile(`${this.indexFile}.tmp`, JSON.stringify(index));
    await fs.rename(`${this.indexFile}.tmp`, this.indexFile);
    await Promise.all([fs.rm(filtered, { force: true }), fs.rm(seq, { force: true })]);
    logger.info({ pois: index.pois.length, munis: index.munis.length, ms: Date.now() - started }, 'osm-auszug: Index gebaut');
    return index;
  }

  /** Auszug nur laden, wenn er fehlt oder älter als `maxAgeDays` ist (Geofabrik aktualisiert täglich). */
  private async download(file: string): Promise<void> {
    const stat = await fs.stat(file).catch(() => null);
    if (stat && Date.now() - stat.mtimeMs < (this.o.maxAgeDays ?? 7) * 86_400_000) return;
    const progress = activeProgress();
    progress?.phase('karte_laden', 'NRW-Karte wird geladen …');
    const res = await fetch(this.o.url, {
      headers: { 'user-agent': this.o.userAgent, ...(stat ? { 'if-modified-since': stat.mtime.toUTCString() } : {}) },
      signal: AbortSignal.timeout(30 * 60_000),
    });
    if (res.status === 304 && stat) {
      await fs.utimes(file, new Date(), new Date());
      return;
    }
    if (!res.ok || !res.body) throw new Error(`OSM-Auszug HTTP ${res.status}`);
    const total = Number(res.headers.get('content-length')) || null;
    let done = 0;
    const count = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        done += chunk.length;
        progress?.bytes(done, total);
        cb(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(res.body as unknown as WebReadableStream), count, createWriteStream(`${file}.part`));
    await fs.rename(`${file}.part`, file);
  }

  async search(query: LeadSearchQuery): Promise<LeadSearchResult> {
    let index: OsmExtractIndex;
    try {
      index = await this.ensureIndex(query.branch.osmTags);
    } catch (err) {
      if (!this.o.fallback) throw err;
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'osm-auszug nicht verfügbar, nutze Overpass');
      return this.o.fallback.search(query);
    }
    return searchIndex(index, query);
  }

  async refresh(sourceId: string): Promise<{ place: RawPlace | null; costCents: number }> {
    const [type, id] = sourceId.split('/');
    const index = await this.ensureIndex().catch(() => undefined);
    const poi = index?.pois.find((p) => p.type === type && String(p.id) === id);
    if (poi) return { place: osmElementToPlace(poi as OsmElement, poi.tags['addr:city'] ?? ''), costCents: 0 };
    return this.o.fallback?.refresh ? this.o.fallback.refresh(sourceId) : { place: null, costCents: 0 };
  }
}
