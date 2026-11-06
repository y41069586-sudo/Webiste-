import { expect, it, vi } from 'vitest';
import { withRenderSlot } from '../src/render/limits';

it('lets a paid build wait for a legitimate Lighthouse slot without failing after thirty seconds', async () => {
  vi.useFakeTimers();
  let release: (() => void) | undefined;
  let finished = false;
  const active = withRenderSlot(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  let waiting: Promise<{ value?: number; error?: unknown }> | undefined;
  try {
    await vi.advanceTimersByTimeAsync(0);
    waiting = withRenderSlot(async () => 42).then(
      (value) => {
        finished = true;
        return { value };
      },
      (error: unknown) => {
        finished = true;
        return { error };
      },
    );
    await vi.advanceTimersByTimeAsync(165_000);
    expect(finished).toBe(false);
    release!();
    await active;
    expect(await waiting).toEqual({ value: 42 });
  } finally {
    release?.();
    await active;
    await waiting;
    vi.useRealTimers();
  }
});
