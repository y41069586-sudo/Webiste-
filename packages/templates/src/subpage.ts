import { esc } from './html';
import { buildParts, documentShell } from './partials/shared';
import type { RenderInput } from './types';

/**
 * Unterseite der Live-Website (Impressum, Datenschutz, Danke) im Stil der Hauptseite.
 * `bodyHtml` wird vom Aufrufer erzeugt und muss bereits escaped sein.
 */
export function renderSubpage(input: RenderInput, page: { title: string; bodyHtml: string; homeHref?: string }): string {
  const parts = buildParts({
    ...input,
    content: {
      ...input.content,
      seo_title: `${page.title} – ${input.facts.name}`,
      seo_description: `${page.title} von ${input.facts.name}`,
    },
  });
  const home = page.homeHref ?? './';
  const body = `
<header class="border-b border-line bg-surface">
  <div class="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
    <a href="${esc(home)}" class="text-lg font-bold">${parts.brand()}</a>
    <a href="${esc(home)}" class="text-sm text-primary underline underline-offset-4">Zur Startseite</a>
  </div>
</header>
<main id="inhalt" class="mx-auto w-full max-w-3xl flex-1 px-4 py-10 md:py-14">
  <h1 class="text-3xl font-bold">${esc(page.title)}</h1>
  <div class="legal mt-6 space-y-4 leading-relaxed">${page.bodyHtml}</div>
</main>
${parts.footer({ className: 'bg-primary-dark text-on-primary', linkClass: 'underline underline-offset-4' })}`;
  return documentShell(parts, 'flex min-h-screen flex-col bg-surface text-ink antialiased', body);
}
