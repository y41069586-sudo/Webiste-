import { and, desc, eq, notInArray, sql } from 'drizzle-orm';
import { getConfig } from '../config/service';
import { effectiveSwitches } from '../config/service';
import { getDb } from '../db/client';
import { leads } from '../db/schema';
import { WEBSITE_METHODS, type LeadResearch } from '../leads/acquisition';
import { enqueue, QUEUES } from '../queue';
import { saveLeadResearch } from './lead-research';
import { transitionLead } from './lead-state';
import { audit } from './audit';

/**
 * Der Ablauf vom Fund bis zum Kauf als feste Schrittfolge – für die Seite „Ablauf“. Jeder Schritt sagt, ob er
 * automatisch läuft oder auf den Betreiber wartet, und wie viele Betriebe gerade dort stehen.
 */
export interface WorkflowStep {
  key: 'finden' | 'pruefen' | 'demo_bauen' | 'demo_pruefen' | 'brief_erstellen' | 'brief_freigeben' | 'versand' | 'antworten';
  title: string;
  /** auto = läuft von selbst; du = wartet auf dich; aus = Automatik ausgeschaltet */
  mode: 'auto' | 'du' | 'aus';
  count: number;
  hint: string;
  href: string;
  action: string;
}

export async function workflowStatus(): Promise<{ steps: WorkflowStep[]; nextStep: WorkflowStep['key'] | null }> {
  const db = getDb();
  const cfg = await getConfig();
  const sw = effectiveSwitches(cfg);
  const r = await db.execute<Record<string, number>>(sql`SELECT
      (SELECT count(*)::int FROM leads WHERE anonymized_at IS NULL AND status = 'discovered') AS discovered,
      (SELECT count(*)::int FROM leads WHERE anonymized_at IS NULL AND status = 'qualified') AS qualified,
      (SELECT count(*)::int FROM demos WHERE status = 'building') AS building,
      (SELECT count(*)::int FROM leads WHERE anonymized_at IS NULL AND status = 'demo_built') AS demo_built,
      (SELECT count(*)::int FROM leads WHERE anonymized_at IS NULL AND status IN ('demo_approved', 'demo_published')) AS demo_published,
      (SELECT count(*)::int FROM leads WHERE anonymized_at IS NULL AND status = 'letter_generated') AS letter_generated,
      (SELECT count(*)::int FROM leads WHERE anonymized_at IS NULL AND status = 'letter_approved') AS letter_approved,
      (SELECT count(*)::int FROM leads WHERE anonymized_at IS NULL AND status IN ('letter_sent', 'letter_delivered', 'followup_sent')) AS sent,
      (SELECT count(*)::int FROM leads WHERE anonymized_at IS NULL AND status IN ('scanned', 'cta_clicked', 'checkout_started')) AS interested,
      (SELECT count(*)::int FROM leads WHERE anonymized_at IS NULL AND status IN ('paid', 'onboarding', 'preview_approved', 'live')) AS customers,
      (SELECT count(*)::int FROM support_messages WHERE direction = 'in' AND status IN ('new', 'classified', 'drafted', 'escalated')) AS support`);
  const n = r.rows[0] ?? {};
  const v = (k: string) => Number(n[k] ?? 0);
  const steps: WorkflowStep[] = [
    {
      key: 'finden',
      title: 'Betriebe finden',
      mode: cfg.segments.weeklyLeadFinder ? 'auto' : 'du',
      count: v('discovered'),
      hint: cfg.segments.weeklyLeadFinder
        ? 'Sucht jeden Montag von selbst neue Betriebe.'
        : 'Die wöchentliche Suche ist aus – hier startest du sie.',
      href: '/admin/suche',
      action: 'Mehr suchen',
    },
    {
      key: 'pruefen',
      title: 'Betriebe prüfen',
      mode: 'du',
      count: v('discovered'),
      hint: 'Bei jedem Betrieb kurz im Internet nachsehen und drei Haken setzen.',
      href: '/admin/ablauf/pruefen',
      action: 'Jetzt prüfen',
    },
    {
      key: 'demo_bauen',
      title: 'Demo bauen',
      mode: 'auto',
      count: v('qualified') + v('building'),
      hint: 'Passiert von selbst, sobald du einen Betrieb geprüft hast.',
      href: '/admin/demos',
      action: 'Demos ansehen',
    },
    {
      key: 'demo_pruefen',
      title: 'Demo prüfen',
      mode: sw.autoApproveDemos ? 'auto' : 'du',
      count: v('demo_built'),
      hint: 'Demo ansehen und freigeben. Danach kommt automatisch die nächste.',
      href: '/admin/ablauf/naechste-demo',
      action: 'Demos prüfen',
    },
    {
      key: 'brief_erstellen',
      title: 'Brief erstellen',
      mode: 'auto',
      count: v('demo_published'),
      hint: 'Passiert von selbst, sobald die Demo freigegeben ist.',
      href: '/admin/letters',
      action: 'Briefe ansehen',
    },
    {
      key: 'brief_freigeben',
      title: 'Brief freigeben',
      mode: sw.autoSend ? 'auto' : 'du',
      count: v('letter_generated'),
      hint: sw.autoSend ? 'Passiert von selbst.' : 'Brief lesen und freigeben. Danach kommt automatisch der nächste.',
      href: '/admin/ablauf/naechster-brief',
      action: 'Briefe prüfen',
    },
    {
      key: 'versand',
      title: 'Abschicken',
      mode: sw.autoSend && !sw.dryRun ? 'auto' : 'du',
      count: v('letter_approved'),
      hint: sw.dryRun ? 'Testmodus: Es wird nichts gedruckt oder verschickt.' : 'Freigegebene Briefe gehen in die Post.',
      href: '/admin/letters',
      action: 'Abschicken',
    },
    {
      key: 'antworten',
      title: 'Antworten & Käufe',
      mode: 'auto',
      count: v('interested') + v('support'),
      hint: `${v('sent')} Briefe unterwegs · ${v('interested')} interessiert · ${v('customers')} Kunden. Fragen beantwortest du hier.`,
      href: '/admin/support',
      action: 'Nachrichten',
    },
  ];
  const nextStep = steps.find((s) => s.mode === 'du' && s.count > 0 && s.key !== 'finden')?.key ?? null;
  return { steps, nextStep };
}

/**
 * Nächster zu prüfender Betrieb: noch nie geprüfte vor bereits begonnenen, darin höchste Vorauswahl zuerst;
 * übersprungene bleiben außen vor.
 */
export async function nextLeadForReview(skip: string[] = []) {
  const ids = skip.filter((id) => /^[0-9a-f-]{36}$/.test(id)).slice(0, 200);
  const rows = await getDb()
    .select()
    .from(leads)
    .where(
      and(eq(leads.status, 'discovered'), sql`${leads.anonymizedAt} IS NULL`, ids.length ? notInArray(leads.id, ids) : undefined),
    )
    .orderBy(
      sql`EXISTS (SELECT 1 FROM settings s WHERE s.key = 'lead-research:' || ${leads.id}::text)`,
      desc(leads.prescreenScore),
      desc(leads.createdAt),
    )
    .limit(1);
  const remaining = await getDb().execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM leads WHERE status = 'discovered' AND anonymized_at IS NULL`,
  );
  return { lead: rows[0] ?? null, remaining: remaining.rows[0]?.n ?? 0 };
}

export interface QuickReviewInput {
  websiteFound: boolean;
  /** Durchgeführte Website-Suchen (alle vier sind für „keine Website“ nötig) */
  methods: (typeof WEBSITE_METHODS)[number][];
  addressOk: boolean;
  operational: boolean;
  independent: boolean;
  privateClients: boolean;
  businessClients: boolean;
  services: string[];
  demand?: {
    kind: 'service_advertising' | 'available_dates' | 'new_offer' | 'expansion' | 'takeover' | 'active_profile';
    text: string;
  } | null;
  /** HTTPS-Quelle der Prüfung (z. B. Profil, Branchenbuch); ohne Angabe eine interne Prüfreferenz */
  source?: string;
  lawfulUse: boolean;
}

/** Schnellprüfung in eine vollständige, geprüfte Recherche übersetzen (gleiche Regeln wie das ausführliche Formular). */
export function quickResearch(
  input: QuickReviewInput,
  now = new Date(),
): Omit<LeadResearch, 'version' | 'identityHash' | 'checkedAt'> {
  if (!input.lawfulUse) throw Error('Bitte bestätigen, dass die Angaben geprüft und zulässig genutzt werden.');
  const day = now.toISOString().slice(0, 10);
  const at = `${day}T00:00:00.000Z`;
  const source =
    input.source?.trim() && /^https:\/\//.test(input.source.trim()) ? input.source.trim() : `review:schnellpruefung/${day}`;
  const signal = (kind: LeadResearch['signals'][number]['kind'], text: string) => ({
    kind,
    text,
    source,
    observedAt: at,
    verified: true as const,
  });
  const signals: LeadResearch['signals'] = [];
  if (input.addressOk) signals.push(signal('address', 'Zustellanschrift geprüft'));
  if (input.operational) signals.push(signal('operational', 'Betrieb aktuell aktiv'));
  if (input.independent) signals.push(signal('independent', 'Eigenständiger Betrieb, keine Kette'));
  if (input.privateClients) signals.push(signal('private_clients', 'Angebot für Privatkunden'));
  if (input.businessClients) signals.push(signal('business_clients', 'Angebot für Gewerbekunden'));
  for (const s of input.services
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 3)) {
    if (s.length > 40) throw Error('Leistungstitel höchstens 40 Zeichen.');
    signals.push(signal('service', s));
  }
  if (input.demand?.text.trim()) signals.push(signal(input.demand.kind, input.demand.text.trim().slice(0, 140)));
  return {
    lawfulUseConfirmed: true,
    website: {
      result: input.websiteFound ? 'found' : 'not_found',
      checkedAt: at,
      source,
      methods: input.methods,
    },
    signals,
  };
}

/** Schnellprüfung speichern; geeignete Betriebe stoßen sofort den Demo-Bau an. */
export async function saveQuickReview(leadId: string, input: QuickReviewInput, actor: string) {
  const assessment = await saveLeadResearch(leadId, quickResearch(input), actor);
  if (assessment.state === 'ready')
    await enqueue(QUEUES.pipelineTick, {}, { singletonKey: 'pipeline-tick-now' }).catch(() => null);
  return assessment;
}

/** Betrieb in der Schnellprüfung aussortieren (umkehrbar). */
export async function rejectInQuickReview(leadId: string, reason: string, actor: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const lead = await tx.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!lead || !['discovered', 'qualified'].includes(lead.status)) return;
    await tx
      .update(leads)
      .set({ rejectionReasons: [...new Set([...lead.rejectionReasons, 'manual'])], updatedAt: new Date() })
      .where(eq(leads.id, leadId));
    await transitionLead(tx, leadId, 'rejected', { actor, reason: reason || 'manual' });
  });
  await audit(db, { entity: 'lead', entityId: leadId, action: 'quick_review_reject', actor, context: { reason } });
}
