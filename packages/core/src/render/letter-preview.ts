import { renderLetterHtml, type LetterData } from '@wbm/templates';
import type { AppConfig } from '../config/settings';
import {
  composeLetter,
  letterTruthBlocklist,
  placeholderValues,
  type ComposeInput,
  type RecipientInput,
} from '../letters/compose';
import { objectionNoticeText, privacyNoticeText } from '../letters/notices';
import { renderSlots, type LetterSlots } from '../letters/slots';
import { checkLetterTruth, type ClaimForCheck, type TruthCheckInput, type TruthCheckResult } from '../letters/truth-check';
import type { LetterVariantContent } from '../letters/variants';
import { getPlaybook } from '../playbooks';
import type { Industry } from '../types';
import { formatEuroShort } from '../util/time';
import { qrDataUri } from './letter';

export interface LetterPreviewInput {
  cfg: AppConfig;
  industry: Industry | null;
  /** Slot-Variante oder Altformat */
  slots?: LetterSlots | null;
  content?: LetterVariantContent;
  recipient: RecipientInput;
  domain: string | null;
  claims: ClaimForCheck[];
  compositeDataUri?: string | null;
  sourcesLabel: string;
  shortUrl: string;
  qrUrl: string;
  expiresLabel: string;
  dateLine: string;
  privacyUrl: string;
  optOutEmail: string;
}

export interface LetterPreview {
  data: LetterData;
  html: string;
  truthInput: TruthCheckInput;
  truth: TruthCheckResult;
}

/**
 * Brief ohne Datenbank rendern (Muster-PDFs zur Abnahme, Layout-Tests). Nutzt dieselbe Komposition
 * und denselben deterministischen Wahrheits-Check wie der echte Brief.
 */
export async function renderLetterPreview(i: LetterPreviewInput): Promise<LetterPreview> {
  const slotRender = i.slots
    ? renderSlots(
        i.slots,
        new Map(i.claims.map((c) => [c.id, { id: c.id, textDe: c.textDe, footnoteDe: c.footnoteDe }])),
        i.sourcesLabel,
      )
    : null;
  const variant = slotRender?.content ?? i.content;
  if (!variant) throw new Error('Variante fehlt');
  const composeInput: ComposeInput = {
    variant,
    cfg: i.cfg,
    recipient: i.recipient,
    domain: i.domain,
    rating: null,
    compositeDataUri: i.compositeDataUri ?? null,
    qrDataUri: await qrDataUri(i.qrUrl),
    shortUrl: i.shortUrl,
    expiresLabel: i.expiresLabel,
    dateLine: i.dateLine,
    privacyNotice: privacyNoticeText(i.cfg, 'osm', i.privacyUrl),
    objectionNotice: objectionNoticeText(i.optOutEmail),
    priceLabel: formatEuroShort(i.cfg.pricing.packageCents),
    footnotes: slotRender?.footnotes,
  };
  const data = composeLetter(composeInput);
  const truthInput: TruthCheckInput = {
    letter: data,
    claimSpans: slotRender?.claimSpans ?? [],
    claims: i.claims,
    allowedClaimIds: i.industry ? getPlaybook(i.industry).allowed_claims : [],
    industry: i.industry,
    placeholderValues: placeholderValues(composeInput),
    sourcesLabel: i.sourcesLabel,
    extraBlocklist: letterTruthBlocklist(i.cfg),
    maxStatistics: i.cfg.letter.maxStatistics,
  };
  return { data, html: renderLetterHtml(data), truthInput, truth: checkLetterTruth(truthInput) };
}
