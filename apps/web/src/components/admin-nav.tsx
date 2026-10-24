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
                  prefetch={false}
                  aria-current={active ? 'page' : undefined}
                  className={`admin-nav-link ${active ? 'is-active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <rect x="4" y="4" width="6" height="6" rx="1.5" />
                    <path d="M14 5h6M14 9h4M5 15h14M5 19h10" />
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
