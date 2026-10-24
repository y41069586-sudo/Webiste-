import { and, eq, isNull } from 'drizzle-orm';
import QRCode from 'qrcode';
import { renderLetterHtml } from '@wbm/templates';
import { appUrl, getEnv, trackUrl } from '../config/env';
import { effectiveSwitches, getConfig } from '../config/service';
import type { AppConfig } from '../config/settings';
import { getDb } from '../db/client';
import { claimUsages, leads, letters } from '../db/schema';
import { composeLetter, placeholderValues, recipientLines, type ComposeInput, type RecipientInput } from '../letters/compose';
import { renderSlots } from '../letters/slots';
import type { TruthCheckResult } from '../letters/truth-check';
import { getPlaybook } from '../playbooks';
import { runTruthCheck } from '../services/truth-check';
import { suggestDomain } from '../letters/domain';
import { objectionNoticeText, privacyNoticeText } from '../letters/notices';
import { logger } from '../logger';
import { getProviders } from '../providers';
import { audit } from '../services/audit';
import { raiseAlert } from '../services/budget';
import { currentDemoForLead } from '../services/demo-review';
import { transitionLead } from '../services/lead-state';
import { extendDemoUntil } from '../services/demo-review';
import { reviewedImprovements } from '../services/followups';
import { approveLetter, chooseLetterVariant } from '../services/letters';
import { randomShortCode } from '../util/crypto';
import { addBusinessDays, addDays, endOfDayBerlin, formatDateLongDe, formatEuroShort } from '../util/time';
import { htmlToPdf, validateLetterDom, validateLetterPdf, type LayoutIssue } from './pdf';

export async function qrDataUri(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 600,
    color: { dark: '#111111', light: '#ffffff' },
  });
}

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/** Kurzcode für die Kurz-URL im Brief ({TRACK_DOMAIN}/{kurzcode}) – einmal je Lead, kollisionsfrei. */
async function ensureShortCode(lead: typeof leads.$inferSelect): Promise<string> {
  if (lead.shortCode) return lead.shortCode;
  const db = getDb();
  for (let i = 0; i < 8; i++) {
    const code = randomShortCode();
    const res = await db
      .update(leads)
      .set({ shortCode: code })
      .where(and(eq(leads.id, lead.id), isNull(leads.shortCode)))
      .returning({ code: leads.shortCode })
      .catch(() => []);
    if (res[0]?.code) return res[0].code;
    const fresh = await db.query.leads.findFirst({ where: eq(leads.id, lead.id), columns: { shortCode: true } });
    if (fresh?.shortCode) return fresh.shortCode;
  }
  throw new Error('Kurzcode konnte nicht vergeben werden');
}

/**
 * Datum „online bis …“ im Brief. Erstbrief: Demo-Laufzeit ab heute (beim Versand wird ab Versanddatum
 * verlängert, also nie kürzer). Folgebriefe: geschätzte Zustellung + Verlängerung (Standard 7 Tage), die Demo
 * wird sofort mindestens bis dahin verlängert – damit die Aussage im Brief stimmt.
 */
export function statedExpiry(
  sequence: number,
  cfg: AppConfig,
  demoExpiresAt: Date | null,
  now = new Date(),
  deliveryBusinessDays = getEnv().DELIVERY_BUSINESS_DAYS,
): Date {
  if (sequence <= 1) return endOfDayBerlin(addDays(now, cfg.timing.demoExpiryDays));
  // +1 Werktag Puffer zwischen Erzeugung und Versand
  const target = endOfDayBerlin(addDays(addBusinessDays(now, deliveryBusinessDays + 1), cfg.timing.followupExtendDays));
  return demoExpiresAt && demoExpiresAt > target ? endOfDayBerlin(demoExpiresAt) : target;
}

export interface GenerateLetterOptions {
  actor: string;
  /** Testbrief an eigene Adresse (z. B. erster echter Brief) */
  test?: boolean;
  /** Bestehenden, noch nicht versendeten Brief ersetzen */
  regenerate?: boolean;
}

export interface GeneratedLetter {
  letterId: string;
  status: 'generated' | 'approved' | 'failed';
  issues: LayoutIssue[];
  pages: number;
  truthCheck?: TruthCheckResult;
}

async function domainFor(lead: typeof leads.$inferSelect, cfg: AppConfig): Promise<string | null> {
  const fresh = lead.domainCheckedAt && lead.domainCheckedAt > addDays(new Date(), -14);
  if (fresh) return lead.domainSuggestion;
  try {
    const d = await suggestDomain(getProviders().registrar, lead.businessName, { city: lead.city, branch: lead.branch });
    await getDb().update(leads).set({ domainSuggestion: d, domainCheckedAt: new Date() }).where(eq(leads.id, lead.id));
    return d;
  } catch (err) {
    logger.warn(
      { leadId: lead.id, err: err instanceof Error ? err.message : String(err) },
      'Domain-Prüfung fehlgeschlagen – Brief ohne Beispiel-Domain',
    );
    void cfg;
    return null;
  }
}

/**
 * Brief erzeugen: Variante, Domain-Vorschlag, QR-Code, Komposit, PDF (DIN 5008 Form B),
 * Layout-Prüfung (DOM + PDF), Kostenschätzung. Idempotent je Lead und Sequenz.
 */
export async function generateLetter(leadId: string, sequence: 1 | 2 | 3, opts: GenerateLetterOptions): Promise<GeneratedLetter> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const sw = effectiveSwitches(cfg);
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  if (!lead || lead.anonymizedAt) throw new Error('Lead nicht gefunden oder gelöscht');
  if (lead.status === 'suppressed') throw new Error('Lead hat widersprochen');
  const seqDb = opts.test ? 0 : sequence;
  const existing = await db.query.letters.findFirst({ where: and(eq(letters.leadId, leadId), eq(letters.sequence, seqDb)) });
  if (existing) {
    const replaceable = ['generated', 'failed', 'approved'].includes(existing.status);
    if (!(opts.regenerate || opts.test) || !replaceable) {
      return {
        letterId: existing.id,
        status: existing.status as GeneratedLetter['status'],
        issues: [],
        pages: existing.pageCount,
      };
    }
    await db.delete(letters).where(eq(letters.id, existing.id));
  }
  const allowed = opts.regenerate ? ['demo_published', 'letter_generated', 'letter_approved'] : ['demo_published'];
  if (!opts.test && sequence === 1 && !allowed.includes(lead.status))
    throw new Error(`Lead im Status ${lead.status} – kein Erstbrief`);

  const demo = await currentDemoForLead(db, leadId);
  if (!demo) throw new Error('Keine veröffentlichte Demo für den Lead');
  const storage = getProviders().storage;
  const composite = demo.compositeKey ? await storage.get(demo.compositeKey) : null;
  const variant = await chooseLetterVariant(db, sequence, { industry: lead.industry });
  const sourcesLabel = shortUrl(trackUrl('/quellen'));
  const slotRender = variant.slots
    ? renderSlots(
        variant.slots,
        new Map(variant.claims.map((c) => [c.id, { id: c.id, textDe: c.textDe, footnoteDe: c.footnoteDe }])),
        sourcesLabel,
      )
    : null;
  const domain = await domainFor(lead, cfg);

  const recipient: RecipientInput = opts.test
    ? {
        businessName: cfg.letter.testRecipient.name || 'Testempfänger',
        street: cfg.letter.testRecipient.street,
        houseNumber: cfg.letter.testRecipient.houseNumber,
        postalCode: cfg.letter.testRecipient.postalCode,
        city: cfg.letter.testRecipient.city,
      }
    : {
        businessName: lead.businessName,
        street: lead.street ?? '',
        houseNumber: lead.houseNumber ?? '',
        postalCode: lead.postalCode ?? '',
        city: lead.city,
      };
  if (!recipient.street || !recipient.houseNumber || !/^\d{5}$/.test(recipient.postalCode) || !recipient.city) {
    throw new Error(opts.test ? 'Testempfänger in den Einstellungen unvollständig' : 'Anschrift unvollständig');
  }
  const url = trackUrl(`/q/${lead.trackToken}`);
  const code = await ensureShortCode(lead);
  const stated = statedExpiry(opts.test ? 1 : sequence, cfg, demo.expiresAt);
  const includePage2 = cfg.letter.includeScreenshotPage && demo.screenshotDesktopKey && demo.screenshotMobileKey;
  const screenshotPage = includePage2
    ? {
        desktopDataUri: `data:image/jpeg;base64,${(await storage.get(demo.screenshotDesktopKey!))?.toString('base64')}`,
        mobileDataUri: `data:image/jpeg;base64,${(await storage.get(demo.screenshotMobileKey!))?.toString('base64')}`,
      }
    : null;
  const useRating = sw.useRatingInLetter && lead.rating && lead.ratingCount;
  const composeInput: ComposeInput = {
    variant: slotRender?.content ?? variant.content,
    cfg,
    recipient,
    domain,
    rating: useRating ? { rating: lead.rating!, count: lead.ratingCount! } : null,
    compositeDataUri: composite ? `data:image/jpeg;base64,${composite.toString('base64')}` : null,
    qrDataUri: await qrDataUri(url),
    shortUrl: shortUrl(trackUrl(`/${code}`)),
    expiresLabel: formatDateLongDe(stated),
    dateLine: `${cfg.sender.city}, ${formatDateLongDe(new Date())}`,
    privacyNotice: privacyNoticeText(cfg, lead.source, appUrl('/datenschutz')),
    objectionNotice: objectionNoticeText(getEnv().OPTOUT_EMAIL),
    priceLabel: formatEuroShort(cfg.pricing.packageCents),
    screenshotPage,
    footnotes: slotRender?.footnotes,
  };
  const data = composeLetter(composeInput);
  const html = renderLetterHtml(data);
  const pdf = await htmlToPdf(html);
  const expectedPages = screenshotPage ? 2 : 1;
  const domIssues = await validateLetterDom(html, cfg.letter.addressPosition);
  const pdfCheck = await validateLetterPdf(pdf, {
    recipientLines: recipientLines(recipient),
    position: cfg.letter.addressPosition,
    expectedPages,
  });
  const issues = [...domIssues, ...pdfCheck.issues];

  // Wahrheits-Check (B5.4) – blockierend; ohne passed keine Freigabe
  const truth: TruthCheckResult = await runTruthCheck(
    {
      letter: data,
      claimSpans: slotRender?.claimSpans ?? [],
      claims: variant.claims,
      allowedClaimIds: lead.industry ? getPlaybook(lead.industry).allowed_claims : [],
      industry: lead.industry ?? null,
      placeholderValues: placeholderValues(composeInput),
      sourcesLabel,
      extraBlocklist: cfg.letter.truthCheckBlocklist,
      maxStatistics: cfg.letter.maxStatistics,
    },
    { leadId, checkSourcesPage: !sw.dryRun, idempotencyKey: `truth:${leadId}:${seqDb}:${Date.now()}` },
  );
  const truthIssues = truth.violations.map((v) => `wahrheits_check/${v.rule}: ${v.detail}`);

  // Kosten schätzen (im DRY_RUN ohne API-Aufruf)
  let estimate = cfg.costs.letterEstimateCents;
  if (!sw.dryRun) {
    const est = await getProviders()
      .mail.estimateCost(pdf, {
        color: cfg.letter.color,
        deliveryProduct: cfg.letter.deliveryProduct,
        addressPosition: cfg.letter.addressPosition,
        recipientCountry: 'DE',
      })
      .catch(() => null);
    if (est !== null) estimate = est;
  }

  const status: GeneratedLetter['status'] = issues.length || !truth.passed ? 'failed' : 'generated';
  const [row] = await db
    .insert(letters)
    .values({
      leadId,
      demoId: demo.id,
      variantId: variant.id,
      sequence: seqDb,
      format: 'letter',
      statedExpiresAt: stated,
      pageCount: pdfCheck.pages,
      estimatedCostCents: estimate,
      status,
      statusReason:
        issues.length || truthIssues.length
          ? [...issues.map((i) => `${i.check}: ${i.detail}`), ...truthIssues].join(' | ').slice(0, 1000)
          : null,
      industry: lead.industry ?? null,
      truthCheckJson: truth as unknown as Record<string, unknown>,
      isTest: Boolean(opts.test),
      dryRun: sw.dryRun,
    })
    .returning({ id: letters.id });
  const letterId = row!.id;
  if (truth.claims.length) {
    await db
      .insert(claimUsages)
      .values(truth.claims.map((claimId) => ({ letterId, claimId })))
      .onConflictDoNothing();
  }
  // Folgebriefe nennen ein neues Ablaufdatum – die Demo muss mindestens so lange online bleiben
  if (!opts.test && sequence > 1) await extendDemoUntil(db, leadId, stated);
  const key = `letters/${leadId}/${letterId}.pdf`;
  await storage.put(key, pdf, 'application/pdf');
  await db.update(letters).set({ pdfStorageKey: key }).where(eq(letters.id, letterId));
  await audit(db, {
    entity: 'letter',
    entityId: letterId,
    action: 'generate',
    actor: opts.actor,
    context: {
      leadId,
      sequence,
      variant: variant.name,
      domain,
      pages: pdfCheck.pages,
      issues: issues.length,
      truthCheck: truth.passed ? 'passed' : 'failed',
      claims: truth.claims,
      test: Boolean(opts.test),
    },
  });
  if (!truth.passed) {
    await raiseAlert(db, {
      level: 'error',
      code: `letter_truth:${letterId}`,
      message: 'Wahrheits-Check hat einen Brief blockiert.',
      context: { letterId, violations: truth.violations },
    });
    return { letterId, status: 'failed', issues, pages: pdfCheck.pages, truthCheck: truth };
  }
  if (issues.length) {
    await raiseAlert(db, {
      level: 'error',
      code: `letter_layout:${letterId}`,
      message: 'Brief-Layout verletzt die Vorgaben des Briefdienstes.',
      context: { letterId, issues },
    });
    return { letterId, status, issues, pages: pdfCheck.pages, truthCheck: truth };
  }
  if (!opts.test && sequence === 1) {
    await db.transaction((tx) => transitionLead(tx, leadId, 'letter_generated', { actor: opts.actor, soft: true }));
  }
  // Brief 3: nach den ersten N vom Betreiber geprüften Briefen automatisch freigeben (Wahrheits-Check grün)
  if (sequence === 3 && !opts.test && (await reviewedImprovements()) >= cfg.review.letter3ManualFirstN) {
    await approveLetter(letterId, 'job:auto-letter3');
    return { letterId, status: 'approved', issues, pages: pdfCheck.pages, truthCheck: truth };
  }
  if (sw.autoSend && !opts.test) {
    await approveLetter(letterId, 'job:auto-send');
    return { letterId, status: 'approved', issues, pages: pdfCheck.pages, truthCheck: truth };
  }
  return { letterId, status, issues, pages: pdfCheck.pages, truthCheck: truth };
}
