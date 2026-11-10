import type { LetterData } from '@wbm/templates/letter-types';
import { registerMockStructured } from '../providers/llm/mock';
import type { Industry } from '../types';

/**
 * Wahrheits-Check (Update 2, B5.4) – blockierend vor jeder Freigabe.
 *  1. Zahlen, Prozentangaben und Faktoren im Brieftext extrahieren
 *  2. jede Zahl stammt aus einem eingesetzten, freigegebenen Claim oder einem erlaubten Platzhalterwert
 *  3. Sperrliste (Wirkungsversprechen, Rechnungs-Look, Druckwörter)
 *  4. Fußnote je Claim und Verweis auf die Quellenseite
 *  5. LLM-Prüfung auf Wirkungsaussagen, die nicht wörtlich aus einem Claim stammen
 * Geprüft wird der Werbetext (Betreff bis Grußformel und QR-Satz), nicht Anschrift, Absender und
 * Pflichthinweise.
 */

export const TRUTH_CHECK_VERSION = 1;

export interface TruthViolation {
  rule: 'number' | 'blocklist' | 'claim' | 'placeholder' | 'footnote' | 'sources_page' | 'statistics' | 'llm';
  detail: string;
  /** Wörtlich gefundene Textstelle (Sperrliste, Zahl) – für die automatische Korrektur */
  match?: string;
}

export interface ClaimForCheck {
  id: string;
  textDe: string;
  footnoteDe: string;
  status: string;
  scope: string;
  expiresAt: Date;
  industries: string[];
}

export interface TruthCheckInput {
  letter: Pick<LetterData, 'subject' | 'greeting' | 'intro' | 'offer' | 'noAction' | 'qrCaption' | 'closing' | 'postscript'> & {
    footnotes?: string[];
  };
  /** Eingesetzte Claim-Texte (inkl. Fußnotenziffer) */
  claimSpans: { id: string; text: string }[];
  /** Datensätze der verwendeten Claims */
  claims: ClaimForCheck[];
  /** Laut Playbook für die Branche erlaubte Claims */
  allowedClaimIds: string[];
  industry: Industry | null;
  /** Ausgefüllte Platzhalter, die Ziffern enthalten dürfen (Preise, Datum, Domain, Name …) */
  placeholderValues: string[];
  /** z. B. „seitenwerk.world/quellen“ */
  sourcesLabel: string;
  /** zusätzliche Sperrmuster aus der Config (Regex) */
  extraBlocklist?: string[];
  maxStatistics?: number;
  /** Feste, freigegebene Vorlagentexte (z. B. Kernbotschaft): von der KI-Prüfung ausgenommen */
  fixedTexts?: string[];
  now?: Date;
}

export interface TruthCheckResult {
  version: number;
  passed: boolean;
  checkedAt: string;
  violations: TruthViolation[];
  /** gefundene Zahlen außerhalb von Claims und Platzhaltern (sollte leer sein) */
  numbers: string[];
  claims: string[];
  llm?: { skipped?: string; unbackedEffectClaim?: boolean; statements?: string[]; error?: string };
  sourcesPage?: 'ok' | 'skipped' | 'unreachable';
}

/** Sperrliste aus B5.4 (+ Ausrufezeichen-Ketten aus B4). „kostenlos“ nur in „kostenlos ansehen“. */
export const DEFAULT_BLOCKLIST: { pattern: RegExp; label: string }[] = [
  { pattern: /\b\d+(?:[.,]\d+)?\s*(?:x|×|-?mal|-?fach)\b/i, label: 'Faktor („x-mal“)' },
  {
    pattern: /\b(?:doppelt|dreifach|vierfach|fünffach|zehnfach|verdoppel\w*|verdreifach\w*|vervielfach\w*)\b/i,
    label: 'Faktor (Wort)',
  },
  { pattern: /garantiert mehr/i, label: '„garantiert mehr“' },
  { pattern: /nachweislich/i, label: '„nachweislich“' },
  { pattern: /bewiesen/i, label: '„bewiesen“' },
  { pattern: /mehr Umsatz/i, label: '„mehr Umsatz“' },
  { pattern: /mehr Kunden garantiert/i, label: '„mehr Kunden garantiert“' },
  { pattern: /Rechnung/i, label: '„Rechnung“ (Rechnungs-Look)' },
  { pattern: /Zahlungsfrist/i, label: '„Zahlungsfrist“' },
  { pattern: /letzte Chance/i, label: '„letzte Chance“' },
  { pattern: /sofort handeln/i, label: '„sofort handeln“' },
  { pattern: /kostenlos(?!\s+ansehen)/i, label: '„kostenlos“ (nur „kostenlos ansehen“ erlaubt)' },
  { pattern: /!{2,}/, label: 'Ausrufezeichen-Kette' },
];

const NUMBER = /\d+(?:[.,]\d+)*\s*%?|%/g;

function plain(s: string): string {
  return s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

export function letterBodyText(l: TruthCheckInput['letter']): string {
  return plain([l.subject, l.greeting, ...l.intro, l.offer, l.noAction, l.qrCaption, l.closing, l.postscript ?? ''].join('\n'));
}

/** Deterministischer Teil (Schritte 1–4). */
export function checkLetterTruth(input: TruthCheckInput): TruthCheckResult {
  const now = input.now ?? new Date();
  const violations: TruthViolation[] = [];
  const body = letterBodyText(input.letter);

  // 3) Sperrliste (auf dem ganzen Text, auch innerhalb von Platzhaltern)
  const extra = (input.extraBlocklist ?? []).map((p) => ({ pattern: new RegExp(p, 'i'), label: `„${p}“` }));
  for (const b of [...DEFAULT_BLOCKLIST, ...extra]) {
    const m = body.match(b.pattern);
    if (m) violations.push({ rule: 'blocklist', detail: `${b.label}: „${m[0]}“`, match: m[0] });
  }

  // Unaufgelöste Platzhalter ({CLAIM:…} außerhalb der Claim-Slots, Tippfehler in {…})
  for (const m of body.matchAll(/\{[A-Za-z_:0-9]+\}/g)) {
    violations.push({ rule: 'placeholder', detail: `Unaufgelöster Platzhalter „${m[0]}“` });
  }

  // 2) Claims prüfen
  const byId = new Map(input.claims.map((c) => [c.id, c]));
  const usedIds = [...new Set(input.claimSpans.map((s) => s.id))];
  for (const id of usedIds) {
    const c = byId.get(id);
    if (!c) {
      violations.push({ rule: 'claim', detail: `${id}: unbekannter Claim` });
      continue;
    }
    if (c.status !== 'approved') violations.push({ rule: 'claim', detail: `${id}: nicht freigegeben (${c.status})` });
    if (c.scope !== 'DE') violations.push({ rule: 'claim', detail: `${id}: keine deutschen Daten (${c.scope})` });
    if (c.expiresAt <= now) violations.push({ rule: 'claim', detail: `${id}: Quelle abgelaufen` });
    if (input.industry && !c.industries.includes(input.industry))
      violations.push({ rule: 'claim', detail: `${id}: nicht für Branche ${input.industry}` });
    if (input.industry && !input.allowedClaimIds.includes(id))
      violations.push({ rule: 'claim', detail: `${id}: im Playbook ${input.industry} nicht erlaubt` });
    const span = input.claimSpans.find((s) => s.id === id)!;
    if (!plain(span.text).startsWith(plain(c.textDe)))
      violations.push({ rule: 'claim', detail: `${id}: Text weicht von der Bibliothek ab` });
  }
  const statistics = usedIds.filter((id) => /\d/.test(byId.get(id)?.textDe ?? '')).length;
  if (statistics > (input.maxStatistics ?? 2))
    violations.push({ rule: 'statistics', detail: `${statistics} Statistiken (höchstens ${input.maxStatistics ?? 2})` });

  // 1) Zahlen außerhalb von Claims und Platzhaltern
  let residual = body;
  const remove = [...input.claimSpans.map((s) => plain(s.text)), ...input.placeholderValues.map(plain)]
    .filter((v) => v.length > 0)
    .sort((a, b) => b.length - a.length);
  for (const v of remove) residual = residual.split(v).join(' ');
  residual = residual.replace(/[¹²³⁴]/g, ' ');
  const numbers = [...residual.matchAll(NUMBER)].map((m) => m[0].trim()).filter(Boolean);
  for (const n of numbers) {
    const at = residual.indexOf(n);
    const ctx = residual.slice(Math.max(0, at - 30), at + n.length + 30).trim();
    violations.push({ rule: 'number', detail: `Zahl ohne Claim: „${n}“ (… ${ctx} …)`, match: n });
  }

  // 4) Fußnoten und Quellenseite
  const footnotes = (input.letter.footnotes ?? []).map(plain);
  for (const id of usedIds) {
    const c = byId.get(id);
    if (c && !footnotes.some((f) => f.includes(plain(c.footnoteDe).replace(/\.$/, ''))))
      violations.push({ rule: 'footnote', detail: `${id}: Fußnote fehlt` });
  }
  if (usedIds.length && !footnotes.some((f) => f.includes(input.sourcesLabel)))
    violations.push({ rule: 'footnote', detail: `Verweis auf die Quellenseite (${input.sourcesLabel}) fehlt` });

  return {
    version: TRUTH_CHECK_VERSION,
    passed: violations.length === 0,
    checkedAt: now.toISOString(),
    violations,
    numbers,
    claims: usedIds,
  };
}

// ---------------------------------------------------------------------------
// 5) LLM-Prüfung (MODEL_BULK)
// ---------------------------------------------------------------------------
export const TRUTH_TOOL_NAME = 'pruefe_wirkungsaussagen';

export const TRUTH_SYSTEM_PROMPT = `Du prüfst deutsche Werbebriefe auf irreführende Werbung (§ 5 UWG).
Belegte Aussagen sind im Text mit [[BELEG]]…[[/BELEG]] markiert und gelten als geprüft.
Text zwischen [[VORLAGE]]…[[/VORLAGE]] ist fester, freigegebener Vorlagentext und wird nicht geprüft.
Unterscheide drei Arten von Aussagen außerhalb der Belege:
A) Beschreibung des Angebots und des Entwurfs (was die Website zeigt, Ablauf, Preise, Garantie, Ablaufdatum) sowie
   mitgelieferte Betriebsangaben: zulässig, nicht melden.
B) Allgemeine Aussage über ein mögliches Risiko oder einen möglichen Nutzen, erkennbar als Möglichkeit formuliert
   ("kann", "können", "könnte", "womöglich", "möglicherweise", "vielleicht"): zulässig, nicht melden. Beispiele:
   "Findet er dazu keine passende Website, schaut er sich womöglich beim nächsten Anbieter um."
   "So können Anfragen verloren gehen, ohne dass Sie es bemerken."
   "Ohne eigene Website könnten Ihnen potenzielle Kunden entgehen."
   Auch eine allgemeine Beschreibung, dass Interessierte online suchen und sich vorab informieren möchten, ist zulässig.
C) Konkrete Behauptung als Tatsache oder Versprechen: tatsächlicher Verlust oder Gewinn von Kunden, Anfragen oder
   Umsatz beim angeschriebenen Betrieb ("Sie verlieren Kunden", "Ihnen entgehen jeden Monat Aufträge"), jede Zahl,
   Quote oder Häufigkeit ohne Beleg, garantierte Wirkung ("bringt Ihnen mehr Kunden"). Nur das meldest du.
Melde ausschließlich Aussagen der Art C, wörtlich zitiert. Im Zweifel zwischen B und C entscheidet die Formulierung:
steht die Aussage in der Möglichkeitsform und nennt keine Zahl, ist sie B. Antworte nur über das Werkzeug.`;

export const TRUTH_TOOL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['unbacked_effect_claim', 'statements'],
  properties: {
    unbacked_effect_claim: { type: 'boolean', description: 'true, wenn mindestens eine unbelegte Wirkungsaussage vorkommt' },
    statements: {
      type: 'array',
      items: { type: 'string' },
      description: 'Wörtliche Zitate der unbelegten Aussagen (leer, wenn keine)',
    },
  },
} as const;

export interface TruthLlmAnswer {
  unbacked_effect_claim: boolean;
  statements: string[];
}

/** Brieftext für die LLM-Prüfung, Belege markiert. */
export function markedBody(input: Pick<TruthCheckInput, 'letter' | 'claimSpans' | 'fixedTexts'>): string {
  let body = letterBodyText(input.letter);
  for (const s of input.claimSpans) body = body.split(plain(s.text)).join(`[[BELEG]]${plain(s.text)}[[/BELEG]]`);
  // Groß-/Kleinschreibung des ersten Buchstabens kann je nach Position im Brief abweichen
  for (const t of input.fixedTexts ?? []) {
    const p = plain(t);
    const at = body.toLocaleLowerCase('de').indexOf(p.toLocaleLowerCase('de'));
    if (p && at >= 0)
      body = `${body.slice(0, at)}[[VORLAGE]]${body.slice(at, at + p.length)}[[/VORLAGE]]${body.slice(at + p.length)}`;
  }
  return body;
}

const EFFECT =
  /\b(?:mehr|steiger\w*|erhöh\w*|verdoppel\w*|zusätzlich\w*)\b[^.]{0,40}\b(?:Umsatz|Kunden|Kundinnen|Anfragen|Buchungen|Gäste|Aufträge|Erfolg)\b|\bgarantiert\b|\bnachweislich\b/i;

// Deterministischer Ersatz ohne API-Key (Entwicklung, Tests, DRY_RUN): sucht Wirkungsaussagen außerhalb der Belege
registerMockStructured(TRUTH_TOOL_NAME, (req) => {
  const outside = req.prompt.replace(/\[\[(BELEG|VORLAGE)\]\][\s\S]*?\[\[\/\1\]\]/g, ' ');
  const sentences = outside.split(/(?<=[.!?])\s+/).filter((s) => EFFECT.test(s));
  return { unbacked_effect_claim: sentences.length > 0, statements: sentences.map((s) => s.trim()) } satisfies TruthLlmAnswer;
});
