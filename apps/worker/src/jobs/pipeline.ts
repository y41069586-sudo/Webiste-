import { defineJob } from '../runtime';

/**
 * Zentraler Takt: schiebt Leads idempotent durch die Pipeline (siehe Phasen 2–7).
 * Wird alle 5 Minuten ausgeführt.
 */
defineJob('pipeline-tick', async (_data, ctx) => {
  ctx.log.debug('pipeline tick');
  return { ok: true };
});
