import { V4_PRICES, formatEuroShort, type AppConfig } from '@wbm/core';

/** Preise und Garantie für die Firmen-Website – alles aus der Config, nichts fest im Text. */
export function sitePricing(cfg: AppConfig) {
  const p = cfg.pricing;
  return {
    version: cfg.offers.activeVersion,
    oneTime: formatEuroShort(cfg.offers.activeVersion === 'v4' ? V4_PRICES.setupCents : p.packageCents),
    basis: formatEuroShort(V4_PRICES.basisCents),
    carePlus: formatEuroShort(V4_PRICES.carePlusCents),
    monthly: formatEuroShort(p.monthlyCents),
    follow: formatEuroShort(p.subscriptionCents),
    minTerm: p.minTermMonths,
    hostingMonths: p.hostingMonthsIncluded,
    followFromMonth: p.subscriptionStartMonth,
    monthlyEnabled: p.monthlyEnabled,
    guarantee: cfg.guarantee.enabled ? { days: cfg.guarantee.days, latestStartDays: cfg.guarantee.latestStartDays } : null,
  };
}

export type SitePricing = ReturnType<typeof sitePricing>;

export const INDUSTRY_EXAMPLES = [
  {
    id: 'gastronomie',
    label: 'Gastronomie',
    name: 'Trattoria Muster',
    hook: 'Speisekarte, Öffnungszeiten, Anfahrt',
    color: '#8a3b2a',
  },
  {
    id: 'handwerk',
    label: 'Handwerk',
    name: 'Malerei Muster',
    hook: 'Leistungen, Einzugsgebiet, Anfrageformular',
    color: '#2f5d46',
  },
  {
    id: 'beauty',
    label: 'Beauty',
    name: 'Kosmetik Muster',
    hook: 'Behandlungen, Terminanfrage, Öffnungszeiten',
    color: '#a2566b',
  },
  {
    id: 'einzelhandel',
    label: 'Einzelhandel',
    name: 'Blumen Muster',
    hook: 'Sortiment, Öffnungszeiten, Anfahrt',
    color: '#5b4a7a',
  },
  { id: 'kurse', label: 'Kurse & Training', name: 'Tanzschule Muster', hook: 'Kursplan, Probestunde, Kontakt', color: '#1f6f78' },
] as const;

export { SITE_NAV } from './site-nav';
export { brandName } from './site-nav';
