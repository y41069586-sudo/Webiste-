import { beforeEach, describe, expect, it } from 'vitest';
import { dbAssistantData } from '../src/assistant/data';
import { findLeads } from '../src/services/lead-finder';
import { resetDb } from './helpers';

describe('Assistent: Datenbank-Abfragen', () => {
  beforeEach(resetDb);

  it('liefert Zählungen, Listen und Namenssuche aus echten Tabellen', async () => {
    await findLeads({ actor: 'job:test' });
    const d = dbAssistantData;
    const byStatus = await d.leadCounts({}, 'status');
    expect(byStatus.reduce((s, r) => s + r.n, 0)).toBeGreaterThan(0);
    expect((await d.leadCounts({ cities: ['dortmund'] }, 'city'))[0]?.key).toBe('Dortmund');
    const top = await d.topLeads({ statuses: ['qualified'] }, 3);
    expect(top.length).toBeGreaterThan(0);
    const name = top[0]!.name.split(' ')[0]!;
    expect((await d.findLeadsByName(name, 5)).some((l) => l.name.startsWith(name))).toBe(true);
    expect(await d.findLeadsByName('%_', 5)).toEqual([]);
    expect(await d.knownCities()).toContain('Dortmund');
    // Alle übrigen Bereiche laufen ohne Fehler (leere Tabellen → leere Ergebnisse)
    await Promise.all([
      d.demoCounts(),
      d.pendingDemos(3),
      d.letterCounts(),
      d.letterWeek(),
      d.orderStats(),
      d.siteCounts(),
      d.supportStats(),
      d.budgetWeek(),
      d.funnel(30),
      d.jobs(),
      d.workerSeenAt(),
      d.alerts(5),
      d.audit(5),
    ]);
    expect((await d.audit(5)).length).toBeGreaterThan(0);
    expect((await d.orderStats()).paidCents).toBe(0);
  });
});
