/** Share only the existing fictional HTML as a draft deploy. Never publish/restore or regenerate. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = '80e75e2d-3149-49b0-a522-76a172bbd60b';
const NAME = 'seitenwerkworld';
const API = 'https://api.netlify.com/api/v1';
const HEADERS = `/*
  X-Robots-Tag: noindex, nofollow, noarchive
  Cache-Control: no-store
  X-Content-Type-Options: nosniff
  Content-Security-Policy: default-src 'none'; img-src 'self' data:; font-src 'self' data:; style-src 'unsafe-inline'; script-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'
`;
type Deploy = { id: string; site_id?: string; draft?: boolean; state?: string; required?: string[] };
type Receipt = { siteId: string; sourceHash: string; deployId: string };

export async function shareStudioPreview(options: {
  directory: string;
  token: string;
  request?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
}) {
  if (!options.token.trim()) throw Error('NETLIFY_API_TOKEN fehlt im Worker.');
  const request = options.request ?? fetch;
  const wait = options.wait ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const directory = options.directory;
  let html: Buffer;
  try {
    html = await readFile(path.join(directory, 'index.html'));
  } catch {
    throw Error('Die Testseite index.html fehlt. Bitte die Ausgabe des Generierungslaufs schicken.');
  }
  const started = JSON.parse(await readFile(path.join(directory, 'started.json'), 'utf8')) as { fictional?: boolean };
  if (started.fictional !== true || html.length > 5 * 1024 * 1024 || !html.toString('utf8').includes('Elektro Kontur'))
    throw Error('Keine passende fiktive Testseite gefunden; nichts hochgeladen.');
  if (/sk-ant-[A-Za-z0-9_-]{20,}|nfp_[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9]{20,}/.test(html.toString('utf8')))
    throw Error('Secret-Muster in der HTML-Datei; Upload gestoppt.');
  const sourceHash = createHash('sha256').update(html).digest('hex');
  const files = [
    { path: '/index.html', data: html },
    { path: '/_headers', data: Buffer.from(HEADERS) },
  ].map((file) => ({ ...file, hash: createHash('sha1').update(file.data).digest('hex') }));
  async function api<T>(method: string, resource: string, body?: Record<string, unknown> | Buffer): Promise<T> {
    const raw = Buffer.isBuffer(body);
    const response = await request(`${API}${resource}`, {
      method,
      headers: {
        authorization: `Bearer ${options.token}`,
        ...(body === undefined ? {} : { 'content-type': raw ? 'application/octet-stream' : 'application/json' }),
      },
      body: body === undefined ? undefined : raw ? new Uint8Array(body) : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw Error(`Netlify ${method} HTTP ${response.status}; kein automatischer neuer Versuch.`);
    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  }
  const site = await api<{ id: string; name: string; published_deploy?: { id: string } }>('GET', `/sites/${SITE}`);
  if (site.id !== SITE || site.name !== NAME) throw Error('Unerwartetes Netlify-Projekt; nichts geändert.');
  let receipt: Receipt | undefined;
  try {
    receipt = JSON.parse(await readFile(path.join(directory, 'share.json'), 'utf8')) as Receipt;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (receipt && (receipt.siteId !== SITE || receipt.sourceHash !== sourceHash || !/^[a-f0-9]{24}$/.test(receipt.deployId)))
    throw Error('Vorhandener Vorschau-Nachweis passt nicht zum HTML; kein neuer Upload.');
  let deploy = receipt
    ? await api<Deploy>('GET', `/sites/${SITE}/deploys/${receipt.deployId}`)
    : await api<Deploy>('POST', `/sites/${SITE}/deploys`, {
        draft: true,
        files: Object.fromEntries(files.map((f) => [f.path, f.hash])),
      });
  function assertDraft(value: Deploy) {
    if (value.draft !== true || value.site_id !== SITE || !/^[a-f0-9]{24}$/.test(value.id))
      throw Error('Antwort bestätigt keinen isolierten Draft; Dateiübertragung gestoppt.');
  }
  assertDraft(deploy);
  await writeFile(path.join(directory, 'share.json'), JSON.stringify({ siteId: SITE, sourceHash, deployId: deploy.id }), {
    mode: 0o600,
  });
  for (const hash of new Set(deploy.required ?? [])) {
    const file = files.find((f) => f.hash === hash);
    if (!file) throw Error('Netlify fordert unbekannte Dateien; Upload gestoppt.');
    await api('PUT', `/deploys/${deploy.id}/files${file.path}`, file.data);
  }
  for (let attempt = 0; attempt < 30; attempt++) {
    deploy = await api<Deploy>('GET', `/sites/${SITE}/deploys/${deploy.id}`);
    assertDraft(deploy);
    if (deploy.state === 'ready') {
      const after = await api<{ published_deploy?: { id: string } }>('GET', `/sites/${SITE}`);
      return {
        previewUrl: `https://${deploy.id}--${NAME}.netlify.app/`,
        draft: true,
        productionUnchanged: site.published_deploy?.id === after.published_deploy?.id,
        newAiCalls: 0,
        sourceHash,
      };
    }
    if (deploy.state === 'error') throw Error('Netlify-Vorschau fehlgeschlagen. Vorhandene Dateien bleiben auf dem VPS.');
    await wait(2000);
  }
  throw Error('Vorschau noch nicht fertig. Derselbe Aufruf verwendet den vorhandenen Deploy weiter.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  shareStudioPreview({ directory: '/preview', token: process.env.NETLIFY_API_TOKEN || process.env.NELITFY_API_TOKEN || '' })
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : 'Vorschau fehlgeschlagen.');
      process.exitCode = 1;
    });
}
