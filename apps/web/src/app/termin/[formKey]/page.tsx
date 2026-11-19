import type { Metadata } from 'next';
import { bookingSlotsFor, findBookingSite } from '@wbm/core';
import { BookingForm, BookingShell, Card } from '@/components/booking/booking-ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Termin anfragen', robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  taken: 'Diese Zeit wurde gerade vergeben. Bitte wählen Sie eine andere Zeit.',
  invalid: 'Bitte wählen Sie eine Zeit, geben Sie Name, E-Mail, Telefon und den Grund des Termins an und bestätigen Sie den Datenschutzhinweis.',
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
      <BookingShell company="Terminanfrage">
        <Card>
          <h1 className="mb-2 text-2xl font-semibold">Online-Terminwahl nicht verfügbar</h1>
          <p>Bitte nehmen Sie über die Website oder telefonisch Kontakt auf.</p>
        </Card>
      </BookingShell>
    );
  const days = await bookingSlotsFor(b);
  return (
    <BookingShell company={b.company} footer={b.websiteUrl ? <p><a className="underline" href={b.websiteUrl}>Zurück zur Website</a></p> : null}>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold sm:text-3xl">Termin anfragen</h1>
        <p className="mb-6 text-[#55554f]">Wählen Sie eine freie Zeit. {b.company} bestätigt den Termin per E-Mail.</p>
        <BookingForm
          action={`/termin/${formKey}/senden`}
          days={days}
          services={b.services}
          slotMinutes={b.cfg.slotMinutes}
          privacyUrl={b.privacyUrl}
          error={fehler ? (ERRORS[fehler] ?? ERRORS.invalid) : null}
        />
      </Card>
    </BookingShell>
  );
}
