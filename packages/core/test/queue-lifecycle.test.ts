import { afterAll, describe, expect, it } from 'vitest';
import { getBoss, stopBoss } from '../src/queue';
import { randomToken } from '../src/util/crypto';

async function until(check: () => Promise<boolean>, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Queue-Test hat das erwartete Ergebnis nicht rechtzeitig erreicht.');
}
describe('Echte lokale pg-boss-Queue (keine externen Provider)', () => {
  afterAll(() => stopBoss());
  it('Schema, Verarbeitung, Retry, Dead-Letter und Cronregistrierung', async () => {
    const boss = await getBoss();
    expect(await boss.isInstalled()).toBe(true);
    expect(await boss.schemaVersion()).toBeGreaterThan(0);
    const name = `fixture-${randomToken(6).toLowerCase()}`,
      dead = `fixture-dead-${randomToken(6).toLowerCase()}`;
    await boss.createQueue(dead, { retryLimit: 0 });
    await boss.createQueue(name, { retryLimit: 1, retryDelay: 1, deadLetter: dead });
    let attempts = 0;
    await boss.work<{ fail?: boolean }>(name, { pollingIntervalSeconds: 0.5 }, async (jobs) => {
      for (const job of jobs) {
        attempts++;
        if (job.data && 'fail' in job.data) throw new Error('Fiktiver dauerhafter Fehler');
        if (job.retryCount === 0) throw new Error('Fiktiver wiederholbarer Fehler');
      }
    });
    const job = await boss.send(name, { fixture: 'fictional-only' });
    await until(async () => (await boss.getJobById(name, job!))?.state === 'completed');
    expect(attempts).toBe(2);
    const failed = await boss.send(name, { fail: true });
    await until(async () => (await boss.getJobById(name, failed!))?.state === 'failed');
    let deadJobs: Awaited<ReturnType<typeof boss.fetch>> = [];
    await until(async () => {
      deadJobs = await boss.fetch(dead);
      return deadJobs.length > 0;
    });
    expect(deadJobs).toHaveLength(1);
    await boss.complete(dead, deadJobs[0]!.id);
    await boss.schedule(name, '*/5 * * * *', { fixture: 'fictional-cron' });
    expect((await boss.getSchedules()).some((s) => s.name === name)).toBe(true);
    await boss.unschedule(name);
    await boss.offWork(name);
    await boss.deleteQueue(name);
    await boss.deleteQueue(dead);
  }, 45000);
});
