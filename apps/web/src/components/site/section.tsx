import type { CSSProperties, ReactNode } from 'react';

export const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;
/** Verzögerung der CSS-Einblendung oberhalb der Falz (läuft ohne JavaScript, gut für LCP). */
export const t = (ms: number) => ({ '--t': `${ms}ms` }) as CSSProperties;

export function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="arrow h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

/** Seitenkopf: große, eng gesetzte Überschrift links, kurze Erklärung rechts (asymmetrisch). */
export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section className="mx-auto max-w-[90rem] px-5 pt-14 pb-14 sm:px-8 sm:pt-24 sm:pb-20">
      <p className="build font-tight text-nav text-[#555555]">{eyebrow}</p>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end">
        <h1 style={t(60)} className="build text-hero max-w-[16ch] text-balance text-[#222222]">
          {title}
        </h1>
        {children ? (
          <div style={t(160)} className="build max-w-[46ch] text-[1.0625rem] leading-relaxed text-[#333333]">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-end">
      <h2 data-reveal className="text-section max-w-[20ch] text-balance text-[#222222]">
        {title}
      </h2>
      {children ? (
        <div data-reveal style={delay(100)} className="max-w-[46ch] leading-relaxed text-[#333333]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Check({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <li className="flex gap-3">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={`mt-0.5 h-5 w-5 shrink-0 ${dark ? 'text-white' : 'text-[#222222]'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

/** Dunkles Band (#222222) als Abschluss vor dem Footer. */
export function DarkBand({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="on-dark bg-[#222222] text-white">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.6fr_1fr] lg:items-end">
        <h2 data-reveal className="text-section max-w-[18ch] text-balance">
          {title}
        </h2>
        <div data-reveal style={delay(120)}>
          <p className="max-w-[44ch] leading-relaxed text-[#dddddd]">{text}</p>
          <div className="mt-7 flex flex-wrap gap-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

export const ICONS = {
  letter: (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  ),
  demo: (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M10.5 18.5h3" />
    </svg>
  ),
  online: (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  ),
};
