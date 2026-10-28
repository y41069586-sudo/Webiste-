'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const GROUPS = [
  {
    label: 'Arbeitsplatz',
    items: [
      ['', 'Übersicht'],
      ['leads', 'Leads'],
      ['demos', 'Demos prüfen'],
      ['letters', 'Briefe prüfen'],
      ['outbox', 'Postausgang'],
    ],
  },
  {
    label: 'Kunden & Geschäft',
    items: [
      ['orders', 'Bestellungen'],
      ['customers', 'Kunden & Websites'],
      ['support', 'Support'],
      ['budget', 'Budget'],
    ],
  },
  {
    label: 'Analyse & Wachstum',
    items: [
      ['kpis', 'Kennzahlen'],
      ['funnel', 'Funnel'],
      ['reports', 'Wochenberichte'],
      ['optimizer', 'Optimizer'],
      ['variants', 'Varianten-Labor'],
      ['learning', 'Lern-Agent'],
      ['objections', 'Einwände'],
      ['claims', 'Claims & Playbooks'],
    ],
  },
  {
    label: 'Verwaltung',
    items: [
      ['jobs', 'Jobs & Steuerung'],
      ['settings', 'Einstellungen'],
      ['audit', 'Aktivitätsprotokoll'],
    ],
  },
];

/** Einfache Linien-Symbole je Bereich (24er Raster) */
const ICONS: Record<string, string> = {
  '': 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z',
  leads: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20',
  demos: 'M4 5h16v11H4zM9 20h6M12 16v4',
  letters: 'M4 6h16v12H4zM4 7l8 6 8-6',
  outbox: 'M4 13h4l2 3h4l2-3h4M6 5h12l2 8v6H4v-6z',
  orders: 'M6 7h12l-1 12H7zM9 7a3 3 0 0 1 6 0',
  customers: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c.8-3 3.2-5 6-5s5.2 2 6 5M16 5a3 3 0 0 1 0 6M18 14c1.6.7 2.6 2.3 3 5',
  support: 'M5 6h14v9H9l-4 4z',
  budget: 'M4 7h16v11H4zM16 12h2M4 10h16',
  kpis: 'M5 19V11M10 19V6M15 19v-5M20 19V9',
  funnel: 'M4 5h16l-6 7v6l-4 2v-8z',
  reports: 'M7 4h7l4 4v12H7zM14 4v4h4M10 13h5M10 16h5',
  optimizer: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4',
  variants: 'M9 4v6l-4 8a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-4-8V4M8 4h8',
  learning: 'M12 4 3 9l9 5 9-5zM7 11.5V16c1.5 1.5 3 2 5 2s3.5-.5 5-2v-4.5',
  objections: 'M12 5v8M12 17v.5M4 20 12 4l8 16z',
  claims: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6zM9 12l2 2 4-4',
  jobs: 'M12 8v4l3 2M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.3 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5.5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  audit: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
};

export function AdminNav() {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(([, label]) => label!.toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de'))),
  })).filter((group) => group.items.length);
  return (
    <nav aria-label="Admin-Navigation" className="admin-nav">
      <button
        type="button"
        className="admin-menu-toggle"
        aria-expanded={open}
        aria-controls="admin-navigation"
        onClick={() => setOpen(!open)}
      >
        Navigation <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div id="admin-navigation" className={`admin-nav-body ${open ? 'is-open' : ''}`}>
        <label className="admin-nav-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            aria-label="Navigation durchsuchen"
            type="search"
            placeholder="Bereich finden …"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </label>
        {groups.map((group) => (
          <div key={group.label} className="admin-nav-group">
            <p className="admin-nav-label">{group.label}</p>
            {group.items.map(([path, label]) => {
              const href = `/admin${path ? `/${path}` : ''}`;
              const active = path ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`admin-nav-link ${active ? 'is-active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={ICONS[path!] ?? ICONS['']} />
                  </svg>
                  <span>{label}</span>
                  {active ? <span className="admin-nav-dot" /> : null}
                </Link>
              );
            })}
          </div>
        ))}
        {!groups.length ? <p className="px-3 py-4 text-sm text-slate-500">Kein Bereich gefunden.</p> : null}
      </div>
    </nav>
  );
}
