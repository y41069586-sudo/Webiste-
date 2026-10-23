import { findLeads } from '@wbm/core';
import { defineJob } from '../runtime';

defineJob('find-leads', async (data, ctx) => {
  const summary = await findLeads({ cities: data.cities, branches: data.branches, actor: `job:find-leads:${data.triggeredBy}` });
  ctx.log.info(
    { found: summary.found, qualified: summary.qualified, rejected: summary.rejected, costCents: summary.costCents },
    'find-leads',
  );
  return summary;
});
