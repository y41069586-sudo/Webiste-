import { registerMockStructured } from '../providers/llm/mock';
import { CLAIM_REF, type LetterSlots } from '../letters/slots';
import { OBJECTION_CATEGORIES, type ObjectionCategory } from '../types';

/**
 * Lern-Agent (Update 2, B6.5): Prompt, Tool-Schema, Regeln für Varianten-Vorschläge und Mock-Antwort.
 * Reine Funktionen; Datenbank und Ablauf in `services/learning.ts`.
 */

export const LEARNING_TOOL = 'lern_agent_wochenbericht';

/** Slots, die der Agent ändern darf (Betreff, Claim, Nutzen-Satz, QR-Text, Preisdarstellung). */
export const PROPOSAL_SLOTS = ['subject', 'claim_slot_1', 'claim_slot_2', 'benefit', 'qr_label', 'offer'] as const;
export type ProposalSlot = (typeof PROPOSAL_SLOTS)[number];

/** Nur diese Slots dürfen mit AUTO_ACTIVATE_VARIANTS=true ohne Freigabe starten (B6.5). */
export const AUTO_ACTIVATE_SLOTS: readonly ProposalSlot[] = ['subject', 'benefit', 'qr_label'];

export const SLOT_LABEL: Record<ProposalSlot, string> = {
  subject: 'Betreff',
  claim_slot_1: 'Claim 1',
  claim_slot_2: 'Claim 2',
  benefit: 'Nutzen-Satz',
  qr_label: 'QR-Text',
  offer: 'Preisdarstellung',
};

/** Feste Obergrenzen je Slot (Zeichen) – zusätzlich höchstens 130 % des Ausgangstexts (Layout: 1 Seite). */
export const SLOT_MAX_CHARS: Record<ProposalSlot, number> = {
  subject: 90,
  claim_slot_1: 60,
  claim_slot_2: 60,
  benefit: 600,
  qr_label: 140,
  offer: 400,
};

export const MAX_PROPOSALS_PER_INDUSTRY = 2;
export const MAX_HYPOTHESES = 3;
export const MAX_ACTIVE_PER_INDUSTRY = 4;

export { DEFAULT_UNSUPPORTED_PROMISES } from '../config/settings';

export interface LearningAnswer {
  summary: string;
  changes: { industry: string; text: string; is_noise: boolean }[];
  dropoff: string;
  objections_comment: string;
  hypotheses: { industry: string; title: string; rationale: string }[];
  proposals: {
    industry: string;
    parent_variant_id: string;
    changed_slot: ProposalSlot;
    new_text: string;
    hypothesis: string;
    addresses_objection: ObjectionCategory | 'keiner';
  }[];
  claim_research: { industry: string; topic: string }[];
}

export const LEARNING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'changes', 'dropoff', 'objections_comment', 'hypotheses', 'proposals', 'claim_research'],
  properties: {
    summary: { type: 'string', description: '3–6 Sätze Gesamtbild der Woche, nüchtern, mit Unsicherheit.' },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['industry', 'text', 'is_noise'],
        properties: {
          industry: { type: 'string' },
          text: { type: 'string', description: 'Veränderung zur Vorwoche in einem Satz.' },
          is_noise: {
            type: 'boolean',
            description: 'true, wenn die Veränderung im Rahmen des Zufalls liegt (Spannen überlappen).',
          },
        },
      },
    },
    dropoff: {
      type: 'string',
      description: 'Wo im Ablauf springen die meisten ab (Scan → Demo → Übernehmen → Checkout → Kauf)?',
    },
    objections_comment: { type: 'string', description: 'Was die häufigsten Einwände bedeuten (ohne Zitate, ohne Namen).' },
    hypotheses: {
      type: 'array',
      maxItems: MAX_HYPOTHESES,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['industry', 'title', 'rationale'],
        properties: {
          industry: { type: 'string' },
          title: { type: 'string' },
          rationale: { type: 'string', description: 'Begründung aus den Daten des Exports.' },
        },
      },
    },
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['industry', 'parent_variant_id', 'changed_slot', 'new_text', 'hypothesis', 'addresses_objection'],
        properties: {
          industry: { type: 'string' },
          parent_variant_id: { type: 'string', description: 'ID der Ausgangsvariante (Slot-Variante dieser Branche).' },
          changed_slot: { type: 'string', enum: [...PROPOSAL_SLOTS] },
          new_text: { type: 'string', description: 'Neuer Text des einen Slots; Claims nur als {CLAIM:ID}.' },
          hypothesis: { type: 'string' },
          addresses_objection: { type: 'string', enum: [...OBJECTION_CATEGORIES, 'keiner'] },
        },
      },
    },
    claim_research: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['industry', 'topic'],
        properties: {
          industry: { type: 'string' },
          topic: { type: 'string', description: 'Wozu eine Quelle gesucht werden soll.' },
        },
      },
    },
  },
} as const;

export const LEARNING_SYSTEM = `Du bist der wöchentliche Lern-Agent eines Ein-Personen-Unternehmens, das lokalen Betrieben ohne Website per Brief einen fertigen Website-Entwurf zeigt. Du bekommst einen Datenexport ohne personenbezogene Daten (nur Kennzahlen je Branche und Briefvariante, Einwand-Kategorien, Experiment-Logbuch, Varianten-Texte und freigegebene Claims).

Aufgabe: ein ehrlicher Wochenbericht, höchstens ${MAX_HYPOTHESES} Hypothesen und neue Varianten-Vorschläge.

Statistik ehrlich:
- Mit wenigen Briefen sind Unterschiede meist Zufall. Nutze die Spannen aus dem Export. Überlappen sich Spannen, ist ein Unterschied „im Rahmen des Zufalls“ (is_noise = true). Nenne keine Gewinner, die der Export nicht als „gewinner“ ausweist.
- Erfinde keine Zahlen. Jede Zahl im Bericht stammt aus dem Export.

Regeln für Vorschläge (Verstöße werden automatisch verworfen):
- Höchstens ${MAX_PROPOSALS_PER_INDUSTRY} pro Branche. Ausgangsvariante ist eine Slot-Variante derselben Branche aus dem Export (parent_variant_id).
- Es wird immer genau EIN Slot geändert: subject (Betreff), claim_slot_1/claim_slot_2 (Claim), benefit (Nutzen-Satz), qr_label (QR-Text) oder offer (Preisdarstellung). Nie Anrede, Garantie, Pflichtangaben.
- Claims nur als {CLAIM:ID} aus der Liste der freigegebenen Claims der Branche; ein Claim-Slot enthält genau eine Referenz oder ist leer. Keine eigenen Zahlen, Statistiken, Wirkungsversprechen („mehr Kunden“, „mehr Umsatz“), keine Superlative.
- Platzhalter in geschweiften Klammern ({preise}, {eigene_domain}, {garantie_satz}, {ablaufdatum} …) bleiben erhalten. Preise, Laufzeiten und Garantie ändert nie der Agent.
- Einwände direkt ansprechen, aber nur mit Funktionen, die es gibt (Website, Domain inklusive, Hosting, Anfrageformular, zwei Preisoptionen, Garantie falls aktiv). Keine Domain-Übernahme, kein Shop, kein Buchungssystem, nichts „kostenlos“.
- Keine Idee erneut vorschlagen, die im Experiment-Logbuch schon getestet oder verworfen wurde.
- Text kurz halten: höchstens etwa so lang wie der bisherige Slot.
- Fehlt eine belegte Zahl, schlage unter claim_research vor, wonach recherchiert werden soll – erfinde keinen Claim.`;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export interface ProposalCheckInput {
  proposal: LearningAnswer['proposals'][number];
  parent: { id: string; industry: string | null; slots: LetterSlots | null; sequence: number; kind: string } | null;
  /** Freigegebene, im Playbook erlaubte Claim-IDs der Branche */
  usableClaimIds: string[];
  /** Bereits getestete oder vorhandene Texte desselben Slots (normalisiert verglichen) */
  knownTexts: string[];
  unsupportedPromises: string[];
}

/** Deterministische Regeln für einen Vorschlag (vor dem Wahrheits-Check). Leere Liste = in Ordnung. */
export function proposalViolations(i: ProposalCheckInput): string[] {
  const out: string[] = [];
  const p = i.proposal;
  if (!(PROPOSAL_SLOTS as readonly string[]).includes(p.changed_slot))
    return [`Slot „${p.changed_slot}“ darf nicht geändert werden`];
  if (!i.parent || i.parent.kind !== 'letter' || i.parent.sequence !== 1 || !i.parent.slots)
    return ['Ausgangsvariante unbekannt oder keine Slot-Variante'];
  if (i.parent.industry !== p.industry) out.push('Ausgangsvariante gehört zu einer anderen Branche');
  const before = (i.parent.slots[p.changed_slot] ?? '').trim();
  const after = p.new_text.trim();
  if (norm(before) === norm(after)) out.push('Text unverändert');
  const isClaimSlot = p.changed_slot === 'claim_slot_1' || p.changed_slot === 'claim_slot_2';
  if (isClaimSlot) {
    const refs = [...after.matchAll(CLAIM_REF)].map((m) => m[1]!);
    if (after && !/^\{CLAIM:[A-Z0-9_]+\}$/.test(after)) out.push('Claim-Slot darf nur genau eine Referenz {CLAIM:ID} enthalten');
    for (const id of refs)
      if (!i.usableClaimIds.includes(id)) out.push(`Claim ${id} ist nicht freigegeben oder für die Branche nicht erlaubt`);
  } else {
    if (!after) out.push('Text leer');
    if (/\{CLAIM:/.test(after)) out.push('Claims nur in Claim-Slots');
  }
  // Platzhalter (Preise, Domain, Garantie, Ablaufdatum) bleiben erhalten
  const placeholders = (s: string) => [...s.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]!);
  for (const ph of placeholders(before)) if (!placeholders(after).includes(ph)) out.push(`Platzhalter {${ph}} fehlt`);
  const limit = Math.min(SLOT_MAX_CHARS[p.changed_slot], Math.max(60, Math.round(before.length * 1.3)));
  if (!isClaimSlot && after.length > limit) out.push(`Text zu lang (${after.length} > ${limit} Zeichen)`);
  for (const re of i.unsupportedPromises) {
    try {
      if (new RegExp(re, 'i').test(after)) out.push(`Verspricht eine Funktion, die es nicht gibt (${re})`);
    } catch {
      // ungültiges Muster in der Config ignorieren
    }
  }
  if (i.knownTexts.some((t) => norm(t) === norm(after))) out.push('Diese Fassung wurde schon getestet oder existiert bereits');
  return out;
}

/** Slots der neuen Variante: Ausgangsvariante mit genau einem geänderten Slot. */
export function applyProposal(parent: LetterSlots, slot: ProposalSlot, text: string): LetterSlots {
  return { ...parent, [slot]: text.trim() };
}

// ---------------------------------------------------------------------------
// Mock-Antwort (ohne API-Key, Tests, Probelauf): deterministisch aus dem Export
// ---------------------------------------------------------------------------

interface ExportForMock {
  industries: {
    industry: string;
    objections: { category: string; count: number }[];
    arms: { variant_id: string; is_control: boolean; eligible: boolean; delivered: number; verdict: string }[];
    variants: { id: string; slots: LetterSlots | null; status: string }[];
    funnel: { delivered: number; scans: number; demo_views: number; cta_clicks: number; checkouts: number; purchases: number };
  }[];
}

const OBJECTION_BENEFIT: Partial<Record<string, string>> = {
  wer_sind_sie: 'Wer hinter dem Entwurf steht, sehen Sie auf der Seite unten: mit Foto, Name und Impressum.',
  habe_social_media:
    'Ihr Instagram-Profil bleibt. Die Website zeigt zusätzlich Öffnungszeiten, Leistungen und ein Anfrageformular – auch für Besucher ohne Instagram-Konto.',
  zu_teuer: 'Sie wählen selbst: einmal zahlen oder monatlich – ohne Einrichtungsgebühr und ohne versteckte Kosten.',
  laufzeit_vertrag: 'Sie wählen selbst: einmal zahlen ohne Laufzeit oder monatlich mit klar genannter Mindestlaufzeit.',
};

/** Nutzen-Satz um einen Satz ergänzen und vorne kürzen, damit die Länge etwa gleich bleibt (Layout). */
function shortenedBenefit(before: string, add: string): string {
  const sentences = before.split(/(?<=[.!?])\s+/);
  const budget = Math.round(before.length * 1.25);
  while (sentences.length > 1 && [...sentences, add].join(' ').length > budget) sentences.shift();
  return [...sentences, add].join(' ');
}

export function mockLearningAnswer(exp: ExportForMock): LearningAnswer {
  const proposals: LearningAnswer['proposals'] = [];
  const hypotheses: LearningAnswer['hypotheses'] = [];
  for (const ind of exp.industries) {
    const parent = ind.arms
      .filter((a) => !a.is_control && a.eligible)
      .map((a) => ind.variants.find((v) => v.id === a.variant_id))
      .find((v) => v?.slots);
    if (!parent?.slots) continue;
    const top = ind.objections[0];
    const benefit = top ? OBJECTION_BENEFIT[top.category] : undefined;
    if (benefit && top) {
      proposals.push({
        industry: ind.industry,
        parent_variant_id: parent.id,
        changed_slot: 'benefit',
        new_text: shortenedBenefit(parent.slots.benefit, benefit),
        hypothesis: `Der häufigste Einwand (${top.category}) wird im Nutzen-Satz direkt beantwortet.`,
        addresses_objection: top.category as ObjectionCategory,
      });
      if (hypotheses.length < MAX_HYPOTHESES)
        hypotheses.push({
          industry: ind.industry,
          title: `Einwand „${top.category}“ früh beantworten`,
          rationale: `Der Einwand kam ${top.count}-mal; der Brief geht bisher nicht darauf ein.`,
        });
    }
    proposals.push({
      industry: ind.industry,
      parent_variant_id: parent.id,
      changed_slot: 'subject',
      new_text: 'Ihre Website ist schon fertig – sehen Sie selbst',
      hypothesis: 'Ein Betreff, der den fertigen Entwurf nennt, wird häufiger gescannt als ein Branchen-Betreff.',
      addresses_objection: 'keiner',
    });
    const f = ind.funnel;
    if (f.scans > 0 && f.cta_clicks === 0 && hypotheses.length < MAX_HYPOTHESES)
      hypotheses.push({
        industry: ind.industry,
        title: 'Demo wird angesehen, aber „Seite übernehmen“ nicht geklickt',
        rationale: `${f.scans} Scans, ${f.demo_views} Demo-Aufrufe, 0 Klicks auf „Seite übernehmen“.`,
      });
  }
  return {
    summary:
      'Probelauf ohne Sprachmodell (Mock). Die Kennzahlen stammen aus dem Export; bei so wenigen Briefen sind Unterschiede zwischen den Varianten überwiegend Zufall.',
    changes: exp.industries
      .filter((i) => i.funnel.delivered > 0)
      .map((i) => ({
        industry: i.industry,
        text: `${i.funnel.delivered} zugestellte Briefe, ${i.funnel.scans} Scans.`,
        is_noise: true,
      })),
    dropoff: 'Siehe Funnel-Tabelle: die größte Lücke liegt zwischen Zustellung und Scan.',
    objections_comment: 'Die Einwände sind nach Kategorie gezählt; Texte werden nicht weitergegeben.',
    hypotheses,
    proposals,
    claim_research: [],
  };
}

registerMockStructured(LEARNING_TOOL, (req) => {
  const marker = '<<<EXPORT>>>';
  const start = req.prompt.indexOf(marker);
  const json = start >= 0 ? req.prompt.slice(start + marker.length) : '{"industries":[]}';
  return mockLearningAnswer(JSON.parse(json) as ExportForMock);
});
