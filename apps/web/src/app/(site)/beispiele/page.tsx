import Link from 'next/link';
import { ExamplesCarousel } from '@/components/site/examples';
import { DarkBand, PageIntro } from '@/components/site/section';
import { INDUSTRY_EXAMPLES } from '@/lib/site';

export const metadata = { title: 'Beispiele', description: 'Beispiel-Websites für erfundene Musterbetriebe aus fünf Branchen.' };

export default function ExamplesPage() {
  return (
    <>
      <PageIntro eyebrow="Beispiele" title="So sieht ein Entwurf aus.">
        Alle Betriebe auf dieser Seite sind erfunden („… Muster“). Ihr Entwurf zeigt Ihren Betrieb mit Ihren öffentlich bekannten
        Angaben; Leistungen sind darin als Beispiel gekennzeichnet, bis Sie Ihre eigenen eintragen.
      </PageIntro>
      <section className="mx-auto max-w-[90rem] px-5 sm:px-8 pb-10">
        <ExamplesCarousel />
      </section>
      <section className="mx-auto max-w-[90rem] px-5 sm:px-8 py-16">
        <h2 data-reveal className="text-section text-[#222222]">
          Was je Branche dazugehört
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRY_EXAMPLES.map((ex, i) => (
            <div key={ex.id} data-reveal style={{ '--d': `${(i % 3) * 90}ms` } as React.CSSProperties} className="card-site p-7">
              <p className="font-tight text-nav text-[#555555]">{ex.label}</p>
              <p className="mt-2 leading-relaxed text-slate-700">{ex.hook}</p>
            </div>
          ))}
        </div>
        <p data-reveal className="mt-6 text-sm text-slate-600">
          Fotos in den Beispielen sind lizenzfreie Symbolbilder. In Ihrer Website stehen nur Ihre eigenen Fotos.
        </p>
      </section>
      <DarkBand
        title="Ihr Betrieb hat noch keine Website?"
        text="Schreiben Sie mir – oder warten Sie auf Post mit Ihrem Entwurf."
      >
        <Link href="/kontakt" className="btn-site btn-primary">
          Kontakt
        </Link>
      </DarkBand>
    </>
  );
}
