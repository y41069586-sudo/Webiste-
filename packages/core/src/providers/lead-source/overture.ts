import type { OpenPlace } from '../../leads/open-data-match';
import { logger } from '../../logger';

/**
 * Overture Maps „places“ (offene Firmendaten, monatlich; Lizenz CDLA-Permissive-2.0 / Apache-2.0) für ein Gebiet
 * laden. Abfrage per DuckDB direkt auf den öffentlichen Parquet-Dateien (anonymer S3-Zugriff, nur die Zeilengruppen
 * im Gebiet werden gelesen – Dortmund ≈ 43 000 Orte in ~8 s). Läuft nur im Worker; DuckDB wird erst hier geladen.
 */
const BUCKET = 'overturemaps-us-west-2';
const LIST_URL = `https://${BUCKET}.s3.us-west-2.amazonaws.com/?list-type=2&prefix=release/&delimiter=/`;

export interface Bbox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

/** Neuester Overture-Stand (z. B. „2026-10-21.0“) oder `OVERTURE_RELEASE` aus der Umgebung. */
export async function latestOvertureRelease(fetchFn: typeof fetch = fetch): Promise<string> {
  const fixed = process.env.OVERTURE_RELEASE?.trim();
  if (fixed && /^\d{4}-\d{2}-\d{2}\.\d+$/.test(fixed)) return fixed;
  const res = await fetchFn(LIST_URL, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Overture-Liste nicht erreichbar (HTTP ${res.status})`);
  const xml = await res.text();
  const releases = [...xml.matchAll(/<Prefix>release\/(\d{4}-\d{2}-\d{2}\.\d+)\/<\/Prefix>/g)].map((m) => m[1]!).sort();
  const latest = releases.pop();
  if (!latest) throw new Error('Kein Overture-Stand gefunden');
  return latest;
}

type DuckModule = {
  DuckDBInstance: {
    create(path: string): Promise<{
      connect(): Promise<{
        run(sql: string): Promise<unknown>;
        runAndReadAll(sql: string): Promise<{ getRowObjectsJson(): Record<string, unknown>[] }>;
        closeSync?(): void;
      }>;
      closeSync?(): void;
    }>;
  };
};

const num = (v: number) => {
  if (!Number.isFinite(v)) throw new Error('Ungültiges Gebiet');
  return v.toFixed(6);
};

/** Alle Overture-Orte (Deutschland) im Gebiet. */
export async function fetchOverturePlaces(bbox: Bbox, release: string): Promise<OpenPlace[]> {
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(release)) throw new Error('Ungültiger Overture-Stand');
  if (bbox.xmax - bbox.xmin > 1.5 || bbox.ymax - bbox.ymin > 1.5) throw new Error('Gebiet zu groß für den Abgleich');
  // Absichtlich zur Laufzeit und am Bundler vorbei geladen (nativ, nur im Worker installiert/genutzt)
  const modName = '@duckdb/node-api';
  const duck = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ modName)) as DuckModule;
  const db = await duck.DuckDBInstance.create(':memory:');
  const c = await db.connect();
  try {
    // Anonymer Zugriff (leere Schlüssel), unabhängig von AWS-Variablen der Umgebung
    await c.run(
      "SET extension_directory = '/tmp/duckdb_extensions'; SET home_directory = '/tmp'; INSTALL httpfs; LOAD httpfs; CREATE OR REPLACE SECRET overture (TYPE s3, KEY_ID '', SECRET '', REGION 'us-west-2');",
    );
    const r = await c.runAndReadAll(`
      SELECT names."primary" AS name,
             (bbox.xmin + bbox.xmax) / 2 AS lon, (bbox.ymin + bbox.ymax) / 2 AS lat,
             websites, socials, phones, confidence, operating_status AS status,
             addresses[1].postcode AS postcode, addresses[1].freeform AS street
      FROM read_parquet('s3://${BUCKET}/release/${release}/theme=places/type=place/*', hive_partitioning = 1)
      WHERE bbox.xmin BETWEEN ${num(bbox.xmin)} AND ${num(bbox.xmax)}
        AND bbox.ymin BETWEEN ${num(bbox.ymin)} AND ${num(bbox.ymax)}
        AND addresses[1].country = 'DE'
        AND names."primary" IS NOT NULL`);
    return r.getRowObjectsJson().map((row) => ({
      name: String(row.name ?? ''),
      lat: Number(row.lat),
      lon: Number(row.lon),
      websites: Array.isArray(row.websites) ? row.websites.map(String) : [],
      socials: Array.isArray(row.socials) ? row.socials.map(String) : [],
      phones: Array.isArray(row.phones) ? row.phones.map(String) : [],
      postcode: row.postcode == null ? null : String(row.postcode),
      street: row.street == null ? null : String(row.street),
      confidence: row.confidence == null ? null : Number(row.confidence),
      status: row.status == null ? null : String(row.status),
    }));
  } finally {
    try {
      c.closeSync?.();
      db.closeSync?.();
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'DuckDB schließen fehlgeschlagen');
    }
  }
}

/** Gebiet um eine Menge von Punkten (mit Rand), getrennt nach weit auseinanderliegenden Gruppen (Städten). */
export function bboxesFor(points: { lat: number; lon: number }[], margin = 0.01, maxSpan = 0.6): Bbox[] {
  const groups: { lat: number; lon: number }[][] = [];
  for (const p of points) {
    const g = groups.find((grp) =>
      grp.some((q) => Math.abs(q.lat - p.lat) < maxSpan / 2 && Math.abs(q.lon - p.lon) < maxSpan / 2),
    );
    if (g) g.push(p);
    else groups.push([p]);
  }
  return groups.map((g) => ({
    xmin: Math.min(...g.map((p) => p.lon)) - margin,
    xmax: Math.max(...g.map((p) => p.lon)) + margin,
    ymin: Math.min(...g.map((p) => p.lat)) - margin,
    ymax: Math.max(...g.map((p) => p.lat)) + margin,
  }));
}
