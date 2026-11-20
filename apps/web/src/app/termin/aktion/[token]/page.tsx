import type { Metadata } from 'next';
import { bookingForBusiness, formatBookingTime, siteThemeFor } from '@wbm/core';
import { BookingShell } from '@/components/booking/booking-ui';

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
      <BookingShell company="Terminanfrage" theme={siteThemeFor('', '')}>
        <h1>Link ungültig</h1>
        <p className="bk-lead">Diese Terminanfrage gibt es nicht (mehr). Angaben werden 30 Tage nach dem Termin gelöscht.</p>
      </BookingShell>
    );
  const b = v.booking;
  const action = `/termin/aktion/${token}/entscheiden`;
  return (
    <BookingShell company={v.company} theme={v.theme}>
      {sp.ok && DONE[sp.ok] ? (
        <p role="status" className="bk-ok">
          {DONE[sp.ok]}
        </p>
      ) : null}
      {sp.fehler ? (
        <p role="alert" className="bk-alert">
          {FAIL[sp.fehler] ?? FAIL.not_found}
        </p>
      ) : null}
      <h1>{formatBookingTime(b.startsAt)} Uhr</h1>
      <p className="bk-lead">Status: {STATUS[b.status]}</p>
      <dl className="bk-dl">
        <dt>Dauer</dt>
        <dd>{Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60_000)} Minuten</dd>
        {b.service ? (
          <>
            <dt>Leistung</dt>
            <dd>{b.service}</dd>
          </>
        ) : null}
        <dt>Name</dt>
        <dd>{b.visitorName}</dd>
        <dt>Telefon</dt>
        <dd>{b.visitorPhone ? <a href={`tel:${b.visitorPhone.replace(/[^\d+]/g, '')}`}>{b.visitorPhone}</a> : '–'}</dd>
        <dt>E-Mail</dt>
        <dd>{b.visitorEmail ? <a href={`mailto:${b.visitorEmail}`}>{b.visitorEmail}</a> : '–'}</dd>
        {b.message ? (
          <>
            <dt>Grund</dt>
            <dd style={{ whiteSpace: 'pre-line' }}>{b.message}</dd>
          </>
        ) : null}
      </dl>
      {b.status === 'requested' ? (
        <div className="bk-two">
          <form method="post" action={action} className="bk-card bk-field">
            <input type="hidden" name="a" value="confirm" />
            <label htmlFor="n-ok">
              Hinweis an die Person <small>(optional)</small>
            </label>
            <textarea id="n-ok" name="note" rows={2} maxLength={500} placeholder="z. B. Bitte bei Müller klingeln" />
            <button type="submit" className="bk-btn">
              Termin bestätigen
            </button>
          </form>
          <form method="post" action={action} className="bk-card bk-field">
            <input type="hidden" name="a" value="decline" />
            <label htmlFor="n-no">Grund oder Alternative</label>
            <textarea id="n-no" name="note" rows={2} minLength={3} maxLength={500} required placeholder="z. B. Gern Donnerstag ab 14 Uhr" />
            <button type="submit" className="bk-btn alt">
              Ablehnen
            </button>
          </form>
        </div>
      ) : b.status === 'confirmed' ? (
        <form method="post" action={action} className="bk-card bk-field">
          <input type="hidden" name="a" value="cancel" />
          <label htmlFor="n-c">Termin doch absagen? Grund</label>
          <textarea id="n-c" name="note" rows={2} minLength={3} maxLength={500} required />
          <button type="submit" className="bk-btn alt">
            Termin absagen
          </button>
        </form>
      ) : null}
      <p className="bk-small">Anderen Termin vorschlagen: Antworten Sie einfach auf die E-Mail mit der Anfrage – die Antwort geht direkt an die Person.</p>
    </BookingShell>
  );
}
