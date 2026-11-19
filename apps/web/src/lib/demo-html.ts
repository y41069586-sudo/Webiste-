import { getProviders } from '@wbm/core';

/**
 * Demo-HTML kurz im Speicher der laufenden Funktion halten (14.11.2026, Tempo): Der Speicher liegt in Irland, die Funktion
 * in den USA; jeder Abruf kostete rund 600 KB über den Atlantik. Schlüssel enthält den Änderungszeitpunkt der Demo, damit
 * ein Neubau sofort sichtbar ist; höchstens 5 Minuten und 20 Einträge.
 */
const HTML_CACHE = new Map<string, { at: number; html: Buffer }>();
export async function cachedDemoHtml(key: string, updatedAt: Date | null | undefined): Promise<Buffer | null> {
  if (!key) return null;
  const k = `${key}|${updatedAt ? new Date(updatedAt).getTime() : 0}`;
  const hit = HTML_CACHE.get(k);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.html;
  const html = await getProviders().storage.get(key);
  if (html) {
    if (HTML_CACHE.size >= 20) HTML_CACHE.delete(HTML_CACHE.keys().next().value!);
    HTML_CACHE.set(k, { at: Date.now(), html });
  }
  return html;
}

