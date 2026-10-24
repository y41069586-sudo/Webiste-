import { markdownToHtml } from '@wbm/core';

/** Rechtstexte innerhalb der Firmen-Website (Kopf und Fuß kommen aus dem Layout). */
export function LegalPage({ title, markdown, placeholder }: { title: string; markdown: string; placeholder: string }) {
  return (
    <div className="mx-auto max-w-[90rem] px-5 py-14 sm:px-8 sm:py-24">
      <article className="prose-legal max-w-[70ch] text-[#3c4454]">
        {markdown.trim() ? (
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }} />
        ) : (
          <>
            <h1>{title}</h1>
            <p className="text-slate-600">{placeholder}</p>
          </>
        )}
      </article>
    </div>
  );
}
