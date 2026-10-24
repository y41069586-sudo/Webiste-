import type { CSSProperties } from 'react';

const t = (ms: number) => ({ '--t': `${ms}ms` }) as CSSProperties;

/**
 * Hero-Collage: überlappende Beispiel-Websites in unterschiedlichen Größen (4px/8px Ecken, ohne Polster),
 * dazu ein Browser-Rahmen, in dem sich die Beispiel-Website eines erfundenen Cafés aufbaut.
 * Reines CSS, nur transform/opacity.
 */
export function HeroBuild() {
  return (
    <div
      className="relative mx-auto aspect-[5/4] w-full max-w-[44rem]"
      role="img"
      aria-label="Beispiel-Websites erfundener Betriebe, eine davon baut sich gerade auf"
    >
      {/* hinten rechts: Handwerk */}
      <div className="tile build-scale absolute top-0 right-0 w-[46%] rounded-[8px]" style={t(150)}>
        <img
          src="/beispiele/handwerk-karte.webp"
          alt=""
          width={720}
          height={450}
          className="block h-auto w-full"
          fetchPriority="high"
        />
      </div>
      {/* links oben: Beauty */}
      <div className="tile build-scale absolute top-[8%] left-0 w-[34%]" style={t(300)}>
        <img
          src="/beispiele/beauty-hoch.webp"
          alt=""
          width={420}
          height={525}
          className="block aspect-[3/4] h-auto w-full object-cover object-top"
        />
      </div>
      {/* unten rechts: Kurse */}
      <div className="tile build-scale absolute right-[4%] bottom-0 w-[30%] rounded-[8px]" style={t(450)}>
        <img
          src="/beispiele/kurse-hoch.webp"
          alt=""
          width={420}
          height={525}
          className="block aspect-[4/5] h-auto w-full object-cover object-top"
        />
      </div>
      {/* Mitte: Browser, in dem sich „Café Muster“ aufbaut */}
      <div
        className="build-scale absolute top-[22%] left-[16%] w-[62%] overflow-hidden rounded-[8px] bg-white shadow-[0_2px_15px_0_rgb(0_0_0/0.1)]"
        style={t(600)}
      >
        <div className="flex items-center gap-1.5 border-b border-[#eef0f4] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#e3e7ee]" />
          <span className="h-2 w-2 rounded-full bg-[#e3e7ee]" />
          <span className="h-2 w-2 rounded-full bg-[#e3e7ee]" />
          <span className="font-tight ml-2 truncate text-[0.65rem] text-[#5b6475]">cafe-muster.de</span>
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <span className="build flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#0f172a]" style={t(1100)}>
              <span className="h-4 w-4 rounded-full bg-[#5b3a29]" />
              Café Muster
            </span>
            <span className="build flex gap-1.5" style={t(1300)}>
              <span className="h-1.5 w-7 rounded-sm bg-[#e3e7ee]" />
              <span className="h-1.5 w-7 rounded-sm bg-[#e3e7ee]" />
            </span>
          </div>
          <div className="build relative mt-2.5 overflow-hidden rounded-[4px]" style={t(1500)}>
            <img src="/hero/cafetisch.webp" alt="" width={560} height={200} className="block h-24 w-full object-cover sm:h-28" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
            <p
              className="build absolute bottom-2.5 left-3 text-[0.85rem] font-semibold tracking-[-0.03em] text-white"
              style={t(1800)}
            >
              Zeit für eine Pause
            </p>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {['/hero/cappuccino.webp', '/hero/backwaren.webp', '/hero/cafetisch.webp'].map((src, i) => (
              <div key={i} className="build overflow-hidden rounded-[4px]" style={t(2050 + i * 140)}>
                <img src={src} alt="" width={160} height={90} className="block h-12 w-full object-cover sm:h-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Hinweis */}
      <div
        className="build font-tight absolute top-[13%] left-[20%] sm:top-[15%] flex items-center gap-2 rounded-[8px] border border-[#e3e7ee] bg-white px-3 py-2 text-[0.8rem] font-medium text-[#0f172a] shadow-[0_6px_22px_rgb(15_23_42/0.1)]"
        style={t(2600)}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Entwurf fertig · Beispiel
      </div>
    </div>
  );
}
