import type { Metadata } from 'next';
import { bookingForBusiness, formatBookingTime } from '@wbm/core';
import { BookingShell, Card } from '@/components/booking/booking-ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Terminanfrage', robots: { index: false, follow: false }, referrer: 'no-referrer' };

const STATUS: Record<string, string> = {
  requested: 'Offen – wartet auf Ihre Entscheidung',
  confirmed: 'Bestätigt',
  declined: 'Abgelehnt',
  cancelled: 'Abgesagt',
  expired: 'Verfallen (keine Entscheidung innerhalb von 48 Stunden)',
};
const DONE: Record<string, string> = {
  confirmed: 'Termin bestätigt. Die Person hat eine Bestätigung mit Kalenderdatei erhalten.',
  declined: 'Anfrage abgelehnt. Die Person wurde informiert, die Zeit ist wieder frei.',
  cancelled: 'Termin abgesagt. Die Person wurde informiert, die Zeit ist wieder frei.',
};
const FAIL: Record<string, string> = {
  not_open: 'Diese Anfrage ist bereits erledigt.',
  expired: 'Die Anfrage ist verfallen (48 Stunden ohne Entscheidung). Die Person wurde informiert.',
  past: 'Der Termin liegt in der Vergangenheit.',
  not_found: 'Diese Anfrage gibt es nicht (mehr).',
  reason_required: 'Bitte geben Sie einen Grund an – die Person erhält ihn mit der Absage.',
};

const btn = 'min-h-12 rounded-md px-6 py-3 text-base font-semibold';
const input = 'block w-full rounded-md border border-[#8a8a84] bg-white px-3 py-2.5 text-base';

/** Aktionsseite für den Betrieb (Link aus der E-Mail). Entscheidungen nur per Knopf (POST). */
export default async function BookingAction({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string; fehler?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const v = await bookingForBusiness(token);
  if (!v)
    return (
      <BookingShell company="Terminanfrage">
        <Card>
          <h1 className="mb-2 text-2xl font-semibold">Link ungültig</h1>
          <p>Diese Terminanfrage gibt es nicht (mehr). Angaben werden 30 Tage nach dem Termin gelöscht.</p>
        </Card>
      </BookingShell>
    );
  const b = v.booking;
  const action = `/termin/aktion/${token}/entscheiden`;
  return (
    <BookingShell company={v.company}>
      <Card>
        {sp.ok && DONE[sp.ok] ? (
          <p role="status" className="mb-5 rounded-md border border-[#1f7a4a] bg-[#eef8f2] px-4 py-3 text-[#14532d]">{DONE[sp.ok]}</p>
        ) : null}
        {sp.fehler ? (
          <p role="alert" className="mb-5 rounded-md border border-[#b3261e] bg-[#fdf1f0] px-4 py-3 text-[#7a1712]">{FAIL[sp.fehler] ?? FAIL.not_found}</p>
        ) : null}
        <h1 className="mb-1 text-2xl font-semibold sm:text-3xl">{formatBookingTime(b.startsAt)} Uhr</h1>
        <p className="mb-5 text-[#55554f]">Status: {STATUS[b.status]}</p>
        <dl className="mb-6 grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
          <dt className="font-medium">Dauer</dt>
          <dd>{Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60_000)} Minuten</dd>
          {b.service ? (
            <>
              <dt className="font-medium">Leistung</dt>
              <dd>{b.service}</dd>
            </>
          ) : null}
          <dt className="font-medium">Name</dt>
          <dd>{b.visitorName}</dd>
          <dt className="font-medium">E-Mail</dt>
          <dd>{b.visitorEmail ? <a className="underline" href={`mailto:${b.visitorEmail}`}>{b.visitorEmail}</a> : '–'}</dd>
          {b.visitorPhone ? (
            <>
              <dt className="font-medium">Telefon</dt>
              <dd><a className="underline" href={`tel:${b.visitorPhone.replace(/[^\d+]/g, '')}`}>{b.visitorPhone}</a></dd>
            </>
          ) : null}
          {b.message ? (
            <>
              <dt className="font-medium">Nachricht</dt>
              <dd className="whitespace-pre-line">{b.message}</dd>
            </>
          ) : null}
        </dl>
        {b.status === 'requested' ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <form method="post" action={action} className="space-y-3 rounded-md border border-[#e2e2df] p-4">
              <input type="hidden" name="a" value="confirm" />
              <label htmlFor="n-ok" className="block font-medium">Hinweis an die Person <span className="font-normal text-[#55554f]">(optional)</span></label>
              <textarea id="n-ok" name="note" rows={2} maxLength={500} className={input} placeholder="z. B. Bitte klingeln Sie bei …" />
              <button type="submit" className={`${btn} w-full bg-[#1f7a4a] text-white hover:bg-[#17603a]`}>Termin bestätigen</button>
            </form>
            <form method="post" action={action} className="space-y-3 rounded-md border border-[#e2e2df] p-4">
              <input type="hidden" name="a" value="decline" />
              <label htmlFor="n-no" className="block font-medium">Grund oder Alternative</label>
              <textarea id="n-no" name="note" rows={2} minLength={3} maxLength={500} required className={input} placeholder="z. B. Gern am Donnerstag ab 14 Uhr" />
              <button type="submit" className={`${btn} w-full border-[1.5px] border-[#1b1c1e] bg-white text-[#1b1c1e] hover:bg-[#f1f1ee]`}>Ablehnen</button>
            </form>
          </div>
        ) : b.status === 'confirmed' ? (
          <form method="post" action={action} className="space-y-3 rounded-md border border-[#e2e2df] p-4">
            <input type="hidden" name="a" value="cancel" />
            <label htmlFor="n-c" className="block font-medium">Termin doch absagen? Grund</label>
            <textarea id="n-c" name="note" rows={2} minLength={3} maxLength={500} required className={input} />
            <button type="submit" className={`${btn} border-[1.5px] border-[#b3261e] bg-white text-[#b3261e] hover:bg-[#fdf1f0]`}>Termin absagen</button>
          </form>
        ) : null}
        <p className="mt-6 text-sm text-[#55554f]">
          Anderen Termin vorschlagen: Antworten Sie einfach auf die E-Mail mit der Anfrage – die Antwort geht direkt an die Person.
        </p>
      </Card>
    </BookingShell>
  );
}
