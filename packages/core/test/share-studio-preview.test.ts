import { mkdtemp, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { shareStudioPreview, checkStudioPreviewHosting } from '../scripts/share-studio-preview';

const SITE = '80e75e2d-3149-49b0-a522-76a172bbd60b';
const ID = 'a'.repeat(24);
const directories: string[] = [];
async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'studio-share-'));
  directories.push(directory);
  await writeFile(path.join(directory, 'started.json'), JSON.stringify({ fictional: true }));
  await writeFile(
    path.join(directory, 'index.html'),
    '<!doctype html><title>Elektro Kontur</title><h1>Elektro Kontur · fiktiver Testbetrieb</h1>',
  );
  return directory;
}
function server(options: { draft?: boolean; failUpload?: boolean } = {}) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  let required: string[] = [];
  let uploadedHtml = '';
  const request = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    calls.push({ url, method, body });
    if (url === `https://${ID}--seitenwerkworld.netlify.app/`) return new Response(uploadedHtml || '<h1>Elektro Kontur</h1>');
    if (url.endsWith(`/sites/${SITE}`))
      return Response.json({ id: SITE, name: 'seitenwerkworld', published_deploy: { id: 'production-original' } });
    if (method === 'POST') {
      required = Object.values((body as { files: Record<string, string> }).files);
      return Response.json({ id: ID, site_id: SITE, draft: options.draft ?? true, required });
    }
    if (method === 'PUT') {
      if (url.endsWith('/index.html')) uploadedHtml = Buffer.from(init.body as Uint8Array).toString();
      return options.failUpload ? new Response('', { status: 503 }) : new Response('{}');
    }
    return Response.json({ id: ID, site_id: SITE, draft: options.draft ?? true, required: [], state: 'ready' });
  }) as typeof fetch;
  return { calls, request };
}
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});
describe('Share the existing fictional preview without production publication', () => {
  it('uploads only HTML/headers with draft:true, no regeneration or settings changes', async () => {
    const directory = await fixture(),
      fake = server();
    const result = await shareStudioPreview({ directory, token: 'test-only', request: fake.request });
    expect(result.productionUnchanged).toBe(true);
    expect(result.previewUrl).toBe(`https://${ID}--seitenwerkworld.netlify.app/`);
    expect(result.newAiCalls).toBe(0);
    expect(result.previewVerified).toBe(true);
    expect(result.htmlExact).toBe(true);
    const post = fake.calls.find((x) => x.method === 'POST')!;
    expect(post.body).toMatchObject({ draft: true });
    expect(Object.keys((post.body as { files: object }).files)).toEqual(['/index.html', '/_headers']);
    expect(fake.calls.filter((x) => x.method === 'PUT')).toHaveLength(2);
    expect(fake.calls.some((x) => /publish|restore/.test(x.url) || x.method === 'PATCH')).toBe(false);
    fake.calls.length = 0;
    await shareStudioPreview({ directory, token: 'test-only', request: fake.request });
    expect(fake.calls.some((x) => x.method === 'POST')).toBe(false);
  });
  it('checks hosting access without a deploy, a page or any mutations', async () => {
    const fake = server();
    await checkStudioPreviewHosting('test-only', fake.request);
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]!.method).toBe('GET');
    await expect(checkStudioPreviewHosting('', fake.request)).rejects.toThrow(/NETLIFY_API_TOKEN/);
    expect(fake.calls).toHaveLength(1);
  });
  it('does not report a ready permalink serving the wrong page as a valid preview', async () => {
    const directory = await fixture(),
      fake = server();
    const request = (async (url: string, init?: RequestInit) =>
      url.startsWith('https://' + ID + '--') ? new Response('wrong site') : fake.request(url, init)) as typeof fetch;
    await expect(shareStudioPreview({ directory, token: 'test-only', request })).rejects.toThrow(/nicht den erwarteten/);
  });
  it('refuses to upload bytes without positive draft confirmation', async () => {
    const directory = await fixture(),
      fake = server({ draft: false });
    await expect(shareStudioPreview({ directory, token: 'test-only', request: fake.request })).rejects.toThrow(
      /isolierten Draft/,
    );
    expect(fake.calls.some((x) => x.method === 'PUT')).toBe(false);
  });
  it('does not retry uncertain uploads or expose the credential', async () => {
    const directory = await fixture(),
      fake = server({ failUpload: true });
    await expect(shareStudioPreview({ directory, token: 'private-not-for-output', request: fake.request })).rejects.toThrow(
      'Netlify PUT HTTP 503',
    );
    expect(fake.calls.filter((x) => x.method === 'PUT')).toHaveLength(1);
  });
  it('fails before any external call when the generated page is missing', async () => {
    const directory = await fixture(),
      fake = server();
    await rm(path.join(directory, 'index.html'));
    await expect(shareStudioPreview({ directory, token: 'test-only', request: fake.request })).rejects.toThrow(
      /index.html fehlt/,
    );
    expect(fake.calls).toHaveLength(0);
  });
  it('reports unreadable HTML as a permissions error rather than a missing generation', async () => {
    const directory = await fixture(),
      fake = server();
    await chmod(path.join(directory, 'index.html'), 0o000);
    await expect(shareStudioPreview({ directory, token: 'test-only', request: fake.request })).rejects.toThrow(
      /vorhanden, aber nicht lesbar \(EACCES\)/,
    );
    expect(fake.calls).toHaveLength(0);
  });
});
