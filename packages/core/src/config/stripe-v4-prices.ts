import catalog from './stripe-v4-sandbox.json';

/** Only the explicitly provisioned sandbox catalog. Live selling needs a separately reviewed catalog. */
export function stripeV4Price(
  component: 'setup' | 'basis' | 'care_plus',
  testMode: boolean,
  amountCents: number,
  currency: string,
): string {
  if (!testMode) throw new Error('V4-Checkout ist bisher ausschließlich für die Stripe-Sandbox eingerichtet.');
  const price = catalog.prices.find((p) => p.component === component);
  if (!price || price.livemode || price.amountCents !== amountCents || price.currency !== currency)
    throw new Error('V4-Bestellung stimmt nicht mit dem freigegebenen Sandbox-Preis überein.');
  return price.priceId;
}
