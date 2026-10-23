import { beforeEach, describe, expect, it } from 'vitest';
import { effectiveSwitches, getConfig, updateConfig } from '../src/config/service';
import { deepMerge } from '../src/config/settings';
import { resetEnvCache } from '../src/config/env';
import { resetDb } from './helpers';

describe('Konfiguration', () => {
  beforeEach(resetDb);

  it('liefert Standardwerte aus dem Auftrag', async () => {
    const cfg = await getConfig({ fresh: true });
    expect(cfg.pricing.packageCents).toBe(59000);
    expect(cfg.pricing.subscriptionCents).toBe(1900);
    expect(cfg.filters.minRating).toBe(4.5);
    expect(cfg.filters.minRatingCount).toBe(30);
    expect(cfg.budget.weeklyBudgetCents).toBe(6000);
    expect(cfg.budget.firstBatchSize).toBe(40);
    expect(cfg.timing.demoExpiryDays).toBe(30);
    expect(cfg.timing.followupAfterDays).toBe(12);
    expect(cfg.review.manualReviewFirstN).toBe(30);
    expect(cfg.targeting.cities).toEqual(['Dortmund']);
    expect(cfg.targeting.branches.map((b) => b.queries[0])).toEqual([
      'Nagelstudio',
      'Kosmetikstudio',
      'Malerbetrieb',
      'Elektriker',
    ]);
  });

  it('speichert Änderungen und validiert', async () => {
    await updateConfig({ filters: { minRating: 4.7 } }, 'admin:test');
    expect((await getConfig({ fresh: true })).filters.minRating).toBe(4.7);
    await expect(updateConfig({ filters: { minRating: 9 } }, 'admin:test')).rejects.toThrow();
    expect((await getConfig({ fresh: true })).filters.minRating).toBe(4.7);
  });

  it('DRY_RUN aus der Umgebung ist nicht übersteuerbar', async () => {
    process.env.DRY_RUN = 'true';
    resetEnvCache();
    await updateConfig({ switches: { dryRun: false } }, 'admin:test');
    const sw = effectiveSwitches(await getConfig({ fresh: true }));
    expect(sw.dryRun).toBe(true);
    expect(sw.dryRunLockedByEnv).toBe(true);
    process.env.DRY_RUN = 'false';
    resetEnvCache();
    expect(effectiveSwitches(await getConfig({ fresh: true })).dryRun).toBe(false);
    delete process.env.DRY_RUN;
    resetEnvCache();
  });

  it('deepMerge ersetzt Arrays und mischt Objekte', () => {
    expect(deepMerge({ a: { b: 1, c: 2 }, l: [1, 2] }, { a: { c: 3 }, l: [9] })).toEqual({ a: { b: 1, c: 3 }, l: [9] });
  });
});
