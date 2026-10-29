import { foldUmlauts } from '../leads/normalize';

/**
 * Textwerkzeuge für den Assistenten ohne KI: Normalisieren, leichtes deutsches Stemming, Tippfehler-Toleranz und
 * eine kleine BM25-Suche. Bewusst einfach und ohne Abhängigkeiten.
 */
export function normalize(text: string): string {
  return foldUmlauts(text)
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(
  'der die das den dem des ein eine einen einem einer eines und oder aber ich du er sie es wir ihr mir mich dir dich uns euch mein meine dein deine unser unsere ist sind bin bist war waren wird werden wurde hat haben hast habe hatte kann kannst koennen soll sollen sollte muss musst muessen mal noch schon auch nur bitte gerade jetzt hier da dort was wer wie wo wann warum welche welcher welches zu zum zur im in an am auf aus bei mit von vom fuer ueber unter nach vor bis um als so dann denn doch ja nein nicht kein keine keinen es gibt mach mache machen sag sage sagen zeig zeige zeigen gib gibt geben bitte mal einfach eigentlich genau ganz viel viele mehr funktioniert funktionieren funktionert funktioniere erklaer erklaere erklaeren bedeutet bedeuten heisst geht machen mache muss darf'.split(
    ' ',
  ),
);

/** Sehr leichtes Stemming: häufige Endungen ab, Mindestlänge 4 */
export function stem(word: string): string {
  let w = word;
  for (const suf of ['ungen', 'ung', 'heiten', 'heit', 'keiten', 'keit', 'innen', 'ern', 'en', 'er', 'es', 'e', 'n', 's']) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

export function tokens(text: string, keepStop = false): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t.length > 1 && (keepStop || (!STOP.has(t) && !t.startsWith('funktion'))))
    .map(stem);
}

export function levenshtein(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let prev2 = prev;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      // Vertauschte Nachbarbuchstaben zählen als ein Fehler („versnad“ → „versand“)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j]!, prev2[j - 2]! + 1);
      best = Math.min(best, cur[j]!);
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length]!;
}

/** Wortähnlichkeit: gleich, kurzer Präfix (≥ 4 Zeichen, höchstens 3 mehr) oder ein Tippfehler (ab 5 Zeichen, zwei ab 8) */
export function similar(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) >= 4 && Math.abs(a.length - b.length) <= 3 && (a.startsWith(b) || b.startsWith(a)))
    return true;
  const len = Math.min(a.length, b.length);
  if (len < 5) return false;
  return levenshtein(a, b, len >= 8 ? 2 : 1) <= (len >= 8 ? 2 : 1);
}

/** Enthält der Text einen der (gestemmten) Begriffe – Mehrwortbegriffe als Phrase */
export function mentions(queryTokens: string[], normalized: string, term: string): boolean {
  const t = normalize(term);
  if (t.includes(' ')) return ` ${normalized} `.includes(` ${t} `) || ` ${normalized} `.includes(` ${t}`);
  const s = stem(t);
  return queryTokens.some((q) => similar(q, s));
}

export interface SearchDoc {
  id: string;
  /** Gewichtete Felder: Titel/Schlüsselwörter zählen doppelt */
  strong: string;
  weak: string;
}

/** BM25 über kleine Dokumentmengen mit Tippfehler-Toleranz; liefert Treffer absteigend */
export function bm25(query: string, docs: SearchDoc[], k1 = 1.4, b = 0.7): { id: string; score: number }[] {
  const q = [...new Set(tokens(query))];
  if (!q.length) return [];
  const prepared = docs.map((d) => {
    const toks = [...tokens(d.strong), ...tokens(d.strong), ...tokens(d.weak)];
    return { id: d.id, toks };
  });
  const avg = prepared.reduce((s, d) => s + d.toks.length, 0) / Math.max(1, prepared.length);
  const df = new Map<string, number>();
  for (const term of q) df.set(term, prepared.filter((d) => d.toks.some((t) => similar(t, term))).length);
  return prepared
    .map((d) => {
      let score = 0;
      for (const term of q) {
        const n = df.get(term) ?? 0;
        if (!n) continue;
        const tf = d.toks.filter((t) => similar(t, term)).length;
        if (!tf) continue;
        const idf = Math.log(1 + (prepared.length - n + 0.5) / (n + 0.5));
        score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.toks.length) / avg));
      }
      return { id: d.id, score };
    })
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score);
}
