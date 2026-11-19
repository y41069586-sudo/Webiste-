import type { Metadata } from 'next';
import { bookingForVisitor, formatBookingTime } from '@wbm/core';
import { BookingShell, Card } from '@/components/booking/booking-ui';

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
      <BookingShell company="Termin">
        <Card>
          <h1 className="mb-2 text-2xl font-semibold">Link ungültig</h1>
          <p>Diesen Termin gibt es nicht (mehr).</p>
        </Card>
      </BookingShell>
    );
  const b = v.booking;
  const open = (b.status === 'requested' || b.status === 'confirmed') && b.startsAt > new Date();
  return (
    <BookingShell company={v.company}>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">Termin am {formatBookingTime(b.startsAt)} Uhr</h1>
        {sp.ok || b.status === 'cancelled' ? (
          <p role="status" className="text-lg">Der Termin ist abgesagt. {v.company} wurde informiert.</p>
        ) : sp.fehler || !open ? (
          <p>Dieser Termin kann nicht mehr abgesagt werden. Bitte wenden Sie sich direkt an {v.company}.</p>
        ) : (
          <form method="post" action={`/termin/absagen/${token}/bestaetigen`} className="mt-4 space-y-3">
            <p>Möchten Sie diesen Termin absagen? {v.company} wird per E-Mail informiert.</p>
            <button type="submit" className="min-h-12 rounded-md border-[1.5px] border-[#b3261e] bg-white px-6 py-3 font-semibold text-[#b3261e] hover:bg-[#fdf1f0]">
              Ja, Termin absagen
            </button>
          </form>
        )}
      </Card>
    </BookingShell>
  );
}
