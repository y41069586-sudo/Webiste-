import { formatEuroShort, type AppConfig } from '@wbm/core';

/** Preise und Garantie für die Firmen-Website – alles aus der Config, nichts fest im Text. */
export function sitePricing(cfg: AppConfig) {
  const p = cfg.pricing;
  return {
    oneTime: formatEuroShort(p.packageCents),
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
    color: '#5b2bd6',
  },
  {
    id: 'handwerk',
    label: 'Handwerk',
    name: 'Malerei Muster',
    hook: 'Leistungen, Einzugsgebiet, Anfrageformular',
    color: '#161616',
  },
  {
    id: 'beauty',
    label: 'Beauty',
    name: 'Kosmetik Muster',
    hook: 'Behandlungen, Terminanfrage, Öffnungszeiten',
    color: '#d90429',
  },
  {
    id: 'einzelhandel',
    label: 'Einzelhandel',
    name: 'Blumen Muster',
    hook: 'Sortiment, Öffnungszeiten, Anfahrt',
    color: '#b5179e',
  },
  { id: 'kurse', label: 'Kurse & Training', name: 'Tanzschule Muster', hook: 'Kursplan, Probestunde, Kontakt', color: '#1b1464' },
] as const;

export { SITE_NAV } from './site-nav';
export { brandName } from './site-nav';
