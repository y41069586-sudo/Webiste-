import { formatEuroShort } from '../util/time';

/** Versioned new-customer offer. Legacy pricing remains in cfg.pricing unchanged. */
export const V4_TIERS = ['basis', 'care_plus'] as const;
export type V4Tier = (typeof V4_TIERS)[number];
export interface V4OfferSnapshot {
  version: 'v4';
  tier: V4Tier;
  setupCents: number;
  monthlyCents: number;
  minTermMonths: 0;
  billingStart: 'confirmed_go_live';
  includedChangeMinutes: number;
  consentVersion: string;
  consentAt: string | null;
  billingMode?: 'saved_mandate' | 'manual_checkout';
}
export const V4_PRICES = { setupCents: 59700, basisCents: 1900, carePlusCents: 9900 } as const;
export function isV4Tier(plan: string): plan is V4Tier {
  return V4_TIERS.includes(plan as V4Tier);
}
export function v4Offer(
  tier: V4Tier,
  consentAt: string | null = null,
  billingMode: V4OfferSnapshot['billingMode'] = 'saved_mandate',
): V4OfferSnapshot {
  return {
    version: 'v4',
    tier,
    setupCents: V4_PRICES.setupCents,
    monthlyCents: tier === 'basis' ? V4_PRICES.basisCents : V4_PRICES.carePlusCents,
    minTermMonths: 0,
    billingStart: 'confirmed_go_live',
    includedChangeMinutes: tier === 'care_plus' ? 60 : 0,
    consentVersion: billingMode === 'saved_mandate' ? 'v4-mandate-2026-10-25' : 'v4-2026-10-25',
    consentAt,
    billingMode,
  };
}
export function v4FirstYearCents(tier: V4Tier): number {
  const o = v4Offer(tier);
  return o.setupCents + o.monthlyCents * 12;
}
export function v4PriceText(): string {
  return '597 € einmalig + wahlweise 19 €/Monat (Basis) oder insgesamt 99 €/Monat (Care+) ab Go-Live. Monatlich kündbar.';
}
/** Exact selected contract, also visible when both tiers share the same one-time Stripe price. */
export function v4CheckoutTerms(tier: V4Tier, billingMode: V4OfferSnapshot['billingMode'] = 'saved_mandate'): string {
  const offer = v4Offer(tier);
  return `Sie wählen SeitenWerk ${tier === 'basis' ? 'Basis' : 'Care+'}: jetzt ${formatEuroShort(offer.setupCents)} einmalig für die Einrichtung. Danach insgesamt ${formatEuroShort(offer.monthlyCents)}/Monat, ab dem bestätigten Go-Live. ${billingMode === 'saved_mandate' ? 'Mit dem Kauf stimmen Sie dem wiederkehrenden Einzug über das bei Stripe gespeicherte Zahlungsmittel ausdrücklich zu.' : 'Der Monatstarif wird nach Go-Live in einem gesonderten Abo-Checkout bestätigt.'} Monatlich kündbar, keine zwölfmonatige Mindestbindung und keine zusätzliche Basisgebühr.`;
}
/** No session/mandate/Go-Live inference: missing evidence always blocks monthly billing. */
export function assertV4BillingReady(input: {
  offer: V4OfferSnapshot;
  paid: boolean;
  liveAt: Date | null;
  now?: Date;
  cancelled?: boolean;
}) {
  const now = input.now ?? new Date();
  const consentAt = input.offer.consentAt ? new Date(input.offer.consentAt) : null;
  if (
    !input.paid ||
    input.cancelled ||
    !consentAt ||
    !Number.isFinite(consentAt.getTime()) ||
    consentAt > now ||
    !input.liveAt ||
    input.liveAt > now
  )
    throw new Error('Monatsabrechnung erfordert Zahlung, ausdrückliche Zustimmung und bestätigten Go-Live.');
  if (!Number.isFinite(input.liveAt.getTime())) throw new Error('Ungültiger Go-Live-Zeitpunkt.');
  return { amountCents: input.offer.monthlyCents, startsAt: input.liveAt, idempotencySuffix: `v4-${input.offer.tier}` };
}
export interface V4SwitchRequest {
  from: V4Tier;
  to: V4Tier;
  confirmedAt: string;
  effectiveAt: string;
  proration: 'none';
}
/** Prepare only: never starts a second subscription or silently prorates a contract. */
export function prepareV4Switch(from: V4Tier, to: V4Tier, periodEndsAt: Date, confirmedAt: Date): V4SwitchRequest {
  if (from === to || periodEndsAt <= confirmedAt || !Number.isFinite(periodEndsAt.getTime()))
    throw new Error('Ungültiger Tarifwechsel.');
  return { from, to, confirmedAt: confirmedAt.toISOString(), effectiveAt: periodEndsAt.toISOString(), proration: 'none' };
}
