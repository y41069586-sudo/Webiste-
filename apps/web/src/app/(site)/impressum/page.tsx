import { legalDrafts } from '@/lib/legal-drafts';
import { getSiteConfig } from '@/lib/site-config';
import { LegalPage } from '@/components/legal-page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Impressum' };

export default async function Page() {
  const cfg = await getSiteConfig();
  return (
    <LegalPage
      title="Impressum"
      markdown={cfg.legal.impressumMarkdown || legalDrafts(cfg).impressumMarkdown}
      placeholder={`${cfg.sender.company} · ${cfg.sender.name} · ${cfg.sender.street}, ${cfg.sender.postalCode} ${cfg.sender.city} · ${cfg.sender.email} · ${cfg.sender.phone}. Der vollständige Impressumstext wird vom Betreiber in den Einstellungen hinterlegt.`}
    />
  );
}
