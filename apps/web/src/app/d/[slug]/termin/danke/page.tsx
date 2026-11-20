import type { Metadata } from 'next';
import { findDemoTestBooking, formatBookingTime, siteThemeFor } from '@wbm/core';
import { BookingShell } from '@/components/booking/booking-ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Testanfrage gesendet', robots: { index: false, follow: false } };

export default async function DemoBookingThanks({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;
  const test = await findDemoTestBooking(slug);
  const when = t && !Number.isNaN(new Date(t).getTime()) ? formatBookingTime(new Date(t)) : null;
  const company = test?.company ?? 'Entwurf';
  return (
    <BookingShell company={company} theme={test?.theme ?? siteThemeFor('', company)} websiteUrl={`/d/${slug}`} backLabel="Zum Entwurf">
      <h1>Anfrage gesendet</h1>
      <p className="bk-lead">{when ? `Ihre Testanfrage für ${when} Uhr ist eingegangen.` : 'Ihre Testanfrage ist eingegangen.'}</p>
      <ol className="bk-card" style={{ paddingLeft: 40, margin: 0, display: 'grid', gap: 10 }}>
        <li>An die SeitenWerk-Adresse geht jetzt die Mail „Neue Terminanfrage“ – so, wie sie ein Betrieb bekommt.</li>
        <li>An Ihre eingegebene E-Mail geht die Eingangsbestätigung.</li>
        <li>Klicken Sie in der Betriebs-Mail auf „Termin bestätigen oder ablehnen“ – danach kommt die Bestätigung mit Kalenderdatei.</li>
      </ol>
    </BookingShell>
  );
}
