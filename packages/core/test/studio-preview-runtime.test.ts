import { mkdtemp, readFile, rm, stat, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ generate: vi.fn(), kill: false, reviewFails: false, hostingFails: false }));
vi.mock('../src/config/service', () => ({ getConfig: async () => ({}), effectiveSwitches: () => ({ killSwitch: state.kill }) }));
vi.mock('../src/config/env', () => ({
  getEnv: () => ({
    ANTHROPIC_API_KEY: 'fixture-only-not-a-real-key',
    LLM_PROVIDER: 'anthropic',
    DRY_RUN: true,
    NETLIFY_API_TOKEN: 'fixture-netlify-token',
    CHROMIUM_EXECUTABLE_PATH: '/usr/bin/chromium',
  }),
}));
vi.mock('../src/db/client', () => ({
  closeDb: async () => {},
  getDb: () => {
    throw Error('No database access allowed in offline preview test');
  },
}));
vi.mock('../src/services/llm', () => ({ llmStructured: state.generate, modelFor: () => 'mock' }));
import { runStudioPreview } from '../scripts/studio-preview';
import { shareStudioPreview } from '../scripts/share-studio-preview';
import { MockLlm } from '../src/providers/llm/mock';
import { DEMO_TOOL_NAME, QA_TOOL_NAME } from '../src/demos/content';
import { STUDIO_TOOL } from '../src/demos/studio';

const SITE = '80e75e2d-3149-49b0-a522-76a172bbd60b',
  ID = 'a'.repeat(24);
const directories: string[] = [];
const network: { method: string; url: string; body: unknown }[] = [];
let uploadedHtml = '';
const realFetch = globalThis.fetch;
async function directory() {
  const dir = await mkdtemp(path.join(tmpdir(), 'studio-runtime-'));
  directories.push(dir);
  return dir;
}
beforeEach(() => {
  state.kill = false;
  state.reviewFails = false;
  state.hostingFails = false;
  state.generate.mockReset();
  network.length = 0;
  uploadedHtml = '';
  for (const key of [
    'PAYMENT_PROVIDER',
    'EMAIL_PROVIDER',
    'MAIL_PROVIDER',
    'REGISTRAR_PROVIDER',
    'HOSTING_PROVIDER',
    'LEAD_SOURCE',
  ])
    vi.stubEnv(key, 'mock');
  vi.stubEnv('STUDIO_PREVIEW_CONFIRM', 'one-fictional-demo-no-send');
  vi.stubEnv('STUDIO_PREVIEW_SHARE', 'true');
  state.generate.mockImplementation(async (request) => {
    if (request.toolName === QA_TOOL_NAME && state.reviewFails) throw Error('Deliberate independent review outage');
    return (await new MockLlm().generateStructured({ ...request, model: 'mock' })).data;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      if (/^http:\/\/127\.0\.0\.1:\d+\//.test(url)) return realFetch(url, init);
      const method = init.method ?? 'GET';
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      network.push({ method, url, body });
      if (url.endsWith(`/sites/${SITE}`))
        return state.hostingFails
          ? new Response('', { status: 403 })
          : Response.json({ id: SITE, name: 'seitenwerkworld', published_deploy: { id: 'unchanged' } });
      if (method === 'POST' && url.endsWith('/deploys'))
        return Response.json({ id: ID, site_id: SITE, draft: true, required: Object.values((body as { files: object }).files) });
      if (method === 'PUT') {
        if (url.endsWith('/index.html')) uploadedHtml = Buffer.from(init.body as Uint8Array).toString();
        return Response.json({});
      }
      if (url.endsWith(`/deploys/${ID}`))
        return Response.json({ id: ID, site_id: SITE, draft: true, state: 'ready', required: [] });
      if (url === `https://${ID}--seitenwerkworld.netlify.app/`) return new Response(uploadedHtml);
      throw Error('Unexpected external request in offline test');
    }),
  );
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  for (const dir of directories.splice(0)) {
    await chmod(dir, 0o700);
    await rm(dir, { recursive: true, force: true });
  }
});

describe('Real local preview runtime, with only paid generation/configuration and HTTP replaced', () => {
  it('checks images, fonts, Chromium, write access and hosting before any model call or start marker', async () => {
    const dir = await directory();
    const result = await runStudioPreview(dir, true);
    expect(result).toMatchObject({
      stage: 'preflight_passed',
      outputWritable: true,
      browserReady: true,
      imagesReady: true,
      fontsReady: true,
      hostingChecked: true,
      newAiCalls: 0,
    });
    expect(state.generate).not.toHaveBeenCalled();
    await expect(stat(path.join(dir, 'started.json'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(network.every((x) => x.method === 'GET')).toBe(true);
  }, 60000);
  it('runs the actual generator, render, screenshots, browser checks and Lighthouse, then shares exactly those HTML bytes', async () => {
    const dir = await directory();
    const result = await runStudioPreview(dir);
    expect(result).toMatchObject({
      stage: 'awaiting_manual_visual_review',
      craftPassed: false,
      manualApproved: false,
    });
    if ('checks' in result) expect(result.checks.filter((check) => !check.passed)).toEqual([]);
    expect(result).toMatchObject({ technicalPassed: true });
    expect(state.generate.mock.calls.map(([req]) => req.toolName)).toEqual([STUDIO_TOOL, DEMO_TOOL_NAME, QA_TOOL_NAME]);
    for (const name of [
      'index.html',
      'plan.json',
      'content.json',
      'attempt-1.json',
      'desktop.jpg',
      'mobile.jpg',
      'studio-desktop.jpg',
      'studio-mobile.jpg',
      'result.json',
    ])
      expect((await stat(path.join(dir, name))).size).toBeGreaterThan(20);
    const callsBefore = state.generate.mock.calls.length;
    const shared = await shareStudioPreview({ directory: dir, token: 'fixture-token' });
    expect(shared).toMatchObject({ previewVerified: true, htmlExact: true, productionUnchanged: true, newAiCalls: 0 });
    expect(uploadedHtml).toBe(await readFile(path.join(dir, 'index.html'), 'utf8'));
    await shareStudioPreview({ directory: dir, token: 'fixture-token' });
    expect(network.filter((x) => x.method === 'POST')).toHaveLength(1);
    expect(state.generate).toHaveBeenCalledTimes(callsBefore);
  }, 60000);
  it('preserves viewable HTML when later AI review fails and sharing spends no more model calls', async () => {
    const dir = await directory();
    state.reviewFails = true;
    await expect(runStudioPreview(dir)).rejects.toThrow(/review outage/);
    expect((await stat(path.join(dir, 'index.html'))).size).toBeGreaterThan(100);
    const calls = state.generate.mock.calls.length;
    const shared = await shareStudioPreview({ directory: dir, token: 'fixture-token' });
    expect(shared.previewVerified).toBe(true);
    expect(state.generate).toHaveBeenCalledTimes(calls);
    const result = JSON.parse(await readFile(path.join(dir, 'result.json'), 'utf8'));
    expect(result.stage).toBe('blocked');
  }, 60000);
  it('respects Not-Aus before a start marker or model/hosting call', async () => {
    const dir = await directory();
    state.kill = true;
    await expect(runStudioPreview(dir)).rejects.toThrow(/Not-Aus/);
    expect(state.generate).not.toHaveBeenCalled();
    expect(network).toHaveLength(0);
    await expect(stat(path.join(dir, 'started.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('rejects an unwritable output before any model call', async () => {
    const dir = await directory();
    await chmod(dir, 0o500);
    await expect(runStudioPreview(dir)).rejects.toThrow(/EACCES/);
    expect(state.generate).not.toHaveBeenCalled();
    expect(network).toHaveLength(0);
  });
  it('rejects unavailable hosting before a paid generation or irreversible start marker', async () => {
    const dir = await directory();
    state.hostingFails = true;
    await expect(runStudioPreview(dir)).rejects.toThrow(/HTTP 403/);
    expect(state.generate).not.toHaveBeenCalled();
    await expect(stat(path.join(dir, 'started.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  }, 60000);
});
