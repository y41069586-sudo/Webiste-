import { pipelineTick, sweepPaidOrders } from '@wbm/core';
import { defineJob } from '../runtime';

/** Zentraler Takt: schiebt Leads idempotent durch die Pipeline (alle 5 Minuten). */
defineJob('pipeline-tick', async () => {
  const pipeline = await pipelineTick();
  // Sicherheitsnetz für Rechnung/Onboarding nach Zahlungseingang
  const swept = await sweepPaidOrders();
  return { pipeline, swept };
});
