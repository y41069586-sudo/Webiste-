import { getSiteSources } from '@/lib/site-config';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Quellen',
  description: 'Quellen zu den Zahlen in unseren Briefen: Wortlaut, Herausgeber, Datum und Stichprobe.',
};

const day = (d: Date) => new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeZone: 'Europe/Berlin' }).format(d);

/** Öffentliche Quellenseite (Update 2, B5.5) – automatisch aus der Claims-Tabelle. */
export default async function QuellenPage() {
  const rows = await getSiteSources();
  return (
    <div className="mx-auto max-w-[90rem] px-5 py-14 sm:px-8 sm:py-24">
      <h1 className="text-hero max-w-[18ch] text-[#0f172a]">Quellen zu den Zahlen in unseren Briefen</h1>
      <p className="mt-3 max-w-[70ch] text-slate-700">
        In unseren Briefen verwenden wir nur Zahlen aus veröffentlichten Studien. Hier steht jede Aussage im Wortlaut, mit
        Herausgeber, Datum und Stichprobe. Die Zahlen beschreiben das Verhalten von Kundinnen und Kunden – sie sind kein
        Versprechen, dass eine Website mehr Umsatz bringt.
      </p>
      {rows.length === 0 ? (
        <p className="mt-8 rounded-[8px] bg-white p-7 text-[#3c4454]">
          Derzeit verwenden wir in unseren Briefen keine Statistiken.
        </p>
      ) : (
        <ol className="mt-8 space-y-4">
          {rows.map((c) => (
            <li key={c.id} id={c.id.toLowerCase()} className="rounded-[8px] bg-white p-7">
              <p className="max-w-[70ch] text-base text-slate-900">„{c.textDe}“</p>
              <dl className="mt-3 grid gap-1 text-sm text-slate-700">
                <div>
                  <dt className="inline font-medium">Quelle: </dt>
                  <dd className="inline">
                    {c.sourcePublisher}, „{c.sourceTitle}“,{' '}
                    <a className="text-brand-700 underline break-all" href={c.sourceUrl} rel="noreferrer noopener">
                      {c.sourceUrl}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium">Veröffentlicht: </dt>
                  <dd className="inline">{day(c.publishedAt)}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Stichprobe: </dt>
                  <dd className="inline">
                    {c.sample ? `${new Intl.NumberFormat('de-DE').format(c.sample)} Befragte` : '–'}
                    {c.population ? `, ${c.population}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium">Fußnote im Brief: </dt>
                  <dd className="inline">{c.footnoteDe}</dd>
                </div>
              </dl>
              {!c.inUse ? (
                <p className="mt-3 text-sm text-slate-600">Diese Angabe verwenden wir in neuen Briefen nicht mehr.</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
