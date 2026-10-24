import { getConfig } from '@wbm/core';
import { LegalPage } from '@/components/legal-page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Datenschutzerklärung' };

export default async function Page() {
  const cfg = await getConfig();
  return (
    <LegalPage
      title="Datenschutzerklärung"
      markdown={cfg.legal.privacyMarkdown}
      placeholder={`Die Datenschutzerklärung wird vom Betreiber in den Einstellungen hinterlegt. Bis dahin erreichen Sie uns für Auskunft, Widerspruch oder Löschung unter ${cfg.sender.email}.`}
    />
  );
}
