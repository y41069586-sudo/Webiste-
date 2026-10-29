import { eq, sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { leads } from '../src/db/schema';
import { applyMinLeadScore, findLeads, leadScorePool } from '../src/services/lead-finder';
import { readSearchProgress, requestSearchStop, SearchProgressReporter } from '../src/services/progress';
import { resetDb } from './helpers';

const reporter = (runId: string) => new SearchProgressReporter({ runId, cities: ['Dortmund'], branches: [], minScore: 70 });

describe('Lead-Suche: Fortschritt, Stopp, Mindestgrenze', () => {
  beforeEach(resetDb);

  it('meldet Phasen, Zähler und Protokoll an die Verwaltung', async () => {
    const progress = reporter('run-1');
    const s = await findLeads({ actor: 'job:test', progress });
    await progress.finish('fertig', 'Fertig');
    const saved = await readSearchProgress();
    expect(saved?.runId).toBe('run-1');
    expect(saved?.phase).toBe('fertig');
    expect(saved?.percent).toBe(100);
    expect(saved?.counts.found).toBe(s.found);
    expect(saved?.counts.checked).toBe(s.found);
    expect(saved?.counts.qualified).toBe(s.qualified);
    expect(saved?.log.length).toBeGreaterThan(0);
    expect(saved?.log.length).toBeLessThanOrEqual(12);
  });

  it('hält auf Wunsch an, ohne Geprüftes zu verlieren', async () => {
    const progress = reporter('run-2');
    await requestSearchStop('run-2', 'admin:test');
    const s = await findLeads({ actor: 'job:test', progress });
    expect(s.stopped).toBe(true);
    expect(s.created).toBe(0);
    // Ein Stopp-Wunsch für einen anderen Lauf hält diesen nicht an
    const other = await findLeads({ actor: 'job:test', progress: reporter('run-3') });
    expect(other.stopped).toBeUndefined();
    expect(other.created).toBe(other.found);
  });

  it('sortiert offene Leads unter der Mindestgrenze aus, ohne sie zu löschen', async () => {
    await findLeads({ actor: 'job:test' });
    const db = getDb();
    // Mock-Leads sind von der Grenze ausgenommen: für den Test wie OSM-Treffer behandeln
    await db.execute(sql`UPDATE leads SET source = 'osm' WHERE status IN ('discovered', 'qualified')`);
    const open = await db.select().from(leads).where(eq(leads.status, 'qualified'));
    expect(open.length).toBeGreaterThan(1);
    const [high, ...rest] = open;
    await db.update(leads).set({ prescreenScore: 80 }).where(eq(leads.id, high!.id));
    for (const r of rest) await db.update(leads).set({ prescreenScore: 40 }).where(eq(leads.id, r.id));
    expect(await leadScorePool(70)).toEqual({ above: 1, below: rest.length, best: 80 });
    expect(await applyMinLeadScore(70, 'admin:test')).toBe(rest.length);
    const after = await db.select().from(leads).where(eq(leads.source, 'osm'));
    expect(after.find((r) => r.id === high!.id)?.status).toBe('qualified');
    const low = after.filter((r) => r.id !== high!.id && rest.some((x) => x.id === r.id));
    expect(low.every((r) => r.status === 'rejected' && r.rejectionReasons.includes('score_too_low'))).toBe(true);
    expect(await applyMinLeadScore(0, 'admin:test')).toBe(0);
  });
});
