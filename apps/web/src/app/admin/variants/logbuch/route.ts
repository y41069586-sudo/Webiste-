import { experimentsMarkdown } from '@wbm/core';
import { adminOrNull } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Experiment-Logbuch als Markdown-Download (B6.5). */
export async function GET() {
  if (!(await adminOrNull())) return new Response('unauthorized', { status: 401 });
  return new Response(await experimentsMarkdown(), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': 'attachment; filename="experiments.md"',
      'cache-control': 'private, no-store',
    },
  });
}
