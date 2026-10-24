import type { ReactNode } from 'react';

/** Kurzer Fade bei jedem Seitenwechsel (nur opacity). */
export default function SiteTemplate({ children }: { children: ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
