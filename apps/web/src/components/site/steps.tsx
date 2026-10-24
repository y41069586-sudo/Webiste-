'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface Step {
  title: string;
  text: ReactNode;
  icon: ReactNode;
}

/** „So funktioniert's“: Schritte werden beim Scrollen nacheinander aktiv, die Verbindungslinie wächst mit. */
export function Steps({ steps }: { steps: Step[] }) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(steps.length);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = refs.current.indexOf(e.target as HTMLLIElement);
          if (e.isIntersecting) setActive((a) => Math.max(a, i + 1));
        }
      },
      { rootMargin: '0px 0px -35% 0px', threshold: 0.4 },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);
  const progress = steps.length > 1 ? Math.max(0, active - 1) / (steps.length - 1) : 1;
  return (
    <ol className="relative mx-auto max-w-2xl">
      <div aria-hidden="true" className="absolute top-6 bottom-6 left-6 w-px bg-[#cccccc]" />
      <div
        aria-hidden="true"
        className="absolute top-6 bottom-6 left-6 w-px origin-top bg-[#222222] transition-transform duration-700"
        style={{ transform: `scaleY(${progress})`, transitionTimingFunction: 'var(--ease-smooth)' }}
      />
      {steps.map((s, i) => {
        const on = i < active;
        return (
          <li
            key={s.title}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="relative flex gap-6 pb-16 last:pb-0"
          >
            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-white text-[#555555]">
              <span
                aria-hidden="true"
                className="absolute inset-0 grid place-items-center rounded-[8px] bg-[#222222] text-white transition-[opacity,transform] duration-500"
                style={{
                  opacity: on ? 1 : 0,
                  transform: on ? 'scale(1)' : 'scale(0.85)',
                  transitionTimingFunction: 'var(--ease-smooth)',
                }}
              >
                {s.icon}
              </span>
              <span aria-hidden="true">{s.icon}</span>
            </span>
            <div
              className="pt-1 transition-transform duration-700"
              style={{ transform: on ? 'none' : 'translateX(6px)', transitionTimingFunction: 'var(--ease-smooth)' }}
            >
              <p className="font-tight text-nav text-[#555555]">Schritt {i + 1}</p>
              <h2 className="mt-1 text-[1.75rem] leading-tight font-semibold tracking-[-0.04em] text-[#222222]">{s.title}</h2>
              <div className="mt-3 max-w-[60ch] leading-relaxed text-[#333333]">{s.text}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
