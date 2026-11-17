import { promises as dns } from 'node:dns';
import { domainToASCII } from 'node:url';
import { domainCandidates } from '../letters/domain';
import { foldUmlauts, normalizeBusinessName } from './normalize';

/**
 * Automatische Vorprüfung „hat der Betrieb doch eine eigene Website?“ (Akquise-Restaufgabe A).
 *
 * Ruft zuerst die Domain einer angegebenen geschäftlichen E-Mail-Adresse ab (stärkster Hinweis auf eine eigene
 * Website), danach höchstens `maxCandidates` aus dem Firmennamen abgeleitete .de-Domains – jede einmal.
 * - `found`: Die Seite enthält die Telefonnummer des Betriebs oder Postleitzahl UND Straße. Schließt den Lead aus.
 * - `possible`: Die E-Mail-Domain liefert eine echte (nicht geparkte) Seite, oder eine Namens-Domain zeigt
 *   Firmenname und Stadt. Kein Beleg (gleichnamige Betriebe anderswo) – der Lead rutscht in der Vorauswahl nach
 *   hinten und muss vor allem anderen geprüft werden.
 * - `none`: nichts gefunden. Das beweist NICHTS und ersetzt nicht die manuelle Prüfung über Name/Ort, Telefon,
 *   Verzeichnis- und Profillinks (WEBSITE_METHODS). Keine Wiederholung, harte Zeit-/Größenlimits.
 */
export interface WebsiteProbeSubject {
  businessName: string;
  city: string;
  branch: string;
  phone?: string | null;
  street?: string | null;
  postalCode?: string | null;
  /** Domain der geschäftlichen E-Mail-Adresse (ohne Freemail), wird zuerst geprüft */
  emailDomain?: string | null;
}

export interface WebsiteProbeResult {
  result: 'found' | 'possible' | 'none';
  /** Gefundene Seite (bei `found` und `possible`) */
  url?: string;
  /** Welche Betriebsangabe auf der Seite stand */
  matched: ('phone' | 'address')[];
  candidates: string[];
  checkedAt: string;
}

export interface WebsiteProbeOptions {
  fetchImpl?: typeof fetch;
  /** Gibt es die Domain im DNS? Standard: echte DNS-Abfrage; mit eigenem fetchImpl (Tests) ohne Vorfilter */
  resolveImpl?: (domain: string) => Promise<boolean>;
  timeoutMs?: number;
  maxBytes?: number;
  /** Höchstzahl erzeugter Domain-Varianten (Standard 60) */
  maxCandidates?: number;
  /** Höchstzahl abgerufener Startseiten (Standard 6; Impressum-Seiten zusätzlich) */
  maxFetches?: number;
  now?: () => Date;
}

/**
 * Domain-Varianten (17.11.2026, Recherche „Leadauswahl drastisch verbessern“): bisher höchstens 4 geratene .de-Namen.
 * Jetzt: Varianten mit Gewerk-Wörtern, Stadt, Umlaut-Schreibweisen (ae/a/IDN) und .com/.eu für die besten Namen.
 * Ein DNS-Vorfilter sortiert nicht existierende Domains ohne Seitenabruf aus.
 */
const BRANCH_SYNONYMS: Record<string, string[]> = {
  dachdecker: ['dach', 'dachdecker', 'dachdeckerei', 'bedachungen', 'dachbau'],
  heizung: ['heizung', 'haustechnik', 'shk', 'heizungsbau', 'waermetechnik'],
  sanitaer: ['sanitaer', 'haustechnik', 'shk', 'heizung', 'baeder'],
  gartenbau: ['garten', 'gartenbau', 'galabau', 'gaerten', 'landschaftsbau'],
  tischler: ['tischlerei', 'schreinerei', 'tischler', 'schreiner', 'holz'],
  zimmerer: ['zimmerei', 'holzbau', 'zimmerer'],
  maler: ['maler', 'malerbetrieb', 'malermeister', 'malerei'],
  elektriker: ['elektro', 'elektrotechnik', 'elektriker'],
  reinigung: ['reinigung', 'gebaeudereinigung', 'clean', 'service'],
  fliesenleger: ['fliesen', 'fliesenleger'],
  bodenleger: ['boden', 'bodenbelaege', 'bodenleger'],
  parkettleger: ['parkett', 'boden'],
  entruempelung: ['entruempelung', 'haushaltsaufloesung', 'raeumung', 'umzug'],
  glaser: ['glas', 'glaserei'],
  metallbau: ['metallbau', 'schlosserei', 'stahlbau'],
  kosmetikstudio: ['kosmetik', 'beauty', 'studio'],
  nagelstudio: ['nails', 'nagelstudio', 'nail', 'beauty'],
  friseur: ['friseur', 'hair', 'haare', 'salon'],
};

const label = (parts: string[]) => parts.filter(Boolean).join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const validLabel = (l: string) => l.length >= 3 && l.length <= 40 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(l);

export function probeDomains(subject: Pick<WebsiteProbeSubject, 'businessName' | 'city' | 'branch'>, max = 60): string[] {
  const out: string[] = [];
  const push = (d: string | null | undefined) => {
    if (d && !out.includes(d)) out.push(d);
  };
  for (const d of domainCandidates(subject.businessName, { city: subject.city, branch: subject.branch })) push(d);
  const city = foldUmlauts(subject.city).replace(/[^a-z0-9]+/g, '');
  const words = normalizeBusinessName(subject.businessName.replace(/['’`´]/g, ''))
    .split(' ')
    .filter((t) => t && !['und', 'der', 'die', 'das', 'von', 'inh'].includes(t));
  const distinct = distinctiveTokens(subject.businessName, subject.city);
  const syn = BRANCH_SYNONYMS[subject.branch] ?? [foldUmlauts(subject.branch).replace(/[^a-z0-9]+/g, '')];
  const labels: string[] = [label(words), words.join('')];
  for (const d of distinct) {
    // Nachname allein nur, wenn selten genug (lang); „mueller.de“ gehört praktisch nie dem Betrieb
    if (d.length >= 7) labels.push(d);
    labels.push(label([d, city]), `${d}${city}`);
    for (const w of syn) labels.push(label([w, d]), label([d, w]), `${d}${w}`, `${w}${d}`);
  }
  if (distinct.length >= 2) labels.push(label(distinct.slice(0, 2)), distinct.slice(0, 2).join(''));
  for (const l of labels) if (validLabel(l)) push(`${l}.de`);
  // Umlaute: „müller“ → auch „muller“ und die IDN-Form „müller“ (xn--…), jeweils ohne Rechtsform
  if (/[äöüß]/i.test(subject.businessName)) {
    const base = subject.businessName
      .toLowerCase()
      .replace(/\b(gmbh\s*&\s*co\.?\s*kg|gmbh|ug|e\.\s?k\.?|kg|ohg|gbr|ag|mbh|inh\.?)(?=\s|$|[^a-zäöüß])/g, ' ');
    const plain = base.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
    const plainWords = plain.split(/[^a-z0-9]+/).filter(Boolean);
    const rawWords = base.split(/[^a-z0-9äöüß]+/).filter(Boolean);
    const plainDistinct = distinctiveTokens(plain, subject.city);
    const variants = [
      label(plainWords),
      ...plainDistinct.flatMap((d) => syn.slice(0, 2).flatMap((w) => [label([d, w]), label([w, d])])),
    ];
    for (const l of variants) if (validLabel(l)) push(`${l}.de`);
    for (const raw of [rawWords.join('-'), ...rawWords.filter((w) => /[äöüß]/.test(w) && w.length >= 4)]) {
      const idn = domainToASCII(`${raw}.de`);
      if (idn && idn !== `${raw}.de`) push(idn);
    }
  }
  // Die besten drei Namen zusätzlich als .com/.eu
  for (const d of out.filter((x) => x.endsWith('.de')).slice(0, 3)) {
    push(d.replace(/\.de$/, '.com'));
    push(d.replace(/\.de$/, '.eu'));
  }
  return out.slice(0, max);
}

let dnsWorks: Promise<boolean> | undefined;
/** Funktioniert DNS hier überhaupt? (In abgeschotteten Umgebungen nur über einen Proxy – dann ohne Vorfilter.) */
function dnsUsable(): Promise<boolean> {
  dnsWorks ??= dnsLookup('example.com');
  return dnsWorks;
}

async function dnsExists(domain: string): Promise<boolean> {
  if (!(await dnsUsable())) return true;
  return dnsLookup(domain);
}

async function dnsLookup(domain: string): Promise<boolean> {
  try {
    await Promise.race([
      dns.lookup(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('dns timeout')), 3000)),
    ]);
    return true;
  } catch {
    return false;
  }
}

const USER_AGENT = 'SeitenWerk-Vorpruefung/1.0 (einmaliger Abruf der Startseite; keine Speicherung von Inhalten)';

/** Nationale Rufnummer ohne Länder-/Verkehrsausscheidungsziffer (für Ziffernvergleich), mind. 7 Stellen. */
export function phoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D+/g, '');
  if (d.startsWith('0049')) d = d.slice(4);
  else if (d.startsWith('49') && phone.trim().startsWith('+')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return d.length >= 7 ? d : null;
}

function streetKey(street: string): string {
  return street
    .toLowerCase()
    .replace(/str\.?(?=\s|$)/g, 'strasse')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zäöü0-9]+/g, '');
}

/** Prüft sichtbaren Seitentext (bereits ohne Tags) gegen Telefon bzw. PLZ + Straße des Betriebs. */
export function matchBusiness(text: string, subject: WebsiteProbeSubject): ('phone' | 'address')[] {
  const matched: ('phone' | 'address')[] = [];
  const phone = phoneDigits(subject.phone);
  if (phone) {
    // Ziffernfolgen der Seite in nationale Form bringen (+49/0049/0 entfernen) und vergleichen
    const numbers = (text.match(/[+\d][\d\s/().-]{6,}\d/g) ?? []).map((n) => phoneDigits(n.trim()));
    if (numbers.some((n) => n === phone)) matched.push('phone');
  }
  if (subject.postalCode && subject.street) {
    const flat = text
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .replace(/[^a-zäöü0-9]+/g, '')
      .replace(/str(?=\d)/g, 'strasse');
    if (flat.includes(subject.postalCode) && flat.includes(streetKey(subject.street))) matched.push('address');
  }
  return matched;
}

const PARKED =
  /domain (is )?(for sale|parked|zu verkaufen)|diese domain (kaufen|steht zum verkauf|wurde registriert)|\bsedo\b|parkingcrew|bodis|dan\.com|this domain may be for sale|default (web )?page|coming soon|under construction|in k(ue|ü)rze online|hier entsteht|website (ist )?in arbeit|wartungsmodus|ihr neuer webspace|webspace (ist )?eingerichtet|index of \//i;

const GENERIC_TOKENS = new Set([
  'und',
  'der',
  'die',
  'das',
  'von',
  'fuer',
  'service',
  'team',
  'haus',
  'meister',
  'betrieb',
  'firma',
  'malerbetrieb',
  'maler',
  'malermeister',
  'reinigung',
  'gebaeudereinigung',
  'fliesen',
  'fliesenleger',
  'garten',
  'gartenbau',
  'boden',
  'bodenleger',
  'parkett',
  'entruempelung',
  // Weitere Gewerke (06.11.2026)
  'elektro',
  'elektriker',
  'elektrotechnik',
  'dach',
  'dachdecker',
  'dachdeckerei',
  'bedachungen',
  'sanitaer',
  'heizung',
  'haustechnik',
  'tischlerei',
  'schreinerei',
  'zimmerei',
  'glaserei',
  'metallbau',
  'schlosserei',
  'bauunternehmen',
  'stuckateur',
  'handwerk',
  'dienstleistungen',
]);

/** Unterscheidende Namensbestandteile (≥ 4 Zeichen, ohne Rechtsform, Branche, Stadt). */
export function distinctiveTokens(name: string, city: string): string[] {
  const c = foldUmlauts(city).replace(/[^a-z0-9]+/g, '');
  return normalizeBusinessName(name)
    .split(' ')
    .filter((t) => t.length >= 4 && !GENERIC_TOKENS.has(t) && t !== c)
    .slice(0, 3);
}

/** Seite zeigt Firmennamen (alle unterscheidenden Bestandteile) und die Stadt – Hinweis, kein Beleg. */
export function looksLikeBusiness(text: string, subject: WebsiteProbeSubject): boolean {
  const tokens = distinctiveTokens(subject.businessName, subject.city);
  if (!tokens.length) return false;
  const flat = foldUmlauts(text).replace(/[^a-z0-9]+/g, ' ');
  const words = new Set(flat.split(' '));
  return (
    tokens.every((t) => words.has(t) || flat.includes(` ${t}`)) && words.has(foldUmlauts(subject.city).replace(/[^a-z0-9]+/g, ''))
  );
}

function visible(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

async function readLimited(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, maxBytes));
}

export async function probeOwnWebsite(subject: WebsiteProbeSubject, opts: WebsiteProbeOptions = {}): Promise<WebsiteProbeResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const resolve = opts.resolveImpl ?? (opts.fetchImpl ? async () => true : dnsExists);
  const timeoutMs = opts.timeoutMs ?? 5000;
  const maxBytes = opts.maxBytes ?? 250_000;
  const maxFetches = opts.maxFetches ?? 6;
  const emailDomain = subject.emailDomain?.toLowerCase().replace(/^www\./, '') ?? '';
  const ownDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(emailDomain) && emailDomain !== 'freemail' ? emailDomain : null;
  const named = probeDomains(subject, opts.maxCandidates ?? 60).filter((d) => d !== ownDomain);
  const candidates = ownDomain ? [ownDomain, ...named] : named;
  const checkedAt = (opts.now?.() ?? new Date()).toISOString();
  // Ohne Telefon, vollständige Anschrift und eigene E-Mail-Domain kann nichts belegt werden – dann gar nicht abrufen
  if (!phoneDigits(subject.phone) && !(subject.postalCode && subject.street) && !ownDomain)
    return { result: 'none', matched: [], candidates, checkedAt };
  // DNS-Vorfilter: nur existierende Domains abrufen (parallel, je höchstens 3 s)
  const alive: string[] = [];
  for (let i = 0; i < candidates.length && alive.length < maxFetches; i += 10) {
    const batch = candidates.slice(i, i + 10);
    const ok = await Promise.all(batch.map((d) => resolve(d)));
    batch.forEach((d, k) => {
      if (ok[k] && alive.length < maxFetches) alive.push(d);
    });
  }
  const get = async (url: string): Promise<{ text: string; url: string } | null> => {
    try {
      const res = await fetchImpl(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
      });
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) {
        await res.body?.cancel().catch(() => undefined);
        return null;
      }
      return { text: visible(await readLimited(res, maxBytes)), url: res.url || url };
    } catch {
      // DNS-/TLS-/Zeitfehler: Domain gilt als nicht belegt, keine Wiederholung
      return null;
    }
  };
  let possible: string | undefined;
  for (const domain of alive) {
    const isOwn = domain === ownDomain;
    const url = `https://${domain}/`;
    const page = await get(url);
    if (!page) continue;
    let matched = matchBusiness(page.text, subject);
    const real = page.text.trim().length >= 200 && !PARKED.test(page.text);
    // Startseite echt, aber ohne Telefon/Anschrift: das Impressum enthält sie fast immer (Pflichtangaben)
    if (!matched.length && real) {
      const imp = await get(new URL('/impressum', page.url).toString());
      if (imp) matched = matchBusiness(imp.text, subject);
    }
    if (matched.length) return { result: 'found', url: page.url, matched, candidates, checkedAt };
    if (!possible && real && (isOwn || looksLikeBusiness(page.text, subject))) possible = page.url;
  }
  return possible
    ? { result: 'possible', url: possible, matched: [], candidates, checkedAt }
    : { result: 'none', matched: [], candidates, checkedAt };
}
