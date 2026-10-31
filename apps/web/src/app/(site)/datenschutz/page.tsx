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
      markdown={
        (cfg.legal.privacyMarkdown || legalDrafts(cfg).privacyMarkdown) +
        `

## Unverbindliche Website-Einrichtung vor der Bestellung

Wenn Sie Ihre Website einrichten, speichern wir die von Ihnen eingegebenen Betriebs- und Kontaktdaten, Inhalte, rechtlichen Texte, Wunschdomain und hochgeladenen Bilder, um Ihre angefragte Einrichtung vorzubereiten (Art. 6 Abs. 1 Buchst. b DSGVO). Ohne Ihre abschließende Bestellung erfolgen keine Zahlung, Domainregistrierung oder Veröffentlichung. Die Zusammenfassung zeigt vor der Zahlung Umfang und Kosten.

Ein technisch erforderliches, zufälliges Sitzungscookie ermöglicht den privaten Zugriff auf Ihren Entwurf im selben Browser für höchstens sieben Tage. Es dient nicht der Werbung oder Reichweitenmessung. Die zugehörigen Daten liegen im bestehenden geschützten Anwendungs- und Dateispeicher; an Stripe werden erst beim Wechsel zur Zahlung die benötigten Bestelldaten übergeben. Unbezahlte Entwürfe werden nach Ablauf beim regelmäßigen Löschlauf entfernt. Bei einer laufenden Zahlungsabwicklung bleibt der zugehörige Bestellstand bis zu deren Klärung erhalten; bei einem Kauf gelten die Aufbewahrungsfristen für Vertrag und Rechnung. Für Auskunft und Löschung können Sie die oben genannten Kontaktangaben nutzen.
`
      }
      placeholder={`Die Datenschutzerklärung wird vom Betreiber in den Einstellungen hinterlegt. Bis dahin erreichen Sie uns für Auskunft, Widerspruch oder Löschung unter ${cfg.sender.email}.`}
    />
  );
}
