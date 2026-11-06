import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { enqueue, getBoss, stopBoss, QUEUES } from '../src/queue';
import { closeDb } from '../src/db/client';
describe('Atomic per-entity admission on existing standard pg-boss queues', () => {
  afterAll(async () => {
    await stopBoss();
    await closeDb();
  });
  it('admits exactly one of twenty concurrent builds for one lead, across differing caller keys', async () => {
    const leadId = randomUUID();
    const ids = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        enqueue(QUEUES.buildDemo, { leadId, triggeredBy: 'test' }, { singletonKey: `caller-${i}` }),
      ),
    );
    expect(ids.filter(Boolean)).toHaveLength(1);
    const result = await (
      await getBoss()
    )
      .getDb()
      .executeSql(
        "select singleton_key from pgboss.job where name='build-demo' and data->>'leadId'=$1 and state in ('created','retry','active')",
        [leadId],
      );
    expect(result.rows).toEqual([{ singleton_key: `demo:${leadId}` }]);
  });
  it('does not add to an old unkeyed pending job and permits an explicit new build after cancellation', async () => {
    const boss = await getBoss(),
      leadId = randomUUID();
    const old = await boss.send('build-demo', { leadId });
    expect(await enqueue(QUEUES.buildDemo, { leadId })).toBeNull();
    await boss.cancel('build-demo', old!);
    expect(await enqueue(QUEUES.buildDemo, { leadId })).toBeTruthy();
  });
  it('deduplicates QA separately for each demo and leaves other leads independent', async () => {
    const one = randomUUID(),
      two = randomUUID();
    const ids = await Promise.all([
      enqueue(QUEUES.qaDemo, { demoId: one }),
      enqueue(QUEUES.qaDemo, { demoId: one }),
      enqueue(QUEUES.qaDemo, { demoId: two }),
    ]);
    expect(ids.filter(Boolean)).toHaveLength(2);
    expect(await enqueue(QUEUES.buildDemo, { leadId: two })).toBeTruthy();
  });
});
