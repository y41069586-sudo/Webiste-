import { getEnv } from '../config/env';
import { logger } from '../logger';
import {
  applyOpenData,
  comparablePhone,
  matchOpenPlace,
  openAddressFill,
  openDataSignal,
  type OpenPlace,
} from '../leads/open-data-match';
import type { RawPlace } from '../providers/types';
import { bboxesFor, fetchOverturePlaces, latestOvertureRelease, type Bbox } from '../providers/lead-source/overture';

export interface OpenDataCheckResult {
  release?: string;
  checked: number;
  matched: number;
  websites: number;
  closed: number;
  socialOnly: number;
  /** Fehlende Anschrift aus offenen Daten ergänzt */
  addressFilled: number;
  error?: string;
}

export interface OpenDataDeps {
  release: () => Promise<string>;
  fetchPlaces: (bbox: Bbox, release: string) => Promise<OpenPlace[]>;
}

const DEFAULT_DEPS: OpenDataDeps = { release: () => latestOvertureRelease(), fetchPlaces: fetchOverturePlaces };

/** Räumliches Raster (≈ 1 km) für schnelle Nachbarsuche. */
function cellKey(lat: number, lon: number): string {
  return `${Math.floor(lat * 100)}:${Math.floor(lon * 70)}`;
}

/**
 * Gleicht alle Treffer einer Lead-Suche mit Overture Maps ab und setzt die Signale (eigene Website, geschlossen,
 * nur Profile) direkt am Treffer. Fehler stoppen die Suche nie – dann bleibt alles wie bisher.
 * Abschaltbar mit OPEN_DATA_CHECK=false.
 */
export async function enrichWithOpenData<T extends { place: RawPlace }>(
  candidates: T[],
  deps: OpenDataDeps = DEFAULT_DEPS,
): Promise<OpenDataCheckResult> {
  const result: OpenDataCheckResult = { checked: 0, matched: 0, websites: 0, closed: 0, socialOnly: 0, addressFilled: 0 };
  if (!getEnv().OPEN_DATA_CHECK || !candidates.length) return result;
  const located = candidates.filter((c) => c.place.location);
  if (!located.length) return result;
  try {
    const release = await deps.release();
    result.release = release;
    const places: OpenPlace[] = [];
    for (const bbox of bboxesFor(located.map((c) => c.place.location!))) places.push(...(await deps.fetchPlaces(bbox, release)));
    // Indizes: Raster für die Nähe, Telefonnummern und PLZ für Treffer ohne Lage
    const grid = new Map<string, OpenPlace[]>();
    const byPhone = new Map<string, OpenPlace[]>();
    const byPostcode = new Map<string, OpenPlace[]>();
    const add = <K>(m: Map<K, OpenPlace[]>, k: K, p: OpenPlace) => m.set(k, [...(m.get(k) ?? []), p]);
    for (const p of places) {
      if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) add(grid, cellKey(p.lat, p.lon), p);
      for (const ph of p.phones) {
        const d = comparablePhone(ph);
        if (d) add(byPhone, d, p);
      }
      if (p.postcode) add(byPostcode, p.postcode, p);
    }
    for (const c of candidates) {
      const loc = c.place.location;
      const pool = new Set<OpenPlace>();
      if (loc) {
        const la = Math.floor(loc.lat * 100);
        const lo = Math.floor(loc.lon * 70);
        for (let i = -2; i <= 2; i++)
          for (let j = -2; j <= 2; j++) for (const p of grid.get(`${la + i}:${lo + j}`) ?? []) pool.add(p);
      } else if (c.place.postalCode) {
        for (const p of byPostcode.get(c.place.postalCode) ?? []) pool.add(p);
      }
      const d = comparablePhone(c.place.phone);
      if (d) for (const p of byPhone.get(d) ?? []) pool.add(p);
      if (!pool.size) continue;
      result.checked++;
      const m = matchOpenPlace(c.place, [...pool]);
      if (!m) continue;
      const signal = openDataSignal(m, release);
      const address = openAddressFill(c.place, m);
      c.place = applyOpenData(c.place, signal, address);
      if (address) result.addressFilled++;
      result.matched++;
      if (signal.website) result.websites++;
      if (signal.status === 'permanently_closed') result.closed++;
      if (signal.socialOnly) result.socialOnly++;
    }
    logger.info({ places: places.length, ...result }, 'Abgleich mit offenen Firmendaten (Overture)');
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    logger.warn({ err: result.error }, 'Abgleich mit offenen Firmendaten nicht möglich – Suche läuft ohne weiter');
  }
  return result;
}
