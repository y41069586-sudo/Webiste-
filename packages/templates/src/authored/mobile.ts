import { parse, type DefaultTreeAdapterTypes as T } from 'parse5';

/**
 * Handy-Einstieg für freie KI-Entwürfe (Betreiber 07.11.2026: „auf Handy viel Text, zerquetscht … Text drüber und im
 * Hintergrund Bild“). Unabhängig davon, wie die KI den Einstieg gestaltet hat, wird er bis 700 px Breite zu einem
 * Vollbild-Foto mit dunklem Verlauf und Name, Ort und Handlung darüber. Desktop bleibt unverändert.
 *
 * Läuft beim Rendern und beim Ausliefern gespeicherter Demos (idempotent). Ohne erkennbaren Einstieg bleibt die Seite
 * unverändert. Hat der Einstieg kein eigenes Bild, wird das erste Bild der Seite nur für die Handyansicht übernommen
 * (samt Symbolbild-Hinweis).
 */
export const MOBILE_LAYER_VERSION = '1';

const BP = 700;
const H = '#sw-ai-design [data-ad-hero="section"]';
const M = `${H} [data-ad-hero="media"]`;

export const MOBILE_LAYER_CSS = [
  `#sw-ai-design [data-ad-hero-added]{display:none}`,
  `@media (max-width:${BP}px){`,
  `#sw-ai-design{overflow-x:clip}`,
  // Lange Wörter (z. B. „Kosmetikinstitut“) sauber trennen statt aus dem Rahmen laufen zu lassen
  `#sw-ai-design h1,#sw-ai-design h2,#sw-ai-design h3,#sw-ai-design p,#sw-ai-design li,#sw-ai-design dd,#sw-ai-design dt{overflow-wrap:break-word;hyphens:auto}`,
  `#sw-ai-design [data-ad-hero-added]{display:block}`,
  `${H}{position:relative!important;isolation:isolate;display:flex!important;flex-direction:column!important;justify-content:flex-end!important;gap:14px;min-height:min(86svh,760px)!important;width:100vw!important;max-width:none!important;margin:0 calc(50% - 50vw)!important;padding:88px 20px 112px!important;overflow:hidden!important;background:#14161a!important;color:#fff!important;border:0!important;box-shadow:none!important;text-align:left!important}`,
  `${H}::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(180deg,rgba(10,12,16,.12) 0%,rgba(10,12,16,.38) 42%,rgba(10,12,16,.86) 100%)}`,
  // Zwischenebenen der KI neutralisieren, damit das Foto die ganze Fläche bekommt und Text darüber lesbar bleibt
  `${H} *{position:static!important;float:none!important;transform:none!important;grid-column:auto!important;grid-row:auto!important;min-height:0!important;background:transparent!important;box-shadow:none!important;color:#fff!important;border-color:rgba(255,255,255,.35)!important;text-shadow:0 1px 14px rgba(0,0,0,.35);-webkit-text-stroke:0!important;max-width:100%!important}`,
  `${H} > *:not([data-ad-hero="media"]){width:100%!important;margin-left:0!important;margin-right:0!important;padding-left:0!important;padding-right:0!important}`,
  `${H} div:not([data-ad-hero="media"]),${H} header,${H} hgroup{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:12px;width:100%!important;padding-top:0!important;padding-bottom:0!important;height:auto!important}`,
  `${H} h1{font-size:clamp(2.1rem,10vw,3.1rem)!important;line-height:1.03!important;letter-spacing:-.01em!important;margin:0!important;overflow-wrap:break-word;hyphens:auto}`,
  `${H} p{font-size:1.05rem!important;line-height:1.5!important;margin:0!important;max-width:34ch!important}`,
  `${H} a{display:inline-flex!important;align-items:center;justify-content:center;width:100%!important;min-height:52px;padding:14px 20px!important;border-radius:999px!important;border:1.5px solid rgba(255,255,255,.75)!important;background:rgba(255,255,255,.12)!important;color:#fff!important;font-weight:700;text-decoration:none!important;text-shadow:none;letter-spacing:.02em}`,
  `${H} a[href="#anfrage"]{background:var(--design-accent)!important;border-color:var(--design-accent)!important;color:var(--design-on)!important}`,
  `${H} p a{width:auto!important;min-height:0;padding:0!important;border:0!important;background:transparent!important;border-radius:0!important;text-decoration:underline!important}`,
  `${M}{position:absolute!important;inset:0!important;z-index:-1!important;display:block!important;width:100%!important;height:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;background:#14161a!important}`,
  `${M} img,img${'[data-ad-hero="media"]'}{display:block!important;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover!important;margin:0!important}`,
  `${H} img[data-ad-hero="media"]{position:absolute!important;inset:0!important;z-index:-1!important}`,
  `${M} figcaption,${M} .ad-stock-note{position:absolute!important;top:12px;right:12px;left:auto!important;bottom:auto!important;margin:0!important;padding:4px 9px!important;border-radius:6px;background:rgba(0,0,0,.5)!important;color:#fff!important;font:500 11px/1.4 var(--body)!important;letter-spacing:normal!important;text-transform:none!important;max-width:60%!important}`,
  // Nur ein Bildhinweis: eigener Symbolbild-Hinweis ersetzt eine zusätzliche Bildunterschrift der KI
  `${M} .ad-stock-note ~ figcaption{display:none!important}`,
  `}`,
].join('');

type El = T.Element;
const isEl = (n: T.Node): n is El => 'tagName' in n;
function find(node: T.Node, pred: (e: El) => boolean): El | null {
  if (isEl(node) && pred(node)) return node;
  if ('childNodes' in node)
    for (const c of node.childNodes) {
      const r = find(c, pred);
      if (r) return r;
    }
  if (isEl(node) && node.tagName === 'template') return null;
  return null;
}
function some(node: T.Node, pred: (e: El) => boolean): boolean {
  return find(node, pred) !== null;
}
const attr = (e: El, name: string) => e.attrs.find((a) => a.name === name)?.value;
const isH2 = (e: El) => e.tagName === 'h2';
const isSection = (e: El) => e.attrs.some((a) => a.name === 'data-ad-section' || a.name === 'data-ad-placeholder');

/** Höchster Vorfahre der Hauptüberschrift, der noch keinen weiteren Inhaltsbereich (h2, Bildstrecke …) umfasst. */
function heroOf(root: El, h1: El): El | null {
  let best: El | null = null;
  for (let n = h1.parentNode as El | null; n && n !== root; n = n.parentNode as El | null) {
    if (!isEl(n)) break;
    if (some(n, isH2) || some(n, isSection)) break;
    best = n;
  }
  return best;
}

type Insert = { at: number; text: string };
/** Stelle direkt vor dem schließenden „>“ (bzw. „/>“) eines Start-Tags. */
function attrSlot(page: string, e: El): number | null {
  const end = e.sourceCodeLocation?.startTag?.endOffset;
  if (end === undefined) return null;
  return page[end - 2] === '/' ? end - 2 : end - 1;
}

/**
 * Fügt nur Merkmale, ggf. das Handy-Bild und den Stilblock in den Originaltext ein – der übrige Seitentext bleibt
 * Zeichen für Zeichen unverändert (spätere Ersetzungen beim Ausliefern greifen weiter).
 */
export function applyMobileHeroLayer(page: string): string {
  if (!page.includes('id="sw-ai-design"') || page.includes(`data-mobile-layer="${MOBILE_LAYER_VERSION}"`)) return page;
  const doc = parse(page, { sourceCodeLocationInfo: true });
  const root = find(doc, (e) => attr(e, 'id') === 'sw-ai-design');
  const body = find(doc, (e) => e.tagName === 'body');
  const headEnd = page.indexOf('</head>');
  if (!root || !body || headEnd < 0) return page;
  const h1 = find(root, (e) => e.tagName === 'h1');
  const hero = h1 ? heroOf(root, h1) : null;
  if (!hero || attr(hero, 'data-ad-hero')) return page;
  const inserts: Insert[] = [];
  const mark = (e: El, text: string) => {
    const at = attrSlot(page, e);
    if (at === null) throw Error('Ohne Quellposition keine Handy-Ebene');
    inserts.push({ at, text });
  };
  try {
    mark(hero, ' data-ad-hero="section"');
    const own = find(hero, (e) => e.tagName === 'img');
    if (own) {
      // Bild samt Bildunterschrift als Fläche nehmen, wenn es in einer eigenen figure steht
      let media: El = own;
      for (let n = own.parentNode as El | null; n && n !== hero && isEl(n); n = n.parentNode as El | null) {
        if (n.tagName === 'figure') {
          media = n;
          break;
        }
      }
      mark(media, ' data-ad-hero="media"');
    } else {
      const first = find(root, (e) => e.tagName === 'img');
      const heroOpen = hero.sourceCodeLocation?.startTag?.endOffset;
      if (first && heroOpen !== undefined) {
        const src = attr(first, 'src') ?? '';
        const parent = first.parentNode as El;
        const next = parent.childNodes.slice(parent.childNodes.indexOf(first) + 1).find(isEl);
        const note =
          next && /\bad-stock-note\b/.test(attr(next, 'class') ?? '')
            ? '<span class="ad-stock-note">Symbolbild · keine Aufnahme des Betriebs</span>'
            : '';
        inserts.push({
          at: heroOpen,
          text: `<figure data-ad-hero="media" data-ad-hero-added="1" aria-hidden="true"><img src="${src.replace(/"/g, '&quot;')}" alt="" decoding="async">${note}</figure>`,
        });
      }
    }
    mark(body, ` data-mobile-layer="${MOBILE_LAYER_VERSION}"`);
  } catch {
    return page;
  }
  inserts.push({ at: headEnd, text: `<style id="sw-mobile-layer">${MOBILE_LAYER_CSS}</style>` });
  let out = page;
  for (const i of inserts.sort((a, b) => b.at - a.at)) out = out.slice(0, i.at) + i.text + out.slice(i.at);
  return out;
}
