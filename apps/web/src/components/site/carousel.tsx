'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Karussell mit Swipe (native Scroll-Physik auf Touch) und Maus-Drag mit Momentum.
 * Nur scrollLeft/transform – keine Layout-Animationen.
 */
export function Carousel({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastT = 0;
    let v = 0;
    let raf = 0;
    let moved = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      down = true;
      moved = false;
      cancelAnimationFrame(raf);
      startX = lastX = e.clientX;
      startScroll = el.scrollLeft;
      lastT = performance.now();
      v = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4 && !moved) {
        moved = true;
        el.classList.add('is-dragging');
        el.setPointerCapture(e.pointerId);
      }
      if (!moved) return;
      el.scrollLeft = startScroll - dx;
      const now = performance.now();
      v = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX;
      lastT = now;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      if (!moved) return;
      let vel = -v * 16;
      const step = () => {
        vel *= 0.94;
        el.scrollLeft += vel;
        if (Math.abs(vel) > 0.4) raf = requestAnimationFrame(step);
        else el.classList.remove('is-dragging');
      };
      raf = requestAnimationFrame(step);
    };
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClick, true);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClick, true);
    };
  }, []);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 320) + 20), behavior: 'smooth' });
  };
  return (
    <div className="relative">
      <div
        ref={ref}
        role="region"
        aria-roledescription="Karussell"
        aria-label={label}
        tabIndex={0}
        className="carousel -mx-5 flex cursor-grab gap-4 overflow-x-auto px-5 pb-2 select-none sm:-mx-8 sm:px-8"
      >
        {children}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="btn-site btn-secondary btn-compact !min-h-11 !w-11 !p-0"
          aria-label="Zurück"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="btn-site btn-primary btn-compact !min-h-11 !w-11 !p-0"
          aria-label="Weiter"
        >
          →
        </button>
      </div>
    </div>
  );
}
