import type { LetterData } from '@wbm/templates/letter-types';
import type { AppConfig } from '../config/settings';
import { priceTaxSuffix } from '../invoices/build';
import { formatEuroShort } from '../util/time';
import type { LetterVariantContent } from './variants';

export interface RecipientInput {
  businessName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
}

const MAX_LINE = 45;

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.map((l) => (l.length > max ? `${l.slice(0, max - 1)}.` : l));
}

/**
 * Anschrift nach DIN 5008 / Deutsche Post: „An das Team von {Firmenname}“, darunter
 * Straße Hausnummer und „PLZ Ort“ (letzte Zeile, ohne Land), keine Leerzeilen, max. 5 Zeilen.
 */
export function recipientLines(r: RecipientInput): string[] {
  const head = `An das Team von ${r.businessName.trim()}`;
  const nameLines = head.length <= MAX_LINE ? [head] : ['An das Team von', ...wrap(r.businessName.trim(), MAX_LINE).slice(0, 2)];
  return [...nameLines, `${r.street.trim()} ${r.houseNumber.trim()}`, `${r.postalCode.trim()} ${r.city.trim()}`];
}

export function fillPlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k]! : m));
}

const LOWER_START = /^(Wer|Wir|Ich|Vor|Deshalb|Mit|Seit|Gern|Gerne|Heute|Kürzlich|Als|Da|Damit|Weil)\b/;

/** Nach der Anrede mit Komma beginnt der Text klein (außer Höflichkeitsform/Substantiv). */
export function lowerFirstWord(text: string): string {
  return text.replace(LOWER_START, (w) => w.charAt(0).toLowerCase() + w.slice(1));
}

export interface ComposeInput {
  variant: LetterVariantContent;
  cfg: AppConfig;
  recipient: RecipientInput;
  domain: string | null;
  rating: { rating: number; count: number } | null;
  compositeDataUri: string | null;
  qrDataUri: string;
  shortUrl: string;
  dateLine: string;
  privacyNotice: string;
  objectionNotice: string;
  /** Option A, z. B. „590 €“ */
  priceLabel: string;
  /** „online bis …“ (formatiertes Datum) */
  expiresLabel: string;
  screenshotPage?: LetterData['screenshotPage'];
  /** Quellenangaben der eingesetzten Claims (Slot-Varianten) */
  footnotes?: string[];
}

/** Beide Preisoptionen in einem Satzteil – die Mindestlaufzeit steht immer direkt neben der Monatsrate. */
export function pricesPhrase(cfg: AppConfig, oneTimeLabel: string): string {
  const p = cfg.pricing;
  const tax = priceTaxSuffix(cfg);
  const t = tax ? ` ${tax}` : '';
  if (!p.monthlyEnabled) return `einmalig **${oneTimeLabel}**${t}`;
  return `**${oneTimeLabel} einmalig** oder **${formatEuroShort(p.monthlyCents)} pro Monat** (${p.minTermMonths} Monate Mindestlaufzeit)${tax ? `, jeweils ${tax}` : ''}`;
}

export function guaranteeSentence(cfg: AppConfig): string {
  if (!cfg.guarantee.enabled) return '';
  return `Gefällt sie Ihnen nach dem Kauf nicht, gibt es ${cfg.guarantee.days} Tage lang das Geld zurück.`;
}

function composeVars(i: ComposeInput): Record<string, string> {
  return {
    firmenname: i.recipient.businessName,
    preis: i.priceLabel,
    preise: pricesPhrase(i.cfg, i.priceLabel),
    preis_monat: formatEuroShort(i.cfg.pricing.monthlyCents),
    mindestlaufzeit: String(i.cfg.pricing.minTermMonths),
    preis_pflege: formatEuroShort(i.cfg.pricing.subscriptionCents),
    garantie_satz: guaranteeSentence(i.cfg),
    ablaufdatum: i.expiresLabel,
    domain_vorschlag: i.domain ?? '',
    ablauf_tage: String(i.cfg.timing.demoExpiryDays),
    hosting_monate: String(i.cfg.pricing.hostingMonthsIncluded),
    absender_name: i.cfg.sender.name,
    rating: i.rating ? i.rating.rating.toFixed(1).replace('.', ',') : '',
    rating_count: i.rating ? String(i.rating.count) : '',
  };
}

/**
 * Ausgefüllte Platzhalter, die Ziffern enthalten dürfen (für den Wahrheits-Check): Firmenname, Domain,
 * Datum, Preise, Garantie, Absender und – nur mit USE_RATING_IN_LETTER – der Bewertungssatz.
 */
export function placeholderValues(i: ComposeInput): string[] {
  const vars = composeVars(i);
  const keys = ['firmenname', 'domain_vorschlag', 'ablaufdatum', 'preise', 'garantie_satz', 'absender_name'];
  const out = keys.map((k) => vars[k]!).filter(Boolean);
  if (i.rating && i.variant.ratingSentence) out.push(fillPlaceholders(i.variant.ratingSentence, vars));
  return out;
}

export function composeLetter(i: ComposeInput): LetterData {
  const vars = composeVars(i);
  const v = i.variant;
  const first = [i.rating && v.ratingSentence ? fillPlaceholders(v.ratingSentence, vars) : '', fillPlaceholders(v.hook, vars)]
    .filter(Boolean)
    .join(' ');
  const intro = [lowerFirstWord(first), ...v.intro.map((p) => fillPlaceholders(p, vars))].filter(Boolean);
  return {
    sender: {
      name: i.cfg.sender.name,
      company: i.cfg.sender.company,
      street: i.cfg.sender.street,
      postalCode: i.cfg.sender.postalCode,
      city: i.cfg.sender.city,
      email: i.cfg.sender.email,
      phone: i.cfg.sender.phone,
      website: i.cfg.sender.website,
    },
    recipientLines: recipientLines(i.recipient),
    dateLine: i.dateLine,
    subject: fillPlaceholders(v.subject, vars),
    greeting: fillPlaceholders(v.greeting, vars),
    intro,
    compositeDataUri: i.compositeDataUri,
    qrDataUri: i.qrDataUri,
    qrCaption: fillPlaceholders(v.qrCaption, vars),
    shortUrl: i.shortUrl,
    offer: fillPlaceholders(i.domain ? v.offerWithDomain : v.offerWithoutDomain, vars).trim(),
    noAction: fillPlaceholders(v.noAction, vars),
    closing: v.closing,
    signatureName: i.cfg.sender.name,
    privacyNotice: i.privacyNotice,
    objectionNotice: i.objectionNotice,
    footnotes: i.footnotes?.length ? i.footnotes : undefined,
    addressPosition: i.cfg.letter.addressPosition,
    screenshotPage: i.screenshotPage ?? null,
  };
}
