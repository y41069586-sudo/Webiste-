import type { Metadata } from 'next';
import { customerByToken, formatDateLongDe, formatEuro, getConfig } from '@wbm/core';
import { PublicCard, PublicShell } from '@/components/public/shell';
import { SubscribeButton } from './subscribe-button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Hosting verlängern', robots: { index: false, follow: false } };

export default async function RenewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erfolg?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const cfg = await getConfig();
  const c = await customerByToken(token);
  return (
    <PublicShell company={cfg.sender.company}>
      <PublicCard>
        {!c ? (
          <>
            <h1 className="mb-2 text-2xl font-semibold">Link ungültig</h1>
            <p className="text-slate-700">Fragen? {cfg.sender.email}</p>
          </>
        ) : sp.erfolg || c.subscriptionId ? (
          <>
            <h1 className="mb-2 text-2xl font-semibold">Vielen Dank – Ihr Hosting läuft weiter</h1>
            <p className="text-slate-700">
              „{cfg.pricing.subscriptionName}“ ist gebucht. Die erste Abbuchung erfolgt erst nach Ablauf des inklusiven Zeitraums.
              Sie können monatlich kündigen.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold">
              {cfg.pricing.subscriptionName} für {c.domain ?? c.company}
            </h1>
            <p className="text-slate-700">
              Ihr inklusives Hosting läuft {c.hostingUntil ? `am ${formatDateLongDe(c.hostingUntil)}` : 'bald'} aus. Damit Ihre
              Website online bleibt: {formatEuro(cfg.pricing.subscriptionCents)} pro Monat, monatlich kündbar. Die erste Abbuchung
              erfolgt erst nach Ablauf des inklusiven Zeitraums.
            </p>
            {cfg.pricing.subscriptionEnabled ? (
              <SubscribeButton token={token} label="Weiter zur Zahlung" />
            ) : (
              <p className="mt-4 text-slate-700">
                Antworten Sie einfach auf unsere Erinnerungs-E-Mail oder schreiben Sie an {cfg.sender.email} – wir verlängern dann
                für Sie.
              </p>
            )}
          </>
        )}
      </PublicCard>
    </PublicShell>
  );
}
