import { and, eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { renderLetterHtml } from '@wbm/templates';
import { appUrl, getEnv, trackUrl } from '../config/env';
import { effectiveSwitches, getConfig } from '../config/service';
import type { AppConfig } from '../config/settings';
import { getDb } from '../db/client';
import { leads, letters } from '../db/schema';
import { composeLetter, recipientLines, type RecipientInput } from '../letters/compose';
import { suggestDomain } from '../letters/domain';
import { objectionNoticeText, privacyNoticeText } from '../letters/notices';
import { logger } from '../logger';
import { getProviders } from '../providers';
import { audit } from '../services/audit';
import { raiseAlert } from '../services/budget';
import { currentDemoForLead } from '../services/demo-review';
import { transitionLead } from '../services/lead-state';
import { approveLetter, chooseLetterVariant } from '../services/letters';
import { addDays, formatDateLongDe, formatEuroShort } from '../util/time';
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
export async function generateLetter(leadId: string, sequence: 1 | 2, opts: GenerateLetterOptions): Promise<GeneratedLetter> {
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
  const variant = await chooseLetterVariant(db, sequence);
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
  const includePage2 = cfg.letter.includeScreenshotPage && demo.screenshotDesktopKey && demo.screenshotMobileKey;
  const screenshotPage = includePage2
    ? {
        desktopDataUri: `data:image/jpeg;base64,${(await storage.get(demo.screenshotDesktopKey!))?.toString('base64')}`,
        mobileDataUri: `data:image/jpeg;base64,${(await storage.get(demo.screenshotMobileKey!))?.toString('base64')}`,
      }
    : null;
  const useRating = sw.useRatingInLetter && lead.rating && lead.ratingCount;
  const data = composeLetter({
    variant: variant.content,
    cfg,
    recipient,
    domain,
    rating: useRating ? { rating: lead.rating!, count: lead.ratingCount! } : null,
    compositeDataUri: composite ? `data:image/jpeg;base64,${composite.toString('base64')}` : null,
    qrDataUri: await qrDataUri(url),
    shortUrl: shortUrl(url),
    dateLine: `${cfg.sender.city}, ${formatDateLongDe(new Date())}`,
    privacyNotice: privacyNoticeText(cfg, lead.source, appUrl('/datenschutz')),
    objectionNotice: objectionNoticeText(getEnv().OPTOUT_EMAIL),
    priceLabel: formatEuroShort(cfg.pricing.packageCents),
    screenshotPage,
  });
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

  const status: GeneratedLetter['status'] = issues.length ? 'failed' : 'generated';
  const [row] = await db
    .insert(letters)
    .values({
      leadId,
      demoId: demo.id,
      variantId: variant.id,
      sequence: seqDb,
      pageCount: pdfCheck.pages,
      estimatedCostCents: estimate,
      status,
      statusReason: issues.length
        ? issues
            .map((i) => `${i.check}: ${i.detail}`)
            .join(' | ')
            .slice(0, 1000)
        : null,
      isTest: Boolean(opts.test),
      dryRun: sw.dryRun,
    })
    .returning({ id: letters.id });
  const letterId = row!.id;
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
      test: Boolean(opts.test),
    },
  });
  if (issues.length) {
    await raiseAlert(db, {
      level: 'error',
      code: `letter_layout:${letterId}`,
      message: 'Brief-Layout verletzt die Vorgaben des Briefdienstes.',
      context: { letterId, issues },
    });
    return { letterId, status, issues, pages: pdfCheck.pages };
  }
  if (!opts.test && sequence === 1) {
    await db.transaction((tx) => transitionLead(tx, leadId, 'letter_generated', { actor: opts.actor, soft: true }));
  }
  if (sw.autoSend && !opts.test) {
    await approveLetter(letterId, 'job:auto-send');
    return { letterId, status: 'approved', issues, pages: pdfCheck.pages };
  }
  return { letterId, status, issues, pages: pdfCheck.pages };
}
