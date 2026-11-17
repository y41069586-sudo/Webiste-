/**
 * Handy-Feinschliff beim Ausliefern einer Demo (17.11.2026, Prüfung echter Demos bei 320/390 px):
 * - Dasselbe Beispielfoto erschien bis zu viermal (Hero, Leistung, Galerie) → wirkt unecht. Wiederholungen in
 *   <figure> werden entfernt, leere Galerien ganz.
 * - Tippflächen unter 44 px (Telefon, E-Mail, „Kein Interesse“) werden vergrößert, ohne das Layout zu verschieben.
 * - Bei 320 px ragte „Preise und Leistungen“ aus der Leiste; lange deutsche Wörter in Überschriften brechen um.
 * Inhalte des Betriebs bleiben unverändert; idempotent.
 */
const MARK = 'data-sw-mobile-polish';

export const MOBILE_POLISH_CSS =
  `a[href^="tel:"],a[href^="mailto:"]{min-height:44px;display:inline-flex;align-items:center}` +
  `a[href$="/kein-interesse"],footer a,a[href*="maps"]{display:inline-block;padding-block:12px;margin-block:-12px}` +
  `h1,h2,h3{-webkit-hyphens:auto;hyphens:auto;overflow-wrap:break-word}` +
  `@media (max-width:360px){.sw-demo-toolbar-inner{gap:.4rem!important;padding:.5rem!important}` +
  `.sw-demo-ask{white-space:normal!important;font-size:.8rem!important;padding:.3rem!important;line-height:1.2!important}` +
  `.sw-demo-buy{padding-left:.75rem!important;padding-right:.75rem!important}}`;

/** Entfernt <figure>-Blöcke, deren Bild schon weiter oben auf der Seite vorkommt; leere Galerien fallen weg. */
export function dedupeDemoImages(html: string): string {
  const seen = new Set<string>();
  const key = (src: string) => `${src.length}:${src.slice(-64)}`;
  // Reihenfolge im Dokument entscheidet: das erste Vorkommen bleibt immer stehen
  // Ein Bild außerhalb von <figure> samt direkt folgendem Hinweis „Symbolbild …“ (sonst bliebe der Hinweis allein stehen)
  const imgWithNote = /<img\b[^>]*>(?:\s*<(span|small|p|figcaption)\b[^>]*>[^<]*Symbolbild[^<]*<\/\1>)?/.source;
  let out = html.replace(new RegExp(`<figure\\b[^>]*>[\\s\\S]*?<\\/figure>|${imgWithNote}`, 'g'), (block) => {
    const src = /<img\b[^>]*\bsrc="(data:image\/[^"]+)"/.exec(block)?.[1];
    // nur Fotos (groß); Logos und Symbole dürfen mehrfach vorkommen
    if (!src || src.length < 20_000) return block;
    const k = key(src);
    if (!seen.has(k)) {
      seen.add(k);
      return block;
    }
    return '';
  });
  // Galerie-Abschnitte ohne Bild entfernen (Überschrift „Einblicke“ ohne Inhalt)
  out = out.replace(/<section\b[^>]*(?:galerie|gallery)[^>]*>[\s\S]*?<\/section>/gi, (sec) =>
    /<img\b(?![^>]*\bhidden\b)/.test(sec) ? sec : '',
  );
  return out;
}

export function polishDemoForMobile(html: string): string {
  if (html.includes(MARK)) return html;
  const deduped = dedupeDemoImages(html);
  const style = `<style ${MARK}>${MOBILE_POLISH_CSS}</style>`;
  return deduped.includes('</head>') ? deduped.replace('</head>', `${style}</head>`) : style + deduped;
}
