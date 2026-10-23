import { ICON_KEYS, ICONS_BY_GROUP, type SiteContent } from '@wbm/templates';
import type { BranchGroup } from '../types';

/** Fakten, die das Modell kennen darf (alle aus den Lead-Daten, nichts erfunden). */
export interface ContentFacts {
  name: string;
  branchLabel: string;
  branchKey: string;
  group: BranchGroup;
  city: string;
  postalCode: string;
  street: string;
  houseNumber: string;
  phone: string | null;
  hasOpeningHours: boolean;
  socialOnly: boolean;
}

// ---------------------------------------------------------------------------
// JSON-Schema für das Tool (strict: additionalProperties=false, alle Felder required)
// ---------------------------------------------------------------------------
export const DEMO_TOOL_NAME = 'website_inhalte';

export const DEMO_CONTENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['hero_headline', 'hero_subline', 'services', 'about', 'cta_text', 'seo_title', 'seo_description', 'faq'],
  properties: {
    hero_headline: { type: 'string', description: 'Überschrift, 3–8 Wörter, max. 70 Zeichen' },
    hero_subline: { type: 'string', description: 'Ein bis zwei Sätze, max. 180 Zeichen' },
    services: {
      type: 'array',
      description: '4 bis 6 branchentypische Beispiel-Leistungen',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'text', 'icon'],
        properties: {
          title: { type: 'string', description: 'max. 40 Zeichen' },
          text: { type: 'string', description: '1–2 kurze Sätze, max. 160 Zeichen' },
          icon: { type: 'string', enum: ICON_KEYS },
        },
      },
    },
    about: { type: 'string', description: 'Neutraler Text, 2 kurze Absätze (getrennt durch Leerzeile), max. 600 Zeichen' },
    cta_text: { type: 'string', description: 'Button-Text, 2–4 Wörter' },
    seo_title: { type: 'string', description: 'max. 60 Zeichen, mit Branche und Stadt' },
    seo_description: { type: 'string', description: 'max. 155 Zeichen' },
    faq: {
      type: 'array',
      description: '3 bis 4 branchentypische Fragen mit allgemeinen Antworten',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['q', 'a'],
        properties: { q: { type: 'string' }, a: { type: 'string' } },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------
export const DEMO_SYSTEM_PROMPT = `Du schreibst Texte für einen unverbindlichen Website-Entwurf für einen lokalen Betrieb in Deutschland. Der Betrieb hat diesen Entwurf nicht beauftragt; er soll ihn später ansehen und kann ihn übernehmen. Deshalb gilt: Du kennst den Betrieb nicht persönlich und darfst nichts über ihn behaupten, was nicht in den gelieferten Fakten steht.

HARTE REGELN (jeder Verstoß macht den Text unbrauchbar):
1. Keine erfundenen Fakten: kein Gründungsjahr, keine Jahre an Erfahrung, kein „Familienbetrieb“, keine Generationen, keine Auszeichnungen, keine Zertifikate, keine Meistertitel, keine Innungs- oder Kammermitgliedschaft, keine Teamgröße, keine Namen von Personen, keine Marken oder Hersteller, keine Preise, keine Rabatte, keine Garantien, keine Versprechen zu Reaktionszeiten, kein Notdienst, keine Einzugsgebiete.
2. Keine Zahlen und Ziffern im gesamten Text.
3. Keine Bewertungen, Sterne, Kundenstimmen, Zitate oder Testimonials – auch keine allgemeinen wie „zufriedene Kunden“.
4. Leistungen: nur allgemein übliche Leistungen dieser Branche, neutral beschrieben. Sie werden auf der Seite als Beispiele gekennzeichnet.
5. „Über uns“: neutral und allgemein (Haltung, Arbeitsweise im Allgemeinen, Einladung zur Kontaktaufnahme). Nichts, was eine Tatsache über den Betrieb behauptet.
6. Keine Links, keine E-Mail-Adressen, keine Telefonnummern, keine Platzhalter, kein Lorem ipsum, keine eckigen oder geschweiften Klammern.
7. Sprache: Deutsch, Sie-Form, freundlich-professionell, kurze und klare Sätze, keine Übertreibungen, keine Superlative („der beste“, „Nummer eins“).
8. Der Firmenname und die Stadt dürfen vorkommen. Andere Fakten nur, wenn sie unten ausdrücklich genannt sind.

FORMAT: Liefere die Inhalte ausschließlich über das Tool „${DEMO_TOOL_NAME}“. Icons wählst du passend zur Leistung aus der vorgegebenen Liste.`;

const TONES = ['herzlich und nahbar', 'ruhig und sachlich', 'modern und klar', 'warm und einladend', 'bodenständig und direkt'];

export function buildDemoPrompt(f: ContentFacts, seed: number, feedback?: string[]): string {
  const icons = ICONS_BY_GROUP[f.group].join(', ');
  const lines = [
    `Firmenname: ${f.name}`,
    `Branche: ${f.branchLabel}`,
    `Branchen-Schlüssel: ${f.branchKey}`,
    `Stadt: ${f.city}`,
    `Telefonnummer bekannt: ${f.phone ? 'ja (wird automatisch eingefügt, nicht im Text nennen)' : 'nein'}`,
    `Öffnungszeiten bekannt: ${f.hasOpeningHours ? 'ja (werden automatisch eingefügt)' : 'nein'}`,
    `Online bisher nur über soziale Netzwerke präsent: ${f.socialOnly ? 'ja' : 'nein'}`,
    `Gewünschte Tonalität: ${TONES[seed % TONES.length]}`,
    `Passende Icons (bevorzugt): ${icons}`,
    `Button-Text: ${f.phone ? 'Aufforderung zum Anrufen oder zur Terminanfrage' : 'Aufforderung zur Anfrage über das Kontaktformular'}`,
  ];
  let prompt = `Erstelle die Texte für den Website-Entwurf dieses Betriebs:\n\n${lines.join('\n')}\n\nAnforderungen: 4–6 Leistungen, 3–4 FAQ, „Über uns“ in zwei kurzen Absätzen.`;
  if (feedback?.length) {
    prompt += `\n\nDein letzter Entwurf hat diese Regeln verletzt – korrigiere sie:\n- ${feedback.join('\n- ')}`;
  }
  return prompt;
}

// ---------------------------------------------------------------------------
// Automatische Regelprüfung (Code)
// ---------------------------------------------------------------------------
export interface RuleViolation {
  field: string;
  rule: string;
  detail: string;
}

const FORBIDDEN: { rule: string; re: RegExp }[] = [
  { rule: 'erfundene Historie', re: /\bseit\b|gegründet|gründung|jahre(n)?\s+(lang|erfahrung)|jahrzehnt|tradition|familienbetrieb|generation/i },
  { rule: 'Auszeichnungen/Zertifikate', re: /auszeichnung|preisgekrönt|prämiert|zertifi|\btüv\b|\biso\b|meister|innung|kammer|testsieger|siegel|geprüft(e|er|es)?\s+(fach|qualität)/i },
  { rule: 'Superlative', re: /(?<!\bam\s)\b(beste[nrms]?|bester|nummer\s+eins|nr\.?\s*1|marktführer|einzigartig|unschlagbar|perfekt(e|en|er)?)\b/i },
  { rule: 'Bewertungen/Testimonials', re: /bewertung|rezension|sterne|kundenstimme|testimonial|zufriedene[nr]?\s+kund|empfehlen\s+uns|weiterempfohlen/i },
  { rule: 'Preise/Rabatte', re: /€|\beuro\b|\beur\b|\bpreis|kostenlos|kostenfrei|gratis|rabatt|günstig|billig|festpreis|unverbindliches\s+angebot\s+zum/i },
  { rule: 'Garantien/Versprechen', re: /garantie|garantiert|notdienst|\b24\s*\/\s*7\b|rund\s+um\s+die\s+uhr|am\s+selben\s+tag|innerhalb\s+(von|weniger)|schnellstmöglich|express|versichert|haftpflicht/i },
  { rule: 'Personen/Team', re: /\b(inhaber(in)?|chefin|geschäftsführer(in)?|mitarbeiter(in|innen)?|mitarbeitende|kollegen|kolleginnen|azubi|auszubildende|team\s+aus|frau\s+[A-ZÄÖÜ]|herr\s+[A-ZÄÖÜ])\b/i },
  { rule: 'Einzugsgebiet', re: /umgebung|umkreis|ganz\s+(nrw|deutschland)|ruhrgebiet|region/i },
  { rule: 'Platzhalter', re: /lorem|ipsum|\[|\]|\{|\}|\btodo\b|xxx|platzhalter|beispieltext|mustermann|musterstra/i },
  { rule: 'Links/Kontaktdaten', re: /https?:|www\.|@|\.de\b|\.com\b/i },
  { rule: 'Englisch', re: /\b(the|and|your|our|with|we|you)\b/i },
];

const LIMITS = {
  hero_headline: [10, 70],
  hero_subline: [30, 180],
  about: [80, 700],
  cta_text: [5, 32],
  seo_title: [20, 70],
  seo_description: [50, 160],
  serviceTitle: [3, 40],
  serviceText: [15, 170],
  faqQ: [8, 130],
  faqA: [15, 420],
} as const;

function textFields(c: SiteContent): { field: string; value: string }[] {
  return [
    { field: 'hero_headline', value: c.hero_headline },
    { field: 'hero_subline', value: c.hero_subline },
    { field: 'about', value: c.about },
    { field: 'cta_text', value: c.cta_text },
    { field: 'seo_title', value: c.seo_title },
    { field: 'seo_description', value: c.seo_description },
    ...c.services.flatMap((s, i) => [
      { field: `services[${i}].title`, value: s.title },
      { field: `services[${i}].text`, value: s.text },
    ]),
    ...c.faq.flatMap((f, i) => [
      { field: `faq[${i}].q`, value: f.q },
      { field: `faq[${i}].a`, value: f.a },
    ]),
  ];
}

/** Erlaubte Zeichenketten aus den Fakten entfernen, bevor Regeln geprüft werden. */
function stripFacts(text: string, f: ContentFacts): string {
  let t = text;
  for (const known of [f.name, f.city, f.branchLabel]) {
    if (known) t = t.split(known).join(' ');
  }
  return t;
}

export function validateDemoContent(c: SiteContent, f: ContentFacts): RuleViolation[] {
  const v: RuleViolation[] = [];
  const len = (field: string, value: string, [min, max]: readonly [number, number]) => {
    const n = value.trim().length;
    if (n < min || n > max) v.push({ field, rule: 'Länge', detail: `${n} Zeichen (erlaubt ${min}–${max})` });
  };
  if (!c || typeof c !== 'object') return [{ field: '*', rule: 'Format', detail: 'Kein Objekt' }];
  if (!Array.isArray(c.services) || c.services.length < 3 || c.services.length > 6) {
    v.push({ field: 'services', rule: 'Anzahl', detail: `${c.services?.length ?? 0} Leistungen (erlaubt 3–6)` });
  }
  if (!Array.isArray(c.faq) || c.faq.length < 3 || c.faq.length > 4) {
    v.push({ field: 'faq', rule: 'Anzahl', detail: `${c.faq?.length ?? 0} Fragen (erlaubt 3–4)` });
  }
  if (v.length) return v;
  len('hero_headline', c.hero_headline, LIMITS.hero_headline);
  len('hero_subline', c.hero_subline, LIMITS.hero_subline);
  len('about', c.about, LIMITS.about);
  len('cta_text', c.cta_text, LIMITS.cta_text);
  len('seo_title', c.seo_title, LIMITS.seo_title);
  len('seo_description', c.seo_description, LIMITS.seo_description);
  c.services.forEach((s, i) => {
    len(`services[${i}].title`, s.title, LIMITS.serviceTitle);
    len(`services[${i}].text`, s.text, LIMITS.serviceText);
    if (!(ICON_KEYS as string[]).includes(s.icon)) v.push({ field: `services[${i}].icon`, rule: 'Icon', detail: `unbekannt: ${s.icon}` });
  });
  c.faq.forEach((q, i) => {
    len(`faq[${i}].q`, q.q, LIMITS.faqQ);
    len(`faq[${i}].a`, q.a, LIMITS.faqA);
  });
  const titles = new Set<string>();
  c.services.forEach((s, i) => {
    const k = s.title.trim().toLowerCase();
    if (titles.has(k)) v.push({ field: `services[${i}].title`, rule: 'Dublette', detail: s.title });
    titles.add(k);
  });
  for (const { field, value } of textFields(c)) {
    if (!value || !value.trim()) {
      v.push({ field, rule: 'Leer', detail: 'Feld ist leer' });
      continue;
    }
    const stripped = stripFacts(value, f);
    if (/\d/.test(stripped)) v.push({ field, rule: 'Zahlen', detail: `enthält Ziffern: „${value.slice(0, 80)}“` });
    for (const { rule, re } of FORBIDDEN) {
      const m = re.exec(stripped);
      if (m) v.push({ field, rule, detail: `„${m[0]}“ in „${value.slice(0, 80)}“` });
    }
    if (/["„“”«»]/.test(value) && /[„“”«»]\s*[–-]\s*[A-ZÄÖÜ]/.test(value)) v.push({ field, rule: 'Zitat', detail: 'Zitat mit Namensangabe' });
  }
  return v;
}

/** Leerraum und typografische Kleinigkeiten säubern. */
export function normalizeContent(c: SiteContent): SiteContent {
  const t = (s: string) => s.replace(/[ \t]+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();
  return {
    hero_headline: t(c.hero_headline).replace(/[.!]+$/, ''),
    hero_subline: t(c.hero_subline),
    services: c.services.map((s) => ({ title: t(s.title), text: t(s.text), icon: s.icon })),
    about: c.about
      .split(/\n{2,}/)
      .map((p) => t(p))
      .filter(Boolean)
      .join('\n\n'),
    cta_text: t(c.cta_text).replace(/[.!]+$/, ''),
    seo_title: t(c.seo_title),
    seo_description: t(c.seo_description),
    faq: c.faq.map((f) => ({ q: t(f.q), a: t(f.a) })),
  };
}

// ---------------------------------------------------------------------------
// KI-Qualitätsprüfung (MODEL_BULK)
// ---------------------------------------------------------------------------
export const QA_TOOL_NAME = 'qa_ergebnis';

export const QA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['issues'],
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'problem', 'severity'],
        properties: {
          field: { type: 'string' },
          problem: { type: 'string' },
          severity: { type: 'string', enum: ['hoch', 'mittel', 'niedrig'] },
        },
      },
    },
  },
} as const;

export const QA_SYSTEM_PROMPT = `Du prüfst Texte eines Website-Entwurfs für einen lokalen Betrieb, der den Entwurf NICHT beauftragt hat. Melde jeden Verstoß gegen diese Regeln:
- Erfundene Fakten über den Betrieb (Jahreszahlen, Erfahrung, Auszeichnungen, Zertifikate, Meistertitel, Teamgröße, Personennamen, Marken, Preise, Garantien, Notdienst, Reaktionszeiten, Einzugsgebiet, Familienbetrieb). Allgemeine Aussagen zu Arbeitsweise oder Haltung sind erlaubt.
- Bewertungen, Kundenstimmen, Zitate, Testimonials.
- Zahlen oder Ziffern.
- Leistungen, die nicht zur Branche passen oder ungewöhnlich spezifisch sind.
- Nicht Deutsch, nicht Sie-Form, unprofessioneller Ton, Übertreibungen, Superlative.
- Platzhalter, unvollständige Sätze, Rechtschreib- oder Grammatikfehler.
Schweregrad „hoch“ für erfundene Fakten, Bewertungen, Zahlen, Platzhalter; sonst „mittel“ oder „niedrig“. Gib eine leere Liste zurück, wenn alles in Ordnung ist. Antworte ausschließlich über das Tool „${QA_TOOL_NAME}“.`;

export function buildQaPrompt(f: ContentFacts, c: SiteContent): string {
  return `Bekannte Fakten: Firmenname „${f.name}“, Branche „${f.branchLabel}“, Stadt „${f.city}“.\n\nZu prüfende Inhalte (JSON):\n${JSON.stringify(c, null, 2)}`;
}

export interface QaIssue {
  field: string;
  problem: string;
  severity: 'hoch' | 'mittel' | 'niedrig';
}
