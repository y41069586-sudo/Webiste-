'use client';
import { useActionState } from 'react';
import { paySetup } from '../actions';
export function PaymentForm({
  slug,
  fingerprint,
  options,
}: {
  slug: string;
  fingerprint: string;
  options: { plan: string; title: string; price: string; terms: string; includes: string }[];
}) {
  const [state, action, pending] = useActionState(paySetup.bind(null, slug), {});
  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="fingerprint" value={fingerprint} />
      <fieldset>
        <legend className="text-lg font-semibold">Wählen Sie Ihren Tarif</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {options.map((o) => (
            <label
              key={o.plan}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 bg-white p-5 has-checked:border-brand-600 has-checked:ring-2 has-checked:ring-brand-100"
            >
              <input type="radio" name="plan" value={o.plan} required className="mt-1 h-5 w-5 shrink-0" />
              <span>
                <strong className="block">{o.title}</strong>
                <span className="mt-2 block font-semibold">{o.price}</span>
                <span className="mt-2 block text-sm text-slate-700">{o.includes}</span>
                <span className="mt-3 block text-sm text-slate-600">{o.terms}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="b2b" required className="mt-1 h-4 w-4" />
        <span>Ich bestelle für mein Unternehmen.</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" required className="mt-1 h-4 w-4" />
        <span>
          Ich akzeptiere die{' '}
          <a href="/agb" target="_blank" rel="noopener noreferrer" className="underline">
            AGB
          </a>
          . Die{' '}
          <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="underline">
            Datenschutzhinweise
          </a>{' '}
          habe ich zur Kenntnis genommen.
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="subscription" required className="mt-1 h-4 w-4" />
        <span>
          Ich stimme dem gewählten Monatstarif ab bestätigtem Go-Live und der oben beschriebenen Zahlungsweise ausdrücklich zu.
        </span>
      </label>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
          {state.error}
        </p>
      ) : null}
      <p className="text-sm text-slate-600">
        Ihre Angaben und Einrichtung werden für die Bestellung übernommen. Im nächsten Schritt prüfen Sie die Zahlung bei Stripe.
        Erst die abschließende Zahlungsbestätigung löst die Bestellung aus; vor der Veröffentlichung prüfen und bestätigen Sie
        Ihre fertige Website.
      </p>
      <button disabled={pending} className="btn-site btn-primary w-full disabled:opacity-60">
        {pending ? 'Zahlung wird vorbereitet …' : 'Angaben übernehmen und weiter zur Zahlung'}
      </button>
      <a href={`/einrichten/${slug}`} className="block text-center text-sm underline">
        Zurück und Angaben bearbeiten
      </a>
    </form>
  );
}
