'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Dünner Ladebalken oben: startet beim Klick auf einen internen Link, endet, sobald die neue Seite da ist. */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState<'idle' | 'active' | 'done'>('idle');

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setState('active');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === 'active' ? 'done' : s));
  }, [pathname, search]);

  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState(state === 'active' ? 'done' : 'idle'), state === 'active' ? 12_000 : 600);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <div
      className={`admin-progress-bar ${state === 'active' ? 'is-active' : state === 'done' ? 'is-done' : ''}`}
      aria-hidden="true"
    />
  );
}
