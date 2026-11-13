import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  DEFAULT_CONFIG,
  getCheckoutContext,
  getCheckoutDraft,
  getConfig,
  komplettTermsCurrent,
  planAmounts,
  publicOperatorSettings,
  setupCookieName,
  v4Offer,
  v4OfferedTiers,
  v4TierLabel,
} from '@wbm/core';
import { PublicShell } from '@/components/public/shell';
import { QuickOrder, type QuickOption } from './quick-order';
import { SetupEditor } from './uploads';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ihre Website einrichten', robots: { index: false, follow: false } };

const euro = (c: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(c / 100);

export default async function SetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { slug } = await params;
  const { plan: preferred } = await searchParams;
  const token = (await cookies()).get(setupCookieName(slug))?.value ?? '';
  const draft = await getCheckoutDraft(slug, token);
  if (!draft) redirect(`/d/${slug}/uebernehmen`);
  const cfg = publicOperatorSettings(await getConfig(), DEFAULT_CONFIG.sender);
  // Schnellbestellung: dieselben serverseitigen Preise und Laufzeiten wie auf der Prüfseite, nur für das aktive Angebot
  const ctx = await getCheckoutContext(slug);
  const quick: QuickOption[] =
    ctx.state === 'ok' && ctx.cfg.offers.activeVersion === 'v4'
      ? v4OfferedTiers(ctx.cfg)
          .filter((plan) => plan !== 'komplett' || komplettTermsCurrent(ctx.cfg))
          .map((plan) => ({
            plan,
            title: `SeitenWerk ${v4TierLabel(plan)}`,
            price:
              plan === 'komplett'
                ? `0 € Einrichtung · ${euro(v4Offer(plan).monthlyCents)}/Monat, erste Abbuchung 7 Tage nach der Bestellung · 12 Monate Mindestlaufzeit`
                : `${euro(planAmounts(ctx.cfg, plan).grossCents)} einmalig + insgesamt ${euro(v4Offer(plan).monthlyCents)}/Monat ab Go-Live`,
            dueNow: plan === 'komplett' ? '0 € (nur Zahlungsmittel hinterlegen)' : euro(planAmounts(ctx.cfg, plan).grossCents),
          }))
      : [];
  return (
    <PublicShell company={cfg.sender.company}>
      {quick.length ? <QuickOrder slug={slug} options={quick} preferred={preferred} /> : null}
      <p className="text-sm font-medium text-slate-500">
        {quick.length ? 'Oder erst alles einrichten: ' : ''}1. Einrichten · 2. Prüfen · 3. Zahlung
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Machen Sie Ihre Website zu Ihrer.</h1>
      <p className="mt-3 text-slate-700">
        Ergänzen Sie Ihre Angaben, Texte, Bilder und Wunschdomain. Ihre Einrichtung ist unverbindlich. Erst danach prüfen Sie den
        Tarif und wechseln zur kostenpflichtigen Bestellung.
      </p>
      <p className="mt-3 mb-6 text-sm text-slate-600">
        Mit „Zwischenspeichern“ bleiben Ihre Eingaben bis zu sieben Tage in diesem Browser zugänglich. Es wird noch nichts
        veröffentlicht oder registriert.{' '}
        <Link href={`/d/${slug}#uebernehmen`} className="underline">
          Leistungsumfang und Preise ansehen
        </Link>{' '}
        ·{' '}
        <Link href="/datenschutz" className="underline">
          Datenschutz
        </Link>
      </p>
      <SetupEditor slug={slug} initial={draft.data} assets={Object.keys(draft.assetKeys)} />
    </PublicShell>
  );
}
