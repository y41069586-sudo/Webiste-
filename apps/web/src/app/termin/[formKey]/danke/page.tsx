import type { Metadata } from 'next';
import { findBookingSite, formatBookingTime } from '@wbm/core';
import { BookingShell, Card } from '@/components/booking/booking-ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Terminanfrage gesendet', robots: { index: false, follow: false } };

export default async function BookingThanks({
  params,
  searchParams,
}: {
  params: Promise<{ formKey: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { formKey } = await params;
  const { t } = await searchParams;
  const b = await findBookingSite(formKey);
  const when = t && !Number.isNaN(new Date(t).getTime()) ? formatBookingTime(new Date(t)) : null;
  const company = b?.company ?? 'Terminanfrage';
  return (
    <BookingShell company={company} footer={b?.websiteUrl ? <p><a className="underline" href={b.websiteUrl}>Zurück zur Website</a></p> : null}>
      <Card>
        <h1 className="mb-3 text-2xl font-semibold sm:text-3xl">Anfrage gesendet</h1>
        <p className="mb-3 text-lg">{when ? `Ihre Anfrage für ${when} Uhr ist eingegangen.` : 'Ihre Terminanfrage ist eingegangen.'}</p>
        <ol className="list-decimal space-y-2 pl-5 text-[#33342f]">
          <li>Sie erhalten gleich eine E-Mail mit Ihrer Anfrage.</li>
          <li>{company} bestätigt oder sagt ab – Sie bekommen dazu eine zweite E-Mail.</li>
          <li>Erst mit der Bestätigung ist der Termin verbindlich. Ohne Antwort innerhalb von 48 Stunden verfällt die Anfrage.</li>
        </ol>
      </Card>
    </BookingShell>
  );
}
