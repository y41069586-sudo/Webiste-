import { readFileSync, writeFileSync } from 'node:fs';
import { validateHtml, browserChecks } from '../packages/core/src/render/qa';
import { closeBrowser } from '../packages/core/src/render/browser';
const root = 'data/exports/conversion-v4';
const result = [];
try {
  for (const group of ['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse']) {
    const html = readFileSync(`${root}/demo-${group}.html`, 'utf8');
    const checks = [await validateHtml(html), ...(await browserChecks({ html }))];
    const failed = checks.filter((c) => !c.passed);
    result.push({ group, checks });
    if (failed.length) throw new Error(`${group}: ${JSON.stringify(failed)}`);
  }
  writeFileSync(`${root}/demo-a11y-checks.json`, JSON.stringify(result, null, 2));
  console.log('5 V4 demos: HTML, desktop/mobile axe and layout checks passed.');
} finally {
  await closeBrowser();
}
