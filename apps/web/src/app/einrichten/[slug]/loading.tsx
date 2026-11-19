import { PublicShell } from '@/components/public/shell';

/** Sofort sichtbares Gerüst (19.11.2026, „smoother laden“): erscheint beim Klick, bis die Seite vom Server da ist. */
export default function Loading() {
  const bar = 'animate-pulse rounded-lg bg-slate-200/80';
  return (
    <PublicShell company="">
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Wird geladen …</span>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`${bar} h-2 flex-1`} />
          ))}
        </div>
        <div className={`${bar} mt-7 h-10 w-3/4`} />
        <div className={`${bar} mt-4 h-5 w-2/3`} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="card-site p-6">
              <div className={`${bar} h-5 w-1/3`} />
              <div className={`${bar} mt-5 h-10 w-1/2`} />
              <div className={`${bar} mt-4 h-4 w-5/6`} />
              <div className={`${bar} mt-2 h-4 w-2/3`} />
              <div className="mt-6 h-12 animate-pulse rounded-full bg-[#2f62f0]/25" />
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
