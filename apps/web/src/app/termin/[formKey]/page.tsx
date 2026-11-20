import type { Metadata } from 'next';
import { bookingSlotsFor, findBookingSite, siteThemeFor } from '@wbm/core';
import { BookingForm, BookingShell, bookingErrorText } from '@/components/booking/booking-ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Termin anfragen', robots: { index: false, follow: false } };


export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ formKey: string }>;
  searchParams: Promise<{ fehler?: string; feld?: string }>;
}) {
  const { formKey } = await params;
  const { fehler, feld } = await searchParams;
  const b = await findBookingSite(formKey);
  if (!b)
    return (
      <BookingShell company="Terminanfrage" theme={siteThemeFor('', '')}>
        <h1>Online-Terminwahl nicht verfügbar</h1>
        <p className="bk-lead">Bitte nehmen Sie über die Website oder telefonisch Kontakt auf.</p>
      </BookingShell>
    );
  const days = await bookingSlotsFor(b);
  return (
    <BookingShell company={b.company} theme={b.theme} websiteUrl={b.websiteUrl}>
      <h1>Termin anfragen</h1>
      <p className="bk-lead">Wählen Sie Tag und Uhrzeit. {b.company} bestätigt den Termin per E-Mail.</p>
      <BookingForm
        action={`/termin/${formKey}/senden`}
        days={days}
        services={b.services}
        slotMinutes={b.cfg.slotMinutes}
        privacyUrl={b.privacyUrl}
        error={bookingErrorText(fehler, feld)}
      />
    </BookingShell>
  );
}
