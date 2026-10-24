import { runLearningAgent, runWeeklyOptimizer } from '@wbm/core';
import { defineJob } from '../runtime';

/** Sonntags: Wochenbericht, Thompson Sampling für Segmente und Briefvarianten je Branche (L5) (Übernahme nur mit AUTO_OPTIMIZE). */
defineJob('weekly-optimizer', async (data) => {
  const r = await runWeeklyOptimizer(data.periodEnd ? new Date(data.periodEnd) : new Date());
  return { reportId: r.reportId, applied: r.applied, segments: r.segments.length, industries: r.industries.length };
});

/** Sonntags nach dem Optimizer: Lern-Agent (Bericht, Hypothesen, Vorschläge → Review-Queue). */
defineJob('learning-agent', async (data) => {
  const r = await runLearningAgent({ force: data.force, actor: data.triggeredBy ?? 'job:learning-agent' });
  return { week: r.week, skipped: r.skipped, proposals: r.outcomes.length, paused: r.paused, llmError: r.llmError };
});
