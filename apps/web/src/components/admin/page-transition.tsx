'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Jede Seite blendet weich ein; Inhaltsblöcke folgen leicht versetzt (admin.css: .admin-page). */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="admin-page">
      {children}
    </div>
  );
}
