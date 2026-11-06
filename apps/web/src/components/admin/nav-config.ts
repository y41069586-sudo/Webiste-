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
  /** Reiter über dem Inhalt anzeigen (Standard ja); „Mehr“ zeigt stattdessen einen Rücklink zur Übersicht */
  tabs?: boolean;
  pages: NavPage[];
}

export type CountKey = 'demos' | 'letters' | 'support' | 'alerts';

export const SECTIONS: NavSection[] = [
  {
    id: 'start',
    label: 'Start',
    hint: 'Was auf dich wartet',
    icon: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
    pages: [{ href: '/admin', label: 'Start' }],
  },
  {
    id: 'finden',
    label: 'Betriebe finden',
    hint: 'Suchen, KI prüft sofort',
    icon: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
    pages: [
      { href: '/admin/suche', label: 'Suchen' },
      { href: '/admin/leads', label: 'Alle Betriebe' },
    ],
  },
  {
    id: 'freigeben',
    label: 'Freigeben',
    hint: 'Demos und Briefe',
    icon: 'M5 12.5l4.5 4.5L19 7.5',
    pages: [
      { href: '/admin/demos', label: 'Demos', count: 'demos' },
      { href: '/admin/letters', label: 'Briefe', count: 'letters' },
      { href: '/admin/outbox', label: 'Verschickt' },
    ],
  },
  {
    id: 'nachrichten',
    label: 'Nachrichten',
    hint: 'Fragen von Betrieben',
    icon: 'M4 6h16v10H8l-4 3.5V6z',
    pages: [{ href: '/admin/support', label: 'Nachrichten', count: 'support' }],
  },
  {
    id: 'mehr',
    label: 'Mehr',
    hint: 'Kunden, Zahlen, Einstellungen',
    icon: 'M5 12h.01M12 12h.01M19 12h.01',
    tabs: false,
    pages: [
      { href: '/admin/mehr', label: 'Übersicht' },
      { href: '/admin/orders', label: 'Bestellungen' },
      { href: '/admin/customers', label: 'Kunden & Websites' },
      { href: '/admin/kpis', label: 'Kennzahlen' },
      { href: '/admin/funnel', label: 'Weg zum Kauf' },
      { href: '/admin/budget', label: 'Kosten' },
      { href: '/admin/reports', label: 'Wochenberichte' },
      { href: '/admin/variants', label: 'Brief-Versionen' },
      { href: '/admin/optimizer', label: 'Automatische Auswahl' },
      { href: '/admin/learning', label: 'Lern-Vorschläge' },
      { href: '/admin/objections', label: 'Einwände' },
      { href: '/admin/claims', label: 'Erlaubte Aussagen' },
      { href: '/admin/settings', label: 'Einstellungen' },
      { href: '/admin/audit', label: 'Verlauf' },
      { href: '/admin/jobs', label: 'Hintergrund-Aufträge' },
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
