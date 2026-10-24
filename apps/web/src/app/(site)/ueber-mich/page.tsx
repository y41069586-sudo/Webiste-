import Link from 'next/link';
import { getConfig } from '@wbm/core';
import { brandName } from '@/lib/site';
import { DarkBand, PageIntro } from '@/components/site/section';

export const metadata = { title: 'Über mich', description: 'Wer hinter den Website-Entwürfen steht.' };

export default async function AboutPage() {
  const cfg = await getConfig();
  const s = cfg.sender;
  const brand = brandName(s.company);
  // Platzhalter aus der Grundkonfiguration nicht als Personennamen zeigen
  const person = /vorname\s+nachname/i.test(s.name) || !s.name.trim() ? null : s.name;
  const initials = (person ?? brand)
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  return (
    <>
      <PageIntro eyebrow="Über mich" title={person ? `Hallo, ich bin ${person}.` : `Hallo, hier ist ${brand}.`}>
        {s.intro ||
          `Ich baue Websites für lokale Betriebe in ${s.city}. Sie sprechen direkt mit mir – vom Entwurf bis zum Start Ihrer Seite.`}
      </PageIntro>
      <section className="mx-auto max-w-[90rem] px-5 sm:px-8 pb-12">
        <div className="grid gap-8 md:grid-cols-[18rem_1fr]">
          <div data-reveal className="card-site self-start overflow-hidden">
            {s.photoUrl ? (
              <img
                src={s.photoUrl}
                alt={`Foto von ${person ?? brand}`}
                width={576}
                height={720}
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div
                className="grid aspect-[4/5] place-items-center bg-brand-50 text-5xl font-semibold text-brand-700"
                aria-hidden="true"
              >
                {initials}
              </div>
            )}
          </div>
          <div data-reveal style={{ '--d': '100ms' } as React.CSSProperties} className="space-y-6">
            <div className="card-site p-7">
              <h2 className="text-[1.375rem] font-semibold tracking-[-0.04em] text-[#0f172a]">So arbeite ich</h2>
              <ul className="mt-3 space-y-2 leading-relaxed text-slate-600">
                <li>Ich schreibe nur per Post. Keine Anrufe, keine Werbe-E-Mails, keine Nachrichten über Messenger.</li>
                <li>Jeder Entwurf entsteht mit öffentlich bekannten Angaben – keine erfundenen Bewertungen oder Referenzen.</li>
                <li>Zahlen in meinen Briefen stammen aus veröffentlichten Studien. Die Quellen stehen auf der Quellenseite.</li>
              </ul>
            </div>
            <div className="card-site p-7">
              <h2 className="text-[1.375rem] font-semibold tracking-[-0.04em] text-[#0f172a]">Kontakt</h2>
              <dl className="mt-3 grid gap-2 text-slate-700 sm:grid-cols-[8rem_1fr]">
                <dt className="text-slate-500">Firma</dt>
                <dd>{brand}</dd>
                <dt className="text-slate-500">Anschrift</dt>
                <dd>
                  {s.street}, {s.postalCode} {s.city}
                </dd>
                <dt className="text-slate-500">E-Mail</dt>
                <dd>
                  <a href={`mailto:${s.email}`} className="text-[#0f172a] underline underline-offset-4">
                    {s.email}
                  </a>
                </dd>
                {s.phone ? (
                  <>
                    <dt className="text-slate-500">Telefon</dt>
                    <dd>{s.phone}</dd>
                  </>
                ) : null}
              </dl>
              <p className="mt-4 text-sm">
                <Link href="/impressum" className="text-[#0f172a] underline underline-offset-4">
                  Impressum
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
      <DarkBand title="Lieber direkt fragen?" text="Ich antworte persönlich.">
        <Link href="/kontakt" className="btn-site btn-primary">
          Kontakt
        </Link>
      </DarkBand>
    </>
  );
}
