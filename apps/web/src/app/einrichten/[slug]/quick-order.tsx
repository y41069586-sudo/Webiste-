'use client';
import { useActionState } from 'react';
import { quickOrder } from './actions';

export interface QuickOption {
  plan: string;
  title: string;
  price: string;
  dueNow: string;
}

/**
 * Schneller Weg vor dem langen Formular: Tarif wählen, auf der Bezahlseite nur die Bestelldaten angeben, alle Angaben
 * für die Website erst nach der Zahlung. Keine Vorauswahl; jeder Knopf nennt Tarif und heutigen Betrag.
 */
export function QuickOrder({ slug, options, preferred }: { slug: string; options: QuickOption[]; preferred?: string }) {
  const [state, action, pending] = useActionState(quickOrder.bind(null, slug), {});
  const sorted = [...options].sort((a, b) => Number(b.plan === preferred) - Number(a.plan === preferred));
  return (
    <section aria-labelledby="schnell" className="card-site mb-8 border-2 border-slate-900 p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">Schneller Weg · etwa 2 Minuten</p>
      <h2 id="schnell" className="mt-1 text-xl font-semibold">
        Jetzt bestellen, Angaben später ergänzen
      </h2>
      <p className="mt-2 text-sm text-slate-700">
        Sie müssen das Formular unten nicht vorher ausfüllen. Auf der sicheren Bezahlseite (Stripe) geben Sie nur Firmenname,
        Ansprechperson, E-Mail, Rechnungsadresse und Wunschdomain an. Impressum, Texte und Fotos ergänzen Sie danach in Ruhe über
        den Link in Ihrer Bestellbestätigung. Online geht Ihre Website erst nach Ihrer Freigabe.
      </p>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        {sorted.map((o) => (
          <button
            key={o.plan}
            type="submit"
            name="plan"
            value={o.plan}
            disabled={pending}
            className="rounded-lg bg-slate-900 px-4 py-3 text-left text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <strong className="block text-base">{o.title} bestellen</strong>
            <span className="mt-0.5 block text-sm text-slate-200">{o.price}</span>
            <span className="mt-1 block text-sm font-semibold">Heute fällig: {o.dueNow} · weiter zur Bezahlseite</span>
          </button>
        ))}
      </form>
      {state.error ? (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-slate-600">
        Verbindlich bestellen Sie erst auf der Bezahlseite, nachdem Sie dort Preis, Laufzeit und AGB gesehen und bestätigt haben.
        Bestellung nur für Unternehmer.
      </p>
    </section>
  );
}
