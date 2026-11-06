import { formatEuroShort } from '../util/time';

/** Versioned new-customer offer. Legacy pricing remains in cfg.pricing unchanged. */
export const V4_TIERS = ['basis', 'care_plus', 'komplett'] as const;
export type V4Tier = (typeof V4_TIERS)[number];
export interface V4OfferSnapshot {
  version: 'v4';
  tier: V4Tier;
  setupCents: number;
  monthlyCents: number;
  /** 0 = monatlich kündbar; „Komplett“ 12 Monate ab erster Abbuchung */
  minTermMonths: number;
  /**
   * Bezugspunkt der ersten Abbuchung: bestätigter Go-Live (Basis/Care+, ältere Komplett-Bestellungen) oder die
   * Bestellung selbst (Komplett seit 06.11.2026, Betreiber: „direkt nach Abo 0 Euro … dann nach 7 Tagen“).
   */
  billingStart: 'confirmed_go_live' | 'order';
  /** Erste Abbuchung so viele Tage nach dem Bezugspunkt (Komplett: 7 Tage nach der Bestellung) */
  billingDelayDays?: number;
  includedChangeMinutes: number;
  consentVersion: string;
  consentAt: string | null;
  billingMode?: 'saved_mandate' | 'manual_checkout';
}
export const V4_PRICES = { setupCents: 59700, basisCents: 1900, carePlusCents: 9900, komplettCents: 17900 } as const;
/**
 * „Komplett“ (06.11.2026, Betreiber): 0 € Einrichtung, 179 €/Monat, 12 Monate Mindestlaufzeit ab erster Abbuchung,
 * danach 179 € monatlich kündbar. Erste Abbuchung 7 Tage nach der Bestellung (seit 06.11.2026 abends; vorher nach
 * Go-Live – solche Bestellungen behalten ihren Snapshot). Enthält alles aus Care+.
 */
export const KOMPLETT_TERMS = { minTermMonths: 12, billingDelayDays: 7, includedChangeMinutes: 60 } as const;
export const KOMPLETT_CONSENT_VERSION = 'v4-komplett-2026-11-06b';
/** Satz aus den AGB, an dem erkennbar ist, dass die übernommene Fassung die aktuelle Komplett-Abbuchung enthält. */
export const KOMPLETT_AGB_MARKER = 'Tage nach der Bestellung abgebucht';
/** Komplett darf nur bestellt werden, wenn die übernommenen AGB die aktuelle Abbuchungsregel enthalten. */
export function komplettTermsCurrent(cfg: { legal?: { termsMarkdown?: string } }): boolean {
  return Boolean(cfg.legal?.termsMarkdown?.includes(KOMPLETT_AGB_MARKER));
}
export const V4_TIER_LABEL: Record<V4Tier, string> = { basis: 'Basis', care_plus: 'Care+', komplett: 'Komplett' };
export function v4TierLabel(tier: V4Tier): string {
  return V4_TIER_LABEL[tier];
}
/** Für Neukunden angebotene Tarife: mit „Komplett“ ersetzt er Care+ (Betreiberentscheidung 06.11.2026). */
export function v4OfferedTiers(cfg: { offers?: { komplettEnabled?: boolean } }): V4Tier[] {
  return cfg.offers?.komplettEnabled ? ['basis', 'komplett'] : ['basis', 'care_plus'];
}
export function isV4Tier(plan: string): plan is V4Tier {
  return V4_TIERS.includes(plan as V4Tier);
}
export function v4Offer(
  tier: V4Tier,
  consentAt: string | null = null,
  billingMode: V4OfferSnapshot['billingMode'] = 'saved_mandate',
): V4OfferSnapshot {
  if (tier === 'komplett')
    return {
      version: 'v4',
      tier,
      setupCents: 0,
      monthlyCents: V4_PRICES.komplettCents,
      minTermMonths: KOMPLETT_TERMS.minTermMonths,
      billingStart: 'order',
      billingDelayDays: KOMPLETT_TERMS.billingDelayDays,
      includedChangeMinutes: KOMPLETT_TERMS.includedChangeMinutes,
      consentVersion: KOMPLETT_CONSENT_VERSION,
      consentAt,
      // Ohne Einrichtungszahlung gibt es nur den Weg über das gespeicherte Zahlungsmittel
      billingMode: 'saved_mandate',
    };
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
export function v4PriceText(cfg: { offers?: { komplettEnabled?: boolean } } = {}): string {
  return cfg.offers?.komplettEnabled
    ? 'Basis: 597 € einmalig + 19 €/Monat ab Go-Live, monatlich kündbar. Oder Komplett: 0 € Einrichtung, 179 €/Monat, erste Zahlung 7 Tage nach der Bestellung, 12 Monate Mindestlaufzeit, danach monatlich kündbar.'
    : '597 € einmalig + wahlweise 19 €/Monat (Basis) oder insgesamt 99 €/Monat (Care+) ab Go-Live. Monatlich kündbar.';
}
/** Exact selected contract, also visible when both tiers share the same one-time Stripe price. */
export function v4CheckoutTerms(tier: V4Tier, billingMode: V4OfferSnapshot['billingMode'] = 'saved_mandate'): string {
  const offer = v4Offer(tier);
  if (tier === 'komplett')
    return `Sie wählen SeitenWerk Komplett: jetzt 0 € – es wird nichts abgebucht. Sie hinterlegen nur Ihr Zahlungsmittel. ${formatEuroShort(offer.monthlyCents)}/Monat, erste Abbuchung ${KOMPLETT_TERMS.billingDelayDays} Tage nach Ihrer Bestellung – unabhängig davon, wann Ihre Website online geht. Mindestlaufzeit ${KOMPLETT_TERMS.minTermMonths} Monate ab der ersten Abbuchung, danach monatlich kündbar. Mit der Bestellung stimmen Sie dem wiederkehrenden Einzug über das bei Stripe gespeicherte Zahlungsmittel ausdrücklich zu.`;
  return `Sie wählen SeitenWerk ${v4TierLabel(tier)}: jetzt ${formatEuroShort(offer.setupCents)} einmalig für die Einrichtung. Danach insgesamt ${formatEuroShort(offer.monthlyCents)}/Monat, ab dem bestätigten Go-Live. ${billingMode === 'saved_mandate' ? 'Mit dem Kauf stimmen Sie dem wiederkehrenden Einzug über das bei Stripe gespeicherte Zahlungsmittel ausdrücklich zu.' : 'Der Monatstarif wird nach Go-Live in einem gesonderten Abo-Checkout bestätigt.'} Monatlich kündbar, keine zwölfmonatige Mindestbindung und keine zusätzliche Basisgebühr.`;
}
/** No session/mandate/Go-Live inference: missing evidence always blocks monthly billing. */
export function assertV4BillingReady(input: {
  offer: V4OfferSnapshot;
  paid: boolean;
  liveAt: Date | null;
  /** Zeitpunkt der bestätigten Bestellung (Bezugspunkt bei billingStart „order“) */
  paidAt?: Date | null;
  now?: Date;
  cancelled?: boolean;
}) {
  const now = input.now ?? new Date();
  const consentAt = input.offer.consentAt ? new Date(input.offer.consentAt) : null;
  if (input.offer.billingStart === 'order') {
    const paidAt = input.paidAt ?? null;
    if (
      !input.paid ||
      input.cancelled ||
      !consentAt ||
      !Number.isFinite(consentAt.getTime()) ||
      consentAt > now ||
      !paidAt ||
      !Number.isFinite(paidAt.getTime()) ||
      paidAt > now
    )
      throw new Error('Monatsabrechnung erfordert bestätigte Bestellung mit Zahlungsmittel und ausdrückliche Zustimmung.');
    return {
      amountCents: input.offer.monthlyCents,
      startsAt: new Date(paidAt.getTime() + (input.offer.billingDelayDays ?? 0) * 86_400_000),
      idempotencySuffix: `v4-${input.offer.tier}`,
    };
  }
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
  const delay = input.offer.billingDelayDays ?? 0;
  return {
    amountCents: input.offer.monthlyCents,
    startsAt: new Date(input.liveAt.getTime() + delay * 86_400_000),
    idempotencySuffix: `v4-${input.offer.tier}`,
  };
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
