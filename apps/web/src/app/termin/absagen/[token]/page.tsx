import type { Metadata } from 'next';
import { bookingForVisitor, formatBookingTime, siteThemeFor } from '@wbm/core';
import { BookingShell } from '@/components/booking/booking-ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Termin absagen', robots: { index: false, follow: false }, referrer: 'no-referrer' };

/** Absage durch die anfragende Person (Link aus ihrer E-Mail); Absage nur per Knopf (POST). */
export default async function CancelBooking({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string; fehler?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const v = await bookingForVisitor(token);
  if (!v)
    return (
      <BookingShell company="Termin" theme={siteThemeFor('', '')}>
        <h1>Link ungültig</h1>
        <p className="bk-lead">Diesen Termin gibt es nicht (mehr).</p>
      </BookingShell>
    );
  const b = v.booking;
  const open = (b.status === 'requested' || b.status === 'confirmed') && b.startsAt > new Date();
  return (
    <BookingShell company={v.company} theme={siteThemeFor(v.templateId, v.company)}>
      <h1>Termin am {formatBookingTime(b.startsAt)} Uhr</h1>
      {sp.ok || b.status === 'cancelled' ? (
        <p role="status" className="bk-ok">
          Der Termin ist abgesagt. {v.company} wurde informiert.
        </p>
      ) : sp.fehler || !open ? (
        <p className="bk-lead">Dieser Termin kann nicht mehr abgesagt werden. Bitte wenden Sie sich direkt an {v.company}.</p>
      ) : (
        <form method="post" action={`/termin/absagen/${token}/bestaetigen`}>
          <p className="bk-lead">Möchten Sie diesen Termin absagen? {v.company} wird per E-Mail informiert.</p>
          <button type="submit" className="bk-btn alt">
            Ja, Termin absagen
          </button>
        </form>
      )}
    </BookingShell>
  );
}
