import type { Metadata } from 'next';
import { findPublicDemo, openSlots, openingHoursToDays, type OnboardingDay } from '@wbm/core';
import { BookingForm, BookingShell, Card } from '@/components/booking/booking-ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Termin anfragen (Vorschau)', robots: { index: false, follow: false } };

/**
 * Vorschau der Online-Terminwahl im Entwurf: gleiche Oberfläche wie nach dem Kauf, aber gesperrt – es wird nichts
 * gebucht oder versendet. Zeiten aus den öffentlichen Öffnungszeiten, sonst gekennzeichnete Beispielzeiten.
 */
export default async function DemoBookingPreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok')
    return (
      <BookingShell company="Entwurf">
        <Card>
          <h1 className="mb-2 text-2xl font-semibold">Dieser Entwurf ist nicht mehr verfügbar</h1>
        </Card>
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
      footer={
        <p>
          <a className="underline" href={`/d/${slug}`}>
            Zurück zum Entwurf
          </a>
        </p>
      }
    >
      <p role="note" className="mb-5 rounded-md border-l-4 border-[#1b1c1e] bg-white px-4 py-3">
        <strong>Vorschau:</strong> So wählen Ihre Kunden später einen Termin. Im Entwurf wird nichts gebucht oder versendet.
        {known ? ' Die Zeiten richten sich nach Ihren Öffnungszeiten.' : ' Die Zeiten sind Beispiele (Mo–Fr 8–16 Uhr) und werden an Ihre Öffnungszeiten angepasst.'}{' '}
        Jede Anfrage kommt per E-Mail bei Ihnen an; Sie bestätigen oder lehnen mit einem Klick ab.
      </p>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold sm:text-3xl">Termin anfragen</h1>
        <p className="mb-6 text-[#55554f]">Wählen Sie eine freie Zeit. {lead.businessName} bestätigt den Termin per E-Mail.</p>
        <BookingForm action="#" days={slots} services={services} slotMinutes={60} privacyUrl={null} preview />
      </Card>
    </BookingShell>
  );
}
