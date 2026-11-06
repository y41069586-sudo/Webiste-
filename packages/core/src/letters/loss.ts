import { usableClaims, type ClaimRow } from '../claims/library';
import type { DbOrTx } from '../db/client';
import { getPlaybook } from '../playbooks';
import type { Industry } from '../types';
import { LOSS_CLAIMS } from './loss-claims';

export { ALL_LOSS_CLAIM_IDS, LOSS_CLAIMS } from './loss-claims';
export { LOSS_BRIDGE, LOSS_LETTER_VERSION, lossHook, lossSubject } from './loss-copy';

/**
 * Brief „Kunden, die Sie gerade verlieren könnten“ (06.11.2026, Betreiber: „ihnen den Vorteil vom Umsatz erzählen …
 * es bleibt so viel hängen ohne Website“). Verlust nur als Möglichkeit und nur zusammen mit
 *  1. dem dokumentierten Rechercheergebnis „kein eigener Webauftritt gefunden“ und
 *  2. genau einer freigegebenen, deutschen, im Playbook erlaubten Studienaussage mit Fußnote.
 * Fehlt eines davon, bleibt der bisherige neutrale Einladungstext (§ 5 UWG: keine unbelegte Wirkungsaussage).
 */

/** Erster nutzbarer Beleg der Branche (freigegeben, gültig, DE, im Playbook erlaubt) oder null. */
export async function pickLossClaim(db: DbOrTx, industry: Industry | null, now = new Date()): Promise<ClaimRow | null> {
  const ids = industry ? LOSS_CLAIMS[industry] : undefined;
  if (!industry || !ids?.length) return null;
  const allowed = new Set(getPlaybook(industry).allowed_claims);
  const usable = await usableClaims(db, { industry, ids, now });
  for (const id of ids) {
    const c = usable.find((u) => u.id === id);
    if (c && allowed.has(id)) return c;
  }
  return null;
}

/** Beleg wörtlich mit Fußnotenziffer, wie die Slot-Briefe (Wahrheits-Check prüft Wortlaut und Fußnote). */
export function lossClaimRendering(claim: Pick<ClaimRow, 'id' | 'textDe' | 'footnoteDe'>, sourcesLabel: string) {
  const span = `${claim.textDe}¹`;
  return {
    span: { id: claim.id, text: span },
    // Eine Zeile spart Platz; enthält Fußnote und Quellenseite (beides prüft der Wahrheits-Check)
    footnotes: [`¹ ${claim.footnoteDe.replace(/\.$/, '')}. Quellen: ${sourcesLabel}`],
  };
}
