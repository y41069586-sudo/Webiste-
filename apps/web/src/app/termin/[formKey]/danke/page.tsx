import type { Metadata } from 'next';
import { findBookingSite, formatBookingTime, siteThemeFor } from '@wbm/core';
import { BookingShell } from '@/components/booking/booking-ui';

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
    <BookingShell company={company} theme={b?.theme ?? siteThemeFor('', company)} websiteUrl={b?.websiteUrl}>
      <h1>Anfrage gesendet</h1>
      <p className="bk-lead">{when ? `Ihre Anfrage für ${when} Uhr ist eingegangen.` : 'Ihre Terminanfrage ist eingegangen.'}</p>
      <ol className="bk-card" style={{ paddingLeft: 40, margin: 0, display: 'grid', gap: 10 }}>
        <li>Sie erhalten gleich eine E-Mail mit Ihrer Anfrage.</li>
        <li>{company} bestätigt oder sagt ab – Sie bekommen dazu eine zweite E-Mail.</li>
        <li>Erst mit der Bestätigung ist der Termin verbindlich. Ohne Antwort innerhalb von 48 Stunden verfällt die Anfrage.</li>
      </ol>
    </BookingShell>
  );
}
