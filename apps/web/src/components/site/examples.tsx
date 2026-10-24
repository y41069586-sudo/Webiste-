import { INDUSTRY_EXAMPLES } from '@/lib/site';
import { Carousel } from './carousel';

/** Beispiel-Websites je Branche als Bildkacheln ohne Polster – fiktive Betriebe, klar als Beispiel markiert. */
export function ExamplesCarousel() {
  return (
    <Carousel label="Beispiel-Websites je Branche">
      {INDUSTRY_EXAMPLES.map((ex, i) => (
        <figure key={ex.id} className="w-[82%] shrink-0 sm:w-[30rem]">
          <div className={`tile relative aspect-[16/10] ${i % 2 ? 'rounded-[8px]' : ''}`}>
            <img
              src={`/beispiele/${ex.id}-karte.webp`}
              alt={`Beispiel-Website für einen erfundenen Betrieb „${ex.name}“ (${ex.label})`}
              width={720}
              height={450}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="block h-full w-full object-cover object-top"
            />
            <span className="font-tight absolute top-3 left-3 rounded-[4px] bg-white px-2 py-1 text-xs font-medium text-[#222222]">
              Beispiel
            </span>
          </div>
          <figcaption className="mt-4 flex items-baseline justify-between gap-4">
            <span className="text-strong text-[#222222]">{ex.name}</span>
            <span className="font-tight text-nav text-[#555555]">{ex.label}</span>
          </figcaption>
          <p className="mt-1 text-sm text-[#555555]">{ex.hook}</p>
        </figure>
      ))}
    </Carousel>
  );
}
