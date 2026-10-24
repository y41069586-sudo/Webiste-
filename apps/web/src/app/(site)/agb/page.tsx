import { legalDrafts } from '@/lib/legal-drafts';
import { getSiteConfig } from '@/lib/site-config';
import { LegalPage } from '@/components/legal-page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AGB' };

export default async function Page() {
  const cfg = await getSiteConfig();
  return (
    <LegalPage
      title="Allgemeine Geschäftsbedingungen"
      markdown={cfg.legal.termsMarkdown || legalDrafts(cfg).termsMarkdown}
      placeholder="Die AGB werden vom Betreiber in den Einstellungen hinterlegt (Platzhalter)."
    />
  );
}
