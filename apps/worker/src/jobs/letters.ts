import { generateLetter } from '@wbm/core/render';
import { defineJob, NonRetryableError } from '../runtime';

defineJob(
  'generate-letter',
  async (data) => {
    try {
      const res = await generateLetter(data.leadId, data.sequence, {
        actor: `job:generate-letter:${data.triggeredBy ?? 'system'}`,
        test: data.test,
        regenerate: data.regenerate,
      });
      return { letterId: res.letterId, status: res.status, issues: res.issues.length };
    } catch (err) {
      if (err instanceof Error && /Status|Widerspr|gelöscht|unvollständig|Keine veröffentlichte/.test(err.message)) {
        throw new NonRetryableError(err.message);
      }
      throw err;
    }
  },
  { concurrency: 2 },
);
