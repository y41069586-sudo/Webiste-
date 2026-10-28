import { afterAll, describe, expect, it } from 'vitest';
import { cancelWaitingJobs, getBoss, queueState, QUEUES, stopBoss } from '../src/queue';

describe('Doppelt gestartete Lead-Suchen', () => {
  afterAll(() => stopBoss());

  it('zeigt wartende Suchen und bricht sie ab', async () => {
    const boss = await getBoss();
    await cancelWaitingJobs(QUEUES.findLeads);
    for (let i = 0; i < 3; i++) await boss.send(QUEUES.findLeads, { cities: [], branches: [], triggeredBy: 'test' });
    expect((await queueState(QUEUES.findLeads)).waiting.length).toBe(3);
    expect(await cancelWaitingJobs(QUEUES.findLeads)).toBe(3);
    expect(await queueState(QUEUES.findLeads)).toEqual({ waiting: [], active: 0 });
  });
});
