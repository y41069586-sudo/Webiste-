import { afterEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ launch: vi.fn() }));
vi.mock('playwright', () => ({ chromium: { launch: mock.launch } }));
import { getBrowser, closeBrowser, withPage } from '../src/render/browser';
function fake() {
  let disconnect = () => {};
  const browser = {
    on: (_event: string, fn: () => void) => {
      disconnect = fn;
    },
    close: vi.fn(async (): Promise<void> => undefined),
    newContext: vi.fn(),
  };
  return { browser, disconnect: () => disconnect() };
}
afterEach(async () => {
  await closeBrowser();
  mock.launch.mockReset();
});
it('does not lose the current renderer when an older browser finishes closing', async () => {
  const a = fake(),
    b = fake();
  let finish = () => {};
  a.browser.close.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  mock.launch.mockResolvedValueOnce(a.browser).mockResolvedValueOnce(b.browser);
  await getBrowser();
  const closing = closeBrowser();
  await vi.waitFor(() => expect(a.browser.close).toHaveBeenCalledOnce());
  expect(await getBrowser()).toBe(b.browser);
  a.disconnect();
  expect(await getBrowser()).toBe(b.browser);
  expect(mock.launch).toHaveBeenCalledTimes(2);
  finish();
  await closing;
});
it('closes a context even if opening the page fails, and bounds renderer waits', async () => {
  const { browser } = fake();
  const context = {
    setDefaultTimeout: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    route: vi.fn(async () => undefined),
    newPage: vi.fn(async () => {
      throw Error('fixture page failure');
    }),
    close: vi.fn(async () => undefined),
  };
  browser.newContext.mockResolvedValue(context);
  mock.launch.mockResolvedValue(browser);
  await expect(withPage({ width: 390, height: 844 }, async () => undefined)).rejects.toThrow('fixture page failure');
  expect(context.close).toHaveBeenCalledOnce();
  expect(context.setDefaultTimeout).toHaveBeenCalledWith(45000);
});
