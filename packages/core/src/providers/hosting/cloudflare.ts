import { createHash } from 'node:crypto';
import path from 'node:path';
import { HttpError, withRetry } from '../../util/retry';
import type { DnsPlan, HostingDomainStatus, HostingProvider, SiteFile } from '../types';

/**
 * Cloudflare Workers mit Static Assets (Direct Upload, geprüft 23.10.2026,
 * developers.cloudflare.com/workers/static-assets/direct-upload):
 * 1) POST …/workers/scripts/{name}/assets-upload-session {manifest: {"/pfad": {hash, size}}} → {jwt, buckets}
 * 2) POST …/workers/assets/upload?base64=true (Bearer = Upload-JWT, multipart, Feld = Hash) → Completion-JWT
 * 3) PUT …/workers/scripts/{name} (multipart: metadata + Modul) mit assets.jwt
 * Eigene Domain: Zone im Cloudflare-Konto (POST /zones) → Nameserver beim Registrar setzen →
 * PUT /accounts/{id}/workers/domains {hostname, service, zone_id} (Zertifikat automatisch).
 * Hinweis: Cloudflare Pages Direct Upload hat kein dokumentiertes Datei-Upload-Verfahren – daher Workers.
 */
const API = 'https://api.cloudflare.com/client/v4';
const COMPATIBILITY_DATE = '2025-09-01';

export interface CloudflareConfig {
  apiToken: string;
  accountId: string;
  /** Ursprung des Formular-Endpunkts (für die CSP der Kundenseiten), z. B. https://app.example.de */
  formOrigin: string;
}

interface CfEnvelope<T> {
  success: boolean;
  errors?: { code: number; message: string }[];
  result: T;
}

/** Hash wie im offiziellen Beispiel: SHA-256 über Base64-Inhalt + Dateiendung, erste 32 Hex-Zeichen. */
export function assetHash(content: Buffer, filePath: string): string {
  const ext = path.extname(filePath).slice(1);
  return createHash('sha256').update(content.toString('base64') + ext).digest('hex').slice(0, 32);
}

/** Worker vor den Assets: www → Apex, Sicherheits-Header. */
export function workerModule(formOrigin: string): string {
  const csp = `default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'none'; form-action ${formOrigin}; base-uri 'none'; frame-ancestors 'none'`;
  return `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    const res = await env.ASSETS.fetch(request);
    const h = new Headers(res.headers);
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    h.set('X-Frame-Options', 'SAMEORIGIN');
    h.set('Strict-Transport-Security', 'max-age=31536000');
    h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    h.set('Content-Security-Policy', ${JSON.stringify(csp)});
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  },
};
`;
}

export class CloudflareHosting implements HostingProvider {
  readonly name = 'cloudflare';

  constructor(
    private readonly cfg: CloudflareConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async api<T>(method: string, p: string, body?: unknown, opts: { token?: string; form?: FormData; okCodes?: number[] } = {}): Promise<T> {
    return withRetry(
      async () => {
        const res = await this.fetchImpl(`${API}${p}`, {
          method,
          headers: {
            authorization: `Bearer ${opts.token ?? this.cfg.apiToken}`,
            ...(opts.form ? {} : body !== undefined ? { 'content-type': 'application/json' } : {}),
          },
          body: opts.form ?? (body !== undefined ? JSON.stringify(body) : undefined),
          signal: AbortSignal.timeout(120_000),
        });
        const text = await res.text();
        const json = (text ? JSON.parse(text) : {}) as CfEnvelope<T> & { result?: T };
        if (!res.ok || json.success === false) {
          const msg = (json.errors ?? []).map((e) => `${e.code} ${e.message}`).join('; ');
          throw new HttpError(`Cloudflare ${method} ${p.split('?')[0]} HTTP ${res.status}: ${msg}`, res.status, text.slice(0, 500));
        }
        return json.result as T;
      },
      { retries: 3, baseDelayMs: 1_000 },
    );
  }

  private acc(p: string): string {
    return `/accounts/${encodeURIComponent(this.cfg.accountId)}${p}`;
  }

  private scriptName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 63)
      .replace(/^-|-$/g, '');
  }

  async ensureProject(name: string): Promise<{ projectId: string; defaultUrl: string }> {
    const projectId = this.scriptName(name);
    let defaultUrl = '';
    try {
      const sub = await this.api<{ subdomain: string }>('GET', this.acc('/workers/subdomain'));
      defaultUrl = `https://${projectId}.${sub.subdomain}.workers.dev/`;
    } catch {
      // workers.dev-Subdomain nicht eingerichtet – nur eigene Domain
    }
    return { projectId, defaultUrl };
  }

  async deploy(projectId: string, files: SiteFile[]): Promise<{ deploymentId: string; url: string }> {
    const entries = files.map((f) => {
      const content = Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content, 'utf8');
      const p = `/${f.path.replace(/^\//, '')}`;
      return { path: p, content, hash: assetHash(content, p), contentType: f.contentType ?? 'application/octet-stream' };
    });
    const manifest = Object.fromEntries(entries.map((e) => [e.path, { hash: e.hash, size: e.content.length }]));
    const session = await this.api<{ jwt: string; buckets?: string[][] }>('POST', this.acc(`/workers/scripts/${projectId}/assets-upload-session`), { manifest });
    let completion = session.jwt;
    const byHash = new Map(entries.map((e) => [e.hash, e]));
    for (const bucket of session.buckets ?? []) {
      const form = new FormData();
      for (const h of bucket) {
        const e = byHash.get(h);
        if (!e) continue;
        form.append(h, new Blob([e.content.toString('base64')], { type: e.contentType }), h);
      }
      const r = await this.api<{ jwt?: string } | null>('POST', this.acc('/workers/assets/upload?base64=true'), undefined, { token: session.jwt, form });
      if (r?.jwt) completion = r.jwt;
    }
    const metadata = {
      main_module: 'worker.js',
      compatibility_date: COMPATIBILITY_DATE,
      assets: { jwt: completion, config: { html_handling: 'auto-trailing-slash', not_found_handling: '404-page' } },
      bindings: [{ name: 'ASSETS', type: 'assets' }],
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('worker.js', new Blob([workerModule(this.cfg.formOrigin)], { type: 'application/javascript+module' }), 'worker.js');
    const script = await this.api<{ id?: string; etag?: string }>('PUT', this.acc(`/workers/scripts/${projectId}`), undefined, { form });
    try {
      // workers.dev-Adresse aktivieren (für Prüfung vor der eigenen Domain)
      await this.api('POST', this.acc(`/workers/scripts/${projectId}/subdomain`), { enabled: true });
    } catch {
      // optional
    }
    const { defaultUrl } = await this.ensureProject(projectId);
    return { deploymentId: script.etag ?? script.id ?? `cf-${Date.now()}`, url: defaultUrl };
  }

  private async zone(domain: string): Promise<{ id: string; status: string; name_servers: string[] } | null> {
    const list = await this.api<{ id: string; status: string; name_servers: string[] }[]>(
      'GET',
      `/zones?name=${encodeURIComponent(domain)}&account.id=${encodeURIComponent(this.cfg.accountId)}`,
    );
    return list[0] ?? null;
  }

  private async attachHostnames(projectId: string, domain: string, zoneId: string): Promise<void> {
    for (const hostname of [domain, `www.${domain}`]) {
      await this.api('PUT', this.acc('/workers/domains'), { hostname, service: projectId, zone_id: zoneId });
    }
  }

  /** Zone anlegen (Nameserver gehen an den Registrar) und Hostnamen an den Worker binden. */
  async attachDomain(projectId: string, domain: string): Promise<DnsPlan> {
    const zone = (await this.zone(domain)) ?? (await this.api<{ id: string; status: string; name_servers: string[] }>('POST', '/zones', { name: domain, account: { id: this.cfg.accountId }, type: 'full' }));
    try {
      await this.attachHostnames(projectId, domain, zone.id);
    } catch {
      // Zone noch „pending“ → wird im Live-Check erneut versucht
    }
    return { nameservers: zone.name_servers };
  }

  async getDomainStatus(projectId: string, domain: string): Promise<HostingDomainStatus> {
    const zone = await this.zone(domain);
    if (!zone) return { domain, active: false, ssl: 'unknown', details: 'Zone fehlt' };
    if (zone.status !== 'active') return { domain, active: false, ssl: 'pending', details: `Zone ${zone.status} – Nameserver noch nicht übernommen` };
    try {
      await this.attachHostnames(projectId, domain, zone.id);
    } catch (err) {
      return { domain, active: false, ssl: 'pending', details: err instanceof Error ? err.message.slice(0, 200) : 'Domain-Bindung fehlgeschlagen' };
    }
    return { domain, active: true, ssl: 'unknown' };
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.api('DELETE', this.acc(`/workers/scripts/${projectId}?force=true`));
  }
}
