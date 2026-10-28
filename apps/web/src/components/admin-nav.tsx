'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { locate, SECTIONS, sectionCount, type CountKey } from './admin/nav-config';

export type NavCounts = Partial<Record<CountKey, number>>;

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/** Drehkreis, solange die angeklickte Seite lädt */
function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="ui-spinner admin-nav-pending" aria-hidden="true" /> : null;
}

/** Seitenleiste: sechs Arbeitsbereiche mit offener Arbeit als Zähler. */
export function AdminNav({ counts = {} }: { counts?: NavCounts }) {
  const pathname = usePathname();
  const current = locate(pathname).section.id;
  return (
    <nav aria-label="Arbeitsbereiche" className="admin-nav">
      {SECTIONS.map((s) => {
        const n = sectionCount(s, counts);
        const active = s.id === current;
        return (
          <Link
            key={s.id}
            href={s.pages[0]!.href}
            aria-current={active ? 'page' : undefined}
            className={`admin-nav-link ${active ? 'is-active' : ''}`}
          >
            <span className="admin-nav-icon">
              <Icon d={s.icon} />
            </span>
            <span className="admin-nav-text">
              <strong>{s.label}</strong>
              <small>{s.hint}</small>
            </span>
            <LinkPending />
            {n > 0 ? (
              <span className="admin-nav-count" aria-label={`${n} offen`}>
                {n > 99 ? '99+' : n}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Reiter des aktuellen Bereichs über dem Inhalt (z. B. Akquise: Lead-Suche · Leads · Demos · Briefe · Postausgang). */
export function SectionTabs({ counts = {} }: { counts?: NavCounts }) {
  const pathname = usePathname();
  const { section, page } = locate(pathname);
  if (section.pages.length < 2) return null;
  return (
    <div className="admin-section">
      <p className="admin-section-label">{section.label}</p>
      <nav aria-label={`${section.label}: Bereiche`} className="admin-section-tabs">
        {section.pages.map((p) => {
          const n = p.count ? (counts[p.count] ?? 0) : 0;
          const active = p.href === page?.href;
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={active ? 'page' : undefined}
              className={`admin-section-tab ${active ? 'is-active' : ''}`}
            >
              {p.label}
              {n > 0 ? <span className="admin-section-count">{n}</span> : null}
              <LinkPending />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
