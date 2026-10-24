import { and, eq } from 'drizzle-orm';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { events, letters } from '../db/schema';
import { whatsappUrl } from '../demos/build';
import { audit } from './audit';
import { raiseAlert } from './budget';
import { transitionLead } from './lead-state';
import { rateLimit } from './rate-limit';
import { findPublicDemo, recordEvent, type RequestMeta } from './tracking';

/**
 * Messung (Update 2, B6.1): Ereignisse am Token des Briefs, ohne Cookies und ohne vollständige IP.
 */

export interface EngagementPayload {
  /** Verweildauer in Sekunden */
  t: number;
  /** Maximale Scrolltiefe in Prozent */
  s: number;
  /** Angeklickte Abschnitte (Anker-IDs) */
  c: string[];
}

/** Eingaben aus dem Browser streng begrenzen – es werden nur grobe Werte gespeichert. */
export function sanitizeEngagement(raw: unknown): EngagementPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const t = Number(r.t);
  const s = Number(r.s);
  if (!Number.isFinite(t) || !Number.isFinite(s) || t < 0 || s < 0) return null;
  const c = Array.isArray(r.c) ? r.c.filter((x): x is string => typeof x === 'string' && /^[a-z0-9-]{1,40}$/.test(x)) : [];
  return {
    // grobe Stufen statt Rohwerten
    t: Math.min(1800, Math.round(t / 5) * 5),
    s: Math.min(100, Math.round(s / 10) * 10),
    c: [...new Set(c)].slice(0, 20),
  };
}

/** Beacon der Demo-Seite: Verweildauer, Scrolltiefe, angeklickte Abschnitte. */
export async function recordDemoEngagement(slug: string, raw: unknown, req: RequestMeta): Promise<boolean> {
  if (req.isBot) return false;
  const payload = sanitizeEngagement(raw);
  if (!payload) return false;
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok') return false;
  const db = getDb();
  const rl = await rateLimit(db, `beacon:${found.lead.id}:${req.ipHash}`, 30, 86_400);
  if (!rl.allowed) return false;
  return recordEvent(db, {
    leadId: found.lead.id,
    type: 'demo_engagement',
    meta: { demoId: found.demo.id, seconds: payload.t, scroll: payload.s, sections: payload.c },
    req,
  });
}

/** WhatsApp-Klick zählen und zum wa.me-Link weiterleiten (null = keine Nummer hinterlegt oder Demo weg). */
export async function whatsappRedirect(slug: string, req: RequestMeta): Promise<string | null> {
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok') return null;
  const target = whatsappUrl(await getConfig(), found.demo.slug);
  if (!target) return null;
  await recordEvent(getDb(), { leadId: found.lead.id, type: 'whatsapp_click', req });
  return target;
}

/**
 * Rücksendung „unzustellbar“ manuell erfassen (B6.1, Button am Lead). Markiert den Brief, setzt den Lead auf
 * failed und zählt für die Unzustellbar-Bremse (B6.7).
 */
export async function markLetterUndeliverable(letterId: string, actor: string): Promise<boolean> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const letter = await tx.query.letters.findFirst({ where: eq(letters.id, letterId) });
    if (!letter || letter.undeliverable || letter.isTest) return false;
    await tx
      .update(letters)
      .set({ undeliverable: true, status: 'failed', statusReason: 'Rücksendung: unzustellbar', updatedAt: new Date() })
      .where(and(eq(letters.id, letterId), eq(letters.undeliverable, false)));
    await tx.insert(events).values({ leadId: letter.leadId, type: 'undeliverable', metaJson: { letterId } });
    await transitionLead(tx, letter.leadId, 'failed', { actor, reason: 'Brief unzustellbar (Rücksendung)', soft: true });
    await audit(tx, { entity: 'letter', entityId: letterId, action: 'undeliverable', actor });
    await raiseAlert(tx, {
      level: 'warn',
      code: `letter_undeliverable:${letterId}`,
      message: 'Brief als unzustellbar erfasst – Anschrift des Leads prüfen.',
      context: { letterId },
    });
    return true;
  });
}
