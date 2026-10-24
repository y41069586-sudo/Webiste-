import Link from 'next/link';
import { getConfig } from '@wbm/core';
import { DarkBand, ICONS, PageIntro } from '@/components/site/section';
import { Steps } from '@/components/site/steps';
import { sitePricing } from '@/lib/site';

export const metadata = {
  title: 'So funktioniert’s',
  description: 'Vom Brief über den fertigen Entwurf bis zur Website auf Ihrer eigenen Domain.',
};

export default async function HowPage() {
  const cfg = await getConfig();
  const p = sitePricing(cfg);
  return (
    <>
      <PageIntro eyebrow="So funktioniert’s" title="Vom Brief zur fertigen Website in drei Schritten.">
        Sie müssen nichts vorbereiten und keinen Termin machen. Den Entwurf gibt es schon, bevor wir uns kennen.
      </PageIntro>
      <section className="mx-auto max-w-[90rem] px-5 sm:px-8 pt-6 pb-10">
        <Steps
          steps={[
            {
              icon: ICONS.letter,
              title: 'Sie bekommen einen Brief',
              text: (
                <p>
                  Darin steckt ein QR-Code und eine kurze Adresse zu Ihrem Website-Entwurf. Wir schreiben nur per Post – keine
                  Anrufe, keine Werbe-E-Mails. Möchten Sie keine Post mehr, reicht ein Tipp auf „Kein Interesse“.
                </p>
              ),
            },
            {
              icon: ICONS.demo,
              title: 'Sie sehen sich Ihren Entwurf an',
              text: (
                <p>
                  Der Entwurf zeigt Ihren Betrieb mit den öffentlich bekannten Angaben – Name, Adresse, Öffnungszeiten. Leistungen
                  sind als Beispiel gekennzeichnet und werden später durch Ihre ersetzt. Der Entwurf ist nicht in Suchmaschinen zu
                  finden.
                </p>
              ),
            },
            {
              icon: ICONS.online,
              title: 'Ihre Website geht online',
              text: (
                <p>
                  Gefällt er Ihnen, wählen Sie „Seite übernehmen“ und eine der zwei Zahlweisen ({p.oneTime} einmalig
                  {p.monthlyEnabled ? ` oder ${p.monthly}/Monat` : ''}). Danach ergänzen Sie Ihre Angaben, sehen eine Vorschau,
                  und die Seite geht auf Ihrer eigenen Domain online.
                </p>
              ),
            },
          ]}
        />
      </section>
      <section className="mx-auto max-w-[90rem] px-5 sm:px-8 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['Ihre Angaben', 'Im Formular nach dem Kauf: Texte, Leistungen, Fotos, Impressum und Ihre Datenschutzerklärung.'],
            ['Vorschau und Änderungen', 'Sie sehen die fertige Seite vorab und haben bis zu zwei Änderungsrunden.'],
            ['Domain und Start', 'Wir registrieren Ihre Wunschdomain auf Ihren Namen und schalten die Seite frei.'],
          ].map(([t, d], i) => (
            <div key={t} data-reveal style={{ '--d': `${i * 100}ms` } as React.CSSProperties} className="card-site p-7">
              <h2 className="text-[1.375rem] font-semibold tracking-[-0.04em] text-[#222222]">{t}</h2>
              <p className="mt-2 leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <DarkBand title="Noch Fragen zum Ablauf?" text="Ich antworte persönlich, meist am selben Werktag.">
        <Link href="/kontakt" className="btn-site btn-primary">
          Frage stellen
        </Link>
        <Link href="/preise" className="btn-site btn-secondary">
          Zu den Preisen
        </Link>
      </DarkBand>
    </>
  );
}
