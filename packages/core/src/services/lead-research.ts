import { eq, sql } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
import { leads } from '../db/schema';
import { getConfig, getSetting, setSetting } from '../config/service';
import {
  assessAcquisition,
  currentResearch,
  leadResearchKey,
  leadResearchSchema,
  researchIdentity,
  isFresh,
  type LeadResearch,
  type ResearchSubject,
} from '../leads/acquisition';
import { audit } from './audit';
import { transitionLead } from './lead-state';
import { reviewedLetterDetails, type VerifiedLetterContext } from '../letters/personalization';

export async function leadResearch(lead: ResearchSubject & { id: string }, db: DbOrTx = getDb()) {
  const cfg = await getConfig({ db });
  const raw = await getSetting<unknown>(leadResearchKey(lead.id), null, db);
  return currentResearch(lead, raw, cfg.targeting.acquisition);
}
export async function storedLeadResearch(leadId: string, db: DbOrTx = getDb()) {
  const parsed = leadResearchSchema.safeParse(await getSetting<unknown>(leadResearchKey(leadId), null, db));
  return parsed.success ? parsed.data : null;
}
export function researchLetterFacts(research: LeadResearch | null): VerifiedLetterContext['details'] {
  if (!research) return [];
  const details = research.signals
    .filter((s) => ['service', 'specialty', 'area'].includes(s.kind) && isFresh(s.observedAt, 30, new Date()))
    .map((s) => ({ text: s.text, source: s.source, verified: s.verified, checkedAt: s.observedAt }));
  // Use the same defensive business-fact rules as the existing invitation composer.
  return details.flatMap((detail) => reviewedLetterDetails({ businessName: '', city: '', branchLabel: '', details: [detail] }));
}
export async function saveLeadResearch(
  leadId: string,
  input: Omit<LeadResearch, 'version' | 'identityHash' | 'checkedAt'>,
  actor: string,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM leads WHERE id=${leadId} FOR UPDATE`);
    const lead = await tx.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!lead || lead.anonymizedAt || lead.status === 'suppressed') throw Error('Betrieb ist nicht für Recherche verfügbar.');
    const cfg = await getConfig({ db: tx });
    const now = new Date();
    const research = leadResearchSchema.parse({
      ...input,
      version: 1,
      identityHash: researchIdentity(lead),
      checkedAt: now.toISOString(),
    });
    const refs = [research.website.source, ...research.signals.map((s) => s.source)];
    if (
      refs.some((ref) => {
        if (!ref.startsWith('https:')) return false;
        const u = new URL(ref);
        return (
          /(^|\.)maps\.google\.|(^|\.)maps\.app\.goo\.gl$|(^|\.)g\.page$|googleapis\.com$/i.test(u.hostname) ||
          (/google\.[a-z.]+$/i.test(u.hostname) && u.pathname.startsWith('/maps'))
        );
      })
    )
      throw Error(
        'Google-Maps-Inhalte nicht als gespeicherte Recherchebelege übernehmen; bestehende Google-Freigaben bleiben unverändert.',
      );
    if (
      new Date(research.website.checkedAt) > now ||
      research.signals.some((s) => new Date(s.observedAt) > now || (s.occurredOn && new Date(s.occurredOn) > now))
    )
      throw Error('Recherche darf keine zukünftigen Beobachtungen oder Geschäftsbeginn-Daten bestätigen.');
    if (research.signals.some((s) => s.kind === 'service' && s.text.length > 40))
      throw Error('Bestätigte Leistungstitel auf höchstens40Zeichen begrenzen; ausführliche Hinweise als Schwerpunkt speichern.');
    researchLetterFacts(research);
    const assessment = assessAcquisition(lead, research, cfg.targeting.acquisition, now);
    await setSetting(leadResearchKey(leadId), research, actor, tx);
    await tx
      .update(leads)
      .set({ score: assessment.score, scoreReasons: assessment.reasons, updatedAt: now })
      .where(eq(leads.id, leadId));
    if (['discovered', 'qualified'].includes(lead.status)) {
      const next = assessment.state === 'ready' ? 'qualified' : assessment.state === 'excluded' ? 'rejected' : 'discovered';
      if (next !== lead.status)
        await transitionLead(tx, leadId, next, {
          actor,
          soft: true,
          reason: 'Recherchebasierte Eignung erneut geprüft',
        });
    }
    // Existing demo/PDF snapshots are not silently rewritten. Approval and sending re-read this evidence.
    await audit(tx, {
      entity: 'lead',
      entityId: leadId,
      actor,
      action: 'research_reviewed',
      context: { state: assessment.state, score: assessment.score, signalKinds: research.signals.map((s) => s.kind) },
    });
    return assessment;
  });
}
export async function assertAcquisitionEligible(lead: typeof leads.$inferSelect, db: DbOrTx = getDb()) {
  const cfg = await getConfig({ db });
  if (cfg.offers.activeVersion !== 'v4' || !cfg.targeting.acquisition.enabled) return;
  // Offline fixtures cannot be mailed for real (separate mandatory mock-source guard).
  // A fixture with explicit evidence is still fully validated by this path.
  const research = await leadResearch(lead, db);
  if (lead.source === 'mock' && !research) return;
  const result = assessAcquisition(lead, research, cfg.targeting.acquisition);
  if (result.state !== 'ready')
    throw Error(`Akquiseprüfung offen/gesperrt: ${[...result.exclusions, ...result.missing].join(' · ')}`);
}
