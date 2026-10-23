import { describe, expect, it } from 'vitest';
import { assetHash, CloudflareHosting } from '../src/providers/hosting/cloudflare';
import { NetlifyHosting } from '../src/providers/hosting/netlify';
import { InwxRegistrar, inwxPhone } from '../src/providers/registrar/inwx';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

function fake(handler: (c: Call) => { status?: number; json?: unknown; headers?: Record<string, string> }) {
  const calls: Call[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    let body: unknown = init?.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        /* Text */
      }
    }
    const c: Call = { url: String(url), method: init?.method ?? 'GET', headers, body };
    calls.push(c);
    const r = handler(c);
    const h = new Headers({ 'content-type': 'application/json', ...(r.headers ?? {}) });
    return new Response(r.json === undefined ? '' : JSON.stringify(r.json), { status: r.status ?? 200, headers: h });
  }) as typeof fetch;
  return { fn, calls };
}

describe('INWX', () => {
  it('Telefonnummern im INWX-Format', () => {
    expect(inwxPhone('0231 123456')).toBe('+49.231123456');
    expect(inwxPhone('+49 (0)231 12-34')).toBe('+49.2311234');
    expect(inwxPhone('0043 1 234567')).toBe('+43.1234567');
  });

  it('Login mit Cookie, Verfügbarkeit, Registrierung auf den Kunden, DNS-Records', async () => {
    const { fn, calls } = fake((c) => {
      const b = c.body as { method: string; params: Record<string, unknown> };
      switch (b.method) {
        case 'account.login':
          return {
            json: { code: 1000, msg: 'OK', resData: { tfa: '0' } },
            headers: { 'set-cookie': 'domrobot=abc123; path=/; HttpOnly' },
          };
        case 'domain.check':
          return {
            json: {
              code: 1000,
              msg: 'OK',
              resData: {
                domain: [
                  { domain: 'frei-beispiel.de', avail: 1, price: 4.5 },
                  { domain: 'vergeben.de', avail: 0, reason: 'registered' },
                ],
              },
            },
          };
        case 'domain.info':
          return { json: { code: 2303, msg: 'Object does not exist' } };
        case 'contact.create':
          return { json: { code: 1000, msg: 'OK', resData: { id: 777 } } };
        case 'domain.create':
          return { json: { code: 1000, msg: 'OK', resData: { roId: 9001, price: 4.5 } } };
        case 'nameserver.create':
          return { json: { code: 1000, msg: 'OK', resData: { roId: 1 } } };
        case 'nameserver.info':
          return {
            json: {
              code: 1000,
              msg: 'OK',
              resData: { record: [{ id: 'r1', name: 'www.frei-beispiel.de', type: 'CNAME', content: 'alt.example' }] },
            },
          };
        default:
          return { json: { code: 1000, msg: 'OK', resData: {} } };
      }
    });
    const r = new InwxRegistrar({ user: 'u', password: 'p', env: 'sandbox' }, fn);
    const av = await r.checkAvailability(['frei-beispiel.de', 'vergeben.de']);
    expect(av).toEqual([
      { domain: 'frei-beispiel.de', available: true, priceCents: 450 },
      { domain: 'vergeben.de', available: false, reason: 'registered' },
    ]);
    expect(calls[0]!.url).toBe('https://api.ote.domrobot.com/jsonrpc/');
    expect(calls[1]!.headers.cookie).toBe('domrobot=abc123');

    const reg = await r.registerDomain({
      domain: 'frei-beispiel.de',
      owner: {
        company: 'Maler Beispiel GmbH',
        name: 'Erika Beispiel',
        street: 'Kampstraße 5',
        postalCode: '44137',
        city: 'Dortmund',
        country: 'DE',
        email: 'e@example.org',
        phone: '0231 123456',
      },
      nameservers: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'],
      idempotencyKey: 'domain-c1',
    });
    expect(reg).toMatchObject({ status: 'registered', registrarDomainId: '9001', ownerHandle: '777', costCents: 450 });
    const contact = calls.find((c) => (c.body as { method: string }).method === 'contact.create')!.body as {
      params: Record<string, unknown>;
    };
    expect(contact.params).toMatchObject({
      type: 'ORG',
      name: 'Erika Beispiel',
      org: 'Maler Beispiel GmbH',
      cc: 'DE',
      pc: '44137',
      voice: '+49.231123456',
    });
    const create = calls.find((c) => (c.body as { method: string }).method === 'domain.create')!.body as {
      params: Record<string, unknown>;
    };
    expect(create.params).toMatchObject({
      domain: 'frei-beispiel.de',
      period: '1Y',
      registrant: 777,
      ns: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'],
    });

    await r.setDnsRecords('frei-beispiel.de', [
      { type: 'A', name: '@', value: '75.2.60.5' },
      { type: 'CNAME', name: 'www', value: 'x.netlify.app' },
    ]);
    const methods = calls.map((c) => (c.body as { method: string }).method);
    expect(methods.slice(-5)).toEqual([
      'nameserver.create',
      'nameserver.info',
      'nameserver.createRecord',
      'nameserver.deleteRecord',
      'nameserver.createRecord',
    ]);
  });

  it('Fehlercodes werden als Fehler gemeldet', async () => {
    const { fn } = fake((c) => {
      const b = c.body as { method: string };
      if (b.method === 'account.login') return { json: { code: 1000, msg: 'OK', resData: {} } };
      return { json: { code: 2400, msg: 'Command failed' } };
    });
    await expect(
      new InwxRegistrar({ user: 'u', password: 'p', env: 'production' }, fn).checkAvailability(['a.de']),
    ).rejects.toThrow(/2400/);
  });
});

describe('Cloudflare (Workers Static Assets)', () => {
  it('Upload-Session, Bucket-Upload mit JWT, Script mit Assets-Bindung', async () => {
    const { fn, calls } = fake((c) => {
      if (c.url.endsWith('/assets-upload-session')) {
        const manifest = (c.body as { manifest: Record<string, { hash: string }> }).manifest;
        return { json: { success: true, result: { jwt: 'upload-jwt', buckets: [[manifest['/index.html']!.hash]] } } };
      }
      if (c.url.includes('/workers/assets/upload'))
        return { status: 201, json: { success: true, result: { jwt: 'completion-jwt' } } };
      if (c.url.endsWith('/workers/subdomain')) return { json: { success: true, result: { subdomain: 'meinkonto' } } };
      return { json: { success: true, result: { id: 'script', etag: 'etag-1' } } };
    });
    const cf = new CloudflareHosting({ apiToken: 'tok', accountId: 'acc', formOrigin: 'https://app.example.de' }, fn);
    const res = await cf.deploy('wbm-test', [
      { path: 'index.html', content: '<h1>Hallo</h1>', contentType: 'text/html' },
      { path: 'robots.txt', content: 'User-agent: *', contentType: 'text/plain' },
    ]);
    expect(res).toEqual({ deploymentId: 'etag-1', url: 'https://wbm-test.meinkonto.workers.dev/' });
    const session = calls[0]!;
    expect(session.url).toBe('https://api.cloudflare.com/client/v4/accounts/acc/workers/scripts/wbm-test/assets-upload-session');
    const manifest = (session.body as { manifest: Record<string, { hash: string; size: number }> }).manifest;
    expect(manifest['/index.html']).toEqual({ hash: assetHash(Buffer.from('<h1>Hallo</h1>'), '/index.html'), size: 14 });
    expect(manifest['/index.html']!.hash).toMatch(/^[0-9a-f]{32}$/);
    const upload = calls.find((c) => c.url.includes('/workers/assets/upload'))!;
    expect(upload.url).toContain('base64=true');
    expect(upload.headers.authorization).toBe('Bearer upload-jwt');
    const put = calls.find((c) => c.method === 'PUT' && c.url.endsWith('/workers/scripts/wbm-test'))!;
    const form = put.body as FormData;
    const meta = JSON.parse(await (form.get('metadata') as Blob).text());
    expect(meta).toMatchObject({
      main_module: 'worker.js',
      assets: { jwt: 'completion-jwt' },
      bindings: [{ name: 'ASSETS', type: 'assets' }],
    });
    const code = await (form.get('worker.js') as Blob).text();
    expect(code).toContain('form-action https://app.example.de');
    expect(code).toContain('Strict-Transport-Security');
  });

  it('Domain: Zone anlegen, Nameserver liefern; aktiv erst nach Zonen-Aktivierung', async () => {
    let zoneStatus = 'pending';
    const { fn, calls } = fake((c) => {
      if (c.url.includes('/zones?name='))
        return {
          json: {
            success: true,
            result:
              zoneStatus === 'none'
                ? []
                : c.method === 'GET' && calls.filter((x) => x.url.includes('/zones?')).length === 1
                  ? []
                  : [{ id: 'z1', status: zoneStatus, name_servers: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'] }],
          },
        };
      if (c.url.endsWith('/zones') && c.method === 'POST')
        return {
          json: {
            success: true,
            result: { id: 'z1', status: 'pending', name_servers: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'] },
          },
        };
      if (c.url.endsWith('/workers/domains'))
        return zoneStatus === 'active'
          ? { json: { success: true, result: { id: 'd1' } } }
          : { status: 400, json: { success: false, errors: [{ code: 100117, message: 'zone not active' }] } };
      return { json: { success: true, result: {} } };
    });
    const cf = new CloudflareHosting({ apiToken: 'tok', accountId: 'acc', formOrigin: 'https://app.example.de' }, fn);
    const plan = await cf.attachDomain('wbm-test', 'frei-beispiel.de');
    expect(plan).toEqual({ nameservers: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'] });
    expect((await cf.getDomainStatus('wbm-test', 'frei-beispiel.de')).active).toBe(false);
    zoneStatus = 'active';
    expect((await cf.getDomainStatus('wbm-test', 'frei-beispiel.de')).active).toBe(true);
    const attaches = calls
      .filter((c) => c.url.endsWith('/workers/domains') && c.method === 'PUT')
      .map((c) => (c.body as { hostname: string }).hostname);
    expect(attaches).toContain('www.frei-beispiel.de');
  });
});

describe('Netlify', () => {
  it('Digest-Deploy lädt nur angeforderte Dateien hoch; Domain liefert DNS-Records', async () => {
    let polls = 0;
    const { fn, calls } = fake((c) => {
      if (c.url.includes('/sites?name=')) return { json: [] };
      if (c.url.endsWith('/sites') && c.method === 'POST')
        return { json: { id: 'site-1', name: 'wbm-abc', ssl_url: 'https://wbm-abc.netlify.app' } };
      if (c.url.endsWith('/sites/site-1/deploys') && c.method === 'POST') {
        const files = (c.body as { files: Record<string, string> }).files;
        return { json: { id: 'dep-1', required: [files['/index.html']] } };
      }
      if (c.url.includes('/deploys/dep-1/files/')) return { json: {} };
      if (c.url.endsWith('/sites/site-1/deploys/dep-1'))
        return { json: { state: ++polls > 1 ? 'ready' : 'processing', ssl_url: 'https://dep--wbm-abc.netlify.app' } };
      if (c.url.endsWith('/sites/site-1') && c.method === 'PATCH')
        return { json: { id: 'site-1', name: 'wbm-abc', custom_domain: 'frei-beispiel.de' } };
      return { json: {} };
    });
    const n = new NetlifyHosting({ apiToken: 'tok', formOrigin: 'https://app.example.de' }, fn, 1);
    const p = await n.ensureProject('wbm-abc');
    expect(p).toEqual({ projectId: 'site-1', defaultUrl: 'https://wbm-abc.netlify.app' });
    const d = await n.deploy('site-1', [
      { path: 'index.html', content: '<h1>x</h1>' },
      { path: 'robots.txt', content: 'User-agent: *' },
    ]);
    expect(d.deploymentId).toBe('dep-1');
    const uploads = calls.filter((c) => c.url.includes('/deploys/dep-1/files/'));
    expect(uploads.map((u) => u.url.split('/files')[1])).toEqual(['/index.html']);
    const digest = calls.find((c) => c.url.endsWith('/sites/site-1/deploys'))!.body as { files: Record<string, string> };
    expect(Object.keys(digest.files).sort()).toEqual(['/_headers', '/index.html', '/robots.txt']);
    const plan = await n.attachDomain('site-1', 'frei-beispiel.de');
    expect(plan.records).toEqual([
      { type: 'A', name: '@', value: '75.2.60.5' },
      { type: 'CNAME', name: 'www', value: 'wbm-abc.netlify.app' },
    ]);
  });
});
