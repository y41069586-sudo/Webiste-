import { afterAll, expect, it } from 'vitest';
import { browserChecks } from '../src/render/qa';
import { closeBrowser } from '../src/render/browser';

afterAll(closeBrowser);
it('blocks broken inline images in both viewports without contacting an external host', async () => {
  const checks = await browserChecks({
    html: '<!doctype html><html lang="de"><head><title>Test</title></head><body><main><h1>Bildprüfung</h1><img src="data:image/png;base64,broken" alt="Defektes Testbild" width="100" height="100"></main></body></html>',
  });
  expect(checks.filter((c) => c.name.startsWith('bilder-'))).toHaveLength(2);
  expect(checks.filter((c) => c.name.startsWith('bilder-')).every((c) => !c.passed)).toBe(true);
});
it('accepts a decoded local image without mistaking it for a design approval', async () => {
  const src =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>',
    );
  const checks = await browserChecks({
    html: `<!doctype html><html lang="de"><head><title>Test</title></head><body><main><h1>Bildprüfung</h1><img src="${src}" alt="Lokales Testbild" width="100" height="100"></main></body></html>`,
  });
  expect(checks.filter((c) => c.name.startsWith('bilder-')).every((c) => c.passed)).toBe(true);
});
