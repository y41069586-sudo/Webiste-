import { getConfig } from '@wbm/core';
import { LegalPage } from '@/components/legal-page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AGB' };

export default async function Page() {
  const cfg = await getConfig();
  return (
    <LegalPage
      title="Allgemeine Geschäftsbedingungen"
      markdown={cfg.legal.termsMarkdown}
      placeholder="Die AGB werden vom Betreiber in den Einstellungen hinterlegt (Platzhalter)."
    />
  );
}
