import type { Metadata } from 'next';
import { confirmCheckoutReturn, errInfo, getConfig, logger, type ReturnState } from '@wbm/core';
import { PublicCard, PublicShell } from '@/components/public/shell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Vielen Dank', robots: { index: false, follow: false } };

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const { session_id: sessionId = '' } = await searchParams;
  const cfg = await getConfig();
  let res: ReturnState = { state: 'unknown' };
  try {
    res = await confirmCheckoutReturn(slug, sessionId);
  } catch (err) {
    // Der Webhook übernimmt die Verbuchung; hier nur Hinweis anzeigen
    logger.warn({ ...errInfo(err) }, 'Erfolgsseite: Abgleich fehlgeschlagen');
  }
  return (
    <PublicShell company={cfg.sender.company}>
      <PublicCard>
        {res.state === 'paid' ? (
          <>
            <h1 className="mb-3 text-2xl font-semibold">Vielen Dank für Ihre Bestellung!</h1>
            <p className="text-slate-700">
              Die Zahlung ist eingegangen{res.invoiceNumber ? ` (Rechnung ${res.invoiceNumber})` : ''}. Rechnung und
              Bestellbestätigung kommen in den nächsten Minuten per E-Mail.
            </p>
            <h2 className="mt-6 mb-2 text-lg font-semibold">Nächster Schritt: Ihre Angaben</h2>
            <p className="text-slate-700">
              Für Impressum, Leistungen, Öffnungszeiten und gegebenenfalls Logo und Fotos brauchen wir noch ein paar Angaben – das
              dauert etwa 10 Minuten. Den Link finden Sie auch in der E-Mail.
            </p>
            {res.customerToken ? (
              <a href={`/onboarding/${res.customerToken}`} className="btn-site btn-primary mt-5">
                Jetzt Angaben eintragen
              </a>
            ) : null}
          </>
        ) : res.state === 'processing' ? (
          <>
            <h1 className="mb-3 text-2xl font-semibold">Danke – Ihre Zahlung wird bearbeitet</h1>
            <p className="text-slate-700">
              Bei Lastschrift oder Überweisung dauert die Bestätigung ein paar Tage. Sobald die Zahlung eingegangen ist, schicken
              wir Ihnen Rechnung und den Link für Ihre Angaben per E-Mail.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-3 text-2xl font-semibold">Zahlung noch nicht bestätigt</h1>
            <p className="text-slate-700">
              Wir konnten die Zahlung gerade noch nicht bestätigen. Wenn Sie bezahlt haben, erhalten Sie in Kürze eine E-Mail.
              Andernfalls können Sie die Bestellung{' '}
              <a href={`/checkout/${slug}`} className="text-brand-700 underline">
                erneut abschließen
              </a>
              . Fragen: {cfg.sender.email}
            </p>
          </>
        )}
      </PublicCard>
    </PublicShell>
  );
}
