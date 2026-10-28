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
  timeoutMs?: number;
  maxBytes?: number;
  maxCandidates?: number;
  now?: () => Date;
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
  const timeoutMs = opts.timeoutMs ?? 5000;
  const maxBytes = opts.maxBytes ?? 250_000;
  const emailDomain = subject.emailDomain?.toLowerCase().replace(/^www\./, '') ?? '';
  const ownDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(emailDomain) && emailDomain !== 'freemail' ? emailDomain : null;
  const named = domainCandidates(subject.businessName, { city: subject.city, branch: subject.branch })
    .filter((d) => d !== ownDomain)
    .slice(0, opts.maxCandidates ?? 4);
  const candidates = ownDomain ? [ownDomain, ...named] : named;
  const checkedAt = (opts.now?.() ?? new Date()).toISOString();
  // Ohne Telefon, vollständige Anschrift und eigene E-Mail-Domain kann nichts belegt werden – dann gar nicht abrufen
  if (!phoneDigits(subject.phone) && !(subject.postalCode && subject.street) && !ownDomain)
    return { result: 'none', matched: [], candidates, checkedAt };
  let possible: string | undefined;
  for (const domain of candidates) {
    const isOwn = domain === ownDomain;
    if (!isOwn && !/^[a-z0-9-]+\.de$/.test(domain)) continue;
    const url = `https://${domain}/`;
    try {
      const res = await fetchImpl(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
      });
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) {
        await res.body?.cancel().catch(() => undefined);
        continue;
      }
      const text = visible(await readLimited(res, maxBytes));
      const matched = matchBusiness(text, subject);
      if (matched.length) return { result: 'found', url: res.url || url, matched, candidates, checkedAt };
      const real = text.trim().length >= 200 && !PARKED.test(text);
      if (!possible && real && (isOwn || looksLikeBusiness(text, subject))) possible = res.url || url;
    } catch {
      // DNS-/TLS-/Zeitfehler: Domain gilt als nicht belegt, keine Wiederholung
    }
  }
  return possible
    ? { result: 'possible', url: possible, matched: [], candidates, checkedAt }
    : { result: 'none', matched: [], candidates, checkedAt };
}
