import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { appUrl, getCheckoutContext, getConfig, DEFAULT_CONFIG, publicOperatorSettings } from '@wbm/core';
import { PublicCard, PublicShell } from '@/components/public/shell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Website bestellen', robots: { index: false, follow: false } };

/**
 * Keine eigene Checkout-Seite mehr: bezahlt wird auf der Bezahlseite von Stripe. Diese Adresse bleibt
 * für ältere Links bestehen – mit gewählter Option direkt zu Stripe, sonst zurück zu den Preiskarten.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { slug } = await params;
  const { plan } = await searchParams;
  const ctx = await getCheckoutContext(slug);
  if (ctx.state === 'ok') {
    redirect(
      plan === 'one_time' || plan === 'monthly' || plan === 'basis' || plan === 'care_plus'
        ? appUrl(`/d/${slug}/uebernehmen?plan=${plan}`)
        : appUrl(`/d/${slug}#uebernehmen`),
    );
  }
  const cfg = publicOperatorSettings(await getConfig(), DEFAULT_CONFIG.sender);
  const text =
    ctx.state === 'ordered'
      ? ctx.paymentState === 'processing'
        ? 'Ihre Zahlung wird noch bestätigt. Bitte bestellen Sie nicht erneut. Nach bestätigtem Zahlungseingang erhalten Sie Rechnung und den Link für Ihre Angaben per E-Mail.'
        : 'Die Bestellung ist bezahlt. Den Link für Ihre Angaben finden Sie in Ihrer Bestellbestätigung. Bei ausbleibender E-Mail helfen wir Ihnen schriftlich weiter.'
      : ctx.state === 'disabled'
        ? `${ctx.reason} Schreiben Sie uns gern an ${cfg.sender.email || 'den Kontaktbereich von SeitenWerk'}.`
        : `Dieser Entwurf ist nicht mehr verfügbar. Bei Fragen erreichen Sie uns unter ${cfg.sender.email || 'den Kontaktbereich von SeitenWerk'}.`;
  return (
    <PublicShell company={cfg.sender.company}>
      <PublicCard>
        <h1 className="mb-3 text-2xl font-semibold">
          {ctx.state === 'ordered'
            ? ctx.paymentState === 'processing'
              ? 'Zahlung wird geprüft'
              : 'Bereits bestellt'
            : 'Bestellung nicht möglich'}
        </h1>
        <p className="text-slate-700">{text}</p>
      </PublicCard>
    </PublicShell>
  );
}
