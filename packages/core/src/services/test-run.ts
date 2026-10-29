import { desc, eq } from 'drizzle-orm';
import { demoUrl, trackUrl } from '../config/env';
import { getConfig, getSetting, setSetting } from '../config/service';
import { getDb } from '../db/client';
import { demos, leads, letters } from '../db/schema';
import { enqueue, QUEUES } from '../queue';
import QRCode from 'qrcode';
import { randomToken } from '../util/crypto';
import { audit } from './audit';

/**
 * Testlauf: ein erfundener Betrieb geht den echten Weg (Demo bauen → prüfen → online → Brief → QR → Kauf).
 * Quelle `mock`: solche Betriebe bekommen nie einen echten Brief (Sperre im Versand), zählen nicht zu den ersten 30
 * Pflichtprüfungen und sind am Namen „Beispiel“ erkennbar. Zahlung, E-Mail und Domain laufen in dieser Umgebung über
 * die Test-Anbieter.
 */
const KEY = 'testrun:last';

export interface TestRunStatus {
  leadId: string;
  name: string;
  startedAt: string;
  stage: 'building' | 'review' | 'online' | 'failed';
  demoId: string | null;
  demoUrl: string | null;
  qrUrl: string;
  qrImage: string;
  letterId: string | null;
  note: string | null;
}

export async function startTestRun(actor: string): Promise<string> {
  const db = getDb();
  const cfg = await getConfig();
  const branch =
    cfg.targeting.branches.find((b) => b.active && b.key === 'maler') ?? cfg.targeting.branches.find((b) => b.active);
  if (!branch) throw new Error('Keine aktive Branche eingestellt');
  const city = cfg.targeting.cities[0] ?? 'Dortmund';
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: `testlauf-${randomToken(8)}`,
      businessName: `${branch.label} Beispiel ${city}`,
      branch: branch.key,
      branchGroup: branch.group,
      city,
      street: 'Beispielstraße',
      houseNumber: '1',
      postalCode: '44137',
      phone: '0231 0000000',
      segmentKey: `test:${branch.group}:${branch.key}`,
      trackToken: randomToken(24),
      identityHash: randomToken(16),
      status: 'qualified',
    })
    .returning();
  await enqueue(QUEUES.buildDemo, { leadId: lead!.id, triggeredBy: 'testlauf' }, { singletonKey: `demo:${lead!.id}` });
  await setSetting(KEY, { leadId: lead!.id, startedAt: new Date().toISOString() }, actor);
  await audit(db, { entity: 'lead', entityId: lead!.id, action: 'test_run_started', actor });
  return lead!.id;
}

export async function testRunStatus(): Promise<TestRunStatus | null> {
  const last = await getSetting<{ leadId: string; startedAt: string } | null>(KEY, null);
  if (!last) return null;
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, last.leadId) });
  if (!lead) return null;
  const [demo] = await db.select().from(demos).where(eq(demos.leadId, lead.id)).orderBy(desc(demos.createdAt)).limit(1);
  const [letter] = await db
    .select({ id: letters.id })
    .from(letters)
    .where(eq(letters.leadId, lead.id))
    .orderBy(desc(letters.createdAt))
    .limit(1);
  const qrUrl = trackUrl(`/q/${lead.trackToken}`);
  const stage: TestRunStatus['stage'] = !demo
    ? 'building'
    : demo.status === 'published'
      ? 'online'
      : demo.status === 'pending_review' || demo.status === 'approved'
        ? 'review'
        : demo.status === 'building'
          ? 'building'
          : 'failed';
  return {
    leadId: lead.id,
    name: lead.businessName,
    startedAt: last.startedAt,
    stage,
    demoId: demo?.id ?? null,
    demoUrl: demo?.status === 'published' ? demoUrl(`/d/${demo.slug}`) : null,
    qrUrl,
    qrImage: await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M', margin: 2, width: 480 }),
    letterId: letter?.id ?? null,
    note: stage === 'failed' ? `Demo-Status: ${demo?.status}${demo?.reviewNote ? ` (${demo.reviewNote})` : ''}` : null,
  };
}
