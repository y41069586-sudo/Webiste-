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
  v4CheckoutTerms,
  v4Offer,
  v4OfferedTiers,
  v4TierLabel,
} from '@wbm/core';
import { PublicShell, PublicCard } from '@/components/public/shell';
import { PaymentForm } from './payment-form';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Angaben und Tarif prüfen', robots: { index: false, follow: false } };
const euro = (c: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(c / 100);
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
      ? v4OfferedTiers(ctx.cfg).map((plan) => ({
          plan,
          title: `SeitenWerk ${v4TierLabel(plan)}`,
          price:
            plan === 'komplett'
              ? `0 € Einrichtung · ${euro(v4Offer(plan).monthlyCents)}/Monat, erste Abbuchung 7 Tage nach der Bestellung · 12 Monate Mindestlaufzeit`
              : `${euro(planAmounts(ctx.cfg, plan).grossCents)} einmalig + insgesamt ${euro(v4Offer(plan).monthlyCents)}/Monat ab Go-Live`,
          terms: v4CheckoutTerms(plan, ctx.cfg.offers.billingMode ?? 'saved_mandate'),
          // Klare Preiszusammenfassung: was heute fällig ist; Kaufmodell als „Empfohlen“ markiert, keine Vorauswahl
          dueNow: plan === 'komplett' ? '0 € (nur Zahlungsmittel hinterlegen)' : euro(planAmounts(ctx.cfg, plan).grossCents),
          recommended: plan === 'basis' && v4OfferedTiers(ctx.cfg).includes('komplett'),
          includes:
            plan === 'basis'
              ? `Fertigstellung Ihrer Website, ${ctx.cfg.onboarding.includedChangeRounds} Änderungsrunden vor Go-Live, Standard-Domain im vereinbarten Kostenrahmen, Hosting, SSL und Basis-Support bei Betriebsstörungen.`
              : plan === 'komplett'
                ? `Alle Basis-Leistungen ohne Einrichtungsgebühr und zusätzlich bis zu ${v4Offer(plan).includedChangeMinutes} Minuten vereinbarte Änderungen pro Monat. Bei der Bestellung wird nichts abgebucht.`
                : `Alle Basis-Leistungen und zusätzlich bis zu ${v4Offer(plan).includedChangeMinutes} Minuten vereinbarte Änderungen pro Monat. Care+ enthält die Basisgebühr vollständig.`,
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
      <p className="text-sm font-medium text-slate-500">1. Einrichten · 2. Prüfen · 3. Zahlung</p>
      <h1 className="mt-3 text-3xl font-semibold">Alles vorbereitet. Prüfen Sie Ihre Angaben.</h1>
      <p className="mt-3 mb-6 text-slate-700">
        Ihre Einrichtung bleibt gespeichert. Nach bestätigter Zahlung übernehmen wir diese Angaben in Ihre Website und bereiten
        die Vorschau zur Freigabe vor.
      </p>
      {sp.abgebrochen ? (
        <p role="status" className="mb-5 rounded-lg bg-amber-50 p-4">
          Die Zahlung wurde verlassen. Ihre Einrichtung ist weiterhin gespeichert; es wird keine neue Zahlung ohne Ihre
          Bestätigung ausgelöst.
        </p>
      ) : null}
      <PublicCard>
        <h2 className="text-lg font-semibold">Ihre Einrichtung</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-medium">Betrieb</dt>
            <dd>
              {data.business.name}, {data.business.street} {data.business.houseNumber}, {data.business.postalCode}{' '}
              {data.business.city}
            </dd>
          </div>
          <div>
            <dt className="font-medium">Rechnung und Bestellbestätigung</dt>
            <dd>
              {data.impressum.company} · {data.impressum.owner}
              <br />
              {data.impressum.street}, {data.impressum.postalCode} {data.impressum.city}
              <br />
              {data.impressum.email} · {data.impressum.phone}
            </dd>
          </div>
          <div>
            <dt className="font-medium">Kontakt- und Terminanfragen gehen an</dt>
            <dd>{data.formTargetEmail}</dd>
          </div>
          <div>
            <dt className="font-medium">Wunschdomain</dt>
            <dd>
              {data.domain} (Verfügbarkeit wird vor der Zahlung geprüft; Registrierung nach Zahlung und den erforderlichen
              Freigaben.)
            </dd>
          </div>
          <div>
            <dt className="font-medium">Inhalte</dt>
            <dd>
              {data.texts.headline}
              <br />
              {data.texts.services.map((s) => s.title).join(' · ')}
            </dd>
          </div>
          <div>
            <dt className="font-medium">Logo und Fotos</dt>
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
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium underline">
            Texte, Öffnungszeiten und rechtliche Angaben vollständig prüfen
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
      </PublicCard>
      <PaymentForm slug={slug} fingerprint={setupFingerprint(data, d.assetKeys)} options={options} />
      <p className="mt-6 text-sm text-slate-600">
        Fragen zu Ihrer Einrichtung?{' '}
        <a className="underline" href={`mailto:${cfg.sender.email}`}>
          {cfg.sender.email}
        </a>
        . Die Veröffentlichung erfolgt erst nach Ihrer Freigabe. Der Monatstarif startet erst nach bestätigtem Go-Live.
      </p>
    </PublicShell>
  );
}
