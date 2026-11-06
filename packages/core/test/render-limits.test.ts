import { describe, expect, it } from 'vitest';
import { boundedRender, withRenderSlot, abortableTask } from '../src/render/limits';
describe('Bounded CPU render work', () => {
  it('honors the job deadline before the outer pg-boss expiry and never starts an already-aborted task', async () => {
    const controller = new AbortController();
    let ran = false;
    const task = abortableTask(() => new Promise(() => {}), controller.signal);
    controller.abort(Error('controlled QA deadline'));
    await expect(task).rejects.toThrow('controlled QA deadline');
    await expect(
      abortableTask(async () => {
        ran = true;
      }, controller.signal),
    ).rejects.toThrow('controlled QA deadline');
    expect(ran).toBe(false);
  });
  it('serializes CPU-heavy work rather than running build and QA render contexts together', async () => {
    let active = 0,
      peak = 0;
    await Promise.all(
      Array.from({ length: 5 }, () =>
        withRenderSlot(async () => {
          active++;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active--;
        }),
      ),
    );
    expect(peak).toBe(1);
  });
  it('closes the actual context on a stalled evaluate/image decode instead of only abandoning its promise', async () => {
    let closed = false;
    await expect(
      boundedRender(
        () => new Promise(() => {}),
        async () => {
          closed = true;
        },
        5,
      ),
    ).rejects.toThrow(/Zeitlimit/);
    expect(closed).toBe(true);
    expect(await withRenderSlot(async () => 42)).toBe(42);
  });
  it('expired waiters never run later and do not permanently block following render jobs', async () => {
    let release!: () => void,
      ran = false;
    const running = withRenderSlot(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(
      withRenderSlot(async () => {
        ran = true;
      }, 5),
    ).rejects.toThrow(/Wartelimit/);
    release();
    await running;
    expect(await withRenderSlot(async () => 7)).toBe(7);
    expect(ran).toBe(false);
  });
});
