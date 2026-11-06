/** One CPU-heavy render at a time on the 1.5-core VPS. Time waiting for a slot is bounded too. */
let tail: Promise<void> = Promise.resolve();
export async function abortableTask<T>(run: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  if (!signal) return run();
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        abort = () => reject(signal.reason ?? Error('Auftrag abgebrochen.'));
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) abort();
      }),
    ]);
  } finally {
    if (abort) signal.removeEventListener('abort', abort);
  }
}
// A legitimate two-pass Lighthouse run may occupy the slot for up to 165 seconds.
// Waiting builders must not discard already paid content after only 30 seconds.
export async function withRenderSlot<T>(run: () => Promise<T>, waitMs = 180_000): Promise<T> {
  const before = tail;
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  tail = before.then(() => next);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      before,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Error('Render-Wartelimit überschritten.')), waitMs);
      }),
    ]);
    if (timer) clearTimeout(timer);
    return await run();
  } finally {
    if (timer) clearTimeout(timer);
    release();
  }
}

/** Always run cleanup on expiry; callers must close the actual browser/context, not only reject a promise. */
export async function boundedRender<T>(run: () => Promise<T>, cleanup: () => Promise<unknown>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(Error(`Render-Zeitlimit ${timeoutMs} ms überschritten.`));
          void cleanup().catch(() => undefined);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
