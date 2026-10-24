import Link from 'next/link';
import { getConfig } from '@wbm/core';
import { Check, DarkBand, PageIntro } from '@/components/site/section';
import { sitePricing } from '@/lib/site';

export const metadata = {
  title: 'Garantie',
  description: 'Zufriedenheitsgarantie: volle Erstattung ohne Begründung innerhalb der Frist nach dem Start.',
};

export default async function GuaranteePage() {
  const cfg = await getConfig();
  const p = sitePricing(cfg);
  if (!p.guarantee) {
    return (
      <PageIntro eyebrow="Garantie" title="Derzeit ohne Zufriedenheitsgarantie.">
        Sie sehen Ihren fertigen Entwurf, bevor Sie etwas bezahlen. Fragen beantworte ich gern über das Kontaktformular.
      </PageIntro>
    );
  }
  const g = p.guarantee;
  return (
    <>
      <PageIntro eyebrow="Garantie" title={`${g.days} Tage Zufriedenheitsgarantie.`}>
        Sind Sie mit Ihrer Website nicht zufrieden, bekommen Sie Ihr Geld zurück – vollständig und ohne Begründung.
      </PageIntro>
      <section className="mx-auto max-w-[90rem] px-5 sm:px-8 pb-10">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [
              'Wann sie beginnt',
              `Mit dem Tag, an dem Ihre Website online geht – spätestens ${g.latestStartDays} Tage nach Ihrer Zahlung.`,
            ],
            ['Was Sie tun müssen', 'Eine kurze Nachricht per E-Mail oder Kontaktformular innerhalb der Frist genügt.'],
            ['Was dann passiert', 'Wir erstatten den vollen Betrag. Die Seite geht offline, die Domain können Sie behalten.'],
          ].map(([t, d], i) => (
            <div
              key={t}
              data-reveal
              style={{ '--d': `${i * 100}ms` } as React.CSSProperties}
              className="card-site card-hover p-6"
            >
              <h2 className="text-[1.375rem] font-semibold tracking-[-0.04em] text-[#222222]">{t}</h2>
              <p className="mt-2 leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-[90rem] px-5 sm:px-8 py-12">
        <h2 data-reveal className="text-section text-[#222222]">
          Im Einzelnen
        </h2>
        <ul data-reveal className="mt-6 space-y-3 leading-relaxed text-slate-700">
          <Check>Einmalzahlung ({p.oneTime}): volle Erstattung des Betrags.</Check>
          {p.monthlyEnabled ? (
            <Check>
              Monatlich ({p.monthly}): Erstattung der ersten Rate, der Vertrag endet sofort – auch innerhalb der Mindestlaufzeit.
            </Check>
          ) : null}
          <Check>Ihre Domain: Sie bekommen den Code für den Umzug zu einem Anbieter Ihrer Wahl.</Check>
          <Check>Keine Gegenfragen, kein Formular, keine Bearbeitungsgebühr.</Check>
        </ul>
        <p data-reveal className="mt-6 text-sm text-slate-600">
          Die genauen Bedingungen stehen in den{' '}
          <Link href="/agb" className="text-[#222222] underline underline-offset-4">
            AGB
          </Link>
          .
        </p>
      </section>
      <DarkBand title="Risiko gering, Entwurf schon fertig." text="Sehen Sie sich an, wie ein Entwurf aussieht.">
        <Link href="/beispiele" className="btn-site btn-primary">
          Beispiele ansehen
        </Link>
        <Link href="/preise" className="btn-site btn-secondary">
          Preise
        </Link>
      </DarkBand>
    </>
  );
}
