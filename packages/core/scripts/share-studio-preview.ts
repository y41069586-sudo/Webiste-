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

async function netlifyApi<T>(
  token: string,
  request: typeof fetch,
  method: string,
  resource: string,
  body?: Record<string, unknown> | Buffer,
): Promise<T> {
  const raw = Buffer.isBuffer(body);
  const response = await request(`${API}${resource}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'content-type': raw ? 'application/octet-stream' : 'application/json' }),
    },
    body: body === undefined ? undefined : raw ? new Uint8Array(body) : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(`Netlify ${method} HTTP ${response.status}; kein automatischer neuer Versuch.`);
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/** Read-only hosting check BEFORE spending tokens on a demo meant to be shared. */
export async function checkStudioPreviewHosting(token: string, request: typeof fetch = fetch) {
  if (!token.trim()) throw Error('NETLIFY_API_TOKEN fehlt im Worker; kein KI-Aufruf gestartet.');
  const site = await netlifyApi<{ id: string; name: string; published_deploy?: { id: string } }>(
    token,
    request,
    'GET',
    `/sites/${SITE}`,
  );
  if (site.id !== SITE || site.name !== NAME) throw Error('Unerwartetes Netlify-Projekt; nichts geändert.');
  return site;
}

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
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') throw Error('Die Testseite index.html fehlt. Bitte die Ausgabe des Generierungslaufs schicken.');
    if (code === 'EACCES' || code === 'EPERM')
      throw Error(`Die Testseite index.html ist vorhanden, aber nicht lesbar (${code}); keine Dateien hochgeladen.`);
    throw error;
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
  const api = <T>(method: string, resource: string, body?: Record<string, unknown> | Buffer) =>
    netlifyApi<T>(options.token, request, method, resource, body);
  const site = await checkStudioPreviewHosting(options.token, request);
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
      const previewUrl = `https://${deploy.id}--${NAME}.netlify.app/`;
      const visible = await request(previewUrl, { signal: AbortSignal.timeout(30000) });
      if (!visible.ok)
        throw Error(`Vorschau noch nicht aufrufbar (HTTP ${visible.status}); derselbe Aufruf verwendet den bestehenden Deploy.`);
      const visibleHtml = await visible.text();
      if (!visibleHtml.includes('Elektro Kontur'))
        throw Error('Die Vorschau-URL liefert nicht den erwarteten Testentwurf; keinen falschen Link anzeigen.');
      return {
        previewUrl,
        previewVerified: true,
        htmlExact: createHash('sha256').update(visibleHtml).digest('hex') === sourceHash,
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
