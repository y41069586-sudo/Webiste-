import { legalDrafts } from '@/lib/legal-drafts';
import { getSiteConfig } from '@/lib/site-config';
import { LegalPage } from '@/components/legal-page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Datenschutzerklärung' };

export default async function Page() {
  const cfg = await getSiteConfig();
  return (
    <LegalPage
      title="Datenschutzerklärung"
      markdown={cfg.legal.privacyMarkdown || legalDrafts(cfg).privacyMarkdown}
      placeholder={`Die Datenschutzerklärung wird vom Betreiber in den Einstellungen hinterlegt. Bis dahin erreichen Sie uns für Auskunft, Widerspruch oder Löschung unter ${cfg.sender.email}.`}
    />
  );
}
