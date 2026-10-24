import type { Industry } from '../types';
import type { LetterVariantContent } from './variants';

/**
 * Briefe als Slot-Templates (Update 2, B5.3). Jede Variante ist ein Satz von Slot-Werten, damit das
 * Lernsystem gezielt einen Slot verändern kann. Zahlen stehen nie frei im Text: `{CLAIM:ID}` wird
 * wörtlich aus der Claims-Bibliothek eingesetzt (mit Fußnotenziffer), Platzhalter wie {preise} aus
 * der Config.
 *
 * Zusätzliche Platzhalter: {eigene_domain} → „eigener Domain wie **beispiel.de**“ bzw. „eigener Domain“.
 */
export const SLOT_KEYS = [
  'subject',
  'opening',
  'claim_slot_1',
  'claim_slot_2',
  'benefit',
  'offer',
  'risk_reversal',
  'qr_label',
] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export interface LetterSlots {
  subject: string;
  /** Erster Satz nach der Anrede (klein beginnend) */
  opening: string;
  /** Höchstens ein `{CLAIM:ID}` je Slot, sonst leer */
  claim_slot_1?: string;
  claim_slot_2?: string;
  benefit: string;
  offer: string;
  risk_reversal: string;
  qr_label: string;
}

export const CLAIM_REF = /\{CLAIM:([A-Z0-9_]+)\}/g;

/** Alle Claim-IDs, auf die eine Variante verweist. */
export function claimRefs(slots: Partial<LetterSlots>): string[] {
  const ids = new Set<string>();
  for (const k of SLOT_KEYS) {
    const v = slots[k];
    if (!v) continue;
    for (const m of v.matchAll(CLAIM_REF)) ids.add(m[1]!);
  }
  return [...ids];
}

export interface ResolvedClaim {
  id: string;
  textDe: string;
  footnoteDe: string;
}

const SUPERSCRIPTS = ['¹', '²', '³', '⁴'];

export interface SlotRendering {
  content: LetterVariantContent;
  /** Fußnoten in Reihenfolge, z. B. „¹ Bitkom Research 2025, …“ */
  footnotes: string[];
  /** Eingesetzte Claim-Texte mit Ziffer (für den Wahrheits-Check) */
  claimSpans: { id: string; text: string }[];
  claimIds: string[];
}

/**
 * Slots → Briefinhalt. Gleiche Fußnote = gleiche Ziffer (wie in B4.1). Unbekannte Claim-IDs
 * werfen einen Fehler – der Aufrufer wählt nur Varianten mit nutzbaren Claims.
 */
export function renderSlots(slots: LetterSlots, claims: Map<string, ResolvedClaim>, sourcesLabel: string): SlotRendering {
  const footnoteNo = new Map<string, number>();
  const spans: { id: string; text: string }[] = [];
  const fill = (text: string | undefined): string => {
    if (!text) return '';
    return text.replace(CLAIM_REF, (_m, id: string) => {
      const c = claims.get(id);
      if (!c) throw new Error(`Claim ${id} ist nicht nutzbar`);
      let n = footnoteNo.get(c.footnoteDe);
      if (n === undefined) {
        n = footnoteNo.size + 1;
        footnoteNo.set(c.footnoteDe, n);
      }
      const span = `${c.textDe}${SUPERSCRIPTS[n - 1] ?? `(${n})`}`;
      spans.push({ id, text: span });
      return span;
    });
  };
  const hook = [slots.opening, fill(slots.claim_slot_1), fill(slots.claim_slot_2)].filter(Boolean).join(' ');
  const footnotes = [...footnoteNo.entries()].map(
    ([text, n]) => `${SUPERSCRIPTS[n - 1] ?? `(${n})`} ${text.replace(/\.$/, '')}.`,
  );
  if (footnotes.length) footnotes.push(`Quellen: ${sourcesLabel}`);
  const offer = (withDomain: boolean) =>
    slots.offer.replace('{eigene_domain}', withDomain ? 'eigener Domain wie **{domain_vorschlag}**' : 'eigener Domain');
  return {
    content: {
      subject: slots.subject,
      greeting: 'Guten Tag, liebes Team von {firmenname},',
      ratingSentence: '',
      hook,
      intro: slots.benefit ? [slots.benefit] : [],
      offerWithDomain: offer(true),
      offerWithoutDomain: offer(false),
      noAction: slots.risk_reversal,
      closing: 'Viele Grüße',
      qrCaption: slots.qr_label,
    },
    footnotes,
    claimSpans: spans,
    claimIds: [...new Set(spans.map((s) => s.id))],
  };
}

const OFFER = 'Gefällt sie Ihnen, gehört sie Ihnen: {preise}, inklusive {eigene_domain} und Hosting. {garantie_satz}';
const RISK = 'Wenn nicht, müssen Sie nichts tun. Der Entwurf ist bis **{ablaufdatum}** online.';
const qr = (what: string) => `Scannen und Ihre ${what} ansehen – online bis {ablaufdatum}`;

export interface SlotVariantSeed {
  name: string;
  industry: Industry;
  sequence: 1;
  slots: LetterSlots;
  hypothesis: string;
}

/**
 * Startvarianten „A“ je Branche (B4). Abweichungen vom Vorschlag in B4 sind in
 * docs/entscheidungen.md begründet (Wortlaut der geprüften Claims, keine freien Zahlen).
 * Die neutrale Kontrolle ist die Variante „A – Standard“ (ohne Statistik, alle Branchen).
 */
export const SLOT_VARIANTS: SlotVariantSeed[] = [
  {
    name: 'GASTRO_A',
    industry: 'gastronomie',
    sequence: 1,
    hypothesis: 'Belegte Gewohnheit „Speisekarte vorher online ansehen“ erhöht die Scan-Rate gegenüber dem neutralen Brief.',
    slots: {
      subject: 'Ihre Speisekarte – auch für alle, die vorher online schauen',
      opening: 'bevor Gäste zum ersten Mal kommen, schauen viele zuerst im Internet nach.',
      claim_slot_1: '{CLAIM:GASTRO_SPEISEKARTE_ONLINE}',
      claim_slot_2: 'Und {CLAIM:GASTRO_WEBSITE_ERWARTET_KURZ}',
      benefit:
        'Bisher finden diese Gäste bei Ihnen keine eigene Website. Deshalb habe ich Ihnen eine gebaut: mit Platz für Ihre Speisekarte, Fotos, Öffnungszeiten, Anfahrt und einer Reservierungsanfrage. Sie ist fertig und wartet nur noch auf Ihre echten Gerichte.',
      offer: `${OFFER.replace(' {garantie_satz}', '')} Ihre Speisekarte trage ich für Sie ein. {garantie_satz}`,
      risk_reversal: RISK,
      qr_label: qr('Restaurant-Website'),
    },
  },
  {
    name: 'HANDWERK_A',
    industry: 'handwerk',
    sequence: 1,
    hypothesis: 'Der Beleg „Website als Ausschlusskriterium“ erhöht die Scan-Rate gegenüber dem neutralen Brief.',
    slots: {
      subject: 'Wenn man Sie empfiehlt, schaut man danach im Internet nach',
      opening:
        'viele Aufträge im Handwerk kommen über Empfehlungen. Aber viele prüfen danach im Internet, wen man ihnen empfohlen hat.',
      claim_slot_1: '{CLAIM:HANDWERK_OHNE_WEBSITE_AUSSORTIERT}',
      benefit:
        'Bei Ihnen finden sie bisher keine eigene Website. Deshalb habe ich Ihnen eine gebaut: Ihre Leistungen, Ihr Einzugsgebiet, ein Anfrageformular und – wenn Sie möchten – ein Bereich „Wir stellen ein“ für neue Mitarbeiter und Azubis.',
      offer: OFFER,
      risk_reversal: RISK,
      qr_label: qr('Betriebs-Website'),
    },
  },
  {
    name: 'HANDWERK_B',
    industry: 'handwerk',
    sequence: 1,
    hypothesis: 'Der Recruiting-Aufhänger (ohne Statistik) spricht Betriebe mit Personalbedarf stärker an.',
    slots: {
      subject: 'Neue Mitarbeiter finden Sie auch über Ihre Website',
      opening: 'wer sich für eine Stelle oder eine Ausbildung interessiert, schaut sich gern vorher an, wo er arbeiten würde.',
      benefit:
        'Bei Ihnen findet man bisher keine eigene Website. Deshalb habe ich Ihnen eine gebaut: mit Ihren Leistungen, Ihrem Einzugsgebiet, einem Anfrageformular und einer fertigen Seite „Wir stellen ein“ für neue Mitarbeiter und Azubis.',
      offer: OFFER,
      risk_reversal: RISK,
      qr_label: qr('Betriebs-Website'),
    },
  },
  {
    name: 'BEAUTY_A',
    industry: 'beauty',
    sequence: 1,
    hypothesis: 'Der Aufhänger „Termin anfragen ohne Telefonat“ mit Beleg zur Online-Terminvereinbarung erhöht die Scan-Rate.',
    slots: {
      subject: 'Termine anfragen – auch wenn Sie gerade keine Hand frei haben',
      opening:
        'während einer Behandlung kann niemand ans Telefon gehen. Online einen Termin zu vereinbaren, kennen viele schon vom Arzt:',
      claim_slot_1: '{CLAIM:TERMIN_ONLINE_GEWOHNT}',
      claim_slot_2: '{CLAIM:TERMIN_KEIN_TELEFONAT_KURZ}',
      benefit:
        'Deshalb habe ich Ihnen eine Website gebaut, über die man Ihre Leistungen sieht und rund um die Uhr einen Termin anfragen kann. Sie ist fertig.',
      offer: `${OFFER.replace(' {garantie_satz}', '')} Nutzen Sie schon ein Buchungstool, verlinke ich es direkt. {garantie_satz}`,
      risk_reversal: RISK,
      qr_label: qr('Studio-Website'),
    },
  },
  {
    name: 'HANDEL_A',
    industry: 'einzelhandel',
    sequence: 1,
    hypothesis: 'Der Beleg „vorab online über das Angebot informieren“ erhöht die Scan-Rate gegenüber dem neutralen Brief.',
    slots: {
      subject: 'Zeigen Sie online, was es bei Ihnen gibt',
      opening: 'bevor man in ein Geschäft geht, möchte man oft wissen, was es dort gibt.',
      claim_slot_1: '{CLAIM:HANDEL_INFO_VORHER}',
      benefit:
        'Bei Ihnen geht das bisher nicht, weil es keine eigene Website gibt. Deshalb habe ich Ihnen eine gebaut: mit Ihrem Sortiment, Öffnungszeiten, Anfahrt und einer Möglichkeit, Artikel vorab anzufragen. Sie ist fertig.',
      offer: OFFER,
      risk_reversal: RISK,
      qr_label: qr('Laden-Website'),
    },
  },
  {
    name: 'KURSE_A',
    industry: 'kurse_training',
    sequence: 1,
    hypothesis: 'Der Aufhänger „Probestunde ohne Anruf“ mit Beleg zur Online-Terminvereinbarung erhöht die Scan-Rate.',
    slots: {
      subject: 'Probestunde anfragen – auch spät am Abend',
      opening:
        'wer einen Kurs ausprobieren möchte, will oft nicht bis zu den Bürozeiten warten. Online einen Termin zu vereinbaren, kennen viele schon vom Arzt:',
      claim_slot_1: '{CLAIM:TERMIN_ONLINE_GEWOHNT}',
      claim_slot_2: '{CLAIM:TERMIN_FLEXIBEL}',
      benefit:
        'Deshalb habe ich Ihnen eine Website gebaut: mit Ihrem Angebot, einem Platz für Ihren Kursplan und einer Anfrage für eine Probestunde. Sie ist fertig.',
      offer: OFFER,
      risk_reversal: RISK,
      qr_label: qr('Kurs-Website'),
    },
  },
];
