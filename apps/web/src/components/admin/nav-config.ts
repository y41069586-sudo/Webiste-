/**
 * Aufbau der Verwaltung nach Arbeitsabläufen: wenige Hauptbereiche in der Seitenleiste, darin Reiter.
 * Bestehende Adressen (/admin/leads usw.) bleiben erhalten; nur die Ordnung ist neu.
 */
export interface NavPage {
  href: string;
  label: string;
  /** Zähler-Schlüssel für offene Arbeit */
  count?: CountKey;
}

export interface NavSection {
  id: string;
  label: string;
  hint: string;
  icon: string;
  pages: NavPage[];
}

export type CountKey = 'demos' | 'letters' | 'support' | 'alerts';

export const SECTIONS: NavSection[] = [
  {
    id: 'heute',
    label: 'Heute',
    hint: 'Was jetzt ansteht',
    icon: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    pages: [{ href: '/admin', label: 'Übersicht', count: 'alerts' }],
  },
  {
    id: 'akquise',
    label: 'Akquise',
    hint: 'Leads, Demos, Briefe',
    icon: 'M3 12h4l3-8 4 16 3-8h4',
    pages: [
      { href: '/admin/ablauf', label: 'Ablauf' },
      { href: '/admin/suche', label: 'Lead-Suche' },
      { href: '/admin/leads', label: 'Leads' },
      { href: '/admin/demos', label: 'Demos prüfen', count: 'demos' },
      { href: '/admin/letters', label: 'Briefe freigeben', count: 'letters' },
      { href: '/admin/outbox', label: 'Postausgang' },
    ],
  },
  {
    id: 'kunden',
    label: 'Kunden',
    hint: 'Aufträge, Websites, Support',
    icon: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c.8-3 3.2-5 6-5s5.2 2 6 5M16 5a3 3 0 0 1 0 6M18 14c1.6.7 2.6 2.3 3 5',
    pages: [
      { href: '/admin/support', label: 'Support', count: 'support' },
      { href: '/admin/orders', label: 'Bestellungen' },
      { href: '/admin/customers', label: 'Kunden & Websites' },
    ],
  },
  {
    id: 'auswertung',
    label: 'Auswertung',
    hint: 'Zahlen, Funnel, Budget',
    icon: 'M5 19V11M10 19V6M15 19v-5M20 19V9',
    pages: [
      { href: '/admin/kpis', label: 'Kennzahlen' },
      { href: '/admin/funnel', label: 'Funnel' },
      { href: '/admin/budget', label: 'Budget' },
      { href: '/admin/reports', label: 'Wochenberichte' },
    ],
  },
  {
    id: 'labor',
    label: 'Labor',
    hint: 'Varianten & Lernen',
    icon: 'M9 4v6l-4 8a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-4-8V4M8 4h8',
    pages: [
      { href: '/admin/variants', label: 'Varianten' },
      { href: '/admin/optimizer', label: 'Optimizer' },
      { href: '/admin/learning', label: 'Lern-Agent' },
      { href: '/admin/objections', label: 'Einwände' },
      { href: '/admin/claims', label: 'Claims & Playbooks' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    hint: 'Einstellungen, Jobs, Protokoll',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.3 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5.5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
    pages: [
      { href: '/admin/settings', label: 'Einstellungen' },
      { href: '/admin/jobs', label: 'Jobs' },
      { href: '/admin/audit', label: 'Protokoll' },
    ],
  },
];

/** Bereich und Unterseite zur aktuellen Adresse (Detailseiten gehören zu ihrer Liste). */
export function locate(pathname: string): { section: NavSection; page: NavPage | undefined } {
  for (const section of SECTIONS)
    for (const page of section.pages)
      if (page.href === '/admin' ? pathname === '/admin' : pathname === page.href || pathname.startsWith(`${page.href}/`))
        return { section, page };
  return { section: SECTIONS[0]!, page: undefined };
}

export function sectionCount(section: NavSection, counts: Partial<Record<CountKey, number>>): number {
  return section.pages.reduce((sum, p) => sum + (p.count ? (counts[p.count] ?? 0) : 0), 0);
}
