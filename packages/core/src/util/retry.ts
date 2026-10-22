import { sleep } from './time';

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
  get retryable(): boolean {
    return this.status === 408 || this.status === 409 || this.status === 425 || this.status === 429 || this.status >= 500;
  }
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (err: unknown) => boolean;
}

/** Wiederholung mit exponentiellem Backoff + Jitter. */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseDelayMs ?? 500;
  const max = opts.maxDelayMs ?? 15_000;
  const should =
    opts.shouldRetry ??
    ((err: unknown) => (err instanceof HttpError ? err.retryable : err instanceof TypeError /* Netzwerkfehler von fetch */));
  let attempt = 0;
  for (;;) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries || !should(err)) throw err;
      const delay = Math.min(max, base * 2 ** attempt) * (0.75 + Math.random() * 0.5);
      await sleep(delay);
      attempt++;
    }
  }
}

/** fetch mit Timeout und Fehler bei !ok. */
export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 30_000, ...rest } = init;
  const res = await fetch(url, { ...rest, signal: rest.signal ?? AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  if (!res.ok) {
    throw new HttpError(`HTTP ${res.status} bei ${new URL(url).host}${new URL(url).pathname}`, res.status, text.slice(0, 2000));
  }
  return (text ? JSON.parse(text) : {}) as T;
}
