import { getConfig } from '@wbm/core';
import { LegalPage } from '@/components/legal-page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Impressum' };

export default async function Page() {
  const cfg = await getConfig();
  return (
    <LegalPage
      title="Impressum"
      markdown={cfg.legal.impressumMarkdown}
      placeholder={`${cfg.sender.company} · ${cfg.sender.name} · ${cfg.sender.street}, ${cfg.sender.postalCode} ${cfg.sender.city} · ${cfg.sender.email} · ${cfg.sender.phone}. Der vollständige Impressumstext wird vom Betreiber in den Einstellungen hinterlegt.`}
    />
  );
}
