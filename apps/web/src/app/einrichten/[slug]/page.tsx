import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { after } from 'next/server';
import { redirect } from 'next/navigation';
import {
  DEFAULT_CONFIG,
  getCheckoutContext,
  getCheckoutDraft,
  getConfig,
  getDb,
  komplettTermsCurrent,
  notifyInterest,
  recordEvent,
  planAmounts,
  publicOperatorSettings,
  setupCookieName,
  v4Offer,
  v4OfferedTiers,
  v4TierLabel,
} from '@wbm/core';
import { PublicShell } from '@/components/public/shell';
import { requestMetaFrom } from '@/lib/request';
import { StepHeader } from '@/components/public/steps';
import { TariffPicker, type QuickOption } from './quick-order';
import { SetupEditor } from './uploads';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ihre Website übernehmen', robots: { index: false, follow: false } };

const euro = (c: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);

/** Die zwei Wege – je Weg nur dessen Schritte (19.11.2026, Betreiber: nicht beides gleichzeitig anbieten). */
const STEPS_AFTER = ['Tarif', 'Bezahlen', 'Angaben'];
const STEPS_BEFORE = ['Angaben', 'Prüfen', 'Bezahlen'];

export default async function SetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ plan?: string; weg?: string; klick?: string }>;
}) {
  const { slug } = await params;
  const { plan: preferred, weg: wegParam, klick } = await searchParams;
  const token = (await cookies()).get(setupCookieName(slug))?.value ?? '';
  // Tempo (17.11.2026): die drei Abfragen gleichzeitig statt nacheinander (Funktion in den USA, Datenbank in Europa)
  const [draft, fullCfg, ctx] = await Promise.all([getCheckoutDraft(slug, token), getConfig(), getCheckoutContext(slug)]);
  if (!draft) redirect(`/d/${slug}/uebernehmen`);
  // „Übernehmen“-Klick zählen und melden – nach der Antwort dieser Seite (siehe /d/[slug]/uebernehmen)
  if (klick === '1' && ctx.state === 'ok') {
    const leadId = ctx.lead.id;
    const meta = requestMetaFrom(await headers());
    after(async () => {
      if (await recordEvent(getDb(), { leadId, type: 'cta_click', req: meta }).catch(() => false))
        await notifyInterest(leadId, 'cta_click', meta).catch(() => undefined);
    });
  }
  const cfg = publicOperatorSettings(fullCfg, DEFAULT_CONFIG.sender);
  const rounds = ctx.state === 'ok' ? ctx.cfg.onboarding.includedChangeRounds : 2;
  // Schnellbestellung: dieselben serverseitigen Preise und Laufzeiten wie auf der Prüfseite, nur für das aktive Angebot
  const tiers =
    ctx.state === 'ok' && ctx.cfg.offers.activeVersion === 'v4'
      ? v4OfferedTiers(ctx.cfg).filter((plan) => plan !== 'komplett' || komplettTermsCurrent(ctx.cfg))
      : [];
  const quick: QuickOption[] =
    ctx.state === 'ok'
      ? tiers.map((plan) => ({
          plan,
          name: v4TierLabel(plan),
          headline: plan === 'komplett' ? '0 €' : euro(planAmounts(ctx.cfg, plan).grossCents),
          headlineNote: plan === 'komplett' ? 'heute' : 'einmalig',
          detail:
            plan === 'komplett'
              ? `dann ${euro(v4Offer(plan).monthlyCents)}/Monat ab 7 Tagen nach Bestellung · 12 Monate Laufzeit`
              : `dann ${euro(v4Offer(plan).monthlyCents)}/Monat ab Go-Live · monatlich kündbar`,
          includes:
            plan === 'basis'
              ? ['Website fertig eingerichtet', `${rounds} Änderungsrunden vor Go-Live`, 'Domain, Hosting und SSL']
              : [
                  plan === 'komplett' ? 'Keine Einrichtungsgebühr' : 'Alles aus Basis',
                  `Bis zu ${v4Offer(plan).includedChangeMinutes} Min. Änderungen pro Monat`,
                  'Domain, Hosting und SSL',
                ],
          recommended: tiers.length > 1 && plan === 'basis',
        }))
      : [];

  // Weg: ausdrücklich gewählt; eine begonnene Einrichtung führt immer zum Weg „Angaben zuerst“
  const weg = draft.touched || wegParam === 'davor' ? 'davor' : wegParam === 'danach' && quick.length ? 'danach' : null;
  const back = (q = '') => `/einrichten/${slug}${q}`;

  if (!weg) {
    // Schritt 0: nur die Wahl, sonst nichts
    const card =
      'card-site card-hover group block p-6 transition-colors hover:border-brand-600 focus-visible:border-brand-600 sm:p-7';
    return (
      <PublicShell company={cfg.sender.company}>
        <header className="mb-8">
          <p className="text-brand-700 text-sm font-semibold">Ihre Website übernehmen</p>
          <h1 className="font-tight mt-3 text-[clamp(1.9rem,6vw,2.6rem)] leading-[1.08] font-semibold tracking-[-0.04em] text-slate-900">
            Wie möchten Sie weitermachen?
          </h1>
          <p className="mt-3 max-w-xl text-[1.05rem] leading-relaxed text-slate-600">
            Beide Wege führen zur selben fertigen Website. Online geht sie erst, wenn Sie die Vorschau freigeben.
          </p>
        </header>
        <div className={`grid gap-4 ${quick.length ? 'sm:grid-cols-2' : ''}`}>
          {quick.length ? (
            <Link href={back(`?weg=danach${preferred ? `&plan=${encodeURIComponent(preferred)}` : ''}`)} className={card}>
              <span className="bg-brand-50 text-brand-700 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
                ca. 2 Minuten
              </span>
              <strong className="font-tight mt-4 block text-xl font-semibold tracking-[-0.03em] text-slate-900">
                Erst bestellen, Angaben danach
              </strong>
              <span className="mt-2 block text-slate-600">Tarif wählen, bezahlen. Impressum, Texte und Fotos danach in Ruhe.</span>
              <span className="text-brand-700 mt-5 inline-flex items-center gap-2 font-semibold">
                Tarif wählen <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ) : null}
          <Link href={back('?weg=davor')} className={card}>
            <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              ca. 15 Minuten
            </span>
            <strong className="font-tight mt-4 block text-xl font-semibold tracking-[-0.03em] text-slate-900">
              Erst Angaben, dann bestellen
            </strong>
            <span className="mt-2 block text-slate-600">Impressum, Texte und Fotos eintragen, alles prüfen, dann bezahlen.</span>
            <span className="text-brand-700 mt-5 inline-flex items-center gap-2 font-semibold">
              Angaben eintragen <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        </div>
        <p className="mt-8 text-sm text-slate-500">
          <Link href={`/d/${slug}#uebernehmen`} className="underline-offset-4 hover:text-slate-900 hover:underline">
            ← Zurück zur Website
          </Link>
        </p>
      </PublicShell>
    );
  }

  if (weg === 'danach') {
    return (
      <PublicShell company={cfg.sender.company}>
        <StepHeader
          steps={STEPS_AFTER}
          current={0}
          title="Welcher Tarif passt?"
          lead="Nach der Zahlung bekommen Sie per E-Mail den Link für Ihre Angaben."
          back={{ href: back(), label: 'Anderen Weg wählen' }}
        />
        <TariffPicker slug={slug} options={quick} preferred={preferred} />
      </PublicShell>
    );
  }

  return (
    <PublicShell company={cfg.sender.company}>
      <StepHeader
        steps={STEPS_BEFORE}
        current={0}
        title="Ihre Angaben für die Website"
        lead="Etwa 15 Minuten. Mit „Zwischenspeichern“ bleibt alles bis zu sieben Tage in diesem Browser erhalten. Danach prüfen Sie alles und wählen Ihren Tarif."
        back={draft.touched ? undefined : { href: back(), label: 'Anderen Weg wählen' }}
      />
      <SetupEditor slug={slug} initial={draft.data} assets={Object.keys(draft.assetKeys)} />
    </PublicShell>
  );
}
