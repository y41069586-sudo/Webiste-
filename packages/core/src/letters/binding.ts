import { PREVIEW_LETTER_VERSION } from './personalization';
import { getEnv, trackUrl } from '../config/env';
import type { AppConfig } from '../config/settings';
import type { DbOrTx } from '../db/client';
import { demos, leads, letters } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getProviders } from '../providers';
import { currentDemoForLead } from '../services/demo-review';
import { sha256 } from '../util/crypto';
import { v4PriceText } from '../services/offers-v4';
import { leadResearch } from '../services/lead-research';
export interface LetterBinding {
  version: 1;
  demoId: string;
  templateId: string;
  htmlHash: string;
  desktopHash: string;
  mobileHash: string;
  compositeHash: string;
  recipientHash: string;
  routeHash: string;
  senderOfferHash: string;
  pdfHash: string;
  personalizationHash?: string;
  acquisitionHash?: string;
}
export function recipientFingerprint(lead: typeof leads.$inferSelect) {
  return sha256(
    JSON.stringify([
      lead.businessName,
      lead.branch,
      lead.city,
      lead.street,
      lead.houseNumber,
      lead.postalCode,
      lead.country,
      lead.phone,
      lead.openingHours,
      lead.hasWebsite,
      lead.socialOnly,
      lead.websiteUri,
      lead.source,
      lead.sourceId,
    ]),
  );
}
function senderOfferFingerprint(cfg: AppConfig) {
  return sha256(
    JSON.stringify([
      cfg.sender,
      ...(cfg.offers.activeVersion === 'v4' ? [PREVIEW_LETTER_VERSION] : []),
      cfg.tax,
      cfg.offers.activeVersion,
      cfg.offers.activeVersion === 'v4' ? v4PriceText() : cfg.pricing,
      cfg.guarantee,
      cfg.timing.leadRetentionMonths,
      cfg.letter.maxLettersPerLead,
      getEnv().OPTOUT_EMAIL,
    ]),
  );
}
/** Immutable source hashes in existing JSON metadata, not a second database or storage system. */
export async function letterDemoBinding(
  lead: typeof leads.$inferSelect,
  demo: typeof demos.$inferSelect,
  cfg: AppConfig,
): Promise<Omit<LetterBinding, 'pdfHash'>> {
  const storage = getProviders().storage;
  const keys = [demo.htmlStorageKey, demo.screenshotDesktopKey, demo.screenshotMobileKey, demo.compositeKey];
  if (keys.some((k) => !k)) throw new Error('Demo oder Desktop-/Mobilaufnahme fehlt.');
  const bytes = await Promise.all(keys.map((k) => storage.get(k!)));
  if (bytes.some((b) => !b?.length)) throw new Error('Demo oder Aufnahme fehlt im Speicher.');
  const [htmlHash, desktopHash, mobileHash, compositeHash] = bytes.map((b) => sha256(b!));
  const attested = demo.qaResultJson?.renderedAssets;
  if (cfg.offers.activeVersion === 'v4' && !attested)
    throw new Error('V4-Demo benötigt eine erneute QA mit Bild-Zuordnungsnachweis.');
  if (attested && attested.businessFactsHash !== recipientFingerprint(lead))
    throw new Error('Betriebsdaten seit der Demo-QA geändert; Demo erneut prüfen.');
  if (
    attested &&
    [htmlHash, desktopHash, mobileHash, compositeHash].some(
      (h, i) => h !== [attested.htmlHash, attested.desktopHash, attested.mobileHash, attested.compositeHash][i],
    )
  )
    throw new Error('Demo-HTML oder Screenshot seit der QA geändert; erneut prüfen.');
  return {
    version: 1,
    ...(cfg.offers.activeVersion === 'v4'
      ? { personalizationHash: sha256(JSON.stringify(demo.qaResultJson?.review?.letterFacts ?? [])) }
      : {}),
    ...(cfg.offers.activeVersion === 'v4' ? { acquisitionHash: sha256(JSON.stringify(await leadResearch(lead))) } : {}),
    demoId: demo.id,
    templateId: demo.templateId,
    htmlHash: htmlHash!,
    desktopHash: desktopHash!,
    mobileHash: mobileHash!,
    compositeHash: compositeHash!,
    recipientHash: recipientFingerprint(lead),
    routeHash: sha256(JSON.stringify([trackUrl(`/q/${lead.trackToken}`), trackUrl(`/${lead.shortCode}`)])),
    senderOfferHash: senderOfferFingerprint(cfg),
  };
}
export async function assertLetterBinding(
  db: DbOrTx,
  letter: typeof letters.$inferSelect,
  lead: typeof leads.$inferSelect,
  cfg: AppConfig,
): Promise<void> {
  const recorded = letter.truthCheckJson?._binding as LetterBinding | undefined;
  if (!recorded) {
    if (cfg.offers.activeVersion === 'v4') throw new Error('V4-Brief ohne Zuordnungsnachweis; neu erzeugen.');
    return;
  }
  if (recorded.version !== 1 || !letter.demoId || !letter.pdfStorageKey) throw new Error('Briefzuordnung unvollständig.');
  const demo = await db.query.demos.findFirst({ where: eq(demos.id, letter.demoId) });
  const current = await currentDemoForLead(db, lead.id);
  if (
    !demo ||
    current?.id !== demo.id ||
    demo.status !== 'published' ||
    !demo.qaResultJson?.passed ||
    demo.qaResultJson.checks.some((c) => !c.passed) ||
    demo.qaResultJson.quality?.passed === false
  )
    throw new Error('Brief gehört nicht mehr zur aktuell freigegebenen Demo.');
  const now = await letterDemoBinding(lead, demo, cfg);
  for (const key of Object.keys(now) as (keyof typeof now)[]) {
    if (recorded[key] !== now[key])
      throw new Error('Empfänger, Fakten, Demo, Bild, Route oder Brief-/Angebotsstand seit der Generierung geändert.');
  }
  const pdf = await getProviders().storage.get(letter.pdfStorageKey);
  if (!pdf || sha256(pdf) !== recorded.pdfHash) throw new Error('Brief-PDF seit der Prüfung geändert oder gelöscht.');
  if (letter.statedExpiresAt && (!demo.expiresAt || demo.expiresAt < letter.statedExpiresAt))
    throw new Error('Die zugesagte Vorschau-Laufzeit ist nicht mehr gedeckt.');
}
