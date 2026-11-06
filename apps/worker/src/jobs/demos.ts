import { getConfig, publishDemo } from '@wbm/core';
import { buildDemo, qaDemo, reviseDemo, abortableTask } from '@wbm/core/render';
import { defineJob, NonRetryableError } from '../runtime';

defineJob(
  'build-demo',
  async (data, ctx) => {
    const signal = AbortSignal.any([ctx.signal, AbortSignal.timeout(15 * 60_000)]);
    try {
      const demoId = await abortableTask(
        () =>
          buildDemo(data.leadId, {
            signal,
            regenerate: data.regenerate,
            actor: `job:build-demo:${data.triggeredBy ?? 'system'}`,
            reviewNote: data.reviewNote,
            templateId: data.templateId,
            qaFeedback: data.qaFeedback,
          }),
        signal,
      );
      return { demoId };
    } catch (err) {
      if (err instanceof Error && /Status|nicht gefunden/.test(err.message)) throw new NonRetryableError(err.message);
      throw err;
    }
  },
  // The VPS has 1.5 CPU cores; render work is serialized instead of starving QA with two builders.
  { concurrency: 1 },
);

defineJob(
  'qa-demo',
  async (data, ctx) => {
    const signal = AbortSignal.any([ctx.signal, AbortSignal.timeout(10 * 60_000)]);
    const cfg = await getConfig();
    const result = await qaDemo(data.demoId, 'job:qa-demo', {
      signal,
      lighthouse: cfg.review.qaLighthouse,
      llm: cfg.review.qaLlm,
    });
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
