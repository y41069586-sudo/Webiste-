import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/inter-tight';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'SeitenWerk', template: '%s · SeitenWerk' },
  robots: { index: false, follow: false },
  icons: { icon: '/brand/seitenwerk-mark-32.png', apple: '/brand/seitenwerk-mark-180.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
