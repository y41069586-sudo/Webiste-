import { getConfig, publishDemo } from '@wbm/core';
import { buildDemo, qaDemo, reviseDemo } from '@wbm/core/render';
import { defineJob, NonRetryableError } from '../runtime';

defineJob(
  'build-demo',
  async (data) => {
    try {
      const demoId = await buildDemo(data.leadId, {
        regenerate: data.regenerate,
        actor: `job:build-demo:${data.triggeredBy ?? 'system'}`,
        reviewNote: data.reviewNote,
        templateId: data.templateId,
      });
      return { demoId };
    } catch (err) {
      if (err instanceof Error && /Status|nicht gefunden/.test(err.message)) throw new NonRetryableError(err.message);
      throw err;
    }
  },
  { concurrency: 2 },
);

defineJob(
  'qa-demo',
  async (data) => {
    const cfg = await getConfig();
    const result = await qaDemo(data.demoId, 'job:qa-demo', { lighthouse: cfg.review.qaLighthouse, llm: cfg.review.qaLlm });
    return { passed: result.passed, failed: result.checks.filter((c) => !c.passed).map((c) => c.name) };
  },
  { concurrency: 1 },
);

defineJob('publish-demo', async (data) => {
  await publishDemo(data.demoId, 'job:publish-demo');
  return { ok: true };
});

defineJob('revise-demo', async (data) => {
  const status = await reviseDemo({
    demoId: data.demoId,
    patch: data.patch,
    actor: data.actor,
    wishMessageId: data.wishMessageId,
  });
  return status;
});
