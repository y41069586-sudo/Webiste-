import { expect, it, vi } from 'vitest';
vi.mock('../src/providers', () => ({
  getProviders: () => ({ storage: { put: async () => undefined, get: async () => Buffer.from('ok') } }),
}));
import { systemHealth } from '../src/services/monitoring';
import type { DbOrTx } from '../src/db/client';
it('reports unreadable queue counts as unknown, never as zero failures', async () => {
  const execute = vi
    .fn()
    .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
    .mockRejectedValueOnce(Error('missing schema'))
    .mockResolvedValueOnce({ rows: [] });
  const health = await systemHealth({ execute } as unknown as DbOrTx);
  expect(health.status).toBe('degraded');
  expect(health.queueReadable).toBe(false);
  expect(health.failedJobsLastHour).toBeNull();
  expect(health.backlog).toBeNull();
  expect(health.problems.join(' ')).toContain('Schema');
});
it('keeps verified empty queue counts distinct from missing schema and missing backup table', async () => {
  const execute = vi
    .fn()
    .mockResolvedValueOnce({ rows: [{}] })
    .mockResolvedValueOnce({ rows: [{ heartbeat: 12, failed: 0, dead: 0, backlog: 0 }] })
    .mockRejectedValueOnce(Error('missing settings'));
  const health = await systemHealth({ execute } as unknown as DbOrTx);
  expect(health.queueReadable).toBe(true);
  expect(health.failedJobsLastHour).toBe(0);
  expect(health.problems).toContain('Backup-Nachweis nicht lesbar');
});
