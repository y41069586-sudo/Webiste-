import type { Metadata } from 'next';
import { demoTestSlots, findDemoTestBooking, findPublicDemo, openSlots, openingHoursToDays, siteThemeFor, type OnboardingDay } from '@wbm/core';
import { BookingForm, BookingShell } from '@/components/booking/booking-ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Termin anfragen (Vorschau)', robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  taken: 'Diese Zeit wurde gerade vergeben. Bitte wählen Sie eine andere Zeit.',
  invalid: 'Bitte wählen Sie eine Zeit, geben Sie Name, Telefon, E-Mail und den Grund des Termins an und bestätigen Sie den Datenschutzhinweis.',
  rate_limited: 'Zu viele Testanfragen in kurzer Zeit. Bitte später erneut versuchen.',
  unavailable: 'Die Anfrage konnte gerade nicht zugestellt werden. Bitte später erneut versuchen.',
};

/**
 * Terminwahl im Entwurf. Echte Betriebe: gesperrte Vorschau (nichts wird gebucht oder versendet).
 * Fiktive Testbetriebe (Lead-Quelle „mock“): Testlauf – Anfragen gehen an die eigene SeitenWerk-Adresse, damit der
 * ganze Ablauf (Anfrage → Bestätigen/Ablehnen → Bestätigung mit Kalenderdatei) geprüft werden kann.
 */
export default async function DemoBookingPreview({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fehler?: string }>;
}) {
  const { slug } = await params;
  const { fehler } = await searchParams;
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok')
    return (
      <BookingShell company="Entwurf" theme={siteThemeFor('', '')}>
        <h1>Dieser Entwurf ist nicht mehr verfügbar</h1>
      </BookingShell>
    );
  const lead = found.lead;
  const theme = siteThemeFor(found.demo.templateId, lead.businessName);
  const test = await findDemoTestBooking(slug);
  if (test) {
    const slots = await demoTestSlots(test);
    return (
      <BookingShell company={test.company} theme={theme} websiteUrl={`/d/${slug}`} backLabel="Zum Entwurf">
        <p role="note" className="bk-note">
          <strong>Testlauf:</strong> Dieser Entwurf gehört zu einem erfundenen Testbetrieb. Anfragen werden wirklich verschickt: die
          Mail „an den Betrieb“ geht an die SeitenWerk-Adresse, die Bestätigung an die E-Mail, die Sie unten eingeben.
        </p>
        <h1>Termin anfragen</h1>
        <p className="bk-lead">Wählen Sie Tag und Uhrzeit. {test.company} bestätigt den Termin per E-Mail.</p>
        <BookingForm
          action={`/d/${slug}/termin/senden`}
          days={slots}
          services={test.services}
          slotMinutes={test.cfg.slotMinutes}
          privacyUrl={null}
          error={fehler ? (ERRORS[fehler] ?? ERRORS.invalid) : null}
        />
      </BookingShell>
    );
  }
  let days: OnboardingDay[] = openingHoursToDays(lead.openingHours);
  const known = days.some((d) => !d.closed);
  if (!known)
    days = days.map((d) => ({ ...d, closed: d.day === 0 || d.day === 6, open: '08:00', close: '16:00', open2: '', close2: '' }));
  const content = found.demo.contentJson as { services?: { title?: string }[] } | null;
  const services = (content?.services ?? []).map((s) => String(s.title ?? '').trim()).filter(Boolean).slice(0, 8);
  const slots = openSlots({ slotMinutes: 60, days }, []);
  return (
    <BookingShell company={lead.businessName} theme={theme} websiteUrl={`/d/${slug}`} backLabel="Zum Entwurf">
      <p role="note" className="bk-note">
        <strong>Vorschau:</strong> So wählen Ihre Kunden später einen Termin – im Entwurf wird nichts gebucht.
        {known ? ' Die Zeiten richten sich nach Ihren Öffnungszeiten.' : ' Beispielzeiten Mo–Fr 8–16 Uhr, später Ihre Öffnungszeiten.'}
      </p>
      <h1>Termin anfragen</h1>
      <p className="bk-lead">Wählen Sie Tag und Uhrzeit. {lead.businessName} bestätigt den Termin per E-Mail.</p>
      <BookingForm action="#" days={slots} services={services} slotMinutes={60} privacyUrl={null} preview />
    </BookingShell>
  );
}
