import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { appUrl, getCheckoutContext, getConfig } from '@wbm/core';
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
  const cfg = await getConfig();
  const text =
    ctx.state === 'ordered'
      ? 'Für diesen Entwurf liegt bereits eine Bestellung vor. Den Link für Ihre Angaben zur Website haben wir per E-Mail geschickt.'
      : ctx.state === 'disabled'
        ? `${ctx.reason} Schreiben Sie uns gern an ${cfg.sender.email}.`
        : `Dieser Entwurf ist nicht mehr verfügbar. Bei Fragen erreichen Sie uns unter ${cfg.sender.email}.`;
  return (
    <PublicShell company={cfg.sender.company}>
      <PublicCard>
        <h1 className="mb-3 text-2xl font-semibold">
          {ctx.state === 'ordered' ? 'Bereits bestellt' : 'Bestellung nicht möglich'}
        </h1>
        <p className="text-slate-700">{text}</p>
      </PublicCard>
    </PublicShell>
  );
}
