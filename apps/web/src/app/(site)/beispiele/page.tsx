import Link from 'next/link';
import { ExamplesGrid } from '@/components/site/examples';
import { DarkBand, PageIntro } from '@/components/site/section';

export const metadata = { title: 'Beispiele', description: 'Beispiel-Websites für erfundene Musterbetriebe aus fünf Branchen.' };

export default function ExamplesPage() {
  return (
    <>
      <PageIntro eyebrow="Beispiele" title="So sieht ein Entwurf aus.">
        Alle Betriebe auf dieser Seite sind erfunden („… Muster“). Ihr Entwurf zeigt Ihren Betrieb mit Ihren öffentlich bekannten
        Angaben; Leistungen sind darin als Beispiel gekennzeichnet, bis Sie Ihre eigenen eintragen.
      </PageIntro>
      <section className="mx-auto max-w-[90rem] px-5 pb-20 sm:px-8 sm:pb-28">
        <ExamplesGrid />
        <p data-reveal className="mt-10 text-sm text-[#5b6475]">
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
