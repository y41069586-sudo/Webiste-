import Link from 'next/link';
import { markdownToHtml } from '@wbm/core';

export function LegalPage({ title, markdown, placeholder }: { title: string; markdown: string; placeholder: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-6 text-sm">
        <Link href="/" className="text-brand-600 underline">
          ← Startseite
        </Link>
      </p>
      <article className="prose-legal rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {markdown.trim() ? (
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }} />
        ) : (
          <>
            <h1>{title}</h1>
            <p className="text-slate-600">{placeholder}</p>
          </>
        )}
      </article>
    </main>
  );
}
