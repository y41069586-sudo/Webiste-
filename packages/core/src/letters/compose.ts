import {
  letterBranchBenefit,
  previewInvitationCopy,
  personalizedLetterCopy,
  reviewedLetterDetails,
  type VerifiedLetterContext,
} from './personalization';
import { DEFAULT_BLOCKLIST } from './truth-check';
import { invitationContextHash, type WrittenInvitation } from './writer';
import { v4PriceText } from '../services/offers-v4';
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
  const nameLines = head.length <= 40 ? [head] : wrapped.length <= 2 ? ['An das Team von', ...wrapped] : wrapped;
  const street = `${r.street.trim()} ${r.houseNumber.trim()}`;
  const city = `${r.postalCode.trim()} ${r.city.trim()}`;
  if (nameLines.length > 3 || street.length > MAX_LINE || city.length > MAX_LINE)
    throw new Error('Anschrift passt nicht vollständig ins Adressfenster; manuelle Prüfung erforderlich.');
  return [...nameLines, street, city];
}

export function fillPlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k]! : m));
}

const LOWER_START = /^(Bei|Wer|Wir|Ich|Vor|Deshalb|Mit|Seit|So|Gern|Gerne|Heute|Kürzlich|Als|Da|Damit|Weil)\b/;

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
  invitationCopy?: WrittenInvitation;
  sequence?: 1 | 2 | 3;
  testRecipient?: boolean;
  /** Approved slot claims remain verbatim with their existing footnotes. */
  claimTexts?: string[];
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
          '\\d[\\d.,]*\\s*(?:€|Euro\\b|EUR\\b)',
          'Care\\+',
        ]
      : []),
  ];
}

function composeVars(i: ComposeInput): Record<string, string> {
  const hasFacts = i.personalization && reviewedLetterDetails(i.personalization).length > 0;
  const personalized = hasFacts ? personalizedLetterCopy(i.personalization!) : undefined;
  const personal =
    personalized?.intro[0] ??
    (i.variant.hook === '{branch_benefit}'
      ? 'Leistungen, Texte und Bilder sind Beispiele, bis Sie Ihre tatsächlichen Inhalte bestätigen.'
      : letterBranchBenefit(i.branchLabel ?? ''));
  return {
    personal_context: personal,
    research_opening: personalized?.researchOpening ?? 'wir haben eine Website-Idee speziell für Ihren Betrieb gestaltet.',
    absender_email: i.cfg.sender.email,
    firmenname: i.recipient.businessName,
    branch_benefit: personalized?.researchOpening ?? letterBranchBenefit(i.branchLabel ?? ''),
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
/**
 * Persönliche Absenderzeile unter dem QR-Bereich: hinterlegte Vorstellung des Betreibers (nur ohne Ziffern, damit der
 * Wahrheits-Check keine unbelegte Zahl findet) und direkte Kontaktwege.
 */
export function senderContactLine(cfg: AppConfig, opts: { withIntro?: boolean } = {}): string {
  // Nur der erste Satz der hinterlegten Vorstellung: wer schreibt – der Brief bleibt einseitig
  const intro = (cfg.sender.intro.trim().match(/^.+?[.!?](?=\s|$)/)?.[0] ?? cfg.sender.intro.trim()).trim();
  const phone = cfg.sender.phone.trim();
  const email = cfg.sender.email.trim();
  const ways = [phone && `Telefon ${phone}`, email && `E-Mail ${email}`].filter(Boolean).join(' oder ');
  return [
    opts.withIntro !== false && intro && !/\d/.test(intro) ? intro : '',
    `Fragen beantworte ich gern${ways ? `: ${ways}` : ''}.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function placeholderValues(i: ComposeInput): string[] {
  const vars = composeVars(i);
  if (i.cfg.offers.activeVersion === 'v4')
    return [
      i.recipient.businessName,
      i.recipient.city,
      i.expiresLabel,
      i.cfg.sender.phone,
      i.cfg.sender.email,
      ...(i.personalization
        ? reviewedLetterDetails(i.personalization)
            .filter((f) => f.kind !== 'website_search')
            .map((f) => f.text)
        : []),
    ];
  const keys = [
    'firmenname',
    'domain_vorschlag',
    'ablaufdatum',
    'preise',
    'garantie_satz',
    'absender_name',
    'personal_context',
    'research_opening',
  ];
  const out = keys.map((k) => vars[k]!).filter(Boolean);
  if (i.rating && i.variant.ratingSentence) out.push(fillPlaceholders(i.variant.ratingSentence, vars));
  return out;
}

export function composeLetter(i: ComposeInput): LetterData {
  const vars = composeVars(i);
  const v = i.variant;
  let first = [i.rating && v.ratingSentence ? fillPlaceholders(v.ratingSentence, vars) : '', fillPlaceholders(v.hook, vars)]
    .filter(Boolean)
    .join(' ');
  // Retain stored variants; personalize only the exact previous V4 default opening when evidence exists.
  if (
    i.cfg.offers.activeVersion === 'v4' &&
    v.hook === 'für Ihren Betrieb habe ich diese unverbindliche Website-Vorschau vorbereitet.' &&
    i.personalization &&
    reviewedLetterDetails(i.personalization).length > 0
  ) {
    const research = personalizedLetterCopy(i.personalization).researchOpening;
    if (research) first = research;
  }
  const intro = [lowerFirstWord(first), ...v.intro.map((p) => fillPlaceholders(p, vars))].filter(Boolean);
  const data: LetterData = {
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
  if (i.cfg.offers.activeVersion === 'v4') {
    const context: VerifiedLetterContext = i.personalization ?? {
      businessName: i.recipient.businessName,
      city: i.recipient.city,
      branchLabel: i.branchLabel ?? 'Betrieb',
      details: [],
    };
    if (
      (!i.testRecipient && (context.businessName !== i.recipient.businessName || context.city !== i.recipient.city)) ||
      (i.branchLabel && context.branchLabel !== i.branchLabel)
    )
      throw Error('Personalisierung gehört nicht zum adressierten Betrieb.');
    if (i.invitationCopy && i.invitationCopy.contextHash !== invitationContextHash(context, i.sequence ?? 1))
      throw Error('Brieftext gehört nicht zum aktuellen Faktenpaket oder zur Versandfolge.');
    const copy =
      i.invitationCopy?.copy ??
      previewInvitationCopy(context, i.sequence ?? 1, /Leistungen auf einen Blick/.test(v.subject) ? 'B' : 'A');
    // Never launder an unsafe stored arm through the new composer. Its offending text stays blockable.
    const original = [v.subject, v.hook, ...v.intro, v.offerWithDomain, v.offerWithoutDomain, v.noAction].join(' ');
    const unsafe =
      DEFAULT_BLOCKLIST.some((rule) => rule.pattern.test(original)) ||
      letterTruthBlocklist(i.cfg).some((pattern) => new RegExp(pattern, 'i').test(original));
    if (!unsafe) {
      data.subject = copy.subject;
      data.intro = [lowerFirstWord(copy.opening), ...copy.intro, ...(i.claimTexts ?? []), copy.scan];
      data.qrCaption = copy.qrCaption;
      data.copyEvidence = {
        version: copy.version,
        level: copy.level,
        profile: copy.profile,
        usedFacts: copy.sources,
        engine: i.invitationCopy?.engine ?? 'fallback',
        attempts: i.invitationCopy?.attempts ?? 0,
        reviewReasons: i.invitationCopy?.reviewReasons ?? [
          'Regelbasierte Vorschau; individuelle Text- und Demoabnahme erforderlich.',
        ],
      };
    }
    data.previewInvitation = true;
    if (!unsafe) {
      data.offer = copy.next;
      data.noAction = senderContactLine(i.cfg);
      data.postscript = `**P. S.** Ihre Vorschau ist bis ${i.expiresLabel} online. Schauen Sie gern vorher kurz rein – vielleicht gefällt sie Ihnen ja.`;
    }
  }
  return data;
}
