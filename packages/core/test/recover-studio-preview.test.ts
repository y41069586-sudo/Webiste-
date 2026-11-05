import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteContent } from '@wbm/templates';
import { recoverStudioPreview } from '../scripts/recover-studio-preview';
import {
  buildDemoPrompt,
  DEMO_CONTENT_SCHEMA,
  DEMO_TOOL_NAME,
  validateDemoContent,
  type ContentFacts,
} from '../src/demos/content';
import { MockLlm } from '../src/providers/llm/mock';
import { STUDIO_VERSION } from '../src/demos/studio';
import '../src/demos/mock-handlers';
vi.mock('../src/services/llm', () => ({
  llmStructured: () => {
    throw Error('Recovery must never request a model');
  },
}));
vi.mock('../src/db/client', () => ({
  getDb: () => {
    throw Error('Recovery must never access a database');
  },
}));
const dirs: string[] = [];
const facts: ContentFacts = {
  name: 'Elektro Kontur · fiktiver Testbetrieb',
  branchLabel: 'Elektroinstallation',
  branchKey: 'elektriker',
  group: 'handwerk',
  city: 'Bochum',
  street: 'Beispielweg',
  houseNumber: '1',
  postalCode: '44803',
  phone: null,
  hasOpeningHours: false,
  socialOnly: false,
  requireFullPage: true,
  imageBrief: [1, 2, 3].map((slot) => ({ slot, alt: 'Symbolbild Elektroinstallation', example: true })),
};
async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'studio-recovery-'));
  dirs.push(dir);
  const content = (
    await new MockLlm().generateStructured<SiteContent>({
      toolName: DEMO_TOOL_NAME,
      toolDescription: 'Saved fixture, no API',
      inputSchema: DEMO_CONTENT_SCHEMA,
      model: 'mock',
      system: 'test',
      prompt: buildDemoPrompt(facts, 0),
      maxTokens: 10000,
      purpose: 'demo_content',
    })
  ).data;
  content.design!.html += '<p>Wie wird der Preis abgestimmt?</p>';
  await writeFile(path.join(dir, 'started.json'), JSON.stringify({ fictional: true, version: STUDIO_VERSION }));
  await writeFile(path.join(dir, 'result.json'), JSON.stringify({ stage: 'blocked', reason: 'Original price rejection' }));
  await writeFile(
    path.join(dir, 'attempt-1.json'),
    JSON.stringify({ content: { ...content, hero_headline: 'Erster Testentwurf' } }),
  );
  await writeFile(path.join(dir, 'attempt-2.json'), JSON.stringify({ content }));
  return { dir, content };
}
beforeEach(() => {
  vi.stubEnv('STUDIO_PREVIEW_RECOVER_CONFIRM', 'existing-fictional-only-no-ai');
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw Error('No external calls allowed during recovery');
    }),
  );
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});
describe('Recover the existing fictional candidate without spending or approving', () => {
  it('renders the latest saved candidate, retains rejection evidence and shows an unapproved notice', async () => {
    const { dir } = await fixture();
    const originals = await Promise.all(
      ['started.json', 'result.json', 'attempt-1.json', 'attempt-2.json'].map((n) => readFile(path.join(dir, n), 'utf8')),
    );
    const result = await recoverStudioPreview(dir);
    expect(result).toMatchObject({
      sourceAttempt: 2,
      contentPassed: false,
      manualApproved: false,
      craftPassed: false,
      technicalPassed: false,
      demoPublished: false,
      workerStarted: false,
      newAiCalls: 0,
    });
    expect(result.violations).toEqual([
      expect.objectContaining({
        field: 'design',
        rule: 'Preise/Rabatte',
        detail: expect.stringContaining('Wie wird der Preis abgestimmt?'),
      }),
    ]);
    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    expect(html).toContain('Nicht freigegeben. Inhalts- und Gestaltungsprüfung offen.');
    expect(html).toContain('Wie wird der Preis abgestimmt?');
    expect((await stat(path.join(dir, 'index.html'))).mode & 0o777).toBe(0o600);
    expect(
      await Promise.all(
        ['started.json', 'result.json', 'attempt-1.json', 'attempt-2.json'].map((n) => readFile(path.join(dir, n), 'utf8')),
      ),
    ).toEqual(originals);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses the first candidate if the second one was never saved', async () => {
    const { dir } = await fixture();
    await rm(path.join(dir, 'attempt-2.json'));
    expect((await recoverStudioPreview(dir)).sourceAttempt).toBe(1);
    expect(JSON.parse(await readFile(path.join(dir, 'recovered-content.json'), 'utf8')).hero_headline).toBe('Erster Testentwurf');
  });
  it('never restarts generation when neither saved candidate exists', async () => {
    const { dir } = await fixture();
    await Promise.all([1, 2].map((n) => rm(path.join(dir, `attempt-${n}.json`))));
    await expect(recoverStudioPreview(dir)).rejects.toThrow(/kein KI-Neubau/);
    await expect(stat(path.join(dir, 'index.html'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('refuses non-fictional input and never exposes customer drafts', async () => {
    const { dir } = await fixture();
    await writeFile(path.join(dir, 'started.json'), JSON.stringify({ fictional: false, version: STUDIO_VERSION }));
    await expect(recoverStudioPreview(dir)).rejects.toThrow(/fiktiver/);
    await expect(stat(path.join(dir, 'index.html'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('keeps HTML/CSS safety validation even for an unapproved diagnostic view', async () => {
    const { dir, content } = await fixture();
    content.design!.html += '<script>alert("unsafe")</script>';
    await writeFile(path.join(dir, 'attempt-2.json'), JSON.stringify({ content }));
    await expect(recoverStudioPreview(dir)).rejects.toThrow(/Sandbox/);
    await expect(stat(path.join(dir, 'index.html'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('preserves an existing page and report rather than regenerating or overwriting', async () => {
    const { dir } = await fixture();
    await writeFile(path.join(dir, 'index.html'), 'Existing page');
    await expect(recoverStudioPreview(dir)).rejects.toThrow(/bereits vorhanden/);
    expect(await readFile(path.join(dir, 'index.html'), 'utf8')).toBe('Existing page');
    await expect(stat(path.join(dir, 'recovery.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('includes actual price match context and still rejects amounts, discounts and free-service claims', async () => {
    const { content } = await fixture();
    for (const text of ['Preis: hundert Euro', 'Wir bieten einen Rabatt.', 'Die Beratung ist kostenlos.']) {
      const c = {
        ...content,
        design: {
          ...content.design!,
          html: content.design!.html.replace('<p>Wie wird der Preis abgestimmt?</p>', `<p>${text}</p>`),
        },
      };
      expect(validateDemoContent(c, facts).some((v) => v.rule === 'Preise/Rabatte' && v.detail.includes(text))).toBe(true);
    }
  });
});
