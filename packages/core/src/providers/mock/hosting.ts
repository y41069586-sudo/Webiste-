import { appUrl } from '../../config/env';
import type { DnsPlan, HostingDomainStatus, HostingProvider, SiteFile, StorageProvider } from '../types';

/**
 * Simuliertes Hosting: legt die Dateien im Storage ab. Die Web-App liefert sie unter
 * /_mock-hosting/{projectId}/ aus, damit Go-Live lokal end-to-end testbar ist.
 */
export class MockHosting implements HostingProvider {
  readonly name = 'mock';
  constructor(private readonly storage: StorageProvider) {}

  async ensureProject(name: string): Promise<{ projectId: string; defaultUrl: string }> {
    const projectId = name.replace(/[^a-z0-9-]/g, '-').slice(0, 58);
    return { projectId, defaultUrl: appUrl(`/_mock-hosting/${projectId}/`) };
  }

  async deploy(projectId: string, files: SiteFile[]): Promise<{ deploymentId: string; url: string }> {
    await this.storage.deletePrefix(`mock-hosting/${projectId}/`);
    for (const f of files) {
      await this.storage.put(`mock-hosting/${projectId}/${f.path.replace(/^\//, '')}`, f.content, f.contentType);
    }
    return { deploymentId: `dep_${Date.now()}`, url: appUrl(`/_mock-hosting/${projectId}/`) };
  }

  async attachDomain(projectId: string, domain: string): Promise<DnsPlan> {
    void domain;
    return {
      records: [
        { type: 'ALIAS', name: '@', value: `${projectId}.mock-hosting.local` },
        { type: 'CNAME', name: 'www', value: `${projectId}.mock-hosting.local` },
      ],
    };
  }

  async getDomainStatus(projectId: string, domain: string): Promise<HostingDomainStatus> {
    void projectId;
    return { domain, active: true, ssl: 'active' };
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.storage.deletePrefix(`mock-hosting/${projectId}/`);
  }
}
