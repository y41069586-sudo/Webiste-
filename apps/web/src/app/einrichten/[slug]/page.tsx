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
  searchParams: Promise<{ plan?: string; weg?: string; klick?: string; abgebrochen?: string }>;
}) {
  const { slug } = await params;
  const { plan: preferred, weg: wegParam, klick, abgebrochen } = await searchParams;
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

  // Weg (20.11.2026, Analyse Brief/Demo/Funnel): keine Zwischenfrage mehr vor dem Preis – „Übernehmen“ zeigt sofort die
  // Tarife. „Angaben zuerst“ bleibt als zweiter Weg erreichbar; eine begonnene Einrichtung führt immer dorthin.
  const weg = draft.touched || wegParam === 'davor' || !quick.length ? 'davor' : 'danach';
  const back = (q = '') => `/einrichten/${slug}${q}`;

  if (weg === 'danach') {
    return (
      <PublicShell company={cfg.sender.company}>
        <StepHeader
          steps={STEPS_AFTER}
          current={0}
          title="Welcher Tarif passt?"
          lead="Nach der Zahlung bekommen Sie per E-Mail den Link für Ihre Angaben."
          back={{ href: `/d/${slug}`, label: 'Zurück zur Website' }}
        />
        <ul className="mb-6 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {[
            'Online erst nach Ihrer Freigabe der fertigen Vorschau.',
            `${rounds} Änderungsrunden sind im Preis enthalten.`,
            'Die Monatsgebühr beginnt erst, wenn Ihre Website online ist.',
            'Sichere Bezahlung über Stripe, Rechnung zu jeder Zahlung.',
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden="true" className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                ✓
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        {abgebrochen ? (
          <p role="status" className="mb-5 rounded-lg bg-amber-50 p-4 text-sm">
            Die Bezahlung wurde abgebrochen, es wurde nichts abgebucht. Sie können hier einfach erneut wählen.
          </p>
        ) : null}
        <TariffPicker slug={slug} options={quick} preferred={preferred} />
        <p className="mt-6 text-sm text-slate-600">
          Lieber zuerst alles in Ruhe eintragen und prüfen, dann bezahlen?{' '}
          <Link href={back('?weg=davor')} className="text-brand-700 font-semibold underline-offset-4 hover:underline">
            Angaben zuerst eintragen
          </Link>
        </p>
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
        back={draft.touched ? undefined : quick.length ? { href: back('?weg=danach'), label: 'Zurück zur Tarifwahl' } : { href: `/d/${slug}`, label: 'Zurück zur Website' }}
      />
      <SetupEditor slug={slug} initial={draft.data} assets={Object.keys(draft.assetKeys)} />
    </PublicShell>
  );
}
