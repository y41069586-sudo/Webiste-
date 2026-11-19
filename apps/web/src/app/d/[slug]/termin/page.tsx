import type { Metadata } from 'next';
import { findPublicDemo, openSlots, openingHoursToDays, siteThemeFor, type OnboardingDay } from '@wbm/core';
import { BookingForm, BookingShell } from '@/components/booking/booking-ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Termin anfragen (Vorschau)', robots: { index: false, follow: false } };

/**
 * Vorschau der Online-Terminwahl im Entwurf: gleiche Oberfläche und Gestaltung wie nach dem Kauf, aber Absenden gesperrt –
 * es wird nichts gebucht oder versendet. Zeiten aus den öffentlichen Öffnungszeiten, sonst gekennzeichnete Beispielzeiten.
 */
export default async function DemoBookingPreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok')
    return (
      <BookingShell company="Entwurf" theme={siteThemeFor('', '')}>
        <h1>Dieser Entwurf ist nicht mehr verfügbar</h1>
      </BookingShell>
    );
  const lead = found.lead;
  let days: OnboardingDay[] = openingHoursToDays(lead.openingHours);
  const known = days.some((d) => !d.closed);
  if (!known)
    days = days.map((d) => ({ ...d, closed: d.day === 0 || d.day === 6, open: '08:00', close: '16:00', open2: '', close2: '' }));
  const content = found.demo.contentJson as { services?: { title?: string }[] } | null;
  const services = (content?.services ?? []).map((s) => String(s.title ?? '').trim()).filter(Boolean).slice(0, 8);
  const slots = openSlots({ slotMinutes: 60, days }, []);
  return (
    <BookingShell
      company={lead.businessName}
      theme={siteThemeFor(found.demo.templateId, lead.businessName)}
      websiteUrl={`/d/${slug}`}
      backLabel="Zum Entwurf"
    >
      <p role="note" className="bk-note">
        <strong>Vorschau:</strong> So wählen Ihre Kunden später einen Termin – im Entwurf wird nichts gebucht.
        {known ? ' Die Zeiten richten sich nach Ihren Öffnungszeiten.' : ' Beispielzeiten Mo–Fr 8–16 Uhr, später Ihre Öffnungszeiten.'}
      </p>
      <h1>Termin anfragen</h1>
      <p className="bk-lead">Wählen Sie Tag und Uhrzeit. {lead.businessName} bestätigt den Termin per E-Mail.</p>
      <BookingForm action="#" days={slots} services={services} slotMinutes={60} privacyUrl={null} preview />
    </BookingShell>
  );
}
