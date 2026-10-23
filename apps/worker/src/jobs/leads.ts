import { findLeads, getConfig } from '@wbm/core';
import { defineJob } from '../runtime';

defineJob('find-leads', async (data, ctx) => {
  // Wöchentlicher Lauf (Cron ohne Auslöser) nur, solange er in den Einstellungen aktiv ist
  const weekly = !data.triggeredBy;
  if (weekly && !(await getConfig()).segments.weeklyLeadFinder) return { skipped: 'weeklyLeadFinder aus' };
  const summary = await findLeads({
    cities: data.cities,
    branches: data.branches,
    actor: `job:find-leads:${data.triggeredBy ?? 'weekly'}`,
  });
  ctx.log.info(
    { found: summary.found, qualified: summary.qualified, rejected: summary.rejected, costCents: summary.costCents },
    'find-leads',
  );
  return summary;
});
