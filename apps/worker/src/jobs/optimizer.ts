import { runWeeklyOptimizer } from '@wbm/core';
import { defineJob } from '../runtime';

/** Sonntags: Wochenbericht, Thompson Sampling für Segmente und Briefvarianten je Branche (L5) (Übernahme nur mit AUTO_OPTIMIZE). */
defineJob('weekly-optimizer', async (data) => {
  const r = await runWeeklyOptimizer(data.periodEnd ? new Date(data.periodEnd) : new Date());
  return { reportId: r.reportId, applied: r.applied, segments: r.segments.length, industries: r.industries.length };
});
