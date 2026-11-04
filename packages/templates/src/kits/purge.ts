/**
 * Entfernt aus dem gemeinsamen Tailwind-CSS alle Regeln, deren Klassen auf der fertigen Seite nicht vorkommen.
 * Kit-Seiten nutzen Tailwind nur für SeitenWerk-Leiste, Angebot, Footer und Live-Formular; ohne Bereinigung tragen sie
 * rund 49 KB ungenutztes CSS (Lighthouse „unused-css-rules“, längere Stilberechnung auf langsamen Geräten).
 * Bewusst einfach: keine JavaScript-Klassen auf den Seiten, daher reicht ein Abgleich mit den class-Attributen.
 */
export function purgeCss(css: string, html: string): string {
  const used = new Set<string>();
  for (const m of html.matchAll(/\bclass="([^"]*)"/g)) for (const c of m[1]!.split(/\s+/)) if (c) used.add(c);
  return purgeBlock(css, used);
}

function purgeBlock(css: string, used: Set<string>): string {
  let out = '';
  let i = 0;
  while (i < css.length) {
    // Kommentare übernehmen nur, wenn sie Lizenzhinweise sind (/*! … */)
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      const comment = css.slice(i, end < 0 ? css.length : end + 2);
      if (comment.startsWith('/*!')) out += comment;
      i = end < 0 ? css.length : end + 2;
      continue;
    }
    const brace = findOutside(css, i, '{');
    const semi = findOutside(css, i, ';');
    if (brace < 0 && semi < 0) {
      out += css.slice(i);
      break;
    }
    if (semi >= 0 && (brace < 0 || semi < brace)) {
      // Anweisung ohne Block (z. B. @layer a,b; oder Deklaration in verschachtelten Regeln)
      out += css.slice(i, semi + 1);
      i = semi + 1;
      continue;
    }
    const prelude = css.slice(i, brace).trim();
    const close = matchBrace(css, brace);
    const inner = css.slice(brace + 1, close);
    i = close + 1;
    if (prelude.startsWith('@')) {
      const name = prelude.slice(1).split(/[\s({]/)[0]!;
      if (['media', 'supports', 'layer', 'container'].includes(name)) {
        const kept = purgeBlock(inner, used);
        if (kept.trim()) out += `${prelude}{${kept}}`;
      } else out += `${prelude}{${inner}}`;
      continue;
    }
    if (selectorUsed(prelude, used)) out += `${prelude}{${inner}}`;
  }
  return out;
}

function selectorUsed(selector: string, used: Set<string>): boolean {
  return splitTopLevel(selector).some((part) => {
    // Klassen innerhalb von :not(...) müssen nicht vorhanden sein
    const required = part.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '');
    const classes = [...required.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)].map((m) => m[1]!.replace(/\\(.)/g, '$1'));
    return classes.every((c) => used.has(c));
  });
}

function splitTopLevel(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let k = 0; k < selector.length; k++) {
    const ch = selector[k];
    if (ch === '\\') k++;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(selector.slice(start, k));
      start = k + 1;
    }
  }
  parts.push(selector.slice(start));
  return parts;
}

/** Position von `ch` außerhalb von Zeichenketten, Klammern und Escapes; -1 wenn nicht vorhanden. */
function findOutside(css: string, from: number, ch: string): number {
  let quote: string | null = null;
  let paren = 0;
  for (let k = from; k < css.length; k++) {
    const c = css[k];
    if (c === '\\') {
      k++;
      continue;
    }
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') paren++;
    else if (c === ')') paren--;
    else if (paren <= 0 && c === ch) return k;
    else if (paren <= 0 && c === '}') return -1;
  }
  return -1;
}

function matchBrace(css: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let k = open; k < css.length; k++) {
    const c = css[k];
    if (c === '\\') {
      k++;
      continue;
    }
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return k;
    }
  }
  return css.length - 1;
}
