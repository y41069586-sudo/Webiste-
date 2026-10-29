import sandbox from './stripe-v4-sandbox.json';
import live from './stripe-v4-live.json';

/** Getrennte vorhandene Kataloge; Live benötigt die explizite Runtime-Freigabe. */
export function stripeV4Price(
  component: 'setup' | 'basis' | 'care_plus',
  testMode: boolean,
  amountCents: number,
  currency: string,
  allowLive = false,
): string {
  if (!testMode && !allowLive) throw new Error('V4 bleibt ohne ausdrückliche Live-Freigabe in der Stripe-Sandbox.');
  const catalog = testMode ? sandbox : live;
  const price = catalog.prices.find((p) => p.component === component);
  if (!price || price.livemode !== !testMode || price.amountCents !== amountCents || price.currency !== currency)
    throw new Error('V4-Bestellung stimmt nicht mit dem freigegebenen Preis der gewählten Stripe-Umgebung überein.');
  return price.priceId;
}
