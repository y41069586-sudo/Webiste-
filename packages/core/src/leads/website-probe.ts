import { domainCandidates } from '../letters/domain';

/**
 * Automatische Vorprüfung „hat der Betrieb doch eine eigene Website?“ (Akquise-Restaufgabe A).
 *
 * Ruft höchstens `maxCandidates` aus dem Firmennamen abgeleitete .de-Domains einmal ab und meldet nur dann
 * einen Fund, wenn die Seite die Telefonnummer des Betriebs oder Postleitzahl UND Straße enthält – ein
 * ähnlicher Name allein ist kein Beleg (gleichnamige Betriebe anderswo). Ein Fund schließt den Lead über die
 * bestehende Qualifizierung aus; kein Fund beweist NICHTS und ersetzt nicht die manuelle Prüfung über
 * Name/Ort, Telefon, Verzeichnis- und Profillinks (WEBSITE_METHODS). Keine Wiederholung, harte Zeit-/Größenlimits.
 */
export interface WebsiteProbeSubject {
  businessName: string;
  city: string;
  branch: string;
  phone?: string | null;
  street?: string | null;
  postalCode?: string | null;
}

export interface WebsiteProbeResult {
  result: 'found' | 'none';
  /** Gefundene Seite (nur bei `found`) */
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
  const candidates = domainCandidates(subject.businessName, { city: subject.city, branch: subject.branch }).slice(
    0,
    opts.maxCandidates ?? 4,
  );
  const checkedAt = (opts.now?.() ?? new Date()).toISOString();
  // Ohne Telefon und ohne vollständige Anschrift kann nichts belegt werden – dann gar nicht abrufen
  if (!phoneDigits(subject.phone) && !(subject.postalCode && subject.street))
    return { result: 'none', matched: [], candidates, checkedAt };
  for (const domain of candidates) {
    if (!/^[a-z0-9-]+\.de$/.test(domain)) continue;
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
      const matched = matchBusiness(visible(await readLimited(res, maxBytes)), subject);
      if (matched.length) return { result: 'found', url: res.url || url, matched, candidates, checkedAt };
    } catch {
      // DNS-/TLS-/Zeitfehler: Domain gilt als nicht belegt, keine Wiederholung
    }
  }
  return { result: 'none', matched: [], candidates, checkedAt };
}
