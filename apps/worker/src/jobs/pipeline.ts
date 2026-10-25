import { pipelineTick, sweepPaidOrders, sweepBillingV4, sweepCareChecks, sweepTariffsV4, sweepRefunds } from '@wbm/core';
import { defineJob } from '../runtime';

/** Zentraler Takt: schiebt Leads idempotent durch die Pipeline (alle 5 Minuten). */
defineJob('pipeline-tick', async () => {
  const pipeline = await pipelineTick();
  // Sicherheitsnetz für Rechnung/Onboarding nach Zahlungseingang
  const swept = await sweepPaidOrders();
  const billing = await sweepBillingV4();
  const tariffs = await sweepTariffsV4();
  const refunds = await sweepRefunds();
  const care = await sweepCareChecks();
  return { pipeline, swept, billing, tariffs, refunds, care };
});
