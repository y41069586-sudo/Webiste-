import { offerSection, type DemoOptions, type SenderInfo } from '@wbm/templates';
import { appUrl, demoUrl } from '../config/env';
import { publicOperatorSettings } from '../config/operator';
import { DEFAULT_CONFIG, type AppConfig } from '../config/settings';
import { priceTaxSuffix } from '../invoices/build';
import { v4Offer, v4OfferedTiers, v4TierLabel } from '../services/offers-v4';
import { formatEuroShort } from '../util/time';

/**
 * Angebots- und Absenderdaten der Demo ohne schwere Abhängigkeiten (kein Rendering, keine KI): wird beim Bauen
 * in die Demo geschrieben und beim Ausliefern genutzt, um die Preissektion auf den aktuellen Stand zu bringen.
 */

/** Platzhalter für das Ablaufdatum im gespeicherten HTML (wird beim Ausliefern ersetzt). */
export const EXPIRES_PLACEHOLDER = '__WBM_EXPIRES_LABEL__';

export function senderInfo(cfg: AppConfig): SenderInfo {
  return {
    name: cfg.sender.name,
    company: cfg.sender.company,
    street: cfg.sender.street,
    postalCode: cfg.sender.postalCode,
    city: cfg.sender.city,
    email: cfg.sender.email,
    phone: cfg.sender.phone,
    imprintUrl: appUrl('/impressum'),
    privacyUrl: appUrl('/datenschutz'),
  };
}

/** wa.me-Link auf die Nummer des Betreibers mit vorausgefülltem Text (kein Bot, der Betrieb schreibt uns). */
export function whatsappUrl(cfg: AppConfig, slug: string): string | null {
  const n = cfg.sender.whatsappNumber.replace(/\D/g, '');
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(`Frage zu meinem Website-Entwurf ${slug}`)}`;
}

export function demoOptions(slug: string, cfg: AppConfig, photoDataUri: string | null = null): DemoOptions {
  cfg = publicOperatorSettings(cfg, DEFAULT_CONFIG.sender);
  const p = cfg.pricing;
  const tax = priceTaxSuffix(cfg);
  const care = `${formatEuroShort(p.subscriptionCents)}/Monat`;
  const take = (plan: 'one_time' | 'monthly') => demoUrl(`/d/${slug}/uebernehmen?plan=${plan}`);
  const offers: NonNullable<DemoOptions['offers']> = [
    {
      title: 'Einmalzahlung',
      price: formatEuroShort(p.packageCents),
      unit: tax ? `einmalig ${tax}` : 'einmalig',
      points: [
        `Eigene Domain und ${p.hostingMonthsIncluded} Monate Hosting inklusive`,
        `Danach optional ${care}, monatlich kündbar`,
      ],
      href: take('one_time'),
    },
  ];
  if (p.monthlyEnabled)
    offers.push({
      title: 'Monatlich',
      price: formatEuroShort(p.monthlyCents),
      unit: tax ? `pro Monat ${tax}` : 'pro Monat',
      points: [
        `${p.minTermMonths} Monate Mindestlaufzeit`,
        `Ab Monat ${p.minTermMonths + 1} nur noch ${care}, dann monatlich kündbar`,
        'Eigene Domain und Hosting inklusive',
      ],
      href: take('monthly'),
    });
  if (cfg.offers.activeVersion === 'v4') {
    offers.splice(
      0,
      offers.length,
      ...v4OfferedTiers(cfg).map((tier) => {
        const o = v4Offer(tier);
        if (tier === 'komplett')
          return {
            title: 'SeitenWerk Komplett',
            price: formatEuroShort(0),
            monthly: formatEuroShort(o.monthlyCents),
            firstYear: formatEuroShort(o.minTermMonths * o.monthlyCents),
            unit: tax ? `pro Monat ${tax}` : 'pro Monat',
            komplett: true,
            points: [
              'Keine Einrichtungsgebühr – bei der Bestellung wird nichts abgebucht',
              'Regelmäßige Änderungen: bis zu 60 Minuten pro Monat',
              'Lokale Auffindbarkeit: Seitentitel, Beschreibungen und Firmendaten für die Suche gepflegt',
              'Bevorzugter Support – Ihre Anfragen zuerst',
              'Standard-Domain, Hosting und SSL enthalten',
            ],
            href: demoUrl(`/d/${slug}/uebernehmen?plan=${tier}`),
          };
        return {
          title: `SeitenWerk ${v4TierLabel(tier)}`,
          price: formatEuroShort(o.setupCents),
          monthly: formatEuroShort(o.monthlyCents),
          firstYear: formatEuroShort(o.setupCents + 12 * o.monthlyCents),
          // Ohne geklärten Steuerstatus kein Steuerzusatz; die Bestellung ist dann ohnehin noch nicht freigeschaltet
          unit: tax ? `einmalig ${tax}` : 'einmalig',
          points: [
            `+ ${formatEuroShort(o.monthlyCents)}/Monat insgesamt ab Go-Live`,
            'Monatlich kündbar, keine zwölfmonatige Mindestbindung',
            tier === 'care_plus'
              ? 'Hosting inklusive; bis zu 60 Minuten kleine Inhaltsänderungen/Monat'
              : 'Hosting, SSL und Basis-Support bei Betriebsstörungen',
            'Standard-Domain im vereinbarten Kostenrahmen enthalten',
          ],
          href: demoUrl(`/d/${slug}/uebernehmen?plan=${tier}`),
          // Betreiber (06.11.2026): Kaufmodell als „Empfohlen“ kennzeichnen, beide Optionen gleich gut erreichbar
          ...(tier === 'basis' && cfg.offers.komplettEnabled ? { recommended: true } : {}),
        };
      }),
    );
  }
  return {
    offerVersion: cfg.offers.activeVersion,
    slug,
    priceLabel: formatEuroShort(cfg.offers.activeVersion === 'v4' ? v4Offer('basis').setupCents : p.packageCents),
    checkoutUrl: demoUrl(`/d/${slug}/uebernehmen`),
    questionUrl: demoUrl(`/d/${slug}/frage`),
    optOutUrl: demoUrl(`/d/${slug}/kein-interesse`),
    sender: senderInfo(cfg),
    expiresLabel: EXPIRES_PLACEHOLDER,
    offers,
    guaranteeNote:
      !cfg.tax.operatorConfirmed || !cfg.legal.termsMarkdown.trim()
        ? 'Die Online-Bestellung ist noch nicht freigeschaltet. Fragen zum Entwurf beantworte ich gern schon jetzt – per WhatsApp, E-Mail oder über das Formular unten.'
        : cfg.guarantee.enabled
          ? cfg.offers.activeVersion === 'v4'
            ? `${cfg.guarantee.days} Tage Einrichtungsgarantie ab Go-Live laut Vertragsbedingungen: Sind Sie nicht zufrieden, wird die Einrichtungsgebühr erstattet. Gesetzliche Rechte bleiben unberührt.`
            : `${cfg.guarantee.days} Tage Zufriedenheitsgarantie: Gefällt Ihnen die fertige Website nicht, bekommen Sie Ihr Geld zurück.`
          : null,
    // Über unsere Weiterleitung, damit der Klick gezählt wird (B6.1); Ziel bleibt der wa.me-Link
    whatsappUrl: whatsappUrl(cfg, slug) ? demoUrl(`/d/${slug}/whatsapp`) : null,
    // Nur Zusagen, die Vertrag und Ablauf tatsächlich hergeben (AGB-Entwurf, Onboarding, Domain auf den Kunden)
    assurances:
      cfg.offers.activeVersion === 'v4'
        ? [
            'Sie kennen das Ergebnis vor dem Kauf – Ihre Website steht bereits.',
            'Kostenlose Anpassung vor dem Kauf – ein kurzer Wunsch genügt.',
            `Online erst nach Ihrer Freigabe – ${cfg.onboarding.includedChangeRounds} Änderungsrunden sind im Preis enthalten.`,
            'Die Domain wird auf Ihren Betrieb registriert – bei Kündigung nehmen Sie sie mit.',
            cfg.offers.komplettEnabled
              ? 'Basis monatlich kündbar; Komplett 12 Monate, danach monatlich kündbar – keine versteckten Kosten.'
              : 'Monatlich kündbar, keine Mindestlaufzeit, keine versteckten Kosten.',
            'Zusatzleistungen nur mit Ihrer ausdrücklichen Zustimmung.',
            'Sichere Bezahlung über Stripe und eine ordentliche Rechnung zu jeder Zahlung.',
            `Ein fester Ansprechpartner${cfg.sender.city.trim() ? ` aus ${cfg.sender.city.trim()}` : ''} – Fragen vorab per ${whatsappUrl(cfg, slug) ? 'WhatsApp, ' : ''}E-Mail oder Formular.`,
          ]
        : undefined,
    trust: {
      name: cfg.sender.name,
      intro: cfg.sender.intro,
      photoDataUri,
      email: cfg.sender.email,
      phone: cfg.sender.phone,
      imprintUrl: appUrl('/impressum'),
    },
  };
}

/** Preissektion „Gefällt Ihnen Ihre neue Website?“ mit den aktuell angebotenen Tarifen (für das Ausliefern). */
export function demoOfferSectionHtml(slug: string, cfg: AppConfig, photoDataUri: string | null = null): string {
  return offerSection(demoOptions(slug, cfg, photoDataUri));
}
