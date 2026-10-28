'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Menü-Knopf für iPad hochkant und Handy: Seitenleiste gleitet herein, Hintergrund abgedunkelt. */
export function NavToggle() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.dataset.adminNav = 'open';
    else delete root.dataset.adminNav;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const onOpen = () => setOpen(true);
    window.addEventListener('admin-nav-open', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('admin-nav-open', onOpen);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="admin-nav-toggle"
        aria-label={open ? 'Navigation schließen' : 'Navigation öffnen'}
        aria-expanded={open}
        aria-controls="admin-sidebar"
        onClick={() => setOpen(!open)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>
      {mounted
        ? createPortal(<div className="admin-overlay" onClick={() => setOpen(false)} aria-hidden="true" />, document.body)
        : null}
    </>
  );
}
