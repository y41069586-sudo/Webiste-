import { getSiteConfig } from '@/lib/site-config';
import { getEnv } from '@wbm/core';
import { PageIntro } from '@/components/site/section';
import { ContactForm } from './contact-form';

export const metadata = { title: 'Kontakt', description: 'Fragen zum Entwurf, zum Ablauf oder zu den Preisen.' };

export default async function ContactPage() {
  const cfg = await getSiteConfig();
  const s = cfg.sender;
  // Statischer Export (Netlify): kein Server für das Formular – dann nur die direkten Wege
  const formOn = !getEnv().SITE_STATIC;
  return (
    <>
      <PageIntro eyebrow="Kontakt" title="Schreiben Sie mir.">
        Fragen zum Entwurf, zum Ablauf oder zu den Preisen – ich antworte persönlich.
      </PageIntro>
      <section className={`mx-auto grid gap-8 px-5 pb-24 ${formOn ? 'max-w-6xl lg:grid-cols-[1.5fr_1fr]' : 'max-w-3xl'}`}>
        {formOn ? (
          <div data-reveal>
            <ContactForm />
          </div>
        ) : null}
        <aside data-reveal style={{ '--d': '100ms' } as React.CSSProperties} className="space-y-4">
          <div className="card-site p-7">
            <h2 className="font-semibold tracking-[-0.03em] text-[#0f172a]">Direkt</h2>
            <ul className="mt-3 space-y-2 text-slate-700">
              <li>
                <a href={`mailto:${s.email}`} className="text-[#0f172a] underline underline-offset-4">
                  {s.email}
                </a>
              </li>
              {s.phone ? <li>{s.phone}</li> : null}
              {s.whatsappNumber ? (
                <li>
                  <a
                    href={`https://wa.me/${s.whatsappNumber}?text=${encodeURIComponent('Frage zu Ihren Websites')}`}
                    className="text-[#0f172a] underline underline-offset-4"
                    rel="noopener"
                  >
                    Frage per WhatsApp
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
          <div className="card-site p-7 text-sm leading-relaxed text-slate-600">
            <h2 className="font-semibold tracking-[-0.03em] text-[#0f172a]">Keine Post mehr?</h2>
            <p className="mt-2">
              Scannen Sie den Code in Ihrem Brief und tippen Sie auf „Kein Interesse“ – oder schreiben Sie kurz an {s.email}. Ihre
              Daten werden dann gelöscht.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}
