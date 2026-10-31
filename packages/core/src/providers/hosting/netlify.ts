import { createHash } from 'node:crypto';
import { sleep } from '../../util/time';
import { HttpError, withRetry } from '../../util/retry';
import type { DnsPlan, HostingDomainStatus, HostingProvider, SiteFile } from '../types';

/**
 * Netlify API (geprüft 23.10.2026, docs.netlify.com „Get started with the API“):
 * Basis https://api.netlify.com/api/v1/, Bearer-Token. Deploy per Datei-Digest (SHA1 je Pfad),
 * danach nur die angeforderten Dateien hochladen (PUT /deploys/{id}/files/{pfad}).
 * Eigene Domain: PATCH /sites/{id} {custom_domain}; externes DNS: Apex A 75.2.60.5, www CNAME {site}.netlify.app;
 * SSL-Status: GET /sites/{id}/ssl; POST nur zur erstmaligen Bereitstellung (API erneut geprüft 31.10.2026).
 * Pretty URLs vor Upload deaktivieren: Der veröffentlichte HTML-Stand muss dem gespeicherten entsprechen.
 * Limit: 3 Deploys pro Minute, 100 pro Tag.
 */
const API = 'https://api.netlify.com/api/v1';
export const NETLIFY_APEX_IP = '75.2.60.5';

export interface NetlifyConfig {
  apiToken: string;
  formOrigin: string;
}

interface NetlifySite {
  id: string;
  name: string;
  ssl_url?: string;
  url?: string;
  custom_domain?: string | null;
  ssl?: boolean;
}

interface NetlifyCertificate {
  state?: string;
  domains?: string[];
  expires_at?: string;
}

export function netlifyHeadersFile(formOrigin: string): string {
  return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'unsafe-inline'; script-src 'none'; form-action ${formOrigin}; base-uri 'none'; frame-ancestors 'none'
`;
}

export class NetlifyHosting implements HostingProvider {
  readonly name = 'netlify';

  constructor(
    private readonly cfg: NetlifyConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly pollMs = 2_000,
  ) {}

  private async api<T>(method: string, p: string, body?: unknown, raw?: { data: Buffer; contentType: string }): Promise<T> {
    return withRetry(
      async () => {
        const res = await this.fetchImpl(`${API}${p}`, {
          method,
          headers: {
            authorization: `Bearer ${this.cfg.apiToken}`,
            'user-agent': 'WebsiteBriefMaschine/0.1',
            ...(raw ? { 'content-type': raw.contentType } : body !== undefined ? { 'content-type': 'application/json' } : {}),
          },
          body: raw ? new Uint8Array(raw.data) : body !== undefined ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(120_000),
        });
        const text = await res.text();
        if (!res.ok)
          throw new HttpError(`Netlify ${method} ${p.split('?')[0]} HTTP ${res.status}`, res.status, text.slice(0, 500));
        return (text ? JSON.parse(text) : {}) as T;
      },
      { retries: 3, baseDelayMs: 2_000 },
    );
  }

  async ensureProject(name: string): Promise<{ projectId: string; defaultUrl: string }> {
    const siteName = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .slice(0, 60);
    const found = await this.api<NetlifySite[]>('GET', `/sites?name=${encodeURIComponent(siteName)}&filter=all`);
    const site = found.find((s) => s.name === siteName) ?? (await this.api<NetlifySite>('POST', '/sites', { name: siteName }));
    return { projectId: site.id, defaultUrl: site.ssl_url ?? `https://${site.name}.netlify.app/` };
  }

  async deploy(projectId: string, files: SiteFile[]): Promise<{ deploymentId: string; url: string }> {
    // Netlify's Pretty URLs rewrites HTML anchors after upload, breaking the exact publication proof.
    // Apply before creating the deploy, including projects created by earlier worker versions.
    await this.api('PATCH', `/sites/${projectId}`, { processing_settings: { html: { pretty_urls: false } } });
    const all = [...files, { path: '_headers', content: netlifyHeadersFile(this.cfg.formOrigin), contentType: 'text/plain' }].map(
      (f) => {
        const content = Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content, 'utf8');
        const p = `/${f.path.replace(/^\//, '')}`;
        return { path: p, content, sha: createHash('sha1').update(content).digest('hex') };
      },
    );
    const deploy = await this.api<{ id: string; required?: string[]; ssl_url?: string; deploy_ssl_url?: string }>(
      'POST',
      `/sites/${projectId}/deploys`,
      {
        files: Object.fromEntries(all.map((f) => [f.path, f.sha])),
      },
    );
    const required = new Set(deploy.required ?? []);
    for (const f of all) {
      if (!required.has(f.sha)) continue;
      required.delete(f.sha);
      const encoded = f.path.split('/').map(encodeURIComponent).join('/');
      await this.api('PUT', `/deploys/${deploy.id}/files${encoded}`, undefined, {
        data: f.content,
        contentType: 'application/octet-stream',
      });
    }
    for (let i = 0; i < 60; i++) {
      const d = await this.api<{ state: string; ssl_url?: string; error_message?: string }>(
        'GET',
        `/sites/${projectId}/deploys/${deploy.id}`,
      );
      if (d.state === 'ready') return { deploymentId: deploy.id, url: d.ssl_url ?? deploy.ssl_url ?? '' };
      if (d.state === 'error') throw new Error(`Netlify-Deploy fehlgeschlagen: ${d.error_message ?? 'unbekannt'}`);
      await sleep(this.pollMs);
    }
    throw new Error('Netlify-Deploy nicht rechtzeitig fertig');
  }

  async attachDomain(projectId: string, domain: string): Promise<DnsPlan> {
    const site = await this.api<NetlifySite>('PATCH', `/sites/${projectId}`, {
      custom_domain: domain,
      domain_aliases: [`www.${domain}`],
    });
    return {
      records: [
        { type: 'A', name: '@', value: NETLIFY_APEX_IP },
        { type: 'CNAME', name: 'www', value: `${site.name}.netlify.app` },
      ],
    };
  }

  async getDomainStatus(projectId: string, domain: string): Promise<HostingDomainStatus> {
    const site = await this.api<NetlifySite>('GET', `/sites/${projectId}`);
    if (site.custom_domain !== domain) return { domain, active: false, ssl: 'unknown', details: 'Domain nicht am Projekt' };
    let certificate: NetlifyCertificate;
    try {
      certificate = await this.api<NetlifyCertificate>('GET', `/sites/${projectId}/ssl`);
    } catch (err) {
      // Existing Let's Encrypt certificates must be read, not re-created: POST then returns 422.
      // Authentication, rate-limit and upstream errors must not be disguised as pending DNS.
      if (!(err instanceof HttpError) || err.status !== 404) throw err;
      try {
        await this.api('POST', `/sites/${projectId}/ssl`);
      } catch (provisionError) {
        if (!(provisionError instanceof HttpError) || provisionError.status !== 422) throw provisionError;
        return { domain, active: false, ssl: 'pending', details: 'SSL-Bereitstellung noch offen (HTTP 422)' };
      }
      // A successful provisioning request alone does not prove an issued certificate.
      return { domain, active: false, ssl: 'pending', details: 'SSL angefordert; Ausstellung noch nicht bestätigt' };
    }
    const covered = certificate.domains?.some((name) => {
      const candidate = name.toLowerCase(),
        host = domain.toLowerCase();
      return candidate === host || (candidate.startsWith('*.') && host.slice(host.indexOf('.') + 1) === candidate.slice(2));
    });
    if (
      certificate.state !== 'issued' ||
      !covered ||
      !certificate.expires_at ||
      !(Date.parse(certificate.expires_at) > Date.now())
    )
      return { domain, active: false, ssl: 'pending', details: 'Ausgestelltes, gültiges SSL für diese Domain fehlt' };
    return { domain, active: true, ssl: 'active' };
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.api('DELETE', `/sites/${projectId}`);
  }
}
