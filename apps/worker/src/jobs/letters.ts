import { enqueue, QUEUES } from '@wbm/core';
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
      // Einmal automatisch neu schreiben (KI-Text und KI-Wahrheitsprüfung schwanken); scheitert auch das, bleibt der
      // Brief zur Prüfung stehen. Testbriefe und Neuerzeugungen von Hand nicht.
      if (res.status === 'failed' && !data.regenerate && !data.test)
        await enqueue(
          QUEUES.generateLetter,
          { leadId: data.leadId, sequence: data.sequence, triggeredBy: 'auto-retry', regenerate: true },
          { singletonKey: `letter-retry:${data.leadId}:${data.sequence}`, startAfter: 60 },
        );
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
