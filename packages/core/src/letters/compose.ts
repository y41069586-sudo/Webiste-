import {
  letterBranchBenefit,
  personalizedLetterCopy,
  reviewedLetterDetails,
  type VerifiedLetterContext,
} from './personalization';
import { v4Offer, v4PriceText } from '../services/offers-v4';
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
  if (lines.some((l) => l.length > max))
    throw new Error('Anschrift enthält ein zu langes Wort; manuelle Formatierung erforderlich.');
  return lines;
}

/**
 * Anschrift nach DIN 5008 / Deutsche Post: „An das Team von {Firmenname}“, darunter
 * Straße Hausnummer und „PLZ Ort“ (letzte Zeile, ohne Land), keine Leerzeilen, max. 5 Zeilen.
 */
export function recipientLines(r: RecipientInput): string[] {
  const name = r.businessName.trim();
  if (!name) throw new Error('Firmenname fehlt; Anschrift prüfen.');
  const head = `An das Team von ${name}`;
  const wrapped = wrap(name, MAX_LINE);
  const nameLines = head.length <= MAX_LINE ? [head] : wrapped.length <= 2 ? ['An das Team von', ...wrapped] : wrapped;
  const street = `${r.street.trim()} ${r.houseNumber.trim()}`;
  const city = `${r.postalCode.trim()} ${r.city.trim()}`;
  if (nameLines.length > 3 || street.length > MAX_LINE || city.length > MAX_LINE)
    throw new Error('Anschrift passt nicht vollständig ins Adressfenster; manuelle Prüfung erforderlich.');
  return [...nameLines, street, city];
}

export function fillPlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k]! : m));
}

const LOWER_START = /^(Wer|Wir|Ich|Vor|Deshalb|Mit|Seit|So|Gern|Gerne|Heute|Kürzlich|Als|Da|Damit|Weil)\b/;

/** Nach der Anrede mit Komma beginnt der Text klein (außer Höflichkeitsform/Substantiv). */
export function lowerFirstWord(text: string): string {
  return text.replace(LOWER_START, (w) => w.charAt(0).toLowerCase() + w.slice(1));
}

export interface ComposeInput {
  variant: LetterVariantContent;
  cfg: AppConfig;
  recipient: RecipientInput;
  /** Verified branch label only; never infer private facts or actual service promises. */
  branchLabel?: string;
  personalization?: VerifiedLetterContext;
  domain: string | null;
  rating: { rating: number; count: number } | null;
  compositeDataUri: string | null;
  desktopScreenshotDataUri?: string | null;
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
  if (cfg.offers.activeVersion === 'v4') return v4PriceText();
  const p = cfg.pricing;
  const tax = priceTaxSuffix(cfg);
  const t = tax ? ` ${tax}` : '';
  if (!p.monthlyEnabled) return `einmalig **${oneTimeLabel}**${t}`;
  return `**${oneTimeLabel} einmalig** oder **${formatEuroShort(p.monthlyCents)} pro Monat** (${p.minTermMonths} Monate Mindestlaufzeit)${tax ? `, jeweils ${tax}` : ''}`;
}

export function guaranteeSentence(cfg: AppConfig): string {
  if (!cfg.guarantee.enabled) return '';
  if (cfg.offers.activeVersion === 'v4')
    return `${cfg.guarantee.days} Tage Geld zurück für die Einrichtung ab bestätigtem Go-Live. Bedingungen: ${cfg.sender.website.replace(/\/$/, '')}/garantie.`;
  return `Gefällt sie Ihnen nach dem Kauf nicht, gibt es ${cfg.guarantee.days} Tage lang das Geld zurück.`;
}

/** Reject old promises in stored variants, without silently replacing or activating an experiment. */
export function letterTruthBlocklist(cfg: AppConfig): string[] {
  return [
    ...cfg.letter.truthCheckBlocklist,
    ...(cfg.offers.activeVersion === 'v4'
      ? [
          'fertige Website',
          'Website ist schon fertig',
          'Sie ist fertig',
          '12 Monate Mindestlaufzeit',
          'keine eigene Website',
          'keine Website',
          'Website[^.]*haben Sie[^.]*nicht',
          'automatisch gelöscht',
          'nur noch kurz',
          'nur noch bis',
        ]
      : []),
  ];
}

function composeVars(i: ComposeInput): Record<string, string> {
  const hasFacts = i.personalization && reviewedLetterDetails(i.personalization).length > 0;
  const personal = hasFacts
    ? personalizedLetterCopy(i.personalization!, /kennenlernen|überblicken/.test(i.variant.hook) ? 2 : 0).intro[0]!
    : i.variant.hook === '{branch_benefit}'
      ? 'Leistungen, Texte und Bilder sind Beispiele, bis Sie Ihre tatsächlichen Inhalte bestätigen.'
      : letterBranchBenefit(i.branchLabel ?? '');
  return {
    personal_context: personal,
    absender_email: i.cfg.sender.email,
    firmenname: i.recipient.businessName,
    branch_benefit: letterBranchBenefit(i.branchLabel ?? ''),
    ort: i.recipient.city,
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
  const keys = ['firmenname', 'domain_vorschlag', 'ablaufdatum', 'preise', 'garantie_satz', 'absender_name', 'personal_context'];
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
    ...(i.cfg.offers.activeVersion === 'v4'
      ? {
          offerSummary: {
            setup: formatEuroShort(v4Offer('basis').setupCents),
            basis: formatEuroShort(v4Offer('basis').monthlyCents),
            care: formatEuroShort(v4Offer('care_plus').monthlyCents),
            tax: !i.cfg.tax.operatorConfirmed
              ? 'Steuerstatus ungeklärt · Entwurf, nicht zum Versand freigegeben.'
              : i.cfg.tax.kleinunternehmer
                ? 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'
                : priceTaxSuffix(i.cfg),
            scope: `Standard-.de-Domain bis ${formatEuroShort(i.cfg.checkout.maxDomainPriceCents)}/Jahr, Hosting und SSL enthalten. Care+ inkl. Basis und bis zu ${v4Offer('care_plus').includedChangeMinutes} Min. kleinere Änderungen/Monat.`,
            conditions: 'Monatsabrechnung erst ab bestätigtem Go-Live. Monatlich kündbar.',
            guarantee: guaranteeSentence(i.cfg),
          },
        }
      : {}),
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
    desktopScreenshotDataUri: i.desktopScreenshotDataUri,
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
