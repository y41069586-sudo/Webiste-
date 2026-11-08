import path from 'node:path';
import type { LeadSearchQuery, LeadSearchResult, LeadSource, RawPlace } from '../types';
import { OsmExtractLeadSource, type OsmExtractOptions } from './osm-extract';
import { OSM_REGIONS, regionOfCity, type OsmRegion } from './regions';

type Base = Omit<OsmExtractOptions, 'url' | 'dir'>;

/**
 * Eine Lead-Quelle für alle Bundesländer: jede Stadt wird über ihr Bundesland gesucht. Pro Land eigener Index auf der
 * Platte; im Speicher bleibt nur das zuletzt benutzte Land (Servergrenze). Ohne Zuordnung: keine Treffer, keine Warnung.
 * Anfragen laufen nacheinander, damit nie zwei Kartenauswertungen gleichzeitig Speicher brauchen.
 */
export class OsmRegionsLeadSource implements LeadSource {
  readonly kind = 'osm' as const;
  private active?: string;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly sources: Map<string, OsmExtractLeadSource>;

  constructor(dirRoot: string, base: Base, regions: OsmRegion[] = OSM_REGIONS) {
    this.sources = new Map(
      regions.map((r) => [r.key, new OsmExtractLeadSource({ ...base, url: r.url, dir: path.join(dirRoot, r.key) })]),
    );
  }

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  async search(query: LeadSearchQuery): Promise<LeadSearchResult> {
    const region = regionOfCity(query.city);
    if (!region) return { places: [], requests: 0, costCents: 0 };
    return this.serial(async () => {
      if (this.active && this.active !== region.key) this.sources.get(this.active)?.release();
      this.active = region.key;
      return this.sources.get(region.key)!.search(query);
    });
  }

  async refresh(sourceId: string): Promise<{ place: RawPlace | null; costCents: number }> {
    return this.serial(async () => {
      for (const src of this.sources.values()) {
        if (!src.refresh) continue;
        const res = await src.refresh(sourceId);
        if (res.place) return res;
      }
      return { place: null, costCents: 0 };
    });
  }
}
