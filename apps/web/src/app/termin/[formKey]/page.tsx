import type { Metadata } from 'next';
import { bookingSlotsFor, findBookingSite, siteThemeFor } from '@wbm/core';
import { BookingForm, BookingShell } from '@/components/booking/booking-ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Termin anfragen', robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  taken: 'Diese Zeit wurde gerade vergeben. Bitte wählen Sie eine andere Zeit.',
  invalid: 'Bitte wählen Sie eine Zeit, geben Sie Name, Telefon, E-Mail und den Grund des Termins an und bestätigen Sie den Datenschutzhinweis.',
  rate_limited: 'Sie haben in kurzer Zeit mehrere Anfragen gesendet. Bitte versuchen Sie es später erneut.',
  unavailable: 'Die Anfrage konnte gerade nicht zugestellt werden. Bitte versuchen Sie es später erneut oder rufen Sie den Betrieb an.',
};

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ formKey: string }>;
  searchParams: Promise<{ fehler?: string }>;
}) {
  const { formKey } = await params;
  const { fehler } = await searchParams;
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
    <BookingShell company={b.company} theme={siteThemeFor(b.site.templateId, b.company)} websiteUrl={b.websiteUrl}>
      <h1>Termin anfragen</h1>
      <p className="bk-lead">Wählen Sie Tag und Uhrzeit. {b.company} bestätigt den Termin per E-Mail.</p>
      <BookingForm
        action={`/termin/${formKey}/senden`}
        days={days}
        services={b.services}
        slotMinutes={b.cfg.slotMinutes}
        privacyUrl={b.privacyUrl}
        error={fehler ? (ERRORS[fehler] ?? ERRORS.invalid) : null}
      />
    </BookingShell>
  );
}
