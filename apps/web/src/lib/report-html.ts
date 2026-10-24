import { markdownToHtml } from '@wbm/core';

/** Markdown des Berichts darstellen; Zeilen mit „|“ werden zu Tabellen. */
export function reportHtml(md: string): string {
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cells = (l: string) =>
    l
      .trim()
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
  const out: string[] = [];
  let text: string[] = [];
  let table: string[] = [];
  const flushText = () => {
    if (text.length) out.push(markdownToHtml(text.join('\n')));
    text = [];
  };
  const flushTable = () => {
    const rows = table.filter((l) => !/^\|[-:| ]+\|$/.test(l.trim()));
    if (rows.length) {
      const [head, ...body] = rows;
      out.push(
        `<table class="my-3 min-w-full text-sm"><thead><tr>${cells(head!)
          .map((c) => `<th class="px-2 py-1 text-left font-semibold">${esc(c)}</th>`)
          .join('')}</tr></thead><tbody>${body
          .map(
            (r) =>
              `<tr class="border-t border-slate-100">${cells(r)
                .map((c, i) => `<td class="px-2 py-1 ${i ? 'text-right tabular-nums' : ''}">${esc(c)}</td>`)
                .join('')}</tr>`,
          )
          .join('')}</tbody></table>`,
      );
    }
    table = [];
  };
  for (const line of md.split('\n')) {
    if (line.trim().startsWith('|')) {
      flushText();
      table.push(line);
    } else {
      flushTable();
      text.push(line);
    }
  }
  flushTable();
  flushText();
  return out.join('\n');
}
