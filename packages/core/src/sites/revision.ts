import { ICON_KEYS } from '@wbm/templates/icons';
import type { SiteContent } from '@wbm/templates/types';
import { DEMO_CONTENT_SCHEMA, normalizeContent, type RuleViolation } from '../demos/content';
import { registerMockStructured } from '../providers/llm/mock';

export const REVISION_TOOL_NAME = 'website_ueberarbeitung';

export const REVISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['content', 'not_possible', 'summary'],
  properties: {
    content: DEMO_CONTENT_SCHEMA,
    not_possible: {
      type: 'array',
      description: 'Wünsche, die sich NICHT durch Textänderungen umsetzen lassen (z. B. neue Unterseiten, Online-Buchung, Shop, anderes Layout). Leer, wenn alles umgesetzt wurde.',
      items: { type: 'string' },
    },
    summary: { type: 'string', description: 'Ein bis drei Sätze: was wurde geändert (für den Kunden, Sie-Form).' },
  },
} as const;

export const REVISION_SYSTEM_PROMPT = `Du überarbeitest die Texte der Website eines lokalen Betriebs in Deutschland. Der Betrieb hat die Website gekauft und eigene Angaben gemacht. Grundlage sind die bisherigen Texte (Entwurf) und die Angaben bzw. Änderungswünsche des Inhabers.

REGELN:
1. Angaben des Inhabers haben Vorrang. Übernimm seine Leistungen, Texte und Wünsche inhaltlich vollständig, korrigiere nur Rechtschreibung, Stil und Länge.
2. Erfinde NICHTS hinzu: keine Jahreszahlen, Erfahrungsjahre, Titel, Zertifikate, Auszeichnungen, Teamgrößen, Personennamen, Preise, Garantien, Reaktionszeiten, Notdienste oder Einzugsgebiete – es sei denn, der Inhaber nennt sie ausdrücklich in seinen Angaben. Dann darfst du sie wörtlich übernehmen.
3. Keine Bewertungen, Sterne, Kundenstimmen oder Zitate.
4. Keine Links, E-Mail-Adressen, Telefonnummern oder Domains im Fließtext (Kontaktdaten stehen separat auf der Seite).
5. Die Leistungen sind jetzt echte Leistungen des Betriebs (kein „Beispiel“-Hinweis). Nutze die vom Inhaber genannten Leistungen; ergänze keine weiteren. Hat er weniger als 3 genannt, formuliere nur seine.
6. Deutsch, Sie-Form, freundlich-sachlich, keine Superlative.
7. Wünsche, die keine Textänderung sind (z. B. Online-Terminbuchung, Shop, weitere Unterseiten, Layout), setzt du nicht um, sondern listest sie unter not_possible.
8. Halte die Längen ein: Überschrift max. 70 Zeichen, Untertitel max. 180, Leistungstitel max. 40, Leistungstext max. 160, Über uns max. 700 (2 Absätze), SEO-Titel max. 60, SEO-Beschreibung max. 155, 3–4 FAQ.
9. FAQ-Antworten bleiben allgemein und dürfen nichts behaupten, was nicht aus den Angaben folgt.`;

export interface RevisionInput {
  businessName: string;
  branchLabel: string;
  city: string;
  current: SiteContent;
  customer: { headline?: string; subline?: string; about?: string; services?: { title: string; text: string }[]; wishes?: string };
  changeRequest?: string;
}

export function buildRevisionPrompt(r: RevisionInput, feedback?: string[]): string {
  const lines = [
    `Firmenname: ${r.businessName}`,
    `Branche: ${r.branchLabel}`,
    `Stadt: ${r.city}`,
    `Erlaubte Icons: ${ICON_KEYS.join(', ')}`,
    '',
    'AKTUELLE_TEXTE_JSON:',
    JSON.stringify(r.current),
    '',
    'ANGABEN_DES_INHABERS_JSON:',
    JSON.stringify(r.customer),
  ];
  if (r.changeRequest) lines.push('', 'ÄNDERUNGSWUNSCH:', r.changeRequest);
  if (feedback?.length) lines.push('', 'Der letzte Versuch verletzte diese Regeln – bitte korrigieren:', ...feedback.map((f) => `- ${f}`));
  lines.push('', `Gib die überarbeiteten Texte über das Werkzeug ${REVISION_TOOL_NAME} zurück.`);
  return lines.join('\n');
}

const RISKY: { rule: string; re: RegExp }[] = [
  { rule: 'Historie/Erfahrung', re: /\bseit\b|gegründet|jahrzehnt|tradition|familienbetrieb|generation|jahre(n)?\s+erfahrung/gi },
  { rule: 'Titel/Zertifikate', re: /auszeichnung|preisgekrönt|prämiert|zertifi\w*|\btüv\b|meister\w*|innung\w*|testsieger|siegel/gi },
  { rule: 'Preise/Garantien', re: /€|\beuro\b|garantie\w*|garantiert|notdienst|rund\s+um\s+die\s+uhr|24\s*\/\s*7|kostenlos|gratis|rabatt\w*/gi },
  { rule: 'Einzugsgebiet', re: /umgebung|umkreis|ruhrgebiet|region\w*/gi },
  { rule: 'Superlative', re: /(?<!\bam\s)\b(beste[nrms]?|bester|nummer\s+eins|marktführer|einzigartig|unschlagbar)\b/gi },
];

const ALWAYS: { rule: string; re: RegExp }[] = [
  { rule: 'Bewertungen/Testimonials', re: /bewertung|rezension|sterne|kundenstimme|testimonial|zufriedene[nr]?\s+kund/i },
  { rule: 'Platzhalter', re: /lorem|ipsum|\[|\]|\{|\}|\btodo\b|xxx|platzhalter|mustermann/i },
  { rule: 'Links/Kontaktdaten', re: /https?:|www\.|@|\.de\b|\.com\b/i },
  { rule: 'Beispiel-Hinweis', re: /beispiel-?leistung/i },
];

const LIMITS: Record<string, [number, number]> = {
  hero_headline: [5, 70],
  hero_subline: [15, 180],
  about: [40, 700],
  cta_text: [3, 32],
  seo_title: [10, 70],
  seo_description: [30, 160],
};

/**
 * Prüfung überarbeiteter Kundentexte: Riskante Behauptungen (Jahre, Titel, Preise …) sind nur
 * erlaubt, wenn der Inhaber sie selbst genannt hat; Zahlen nur, wenn sie in seinen Angaben vorkommen.
 */
export function validateRevision(c: SiteContent, customerText: string, knownFacts: string[]): RuleViolation[] {
  const v: RuleViolation[] = [];
  const source = `${customerText}\n${knownFacts.join('\n')}`.toLowerCase();
  if (!Array.isArray(c.services) || c.services.length < 1 || c.services.length > 6) v.push({ field: 'services', rule: 'Anzahl', detail: `${c.services?.length ?? 0} Leistungen (1–6)` });
  if (!Array.isArray(c.faq) || c.faq.length < 2 || c.faq.length > 5) v.push({ field: 'faq', rule: 'Anzahl', detail: `${c.faq?.length ?? 0} Fragen (2–5)` });
  if (v.length) return v;
  for (const [field, [min, max]] of Object.entries(LIMITS)) {
    const n = String((c as unknown as Record<string, string>)[field] ?? '').trim().length;
    if (n < min || n > max) v.push({ field, rule: 'Länge', detail: `${n} Zeichen (erlaubt ${min}–${max})` });
  }
  c.services.forEach((s, i) => {
    if (s.title.trim().length < 2 || s.title.length > 40) v.push({ field: `services[${i}].title`, rule: 'Länge', detail: `${s.title.length} Zeichen` });
    if (s.text.trim().length < 5 || s.text.length > 170) v.push({ field: `services[${i}].text`, rule: 'Länge', detail: `${s.text.length} Zeichen` });
    if (!(ICON_KEYS as string[]).includes(s.icon)) v.push({ field: `services[${i}].icon`, rule: 'Icon', detail: s.icon });
  });
  const fields: [string, string][] = [
    ['hero_headline', c.hero_headline],
    ['hero_subline', c.hero_subline],
    ['about', c.about],
    ['cta_text', c.cta_text],
    ['seo_title', c.seo_title],
    ['seo_description', c.seo_description],
    ...c.services.flatMap((s, i): [string, string][] => [
      [`services[${i}].title`, s.title],
      [`services[${i}].text`, s.text],
    ]),
    ...c.faq.flatMap((f, i): [string, string][] => [
      [`faq[${i}].q`, f.q],
      [`faq[${i}].a`, f.a],
    ]),
  ];
  for (const [field, value] of fields) {
    if (!value?.trim()) {
      v.push({ field, rule: 'Leer', detail: 'Feld ist leer' });
      continue;
    }
    for (const { rule, re } of ALWAYS) {
      const m = re.exec(value);
      if (m && !source.includes(m[0].toLowerCase())) v.push({ field, rule, detail: `„${m[0]}“` });
    }
    for (const { rule, re } of RISKY) {
      for (const m of value.matchAll(re)) {
        if (!source.includes(m[0].toLowerCase())) v.push({ field, rule, detail: `„${m[0]}“ steht nicht in den Angaben des Inhabers` });
      }
    }
    for (const m of value.matchAll(/\d+/g)) {
      if (!source.includes(m[0])) v.push({ field, rule: 'Zahlen', detail: `„${m[0]}“ steht nicht in den Angaben des Inhabers` });
    }
  }
  return v;
}

export interface RevisionOutput {
  content: SiteContent;
  not_possible: string[];
  summary: string;
}

/** Kundentexte direkt (ohne KI) in den Inhalt übernehmen – Fallback und Grundlage für den Mock. */
export function mergeCustomerTexts(current: SiteContent, customer: RevisionInput['customer']): SiteContent {
  const services = customer.services?.filter((s) => s.title.trim() && s.text.trim()) ?? [];
  const icons = current.services.map((s) => s.icon);
  return normalizeContent({
    ...current,
    hero_headline: customer.headline?.trim() || current.hero_headline,
    hero_subline: customer.subline?.trim() || current.hero_subline,
    about: customer.about?.trim() || current.about,
    services: services.length
      ? services.map((s, i) => ({ title: s.title.trim().slice(0, 40), text: s.text.trim().slice(0, 160), icon: icons[i % Math.max(1, icons.length)] ?? 'check' }))
      : current.services,
  });
}

registerMockStructured(REVISION_TOOL_NAME, (req) => {
  const grab = (key: string) => {
    const m = new RegExp(`^${key}:\\n(.+)$`, 'm').exec(req.prompt);
    return m ? JSON.parse(m[1]!) : {};
  };
  const current = grab('AKTUELLE_TEXTE_JSON') as SiteContent;
  const customer = grab('ANGABEN_DES_INHABERS_JSON') as RevisionInput['customer'];
  const change = /ÄNDERUNGSWUNSCH:\n([\s\S]+?)(\n\n|$)/.exec(req.prompt)?.[1] ?? '';
  const notPossible = /shop|buchung|unterseite/i.test(change) ? [change.trim()] : [];
  return { content: mergeCustomerTexts(current, customer), not_possible: notPossible, summary: change ? 'Ihre Änderungswünsche wurden eingearbeitet.' : 'Ihre Angaben wurden übernommen.' };
});
