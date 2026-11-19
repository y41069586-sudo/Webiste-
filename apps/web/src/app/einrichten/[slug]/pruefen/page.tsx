import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  DEFAULT_CONFIG,
  getCheckoutContext,
  getCheckoutDraft,
  getConfig,
  onboardingErrors,
  planAmounts,
  publicOperatorSettings,
  setupCookieName,
  setupFingerprint,
  komplettTermsCurrent,
  v4CheckoutTerms,
  v4Offer,
  v4OfferedTiers,
  v4TierLabel,
} from '@wbm/core';
import { PublicShell } from '@/components/public/shell';
import { StepHeader } from '@/components/public/steps';
import { PaymentForm } from './payment-form';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Angaben und Tarif prüfen', robots: { index: false, follow: false } };
const euro = (c: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
export default async function ReviewSetup({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ abgebrochen?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const token = (await cookies()).get(setupCookieName(slug))?.value ?? '';
  const d = await getCheckoutDraft(slug, token);
  if (!d || onboardingErrors(d.data)) redirect(`/einrichten/${slug}`);
  const ctx = await getCheckoutContext(slug);
  if (ctx.state !== 'ok') redirect(`/checkout/${slug}`);
  const cfg = publicOperatorSettings(await getConfig(), DEFAULT_CONFIG.sender);
  const data = d.data;
  const options =
    ctx.cfg.offers.activeVersion === 'v4'
      ? v4OfferedTiers(ctx.cfg)
          .filter((plan) => plan !== 'komplett' || komplettTermsCurrent(ctx.cfg))
          .map((plan) => ({
            plan,
            title: v4TierLabel(plan),
            // 19.11.2026 (Betreiber: „so richtig viel“): heute fällig groß, darunter eine Zeile; Vertragstext eingeklappt
            dueNow: plan === 'komplett' ? '0 €' : euro(planAmounts(ctx.cfg, plan).grossCents),
            price:
              plan === 'komplett'
                ? `dann ${euro(v4Offer(plan).monthlyCents)}/Monat ab 7 Tagen nach Bestellung · 12 Monate Laufzeit`
                : `dann ${euro(v4Offer(plan).monthlyCents)}/Monat ab Go-Live · monatlich kündbar`,
            terms: v4CheckoutTerms(plan, ctx.cfg.offers.billingMode ?? 'saved_mandate'),
            recommended: false,
            includes: '',
          }))
      : [
          {
            plan: 'one_time',
            title: ctx.cfg.pricing.packageName,
            price: ctx.price.label,
            terms: ctx.cfg.pricing.packageDescription,
            includes: 'Leistungsumfang gemäß den verlinkten Vertragsbedingungen.',
          },
        ];
  return (
    <PublicShell company={cfg.sender.company}>
      <StepHeader
        steps={['Angaben', 'Prüfen', 'Bezahlen']}
        current={1}
        title="Fast geschafft"
        lead="Kurz prüfen, Tarif wählen, bezahlen. Online geht die Website erst nach Ihrer Freigabe."
        back={{ href: `/einrichten/${slug}?weg=davor`, label: 'Angaben bearbeiten' }}
      />
      {sp.abgebrochen ? (
        <p role="status" className="mb-5 rounded-lg bg-amber-50 p-4">
          Die Zahlung wurde verlassen. Ihre Einrichtung ist weiterhin gespeichert; es wird keine neue Zahlung ohne Ihre
          Bestätigung ausgelöst.
        </p>
      ) : null}
      <PaymentForm slug={slug} fingerprint={setupFingerprint(data, d.assetKeys)} options={options}>
      <details className="card-site group p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-xs font-semibold tracking-wide text-slate-500 uppercase">Ihre Angaben</span>
            <span className="mt-1 block font-semibold text-slate-900">{data.business.name}</span>
            <span className="block text-sm text-slate-500">{data.domain}</span>
          </span>
          <span className="text-brand-700 shrink-0 text-sm font-semibold group-open:hidden">Ansehen</span>
          <span className="text-brand-700 hidden shrink-0 text-sm font-semibold group-open:inline">Schließen</span>
        </summary>
        <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Betrieb</dt>
            <dd>
              {data.business.name}, {data.business.street} {data.business.houseNumber}, {data.business.postalCode}{' '}
              {data.business.city}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Rechnung und Bestellbestätigung</dt>
            <dd>
              {data.impressum.company} · {data.impressum.owner}
              <br />
              {data.impressum.street}, {data.impressum.postalCode} {data.impressum.city}
              <br />
              {data.impressum.email} · {data.impressum.phone}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Kontakt- und Terminanfragen gehen an</dt>
            <dd>{data.formTargetEmail}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Wunschdomain</dt>
            <dd>
              {data.domain}
              <span className="block text-xs text-slate-500">Registrierung erst nach Zahlung und Ihrer Freigabe.</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Inhalte</dt>
            <dd>
              {data.texts.headline}
              <br />
              {data.texts.services.map((s) => s.title).join(' · ')}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Logo und Fotos</dt>
            <dd>
              {d.assetKeys.logo ? 'Logo vorhanden' : 'Kein Logo hochgeladen'} ·{' '}
              {Object.keys(d.assetKeys).filter((k) => k.startsWith('photo:')).length} Fotos
            </dd>
          </div>
        </dl>
        {Object.keys(d.assetKeys).length ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.keys(d.assetKeys).map((id, i) => (
              <img
                key={id}
                src={`/einrichten/${slug}/bild/${encodeURIComponent(id)}`}
                alt={id === 'logo' ? 'Ihr Logo' : `Ihr Foto ${i + 1}`}
                className="h-20 w-24 rounded border object-contain"
              />
            ))}
          </div>
        ) : null}
        <details className="mt-6 border-t border-slate-200 pt-4">
          <summary className="text-brand-700 cursor-pointer text-sm font-semibold">
            Alle Texte, Öffnungszeiten und rechtlichen Angaben anzeigen
          </summary>
          <div className="mt-4 space-y-4 whitespace-pre-wrap break-words text-sm">
            <p>
              {data.texts.headline}
              <br />
              {data.texts.subline}
            </p>
            <p>{data.texts.about}</p>
            {data.texts.services.map((s, i) => (
              <p key={i}>
                <strong>{s.title}</strong>
                <br />
                {s.text}
              </p>
            ))}
            {data.texts.wishes ? (
              <p>
                <strong>Ihre Wünsche</strong>
                <br />
                {data.texts.wishes}
              </p>
            ) : null}
            <p>
              <strong>Öffnungszeiten</strong>
              <br />
              {data.hours.mode === 'appointment'
                ? 'Nach Vereinbarung'
                : data.hours.days
                    .map(
                      (h) =>
                        `${['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][h.day]}: ${h.closed ? 'geschlossen' : `${h.open}–${h.close}${h.open2 ? `, ${h.open2}–${h.close2}` : ''}`}`,
                    )
                    .join('\n')}
              {data.hours.mode === 'fixed' ? (
                <>
                  <br />
                  {data.hours.booking !== false
                    ? `Online-Terminwahl: an (${data.hours.slotMinutes ?? 60} Minuten je Termin, Bestätigung per E-Mail)`
                    : 'Online-Terminwahl: aus'}
                </>
              ) : null}
            </p>
            <p>
              <strong>Impressumsangaben</strong>
              <br />
              {Object.entries(data.impressum)
                .filter(([, v]) => v)
                .map(([, v]) => v)
                .join('\n')}
            </p>
            <p>
              <strong>Datenschutzerklärung</strong>
              <br />
              {data.privacyText}
            </p>
          </div>
        </details>
      </details>
      </PaymentForm>
      <p className="mt-6 text-sm text-slate-500">
        Fragen?{' '}
        <a className="underline" href={`mailto:${cfg.sender.email}`}>
          {cfg.sender.email}
        </a>
      </p>
    </PublicShell>
  );
}
