/**
 * KI-Muster-Prüfer (nach der Methode von Adrian Krebs: deterministisch über Markup und CSS, keine KI-Bewertung).
 * Prüft nur den Inhalt des Betriebs (<main id="inhalt">) und das Kit-CSS – nicht die SeitenWerk-Leiste und das
 * Angebot. Ab zwei Treffern gilt eine Seite als „sieht nach KI aus“; ein einzelner Treffer ist ein Hinweis.
 */
export interface SlopFinding {
  rule: string;
  detail: string;
}

const BANNED_FONTS =
  /\b(Inter|Roboto|Open Sans|Poppins|Montserrat|Space Grotesk|Geist|Instrument Serif|Lato|DM Sans|Plus Jakarta)\b/;
const FLOSKELN =
  /\b(ganzheitlich\w*|maßgeschneidert\w*|nahtlos\w*|nächste[sn]? Level|mit Leidenschaft|Ihr zuverlässiger Partner|Qualität, die überzeugt|innovativ\w*|erstklassig\w*|rundum sorglos|Wohlfühloase|Ihr Partner für|auf höchstem Niveau|Exzellenz|Premium-Qualität)\b/gi;

function hueOf(hex: string): { h: number; s: number } | null {
  const m = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(m)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  if (d < 0.12) return null;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: d };
}

/** Prüft Kit-CSS (nur das eigene <style>) und den Text des Hauptinhalts. */
export function slopFindings(kitCss: string, mainHtml: string): SlopFinding[] {
  const out: SlopFinding[] = [];
  const font = kitCss.match(BANNED_FONTS);
  if (font) out.push({ rule: 'schrift', detail: `Standard-/Modeschrift ${font[1]}` });
  if (/(?<!repeating-)(linear|radial|conic)-gradient\(/.test(kitCss)) out.push({ rule: 'verlauf', detail: 'Farbverlauf' });
  if (/background-clip:\s*text/.test(kitCss)) out.push({ rule: 'verlaufstext', detail: 'Verlaufstext' });
  if (/backdrop-filter/.test(kitCss)) out.push({ rule: 'glas', detail: 'Glas-Effekt' });
  const radii = [...kitCss.matchAll(/border-radius:\s*(\d+)px/g)].map((m) => Number(m[1]));
  if (radii.some((r) => r >= 16)) out.push({ rule: 'rundung', detail: `Radius ${Math.max(...radii)} px` });
  const purple = [...kitCss.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => hueOf(m[0])).filter((x) => x && x.h > 228 && x.h < 290);
  if (purple.length) out.push({ rule: 'lila', detail: 'Indigo/Lila im Kit' });
  if (/text-transform:\s*uppercase[^}]*letter-spacing:\s*\.?[1-9]/.test(kitCss))
    out.push({ rule: 'versal-etikett', detail: 'gesperrte Versal-Etiketten' });
  if (/box-shadow:\s*0\s+\d+px\s+\d{2,}px/.test(kitCss))
    out.push({ rule: 'weicher-schatten', detail: 'weicher Karten-Schatten' });
  const animations = (kitCss.match(/animation:/g) ?? []).length;
  if (animations > 1) out.push({ rule: 'bewegung', detail: `${animations} Animationen statt einer` });
  const text = mainHtml
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) out.push({ rule: 'emoji', detail: 'Emoji im Text' });
  // Nur Gedankenstriche zwischen Satzteilen zählen, nicht Zeitspannen wie „Montag – Freitag“ oder „8 – 18 Uhr“
  const dashes = (text.match(/[a-zäöüß,]\s[—–]\s[a-zäöüß]/g) ?? []).length;
  if (dashes > 3) out.push({ rule: 'gedankenstriche', detail: `${dashes} Gedankenstriche` });
  const floskeln = [...new Set((text.match(FLOSKELN) ?? []).map((s) => s.toLowerCase()))];
  if (floskeln.length) out.push({ rule: 'floskeln', detail: floskeln.join(', ') });
  if (/class="[^"]*\b(rounded-2xl|rounded-3xl|backdrop-blur|bg-gradient-to)/.test(mainHtml))
    out.push({ rule: 'tailwind-standard', detail: 'Tailwind-Standardmuster im Inhalt' });
  return out;
}

/** Ganze Seite: Kit-CSS (letzter <style>-Block vor </head>) und <main id="inhalt"> herausschneiden. */
export function slopFindingsForPage(html: string): SlopFinding[] {
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]!);
  const kitCss = (styles.at(-1) ?? '').replace(/@font-face\{[^}]*\}/g, '');
  const main = html.match(/<main id="inhalt">([\s\S]*?)<\/main>/)?.[1] ?? html;
  return slopFindings(kitCss, main);
}
