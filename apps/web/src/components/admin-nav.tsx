'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV: { href: string; label: string }[] = [
  { href: '/admin', label: 'Übersicht' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/demos', label: 'Demos (Review)' },
  { href: '/admin/letters', label: 'Briefe (Review)' },
  { href: '/admin/orders', label: 'Bestellungen' },
  { href: '/admin/customers', label: 'Kunden & Seiten' },
  { href: '/admin/support', label: 'Support' },
  { href: '/admin/budget', label: 'Budget' },
  { href: '/admin/reports', label: 'Wochenberichte' },
  { href: '/admin/jobs', label: 'Jobs & Steuerung' },
  { href: '/admin/settings', label: 'Einstellungen' },
  { href: '/admin/audit', label: 'Audit-Log' },
  { href: '/admin/outbox', label: 'Postausgang (Test)' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin-Navigation" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-sm ${active ? 'bg-brand-600 font-medium text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
