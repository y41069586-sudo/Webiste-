import { eq, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client';
import { leads } from '../db/schema';
import { getConfig } from '../config/service';
import { businessHash, businessPhoneKey, segmentKey } from '../leads/normalize';
import { dataSourceText } from '../letters/notices';
import { isSuppressed } from './suppression';
import { audit } from './audit';
import { randomToken } from '../util/crypto';
export const profileControlSchema = z.object({
  sourceUrl: z.url(),
  businessName: z.string().trim().min(3).max(120),
  branch: z.string().min(2).max(40),
  street: z.string().trim().min(3).max(100),
  houseNumber: z.string().min(1).max(15),
  postalCode: z.string().regex(/^\d{5}$/),
  city: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[+\d][\d /()-]{5,35}$/),
});
/** Single reviewed public source. Existing suppression, duplicate and campaign rules remain mandatory. */
export async function importProfileControl(input: unknown, actor: string) {
  const p = profileControlSchema.parse(input);
  dataSourceText('public_profile', p.sourceUrl);
  const db = getDb(),
    cfg = await getConfig();
  const branch = cfg.targeting.branches.find((b) => b.key === p.branch);
  if (!branch?.active) throw new Error('Zielbranche ist nicht freigegeben.');
  const identity = businessHash(p.businessName, p);
  const phone = businessPhoneKey(p.phone);
  if (!phone) throw new Error('Telefonnummer ist für die Dublettenprüfung unvollständig.');
  return db.transaction(async (tx) => {
    // One-off imports with the same phone but different addresses must not race past each other.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('control-import'))`);
    if (await isSuppressed(tx, { name: p.businessName, ...p, source: 'public_profile', sourceId: p.sourceUrl }))
      throw new Error('Sperrlisteneintrag: kein neuer Kontrollbetrieb.');
    const candidates = await tx
      .select()
      .from(leads)
      .where(
        or(
          eq(leads.identityHash, identity),
          eq(leads.sourceId, p.sourceUrl),
          sql`right(regexp_replace(${leads.phone}, '[^0-9]', '', 'g'), 8) = ${phone.slice(-8)}`,
        ),
      );
    const matches = candidates.filter(
      (l) => l.identityHash === identity || l.sourceId === p.sourceUrl || businessPhoneKey(l.phone) === phone,
    );
    if (matches.some((l) => l.identityHash !== identity) || matches.length > 1)
      throw new Error('Mögliche Dublette mit abweichender Identität oder Anschrift; manuelle Zusammenführung erforderlich.');
    const existing = matches[0];
    if (existing) {
      if (existing.anonymizedAt || ['rejected', 'suppressed', 'expired'].includes(existing.status))
        throw new Error('Bestehender Betrieb ist gesperrt oder ungeeignet.');
      return existing.id;
    }
    const [lead] = await tx
      .insert(leads)
      .values({
        source: 'public_profile',
        sourceId: p.sourceUrl,
        businessName: p.businessName,
        branch: p.branch,
        branchGroup: branch.group,
        industry: branch.industry,
        city: p.city,
        street: p.street,
        houseNumber: p.houseNumber,
        postalCode: p.postalCode,
        phone: p.phone,
        identityHash: identity,
        trackToken: randomToken(24),
        segmentKey: segmentKey(p.city, branch.group, p.branch),
        status: 'discovered',
        hasWebsite: false,
        socialOnly: true,
        sourceFetchedAt: new Date(),
      })
      .returning({ id: leads.id });
    await audit(tx, {
      entity: 'lead',
      entityId: lead!.id,
      action: 'reviewed_profile_import',
      actor,
      context: { source: 'public_profile', noSend: true },
    });
    return lead!.id;
  });
}
